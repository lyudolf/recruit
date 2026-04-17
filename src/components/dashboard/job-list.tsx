"use client";

import { useState } from "react";
import JobCard from "./job-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import type { Job } from "@/types";

interface JobListProps {
  jobs: Job[];
  isLoading: boolean;
}

export default function JobList({ jobs, isLoading }: JobListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "date">("score");

  // 검색 필터
  const filtered = jobs.filter((job) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.jd.rawText.toLowerCase().includes(q)
    );
  });

  // 정렬
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "score") {
      const scoreA = a.analysis?.fitScore ?? -1;
      const scoreB = b.analysis?.fitScore ?? -1;
      return scoreB - scoreA;
    }
    // date 정렬 — 최신순
    const timeA = a.createdAt?.seconds ?? 0;
    const timeB = b.createdAt?.seconds ?? 0;
    return timeB - timeA;
  });

  // 로딩 스켈레톤
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 검색 + 정렬 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="공고 제목, 회사명으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Button
          variant={sortBy === "score" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortBy("score")}
          className="text-xs"
        >
          점수순
        </Button>
        <Button
          variant={sortBy === "date" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortBy("date")}
          className="text-xs"
        >
          최신순
        </Button>
      </div>

      {/* 결과 카운트 */}
      <p className="text-xs text-muted-foreground">
        총 <span className="font-semibold text-foreground">{sorted.length}</span>건
        {searchQuery && ` (검색: "${searchQuery}")`}
      </p>

      {/* 카드 리스트 */}
      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 py-16">
          <SlidersHorizontal className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "검색 결과가 없습니다" : "등록된 공고가 없습니다"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {searchQuery ? "다른 키워드로 검색해보세요" : "위 입력란에 공고 URL을 붙여넣어 시작하세요"}
          </p>
        </div>
      )}
    </div>
  );
}
