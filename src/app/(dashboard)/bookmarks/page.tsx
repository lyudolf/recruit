"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, Send, ExternalLink, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job } from "@/types";

export default function BookmarksPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (data.success) setJobs(data.data as Job[]);
    } catch (error) {
      console.error("공고 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const bookmarkedJobs = jobs.filter((j) => j.bookmarked);

  // 북마크 해제
  async function removeBookmark(jobId: string) {
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarked: false }),
      });
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, bookmarked: false } : j)));
    } catch (error) {
      console.error("북마크 해제 실패:", error);
    }
  }

  // 지원하기
  async function handleApply(jobId: string) {
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisStatus: "applied" }),
      });
      await fetchJobs();
    } catch (error) {
      console.error("지원 처리 실패:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight">관심 공고</h2>
        <p className="text-sm text-muted-foreground">
          분석 페이지에서 ♥ 표시한 공고들을 관리합니다
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
            관심 공고
            <span className="text-muted-foreground">({bookmarkedJobs.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bookmarkedJobs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Heart className="mb-2 h-8 w-8 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">관심 공고가 없습니다</p>
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                공고 분석 페이지에서 ♥를 클릭해 추가하세요
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {bookmarkedJobs.map((job) => (
                <div key={job.id}>
                  <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
                    {/* 하트 해제 */}
                    <button onClick={() => removeBookmark(job.id)} className="shrink-0 p-0.5">
                      <Heart className="h-4 w-4 fill-rose-500 text-rose-500 transition-colors hover:fill-rose-300 hover:text-rose-300" />
                    </button>

                    {/* 공고 정보 (클릭 → 드롭다운) */}
                    <button
                      onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.company}</p>
                      </div>
                      {job.analysis && (
                        <Badge
                          className={`shrink-0 text-[10px] ${
                            job.analysis.fitScore >= 85
                              ? "bg-emerald-100 text-emerald-700"
                              : job.analysis.fitScore >= 70
                                ? "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {job.analysis.fitScore >= 85 ? "최적" : job.analysis.fitScore >= 70 ? "적합" : "비추천"}{" "}
                          {job.analysis.fitScore}점
                        </Badge>
                      )}
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          expandedId === job.id ? "rotate-90" : ""
                        }`}
                      />
                    </button>

                    {/* 지원하기 버튼 */}
                    {job.analysisStatus === "completed" ? (
                      <Button
                        size="sm"
                        className="shrink-0 gap-1 bg-purple-600 text-xs hover:bg-purple-700"
                        onClick={() => handleApply(job.id)}
                      >
                        <Send className="h-3 w-3" />
                        지원하기
                      </Button>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {job.analysisStatus === "applied" ? "지원완료" :
                         job.analysisStatus === "passed" ? "서류통과" :
                         job.analysisStatus === "interview" ? "면접대기" :
                         job.analysisStatus === "hired" ? "합격" :
                         job.analysisStatus === "rejected" ? "불합격" : job.analysisStatus}
                      </Badge>
                    )}
                  </div>

                  {/* 확장 상세 */}
                  {expandedId === job.id && job.analysis && (
                    <div className="border-t border-border bg-muted/20 px-4 py-4">
                      <p className="mb-3 text-xs text-muted-foreground">{job.analysis.summary}</p>
                      <div className="mb-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="mb-1 text-[10px] font-medium text-emerald-600">강점</p>
                          <ul className="space-y-0.5">
                            {job.analysis.strengths.map((s, i) => (
                              <li key={i} className="text-[11px] text-muted-foreground">• {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-medium text-red-500">격차</p>
                          {job.analysis.criticalGaps.length > 0 ? (
                            <ul className="space-y-0.5">
                              {job.analysis.criticalGaps.map((g, i) => (
                                <li key={i} className="text-[11px] text-muted-foreground">• {g}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">격차 없음</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/jobs/${job.id}`}>
                          <Button variant="outline" size="sm" className="text-xs">전체 분석 보기</Button>
                        </Link>
                        {job.sourceUrl && (
                          <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                              <ExternalLink className="h-3 w-3" /> 원문 보기
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
