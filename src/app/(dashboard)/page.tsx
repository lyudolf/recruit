"use client";

import { useState, useMemo } from "react";
import {
  Globe,
  Plus,
  Loader2,
  ExternalLink,
  Trash2,
  Filter,
  BarChart3,
  Sparkles,
  Send,
  Trophy,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useScrapedJobs } from "@/hooks/use-scraped-jobs";
import type { AnalysisStatus } from "@/types";

// ─── 상태 뱃지 설정 (10단계) ───
const STATUS_CONFIG: Record<AnalysisStatus, { label: string; className: string }> = {
  scraped: {
    label: "스크랩",
    className: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400",
  },
  queued: {
    label: "분석대기",
    className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  analyzing: {
    label: "분석중",
    className: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  completed: {
    label: "분석완료",
    className: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  failed: {
    label: "실패",
    className: "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300",
  },
  applied: {
    label: "지원완료",
    className: "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  passed: {
    label: "서류통과",
    className: "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  },
  interview: {
    label: "면접대기",
    className: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  },
  hired: {
    label: "최종합격",
    className: "border-green-400 bg-green-100 text-green-800 dark:border-green-600 dark:bg-green-950 dark:text-green-300",
  },
  rejected: {
    label: "불합격",
    className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
};

// ─── 플랫폼 뱃지 ───
const PLATFORM_CONFIG: Record<string, { label: string; className: string }> = {
  saramin: { label: "사람인", className: "border-blue-300 bg-blue-50 text-blue-700" },
  wanted: { label: "원티드", className: "border-indigo-300 bg-indigo-50 text-indigo-700" },
  jobkorea: { label: "잡코리아", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  manual: { label: "수동", className: "border-slate-300 bg-slate-50 text-slate-600" },
};

// ─── 필터 탭 ───
const STATUS_FILTERS = [
  { key: "all", label: "전체" },
  { key: "pre-analysis", label: "분석 전", statuses: ["scraped", "queued", "analyzing", "failed"] },
  { key: "analyzed", label: "분석완료", statuses: ["completed"] },
  { key: "applied", label: "지원", statuses: ["applied", "passed", "interview"] },
  { key: "result", label: "결과", statuses: ["hired", "rejected"] },
] as const;

// ─── 마감 임박 체크 (D-3) ───
function getDaysUntilDeadline(deadline?: string): number | null {
  if (!deadline) return null;
  const match = deadline.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return null;
  const deadlineDate = new Date(match[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const { jobs, isLoading, refetch } = useScrapedJobs();
  const [url, setUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ─── 통계 계산 ───
  const stats = useMemo(() => {
    const total = jobs.length;
    const analyzed = jobs.filter((j) => j.analysisStatus === "completed" || j.analysis);
    const avgScore = analyzed.length > 0
      ? Math.round(analyzed.reduce((s, j) => s + (j.analysis?.fitScore ?? 0), 0) / analyzed.length)
      : 0;
    const applied = jobs.filter((j) =>
      ["applied", "passed", "interview", "hired", "rejected"].includes(j.analysisStatus)
    ).length;
    const passedOrMore = jobs.filter((j) =>
      ["passed", "interview", "hired"].includes(j.analysisStatus)
    ).length;
    const passRate = applied > 0 ? Math.round((passedOrMore / applied) * 100) : 0;
    const urgent = jobs.filter((j) => {
      const d = getDaysUntilDeadline(j.deadline);
      return d !== null && d >= 0 && d <= 3 && !["applied", "passed", "interview", "hired", "rejected"].includes(j.analysisStatus);
    }).length;
    return { total, analyzedCount: analyzed.length, avgScore, applied, passRate, urgent };
  }, [jobs]);

  // ─── URL 등록 ───
  async function handleScrape() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setIsScraping(true);
    setScrapeError(null);
    try {
      const source = trimmed.includes("wanted.co.kr")
        ? "wanted"
        : trimmed.includes("jobkorea.co.kr")
          ? "jobkorea"
          : "saramin";
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, source }),
      });
      const data = await res.json();
      if (data.success) { setUrl(""); refetch(); }
      else setScrapeError(data.error);
    } catch { setScrapeError("네트워크 오류가 발생했습니다."); }
    finally { setIsScraping(false); }
  }

  // ─── 삭제 ───
  async function handleDelete(jobId: string) {
    try { await fetch(`/api/jobs/${jobId}`, { method: "DELETE" }); refetch(); }
    catch (error) { console.error("삭제 실패:", error); }
  }

  // ─── 필터링 ───
  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (platformFilter !== "all") {
      result = result.filter((j) => j.source === platformFilter);
    }
    if (statusFilter !== "all") {
      const filterDef = STATUS_FILTERS.find((f) => f.key === statusFilter);
      if (filterDef && "statuses" in filterDef) {
        result = result.filter((j) => (filterDef.statuses as readonly string[]).includes(j.analysisStatus));
      }
    }
    return result;
  }, [jobs, platformFilter, statusFilter]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">채용 매칭 대시보드</h2>
          <p className="text-sm text-muted-foreground">
            채용 공고 URL을 등록하면 자동으로 정보를 추출합니다
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </Button>
      </div>

      {/* ─── 통계 카드 ─── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900">
              <BarChart3 className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">총 스크랩</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900">
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">분석완료 · 평균</p>
              <p className="text-lg font-bold">
                {stats.analyzedCount}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  ({stats.avgScore}점)
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
              <Send className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">지원현황</p>
              <p className="text-lg font-bold">{stats.applied}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900">
              <Trophy className="h-4 w-4 text-cyan-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">서류통과율</p>
              <p className="text-lg font-bold">{stats.passRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 마감 임박 알림 ─── */}
      {stats.urgent > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 dark:border-amber-700 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            마감 임박 공고 {stats.urgent}건 — 3일 이내 마감됩니다
          </p>
        </div>
      )}

      {/* URL 스크래핑 카드 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4" />
            공고 URL 스크래핑
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="사람인 또는 원티드 공고 URL을 붙여넣으세요"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScrape()}
              disabled={isScraping}
              className="flex-1"
            />
            <Button onClick={handleScrape} disabled={isScraping || !url.trim()} size="sm">
              {isScraping ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
              등록
            </Button>
          </div>
          {scrapeError && <p className="mt-2 text-xs text-destructive">{scrapeError}</p>}
        </CardContent>
      </Card>

      {/* 공고 리스트 */}
      <section>
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">
              스크랩된 공고{" "}
              <span className="text-muted-foreground">({filteredJobs.length})</span>
            </h3>

            {/* 플랫폼 필터 */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {["all", "saramin", "wanted", "jobkorea"].map((key) => (
                <button
                  key={key}
                  onClick={() => setPlatformFilter(key)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    platformFilter === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {key === "all" ? "전체" : PLATFORM_CONFIG[key]?.label ?? key}
                </button>
              ))}
            </div>
          </div>

          {/* 상태 필터 */}
          <div className="flex gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  statusFilter === f.key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="w-[72px] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">플랫폼</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">공고명</th>
                  <th className="w-[80px] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">기업명</th>
                  <th className="w-[80px] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">경력</th>
                  <th className="w-[72px] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">마감일</th>
                  <th className="w-[80px] px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">상태</th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job, i) => {
                  const status = STATUS_CONFIG[job.analysisStatus] ?? STATUS_CONFIG.scraped;
                  const platform = PLATFORM_CONFIG[job.source] ?? PLATFORM_CONFIG.manual;
                  const daysLeft = getDaysUntilDeadline(job.deadline);
                  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3
                    && !["applied", "passed", "interview", "hired", "rejected"].includes(job.analysisStatus);

                  return (
                    <tr
                      key={job.id}
                      className={`border-b border-border transition-colors last:border-b-0 hover:bg-muted/30 ${
                        i % 2 === 0 ? "" : "bg-muted/10"
                      } ${isUrgent ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}
                    >
                      <td className="px-3 py-3">
                        <Badge variant="outline" className={`text-[10px] ${platform.className}`}>
                          {platform.label}
                        </Badge>
                      </td>
                      <td className="max-w-[200px] px-3 py-3">
                        <div className="flex items-start gap-1.5">
                          <span className="truncate text-xs font-medium" title={job.title}>
                            {job.title}
                          </span>
                          {job.sourceUrl && (
                            <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer"
                              className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs">{job.company}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{job.experience || "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">{job.deadline || "—"}</span>
                          {isUrgent && (
                            <span className="text-[9px] font-bold text-amber-600">D-{daysLeft}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => handleDelete(job.id)}
                          className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 py-16">
            <Globe className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">스크랩된 공고가 없습니다</p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">상단에 채용 공고 URL을 붙여넣어 시작하세요</p>
          </div>
        )}
      </section>
    </div>
  );
}
