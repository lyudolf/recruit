import { NextRequest } from "next/server";
import { getJobs, addJob, isJobExists } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase/firestore";

// GET /api/jobs — 전체 공고 목록 조회 (fitScore 내림차순)
export async function GET() {
  try {
    const jobs = await getJobs();
    return Response.json({ success: true, data: jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/jobs — 수동 공고 추가 (URL 또는 원문 텍스트)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceUrl, company, title, jd, source, location, salary, deadline } = body;

    // 필수 필드 검증
    if (!company || !title || !jd) {
      return Response.json(
        { success: false, error: "company, title, jd는 필수 필드입니다." },
        { status: 400 }
      );
    }

    // URL 중복 체크
    if (sourceUrl) {
      const exists = await isJobExists(sourceUrl);
      if (exists) {
        return Response.json(
          { success: false, error: "이미 등록된 공고입니다." },
          { status: 409 }
        );
      }
    }

    const jobId = await addJob({
      source: source ?? "manual",
      sourceUrl: sourceUrl ?? "",
      company,
      title,
      jd: {
        mainTasks: jd.mainTasks ?? "",
        requirements: jd.requirements ?? "",
        preferred: jd.preferred ?? "",
        rawText: jd.rawText ?? "",
      },
      location,
      salary,
      deadline,
      scrapedAt: Timestamp.now(),
    });

    return Response.json({ success: true, data: { id: jobId } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
