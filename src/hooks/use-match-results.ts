"use client";

import { useState, useEffect, useCallback } from "react";
import type { MatchResult } from "@/types";

// ─── 매칭 결과 목록 fetching 훅 ───
export function useMatchResults() {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/match-results");
      const data = await res.json();
      if (data.success) {
        // matchScore 내림차순 정렬
        const sorted = (data.data as MatchResult[]).sort(
          (a, b) => b.matchScore - a.matchScore
        );
        setResults(sorted);
      } else {
        setError(data.error);
      }
    } catch {
      setError("매칭 결과를 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return { results, isLoading, error, refetch: fetchResults };
}
