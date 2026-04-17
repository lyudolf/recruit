"""
Job Scraper — 채용 공고 스크래핑 스크립트
Firecrawl API 우선, 실패 시 Playwright 폴백.
결과는 통일된 JSON 스키마로 반환.
"""

import argparse
import json
import os
import re
import sys
import time
import random
from datetime import datetime, timezone
from typing import Optional


# ─── 출력 JSON 스키마 ───────────────────────────────────────────────

def empty_job_schema(source_url: str = "") -> dict:
    return {
        "job_title": "",
        "company": "",
        "responsibilities": "",
        "requirements": "",
        "tech_stack": [],
        "preferred": None,
        "location": None,
        "salary": None,
        "deadline": None,
        "source_url": source_url,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }


# ─── 유틸: 지수 백오프 재시도 데코레이터 ───────────────────────────

def retry_with_backoff(max_retries: int = 3, base_delay: float = 2.0):
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                        print(f"  ⚠ 시도 {attempt + 1}/{max_retries} 실패: {e}")
                        print(f"    {delay:.1f}초 후 재시도...")
                        time.sleep(delay)
            raise last_error
        return wrapper
    return decorator


# ─── IP 차단 / CAPTCHA 감지 ────────────────────────────────────────

BLOCK_PATTERNS = [
    r"captcha",
    r"blocked",
    r"access\s*denied",
    r"ip\s*(가|이)\s*차단",
    r"비정상\s*접근",
    r"bot\s*detect",
    r"rate\s*limit",
    r"too\s*many\s*requests",
    r"cloudflare",
    r"just\s*a\s*moment",
]

def is_blocked(text: str) -> bool:
    text_lower = text.lower()
    for pattern in BLOCK_PATTERNS:
        if re.search(pattern, text_lower):
            return True
    return False


# ─── 마크다운 → 구조화 JSON 파싱 ──────────────────────────────────

def parse_job_from_text(text: str, source_url: str) -> dict:
    job = empty_job_schema(source_url)

    def extract(patterns: list[str], text: str) -> str:
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match and match.group(1):
                return match.group(1).strip()
        return ""

    # 회사명
    job["company"] = extract([
        r"(?:회사명|기업명|company)\s*[:\-]\s*(.+)",
        r"^#\s+(.+)",
    ], text) or "미확인"

    # 공고 제목
    job["job_title"] = extract([
        r"(?:채용|모집|포지션|position|직무)\s*[:\-]\s*(.+)",
        r"^##\s+(.+)",
    ], text) or "미확인 공고"

    # 주요 업무
    job["responsibilities"] = extract([
        r"(?:주요\s*업무|담당\s*업무|업무\s*내용|responsibilities)[\s\S]*?\n([\s\S]*?)(?=\n(?:자격|우대|근무|급여|마감|##|$))",
    ], text) or "정보 없음"

    # 자격 요건
    job["requirements"] = extract([
        r"(?:자격\s*요건|필수\s*요건|지원\s*자격|requirements|qualifications)[\s\S]*?\n([\s\S]*?)(?=\n(?:우대|근무|급여|마감|##|$))",
    ], text) or "정보 없음"

    # 우대 사항
    preferred = extract([
        r"(?:우대\s*사항|우대\s*조건|preferred|nice\s*to\s*have)[\s\S]*?\n([\s\S]*?)(?=\n(?:근무|급여|마감|혜택|복리|##|$))",
    ], text)
    job["preferred"] = preferred or None

    # 기술 스택 추출 (일반적인 기술 키워드 매칭)
    tech_patterns = [
        r"(?:기술\s*스택|tech\s*stack|사용\s*기술|개발\s*환경)\s*[:\-]\s*(.+)",
    ]
    tech_raw = extract(tech_patterns, text)
    if tech_raw:
        # 쉼표, 슬래시, 불릿 등으로 분리
        job["tech_stack"] = [
            t.strip() for t in re.split(r"[,/·•\-]", tech_raw) if t.strip()
        ]
    else:
        # 본문에서 알려진 기술 키워드 매칭
        known_techs = [
            "Python", "Java", "JavaScript", "TypeScript", "React", "Next.js",
            "Vue", "Angular", "Node.js", "Spring", "Django", "Flask", "FastAPI",
            "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes",
            "AWS", "GCP", "Azure", "Terraform", "Git", "CI/CD", "Figma",
            "Unity", "C#", "C++", "Go", "Rust", "Swift", "Kotlin", "Flutter",
            "TensorFlow", "PyTorch", "Kafka", "Elasticsearch", "GraphQL",
        ]
        found = [tech for tech in known_techs if tech.lower() in text.lower()]
        job["tech_stack"] = list(set(found))

    # 근무지
    location = extract([
        r"(?:근무\s*지|근무\s*위치|근무\s*장소|location)\s*[:\-]\s*(.+)",
    ], text)
    job["location"] = location or None

    # 급여
    salary = extract([
        r"(?:급여|연봉|salary|compensation)\s*[:\-]\s*(.+)",
    ], text)
    job["salary"] = salary or None

    # 마감일
    deadline = extract([
        r"(?:마감일|마감\s*기한|deadline|접수\s*기간)\s*[:\-]\s*(.+)",
    ], text)
    job["deadline"] = deadline or None

    return job


# ═══════════════════════════════════════════════════════════════════
#  Engine 1: Firecrawl API
# ═══════════════════════════════════════════════════════════════════

