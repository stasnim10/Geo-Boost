import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Show, useUser } from "@clerk/react";
import { Gauge } from "@/components/gauge";
import { AuditResult } from "@workspace/api-client-react";
import { AlertTriangle, TrendingUp, Zap, DollarSign, Loader2, BookmarkPlus, X, Mail, ChevronDown, CheckCircle2, Link2, Copy, Check } from "lucide-react";

function estimateMonthlyLoss(score: number, category: string): { amount: number; monthlyQueries: number; conversionRate: number; avgTransaction: number } {
  const cat = category.toLowerCase();

  let monthlyQueries = 2500;
  let conversionRate = 0.015;
  let avgTransaction = 60;

  if (cat.match(/restaurant|cafe|coffee|bar|food|pizza|burger|bakery|catering/)) {
    monthlyQueries = 3200; conversionRate = 0.018; avgTransaction = 45;
  } else if (cat.match(/ecommerce|e-commerce|shop|store|retail|product|fashion|apparel|clothing/)) {
    monthlyQueries = 4000; conversionRate = 0.02; avgTransaction = 85;
  } else if (cat.match(/agency|marketing|seo|advertising|pr |media|creative/)) {
    monthlyQueries = 1800; conversionRate = 0.008; avgTransaction = 1200;
  } else if (cat.match(/saas|software|app|platform|tech|startup|b2b/)) {
    monthlyQueries = 3500; conversionRate = 0.012; avgTransaction = 300;
  } else if (cat.match(/law|legal|attorney|lawyer/)) {
    monthlyQueries = 1500; conversionRate = 0.01; avgTransaction = 2500;
  } else if (cat.match(/medical|dental|doctor|health|clinic|therapy|therapist/)) {
    monthlyQueries = 2000; conversionRate = 0.014; avgTransaction = 350;
  } else if (cat.match(/real estate|realtor|property|mortgage/)) {
    monthlyQueries = 1200; conversionRate = 0.006; avgTransaction = 8000;
  } else if (cat.match(/plumb|hvac|electric|contractor|roofing|landscap|pest|clean/)) {
    monthlyQueries = 2200; conversionRate = 0.016; avgTransaction = 400;
  } else if (cat.match(/hotel|motel|airbnb|hospitality|travel|tour/)) {
    monthlyQueries = 3800; conversionRate = 0.022; avgTransaction = 280;
  } else if (cat.match(/gym|fitness|yoga|personal train|sport/)) {
    monthlyQueries = 1800; conversionRate = 0.02; avgTransaction = 120;
  } else if (cat.match(/consult|coach|advisor|accounting|finance|cpa/)) {
    monthlyQueries = 1400; conversionRate = 0.009; avgTransaction = 900;
  }

  const visibilityRate = score / 100;
  const missedQueries = monthlyQueries * (1 - visibilityRate);
  const amount = Math.round(missedQueries * conversionRate * avgTransaction);

  return { amount, monthlyQueries, conversionRate, avgTransaction };
}

function formatMoney(n: number): string {
  if (n >= 10000) return `$${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

function useCheckout() {
  const [loading, setLoading] = useState(false);

  const startCheckout = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Could not start checkout. Please try again.");
        setLoading(false);
      }
    } catch {
      alert("Network error. Please try again.");
      setLoading(false);
    }
  }, []);

  return { loading, startCheckout };
}

function CtaButton({ label, className = "" }: { label: string; className?: string }) {
  const { loading, startCheckout } = useCheckout();
  return (
    <button
      onClick={startCheckout}
      disabled={loading}
      style={{ backgroundColor: loading ? undefined : "#10B981" }}
      className={`flex items-center justify-center gap-2 hover:opacity-90 text-white font-bold rounded-lg transition-opacity disabled:bg-slate-400 disabled:cursor-not-allowed ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? "Redirecting to checkout…" : label}
    </button>
  );
}

