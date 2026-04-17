import type { JobDescription, ResumeContext } from "@/types";

// ─── Chain of Thought 분석 프롬프트 빌더 ───
export function buildAnalysisPrompt(
  company: string,
  title: string,
  jd: JobDescription,
  resume: ResumeContext
): string {
  return `당신은 15년 경력의 시니어 IT 채용 전문가입니다. 주어진 이력서와 채용 공고를 교차 분석하여 적합도를 평가합니다.

## 사용자 이력서 컨텍스트

- 이름: ${resume.name}
- 목표 직무: ${resume.targetRole}
- 총 경력: ${resume.totalExperience}
- 보유 스킬: ${resume.skills.join(", ")}
- 자격증: ${resume.certifications.join(", ")}
- 핵심 강점:
${resume.strengths.map((s) => `  - ${s}`).join("\n")}

### 경력 사항
${resume.experience
  .map(
    (exp) => `
**${exp.company}** (${exp.role}, ${exp.period})
${exp.description}
주요 성과:
${exp.achievements.map((a) => `  - ${a}`).join("\n")}
`
  )
  .join("\n")}

### 선호 조건
- 선호 산업: ${resume.preferences.industries.join(", ")}
- 선호 기업 규모: ${resume.preferences.companySize.join(", ")}
- 선호 업무 환경: ${resume.preferences.workStyle.join(", ")}

---

## 분석 대상 채용 공고

- 회사: ${company}
- 공고 제목: ${title}
- 주요 업무: ${jd.mainTasks}
- 자격 요건: ${jd.requirements}
- 우대 사항: ${jd.preferred}

---

## 분석 지시사항

다음 단계를 순서대로 수행하세요 (Chain of Thought):

1. **요구사항 분해**: 공고의 핵심 요구 기술/경험을 항목별로 나열하세요.
2. **매칭 분석**: 각 요구사항에 대해 이력서에서 직접적으로 매칭되는 경험·스킬을 찾고, 매칭 강도(강/중/약/없음)를 평가하세요.
3. **격차 식별**: 이력서에 전혀 없는 필수 요건(치명적 기술 격차)을 식별하세요. 우대사항은 격차에 포함하지 마세요.
4. **종합 평가**: 위 분석을 종합하여 0~100점의 적합도 점수를 산출하세요.
   - 90~100: 거의 완벽한 매칭
   - 70~89: 강한 매칭, 일부 보완 필요
   - 50~69: 보통, 핵심 역량은 있으나 격차 존재
   - 30~49: 약한 매칭, 상당한 격차
   - 0~29: 부적합
5. **지원 전략**: 지원 시 어떤 포인트를 강조하면 좋을지, 어떤 격차를 보완할 수 있는지 구체적으로 제안하세요.

반드시 아래 JSON 형식으로만 응답하세요. JSON 외의 텍스트는 포함하지 마세요:

{
  "fitScore": number,
  "summary": "종합 평가 1~2문장",
  "strengths": ["강점 매칭 포인트 1", "강점 매칭 포인트 2", ...],
  "criticalGaps": ["치명적 기술 격차 1", ...],
  "recommendations": ["지원 전략 제안 1", ...],
  "reasoning": "위 1~5 단계의 상세한 추론 과정 전문"
}`;
}
