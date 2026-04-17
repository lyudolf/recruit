import { cn } from "@/lib/utils";

interface FitScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

// 점수 구간별 색상 + 라벨
function getScoreConfig(score: number) {
  if (score >= 90) return { color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", label: "최적" };
  if (score >= 70) return { color: "bg-blue-500/15 text-blue-600 border-blue-500/30", label: "우수" };
  if (score >= 50) return { color: "bg-amber-500/15 text-amber-600 border-amber-500/30", label: "보통" };
  if (score >= 30) return { color: "bg-orange-500/15 text-orange-600 border-orange-500/30", label: "약함" };
  return { color: "bg-red-500/15 text-red-600 border-red-500/30", label: "부적합" };
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
};

export default function FitScoreBadge({ score, size = "md" }: FitScoreBadgeProps) {
  const { color, label } = getScoreConfig(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex items-center justify-center rounded-full border font-bold",
          color,
          sizeClasses[size]
        )}
      >
        {score}
      </div>
      {size !== "sm" && (
        <span className={cn("text-[10px] font-medium", color.split(" ")[1])}>
          {label}
        </span>
      )}
    </div>
  );
}