@retry_with_backoff(max_retries=3, base_delay=2.0)
def scrape_with_firecrawl(url: str) -> dict:
    import requests

    api_key = os.environ.get("FIRECRAWL_API_KEY")
    if not api_key:
        raise EnvironmentError("FIRECRAWL_API_KEY 환경변수가 설정되지 않았습니다.")

    print(f"  🔥 Firecrawl API로 스크래핑 중: {url}")

    response = requests.post(
        "https://api.firecrawl.dev/v1/scrape",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        json={"url": url, "formats": ["markdown"]},
        timeout=30,
    )

    if response.status_code == 429:
        raise Exception("Rate limit (429) — 요청 빈도 초과")
    if response.status_code >= 500:
        raise Exception(f"서버 오류 ({response.status_code})")
    if not response.ok:
        raise Exception(f"Firecrawl 오류 ({response.status_code}): {response.text[:200]}")

    data = response.json()
    markdown = data.get("data", {}).get("markdown", "")

    if not markdown:
        raise Exception("Firecrawl 응답에 마크다운 콘텐츠 없음")

    if is_blocked(markdown):
        raise Exception("IP 차단 또는 CAPTCHA 감지됨 — Playwright 폴백 필요")

    return parse_job_from_text(markdown, url)


# ═══════════════════════════════════════════════════════════════════
#  Engine 2: Playwright (폴백)
# ═══════════════════════════════════════════════════════════════════

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]

@retry_with_backoff(max_retries=3, base_delay=3.0)
def scrape_with_playwright(url: str) -> dict:
    from playwright.sync_api import sync_playwright

    print(f"  🎭 Playwright로 스크래핑 중: {url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR",
        )

        page = context.new_page()

        # 불필요한 리소스 차단 (속도 개선)
        page.route("**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2}", lambda route: route.abort())
        page.route("**/analytics*", lambda route: route.abort())
        page.route("**/tracking*", lambda route: route.abort())

        try:
            page.goto(url, timeout=60000, wait_until="domcontentloaded")

            # 동적 콘텐츠 로드 대기
            time.sleep(random.uniform(2, 4))

            # 페이지 스크롤 (Lazy Load 트리거)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
            time.sleep(1)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(1)

            # 텍스트 추출
            body_text = page.inner_text("body")

            if is_blocked(body_text):
                raise Exception("IP 차단 또는 CAPTCHA 감지됨")

            return parse_job_from_text(body_text, url)

        finally:
            browser.close()


# ═══════════════════════════════════════════════════════════════════
#  메인 스크래핑 함수 (Firecrawl 우선 → Playwright 폴백)
# ═══════════════════════════════════════════════════════════════════

def scrape_job(url: str, engine: Optional[str] = None) -> dict:
    print(f"\n{'='*60}")
    print(f"📋 스크래핑 시작: {url}")
    print(f"{'='*60}")

    if engine == "playwright":
        return scrape_with_playwright(url)

    if engine == "firecrawl":
        return scrape_with_firecrawl(url)

    # 기본: Firecrawl 시도 → 실패 시 Playwright 폴백
    try:
        result = scrape_with_firecrawl(url)
        print("  ✅ Firecrawl 성공")
        return result
    except Exception as e:
        print(f"  ⚠ Firecrawl 실패: {e}")
        print("  🔄 Playwright 폴백으로 전환...")

        try:
            result = scrape_with_playwright(url)
            print("  ✅ Playwright 성공")
            return result
        except Exception as e2:
            print(f"  ❌ Playwright도 실패: {e2}")
            # 빈 스키마라도 반환
            job = empty_job_schema(url)
            job["job_title"] = f"[스크래핑 실패] {url}"
            job["company"] = f"오류: {str(e2)[:100]}"
            return job


# ─── CLI 엔트리포인트 ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="채용 공고 스크래퍼 — Firecrawl API + Playwright 폴백"
    )
    parser.add_argument("--url", type=str, help="단일 공고 URL")
    parser.add_argument("--batch", type=str, help="URL 목록 파일 (한 줄에 하나)")
    parser.add_argument("--engine", type=str, choices=["firecrawl", "playwright"],
                        default=None, help="스크래핑 엔진 강제 지정")
    parser.add_argument("--output", type=str, default=None,
                        help="결과 저장 파일 경로 (JSON)")
    args = parser.parse_args()

    if not args.url and not args.batch:
        parser.error("--url 또는 --batch 중 하나를 지정하세요.")

    results = []

    # 단일 URL 모드
    if args.url:
        result = scrape_job(args.url, engine=args.engine)
        results.append(result)

    # 배치 모드
    if args.batch:
        if not os.path.exists(args.batch):
            print(f"❌ 파일을 찾을 수 없습니다: {args.batch}")
            sys.exit(1)

        with open(args.batch, "r", encoding="utf-8") as f:
            urls = [line.strip() for line in f if line.strip() and not line.startswith("#")]

        print(f"\n📦 배치 모드: {len(urls)}개 URL 처리 시작\n")
        for i, url in enumerate(urls, 1):
            print(f"[{i}/{len(urls)}]")
            result = scrape_job(url, engine=args.engine)
            results.append(result)
            # 요청 간 랜덤 딜레이 (anti-bot 방어)
            if i < len(urls):
                delay = random.uniform(3, 7)
                print(f"  ⏳ {delay:.1f}초 대기...")
                time.sleep(delay)

    # 결과 출력
    output_json = json.dumps(results, ensure_ascii=False, indent=2)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output_json)
        print(f"\n✅ 결과 저장 완료: {args.output} ({len(results)}건)")
    else:
        print(f"\n{'='*60}")
        print("📊 스크래핑 결과")
        print(f"{'='*60}")
        print(output_json)

    # 요약
    print(f"\n📈 요약: 총 {len(results)}건 처리")
    success = sum(1 for r in results if not r["job_title"].startswith("[스크래핑 실패]"))
    print(f"   성공: {success}건 / 실패: {len(results) - success}건")


if __name__ == "__main__":
    main()