function ShareResultsSection({ result, category }: { result: AuditResult; category: string }) {
  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setStatus("generating");
    try {
      const res = await fetch("/api/geoboost/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: result.scrapedUrl,
          category,
          aiVisibilityScore: result.aiVisibilityScore,
          semanticDensityScore: result.semanticDensityScore,
          structuralFormattingScore: result.structuralFormattingScore,
          weaknesses: result.weaknesses,
          competitorPatterns: result.competitorPatterns,
        }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (res.ok && data.token) {
        const url = `${window.location.origin}${window.location.pathname.replace(/\/results.*/, "")}/shared/${data.token}`;
        setShareUrl(url);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Link2 className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Share these results</p>
            <p className="text-xs text-slate-500">Generate a public link — no sign-in required to view</p>
          </div>
        </div>

        {status === "idle" && (
          <button
            onClick={generate}
            style={{ backgroundColor: "#22c55e" }}
            className="px-4 py-2 text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Generate Link
          </button>
        )}

        {status === "generating" && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating…</span>
          </div>
        )}

        {status === "error" && (
          <button
            onClick={generate}
            className="px-4 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap"
          >
            Retry
          </button>
        )}
      </div>

      {status === "ready" && (
        <div className="px-6 pb-5 border-t border-slate-100 pt-4">
          <label className="block text-xs font-semibold text-slate-600 mb-2">Shareable link</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 min-w-0 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-green-500 cursor-text"
            />
            <button
              onClick={copy}
              style={{ backgroundColor: copied ? "#22c55e" : undefined }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${copied ? "text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Anyone with this link can view the full report — no account needed.</p>
        </div>
      )}
    </div>
  );
}

function EmailResultsSection({ result, category }: { result: AuditResult; category: string }) {
  const { user } = useUser();
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    if (userEmail && !email) setEmail(userEmail);
  }, [user, email]);

  const send = async () => {
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/geoboost/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          url: result.scrapedUrl,
          category,
          aiVisibilityScore: result.aiVisibilityScore,
          semanticDensityScore: result.semanticDensityScore,
          structuralFormattingScore: result.structuralFormattingScore,
          weaknesses: result.weaknesses,
          competitorPatterns: result.competitorPatterns,
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (res.ok) {
        setStatus("sent");
      } else {
        setErrorMsg(data.error || "Failed to send email");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="mt-8 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-green-800 text-sm">Sent! Check your inbox.</p>
          <p className="text-green-700 text-xs mt-0.5">We sent your full audit report to <strong>{email}</strong>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Email these results</p>
            <p className="text-xs text-slate-500">Send a copy to any inbox — yours or a client's</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-6 pb-5 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-600 mb-2 mt-4">Email address</label>
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="you@example.com"
              className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              onClick={send}
              disabled={status === "sending" || !email.trim()}
              style={{ backgroundColor: status === "sending" || !email.trim() ? undefined : "#22c55e" }}
              className="px-5 py-2.5 text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {status === "sending" && <Loader2 className="w-3 h-3 animate-spin" />}
              {status === "sending" ? "Sending…" : "Send"}
            </button>
          </div>
          {status === "error" && (
            <p className="text-red-600 text-xs mt-2">{errorMsg}</p>
          )}
          <p className="text-xs text-slate-400 mt-2">A formatted summary of your audit — no spam, ever.</p>
        </div>
      )}
    </div>
  );
}

function SaveResultsBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative flex items-center gap-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-md mb-8">
      <BookmarkPlus className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm sm:text-base leading-tight">
          Create a free account to save these results and track your progress over time.
        </p>
      </div>
      <Link href="/sign-up">
        <button className="flex-shrink-0 px-4 py-1.5 bg-white text-green-700 font-bold text-sm rounded-lg hover:bg-green-50 transition-colors whitespace-nowrap">
          Save Results
        </button>
      </Link>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Results() {
  const [, setLocation] = useLocation();
  const [result, setResult] = useState<AuditResult | null>(null);
  const [category, setCategory] = useState("your industry");
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("geoboost_audit_result");
    const storedCategory = sessionStorage.getItem("geoboost_audit_category");
    if (!stored) {
      setLocation("/");
      return;
    }
    try {
      setResult(JSON.parse(stored));
      if (storedCategory) setCategory(storedCategory);
    } catch {
      setLocation("/");
    }
  }, [setLocation]);

  if (!result) return null;

  const invisibilityRate = 100 - result.aiVisibilityScore;
  const roi = estimateMonthlyLoss(result.aiVisibilityScore, category);

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 md:px-8">
      <Show when="signed-out">
        {!bannerDismissed && <SaveResultsBanner onDismiss={() => setBannerDismissed(true)} />}
      </Show>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Audit Report for <span className="text-blue-600">{result.scrapedUrl}</span>
        </h1>
        <p className="text-slate-500 mt-2 text-lg">AI engines are struggling to recommend your business.</p>
      </div>

      {/* Score gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="col-span-1 md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <h2 className="text-xl font-bold text-slate-900 mb-1">AI Visibility Score</h2>
            <p className="text-slate-500 max-w-md">This score represents how likely AI models are to recommend your site for target queries.</p>
          </div>
          <Gauge value={result.aiVisibilityScore} size={180} strokeWidth={16} className="mx-auto md:mx-0" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
          <h3 className="font-semibold text-slate-700 mb-4">Semantic Density</h3>
          <Gauge value={result.semanticDensityScore} size={120} strokeWidth={10} />
          <p className="text-xs text-slate-500 text-center mt-4">Measures depth of topic coverage</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
          <h3 className="font-semibold text-slate-700 mb-4">Structural Formatting</h3>
          <Gauge value={result.structuralFormattingScore} size={120} strokeWidth={10} />
          <p className="text-xs text-slate-500 text-center mt-4">Measures readability for AI parsers</p>
        </div>

        <div className="bg-[#0f172a] rounded-xl shadow-sm border border-slate-800 p-8 flex flex-col justify-center text-white">
          <h3 className="text-xl font-bold mb-2">Ready to fix this?</h3>
          <p className="text-slate-300 text-sm mb-6">Start ranking in ChatGPT and Claude today.</p>
          <CtaButton label="Optimize My Content — $149/month" className="w-full h-12 text-base" />
          <Link href="/optimizer">
            <span className="block text-center mt-4 text-xs font-medium text-slate-400 hover:text-white underline transition-colors cursor-pointer">
              or try the free optimizer tool
            </span>
          </Link>
        </div>
      </div>

      {/* What This Is Costing You */}
      <div className="mb-8 rounded-2xl overflow-hidden border border-red-200">
        <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-white flex-shrink-0" />
          <h2 className="text-white font-bold text-lg">What This Is Costing You</h2>
        </div>
        <div className="bg-red-50 p-6 md:p-8">
          <p className="text-red-900 text-base leading-relaxed mb-6">
            Based on your AI Visibility Score of <strong>{result.aiVisibilityScore}/100</strong>, AI assistants
            are recommending competitors over you approximately{" "}
            <strong>{invisibilityRate}% of the time</strong>. For a business in the{" "}
            <strong>{category}</strong> category, this invisibility typically costs an estimated{" "}
            <strong className="text-red-700 text-lg">{formatMoney(roi.amount)}/month</strong> in revenue
            going directly to competitors who rank higher in AI answers.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-red-100 p-4 text-center">
              <div className="text-2xl font-extrabold text-slate-900">{roi.monthlyQueries.toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-1">Monthly AI searches in your category</div>
            </div>
            <div className="bg-white rounded-xl border border-red-100 p-4 text-center">
              <div className="text-2xl font-extrabold text-red-600">
                {Math.round(roi.monthlyQueries * (1 - result.aiVisibilityScore / 100)).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Searches where competitors beat you</div>
            </div>
            <div className="bg-white rounded-xl border border-red-100 p-4 text-center">
              <div className="text-2xl font-extrabold text-red-700">{formatMoney(roi.amount)}</div>
              <div className="text-xs text-slate-500 mt-1">Estimated monthly revenue lost</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-red-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-700 text-sm">
              <strong>GEOboost costs $149/month.</strong> If it recovers even one lost customer per month,
              it pays for itself. At average performance, customers see 3–6x ROI within 60 days.
            </p>
            <CtaButton label="Fix This Now — $149/mo" className="flex-shrink-0 px-6 py-3 text-sm whitespace-nowrap" />
          </div>
        </div>
      </div>

      {/* Weaknesses + Competitor patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-xl font-bold text-slate-900">Critical Weaknesses</h3>
          </div>
          {result.weaknesses.map((weakness, i) => (
            <div key={i} className="bg-red-50 rounded-lg border border-red-100 p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                {i + 1}
              </div>
              <p className="text-red-900 text-sm">{weakness}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="text-xl font-bold text-slate-900">What Competitors Do Differently</h3>
          </div>
          {result.competitorPatterns.map((pattern, i) => (
            <div key={i} className="bg-blue-50 rounded-lg border border-blue-100 p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-3 h-3" />
              </div>
              <p className="text-blue-900 text-sm">{pattern}</p>
            </div>
          ))}
        </div>
      </div>

      <ShareResultsSection result={result} category={category} />
      <EmailResultsSection result={result} category={category} />

      {/* Bottom CTA */}
      <div className="mt-8 bg-[#0f172a] rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-extrabold mb-2">Stop losing {formatMoney(roi.amount)}/month to competitors</h2>
        <p className="text-slate-400 mb-6 max-w-xl mx-auto">
          GEOboost rewrites your content to match what AI assistants want to cite — specific facts, structured answers, and direct responses to the queries your customers are already asking.
        </p>
        <CtaButton label="Optimize My Content — $149/month" className="px-10 py-4 text-lg mx-auto" />
        <div className="mt-4">
          <Link href="/optimizer">
            <span className="text-slate-400 hover:text-white text-sm underline transition-colors cursor-pointer">
              or try the free optimizer tool
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
