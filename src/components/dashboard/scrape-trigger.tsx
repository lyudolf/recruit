"use client";

import { useState } from "react";
import { Globe, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScrapeTriggerProps {
  onScraped?: () => void;
}

export default function ScrapeTrigger({ onScraped }: ScrapeTriggerProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleScrape() {
    if (!url.trim()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), source: "manual" }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `✅ "${data.data.company} — ${data.data.title}" 등록 완료`,
        });
        setUrl("");
        onScraped?.();
      } else {
        setMessage({ type: "error", text: `❌ ${data.error}` });
      }
    } catch {
      setMessage({ type: "error", text: "❌ 네트워크 오류가 발생했습니다." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
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
            placeholder="채용 공고 URL을 붙여넣으세요"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScrape()}
            disabled={isLoading}
            className="text-sm"
          />
          <Button
            onClick={handleScrape}
            disabled={isLoading || !url.trim()}
            size="sm"
            className="gap-1.5 whitespace-nowrap"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            등록
          </Button>
        </div>
        {message && (
          <p className={`mt-2 text-xs ${message.type === "success" ? "text-emerald-600" : "text-red-500"}`}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
