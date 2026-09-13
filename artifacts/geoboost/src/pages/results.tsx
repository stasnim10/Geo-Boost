import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Show, useUser } from "@clerk/react";
import { Gauge } from "@/components/gauge";
import { AuditResult, AuditCitationQueryResult } from "@workspace/api-client-react";
import { AlertTriangle, TrendingUp, Zap, DollarSign, Loader2, BookmarkPlus, X, Mail, ChevronDown, CheckCircle2, Link2, Copy, Check, ShieldAlert, ShieldCheck, Bot, ChevronRight, HelpCircle, Search, Lock, Pencil, ImageDown } from "lucide-react";
import { QUERY_SUGGESTIONS } from "./home";
import { trackEvent } from "@/lib/track-event";

const CATEGORY_LIST = Object.keys(QUERY_SUGGESTIONS).sort();

const TECHNICAL_PHRASE_MAP: [RegExp, string][] = [
  [/low semantic density/i, "Your page doesn't have enough specific, helpful information for AI to share with customers."],
  [/semantic density/i, "Your page needs more specific details — AI prefers pages that directly answer customer questions."],
  [/structural formatting/i, "Your page is hard for AI to scan — break content into short sections with headings and bullet points."],
  [/lack(?:ing)? (?:of )?(?:structured|clear) (?:data|content|format)/i, "Your page uses long paragraphs — AI systems prefer bullet points and short sections it can quickly scan."],
  [/(?:missing|no|lacks?) (?:schema|structured data|json-?ld)/i, "Your page is missing behind-the-scenes labels that help AI identify key facts about your business."],
  [/(?:low|poor|insufficient) list count/i, "Your page has almost no bullet points or lists, so AI skips over it when looking for quick facts to share."],
  [/(?:no|missing|lacks?) (?:faq|q&a|question)/i, "There's no Q&A section where AI can find direct answers to common customer questions."],
  [/(?:no|missing|lacks?) (?:concise|short) answer/i, "Your content doesn't have short, direct answers — AI prefers pages that get straight to the point."],
  [/vague (?:marketing )?(?:language|copy|content)/i, "Your page is full of marketing language but short on specific facts — AI needs concrete details to recommend you."],
  [/crawl(?:ability|able)/i, "Some of your page content may be invisible to AI because it can't read certain types of web elements."],
  [/indexab(?:le|ility)/i, "Parts of your website may not be visible to AI search engines."],
  [/content (?:quality|depth|richness)/i, "Your page needs more detailed, specific information that directly answers what customers are looking for."],
];

