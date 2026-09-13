import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Gauge } from "@/components/gauge";
import { AlertTriangle, Zap, ExternalLink, Loader2, Search, CheckCircle2, X } from "lucide-react";

interface CitationModelResult {
  model: string;
  modelLabel: string;
  mentioned: boolean;
  position: number | null;
  businesses: Array<{ name: string; rank: number; url: string | null }>;
  sources: string[];
  excerpt: string;
  error?: string;
}

interface CitationQueryResult {
  query: string;
  results: CitationModelResult[];
  durationMs: number;
}

interface SharedResult {
  url: string;
  category: string;
  aiVisibilityScore: number;
  semanticDensityScore: number;
  structuralFormattingScore: number;
  aiCitationScore?: number | null;
  weaknesses: string[];
  competitorPatterns: string[];
  citationResults?: CitationQueryResult[] | null;
  createdAt: string;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "text-green-600 bg-green-50 border-green-200" : score >= 40 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-600 bg-red-50 border-red-200";
  const label = score >= 70 ? "Good" : score >= 40 ? "Needs Work" : "Critical";
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${color}`}>{label}</span>;
}

export default function SharedResultsPage() {
  const { token } = useParams<{ token: string }>();
  const [result, setResult] = useState<SharedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setError("Invalid share link."); setLoading(false); return; }
    fetch(`/api/audits/shared/${token}`, { headers: { Accept: "application/json" } })
      .then((r) => r.json() as Promise<SharedResult & { error?: string }>)
      .then((data) => {
        if (data.error) { setError(data.error); } else { setResult(data); }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load results. Please try again."); setLoading(false); });
  }, [token]);

  useEffect(() => {
    if (!result) return;
    const label = result.aiVisibilityScore >= 70 ? "Good" : result.aiVisibilityScore >= 40 ? "Needs Work" : "Critical";
    const domain = (() => {
      try { return new URL(result.url.startsWith("http") ? result.url : `https://${result.url}`).hostname.replace(/^www\./, ""); }
      catch { return result.url; }
    })();
    const pageTitle = `${domain} scored ${result.aiVisibilityScore}/100 on AI Visibility`;
    const pageDescription = `${label} — See how well ${domain} is positioned to appear in ChatGPT, Claude, and Perplexity answers. Full AI visibility audit report.`;
    document.title = pageTitle;
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = pageDescription;
  }, [result]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          <p className="text-sm font-medium">Loading shared results…</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh] px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Report Not Found</h1>
          <p className="text-slate-500 text-sm mb-6">{error || "This share link is invalid or has expired."}</p>
          <Link href="/">
            <button className="px-5 py-2.5 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors text-sm">
              Run Your Own Audit
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const date = new Date(result.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          <span>Shared GEO Audit Report · {date}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
          AI Visibility Report
        </h1>
        <a
          href={result.url.startsWith("http") ? result.url : `https://${result.url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-blue-600 hover:underline text-sm font-medium"
        >
          {result.url} <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <p className="text-slate-500 text-sm mt-1">{result.category}</p>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">AI Visibility Score</h2>
            <p className="text-slate-500 text-sm max-w-sm">How likely AI assistants (ChatGPT, Claude, Perplexity) are to recommend this business in their answers.</p>
            <div className="mt-3">
              <ScoreBadge score={result.aiVisibilityScore} />
            </div>
          </div>
          <Gauge value={result.aiVisibilityScore} size={160} strokeWidth={14} className="flex-shrink-0" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
          <h3 className="font-semibold text-slate-700 mb-1 text-sm">Semantic Density</h3>
          <p className="text-xs text-slate-400 mb-4 text-center">Depth of topic coverage</p>
          <Gauge value={result.semanticDensityScore} size={110} strokeWidth={10} />
          <div className="mt-3"><ScoreBadge score={result.semanticDensityScore} /></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
          <h3 className="font-semibold text-slate-700 mb-1 text-sm">Structural Formatting</h3>
          <p className="text-xs text-slate-400 mb-4 text-center">Readability for AI parsers</p>
          <Gauge value={result.structuralFormattingScore} size={110} strokeWidth={10} />
          <div className="mt-3"><ScoreBadge score={result.structuralFormattingScore} /></div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center gap-3">
          <p className="text-slate-500 text-sm">Want to see your own score?</p>
          <Link href="/">
            <button className="px-5 py-2.5 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors text-sm whitespace-nowrap">
              Free Audit →
            </button>
          </Link>
        </div>
      </div>

      {/* Live AI Citation Test Results */}
      {result.citationResults && result.citationResults.length > 0 && (
        <div className="mb-8 rounded-2xl overflow-hidden border border-slate-200">
          <div className="bg-slate-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-white flex-shrink-0" />
              <div>
                <h2 className="text-white font-bold text-lg">Live AI Citation Test</h2>
                <p className="text-slate-400 text-xs">Real AI model responses recorded during audit</p>
              </div>
            </div>
            {result.aiCitationScore !== null && result.aiCitationScore !== undefined && (
              <div className="text-center">
                <div className={`text-2xl font-extrabold ${result.aiCitationScore >= 50 ? "text-green-400" : result.aiCitationScore >= 25 ? "text-amber-400" : "text-red-400"}`}>
                  {result.aiCitationScore}%
                </div>
                <div className="text-slate-400 text-xs">Citation Rate</div>
              </div>
            )}
          </div>
          <div className="bg-white px-6 py-6 space-y-8">
            {result.citationResults.map((queryResult, qi) => {
              const domain = (() => {
                try { return new URL(result.url.startsWith("http") ? result.url : `https://${result.url}`).hostname.replace(/^www\./, ""); }
                catch { return result.url; }
              })();
              return (
                <div key={qi}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{qi + 1}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">"{queryResult.query}"</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Cited in {queryResult.results.filter(r => r.mentioned).length}/{queryResult.results.length} models
                      </p>
                    </div>
                  </div>
                  <div className={`grid gap-3 ${queryResult.results.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                    {queryResult.results.map((modelResult, mi) => {
                      const modelColors: Record<string, { bg: string; border: string; text: string }> = {
                        chatgpt: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900" },
                        claude: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-900" },
                        gemini: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900" },
                        perplexity: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900" },
                      };
                      const colors = modelColors[modelResult.model] ?? modelColors.claude;
                      const icon = { chatgpt: "🤖", claude: "⚡", gemini: "✨", perplexity: "🔍" }[modelResult.model] ?? "🤖";
                      return (
                        <div key={mi} className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{icon}</span>
                              <span className={`text-sm font-bold ${colors.text}`}>{modelResult.modelLabel}</span>
                            </div>
                            {modelResult.error ? (
                              <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Error</span>
                            ) : modelResult.mentioned ? (
                              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Cited #{modelResult.position ?? "?"}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <X className="w-3 h-3" /> Not Cited
                              </span>
                            )}
                          </div>
                          {!modelResult.error && modelResult.excerpt && (
                            <p className={`text-xs ${colors.text} leading-relaxed mb-3 line-clamp-3`}>"{modelResult.excerpt}"</p>
                          )}
                          {!modelResult.error && modelResult.businesses.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Businesses Recommended</p>
                              <div className="space-y-1">
                                {modelResult.businesses.slice(0, 5).map((b, bi) => (
                                  <div key={bi} className="flex items-center gap-2">
                                    <span className={`text-xs font-bold w-4 text-center ${b.name.toLowerCase().includes(domain) ? "text-green-600" : "text-slate-400"}`}>{b.rank}.</span>
                                    <span className={`text-xs ${b.name.toLowerCase().includes(domain) ? "font-bold text-green-700" : "text-slate-600"}`}>
                                      {b.name}{b.name.toLowerCase().includes(domain) && " ✓"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weaknesses + Competitor patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-slate-900">Critical Weaknesses</h3>
          </div>
          <div className="space-y-3">
            {result.weaknesses.map((w, i) => (
              <div key={i} className="bg-red-50 rounded-lg border border-red-100 p-4 flex gap-3">
                <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">{i + 1}</div>
                <p className="text-red-900 text-sm">{w}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold text-slate-900">What Top Competitors Do</h3>
          </div>
          <div className="space-y-3">
            {result.competitorPatterns.map((p, i) => (
              <div key={i} className="bg-blue-50 rounded-lg border border-blue-100 p-4 flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3 h-3" />
                </div>
                <p className="text-blue-900 text-sm">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-[#0f172a] rounded-2xl p-8 text-center text-white">
        <h2 className="text-xl font-extrabold mb-2">Fix your AI visibility with Show me on AI</h2>
        <p className="text-slate-400 mb-6 text-sm max-w-lg mx-auto">
          Show me on AI rewrites your content to match what AI assistants want to cite — specific facts, structured answers, and direct responses to customer queries.
        </p>
        <Link href="/">
          <button className="px-8 py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors text-sm">
            Run a Free Audit on Your Site
          </button>
        </Link>
      </div>
    </div>
  );
}
