import { NextRequest } from "next/server";
import { addJob, isJobExists } from "@/lib/firebase/firestore";
import { scrapeJobUrl } from "@/lib/scraper/firecrawl";
import { FieldValue } from "firebase-admin/firestore";
import type { JobSource } from "@/types";

// 사람인 검색 결과에서 공고 URL 추출
function extractSaraminUrls(markdown: string): { title: string; url: string }[] {
  const jobs: { title: string; url: string }[] = [];
  const linkRegex = /\[([^\]]+)\]\((https:\/\/www\.saramin\.co\.kr\/zf_user\/jobs\/relay\/view[^)]+)\)/g;
  let match;
  const seen = new Set<string>();

  while ((match = linkRegex.exec(markdown)) !== null) {
    const title = match[1].trim();
    const recIdx = match[2].match(/rec_idx=(\d+)/)?.[1];
    if (recIdx && !seen.has(recIdx)) {
      seen.add(recIdx);
      jobs.push({
        title,
        url: `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${recIdx}`,
      });
    }
  }
  return jobs;
}

// 원티드 검색 결과에서 공고 URL 추출
function extractWantedUrls(markdown: string): { title: string; url: string }[] {
  const jobs: { title: string; url: string }[] = [];
  const linkRegex = /\[([^\]]+)\]\((https:\/\/www\.wanted\.co\.kr\/wd\/\d+[^)]*)\)/g;
  let match;
  const seen = new Set<string>();

  while ((match = linkRegex.exec(markdown)) !== null) {
    const title = match[1].trim();
    const wdId = match[2].match(/\/wd\/(\d+)/)?.[1];
    if (wdId && !seen.has(wdId)) {
      seen.add(wdId);
      jobs.push({ title, url: `https://www.wanted.co.kr/wd/${wdId}` });
    }
  }
  return jobs;
}

// Firecrawl로 검색 페이지 스크래핑
async function searchPlatform(
  keyword: string,
  platform: "saramin" | "wanted",
  apiKey: string
): Promise<{ title: string; url: string }[]> {
  const searchUrl =
    platform === "wanted"
      ? `https://www.wanted.co.kr/search?query=${encodeURIComponent(keyword)}&tab=position`
      : `https://www.saramin.co.kr/zf_user/search?searchword=${encodeURIComponent(keyword)}&searchType=search&search_done=y&search_optional_item=n`;

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url: searchUrl, formats: ["markdown"] }),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const markdown = data.data?.markdown ?? "";

  return platform === "wanted"
    ? extractWantedUrls(markdown)
    : extractSaraminUrls(markdown);
}

// ─── POST /api/auto-collect ───
// 키워드 배열을 받아서 검색 → 스크래핑 → Firestore 저장 일괄 실행
export async function POST(request: NextRequest) {
  try {
    const { keywords, platforms, maxPerKeyword } = (await request.json()) as {
      keywords: string[];
      platforms?: ("saramin" | "wanted")[];
      maxPerKeyword?: number;
    };

    if (!keywords || keywords.length === 0) {
      return Response.json(
        { success: false, error: "keywords 배열은 필수입니다." },
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

    const selectedPlatforms = platforms ?? ["saramin"];
    const limit = Math.min(maxPerKeyword ?? 10, 20);

    // 1단계: 모든 키워드 × 플랫폼 조합으로 공고 URL 수집
    const allJobs: { title: string; url: string; source: JobSource }[] = [];
    const seenUrls = new Set<string>();

    for (const keyword of keywords) {
      for (const platform of selectedPlatforms) {
        const results = await searchPlatform(keyword, platform, apiKey);
        for (const job of results.slice(0, limit)) {
          if (!seenUrls.has(job.url)) {
            seenUrls.add(job.url);
            allJobs.push({ ...job, source: platform === "wanted" ? "wanted" : "saramin" });
          }
        }
      }
    }

    // 2단계: Firestore 중복 제거 후 스크래핑
    let newCount = 0;
    let skipCount = 0;
    let failCount = 0;
    const collected: { company: string; title: string; id: string }[] = [];

    for (const job of allJobs) {
      // Firestore 중복 체크
      const exists = await isJobExists(job.url);
      if (exists) {
        skipCount++;
        continue;
      }

      // 개별 공고 스크래핑
      try {
        const jobData = await scrapeJobUrl(job.url, job.source);

        const jobId = await addJob({
          source: job.source,
          sourceUrl: job.url,
          company: jobData.company,
          title: jobData.title,
          jd: {
            mainTasks: "",
            requirements: "",
            preferred: "",
            rawText: jobData.rawMarkdown,
          },
          experience: jobData.experience,
          education: jobData.education,
          location: jobData.location,
          salary: jobData.salary,
          deadline: jobData.deadline,
          companyAddress: jobData.companyAddress,
          foundedDate: jobData.foundedDate,
          employeeCount: jobData.employeeCount,
          revenue: jobData.revenue,
          scrapedAt: FieldValue.serverTimestamp() as never,
        });

        collected.push({ company: jobData.company, title: jobData.title, id: jobId });
        newCount++;
      } catch {
        failCount++;
      }
    }

    return Response.json({
      success: true,
      data: {
        totalSearched: allJobs.length,
        newCollected: newCount,
        duplicateSkipped: skipCount,
        failed: failCount,
        collected,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
