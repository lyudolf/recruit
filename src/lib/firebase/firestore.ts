import { adminDb } from "./admin";
import { FieldValue } from "firebase-admin/firestore";
import type { Job, Analysis, AnalysisStatus, JobSource, JobDescription, RejectedStage } from "@/types";

const JOBS_COLLECTION = "jobs";

// ─── Firestore 문서 → Job 타입 변환 ───
function docToJob(id: string, data: FirebaseFirestore.DocumentData): Job {
  return {
    id,
    source: (data.source ?? "manual") as JobSource,
    sourceUrl: data.sourceUrl ?? "",
    company: data.company ?? "",
    title: data.title ?? "",
    jd: (data.jd ?? { mainTasks: "", requirements: "", preferred: "", rawText: "" }) as JobDescription,
    experience: data.experience,
    education: data.education,
    location: data.location,
    salary: data.salary,
    deadline: data.deadline,
    companyAddress: data.companyAddress,
    foundedDate: data.foundedDate,
    employeeCount: data.employeeCount,
    revenue: data.revenue,
    analysis: data.analysis as Analysis | undefined,
    analysisStatus: (data.analysisStatus ?? "scraped") as AnalysisStatus,
    bookmarked: data.bookmarked ?? false,
    appliedAt: data.appliedAt,
    interviewDate: data.interviewDate,
    memo: data.memo,
    rejectedStage: data.rejectedStage as RejectedStage | undefined,
    scrapedAt: data.scrapedAt,
    analyzedAt: data.analyzedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// ─── 전체 공고 목록 조회 ───
export async function getJobs(): Promise<Job[]> {
  const snapshot = await adminDb.collection(JOBS_COLLECTION).get();
  return snapshot.docs.map((d) => docToJob(d.id, d.data()));
}

// ─── 상태별 공고 조회 ───
export async function getJobsByStatus(statuses: AnalysisStatus[]): Promise<Job[]> {
  const snapshot = await adminDb
    .collection(JOBS_COLLECTION)
    .where("analysisStatus", "in", statuses)
    .get();
  return snapshot.docs.map((d) => docToJob(d.id, d.data()));
}

// ─── 다음 queued 공고 1건 조회 ───
export async function getNextQueuedJob(): Promise<Job | null> {
  const snapshot = await adminDb
    .collection(JOBS_COLLECTION)
    .where("analysisStatus", "==", "queued")
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return docToJob(doc.id, doc.data());
}

// ─── 단일 공고 조회 ───
export async function getJobById(id: string): Promise<Job | null> {
  const doc = await adminDb.collection(JOBS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return docToJob(doc.id, doc.data()!);
}

// ─── 공고 추가 ───
export async function addJob(
  jobData: Omit<Job, "id" | "createdAt" | "updatedAt" | "analysisStatus">
): Promise<string> {
  const cleanData = Object.fromEntries(
    Object.entries(jobData).filter(([, v]) => v !== undefined)
  );

  const docRef = await adminDb.collection(JOBS_COLLECTION).add({
    ...cleanData,
    analysisStatus: "scraped",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

// ─── 분석 결과 업데이트 ───
export async function updateJobAnalysis(
  id: string,
  analysis: Analysis
): Promise<void> {
  await adminDb.collection(JOBS_COLLECTION).doc(id).update({
    analysis,
    analysisStatus: "completed" as AnalysisStatus,
    analyzedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ─── 분석 상태 업데이트 ───
export async function updateAnalysisStatus(
  id: string,
  status: AnalysisStatus
): Promise<void> {
  await adminDb.collection(JOBS_COLLECTION).doc(id).update({
    analysisStatus: status,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ─── 일괄 상태 업데이트 ───
export async function bulkUpdateStatus(
  ids: string[],
  status: AnalysisStatus
): Promise<void> {
  const batch = adminDb.batch();
  for (const id of ids) {
    const ref = adminDb.collection(JOBS_COLLECTION).doc(id);
    batch.update(ref, {
      analysisStatus: status,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}

// ─── 공고 삭제 ───
export async function deleteJob(id: string): Promise<void> {
  await adminDb.collection(JOBS_COLLECTION).doc(id).delete();
}

// ─── URL 기준 중복 체크 ───
export async function isJobExists(sourceUrl: string): Promise<boolean> {
  const snapshot = await adminDb
    .collection(JOBS_COLLECTION)
    .where("sourceUrl", "==", sourceUrl)
    .limit(1)
    .get();
  return !snapshot.empty;
}
