import type { JobSource } from "@/types";

// Firecrawl 응답 타입
interface FirecrawlResult {
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    sourceURL?: string;
    [key: string]: unknown;
  };
}

// 스크래핑 결과 타입
export interface ScrapedJobData {
  company: string;
  title: string;
  experience: string;
  education: string;
  salary: string;
  deadline: string;
  location: string;
  companyAddress: string;
  foundedDate: string;
  employeeCount: string;
  revenue: string;
  rawMarkdown: string;
  source: JobSource;
  sourceUrl: string;
}

// ─── Firecrawl API 호출 ───
async function callFirecrawl(url: string): Promise<FirecrawlResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY가 설정되지 않았습니다.");

  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url, formats: ["markdown"] }),
    signal: AbortSignal.timeout(30000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Firecrawl (${response.status}): ${text.slice(0, 200)}`);
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Firecrawl 응답 파싱 실패: ${text.slice(0, 200)}`);
  }

  return json.data as FirecrawlResult;
}

// ─── 사람인 OG Description 파싱 ───
// 형식: "(주)딥파인, [딥파인] 서비스 기획자, 경력:경력 3~14년, 학력:대학교졸업(4년)이상, 면접 후 결정, 마감일:2026-05-31"
function parseSaraminOgDescription(description: string): {
  company: string;
  title: string;
  experience: string;
  education: string;
  salary: string;
  deadline: string;
} {
  const parts = description.split(",").map((s) => s.trim());

  const company = parts[0] || "미확인";
  const title = parts[1] || "미확인 공고";

  let experience = "";
  let education = "";
  let salary = "";
  let deadline = "";

  for (const part of parts) {
    if (part.startsWith("경력:")) experience = part.replace("경력:", "").trim();
    if (part.startsWith("학력:")) education = part.replace("학력:", "").trim();
    if (part.startsWith("마감일:")) deadline = part.replace("마감일:", "").trim();
    // 급여 관련
    if (part.includes("만원") || part.includes("원이상") || part.includes("협의") || part.includes("면접")) {
      if (!part.startsWith("경력") && !part.startsWith("학력") && !part.startsWith("마감일")) {
        salary = part;
      }
    }
  }

  // 급여가 별도 필드로 안 잡히면, "면접 후 결정" 같은 게 salary임
  if (!salary) {
    for (const part of parts) {
      if (part.includes("면접 후 결정") || part.includes("회사내규에 따름") || part.includes("협의")) {
        salary = part;
        break;
      }
    }
  }

  return { company, title, experience, education, salary, deadline };
}

// ─── 사람인 OG Title 파싱 ───
// 형식: "[(주)딥파인] [딥파인] 서비스 기획자(D-41) - 사람인"
function parseSaraminOgTitle(ogTitle: string): { company: string; title: string } {
  // 마지막 " - 사람인" 제거
  const cleaned = ogTitle.replace(/\s*-\s*사람인$/, "");

  // [(기업명)] [가나다] 공고제목 패턴 매칭
  const match = cleaned.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (match) {
    return { company: match[1], title: match[2].trim() };
  }
  return { company: "", title: cleaned };
}

// ─── 마크다운 본문에서 기업정보 추출 ───
function extractCompanyInfo(markdown: string): {
  location: string;
  companyAddress: string;
  foundedDate: string;
  employeeCount: string;
  revenue: string;
} {
  const extract = (patterns: RegExp[]): string => {
    for (const p of patterns) {
      const m = markdown.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return "";
  };

  return {
    location: extract([
      /(?:근무지역|근무\s*지|근무\s*위치)\s*[:\-]\s*(.+)/i,
      /(?:지역)\s*(.+?(?:구|시|군|동))/,
    ]),
    companyAddress: extract([
      /(?:기업\s*주소|회사\s*주소|주소)\s*[:\-]\s*(.+)/i,
    ]),
    foundedDate: extract([
      /(?:설립일|설립\s*연도|설립)\s*[:\-]\s*(.+)/i,
    ]),
    employeeCount: extract([
      /(?:사원\s*수|직원\s*수|재직자\s*수)\s*[:\-]\s*(.+)/i,
    ]),
    revenue: extract([
      /(?:매출액|매출)\s*[:\-]\s*(.+)/i,
    ]),
  };
}

// ─── 메인 스크래핑 함수 ───
export async function scrapeJobUrl(
  url: string,
  source: JobSource = "manual"
): Promise<ScrapedJobData> {
  const result = await callFirecrawl(url);
  const markdown = result.markdown ?? "";
  const metadata = result.metadata ?? {};

  // OG 메타 기반 파싱
  const ogTitle = (metadata.ogTitle ?? metadata.title ?? "") as string;
  const ogDesc = (metadata.ogDescription ?? metadata.description ?? "") as string;

  let company = "";
  let title = "";
  let experience = "";
  let education = "";
  let salary = "";
  let deadline = "";

  // 사람인 OG 파싱
  if (ogDesc) {
    const descParsed = parseSaraminOgDescription(ogDesc);
    company = descParsed.company;
    title = descParsed.title;
    experience = descParsed.experience;
    education = descParsed.education;
    salary = descParsed.salary;
    deadline = descParsed.deadline;
  }

  // OG Title에서 보정
  if (ogTitle) {
    const titleParsed = parseSaraminOgTitle(ogTitle);
    if (!company || company === "미확인") company = titleParsed.company;
    if (titleParsed.title) title = titleParsed.title;
  }

  // 마크다운 본문에서 기업정보 추출
  const companyInfo = extractCompanyInfo(markdown);

  return {
    company: company || "미확인",
    title: title || "미확인 공고",
    experience: experience || "정보 없음",
    education: education || "정보 없음",
    salary: salary || "정보 없음",
    deadline: deadline || "정보 없음",
    location: companyInfo.location || "정보 없음",
    companyAddress: companyInfo.companyAddress || "정보 없음",
    foundedDate: companyInfo.foundedDate || "정보 없음",
    employeeCount: companyInfo.employeeCount || "정보 없음",
    revenue: companyInfo.revenue || "정보 없음",
    rawMarkdown: markdown,
    source,
    sourceUrl: url,
  };
}
