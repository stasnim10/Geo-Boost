import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, Search, ExternalLink, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CitationBusiness {
  name: string;
  rank: number;
  url: string | null;
}

interface ModelCitationResult {
  model: "chatgpt" | "claude" | "gemini" | "perplexity";
  modelLabel: string;
  mentioned: boolean;
  position: number | null;
  businesses: CitationBusiness[];
  sources: string[];
  excerpt: string;
  error?: string;
}

interface SimulationResult {
  query: string;
  results: ModelCitationResult[];
  durationMs: number;
}

const MODEL_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  chatgpt:    { icon: "🤖", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  claude:     { icon: "✦",  color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200" },
  gemini:     { icon: "✦",  color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200" },
  perplexity: { icon: "◈",  color: "text-purple-700",  bg: "bg-purple-50",  border: "border-purple-200" },
};

const EXAMPLE_QUERIES = [
  "best accountant for small business in Dubai",
  "top marketing agency in London",
  "best dentist near me",
  "recommended CRM software for startups",
  "best coffee shop with WiFi in NYC",
];

const RATE_LIMIT_KEY = "simulator_query_count";
const RATE_LIMIT_MAX = 3;

function getQueryCount(): number {
  try {
    const data = localStorage.getItem(RATE_LIMIT_KEY);
    if (!data) return 0;
    const { count, resetAt } = JSON.parse(data) as { count: number; resetAt: number };
    if (Date.now() > resetAt) return 0;
    return count;
  } catch {
    return 0;
  }
}

function incrementQueryCount(): number {
  try {
    const data = localStorage.getItem(RATE_LIMIT_KEY);
    let count = 1;
    const resetAt = Date.now() + 15 * 60 * 1000;
    if (data) {
      const parsed = JSON.parse(data) as { count: number; resetAt: number };
      if (Date.now() < parsed.resetAt) {
        count = parsed.count + 1;
      }
    }
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count, resetAt }));
    return count;
  } catch {
    return 1;
  }
}

