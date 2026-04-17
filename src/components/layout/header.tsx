"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">채용 매칭 대시보드</h2>
        <p className="text-xs text-muted-foreground">
          AI 기반 적합도 분석으로 최적의 포지션을 찾아보세요
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </Button>
      </div>
    </header>
  );
}
