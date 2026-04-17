import { GoogleGenAI } from "@google/genai";
import type { Analysis } from "@/types";
import { buildAnalysisPrompt } from "./prompts";
import type { ResumeContext, JobDescription } from "@/types";

// Gemini 클라이언트 싱글톤
let genaiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genaiInstance) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENAI_API_KEY 환경변수가 설정되지 않았습니다.");
    }
    genaiInstance = new GoogleGenAI({ apiKey });
  }
  return genaiInstance;
}

// ─── 채용 공고 분석 실행 ───
export async function analyzeJob(
  company: string,
  title: string,
  jd: JobDescription,
  resumeContext: ResumeContext
): Promise<Analysis> {
  const genai = getGenAI();

  const prompt = buildAnalysisPrompt(company, title, jd, resumeContext);

  // 지수 백오프 재시도 (최대 3회)
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await genai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const text = response.text ?? "";

      // JSON 파싱
      const parsed = JSON.parse(text) as Analysis;

      // 기본 유효성 검증
      if (
        typeof parsed.fitScore !== "number" ||
        parsed.fitScore < 0 ||
        parsed.fitScore > 100
      ) {
        throw new Error(`유효하지 않은 fitScore: ${parsed.fitScore}`);
      }

      return {
        fitScore: parsed.fitScore,
        summary: parsed.summary ?? "",
        strengths: parsed.strengths ?? [],
        criticalGaps: parsed.criticalGaps ?? [],
        recommendations: parsed.recommendations ?? [],
        reasoning: parsed.reasoning ?? "",
      };
    } catch (error) {
      lastError = error as Error;

      // Rate limit (429) 시 지수 백오프
      if (
        lastError.message?.includes("429") ||
        lastError.message?.includes("RESOURCE_EXHAUSTED")
      ) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // JSON 파싱 에러 시 재시도
      if (lastError instanceof SyntaxError) {
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error("분석 실패: 최대 재시도 횟수 초과");
}
