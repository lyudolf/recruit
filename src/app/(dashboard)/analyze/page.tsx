"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  ChevronRight,
  Send,
  Trophy,
  XCircle,
  FileCheck,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";
import type { Job } from "@/types";

export default function AnalyzePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ─── 데이터 로드 ───
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

  // ─── 분류 ───
  const pendingJobs = jobs.filter((j) =>
    ["scraped", "queued", "failed"].includes(j.analysisStatus)
  );
  const completedJobs = jobs.filter((j) =>
    ["completed", "applied", "passed", "interview", "hired", "rejected"].includes(j.analysisStatus)
  );

  // ─── 체크박스 토글 ───
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === pendingJobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingJobs.map((j) => j.id)));
    }
  }

  // ─── 분석 큐 시작 ───
  async function startQueue() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsQueueRunning(true);
    setQueueIds(ids);
    setSelectedIds(new Set());

    // Firestore에 queued 상태로 일괄 업데이트
    try {
      await fetch("/api/analyze-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: ids }),
      });
    } catch (error) {
      console.error("큐 등록 실패:", error);
      setIsQueueRunning(false);
      return;
    }

    // 순차 분석
    for (const id of ids) {
      setCurrentId(id);
      // 현재 분석 시작 → 대기 큐에서 즉시 제거
      setQueueIds((prev) => prev.filter((qId) => qId !== id));
      try {
        await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: id }),
        });
      } catch (error) {
        console.error(`분석 실패 (${id}):`, error);
      }
      await fetchJobs();
    }

    setCurrentId(null);
    setIsQueueRunning(false);
    setQueueIds([]);
    await fetchJobs();
  }

  // ─── 상태 변경 ───
  async function handleStatusChange(jobId: string, status: string) {
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisStatus: status }),
      });
      await fetchJobs();
    } catch (error) {
      console.error("상태 변경 실패:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-lg font-bold tracking-tight">공고 분석</h2>
        <p className="text-sm text-muted-foreground">
          스크랩된 공고를 선택하여 AI 적합도 분석을 실행합니다
        </p>
      </div>

      {/* ─── 분석 큐 (상단 가로형) ─── */}
      {(isQueueRunning || queueIds.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              분석 큐
              <span className="text-muted-foreground">
                {isQueueRunning
                  ? `(${queueIds.length}건 대기)`
                  : "처리 완료"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {/* 현재 분석중 */}
              {currentId && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/30">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {jobs.find((j) => j.id === currentId)?.title ?? "..."}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {jobs.find((j) => j.id === currentId)?.company} · 분석중
                    </p>
                  </div>
                </div>
              )}

              {/* 대기중 */}
              {queueIds.map((id) => {
                const job = jobs.find((j) => j.id === id);
                if (!job) return null;
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                  >
                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-xs">{job.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {job.company} · 대기중
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 분석 대기 섹션 ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-500" />
              분석 대기
              <span className="text-muted-foreground">({pendingJobs.length})</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {pendingJobs.length > 0 && (
                <button
                  onClick={selectAll}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {selectedIds.size === pendingJobs.length ? "전체 해제" : "전체 선택"}
                </button>
              )}
              <Button
                size="sm"
                onClick={startQueue}
                disabled={selectedIds.size === 0 || isQueueRunning}
                className="gap-1.5"
              >
                {isQueueRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                분석 시작 ({selectedIds.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {pendingJobs.length === 0 ? (
            <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
              분석 대기중인 공고가 없습니다
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingJobs.map((job) => (
                <label
                  key={job.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(job.id)}
                    onChange={() => toggleSelect(job.id)}
                    disabled={isQueueRunning}
                    className="h-4 w-4 rounded border-muted-foreground/30"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.company}</p>
                  </div>
                  {job.analysisStatus === "failed" && (
                    <Badge variant="outline" className="border-red-300 bg-red-50 text-[10px] text-red-600">
                      재시도
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 분석 완료 섹션 ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            분석 완료
            <span className="text-muted-foreground">({completedJobs.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {completedJobs.length === 0 ? (
            <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
              분석 완료된 공고가 없습니다
            </div>
          ) : (
            <div className="divide-y divide-border">
              {completedJobs.map((job) => (
                <div key={job.id}>
                  {/* 공고 행 */}
                  <button
                    onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.company}</p>
                    </div>
                    {job.analysis && (
                      <Badge
                        className={`text-[10px] ${
                          job.analysis.fitScore >= 85
                            ? "bg-emerald-100 text-emerald-700"
                            : job.analysis.fitScore >= 70
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {job.analysis.fitScore >= 85
                          ? "최적"
                          : job.analysis.fitScore >= 70
                            ? "적합"
                            : "비추천"}{" "}
                        {job.analysis.fitScore}점
                      </Badge>
                    )}
                    {job.analysisStatus === "applied" && (
                      <Badge className="bg-purple-100 text-[10px] text-purple-700">
                        지원완료
                      </Badge>
                    )}
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                        expandedId === job.id ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {/* 확장 상세 */}
                  {expandedId === job.id && job.analysis && (
                    <div className="border-t border-border bg-muted/20 px-4 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {job.analysis.summary}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link href={`/jobs/${job.id}`}>
                            <Button variant="outline" size="sm" className="text-xs">
                              상세 보기
                            </Button>
                          </Link>
                          {/* 분석완료 → 지원완료 */}
                          {job.analysisStatus === "completed" && (
                            <Button size="sm" className="gap-1 bg-purple-600 text-xs hover:bg-purple-700"
                              onClick={() => handleStatusChange(job.id, "applied")}>
                              <Send className="h-3 w-3" /> 지원 완료
                            </Button>
                          )}
                          {/* 지원완료 → 서류통과 or 불합격 */}
                          {job.analysisStatus === "applied" && (
                            <>
                              <Button size="sm" variant="outline" className="gap-1 border-cyan-300 text-xs text-cyan-700 hover:bg-cyan-50"
                                onClick={() => handleStatusChange(job.id, "passed")}>
                                <FileCheck className="h-3 w-3" /> 서류통과
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 border-rose-300 text-xs text-rose-600 hover:bg-rose-50"
                                onClick={() => handleStatusChange(job.id, "rejected")}>
                                <XCircle className="h-3 w-3" /> 불합격
                              </Button>
                            </>
                          )}
                          {/* 서류통과 → 면접대기 or 불합격 */}
                          {job.analysisStatus === "passed" && (
                            <>
                              <Button size="sm" variant="outline" className="gap-1 border-indigo-300 text-xs text-indigo-700 hover:bg-indigo-50"
                                onClick={() => handleStatusChange(job.id, "interview")}>
                                <CalendarDays className="h-3 w-3" /> 면접대기
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 border-rose-300 text-xs text-rose-600 hover:bg-rose-50"
                                onClick={() => handleStatusChange(job.id, "rejected")}>
                                <XCircle className="h-3 w-3" /> 불합격
                              </Button>
                            </>
                          )}
                          {/* 면접대기 → 최종합격 or 불합격 */}
                          {job.analysisStatus === "interview" && (
                            <>
                              <Button size="sm" className="gap-1 bg-green-600 text-xs hover:bg-green-700"
                                onClick={() => handleStatusChange(job.id, "hired")}>
                                <Trophy className="h-3 w-3" /> 최종합격
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 border-rose-300 text-xs text-rose-600 hover:bg-rose-50"
                                onClick={() => handleStatusChange(job.id, "rejected")}>
                                <XCircle className="h-3 w-3" /> 불합격
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="mb-1 text-[10px] font-medium text-emerald-600">강점</p>
                          <ul className="space-y-0.5">
                            {job.analysis.strengths.slice(0, 2).map((s, i) => (
                              <li key={i} className="truncate text-[11px] text-muted-foreground">
                                • {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-medium text-red-500">격차</p>
                          {job.analysis.criticalGaps.length > 0 ? (
                            <ul className="space-y-0.5">
                              {job.analysis.criticalGaps.slice(0, 2).map((g, i) => (
                                <li key={i} className="truncate text-[11px] text-muted-foreground">
                                  • {g}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">격차 없음</p>
                          )}
                        </div>
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
