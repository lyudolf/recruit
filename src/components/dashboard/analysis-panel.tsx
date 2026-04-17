"use client";

import { CheckCircle2, AlertTriangle, Lightbulb, Brain } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Analysis } from "@/types";

interface AnalysisPanelProps {
  analysis: Analysis;
}

export default function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  return (
    <div className="space-y-6">
      {/* 강점 */}
      <section>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          강점 매칭 포인트
        </h4>
        <ul className="space-y-2">
          {analysis.strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
              {s}
            </li>
          ))}
        </ul>
      </section>

      <Separator />

      {/* 치명적 격차 */}
      <section>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-500">
          <AlertTriangle className="h-4 w-4" />
          치명적 기술 격차
        </h4>
        {analysis.criticalGaps.length > 0 ? (
          <ul className="space-y-2">
            {analysis.criticalGaps.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                {g}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">치명적 격차 없음 — 핵심 요건을 충족합니다.</p>
        )}
      </section>

      <Separator />

      {/* 지원 전략 */}
      <section>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-600">
          <Lightbulb className="h-4 w-4" />
          지원 전략 제안
        </h4>
        <ul className="space-y-2">
          {analysis.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
              {r}
            </li>
          ))}
        </ul>
      </section>

      <Separator />

      {/* CoT 추론 과정 */}
      <section>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Brain className="h-4 w-4" />
          AI 추론 과정
        </h4>
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {analysis.reasoning}
          </p>
        </div>
      </section>
    </div>
  );
}
