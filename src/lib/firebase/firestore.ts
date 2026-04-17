import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./config";
import type { Job, Analysis, AnalysisStatus, JobSource, JobDescription } from "@/types";

const JOBS_COLLECTION = "jobs";

// ─── Firestore 문서 → Job 타입 변환 ───
function docToJob(id: string, data: DocumentData): Job {
  return {
    id,
    source: data.source as JobSource,
    sourceUrl: data.sourceUrl ?? "",
    company: data.company ?? "",
    title: data.title ?? "",
    jd: data.jd as JobDescription,
    location: data.location,
    salary: data.salary,
    deadline: data.deadline,
    analysis: data.analysis as Analysis | undefined,
    analysisStatus: (data.analysisStatus ?? "pending") as AnalysisStatus,
    scrapedAt: data.scrapedAt,
    analyzedAt: data.analyzedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// ─── 전체 공고 목록 조회 (분석 완료된 항목을 fitScore 내림차순으로) ───
export async function getJobs(): Promise<Job[]> {
  const q = query(
    collection(db, JOBS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  const jobs = snapshot.docs.map((d) => docToJob(d.id, d.data()));

  // 클라이언트 사이드에서 fitScore 기준 정렬 (분석 완료 → 미완료 순)
  return jobs.sort((a, b) => {
    const scoreA = a.analysis?.fitScore ?? -1;
    const scoreB = b.analysis?.fitScore ?? -1;
    return scoreB - scoreA;
  });
}

// ─── 단일 공고 조회 ───
export async function getJobById(id: string): Promise<Job | null> {
  const docRef = doc(db, JOBS_COLLECTION, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;
  return docToJob(snapshot.id, snapshot.data());
}

// ─── 공고 추가 ───
export async function addJob(
  jobData: Omit<Job, "id" | "createdAt" | "updatedAt" | "analysisStatus">
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, JOBS_COLLECTION), {
    ...jobData,
    analysisStatus: "pending",
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// ─── 분석 결과 업데이트 ───
export async function updateJobAnalysis(
  id: string,
  analysis: Analysis
): Promise<void> {
  const docRef = doc(db, JOBS_COLLECTION, id);
  await updateDoc(docRef, {
    analysis,
    analysisStatus: "completed" as AnalysisStatus,
    analyzedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

// ─── 분석 상태 업데이트 ───
export async function updateAnalysisStatus(
  id: string,
  status: AnalysisStatus
): Promise<void> {
  const docRef = doc(db, JOBS_COLLECTION, id);
  await updateDoc(docRef, {
    analysisStatus: status,
    updatedAt: Timestamp.now(),
  });
}

// ─── 공고 삭제 ───
export async function deleteJob(id: string): Promise<void> {
  const docRef = doc(db, JOBS_COLLECTION, id);
  await deleteDoc(docRef);
}

// ─── URL 기준 중복 체크 ───
export async function isJobExists(sourceUrl: string): Promise<boolean> {
  const q = query(
    collection(db, JOBS_COLLECTION),
    where("sourceUrl", "==", sourceUrl)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}
