import { NextRequest } from "next/server";
import { getJobById, deleteJob } from "@/lib/firebase/firestore";

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
