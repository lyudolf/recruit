"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import type { MatchResult, Recommendation } from "@/types";

// ─── 점수 구간별 스타일 ───
function getScoreStyle(score: number) {
  if (score >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600", label: "최적" };
  if (score >= 60) return { bar: "bg-blue-500", text: "text-blue-600", label: "우수" };
  if (score >= 40) return { bar: "bg-amber-500", text: "text-amber-600", label: "보통" };
  return { bar: "bg-red-500", text: "text-red-500", label: "부적합" };
}

// ─── Recommendation 뱃지 ───
function RecommendationBadge({ rec }: { rec: Recommendation }) {
  const config = {
    SHORTLIST: { icon: ShieldCheck, label: "추천", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" },
    REVIEW_CAREFULLY: { icon: ShieldAlert, label: "검토 필요", className: "border-amber-500/30 bg-amber-500/10 text-amber-600" },
    REJECT: { icon: ShieldX, label: "부적합", className: "border-red-500/30 bg-red-500/10 text-red-500" },
  };
  const { icon: Icon, label, className } = config[rec];
  return (
    <Badge variant="outline" className={cn("gap-1 text-[10px] font-semibold", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// ─── 매칭 카드 컴포넌트 ───
interface MatchCardProps {
  result: MatchResult;
}

export default function MatchCard({ result }: MatchCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const style = getScoreStyle(result.matchScore);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card
        className={cn(
          "transition-all duration-200",
          isOpen ? "border-primary/40 shadow-lg" : "hover:border-primary/20 hover:shadow-md"
        )}
      >
        <CollapsibleTrigger className="w-full text-left">
          <CardContent className="cursor-pointer p-5">
            <div className="flex items-center gap-4">
              {/* 점수 */}
              <div className="flex w-16 flex-shrink-0 flex-col items-center">
                <span className={cn("text-2xl font-bold tabular-nums", style.text)}>
                  {result.matchScore}
                </span>
                <span className={cn("text-[10px] font-medium", style.text)}>{style.label}</span>
              </div>

              {/* 프로그레스 바 + 정보 */}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <RecommendationBadge rec={result.recommendation} />
                </div>

                <h3 className="mb-1 truncate text-sm font-semibold">{result.jobTitle}</h3>

                <div className="mb-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>{result.company}</span>
                </div>

                {/* 프로그레스 바 */}
                <div className="relative">
                  <Progress
                    value={result.matchScore}
                    className="h-2 bg-muted"
                  />
                  {/* 프로그레스 바 위에 커스텀 색상 오버레이 */}
                  <div
                    className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", style.bar)}
                    style={{ width: `${result.matchScore}%` }}
                  />
                </div>

                <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                  {result.overallSummary}
                </p>
              </div>

              {/* 확장 아이콘 */}
              <ChevronDown
                className={cn(
                  "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CardContent>
        </CollapsibleTrigger>

        {/* 확장 상세 */}
        <CollapsibleContent>
          <Separator />
          <div className="space-y-5 p-5">
            {/* 종합 평가 */}
            <p className="text-sm leading-relaxed text-foreground/80">{result.overallSummary}</p>

            {/* 강점 */}
            <section>
              <h4 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Strengths — 매칭 강점
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {result.strengths.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2"
                  >
                    <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-500" />
                    <span className="text-xs leading-relaxed">{s}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 치명적 격차 */}
            {result.criticalGaps.length > 0 && (
              <section>
                <h4 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Critical Gaps — 부족한 필수 요건
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {result.criticalGaps.map((g, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2"
                    >
                      <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-400" />
                      <span className="text-xs leading-relaxed">{g}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 원본 공고 링크 */}
            {result.sourceUrl && (
              <div className="flex justify-end">
                <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <ExternalLink className="h-3 w-3" />
                    원본 공고
                  </Button>
                </a>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
