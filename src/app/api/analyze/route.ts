import { NextRequest } from "next/server";
import { getJobById, updateJobAnalysis, updateAnalysisStatus } from "@/lib/firebase/firestore";
import { analyzeJob } from "@/lib/gemini/client";
import resumeContext from "@/data/resume-context.json";
import type { ResumeContext } from "@/types";

// POST /api/analyze — Gemini 분석 실행
export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return Response.json(
        { success: false, error: "jobId는 필수 필드입니다." },
        { status: 400 }
      );
    }

    // 공고 데이터 조회
    const job = await getJobById(jobId);
    if (!job) {
      return Response.json(
        { success: false, error: "공고를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 분석 상태를 "analyzing"으로 업데이트
    await updateAnalysisStatus(jobId, "analyzing");

    try {
      // Gemini 분석 실행
      const analysis = await analyzeJob(
        job.company,
        job.title,
        job.jd,
        resumeContext as ResumeContext
      );

      // 분석 결과 Firestore에 저장
      await updateJobAnalysis(jobId, analysis);

      return Response.json({
        success: true,
        data: { jobId, analysis },
      });
    } catch (analysisError) {
      // 분석 실패 시 상태 업데이트
      await updateAnalysisStatus(jobId, "failed");
      throw analysisError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
