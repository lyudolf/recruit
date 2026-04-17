"use client";

import Link from "next/link";
import { Building2, MapPin, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FitScoreBadge from "./fit-score-badge";
import type { Job } from "@/types";

interface JobCardProps {
  job: Job;
}

// 분석 상태별 뱃지
function StatusBadge({ status }: { status: Job["analysisStatus"] }) {
  const config = {
    pending: { label: "대기 중", variant: "outline" as const },
    analyzing: { label: "분석 중...", variant: "secondary" as const },
    completed: { label: "분석 완료", variant: "default" as const },
    failed: { label: "분석 실패", variant: "destructive" as const },
  };
  const { label, variant } = config[status];
  return <Badge variant={variant} className="text-[10px]">{label}</Badge>;
}

export default function JobCard({ job }: JobCardProps) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className="group cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex items-start gap-4 p-5">
          {/* Fit Score */}
          <div className="flex-shrink-0 pt-1">
            {job.analysis ? (
              <FitScoreBadge score={job.analysis.fitScore} size="md" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-muted-foreground/30">
                <span className="text-[10px] text-muted-foreground">—</span>
              </div>
            )}
          </div>

          {/* 공고 정보 */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <StatusBadge status={job.analysisStatus} />
              <Badge variant="outline" className="text-[10px]">
                {job.source}
              </Badge>
            </div>

            <h3 className="mb-1 truncate text-sm font-semibold group-hover:text-primary">
              {job.title}
            </h3>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {job.company}
              </span>
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </span>
              )}
              {job.deadline && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~{job.deadline}
                </span>
              )}
            </div>

            {/* 분석 요약 */}
            {job.analysis && (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {job.analysis.summary}
              </p>
            )}
          </div>

          {/* 외부 링크 아이콘 */}
          {job.sourceUrl && (
            <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