function toPlainEnglish(text: string): string {
  for (const [pattern, replacement] of TECHNICAL_PHRASE_MAP) {
    if (pattern.test(text)) return replacement;
  }
  if (text.length < 40 && !text.includes(" ")) return text;
  if (!text.endsWith(".") && !text.endsWith("!") && !text.endsWith("?")) return text + ".";
  return text;
}

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
  const handleClick = () => {
    trackEvent("cta_click", { label });
    startCheckout();
  };
  return (
    <button
      onClick={handleClick}
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
  const [copiedImage, setCopiedImage] = useState<"idle" | "copying" | "copied" | "downloaded">("idle");

  const generate = async () => {
    setStatus("generating");
    const extResult = result as AuditResult & { citationResults?: AuditCitationQueryResult[] | null; aiCitationScore?: number | null };
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
          aiCitationScore: extResult.aiCitationScore ?? null,
          citationResults: extResult.citationResults ?? null,
        }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (res.ok && data.token) {
        const url = `${window.location.origin}/api/audits/shared/${data.token}`;
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

  const copyImage = async () => {
    if (copiedImage === "copying") return;
    setCopiedImage("copying");
    const imageUrl = `${shareUrl}/og-image`;
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopiedImage("copied");
        setTimeout(() => setCopiedImage("idle"), 2500);
      } else {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = "ai-visibility-report.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setCopiedImage("downloaded");
        setTimeout(() => setCopiedImage("idle"), 2500);
      }
    } catch {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = "ai-visibility-report.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setCopiedImage("downloaded");
      setTimeout(() => setCopiedImage("idle"), 2500);
    }
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
            <p className="text-xs text-slate-600">Generate a public link — no sign-in required to view</p>
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
          <p className="text-xs font-semibold text-slate-600 mb-3">Preview — how it will look when shared</p>
          <div className="mb-4 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <img
              src={`${shareUrl}/og-image`}
              alt="Social card preview"
              className="w-full block"
              style={{ aspectRatio: "1200/630", objectFit: "cover" }}
            />
          </div>
          <label htmlFor="share-url" className="block text-xs font-semibold text-slate-600 mb-2">Shareable link</label>
          <div className="flex gap-2">
            <input
              id="share-url"
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
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              onClick={copyImage}
              disabled={copiedImage === "copying"}
              style={{ backgroundColor: copiedImage === "copied" ? "#22c55e" : undefined }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${copiedImage === "copied" ? "text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"} disabled:opacity-60 disabled:cursor-wait`}
            >
              {copiedImage === "copying" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : copiedImage === "copied" ? <Check className="w-3.5 h-3.5" /> : <ImageDown className="w-3.5 h-3.5" />}
              {copiedImage === "copying" ? "Copying…" : copiedImage === "copied" ? "Copied!" : copiedImage === "downloaded" ? "Saved!" : "Copy image"}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2">Anyone with this link can view the full report — no account needed.</p>
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
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Email these results</p>
            <p className="text-xs text-slate-600">Send a copy to any inbox — yours or a client's</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-6 pb-5 border-t border-slate-100">
          <label htmlFor="email-results-addr" className="block text-xs font-semibold text-slate-600 mb-2 mt-4">Email address</label>
          <div className="flex gap-3">
            <input
              id="email-results-addr"
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
          <p className="text-xs text-slate-600 mt-2">A formatted summary of your audit — no spam, ever.</p>
        </div>
      )}
    </div>
  );
}

function WhyScoringLowModal({ result, category, onClose }: { result: AuditResult; category: string; onClose: () => void }) {
  const score = result.aiVisibilityScore;
  const scoreLabel = score >= 70 ? "Good" : score >= 40 ? "Needs Work" : "Critical";
  const scoreColor = score >= 70 ? "text-green-600" : score >= 40 ? "text-amber-600" : "text-red-600";

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const scoreExplainers = [
    {
      name: "How Often AI Recommends You",
      value: result.aiVisibilityScore,
      what: "Out of 100 searches in your category, how many times an AI assistant would recommend your business.",
      fix: "Improve your content structure, add specific answers to common customer questions, and use bullet-pointed lists.",
    },
    {
      name: "Content Usefulness",
      value: result.semanticDensityScore,
      what: "How much specific, helpful information AI can find on your page. Vague marketing language scores low.",
      fix: "Add concrete details: your hours, pricing ranges, what makes you different, and direct answers to 'why choose you?'",
    },
    {
      name: "AI Readability",
      value: result.structuralFormattingScore,
      what: "How easily AI can scan and understand your page. Long paragraphs and walls of text score low.",
      fix: "Break content into short sections with clear headings. Use bullet points. Put the most important information first.",
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center" aria-hidden="true">
              <HelpCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 id="modal-title" className="font-extrabold text-slate-900 text-base">Why Is My Score {score}/100?</h2>
              <p className={`text-xs font-semibold ${scoreColor}`}>{scoreLabel} — here's the full breakdown</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Score breakdown */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">What Each Score Measures</h3>
            <div className="space-y-4">
              {scoreExplainers.map(({ name, value, what, fix }) => (
                <div key={name} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-800">{name}</span>
                    <span className={`text-sm font-extrabold ${value >= 70 ? "text-green-600" : value >= 40 ? "text-amber-600" : "text-red-600"}`}>{value}/100</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3">
                    <div
                      className={`h-1.5 rounded-full ${value >= 70 ? "bg-green-500" : value >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600 mb-1.5"><strong>What this measures:</strong> {what}</p>
                  <p className="text-xs text-slate-500"><strong className="text-green-700">Quick fix:</strong> {fix}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Specific weaknesses */}
          {result.weaknesses.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Your Specific Issues</h3>
              <div className="space-y-3">
                {result.weaknesses.map((w, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{toPlainEnglish(w)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* The opportunity */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-800 font-semibold mb-1">The good news for {category} businesses:</p>
            <p className="text-xs text-green-700 leading-relaxed">
              48% of businesses cited by AI don't rank on Google's first page. AI is a new playing field — and fixing these specific issues can dramatically improve how often AI recommends you, usually within 2–4 weeks.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/fix" className="flex-1">
              <button className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors">
                ⚡ Quick Fix Files — $49 One-Time
              </button>
            </Link>
            <Link href="/pricing" className="flex-1">
              <button className="w-full py-3 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                🚀 Full Plan — $149/mo
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const MODEL_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  chatgpt:    { bg: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-900", badge: "bg-emerald-100 text-emerald-700" },
  claude:     { bg: "bg-violet-50",   border: "border-violet-200",  text: "text-violet-900",  badge: "bg-violet-100 text-violet-700" },
  gemini:     { bg: "bg-blue-50",     border: "border-blue-200",    text: "text-blue-900",    badge: "bg-blue-100 text-blue-700" },
  perplexity: { bg: "bg-amber-50",    border: "border-amber-200",   text: "text-amber-900",   badge: "bg-amber-100 text-amber-700" },
};

const MODEL_ICONS: Record<string, string> = {
  chatgpt: "🤖",
  claude: "⚡",
  gemini: "✨",
  perplexity: "🔍",
};

function CitationModelCard({ result, domain }: { result: AuditCitationQueryResult["results"][number]; domain: string }) {
  const colors = MODEL_COLORS[result.model] ?? MODEL_COLORS.chatgpt;
  const icon = MODEL_ICONS[result.model] ?? "🤖";
  const cleanDomain = domain.replace(/^www\./, "");
  const competitorsAhead = result.businesses.filter(b => {
    const rank = b.rank ?? 999;
    const myPos = result.position ?? 999;
    return rank < myPos && !b.name.toLowerCase().includes(cleanDomain);
  });

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className={`text-sm font-bold ${colors.text}`}>{result.modelLabel}</span>
        </div>
        {result.error ? (
          <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Error</span>
        ) : result.mentioned ? (
          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Cited #{result.position ?? "?"}
          </span>
        ) : (
          <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
            <X className="w-3 h-3" /> Not Cited
          </span>
        )}
      </div>

      {result.error ? (
        <p className="text-xs text-slate-600 italic">Could not get a response from this model.</p>
      ) : (
        <>
          {result.excerpt && (
            <p className={`text-xs ${colors.text} leading-relaxed mb-3 line-clamp-3`}>"{result.excerpt}"</p>
          )}

          {/* Competitors ranked ahead of you */}
          {!result.mentioned && result.businesses.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Instead Recommended</p>
              <div className="space-y-1">
                {result.businesses.slice(0, 4).map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-bold w-4 text-center text-red-400">{b.rank}.</span>
                    <span className="text-xs text-slate-600">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.mentioned && competitorsAhead.length > 0 && (
            <div className="mb-3 bg-amber-50 rounded-lg p-2 border border-amber-100">
              <p className="text-xs font-semibold text-amber-700 mb-1">Competitors ranked ahead of you:</p>
              <div className="space-y-0.5">
                {competitorsAhead.slice(0, 3).map((b, i) => (
                  <p key={i} className="text-xs text-amber-800">{b.rank}. {b.name}</p>
                ))}
              </div>
            </div>
          )}

          {result.businesses.length > 0 && result.mentioned && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">All Recommendations</p>
              <div className="space-y-1">
                {result.businesses.slice(0, 5).map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-4 text-center ${b.name.toLowerCase().includes(cleanDomain) ? "text-green-600" : "text-slate-400"}`}>
                      {b.rank}.
                    </span>
                    <span className={`text-xs ${b.name.toLowerCase().includes(cleanDomain) ? "font-bold text-green-700" : "text-slate-600"}`}>
                      {b.name}{b.name.toLowerCase().includes(cleanDomain) && " ✓"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cited source URLs */}
          {result.sources.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Sources Used</p>
              <div className="space-y-0.5">
                {result.sources.slice(0, 3).map((src, i) => {
                  let hostname = src;
                  try { hostname = new URL(src).hostname.replace(/^www\./, ""); } catch { /* keep */ }
                  return (
                    <a key={i} href={src} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-1 text-xs hover:underline truncate max-w-full ${src.includes(cleanDomain) ? "text-green-600 font-semibold" : "text-slate-400"}`}
                    >
                      <Link2 className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{hostname}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {result.businesses.length === 0 && !result.mentioned && (
            <p className="text-xs text-slate-600 italic">No specific businesses were recommended for this query.</p>
          )}
        </>
      )}
    </div>
  );
}

function CitationResultsSection({ citationResults, aiCitationScore, domain, isPaidPlan }: {
  citationResults: AuditCitationQueryResult[] | null | undefined;
  aiCitationScore: number | null | undefined;
  domain: string;
  isPaidPlan: boolean;
}) {
  if (!citationResults || citationResults.length === 0) {
    return (
      <div className="mb-8 rounded-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-800 px-6 py-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-white flex-shrink-0" />
          <h2 className="text-white font-bold text-lg">Live AI Citation Test</h2>
        </div>
        <div className="bg-slate-50 px-6 py-8 text-center">
          <Lock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-semibold text-sm mb-1">Live Citation Testing Included on Monitor & Grow</p>
          <p className="text-slate-600 text-xs mb-4 max-w-md mx-auto">
            Upgrade to see exactly which queries each AI model cited you for, and which competitors they recommended instead.
          </p>
          <Link href="/pricing">
            <button style={{ backgroundColor: "#10B981" }} className="px-5 py-2.5 text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity">
              Upgrade to See Full Citation Data
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const allResults = citationResults.flatMap(r => r.results);
  const totalTests = allResults.length;
  const mentionedTests = allResults.filter(r => r.mentioned).length;
  // Free plan: only Claude ran — show upsell for remaining 3 models
  const isClaudeOnly = !isPaidPlan && citationResults[0]?.results.length === 1 && citationResults[0]?.results[0]?.model === "claude";

  return (
    <div className="mb-8 rounded-2xl overflow-hidden border border-slate-200">
      <div className="bg-slate-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-white flex-shrink-0" />
          <div>
            <h2 className="text-white font-bold text-lg">Live AI Citation Test</h2>
            <p className="text-slate-400 text-xs">We asked real AI models your queries and recorded whether they cited you</p>
          </div>
        </div>
        {aiCitationScore !== null && aiCitationScore !== undefined && (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-2xl font-extrabold ${aiCitationScore >= 50 ? "text-green-400" : aiCitationScore >= 25 ? "text-amber-400" : "text-red-400"}`}>
                {aiCitationScore}%
              </div>
              <div className="text-slate-400 text-xs">Citation Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extrabold text-white">{mentionedTests}/{totalTests}</div>
              <div className="text-slate-400 text-xs">Tests Cited</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white px-6 py-6 space-y-8">
        {citationResults.map((queryResult, qi) => (
          <div key={qi}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {qi + 1}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">"{queryResult.query}"</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Cited in {queryResult.results.filter(r => r.mentioned).length}/{queryResult.results.length} model{queryResult.results.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className={`grid gap-3 ${queryResult.results.length === 1 ? "grid-cols-1 max-w-sm" : queryResult.results.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
              {queryResult.results.map((modelResult, mi) => (
                <CitationModelCard key={mi} result={modelResult} domain={domain} />
              ))}
            </div>
          </div>
        ))}

        {/* Free-plan upsell: show teaser for the 3 locked models */}
        {isClaudeOnly && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-4">
              <Lock className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700 mb-1">3 More Models Tested on Monitor & Grow</p>
                <p className="text-xs text-slate-600 mb-3">
                  You're seeing Claude results only. Upgrade to also test ChatGPT, Gemini, and Perplexity — the 3 models your customers actually use most.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["🤖 ChatGPT", "✨ Gemini", "🔍 Perplexity"].map(label => (
                    <span key={label} className="text-xs font-semibold bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-full">
                      <Lock className="w-2.5 h-2.5 inline mr-1" />{label}
                    </span>
                  ))}
                </div>
                <Link href="/pricing">
                  <button style={{ backgroundColor: "#10B981" }} className="px-4 py-2 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity">
                    Unlock All 4 Models — Upgrade Now
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BingBlockerBanner({ url }: { url: string }) {
  const [expanded, setExpanded] = useState(false);
  const domain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return (
    <div className="mb-8 rounded-2xl overflow-hidden border-2 border-red-400 shadow-lg">
      <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 text-white flex-shrink-0" />
        <div className="flex-1">
          <h2 className="text-white font-extrabold text-lg leading-tight">Your Business Is Invisible To ChatGPT</h2>
          <p className="text-red-100 text-sm mt-0.5">This must be fixed before anything else</p>
        </div>
      </div>
      <div className="bg-red-50 px-6 py-5">
        <p className="text-red-900 text-sm leading-relaxed mb-4">
          <strong>ChatGPT uses Bing to find businesses to recommend.</strong> We checked and <strong>{domain}</strong> does not appear in Bing's index — meaning ChatGPT cannot recommend you no matter how good your content is. All the content optimization in the world will not help until this is fixed first.
        </p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
        >
          {expanded ? "Hide" : "Get Step-By-Step Fix Instructions"}
          <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
        {expanded && (
          <div className="mt-5 space-y-3">
            {[
              { step: 1, text: "Go to bing.com/webmasters and sign in with a Microsoft account (free)." },
              { step: 2, text: `Add your website URL: ${domain}` },
              { step: 3, text: "Download your sitemap — a sitemap is a file that lists every page on your website so search engines can find them all. If you use WordPress, the Yoast SEO plugin creates one automatically at yoursite.com/sitemap.xml." },
              { step: 4, text: "Submit your sitemap in Bing Webmaster Tools under 'Sitemaps'." },
              { step: 5, text: "Wait 48–72 hours for Bing to crawl your site and add it to their index." },
              { step: 6, text: "Come back and run a new audit — your score will update automatically." },
            ].map(({ step, text }) => (
              <div key={step} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
                <p className="text-sm text-red-900 leading-relaxed">{text}</p>
              </div>
            ))}
            <p className="text-xs text-red-600 mt-2 font-semibold">This is completely free and takes about 10 minutes.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RobotsBanner({ blockedBots }: { blockedBots: string[] }) {
  return (
    <div className="mb-8 rounded-2xl overflow-hidden border border-orange-300">
      <div className="bg-orange-500 px-6 py-4 flex items-center gap-3">
        <Bot className="w-5 h-5 text-white flex-shrink-0" />
        <h2 className="text-white font-bold text-base">Your Website Is Blocking AI Crawlers</h2>
      </div>
      <div className="bg-orange-50 px-6 py-5">
        <p className="text-orange-900 text-sm leading-relaxed mb-3">
          Your robots.txt file is telling <strong>{blockedBots.join(", ")}</strong> not to read your website. This means these AI systems cannot access your content and will not cite you in their answers.
        </p>
        <div className="bg-orange-100 rounded-lg p-4 border border-orange-200">
          <p className="text-xs font-bold text-orange-800 mb-2">To fix this, find your robots.txt file and remove these lines (or change "Disallow: /" to "Allow: /"):</p>
          <div className="font-mono text-xs bg-white rounded p-2 text-orange-700 space-y-0.5 border border-orange-100">
            {blockedBots.map(bot => (
              <div key={bot} className="line-through text-red-500">User-agent: {bot}{"\n"}Disallow: /</div>
            ))}
          </div>
          <p className="text-xs text-orange-700 mt-2">Your robots.txt is at: <span className="font-mono font-bold">{"{your-domain}"}/robots.txt</span></p>
        </div>
      </div>
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
        className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-green-500"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function EmailGate({ result, category, onUnlock }: { result: AuditResult; category: string; onUnlock: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Analytics: gate viewed
  useEffect(() => {
    trackEvent("gate_view", { score: result.aiVisibilityScore, category });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    trackEvent("gate_submit", { score: result.aiVisibilityScore, category });
    setStatus("sending");
    try {
      const res = await fetch("/api/geoboost/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (res.ok || data.success) {
        onUnlock();
      } else {
        setErrorMsg(data.error || "Something went wrong — please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="my-8 rounded-2xl overflow-hidden border-2 border-green-300 shadow-lg">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5">
        <div className="flex items-center gap-3 mb-1">
          <Lock className="w-5 h-5 text-green-400 flex-shrink-0" />
          <h2 className="text-white font-extrabold text-lg">See your {result.weaknesses.length} fixes — enter your email to unlock the full report</h2>
        </div>
        <p className="text-slate-400 text-sm pl-8">Your score is above. The full breakdown — what's holding you back, what competitors do differently, and your estimated monthly revenue loss — is one step away.</p>
      </div>
      <div className="bg-white px-6 py-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="gate-name" className="block text-xs font-semibold text-slate-600">Your Name</label>
              <input
                id="gate-name"
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); if (status === "error") setStatus("idle"); }}
                placeholder="Jane Doe"
                required
                aria-required="true"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="gate-email" className="block text-xs font-semibold text-slate-600">Work Email</label>
              <input
                id="gate-email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
                placeholder="jane@company.com"
                required
                aria-required="true"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          {status === "error" && (
            <p className="text-red-600 text-xs">{errorMsg}</p>
          )}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={status === "sending" || !name.trim() || !email.trim()}
              style={{ backgroundColor: status === "sending" || !name.trim() || !email.trim() ? undefined : "#22c55e" }}
              className="px-8 py-3 text-white text-sm font-extrabold rounded-xl hover:opacity-90 transition-opacity disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {status === "sending" && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === "sending" ? "Unlocking…" : "Unlock full report →"}
            </button>
            <p className="text-xs text-slate-600">No spam. We'll also send a copy to your inbox.</p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Results() {
  const [, setLocation] = useLocation();
  const { isSignedIn } = useUser();
  const [result, setResult] = useState<AuditResult | null>(null);
  const [category, setCategory] = useState("your industry");
  const [editingCategory, setEditingCategory] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [emailUnlocked, setEmailUnlocked] = useState(false);

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

  useEffect(() => {
    if (!result) return;
    const domain = (() => {
      try { return new URL(result.scrapedUrl.startsWith("http") ? result.scrapedUrl : `https://${result.scrapedUrl}`).hostname.replace(/^www\./, ""); }
      catch { return result.scrapedUrl; }
    })();
    document.title = `${domain} — AI Score: ${result.aiVisibilityScore}/100 — Show me on AI`;
    trackEvent("results_view", { score: result.aiVisibilityScore, category, domain });
    return () => { document.title = "Show me on AI"; };
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!result) return null;

  const bingIndexed = (result as AuditResult & { bingIndexed?: boolean }).bingIndexed;
  const blockedBots = (result as AuditResult & { blockedBots?: string[] }).blockedBots ?? [];
  const citationResults = (result as AuditResult & { citationResults?: AuditCitationQueryResult[] | null }).citationResults;
  const aiCitationScore = (result as AuditResult & { aiCitationScore?: number | null }).aiCitationScore;
  const invisibilityRate = 100 - result.aiVisibilityScore;
  const roi = estimateMonthlyLoss(result.aiVisibilityScore, category);
  const categoryQueries = QUERY_SUGGESTIONS[category] ?? [];
  const allCitationResults = citationResults ? citationResults.flatMap(r => r.results) : [];
  const citationMentioned = allCitationResults.filter(r => r.mentioned).length;
  const citationTotal = allCitationResults.length;
  const domain = (() => {
    try { return new URL(result.scrapedUrl.startsWith("http") ? result.scrapedUrl : `https://${result.scrapedUrl}`).hostname.replace(/^www\./, ""); }
    catch { return result.scrapedUrl; }
  })();
  // Free plan runs Claude only; paid plans run all 4 models
  const isPaidPlan = citationResults !== null && citationResults !== undefined
    ? (citationResults[0]?.results?.length ?? 0) > 1
    : false;

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 md:px-8">
      {modalOpen && <WhyScoringLowModal result={result} category={category} onClose={() => setModalOpen(false)} />}

      <Show when="signed-out">
        {!bannerDismissed && <SaveResultsBanner onDismiss={() => setBannerDismissed(true)} />}
      </Show>

      <div className="mb-4 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Here is what we found for <span className="text-blue-600">{result.scrapedUrl}</span>
        </h1>
      </div>

      {/* Top-of-page verdict */}
      <div className="mb-6 text-center">
        {citationTotal > 0 ? (
          <p className="text-2xl font-extrabold text-slate-900">
            AI mentioned you in{" "}
            <span className={citationMentioned >= Math.ceil(citationTotal / 2) ? "text-green-600" : "text-red-600"}>
              {citationMentioned} out of {citationTotal}
            </span>{" "}
            searches we ran.
          </p>
        ) : result.aiVisibilityScore >= 70 ? (
          <p className="text-2xl font-extrabold text-slate-900">Your business shows up well — AI can find you for most searches in your category.</p>
        ) : result.aiVisibilityScore >= 40 ? (
          <p className="text-2xl font-extrabold text-slate-900">AI finds you sometimes, but you're missing most searches in your category.</p>
        ) : (
          <p className="text-2xl font-extrabold text-slate-900">AI assistants are currently skipping your business in most searches.</p>
        )}
      </div>

      {/* Category badge with inline edit */}
      <div className="mb-8 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-sm text-slate-600">Business type:</span>
        {editingCategory ? (
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setEditingCategory(false); }}
            onBlur={() => setEditingCategory(false)}
            autoFocus
            aria-label="Select business category"
            className="text-sm font-semibold border border-blue-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {CATEGORY_LIST.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => setEditingCategory(true)}
            aria-label={`Edit business category: currently ${category}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
          >
            {category}
            <Pencil className="w-3 h-3" />
          </button>
        )}
        {category !== "your industry" && (
          <span className="text-xs text-slate-600">— tap the label to correct it</span>
        )}
      </div>

      {/* Plain-English intro card */}
      <div className="mb-8 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 flex gap-4">
        <span className="text-3xl flex-shrink-0">🤖</span>
        <div>
          <p className="font-bold text-slate-900 mb-1">What does this mean?</p>
          <p className="text-slate-600 text-sm leading-relaxed">
            Millions of people now ask AI assistants like ChatGPT, Claude, and Google to recommend local businesses.
            We tested how often AI recommends <strong>{result.scrapedUrl}</strong> versus competitors for the searches your customers are already making.
            Here is what we found — and what it means for your business.
          </p>
        </div>
      </div>

      {/* Bing critical blocker */}
      {bingIndexed === false && <BingBlockerBanner url={result.scrapedUrl} />}

      {/* robots.txt AI crawler block warning */}
      {blockedBots.length > 0 && <RobotsBanner blockedBots={blockedBots} />}

      {/* Bing indexed green badge */}
      {bingIndexed === true && (
        <div className="mb-6 flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl w-fit">
          <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-green-800">Bing Indexed — ChatGPT Can Find You</span>
          <span className="text-xs text-green-600">Your site appears in Bing's index, so ChatGPT can cite you.</span>
        </div>
      )}

      {/* Main score gauge — always visible */}
      <div className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-center justify-between">
        <div className="text-center md:text-left mb-6 md:mb-0">
          <h2 className="text-xl font-bold text-slate-900 mb-1">How Often AI Recommends You</h2>
          <p className="text-slate-600 max-w-md">Out of 100 — how often AI assistants like ChatGPT recommend your business instead of a competitor.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Why is my score this low?
          </button>
        </div>
        <Gauge value={result.aiVisibilityScore} size={180} strokeWidth={16} className="mx-auto md:mx-0" />
      </div>

      {/* Email gate — shown for unauthenticated users who haven't submitted */}
      {!isSignedIn && !emailUnlocked && (
        <EmailGate result={result} category={category} onUnlock={() => setEmailUnlocked(true)} />
      )}

      {/* Full report — shown when email is captured or user is authenticated */}
      {(isSignedIn || emailUnlocked) && (
        <>
          {/* Sub-score gauges + fix CTA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
              <h3 className="font-semibold text-slate-700 mb-4">Content Depth</h3>
              <Gauge value={result.semanticDensityScore} size={120} strokeWidth={10} />
              <p className="text-xs text-slate-600 text-center mt-4">How well your page answers the questions AI gets asked about your business</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
              <h3 className="font-semibold text-slate-700 mb-4">Page Readability</h3>
              <Gauge value={result.structuralFormattingScore} size={120} strokeWidth={10} />
              <p className="text-xs text-slate-600 text-center mt-4">How easily AI can scan and understand your page layout</p>
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

          {/* Live AI Citation Test */}
          <CitationResultsSection
            citationResults={citationResults}
            aiCitationScore={aiCitationScore}
            domain={domain}
            isPaidPlan={isPaidPlan}
          />

          {/* What Customers Ask AI */}
          {categoryQueries.length > 0 && (
            <div className="mb-8 bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-1">What Customers Ask AI About {category} Businesses</h2>
              <p className="text-sm text-slate-600 mb-4">These are the searches AI assistants get asked in your category. Your business needs to show up in these answers.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categoryQueries.slice(0, 6).map((q, i) => (
                  <div key={i} className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                    <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700">{q.replace(/\[city\]/gi, "your city")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What You Could Be Missing Each Month */}
          <div className="mb-8 rounded-2xl overflow-hidden border border-red-200">
            <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-white flex-shrink-0" />
              <h2 className="text-white font-bold text-lg">What You Could Be Missing Each Month</h2>
            </div>
            <div className="bg-red-50 p-6 md:p-8">
              {/* Hero dollar figure */}
              <div className="text-center mb-6">
                <div className="text-5xl font-extrabold text-red-700 mb-2">{formatMoney(roi.amount)}</div>
                <p className="text-sm text-red-800 font-medium">estimated monthly revenue going to competitors instead of you</p>
                <p className="text-xs text-slate-600 mt-1">Based on typical search volume for {category} businesses</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-red-100 p-4 text-center">
                  <div className="text-2xl font-extrabold text-slate-900">{roi.monthlyQueries.toLocaleString()}</div>
                  <div className="text-xs text-slate-600 mt-1">Monthly AI searches in your category</div>
                </div>
                <div className="bg-white rounded-xl border border-red-100 p-4 text-center">
                  <div className="text-2xl font-extrabold text-red-600">
                    {Math.round(roi.monthlyQueries * (1 - result.aiVisibilityScore / 100)).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Searches where a competitor is recommended instead</div>
                </div>
                <div className="bg-white rounded-xl border border-red-100 p-4 text-center">
                  <div className="text-2xl font-extrabold text-red-700">{invisibilityRate}%</div>
                  <div className="text-xs text-slate-600 mt-1">Of AI searches where your competitors beat you</div>
                </div>
              </div>

              <p className="text-red-800 text-sm leading-relaxed mb-6 bg-red-100 rounded-lg px-4 py-3 border border-red-200">
                💡 AI typically recommends <strong>5 different businesses</strong> per answer in your category — not just one winner. Right now you're not one of them. Show me on AI helps you claim one of those spots before your competitors do.
              </p>

              <div className="bg-white rounded-xl border border-red-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-slate-700 text-sm">
                  <strong>Full ongoing optimization costs $149/month.</strong> If it recovers even one customer per month it pays for itself — most businesses see results within 2–4 weeks.
                </p>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <CtaButton label="Start Full Plan — $149/mo" className="px-6 py-3 text-sm whitespace-nowrap" />
                  <Link href="/fix">
                    <span className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer whitespace-nowrap">
                      or get the $49 quick-fix files
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Weaknesses + Competitor patterns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-xl font-bold text-slate-900">What's Holding You Back</h3>
              </div>
              {result.weaknesses.map((weakness, i) => (
                <div key={i} className="bg-red-50 rounded-lg border border-red-100 p-4 flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {i + 1}
                  </div>
                  <p className="text-red-900 text-sm">{toPlainEnglish(weakness)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h3 className="text-xl font-bold text-slate-900">What High-Ranking Businesses Do Differently</h3>
              </div>
              {result.competitorPatterns.map((pattern, i) => (
                <div key={i} className="bg-blue-50 rounded-lg border border-blue-100 p-4 flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-3 h-3" />
                  </div>
                  <p className="text-blue-900 text-sm">{toPlainEnglish(pattern)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fix Package CTA */}
          <div className="mt-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest bg-white/15 text-slate-300 px-2.5 py-1 rounded-full">
                    ⚡ Quick Fix · One-time $49
                  </span>
                </div>
                <h2 className="text-xl font-extrabold mb-1">Get Your Complete Fix Package</h2>
                <p className="text-slate-400 text-sm max-w-lg">
                  Done-for-you files: schema markup, Google Business Profile copy, social media bios, and a full content brief — generated for <strong className="text-white">{result.scrapedUrl}</strong> in minutes. Apply them yourself, once.
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  {[
                    { icon: "🔧", label: "Business Info Code" },
                    { icon: "📍", label: "Google Business Listing" },
                    { icon: "📱", label: "Social Descriptions" },
                    { icon: "📄", label: "Website Fix Guide" },
                  ].map(({ icon, label }) => (
                    <span key={label} className="flex items-center gap-1.5 text-xs font-semibold bg-white/10 rounded-lg px-3 py-1.5">
                      {icon} {label}
                    </span>
                  ))}
                </div>
              </div>
              <Link href="/fix">
                <button
                  style={{ backgroundColor: "#22c55e" }}
                  className="flex-shrink-0 flex items-center gap-2 px-7 py-3.5 text-white font-extrabold text-base rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg"
                >
                  <Zap className="w-5 h-5" />
                  Unlock for $49
                </button>
              </Link>
            </div>
          </div>

          <ShareResultsSection result={result} category={category} />
          <EmailResultsSection result={result} category={category} />

          {/* Bottom CTA */}
          <div className="mt-8 bg-[#0f172a] rounded-2xl p-8 text-center text-white">
            <div className="flex justify-center mb-3">
              <span className="text-xs font-bold uppercase tracking-widest bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                🚀 Full Solution · $149/month subscription
              </span>
            </div>
            <h2 className="text-2xl font-extrabold mb-2">Stop losing {formatMoney(roi.amount)}/month to competitors</h2>
            <p className="text-slate-400 mb-6 max-w-xl mx-auto">
              Show me on AI rewrites your content to match what AI assistants want to cite — specific facts, structured answers, and direct responses to the queries your customers are already asking. Ongoing monitoring included.
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
        </>
      )}
    </div>
  );
}
