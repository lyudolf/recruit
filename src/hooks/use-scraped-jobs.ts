"use client";

import { useState, useEffect, useCallback } from "react";
import type { Job } from "@/types";

export function useScrapedJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/jobs");
      const data = await res.json();

      if (data.success) {
        setJobs(data.data as Job[]);
      }
    } catch (error) {
      console.error("공고 목록 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, isLoading, refetch: fetchJobs };
}
