import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useUser } from "@clerk/react";
import { Loader2, TrendingUp, ExternalLink, Plus, Clock } from "lucide-react";

interface SavedAudit {
  id: number;
  url: string;
  category: string;
  queries: string[];
  location: string | null;
  aiVisibilityScore: number;
  semanticDensityScore: number;
  structuralFormattingScore: number;
  weaknesses: string[];
  competitorPatterns: string[];
  createdAt: string;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-green-100 text-green-700 border-green-200" :
    score >= 40 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
    "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold border ${color}`}>
      {score}/100
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

export default function Dashboard() {
  const { user } = useUser();
  const [, navigate] = useLocation();
  const [audits, setAudits] = useState<SavedAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/audits", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load audits");
        return r.json() as Promise<SavedAudit[]>;
      })
      .then((data) => { setAudits(data); setLoading(false); })
      .catch((err: Error) => { setError(err.message); setLoading(false); });
  }, []);

  const restoreAudit = (audit: SavedAudit) => {
    sessionStorage.setItem("geoboost_audit_result", JSON.stringify({
      aiVisibilityScore: audit.aiVisibilityScore,
      semanticDensityScore: audit.semanticDensityScore,
      structuralFormattingScore: audit.structuralFormattingScore,
      weaknesses: audit.weaknesses,
      competitorPatterns: audit.competitorPatterns,
      scrapedUrl: audit.url,
    }));
    sessionStorage.setItem("geoboost_audit_queries", JSON.stringify(audit.queries));
    sessionStorage.setItem("geoboost_audit_category", audit.category);
    navigate("/results");
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 md:px-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Your Audits
          </h1>
          <p className="text-slate-500 mt-1">
            Welcome back, {user?.firstName || user?.emailAddresses[0]?.emailAddress?.split("@")[0]}.
            {audits.length > 0 && ` You have ${audits.length} saved audit${audits.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <Link href="/">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors text-sm">
            <Plus className="w-4 h-4" />
            New Audit
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-slate-400 animate-spin mb-4" />
          <p className="text-slate-500">Loading your audits…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      ) : audits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No audits yet</h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">
            Run your first audit to see how AI assistants perceive your website — and how to get cited more often.
          </p>
          <Link href="/">
            <button
              style={{ backgroundColor: "#22c55e" }}
              className="inline-flex items-center gap-2 px-8 py-3 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Run Your First Audit
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {audits.map((audit) => (
            <div
              key={audit.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <ScoreBadge score={audit.aiVisibilityScore} />
                    <span className="text-xs text-slate-400 font-medium bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5">
                      {audit.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {timeAgo(audit.createdAt)}
                    </span>
                    {audit.location && (
                      <span className="text-xs text-slate-400">{audit.location}</span>
                    )}
                  </div>
                  <p className="text-slate-900 font-semibold truncate text-sm sm:text-base">{audit.url}</p>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    Queries: {audit.queries.join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={audit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Open website"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => restoreAudit(audit)}
                    style={{ backgroundColor: "#22c55e" }}
                    className="px-4 py-2 text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    View Results
                  </button>
                </div>
              </div>

              {/* Mini score bars */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                {[
                  { label: "AI Visibility", value: audit.aiVisibilityScore },
                  { label: "Semantic Density", value: audit.semanticDensityScore },
                  { label: "Structure", value: audit.structuralFormattingScore },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${value}%`,
                          backgroundColor: value >= 70 ? "#22c55e" : value >= 40 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