function ModelCard({ result, isLoading }: { result?: ModelCitationResult; isLoading: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const model = result?.model ?? "chatgpt";
  const config = MODEL_CONFIG[model] ?? MODEL_CONFIG.chatgpt;

  if (isLoading) {
    return (
      <div className={`rounded-xl border ${config.border} ${config.bg} p-4 flex flex-col gap-3 animate-pulse min-h-[180px]`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-200" />
          <div className="h-4 bg-slate-200 rounded w-24" />
        </div>
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-3 bg-slate-200 rounded w-5/6" />
        <div className="h-3 bg-slate-200 rounded w-4/6" />
        <div className="mt-auto h-3 bg-slate-200 rounded w-32" />
      </div>
    );
  }

  if (!result) return null;

  const topBusinesses = result.businesses.slice(0, 3);

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4 flex flex-col gap-3`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.icon}</span>
        <span className={`font-bold text-sm ${config.color}`}>{result.modelLabel}</span>
        {result.error && (
          <span className="ml-auto text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Error</span>
        )}
      </div>

      {result.error ? (
        <p className="text-xs text-slate-500 italic">Unable to fetch response from {result.modelLabel} right now.</p>
      ) : (
        <>
          {/* Top businesses */}
          {topBusinesses.length > 0 ? (
            <div className="space-y-1.5">
              {topBusinesses.map((b, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-1.5 border border-white/50">
                  <span className="text-xs font-bold text-slate-500 w-4 shrink-0">#{b.rank}</span>
                  <span className="text-sm font-medium text-slate-800 truncate flex-1">{b.name}</span>
                  {b.url && (
                    <a
                      href={b.url.startsWith("http") ? b.url : `https://${b.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/60 rounded-lg px-3 py-2 text-xs text-slate-500 italic">
              No specific businesses recommended
            </div>
          )}

          {/* Excerpt + expand */}
          {result.excerpt && (
            <div>
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className={`flex items-center gap-1 text-xs font-medium ${config.color} hover:opacity-70 transition-opacity`}
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expanded ? "Hide response" : "See full response"}
              </button>
              {expanded && (
                <p className="mt-2 text-xs text-slate-600 leading-relaxed bg-white/70 rounded-lg p-2.5 border border-white/50 max-h-40 overflow-y-auto">
                  {result.excerpt}
                </p>
              )}
            </div>
          )}

          {/* Sources */}
          {result.sources.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto">
              {result.sources.slice(0, 3).map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-0.5 rounded-full bg-white/60 border border-slate-200 text-slate-500 hover:text-slate-700 truncate max-w-[140px]"
                >
                  {src.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SimulatorSection() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(() => getQueryCount() >= RATE_LIMIT_MAX);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery ?? query;
    if (!q.trim() || isLoading) return;

    if (getQueryCount() >= RATE_LIMIT_MAX) {
      setIsRateLimited(true);
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    incrementQueryCount();
    if (getQueryCount() >= RATE_LIMIT_MAX) {
      setIsRateLimited(true);
    }

    try {
      const res = await fetch("/api/citation/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (res.status === 429) {
        setIsRateLimited(true);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data = await res.json() as SimulationResult;
      setResult(data);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const remainingQueries = Math.max(0, RATE_LIMIT_MAX - getQueryCount());

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-12">
      {/* Section header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-sm font-semibold tracking-wide mb-4 border border-violet-100">
          <Zap className="w-4 h-4" /> AI Search Simulator
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
          See what AI says when customers search for your business
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base">
          Type any query your customers might ask ChatGPT, Claude, Gemini, or Perplexity. See exactly who gets recommended — and who doesn't.
        </p>
      </div>

      {/* Search input */}
      {isRateLimited ? (
        <div className="max-w-xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="font-bold text-amber-800 mb-2">You've used your 3 free searches</p>
          <p className="text-amber-700 text-sm mb-4">Create a free account to keep searching — and find out if your own business is being recommended.</p>
          <Button
            onClick={() => navigate("/sign-up")}
            className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold"
          >
            Sign up free to continue →
          </Button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
              <Input
                placeholder="e.g. best accountant for small business in Dubai"
                className="pl-10 h-12 bg-white border-slate-300 focus-visible:ring-violet-500 text-base shadow-sm"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={() => handleSearch()}
              disabled={!query.trim() || isLoading}
              className="h-12 px-5 bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search AI"}
            </Button>
          </div>

          {/* Example query chips */}
          <div className="flex flex-wrap gap-2 justify-center">
            {EXAMPLE_QUERIES.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setQuery(q); handleSearch(q); }}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
          {remainingQueries < RATE_LIMIT_MAX && !isRateLimited && (
            <p className="text-center text-xs text-slate-400 mt-3">
              {remainingQueries} free {remainingQueries === 1 ? "search" : "searches"} remaining
            </p>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div ref={resultsRef} className="mt-8">
          <div className="text-center mb-4">
            <p className="text-sm text-slate-500 font-medium">Querying ChatGPT, Claude, Gemini, and Perplexity simultaneously...</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(["chatgpt", "claude", "gemini", "perplexity"] as const).map(model => (
              <ModelCard key={model} isLoading={true} />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="mt-6 text-center text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3 max-w-md mx-auto">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <div ref={resultsRef} className="mt-8 scroll-mt-8">
          <div className="text-center mb-5">
            <p className="text-sm text-slate-500">
              Results for: <span className="font-semibold text-slate-800">"{result.query}"</span>
              <span className="text-slate-400 ml-2">({(result.durationMs / 1000).toFixed(1)}s)</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {result.results.map(r => (
              <ModelCard key={r.model} result={r} isLoading={false} />
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 text-center">
            <p className="text-white font-bold text-lg mb-2">Is YOUR business being recommended?</p>
            <p className="text-slate-300 text-sm mb-5 max-w-md mx-auto">
              Run a full AI visibility audit to see exactly where you stand — and what to fix to get cited by AI assistants.
            </p>
            <Button
              onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-2 h-auto text-base shadow-lg"
            >
              Check my AI visibility — Free →
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
