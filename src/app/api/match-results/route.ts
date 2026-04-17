import { getMatchResults } from "@/lib/firebase/match-results";

// GET /api/match-results — 전체 매칭 결과 조회 (matchScore 내림차순)
export async function GET() {
  try {
    const results = await getMatchResults();
    return Response.json({ success: true, data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
