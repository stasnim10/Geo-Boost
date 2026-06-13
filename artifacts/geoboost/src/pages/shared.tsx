import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Gauge } from "@/components/gauge";
import { AlertTriangle, Zap, ExternalLink, Loader2 } from "lucide-react";

interface SharedResult {
  url: string;
  category: string;
  aiVisibilityScore: number;
  semanticDensityScore: number;
  structuralFormattingScore: number;
  weaknesses: string[];
  competitorPatterns: string[];
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
    fetch(`/api/audits/shared/${token}`)
      .then((r) => r.json() as Promise<SharedResult & { error?: string }>)
      .then((data) => {
        if (data.error) { setError(data.error); } else { setResult(data); }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load results. Please try again."); setLoading(false); });
  }, [token]);

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
        <h2 className="text-xl font-extrabold mb-2">Fix your AI visibility with GEOboost</h2>
        <p className="text-slate-400 mb-6 text-sm max-w-lg mx-auto">
          GEOboost rewrites your content to match what AI assistants want to cite — specific facts, structured answers, and direct responses to customer queries.
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
