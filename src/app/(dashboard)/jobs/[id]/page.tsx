"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import FitScoreBadge from "@/components/dashboard/fit-score-badge";
import AnalysisPanel from "@/components/dashboard/analysis-panel";
import { useJob, useAnalyze } from "@/hooks/use-jobs";

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { job, isLoading, refetch } = useJob(id);
  const { analyze, isAnalyzing } = useAnalyze();

  async function handleAnalyze() {
    if (!job) return;
    await analyze(job.id);
    refetch();
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  // 공고 없음
  if (!job) {
    return (
      <div className="mx-auto max-w-4xl py-16 text-center">
        <p className="text-muted-foreground">공고를 찾을 수 없습니다.</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">
            대시보드로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* 뒤로가기 */}
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        대시보드
      </Link>

      {/* 공고 헤더 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{job.source}</Badge>
                <Badge
                  variant={job.analysisStatus === "completed" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {job.analysisStatus === "completed" ? "분석 완료" :
                   job.analysisStatus === "analyzing" ? "분석 중..." :
                   job.analysisStatus === "failed" ? "분석 실패" : "대기 중"}
                </Badge>
              </div>
              <h1 className="text-xl font-bold">{job.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{job.company}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {job.location && <span>📍 {job.location}</span>}
                {job.salary && <span>💰 {job.salary}</span>}
                {job.deadline && <span>⏰ ~{job.deadline}</span>}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              {job.analysis ? (
                <FitScoreBadge score={job.analysis.fitScore} size="lg" />
              ) : (
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="gap-1.5"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  AI 분석 실행
                </Button>
              )}
              {job.sourceUrl && (
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  원본 공고
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 분석 결과 */}
      {job.analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI 분석 결과</CardTitle>
            <p className="text-xs text-muted-foreground">{job.analysis.summary}</p>
          </CardHeader>
          <CardContent>
            <AnalysisPanel analysis={job.analysis} />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* JD 원문 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">채용 공고 원문</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {job.jd.mainTasks && job.jd.mainTasks !== "정보 없음" && (
            <section>
              <h4 className="mb-1 text-xs font-semibold text-muted-foreground">주요 업무</h4>
              <p className="whitespace-pre-wrap text-sm">{job.jd.mainTasks}</p>
            </section>
          )}
          {job.jd.requirements && job.jd.requirements !== "정보 없음" && (
            <section>
              <h4 className="mb-1 text-xs font-semibold text-muted-foreground">자격 요건</h4>
              <p className="whitespace-pre-wrap text-sm">{job.jd.requirements}</p>
            </section>
          )}
          {job.jd.preferred && job.jd.preferred !== "정보 없음" && (
            <section>
              <h4 className="mb-1 text-xs font-semibold text-muted-foreground">우대 사항</h4>
              <p className="whitespace-pre-wrap text-sm">{job.jd.preferred}</p>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
