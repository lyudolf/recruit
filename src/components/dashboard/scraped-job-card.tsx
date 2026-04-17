"use client";

import { useState } from "react";
import { Building2, ExternalLink, Loader2, Sparkles, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Job, AnalysisStatus } from "@/types";

interface ScrapedJobCardProps {
  job: Job;
  onAnalyze: (jobId: string) => Promise<void>;
  onDelete: (jobId: string) => Promise<void>;
}

// 분석 상태별 뱃지 설정
const statusConfig: Record<AnalysisStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "대기중", variant: "outline" },
  analyzing: { label: "분석중", variant: "secondary" },
  completed: { label: "완료", variant: "default" },
  failed: { label: "실패", variant: "destructive" },
};

export default function ScrapedJobCard({ job, onAnalyze, onDelete }: ScrapedJobCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const status = statusConfig[job.analysisStatus];

  async function handleAnalyze() {
    setIsAnalyzing(true);
    try {
      await onAnalyze(job.id);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete(job.id);
    } finally {
      setIsDeleting(false);
    }
  }

  // 스크래핑 시각 포맷
  const scrapedTime = job.scrapedAt?.toDate
    ? job.scrapedAt.toDate().toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <Card className="group transition-all hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        {/* 회사 아이콘 */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* 공고 정보 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold">{job.title}</h4>
            <Badge variant={status.variant} className="shrink-0 text-[10px]">
              {status.label}
            </Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{job.company}</span>
            {job.location && (
              <>
                <span>·</span>
                <span>{job.location}</span>
              </>
            )}
            {scrapedTime && (
              <>
                <span>·</span>
                <Clock className="inline h-3 w-3" />
                <span>{scrapedTime}</span>
              </>
            )}
          </div>
        </div>

        {/* 점수 (분석 완료 시) */}
        {job.analysisStatus === "completed" && job.analysis && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-sm font-bold text-primary">{job.analysis.fitScore}</span>
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* 원문 링크 */}
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {/* 분석 실행 */}
          {job.analysisStatus === "pending" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              분석
            </Button>
          )}

          {job.analysisStatus === "analyzing" && (
            <Button variant="outline" size="sm" className="gap-1 text-xs" disabled>
              <Loader2 className="h-3 w-3 animate-spin" />
              분석중
            </Button>
          )}

          {/* 삭제 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
