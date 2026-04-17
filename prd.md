1. 제품 요구사항 정의서 (PRD)
프로젝트명: AI 개인 맞춤형 채용 매칭 대시보드
목표: 하드코딩된 이력서 데이터를 바탕으로, 웹 스크래핑으로 수집된 채용 공고를 LLM으로 분석하여 적합도(Fit Score)를 평가하고 사용자에게 직관적인 대시보드로 제공.

기술 스택(Tech Stack):

프론트엔드: Next.js 16 (App Router), Tailwind CSS v4, Shadcn UI 

백엔드/데이터베이스: Next.js API Routes, Firebase Cloud Firestore (공고 및 분석 결과 저장) 

스크래핑 엔진: Python, Playwright 또는 Firecrawl API (동적 렌더링 사이트 우회용) 

LLM 엔진: Google Gemini 3 Pro (추론 및 적합도 평가용) 

핵심 모듈 명세:

이력서 컨텍스트 관리: 사용자의 기술 스택, 경력, 선호도를 마크다운(resume.md) 또는 JSON(resume_context.json) 형태로 하드코딩하여 시스템 프롬프트에 주입.

지능형 스크래퍼 (Agent Skill): 사람인, 원티드 등 동적 채용 플랫폼에서 공고 제목, 주요 업무(JD), 자격 요건, 우대 사항을 마크다운/JSON으로 추출하는 백그라운드 스크립트. 

매칭 분석 엔진: 수집된 JD와 하드코딩된 이력서를 교차 검증. Chain of Thought(CoT) 기반 프롬프트를 사용하여 0~100점의 적합도, 강점, 치명적 기술 격차(Critical Gaps)를 JSON으로 반환. 

UI 대시보드: 매칭 점수 순으로 공고를 카드 형태로 정렬하고, 상세 분석 결과를 시각화.