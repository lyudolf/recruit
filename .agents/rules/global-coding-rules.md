---
description: 프론트엔드 및 백엔드 코드 작성 시 반드시 따라야 하는 전역 코딩 규칙
---

# 전역 코딩 규칙 (Global Rules)

## 1. 프론트엔드 — 단일 책임 원칙 (SRP)

- 모든 React 컴포넌트는 **하나의 명확한 역할만 수행**해야 한다.
- UI 렌더링과 비즈니스 로직을 분리한다:
  - **컴포넌트**: JSX 렌더링 + 이벤트 핸들러 바인딩만 담당
  - **커스텀 훅**: 데이터 fetch, 상태 관리, 사이드 이펙트 로직 담당
- 하나의 컴포넌트 파일이 200줄을 초과하면 분리를 검토한다.
- Props는 명확한 인터페이스로 타입을 정의하고, 컴포넌트명과 동일한 `{ComponentName}Props`를 사용한다.

### 예시 (올바른 패턴)
```tsx
// ✅ 훅에서 로직 분리
function useJobAnalysis(jobId: string) {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  // ... fetch 로직
  return { result, isLoading };
}

// ✅ 컴포넌트는 렌더링만 담당
function AnalysisResult({ jobId }: AnalysisResultProps) {
  const { result, isLoading } = useJobAnalysis(jobId);
  if (isLoading) return <Skeleton />;
  return <AnalysisPanel analysis={result} />;
}
```

---

## 2. 백엔드 API — 에러 핸들링 필수

- **모든 API Route Handler**는 반드시 `try-catch`로 감싸야 한다.
- 에러 응답은 아래 통일된 JSON 형식을 따른다:

```json
{ "success": false, "error": "사람이 읽을 수 있는 에러 메시지" }
```

- HTTP 상태 코드를 의미에 맞게 사용한다:
  - `400` — 잘못된 요청 (필수 필드 누락 등)
  - `404` — 리소스 없음
  - `409` — 중복 충돌
  - `500` — 서버 내부 오류

- **프론트엔드에서 API 호출 시에도** 반드시 에러를 핸들링한다:
  - `fetch` 실패 시 사용자에게 피드백 제공
  - 네트워크 에러와 API 에러를 구분하여 처리

### 예시 (API Route)
```ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ... 비즈니스 로직
    return Response.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
```

### 예시 (프론트엔드 fetch)
```ts
try {
  const res = await fetch("/api/jobs");
  const data = await res.json();
  if (!data.success) {
    // API 레벨 에러 처리
    setError(data.error);
    return;
  }
  setJobs(data.data);
} catch {
  // 네트워크 레벨 에러 처리
  setError("서버에 연결할 수 없습니다.");
}
```
