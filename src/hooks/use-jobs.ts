"use client";

import { useState, useEffect, useCallback } from "react";
import type { Job } from "@/types";

// ─── 공고 데이터 fetching 커스텀 훅 ───
export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      } else {
        setError(data.error);
      }
    } catch {
      setError("공고 목록을 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, isLoading, error, refetch: fetchJobs };
}

// ─── 단일 공고 fetching 훅 ───
export function useJob(id: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${id}`);
      const data = await res.json();
      if (data.success) {
        setJob(data.data);
      } else {
        setError(data.error);
      }
    } catch {
      setError("공고 정보를 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  return { job, isLoading, error, refetch: fetchJob };
}

// ─── 분석 실행 훅 ───
export function useAnalyze() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = async (jobId: string) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      return data;
    } catch {
      return { success: false, error: "분석 요청에 실패했습니다." };
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { analyze, isAnalyzing };
}
