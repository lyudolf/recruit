"use client";

import Link from "next/link";
import {
  BarChart3,
  Briefcase,
  Heart,
  Send,
  Sparkles,
  Settings,
  Zap,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "대시보드", icon: BarChart3 },
  { href: "/analyze", label: "공고 분석", icon: Sparkles },
  { href: "/bookmarks", label: "관심 공고", icon: Heart },
  { href: "/applications", label: "지원 현황", icon: Send },
  { href: "#settings", label: "설정", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* 로고 */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight">RecruitMatch</h1>
          <p className="text-[10px] text-muted-foreground">AI 채용 매칭</p>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 프로필 */}
      <div className="border-t border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 truncate">
            <p className="text-xs font-medium">서비스 기획 / PM</p>
            <p className="text-[10px] text-muted-foreground">AI·XR 도메인</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
