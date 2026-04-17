"use client";

import { BarChart3, Zap, ShieldCheck, ShieldAlert } from "lucide-react";
import ScrapeTrigger from "@/components/dashboard/scrape-trigger";
import MatchCard from "@/components/dashboard/match-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useMatchResults } from "@/hooks/use-match-results";

export default function DashboardPage() {
  const { results, isLoading, refetch } = useMatchResults();

  // 통계 계산
  const totalCount = results.length;
  const shortlistCount = results.filter((r) => r.recommendation === "SHORTLIST").length;
  const avgScore =
    totalCount > 0
      ? Math.round(results.reduce((sum, r) => sum + r.matchScore, 0) / totalCount)
      : 0;
  const topScore = totalCount > 0 ? results[0]?.matchScore ?? 0 : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          label="분석 완료"
          value={`${totalCount}건`}
        />
        <StatCard
          icon={<Zap className="h-4 w-4 text-amber-500" />}
          label="최고 점수"
          value={topScore > 0 ? `${topScore}점` : "—"}
          highlight
        />
        <StatCard
          icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />}
          label="SHORTLIST"
          value={`${shortlistCount}건`}
        />
        <StatCard
          icon={<ShieldAlert className="h-4 w-4 text-blue-500" />}
          label="평균 적합도"
          value={avgScore > 0 ? `${avgScore}점` : "—"}
        />
      </div>

      {/* 스크래핑 + 분석 입력 */}
      <ScrapeTrigger onScraped={refetch} />

      <Separator />

      {/* 매칭 결과 리스트 */}
      <section>
        <h3 className="mb-4 text-sm font-semibold tracking-tight">
          분석 결과 <span className="text-muted-foreground">({totalCount})</span>
        </h3>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map((result) => (
              <MatchCard key={result.id} result={result} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 py-16">
            <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">아직 분석된 공고가 없습니다</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              공고 URL을 등록하고 분석을 실행하세요
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── 통계 카드 서브 컴포넌트 ───
function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={`text-xl font-bold tabular-nums ${highlight ? "text-amber-500" : ""}`}>
        {value}
      </p>
    </div>
  );
}
