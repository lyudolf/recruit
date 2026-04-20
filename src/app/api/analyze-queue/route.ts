import { bulkUpdateStatus } from "@/lib/firebase/firestore";

// POST /api/analyze-queue — 선택된 공고들을 queued 상태로 일괄 변경
export async function POST(request: Request) {
  try {
    const { jobIds } = (await request.json()) as { jobIds: string[] };

    if (!jobIds || jobIds.length === 0) {
      return Response.json(
        { success: false, error: "jobIds는 필수입니다." },
        { status: 400 }
      );
    }

    await bulkUpdateStatus(jobIds, "queued");

    return Response.json({ success: true, queued: jobIds.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
