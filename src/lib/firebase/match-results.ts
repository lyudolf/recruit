import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./config";
import type { MatchResult, Recommendation } from "@/types";

const MATCH_RESULTS_COLLECTION = "matchResults";

// ─── Firestore 문서 → MatchResult 변환 ───
function docToMatchResult(id: string, data: DocumentData): MatchResult {
  return {
    id,
    jobId: data.jobId ?? "",
    company: data.company ?? "",
    jobTitle: data.jobTitle ?? "",
    sourceUrl: data.sourceUrl ?? "",
    matchScore: data.matchScore ?? 0,
    overallSummary: data.overallSummary ?? "",
    strengths: data.strengths ?? [],
    criticalGaps: data.criticalGaps ?? [],
    recommendation: (data.recommendation ?? "REVIEW_CAREFULLY") as Recommendation,
    createdAt: data.createdAt,
  };
}

// ─── 전체 매칭 결과 조회 (matchScore 내림차순) ───
export async function getMatchResults(): Promise<MatchResult[]> {
  const q = query(
    collection(db, MATCH_RESULTS_COLLECTION),
    orderBy("matchScore", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => docToMatchResult(d.id, d.data()));
}

// ─── 매칭 결과 저장 ───
export async function saveMatchResult(
  result: Omit<MatchResult, "id" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, MATCH_RESULTS_COLLECTION), {
    ...result,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}
