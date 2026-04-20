import { Timestamp } from "firebase/firestore";

// ─── 채용 공고 JD 구조 ───
export interface JobDescription {
  mainTasks: string;     // 주요 업무
  requirements: string;  // 자격 요건
  preferred: string;     // 우대 사항
  rawText: string;       // 원문 전체
}

// ─── Gemini 분석 결과 ───
export interface Analysis {
  fitScore: number;           // 0~100 적합도 점수
  summary: string;            // 종합 평가 (1~2문장)
  strengths: string[];        // 강점 매칭 포인트
  criticalGaps: string[];     // 치명적 기술 격차
  recommendations: string[];  // 지원 전략 제안
  reasoning: string;          // CoT 추론 과정 원문
}

// ─── 공고 상태 흐름 ───
// 스크랩 → 분석대기 → 분석중 → 분석완료 → 지원완료 → 서류통과/불합격 → 면접대기 → 최종합격
export type AnalysisStatus =
  | "scraped"    // URL 등록
  | "queued"     // 분석 큐 등록
  | "analyzing"  // AI 분석중
  | "completed"  // 분석 완료
  | "failed"     // 분석 실패
  | "applied"    // 지원 완료
  | "passed"     // 서류 통과
  | "interview"  // 면접 대기
  | "hired"      // 최종 합격
  | "rejected";  // 불합격

// ─── 탈락 단계 ───
export type RejectedStage = "document" | "interview" | "final" | "other";

// ─── 공고 출처 ───
export type JobSource = "saramin" | "wanted" | "jobkorea" | "manual";

// ─── 채용 공고 (Firestore 문서) ───
export interface Job {
  id: string;
  source: JobSource;
  sourceUrl: string;
  company: string;
  title: string;
  jd: JobDescription;
  experience?: string;
  education?: string;
  location?: string;
  salary?: string;
  deadline?: string;
  companyAddress?: string;
  foundedDate?: string;
  employeeCount?: string;
  revenue?: string;
  analysis?: Analysis;
  analysisStatus: AnalysisStatus;
  // 지원 관리 필드
  appliedAt?: Timestamp;         // 지원 완료 일시
  interviewDate?: string;        // 면접 예정일 (YYYY-MM-DD)
  memo?: string;                 // 공고별 메모
  rejectedStage?: RejectedStage; // 탈락 단계
  scrapedAt: Timestamp;
  analyzedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── API 요청/응답 DTO ───
export interface ScrapeRequest {
  keyword: string;
  platform: JobSource;
  maxResults?: number;
}

export interface AnalyzeRequest {
  jobId: string;
}

export interface AnalyzeResponse {
  jobId: string;
  analysis: Analysis;
}

// ─── 이력서 컨텍스트 (resume-context.json 스키마) ───
export interface ResumeContext {
  name: string;
  targetRole: string;
  totalExperience: string;
  skills: string[];
  certifications: string[];
  strengths: string[];
  experience: {
    company: string;
    role: string;
    period: string;
    description: string;
    achievements: string[];
  }[];
  education: {
    school: string;
    major: string;
    period: string;
    degree: string;
  }[];
  preferences: {
    industries: string[];
    companySize: string[];
    workStyle: string[];
  };
}

// ─── /api/analyze-match 응답 스키마 ───
export type Recommendation = "SHORTLIST" | "REVIEW_CAREFULLY" | "REJECT";

export interface MatchResult {
  id: string;                      // Firestore 문서 ID
  jobId: string;                   // 연결된 Job 문서 ID
  company: string;
  jobTitle: string;
  sourceUrl: string;
  matchScore: number;              // 0~100
  overallSummary: string;
  strengths: string[];
  criticalGaps: string[];
  recommendation: Recommendation;
  createdAt: Timestamp;
}

