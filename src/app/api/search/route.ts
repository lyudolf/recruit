import { NextRequest } from "next/server";

// 사람인 검색 결과 페이지에서 개별 공고 URL 추출
function extractSaraminJobUrls(markdown: string): { title: string; url: string }[] {
  const jobs: { title: string; url: string }[] = [];
  // 마크다운 링크 패턴에서 saramin 공고 URL 추출
  const linkRegex = /\[([^\]]+)\]\((https:\/\/www\.saramin\.co\.kr\/zf_user\/jobs\/relay\/view[^)]+)\)/g;
  let match;

  const seen = new Set<string>();
  while ((match = linkRegex.exec(markdown)) !== null) {
    const title = match[1].trim();
    const url = match[2];

    // rec_idx 추출해서 중복 제거
    const recIdx = url.match(/rec_idx=(\d+)/)?.[1];
    if (recIdx && !seen.has(recIdx)) {
      seen.add(recIdx);
      // 불필요한 쿼리 파라미터 제거, 깔끔한 URL로 정규화
      const cleanUrl = `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${recIdx}`;
      jobs.push({ title, url: cleanUrl });
    }
  }

  return jobs;
}

// 원티드 검색 결과 페이지에서 개별 공고 URL 추출
function extractWantedJobUrls(markdown: string): { title: string; url: string }[] {
  const jobs: { title: string; url: string }[] = [];
  const linkRegex = /\[([^\]]+)\]\((https:\/\/www\.wanted\.co\.kr\/wd\/\d+[^)]*)\)/g;
  let match;

  const seen = new Set<string>();
  while ((match = linkRegex.exec(markdown)) !== null) {
    const title = match[1].trim();
    const url = match[2];

    // wd ID로 중복 제거
    const wdId = url.match(/\/wd\/(\d+)/)?.[1];
    if (wdId && !seen.has(wdId)) {
      seen.add(wdId);
      const cleanUrl = `https://www.wanted.co.kr/wd/${wdId}`;
      jobs.push({ title, url: cleanUrl });
    }
  }

  return jobs;
}

// ─── POST /api/search — 키워드 기반 공고 검색 ───
export async function POST(request: NextRequest) {
  try {
    const { keyword, platform, maxResults } = await request.json() as {
      keyword?: string;
      platform?: "saramin" | "wanted";
      maxResults?: number;
    };

    if (!keyword?.trim()) {
      return Response.json(
        { success: false, error: "keyword는 필수 필드입니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return Response.json(
        { success: false, error: "FIRECRAWL_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const selectedPlatform = platform ?? "saramin";
    const limit = Math.min(maxResults ?? 20, 30);

    // 플랫폼별 검색 URL 구성
    let searchUrl: string;
    if (selectedPlatform === "wanted") {
      searchUrl = `https://www.wanted.co.kr/search?query=${encodeURIComponent(keyword)}&tab=position`;
    } else {
      searchUrl = `https://www.saramin.co.kr/zf_user/search?searchword=${encodeURIComponent(keyword)}&searchType=search&search_done=y&search_optional_item=n`;
    }

    // Firecrawl로 검색 결과 페이지 스크래핑
    const firecrawlRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ["markdown"],
      }),
    });

    if (!firecrawlRes.ok) {
      const errorText = await firecrawlRes.text();
      return Response.json(
        { success: false, error: `Firecrawl 스크래핑 실패 (${firecrawlRes.status}): ${errorText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const firecrawlData = await firecrawlRes.json();
    const markdown = firecrawlData.data?.markdown ?? "";

    if (!markdown) {
      return Response.json(
        { success: false, error: "검색 결과 페이지에서 콘텐츠를 추출할 수 없습니다." },
        { status: 502 }
      );
    }

    // 플랫폼별 URL 추출
    let jobList: { title: string; url: string }[];
    if (selectedPlatform === "wanted") {
      jobList = extractWantedJobUrls(markdown);
    } else {
      jobList = extractSaraminJobUrls(markdown);
    }

    // 결과 수 제한
    const limitedResults = jobList.slice(0, limit);

    return Response.json({
      success: true,
      data: {
        keyword,
        platform: selectedPlatform,
        totalFound: jobList.length,
        results: limitedResults,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
