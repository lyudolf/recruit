"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  Upload,
  CheckCircle2,
  XCircle,
  FileText,
  Globe,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import ScrapedJobCard from "@/components/dashboard/scraped-job-card";
import { useScrapedJobs } from "@/hooks/use-scraped-jobs";

// ─── 타입 ───
interface SearchResult {
  title: string;
  url: string;
}

interface UrlResult {
  url: string;
  status: "pending" | "success" | "error";
  message?: string;
}

export default function CollectPage() {
  const { jobs, isLoading, refetch } = useScrapedJobs();

  // 키워드 검색
  const [keyword, setKeyword] = useState("");
  const [platform, setPlatform] = useState<"saramin" | "wanted">("saramin");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [searchMeta, setSearchMeta] = useState<{ keyword: string; total: number } | null>(null);

  // URL 일괄 입력 (토글)
  const [showManualInput, setShowManualInput] = useState(false);
  const [urls, setUrls] = useState("");

  // 스크래핑 진행
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlResults, setUrlResults] = useState<UrlResult[]>([]);

  // ─── 키워드 검색 실행 ───
  async function handleSearch() {
    if (!keyword.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setSelectedUrls(new Set());
    setSearchMeta(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), platform, maxResults: 20 }),
      });
      const data = await res.json();

      if (data.success) {
        setSearchResults(data.data.results);
        setSearchMeta({ keyword: data.data.keyword, total: data.data.totalFound });
      } else {
        console.error("검색 실패:", data.error);
      }
    } catch (error) {
      console.error("검색 오류:", error);
    } finally {
      setIsSearching(false);
    }
  }

  // ─── 체크박스 토글 ───
  function toggleSelect(url: string) {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }

  // ─── 전체 선택 / 해제 ───
  function toggleSelectAll() {
    if (selectedUrls.size === searchResults.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(searchResults.map((r) => r.url)));
    }
  }

  // ─── 선택된 공고 일괄 스크래핑 ───
  async function handleBatchScrapeSelected() {
    const urlList = Array.from(selectedUrls);
    if (urlList.length === 0) return;
    await runBatchScrape(urlList);
  }

  // ─── 수동 URL 일괄 스크래핑 ───
  async function handleManualBatchScrape() {
    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http://") || u.startsWith("https://"));
    if (urlList.length === 0) return;
    await runBatchScrape(urlList);
    setUrls("");
  }

  // ─── 공통 배치 스크래핑 로직 ───
  async function runBatchScrape(urlList: string[]) {
    setIsSubmitting(true);
    const results: UrlResult[] = urlList.map((url) => ({ url, status: "pending" as const }));
    setUrlResults([...results]);

    for (let i = 0; i < results.length; i++) {
      try {
        const source = results[i].url.includes("wanted.co.kr") ? "wanted" : "saramin";
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: results[i].url, source }),
        });
        const data = await res.json();

        if (data.success) {
          results[i] = {
            ...results[i],
            status: "success",
            message: `${data.data.company} — ${data.data.title}`,
          };
        } else {
          results[i] = { ...results[i], status: "error", message: data.error };
        }
      } catch {
        results[i] = { ...results[i], status: "error", message: "네트워크 오류" };
      }
      setUrlResults([...results]);
    }

    setIsSubmitting(false);
    setSelectedUrls(new Set());
    refetch();
  }

  // ─── 분석, 삭제 핸들러 ───
  async function handleAnalyze(jobId: string) {
    try {
      await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      refetch();
    } catch (error) {
      console.error("분석 실행 실패:", error);
    }
  }

  async function handleDelete(jobId: string) {
    try {
      await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      refetch();
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  }

  const pendingJobs = jobs.filter((j) => j.analysisStatus === "pending" || j.analysisStatus === "failed");
  const analyzedJobs = jobs.filter((j) => j.analysisStatus === "completed" || j.analysisStatus === "analyzing");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h2 className="text-lg font-bold tracking-tight">공고 수집</h2>
        <p className="text-sm text-muted-foreground">
          키워드로 채용 공고를 검색하고, 선택한 공고를 자동으로 수집합니다
        </p>
      </div>

      {/* ═══ 키워드 검색 섹션 ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Search className="h-4 w-4" />
            채용 공고 검색
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 검색 입력 */}
          <div className="flex gap-2">
            {/* 플랫폼 선택 */}
            <div className="relative">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as "saramin" | "wanted")}
                className="h-9 appearance-none rounded-lg border border-input bg-background py-1 pl-3 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="saramin">사람인</option>
                <option value="wanted">원티드</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>

            <Input
              placeholder="검색 키워드 (예: 서비스 기획, PM, XR)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={isSearching}
              className="flex-1 text-sm"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !keyword.trim()}
              size="sm"
              className="gap-1.5 whitespace-nowrap"
            >
              {isSearching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              검색
            </Button>
          </div>

          {/* 검색 결과 */}
          {isSearching && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-2">
              {/* 결과 헤더 */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  &quot;{searchMeta?.keyword}&quot; 검색 결과 — {searchMeta?.total}건 중 {searchResults.length}건 표시
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs text-primary hover:underline"
                  >
                    {selectedUrls.size === searchResults.length ? "전체 해제" : "전체 선택"}
                  </button>
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedUrls.size}건 선택
                  </Badge>
                </div>
              </div>

              {/* 결과 리스트 */}
              <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                {searchResults.map((result, i) => (
                  <label
                    key={i}
                    className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${
                      selectedUrls.has(result.url) ? "bg-primary/5" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUrls.has(result.url)}
                      onChange={() => toggleSelect(result.url)}
                      className="h-3.5 w-3.5 rounded border-input accent-primary"
                    />
                    <span className="min-w-0 flex-1 truncate">{result.title}</span>
                  </label>
                ))}
              </div>

              {/* 선택 공고 스크래핑 버튼 */}
              <Button
                onClick={handleBatchScrapeSelected}
                disabled={selectedUrls.size === 0 || isSubmitting}
                className="w-full gap-1.5"
                size="sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                선택한 {selectedUrls.size}건 스크래핑
              </Button>
            </div>
          )}

          {!isSearching && searchMeta && searchResults.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              &quot;{searchMeta.keyword}&quot;에 대한 검색 결과가 없습니다
            </p>
          )}
        </CardContent>
      </Card>

      {/* 수동 URL 입력 (접기/펼치기) */}
      <div>
        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Upload className="h-3 w-3" />
          URL 직접 입력
          <ChevronDown className={`h-3 w-3 transition-transform ${showManualInput ? "rotate-180" : ""}`} />
        </button>

        {showManualInput && (
          <Card className="mt-2">
            <CardContent className="space-y-3 pt-4">
              <textarea
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={3}
                placeholder={"채용 공고 URL을 한 줄에 하나씩 입력하세요"}
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                disabled={isSubmitting}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleManualBatchScrape}
                  disabled={isSubmitting || !urls.trim()}
                  size="sm"
                  className="gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  등록
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 스크래핑 진행/결과 */}
      {urlResults.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
          <p className="mb-2 text-xs font-medium">스크래핑 진행 상황</p>
          {urlResults.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {r.status === "pending" && <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-muted-foreground" />}
              {r.status === "success" && <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />}
              {r.status === "error" && <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-muted-foreground">{r.url}</p>
                {r.message && (
                  <p className={r.status === "success" ? "text-emerald-600" : "text-red-500"}>{r.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* 미분석 공고 */}
      <section>
        <h3 className="mb-3 text-sm font-semibold tracking-tight">
          수집된 공고 — 분석 대기 <span className="text-muted-foreground">({pendingJobs.length})</span>
        </h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : pendingJobs.length > 0 ? (
          <div className="space-y-2">
            {pendingJobs.map((job) => (
              <ScrapedJobCard key={job.id} job={job} onAnalyze={handleAnalyze} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 py-12">
            <FileText className="mb-2 h-6 w-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">수집된 공고가 없습니다</p>
          </div>
        )}
      </section>

      {/* 분석 완료 */}
      {analyzedJobs.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold tracking-tight">
            분석 완료 <span className="text-muted-foreground">({analyzedJobs.length})</span>
          </h3>
          <div className="space-y-2">
            {analyzedJobs.map((job) => (
              <ScrapedJobCard key={job.id} job={job} onAnalyze={handleAnalyze} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
