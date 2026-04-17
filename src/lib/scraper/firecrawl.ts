import type { JobDescription, JobSource } from "@/types";

// Firecrawl SDK 타입 (필요한 부분만 정의)
interface FirecrawlScrapeResult {
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
  };
}

// ─── Firecrawl 클라이언트 ───
class FirecrawlClient {
  private apiKey: string;
  private baseUrl = "https://api.firecrawl.dev/v1";

  constructor() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY 환경변수가 설정되지 않았습니다.");
    }
    this.apiKey = apiKey;
  }

  // 단일 페이지 스크래핑
  async scrape(url: string): Promise<FirecrawlScrapeResult> {
    const response = await fetch(`${this.baseUrl}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl 스크래핑 실패 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data as FirecrawlScrapeResult;
  }
}

// ─── 스크래핑 결과를 JD 구조로 파싱 ───
export function parseJobFromMarkdown(
  markdown: string,
  sourceUrl: string,
  source: JobSource
): {
  company: string;
  title: string;
  jd: JobDescription;
  location?: string;
  salary?: string;
  deadline?: string;
} {
  // 마크다운에서 섹션별 추출 (정규식 기반 휴리스틱)
  const extractSection = (
    text: string,
    patterns: RegExp[]
  ): string => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return "";
  };

  // 회사명 추출
  const company = extractSection(markdown, [
    /(?:회사명|기업명|company)\s*[:\-]\s*(.+)/i,
    /^#\s+(.+)/m,
  ]);

  // 공고 제목 추출
  const title = extractSection(markdown, [
    /(?:채용|모집|포지션|position)\s*[:\-]\s*(.+)/i,
    /^##\s+(.+)/m,
  ]);

  // 주요 업무
  const mainTasks = extractSection(markdown, [
    /(?:주요\s*업무|담당\s*업무|업무\s*내용|responsibilities)[\s\S]*?\n([\s\S]*?)(?=\n(?:자격|우대|근무|급여|마감|##|$))/i,
  ]);

  // 자격 요건
  const requirements = extractSection(markdown, [
    /(?:자격\s*요건|필수\s*요건|지원\s*자격|requirements|qualifications)[\s\S]*?\n([\s\S]*?)(?=\n(?:우대|근무|급여|마감|##|$))/i,
  ]);

  // 우대 사항
  const preferred = extractSection(markdown, [
    /(?:우대\s*사항|우대\s*조건|preferred|nice\s*to\s*have)[\s\S]*?\n([\s\S]*?)(?=\n(?:근무|급여|마감|혜택|복리|##|$))/i,
  ]);

  // 근무지
  const location = extractSection(markdown, [
    /(?:근무\s*지|근무\s*위치|근무\s*장소|location)\s*[:\-]\s*(.+)/i,
  ]) || undefined;

  // 급여
  const salary = extractSection(markdown, [
    /(?:급여|연봉|salary|compensation)\s*[:\-]\s*(.+)/i,
  ]) || undefined;

  // 마감일
  const deadline = extractSection(markdown, [
    /(?:마감일|마감\s*기한|deadline|접수\s*기간)\s*[:\-]\s*(.+)/i,
  ]) || undefined;

  return {
    company: company || "미확인",
    title: title || "미확인 공고",
    jd: {
      mainTasks: mainTasks || "정보 없음",
      requirements: requirements || "정보 없음",
      preferred: preferred || "정보 없음",
      rawText: markdown,
    },
    location,
    salary,
    deadline,
  };
}

// ─── 단일 공고 URL 스크래핑 ───
export async function scrapeJobUrl(
  url: string,
  source: JobSource = "manual"
): Promise<ReturnType<typeof parseJobFromMarkdown>> {
  const client = new FirecrawlClient();
  const result = await client.scrape(url);

  if (!result.markdown) {
    throw new Error("스크래핑 결과에 마크다운 콘텐츠가 없습니다.");
  }

  return parseJobFromMarkdown(result.markdown, url, source);
}
