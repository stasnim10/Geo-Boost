import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useUser } from "@clerk/react";
import {
  Loader2, TrendingUp, ExternalLink, Plus, Clock,
  Link2, Copy, Check, Mail, ChevronDown, BarChart2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";

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

function scoreColor(v: number) {
  return v >= 70 ? "#22c55e" : v >= 40 ? "#f59e0b" : "#ef4444";
}
function scoreLabel(v: number) {
  return v >= 70 ? "Good" : v >= 40 ? "Fair" : "Critical";
}
function scoreBg(v: number) {
  return v >= 70
    ? "bg-green-50 text-green-700 border-green-200"
    : v >= 40
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
}

type ActionPanel = "share" | "email" | null;

function AuditCard({
  audit,
  onViewResults,
}: {
  audit: SavedAudit;
  onViewResults: (a: SavedAudit) => void;
}) {
  const { user } = useUser();
  const [panel, setPanel] = useState<ActionPanel>(null);

  const [shareStatus, setShareStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [email, setEmail] = useState(user?.emailAddresses[0]?.emailAddress ?? "");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState("");

  const togglePanel = (p: ActionPanel) => setPanel((cur) => (cur === p ? null : p));

  const generateShare = async () => {
    if (shareStatus === "ready") { copyLink(); return; }
    setShareStatus("loading");
    try {
      const res = await fetch("/api/geoboost/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: audit.url,
          category: audit.category,
          aiVisibilityScore: audit.aiVisibilityScore,
          semanticDensityScore: audit.semanticDensityScore,
          structuralFormattingScore: audit.structuralFormattingScore,
          weaknesses: audit.weaknesses,
          competitorPatterns: audit.competitorPatterns,
        }),
      });
      const data = await res.json() as { token?: string };
      if (res.ok && data.token) {
        const origin = window.location.origin;
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        setShareUrl(`${origin}${base}/shared/${data.token}`);
        setShareStatus("ready");
      } else {
        setShareStatus("error");
      }
    } catch {
      setShareStatus("error");
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendEmail = async () => {
    if (!email.trim()) return;
    setEmailStatus("sending");
    try {
      const res = await fetch("/api/geoboost/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          url: audit.url,
          category: audit.category,
          aiVisibilityScore: audit.aiVisibilityScore,
          semanticDensityScore: audit.semanticDensityScore,
          structuralFormattingScore: audit.structuralFormattingScore,
          weaknesses: audit.weaknesses,
          competitorPatterns: audit.competitorPatterns,
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (res.ok) {
        setEmailStatus("sent");
      } else {
        setEmailError(data.error ?? "Failed to send");
        setEmailStatus("error");
      }
    } catch {
      setEmailError("Network error. Try again.");
      setEmailStatus("error");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
      {/* Card header */}
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${scoreBg(audit.aiVisibilityScore)}`}>
                {scoreLabel(audit.aiVisibilityScore)} · {audit.aiVisibilityScore}/100
              </span>
              <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5">
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
            <a
              href={audit.url.startsWith("http") ? audit.url : `https://${audit.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-900 font-semibold hover:text-blue-600 transition-colors text-sm sm:text-base max-w-full truncate"
            >
              {audit.url}
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />
            </a>
            {audit.queries.length > 0 && (
              <p className="text-xs text-slate-400 mt-1 truncate">
                Tracked: {audit.queries.join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* Score bars */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100">
          {[
            { label: "AI Visibility", value: audit.aiVisibilityScore },
            { label: "Semantic Density", value: audit.semanticDensityScore },
            { label: "Structure", value: audit.structuralFormattingScore },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>{label}</span>
                <span className="font-bold" style={{ color: scoreColor(value) }}>{value}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${value}%`, backgroundColor: scoreColor(value) }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onViewResults(audit)}
          style={{ backgroundColor: "#22c55e" }}
          className="flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          View Full Report
        </button>

        <button
          onClick={() => { togglePanel("share"); if (panel !== "share" && shareStatus === "idle") generateShare(); }}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${panel === "share" ? "bg-slate-200 text-slate-800" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}
        >
          <Link2 className="w-3.5 h-3.5" />
          Share
          <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${panel === "share" ? "rotate-180" : ""}`} />
        </button>

        <button
          onClick={() => togglePanel("email")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${panel === "email" ? "bg-slate-200 text-slate-800" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}
        >
          <Mail className="w-3.5 h-3.5" />
          Email
          <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${panel === "email" ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Share panel */}
      {panel === "share" && (
        <div className="px-6 py-4 border-t border-slate-100 bg-white">
          {shareStatus === "loading" && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating link…</span>
            </div>
          )}
          {shareStatus === "error" && (
            <div className="flex items-center gap-3">
              <p className="text-red-600 text-sm flex-1">Failed to generate link.</p>
              <button onClick={generateShare} className="text-xs font-bold text-red-600 underline">Retry</button>
            </div>
          )}
          {shareStatus === "ready" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Shareable link — no sign-in needed to view</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 min-w-0 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-mono focus:outline-none cursor-text"
                />
                <button
                  onClick={copyLink}
                  style={copied ? { backgroundColor: "#22c55e" } : undefined}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${copied ? "text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email panel */}
      {panel === "email" && (
        <div className="px-6 py-4 border-t border-slate-100 bg-white">
          {emailStatus === "sent" ? (
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <Check className="w-4 h-4 text-green-600" />
              Sent to <strong>{email}</strong>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Send full report to any inbox</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailStatus === "error") setEmailStatus("idle"); }}
                  onKeyDown={(e) => e.key === "Enter" && sendEmail()}
                  placeholder="you@example.com"
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={sendEmail}
                  disabled={emailStatus === "sending" || !email.trim()}
                  style={{ backgroundColor: emailStatus === "sending" || !email.trim() ? undefined : "#22c55e" }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:bg-slate-300 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {emailStatus === "sending" && <Loader2 className="w-3 h-3 animate-spin" />}
                  {emailStatus === "sending" ? "Sending…" : "Send"}
                </button>
              </div>
              {emailStatus === "error" && (
                <p className="text-red-600 text-xs mt-2">{emailError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const DOMAIN_COLORS = [
  "#6366f1", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6", "#f97316",
];

function normalizeDomain(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ScoreHistoryChart({ audits }: { audits: SavedAudit[] }) {
  if (audits.length < 2) return null;

  // Group by domain, sorted by date
  const byDomain = new Map<string, SavedAudit[]>();
  for (const a of audits) {
    const domain = normalizeDomain(a.url);
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)!.push(a);
  }
  for (const [, list] of byDomain) {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // Only show domains with 2+ audits so lines are meaningful
  const domains = [...byDomain.entries()].filter(([, list]) => list.length >= 2).map(([d]) => d);
  if (domains.length === 0) return null;

  // Build unified timeline of all dates across all domains
  const allDates = [...new Set(
    audits.map(a => new Date(a.createdAt).toISOString().slice(0, 10))
  )].sort();

  // Build chart data: one row per date, columns per domain
  const data = allDates.map(date => {
    const row: Record<string, string | number> = { date: formatDate(date) };
    for (const domain of domains) {
      const list = byDomain.get(domain)!;
      // find the last audit on or before this date for this domain
      const match = [...list].reverse().find(a =>
        new Date(a.createdAt).toISOString().slice(0, 10) <= date
      );
      if (match) row[domain] = match.aiVisibilityScore;
    }
    return row;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-8">
      <div className="mb-5">
        <h2 className="text-base font-extrabold text-slate-900">Score History</h2>
        <p className="text-xs text-slate-500 mt-0.5">AI Visibility Score over time, per domain</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickCount={6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
            formatter={(value: number, name: string) => [`${value}/100`, name]}
          />
          {domains.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "12px", color: "#64748b" }}
              iconType="circle"
              iconSize={7}
            />
          )}
          <ReferenceLine
            y={70}
            stroke="#22c55e"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{ value: "Good Visibility", position: "insideTopRight", fontSize: 10, fill: "#22c55e", dy: -4 }}
          />
          {domains.map((domain, i) => (
            <Line
              key={domain}
              type="monotone"
              dataKey={domain}
              stroke={DOMAIN_COLORS[i % DOMAIN_COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: DOMAIN_COLORS[i % DOMAIN_COLORS.length] }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <p className="text-xs text-slate-400 mt-4 leading-relaxed text-center">
        Track your progress as you make improvements. Most businesses see score improvements within 2–4 weeks of applying their fixes.
      </p>
    </div>
  );
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

  const name = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split("@")[0];

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 md:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Welcome back{name ? `, ${name}` : ""}
            {audits.length > 0 ? ` — ${audits.length} audit${audits.length === 1 ? "" : "s"} saved.` : "."}
          </p>
        </div>
        <Link href="/">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" />
            New Audit
          </button>
        </Link>
      </div>

      {/* Summary strip */}
      {audits.length > 0 && !loading && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Avg AI Visibility", value: Math.round(audits.reduce((s, a) => s + a.aiVisibilityScore, 0) / audits.length) },
            { label: "Avg Semantic Density", value: Math.round(audits.reduce((s, a) => s + a.semanticDensityScore, 0) / audits.length) },
            { label: "Avg Structure", value: Math.round(audits.reduce((s, a) => s + a.structuralFormattingScore, 0) / audits.length) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
              <div className="text-3xl font-extrabold mb-1" style={{ color: scoreColor(value) }}>{value}</div>
              <div className="text-xs text-slate-500 font-medium">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
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
        <>
          <div className="space-y-4">
            {audits.map((audit) => (
              <AuditCard key={audit.id} audit={audit} onViewResults={restoreAudit} />
            ))}
          </div>
          <ScoreHistoryChart audits={audits} />
        </>
      )}
    </div>
  );
}
