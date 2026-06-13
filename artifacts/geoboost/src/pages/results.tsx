import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Show, useUser } from "@clerk/react";
import { Gauge } from "@/components/gauge";
import { AuditResult } from "@workspace/api-client-react";
import { AlertTriangle, TrendingUp, Zap, DollarSign, Loader2, BookmarkPlus, X, Mail, ChevronDown, CheckCircle2, Link2, Copy, Check, ShieldAlert, ShieldCheck, Bot, ChevronRight, HelpCircle } from "lucide-react";

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

function WhyScoringLowModal({ result, category, onClose }: { result: AuditResult; category: string; onClose: () => void }) {
  const score = result.aiVisibilityScore;
  const scoreLabel = score >= 70 ? "Good" : score >= 40 ? "Needs Work" : "Critical";
  const scoreColor = score >= 70 ? "text-green-600" : score >= 40 ? "text-amber-600" : "text-red-600";

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">Why Is My Score {score}/100?</h2>
              <p className={`text-xs font-semibold ${scoreColor}`}>{scoreLabel} — here's the full breakdown</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
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
                    <p className="text-sm text-slate-700 leading-relaxed">{w}</p>
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
                Get It Fixed — $49 One-Time
              </button>
            </Link>
            <Link href="/optimizer" className="flex-1">
              <button className="w-full py-3 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                Fix It Yourself — Free Tool
              </button>
            </Link>
          </div>
        </div>
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
  const [modalOpen, setModalOpen] = useState(false);

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

  const bingIndexed = (result as AuditResult & { bingIndexed?: boolean }).bingIndexed;
  const blockedBots = (result as AuditResult & { blockedBots?: string[] }).blockedBots ?? [];
  const invisibilityRate = 100 - result.aiVisibilityScore;
  const roi = estimateMonthlyLoss(result.aiVisibilityScore, category);

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 md:px-8">
      {modalOpen && <WhyScoringLowModal result={result} category={category} onClose={() => setModalOpen(false)} />}

      <Show when="signed-out">
        {!bannerDismissed && <SaveResultsBanner onDismiss={() => setBannerDismissed(true)} />}
      </Show>

      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Here is what we found for <span className="text-blue-600">{result.scrapedUrl}</span>
        </h1>
        <p className="text-slate-500 mt-2 text-lg">AI assistants are recommending your competitors instead of you.</p>
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

      {/* Score gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="col-span-1 md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <h2 className="text-xl font-bold text-slate-900 mb-1">How Often AI Recommends You</h2>
            <p className="text-slate-500 max-w-md">Out of 100 — how often AI assistants like ChatGPT recommend your business instead of a competitor.</p>
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

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
          <h3 className="font-semibold text-slate-700 mb-4">Content Usefulness</h3>
          <Gauge value={result.semanticDensityScore} size={120} strokeWidth={10} />
          <p className="text-xs text-slate-500 text-center mt-4">How much helpful, specific information AI can find on your page</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
          <h3 className="font-semibold text-slate-700 mb-4">AI Readability</h3>
          <Gauge value={result.structuralFormattingScore} size={120} strokeWidth={10} />
          <p className="text-xs text-slate-500 text-center mt-4">How easily AI can read and understand your website</p>
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
          <p className="text-red-900 text-base leading-relaxed mb-4">
            Based on your AI Visibility Score of <strong>{result.aiVisibilityScore}/100</strong>, AI assistants
            are recommending competitors over you approximately{" "}
            <strong>{invisibilityRate}% of the time</strong>. For a business in the{" "}
            <strong>{category}</strong> category, this invisibility typically costs an estimated{" "}
            <strong className="text-red-700 text-lg">{formatMoney(roi.amount)}/month</strong> in revenue
            going directly to competitors who rank higher in AI answers.
          </p>
          <p className="text-red-800 text-sm leading-relaxed mb-6 bg-red-100 rounded-lg px-4 py-3 border border-red-200">
            💡 <strong>Here's the opportunity:</strong> For searches in the <strong>{category}</strong> category, AI typically recommends <strong>5 different businesses</strong> per answer — not just one winner. Right now you're not one of them. Show me on AI helps you claim one of those citation spots before your competitors do.
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
              <strong>Show me on AI costs $149/month.</strong> If it recovers even one lost customer per month,
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
            <h3 className="text-xl font-bold text-slate-900">Why AI Is Skipping Your Business</h3>
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
            <h3 className="text-xl font-bold text-slate-900">What Top-Ranked Competitors Do That You Don't</h3>
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

      {/* Fix Package CTA */}
      <div className="mt-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-extrabold mb-1">Get Your Complete Fix Package</h2>
            <p className="text-slate-400 text-sm max-w-lg">
              Schema markup, Google Business Profile copy, social media bios, and a full content brief — generated for <strong className="text-white">{result.scrapedUrl}</strong> in minutes.
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
        <h2 className="text-2xl font-extrabold mb-2">Stop losing {formatMoney(roi.amount)}/month to competitors</h2>
        <p className="text-slate-400 mb-6 max-w-xl mx-auto">
          Show me on AI rewrites your content to match what AI assistants want to cite — specific facts, structured answers, and direct responses to the queries your customers are already asking.
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
