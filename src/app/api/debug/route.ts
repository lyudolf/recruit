import { adminDb } from "@/lib/firebase/admin";

// GET /api/debug — Firestore Admin SDK 직접 쿼리 (디버그 전용)
export async function GET() {
  try {
    const snapshot = await adminDb.collection("jobs").get();
    const docs = snapshot.docs.map((d) => ({
      id: d.id,
      title: d.data().title,
      company: d.data().company,
      sourceUrl: d.data().sourceUrl,
      keys: Object.keys(d.data()),
    }));

    return Response.json({ count: docs.length, docs });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.slice(0, 300) : undefined,
    });
  }
}
