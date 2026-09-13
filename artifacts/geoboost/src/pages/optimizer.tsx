import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useOptimizeContent, OptimizeResult } from "@workspace/api-client-react";
import {
  Loader2, Copy, CheckCircle2, X, Download,
  Globe, AlertTriangle, ArrowRight, ChevronRight,
} from "lucide-react";

interface AuditContext {
  url: string;
  category: string;
  queries: string[];
  aiVisibilityScore: number;
  weaknesses: string[];
}

type ProgressStep = { label: string; done: boolean; active: boolean };

function useProgressSteps(active: boolean) {
  const STEPS = [
    "Reading your content",
    "Finding what is stopping AI from recommending you",
    "Rewriting for maximum AI visibility",
    "Finalizing your AI-friendly version",
  ];
  const DELAYS = [0, 1200, 2400, 4200];
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (!active) { setStep(-1); return; }
    setStep(0);
    const timers = DELAYS.slice(1).map((d, i) =>
      setTimeout(() => setStep(i + 1), d)
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return STEPS.map((label, i): ProgressStep => ({
    label,
    done: i < step,
    active: i === step,
  }));
}

export default function Optimizer() {
  const optimizeMutation = useOptimizeContent();
  const [content, setContent] = useState("");
  const [queries, setQueries] = useState("");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [auditCtx, setAuditCtx] = useState<AuditContext | null>(null);
  const [fetchingContent, setFetchingContent] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const steps = useProgressSteps(optimizeMutation.isPending);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("geoboost_audit_result");
      const storedCat = sessionStorage.getItem("geoboost_audit_category");
      const storedQ = sessionStorage.getItem("geoboost_audit_queries");
      if (!stored) return;
      const r = JSON.parse(stored) as { scrapedUrl?: string; aiVisibilityScore?: number; weaknesses?: string[] };
      const q = storedQ ? (JSON.parse(storedQ) as string[]) : [];
      setAuditCtx({
        url: r.scrapedUrl ?? "",
        category: storedCat ?? "",
        queries: q,
        aiVisibilityScore: r.aiVisibilityScore ?? 0,
        weaknesses: r.weaknesses ?? [],
      });
      if (q.length) setQueries(q.join(", "));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (auditCtx?.url) {
      const domain = (() => {
        try { return new URL(auditCtx.url.startsWith("http") ? auditCtx.url : `https://${auditCtx.url}`).hostname.replace(/^www\./, ""); }
        catch { return auditCtx.url; }
      })();
      document.title = `Content Optimizer — ${domain} — Show me on AI`;
    } else {
      document.title = "Content Optimizer — Show me on AI";
    }
    return () => { document.title = "Show me on AI"; };
  }, [auditCtx]);

  const autoFetch = async () => {
    if (!auditCtx?.url) return;
    setFetchingContent(true);
    setFetchError("");
    try {
      const res = await fetch("/api/geoboost/scrape-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: auditCtx.url }),
      });
      const data = await res.json() as { content?: string; error?: string };
      if (res.ok && data.content) {
        setContent(data.content);
        setTimeout(() => textareaRef.current?.focus(), 100);
      } else {
        setFetchError(data.error ?? "Could not fetch website content.");
      }
    } catch {
      setFetchError("Network error. Try pasting your content manually.");
    } finally {
      setFetchingContent(false);
    }
  };

  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [signInRequired, setSignInRequired] = useState(false);

  const optimize = () => {
    if (!content.trim() || !queries.trim()) return;
    setUpgradeRequired(false);
    setSignInRequired(false);
    optimizeMutation.mutate(
      { data: { content, queries: queries.split(",").map((q) => q.trim()).filter(Boolean), category: auditCtx?.category } },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => {
          const status = (err as { status?: number })?.status;
          if (status === 403) {
            setUpgradeRequired(true);
          } else if (status === 401) {
            setSignInRequired(true);
          }
        },
      }
    );
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.optimizedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const reset = () => { setResult(null); optimizeMutation.reset(); };

  const scoreColor = (s: number) => s >= 70 ? "text-green-600" : s >= 40 ? "text-amber-600" : "text-red-600";

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 md:px-8">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Website Content Rewriter</h1>
        <p className="text-slate-500 mt-1">Paste your current website text below. We will rewrite it so AI assistants are more likely to recommend your business.</p>
      </div>

      {!result ? (
        <>
          {/* ── STEP 1: Audit context banner ──────────────────────────────── */}
          {auditCtx && (
            <div className="mb-6 space-y-3">
              {/* Green context banner */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-green-800 font-semibold text-sm">
                    Optimizing based on your audit of{" "}
                    <span className="font-bold truncate">{auditCtx.url}</span>
                    {" — "}Score:{" "}
                    <span className={`font-extrabold ${scoreColor(auditCtx.aiVisibilityScore)}`}>
                      {auditCtx.aiVisibilityScore}/100
                    </span>
                  </p>
                </div>
                <button
                  onClick={autoFetch}
                  disabled={fetchingContent}
                  style={{ backgroundColor: fetchingContent ? undefined : "#22c55e" }}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:bg-slate-300 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {fetchingContent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  {fetchingContent ? "Fetching…" : "Auto-fetch My Website Content"}
                </button>
              </div>
              {fetchError && (
                <p className="text-red-600 text-sm px-1">{fetchError}</p>
              )}

              {/* Blue weaknesses box */}
              {auditCtx.weaknesses.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-blue-600" />
                    <p className="text-blue-800 font-semibold text-sm">We are fixing these specific issues:</p>
                  </div>
                  <ul className="space-y-1.5">
                    {auditCtx.weaknesses.slice(0, 3).map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-blue-900 text-sm">
                        <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Queries + textarea ────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                What questions should AI recommend you for? <span className="text-slate-400 normal-case font-normal">(comma separated)</span>
              </label>
              <input
                value={queries}
                onChange={(e) => setQueries(e.target.value)}
                placeholder="e.g. best coffee shop in Rochester, specialty coffee near me"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Your Current Text
                </label>
                {content && (
                  <button
                    onClick={() => setContent("")}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                placeholder={auditCtx ? "Click 'Auto-fetch My Website Content' above to load your content, or paste it manually here" : "Paste your page content here…"}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder:text-slate-500 font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <div className="flex justify-between items-center mt-1.5">
                <p className="text-xs text-slate-400">{content.length.toLocaleString()} characters</p>
                {content.length > 6000 && (
                  <p className="text-xs text-amber-600">Content will be trimmed to 6,000 characters for optimization</p>
                )}
              </div>
            </div>
          </div>

          {/* ── STEP 3: Optimize button + progress ───────────────────────── */}
          {optimizeMutation.isPending ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-8 py-8">
              <p className="text-sm font-semibold text-slate-700 mb-5 text-center">Rewriting your content for AI…</p>
              <div className="space-y-3 max-w-sm mx-auto">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${s.done ? "bg-green-100" : s.active ? "bg-green-500" : "bg-slate-100"}`}>
                      {s.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : s.active ? (
                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <span className={`text-sm transition-colors ${s.done ? "text-green-700 font-medium line-through decoration-green-300" : s.active ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={optimize}
              disabled={!content.trim() || !queries.trim()}
              style={{ backgroundColor: content.trim() && queries.trim() ? "#22c55e" : undefined }}
              className="w-full py-4 text-white font-extrabold text-lg rounded-xl hover:opacity-90 transition-opacity disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm"
            >
              Rewrite My Content for AI
            </button>
          )}

          {upgradeRequired && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-bold text-amber-900 text-sm mb-1">A paid plan is required to use the Content Rewriter</p>
                <p className="text-amber-700 text-xs">The Fix, Monitor, or Grow plan unlocks AI-powered content optimization. Upgrade to rewrite your content and get cited more often.</p>
              </div>
              <Link href="/pricing?plan=fix">
                <button style={{ backgroundColor: "#22c55e" }} className="flex-shrink-0 px-5 py-2.5 text-white font-bold text-sm rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">
                  View Plans →
                </button>
              </Link>
            </div>
          )}
          {signInRequired && (
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-bold text-slate-900 text-sm mb-1">Sign in to use the Content Rewriter</p>
                <p className="text-slate-600 text-xs">Your session has expired or you are not signed in. Sign in, then try your rewrite again.</p>
              </div>
              <Link href="/sign-in">
                <button className="flex-shrink-0 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 whitespace-nowrap">
                  Sign in
                </button>
              </Link>
            </div>
          )}
          {optimizeMutation.isError && !upgradeRequired && !signInRequired && (
            <p className="text-red-600 text-sm mt-3 text-center">
              {(optimizeMutation.error as Error)?.message ?? "Optimization failed. Please try again."}
            </p>
          )}
        </>
      ) : (
        <>
          {/* ── STEP 4: Side-by-side results ──────────────────────────────── */}
          <div className="mb-3 flex items-center justify-between flex-wrap gap-3">
            <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-800 underline transition-colors">
              ← Start over
            </button>
            <button
              onClick={copy}
              style={copied ? { backgroundColor: "#22c55e" } : undefined}
              className={`flex items-center gap-2 px-6 py-2.5 font-bold text-sm rounded-xl transition-colors shadow-sm ${copied ? "text-white" : "bg-[#0f172a] text-white hover:bg-slate-800"}`}
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Optimized Content"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Original */}
            <div className="flex flex-col rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 font-semibold text-slate-600 text-sm">
                Your Current Text
              </div>
              <div className="p-5 overflow-y-auto max-h-[480px] font-mono text-xs leading-relaxed text-slate-500 whitespace-pre-wrap bg-slate-50">
                {result.originalContent}
              </div>
            </div>

            {/* Optimized */}
            <div className="flex flex-col rounded-xl border border-green-200 overflow-hidden shadow-sm ring-1 ring-green-500/20">
              <div className="bg-green-50 px-5 py-3 border-b border-green-200 font-semibold text-green-800 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                AI-Friendly Version
              </div>
              <div className="p-5 overflow-y-auto max-h-[480px] font-mono text-xs leading-relaxed text-slate-900 whitespace-pre-wrap">
                {result.optimizedContent}
              </div>
            </div>
          </div>

          {/* Changes made */}
          {result.changes.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Download className="w-4 h-4 text-slate-500" />
                What We Changed and Why
                <span className="ml-1 text-xs font-normal text-slate-400">({result.changes.length} improvements)</span>
              </h3>
              <div className="space-y-3">
                {result.changes.map((c, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {c.original && (
                          <>
                            <span className="text-xs text-red-600 line-through bg-red-50 px-2 py-0.5 rounded font-mono truncate max-w-[200px]">{c.original}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded font-mono truncate max-w-[200px]">{c.optimized}</span>
                          </>
                        )}
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{c.type}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{c.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 5: Next Steps ────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-[#0f172a] px-6 py-4">
              <h3 className="text-white font-extrabold text-lg">What To Do Next</h3>
            </div>
            <div className="p-6">
              <ol className="space-y-4 mb-6">
                {[
                  { step: 1, text: "Copy the optimized content using the button above." },
                  { step: 2, text: "Log into your website CMS (WordPress, Shopify, Webflow, etc.) and replace your current page content." },
                  { step: 3, text: "Wait 2–4 weeks for AI systems to re-read your updated page and start recommending you." },
                  { step: 4, text: "Come back and run a new audit to measure your score improvement." },
                ].map(({ step, text }) => (
                  <li key={step} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
                    <p className="text-slate-700 text-sm pt-1">{text}</p>
                  </li>
                ))}
              </ol>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/">
                  <button
                    style={{ backgroundColor: "#22c55e" }}
                    className="flex items-center gap-2 px-6 py-2.5 text-white font-bold rounded-lg hover:opacity-90 transition-opacity text-sm whitespace-nowrap"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Run Another Audit
                  </button>
                </Link>
                <Link href="/upgrade">
                  <button className="flex items-center gap-2 px-6 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-sm whitespace-nowrap">
                    Want us to publish this automatically?
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
