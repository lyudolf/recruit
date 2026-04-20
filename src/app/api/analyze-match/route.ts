import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { saveMatchResult } from "@/lib/firebase/match-results";
import resumeContext from "../../../../resume_context.json";

// ─── 응답 JSON 스키마 ───
interface AnalyzeMatchResponse {
  matchScore: number;
  overallSummary: string;
  strengths: string[];
  criticalGaps: string[];
  recommendation: "SHORTLIST" | "REVIEW_CAREFULLY" | "REJECT";
}

// ─── Gemini 클라이언트 ───
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENAI_API_KEY 환경변수가 설정되지 않았습니다.");
  return new GoogleGenAI({ apiKey });
}

// ─── CoT 프롬프트: 키워드 매칭 → 의미적 추론 → 격차 분석 ───
function buildCoTPrompt(job: Record<string, unknown>): string {
  const resume = JSON.stringify(resumeContext, null, 2);
  const jobData = JSON.stringify(job, null, 2);

  return `당신은 15년 경력의 시니어 IT 채용 전문 컨설턴트입니다.
아래의 [이력서]와 [채용 공고]를 교차 분석하여 적합도를 평가합니다.

반드시 아래 3단계 사고 과정(Chain of Thought)을 순서대로 수행하세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1단계: 키워드 매칭]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 채용 공고의 자격 요건, 우대 사항, 기술 스택에서 핵심 키워드를 추출하세요.
- 이력서에서 동일한 키워드(또는 동의어/유사어)를 찾아 매칭하세요.
- 매칭된 항목은 strengths 배열에 포함시키세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2단계: 의미적 연관성 추론]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 1단계에서 정확히 매칭되지 않은 요구사항에 대해, 이력서 경험에서 간접적으로 증명할 수 있는 역량이 있는지 추론하세요.
- 예: JD가 "SaaS 운영 경험"을 요구하고, 이력서에 "GA 기반 웹 서비스 고도화"가 있다면 → 간접적 역량으로 인정, strengths에 추가.
- 간접적으로도 증명이 불가능한 항목은 3단계로 넘기세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[3단계: 치명적 격차 분석]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 2단계까지 분석했음에도 이력서로 증명할 수 없는 필수 자격 요건을 식별하세요.
- 이것이 criticalGaps 배열에 들어갑니다.
- 우대 사항은 격차에 포함하지 마세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[최종 점수 산출 및 판정]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
위 3단계 분석 결과를 종합하여:
- matchScore(0~100)를 산출하세요.
- recommendation을 판정하세요:
  - "SHORTLIST": matchScore 70 이상, criticalGaps 0~1개
  - "REVIEW_CAREFULLY": matchScore 40~69, 또는 criticalGaps 2~3개
  - "REJECT": matchScore 40 미만, 또는 criticalGaps 4개 이상

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[이력서]
${resume}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[채용 공고]
${jobData}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

반드시 아래 JSON만 출력하세요. 마크다운 코드블록(\`\`\`), 설명 텍스트, 주석을 절대 포함하지 마세요.

{
  "matchScore": 0,
  "overallSummary": "종합 평가 텍스트",
  "strengths": ["강점 1", "강점 2"],
  "criticalGaps": ["부족한 필수 요건 1"],
  "recommendation": "SHORTLIST"
}`;
}

// ─── POST /api/analyze-match ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.job_title && !body.title) {
      return Response.json(
        { success: false, error: "job_title 또는 title 필드가 필요합니다." },
        { status: 400 }
      );
    }
    if (!body.company) {
      return Response.json(
        { success: false, error: "company 필드가 필요합니다." },
        { status: 400 }
      );
    }

    const genai = getGenAI();
    const prompt = buildCoTPrompt(body);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await genai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        const rawText = response.text ?? "";
        const result = JSON.parse(rawText) as AnalyzeMatchResponse;

        // 유효성 검증
        if (typeof result.matchScore !== "number" || result.matchScore < 0 || result.matchScore > 100) {
          throw new Error(`유효하지 않은 matchScore: ${result.matchScore}`);
        }

        const validRecs = ["SHORTLIST", "REVIEW_CAREFULLY", "REJECT"];
        if (!validRecs.includes(result.recommendation)) {
          throw new Error(`유효하지 않은 recommendation: ${result.recommendation}`);
        }

        // Firestore에 매칭 결과 저장
        const savedId = await saveMatchResult({
          jobId: body.jobId ?? "",
          company: body.company ?? "",
          jobTitle: body.job_title ?? body.title ?? "",
          sourceUrl: body.source_url ?? body.sourceUrl ?? "",
          matchScore: result.matchScore,
          overallSummary: result.overallSummary ?? "",
          strengths: result.strengths ?? [],
          criticalGaps: result.criticalGaps ?? [],
          recommendation: result.recommendation,
        });

        return Response.json({
          success: true,
          data: {
            id: savedId,
            matchScore: result.matchScore,
            overallSummary: result.overallSummary ?? "",
            strengths: result.strengths ?? [],
            criticalGaps: result.criticalGaps ?? [],
            recommendation: result.recommendation,
          },
        });
      } catch (error) {
        lastError = error as Error;

        if (
          lastError.message?.includes("429") ||
          lastError.message?.includes("RESOURCE_EXHAUSTED")
        ) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        if (lastError instanceof SyntaxError) continue;

        throw lastError;
      }
    }

    throw lastError ?? new Error("분석 실패: 최대 재시도 횟수 초과");
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
