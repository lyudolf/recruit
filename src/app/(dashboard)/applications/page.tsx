"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Send,
  FileCheck,
  XCircle,
  CalendarDays,
  Trophy,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job } from "@/types";

// 상태별 뱃지
const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  applied: { label: "지원완료", className: "border-purple-300 bg-purple-50 text-purple-700" },
  passed: { label: "서류통과", className: "border-cyan-300 bg-cyan-50 text-cyan-700" },
  interview: { label: "면접대기", className: "border-indigo-300 bg-indigo-50 text-indigo-700" },
  hired: { label: "최종합격", className: "border-green-300 bg-green-100 text-green-800" },
  rejected: { label: "불합격", className: "border-rose-300 bg-rose-50 text-rose-700" },
};

export default function ApplicationsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const appliedJobs = jobs.filter((j) =>
    ["applied", "passed", "interview", "hired", "rejected"].includes(j.analysisStatus)
  );

  // 상태 변경
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
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight">지원 현황</h2>
        <p className="text-sm text-muted-foreground">
          지원한 공고의 진행 상태를 관리합니다
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Send className="h-4 w-4 text-purple-500" />
            지원한 공고
            <span className="text-muted-foreground">({appliedJobs.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {appliedJobs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Send className="mb-2 h-8 w-8 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">지원한 공고가 없습니다</p>
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                관심 공고에서 &quot;지원하기&quot;를 클릭해 추가하세요
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {appliedJobs.map((job) => {
                const statusInfo = STATUS_LABELS[job.analysisStatus] ?? STATUS_LABELS.applied;
                return (
                  <div key={job.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
                    {/* 공고 정보 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{job.title}</p>
                        {job.sourceUrl && (
                          <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 text-muted-foreground hover:text-primary">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{job.company}</span>
                        {job.appliedAt && (
                          <>
                            <span>·</span>
                            <span>
                              지원일 {new Date((job.appliedAt as unknown as { _seconds: number })._seconds * 1000).toLocaleDateString("ko-KR")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 현재 상태 */}
                    <Badge variant="outline" className={`shrink-0 text-[10px] ${statusInfo.className}`}>
                      {statusInfo.label}
                    </Badge>

                    {/* 상태 전환 버튼 */}
                    <div className="flex shrink-0 items-center gap-1">
                      {/* 지원완료 → 서류합격 / 불합격 */}
                      {job.analysisStatus === "applied" && (
                        <>
                          <Button size="sm"
                            className="w-24 gap-1 bg-emerald-600 text-[11px] text-white hover:bg-emerald-700"
                            onClick={() => handleStatusChange(job.id, "passed")}>
                            <FileCheck className="h-3 w-3" /> 서류합격
                          </Button>
                          <Button size="sm"
                            className="w-24 gap-1 bg-rose-600 text-[11px] text-white hover:bg-rose-700"
                            onClick={() => handleStatusChange(job.id, "rejected")}>
                            <XCircle className="h-3 w-3" /> 불합격
                          </Button>
                        </>
                      )}
                      {/* 서류통과 → 면접대기 / 불합격 */}
                      {job.analysisStatus === "passed" && (
                        <>
                          <Button size="sm" variant="outline"
                            className="w-24 gap-1 border-indigo-300 text-[11px] text-indigo-700 hover:bg-indigo-50"
                            onClick={() => handleStatusChange(job.id, "interview")}>
                            <CalendarDays className="h-3 w-3" /> 면접대기
                          </Button>
                          <Button size="sm"
                            className="w-24 gap-1 bg-rose-600 text-[11px] text-white hover:bg-rose-700"
                            onClick={() => handleStatusChange(job.id, "rejected")}>
                            <XCircle className="h-3 w-3" /> 불합격
                          </Button>
                        </>
                      )}
                      {/* 면접대기 → 최종합격 / 불합격 */}
                      {job.analysisStatus === "interview" && (
                        <>
                          <Button size="sm"
                            className="w-24 gap-1 bg-green-600 text-[11px] text-white hover:bg-green-700"
                            onClick={() => handleStatusChange(job.id, "hired")}>
                            <Trophy className="h-3 w-3" /> 최종합격
                          </Button>
                          <Button size="sm"
                            className="w-24 gap-1 bg-rose-600 text-[11px] text-white hover:bg-rose-700"
                            onClick={() => handleStatusChange(job.id, "rejected")}>
                            <XCircle className="h-3 w-3" /> 불합격
                          </Button>
                        </>
                      )}
                      {/* 상세 보기 */}
                      <Link href={`/jobs/${job.id}`}>
                        <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground">
                          상세
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
