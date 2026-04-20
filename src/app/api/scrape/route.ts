import { NextRequest } from "next/server";
import { addJob, isJobExists } from "@/lib/firebase/firestore";
import { scrapeJobUrl } from "@/lib/scraper/firecrawl";
import { FieldValue } from "firebase-admin/firestore";
import type { JobSource } from "@/types";

// POST /api/scrape — 공고 URL 스크래핑 + Firestore 저장
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

    // Firecrawl + OG 메타 파싱
    const data = await scrapeJobUrl(url, source ?? "manual");

    // Firestore 저장 (undefined 필드 자동 제거됨 — firestore.ts에서 처리)
    const jobId = await addJob({
      source: data.source,
      sourceUrl: url,
      company: data.company,
      title: data.title,
      jd: {
        mainTasks: "",
        requirements: "",
        preferred: "",
        rawText: data.rawMarkdown,
      },
      experience: data.experience,
      education: data.education,
      salary: data.salary,
      deadline: data.deadline,
      location: data.location,
      companyAddress: data.companyAddress,
      foundedDate: data.foundedDate,
      employeeCount: data.employeeCount,
      revenue: data.revenue,
      scrapedAt: FieldValue.serverTimestamp() as never,
    });

    return Response.json(
      {
        success: true,
        data: {
          id: jobId,
          company: data.company,
          title: data.title,
          experience: data.experience,
          salary: data.salary,
          deadline: data.deadline,
          location: data.location,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[/api/scrape] ERROR:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
