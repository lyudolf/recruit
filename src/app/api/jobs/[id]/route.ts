import { NextRequest } from "next/server";
import { getJobById, deleteJob } from "@/lib/firebase/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// GET /api/jobs/[id] — 단일 공고 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);

    if (!job) {
      return Response.json(
        { success: false, error: "공고를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id] — 공고 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);

    if (!job) {
      return Response.json(
        { success: false, error: "공고를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await deleteJob(id);
    return Response.json({ success: true, data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PATCH /api/jobs/[id] — 공고 상태/필드 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 업데이트 가능한 필드만 추출
    const updateData: Record<string, unknown> = {};

    if (body.analysisStatus) {
      updateData.analysisStatus = body.analysisStatus;
      // 지원완료 시 자동으로 appliedAt 기록
      if (body.analysisStatus === "applied") {
        updateData.appliedAt = FieldValue.serverTimestamp();
      }
    }
    if (body.interviewDate !== undefined) updateData.interviewDate = body.interviewDate;
    if (body.memo !== undefined) updateData.memo = body.memo;
    if (body.rejectedStage !== undefined) updateData.rejectedStage = body.rejectedStage;
    if (body.bookmarked !== undefined) updateData.bookmarked = body.bookmarked;

    if (Object.keys(updateData).length === 0) {
      return Response.json(
        { success: false, error: "업데이트할 필드가 없습니다." },
        { status: 400 }
      );
    }

    updateData.updatedAt = FieldValue.serverTimestamp();
    await adminDb.collection("jobs").doc(id).update(updateData);

    return Response.json({ success: true, data: { id, ...updateData } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
