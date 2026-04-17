---
name: job-scraper
description: 사람인/원티드 등 동적 채용 플랫폼에서 공고를 스크래핑하여 구조화된 JSON으로 반환하는 스킬
---

# Job Scraper Skill

채용 플랫폼(사람인, 원티드 등)에서 공고 데이터를 수집하여 통일된 JSON 스키마로 반환합니다.

## 아키텍처

```
[입력: URL 또는 키워드]
        ↓
[1차 시도: Firecrawl API] ──실패──→ [2차 시도: Playwright]
        ↓                                    ↓
[마크다운 반환]                         [HTML 반환]
        ↓                                    ↓
        └──────── [JSON 파싱] ───────────────┘
                      ↓
           [구조화된 JSON 출력]
```

## 출력 JSON 스키마

모든 스크래핑 결과는 반드시 아래 스키마를 따릅니다:

```json
{
  "job_title": "string (필수)",
  "company": "string (필수)",
  "responsibilities": "string (필수, 주요 업무)",
  "requirements": "string (필수, 자격 요건)",
  "tech_stack": ["string"] ,
  "preferred": "string | null (우대 사항)",
  "location": "string | null (근무지)",
  "salary": "string | null (급여)",
  "deadline": "string | null (마감일)",
  "source_url": "string (원본 URL)",
  "scraped_at": "string (ISO 8601)"
}
```

## 사용법

### 1. Firecrawl API 모드 (기본)

```bash
python scripts/scrape_job.py --url "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=12345"
```

### 2. Playwright 모드 (Firecrawl 실패 시 자동 폴백 또는 수동 지정)

```bash
python scripts/scrape_job.py --url "https://www.wanted.co.kr/wd/12345" --engine playwright
```

### 3. 배치 모드 (여러 URL)

```bash
python scripts/scrape_job.py --batch urls.txt --output results.json
```

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `FIRECRAWL_API_KEY` | Firecrawl 모드 시 필수 | Firecrawl API 키 |

## 방어 로직

- **재시도**: 네트워크 오류·429·5xx 시 지수 백오프 (최대 3회, 2초→4초→8초)
- **IP 차단 감지**: 응답 본문에 CAPTCHA/차단 키워드 감지 시 Playwright 폴백
- **타임아웃**: Firecrawl 30초, Playwright 60초
- **User-Agent 로테이션**: Playwright 모드에서 랜덤 User-Agent 적용

## 의존성 설치

```bash
pip install requests playwright
playwright install chromium
```

## 파일 구조

```
.agents/skills/job-scraper/
├── SKILL.md              ← 이 문서
└── scripts/
    └── scrape_job.py     ← 스크래핑 스크립트
```
