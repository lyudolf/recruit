import { NextRequest } from "next/server";
import { addJob, isJobExists } from "@/lib/firebase/firestore";
import { scrapeJobUrl } from "@/lib/scraper/firecrawl";
import { Timestamp } from "firebase/firestore";
import type { JobSource } from "@/types";

// POST /api/scrape — 스크래핑 트리거
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, source } = body as { url?: string; source?: JobSource };

    if (!url) {
      return Response.json(
        { success: false, error: "url은 필수 필드입니다." },
        { status: 400 }
      );
    }

    // URL 중복 체크
    const exists = await isJobExists(url);
    if (exists) {
      return Response.json(
        { success: false, error: "이미 등록된 공고입니다." },
        { status: 409 }
      );
    }

    // Firecrawl로 스크래핑
    const jobData = await scrapeJobUrl(url, source ?? "manual");

    // Firestore에 저장
    const jobId = await addJob({
      source: source ?? "manual",
      sourceUrl: url,
      company: jobData.company,
      title: jobData.title,
      jd: jobData.jd,
      location: jobData.location,
      salary: jobData.salary,
      deadline: jobData.deadline,
      scrapedAt: Timestamp.now(),
    });

    return Response.json(
      {
        success: true,
        data: {
          id: jobId,
          company: jobData.company,
          title: jobData.title,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
