import { useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Loader2, X, Zap, Search, TrendingUp, Users } from "lucide-react";

type BillingCycle = "monthly" | "annual";
type CtaAction = "free" | "fix" | "monitor" | "grow";

interface Tier {
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  annualTotal: string;
  period?: string;
  tag?: string;
  highlight: boolean;
  description: string;
  cta: string;
  ctaAction: CtaAction;
  features: string[];
  notIncluded?: string[];
}

const TIERS: Tier[] = [
  {
    name: "Free",
    monthlyPrice: "$0",
    annualPrice: "$0",
    annualTotal: "",
    description: "One free audit per domain per month. See exactly why AI isn't recommending you.",
    cta: "Run Free Audit",
    ctaAction: "free",
    highlight: false,
    features: [
      "AI Visibility Score (0–100)",
      "Content Usefulness Score",
      "AI Readability Score",
      "3 specific weaknesses identified",
      "Bing indexing check",
      "robots.txt AI crawler check",
      "Shareable results link",
    ],
    notIncluded: [
      "Content optimization",
      "Weekly re-audits",
      "Tracked query monitoring",
    ],
  },
  {
    name: "Fix Package",
    monthlyPrice: "$49",
    annualPrice: "$49",
    annualTotal: "",
    period: "one-time",
    description: "One-time deep fix. Get a full content rewrite, schema markup, and step-by-step action plan.",
    cta: "Get the Fix",
    ctaAction: "fix",
    highlight: false,
    features: [
      "Full AI-optimized content rewrite",
      "JSON-LD schema markup generated",
      "Google Business Profile copy",
      "Social media bio rewrites",
      "Prioritized fix action plan",
      "8-question FAQ section",
      "Download & email your brief",
    ],
  },
  {
    name: "Monitor",
    monthlyPrice: "$49",
    annualPrice: "$39",
    annualTotal: "$468/yr",
    period: "/month",
    tag: "Most Popular",
    description: "Weekly automated re-audits, 5 tracked AI queries, and a Monday morning email report showing your progress.",
    cta: "Start Monitoring",
    ctaAction: "monitor",
    highlight: true,
    features: [
      "Everything in Fix Package",
      "Weekly automated re-audits",
      "5 tracked AI queries",
      "Monday morning email report",
      "Score change alerts (▲▼)",
      "Per-query citation status",
      "Weekly priority recommendation",
    ],
    notIncluded: [
      "Multiple domains",
      "Competitor tracking",
    ],
  },
  {
    name: "Grow",
    monthlyPrice: "$149",
    annualPrice: "$119",
    annualTotal: "$1,428/yr",
    period: "/month",
    description: "For businesses serious about AI visibility — track 3 domains, 20 queries, and see how you compare to competitors.",
    cta: "Start Growing",
    ctaAction: "grow",
    highlight: false,
    features: [
      "Everything in Monitor",
      "3 domains tracked",
      "20 tracked AI queries",
      "Competitor AI visibility comparison",
      "Monthly PDF report",
      "Priority email support",
    ],
  },
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingCycle>("monthly");

  const handleCta = async (action: CtaAction) => {
    if (action === "free") return;
    if (action === "fix") {
      window.location.href = "/fix";
      return;
    }
    const endpointMap: Record<string, string> = {
      monitor: billing === "annual" ? "/api/stripe/create-monitor-annual-checkout" : "/api/stripe/create-monitor-checkout",
      grow: billing === "annual" ? "/api/stripe/create-grow-annual-checkout" : "/api/stripe/create-grow-checkout",
    };
    const endpoint = endpointMap[action];
    setLoading(action);
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Could not start checkout. Please try again.");
        setLoading(null);
      }
    } catch {
      alert("Network error. Please try again.");
      setLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-16 px-4 md:px-8">
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-full px-4 py-1.5 text-sm font-bold mb-6">
          <Zap className="w-3.5 h-3.5" />
          Simple Pricing
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 leading-tight">
          Start free. Upgrade when it's working.
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Most small businesses start with the free audit, fix their biggest issues, then monitor their progress weekly.
          No contracts, cancel any time.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 mt-8 bg-slate-100 rounded-full p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
              billing === "monthly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
              billing === "annual"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Annual
            <span className="bg-green-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {TIERS.map((tier) => {
          const isOneTime = tier.ctaAction === "fix" || tier.ctaAction === "free";
          const displayPrice = isOneTime ? tier.monthlyPrice : (billing === "annual" ? tier.annualPrice : tier.monthlyPrice);
          const showAnnualNote = billing === "annual" && tier.annualTotal;

          return (
            <div
              key={tier.name}
              className={`relative rounded-2xl flex flex-col ${
                tier.highlight
                  ? "bg-slate-900 text-white shadow-2xl ring-2 ring-green-500 scale-[1.02]"
                  : "bg-white border border-slate-200 shadow-sm"
              }`}
            >
              {tier.tag && (
                <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {tier.tag}
                  </span>
                </div>
              )}

              <div className="p-6 flex-1">
                <div className="mb-4">
                  <h2 className={`text-sm font-bold uppercase tracking-wide mb-1 ${tier.highlight ? "text-green-400" : "text-slate-500"}`}>
                    {tier.name}
                  </h2>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-extrabold ${tier.highlight ? "text-white" : "text-slate-900"}`}>
                      {displayPrice}
                    </span>
                    {tier.period && (
                      <span className={`text-sm ${tier.highlight ? "text-slate-400" : "text-slate-400"}`}>
                        {isOneTime ? tier.period : "/month"}
                      </span>
                    )}
                  </div>
                  {showAnnualNote && (
                    <p className={`text-xs mt-1 font-semibold ${tier.highlight ? "text-green-400" : "text-green-600"}`}>
                      {tier.annualTotal} — billed annually
                    </p>
                  )}
                  {billing === "monthly" && !isOneTime && tier.annualPrice !== tier.monthlyPrice && (
                    <p className={`text-xs mt-1 ${tier.highlight ? "text-slate-400" : "text-slate-400"}`}>
                      or {tier.annualPrice}/mo billed annually
                    </p>
                  )}
                </div>

                <p className={`text-sm leading-relaxed mb-5 ${tier.highlight ? "text-slate-300" : "text-slate-500"}`}>
                  {tier.description}
                </p>

                <ul className="space-y-2.5 mb-5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tier.highlight ? "text-green-400" : "text-green-500"}`} />
                      <span className={`text-sm ${tier.highlight ? "text-slate-200" : "text-slate-600"}`}>{f}</span>
                    </li>
                  ))}
                  {tier.notIncluded?.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 opacity-40">
                      <X className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tier.highlight ? "text-slate-400" : "text-slate-400"}`} />
                      <span className={`text-sm ${tier.highlight ? "text-slate-400" : "text-slate-400"}`}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-6 pb-6">
                {tier.ctaAction === "free" ? (
                  <Link href="/">
                    <button className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${tier.highlight ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                      {tier.cta}
                    </button>
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCta(tier.ctaAction)}
                    disabled={loading === tier.ctaAction}
                    style={tier.highlight ? { backgroundColor: "#22c55e" } : undefined}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                      tier.highlight
                        ? "text-white hover:opacity-90"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {loading === tier.ctaAction && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading === tier.ctaAction ? "Loading…" : tier.cta}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 md:p-10 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 rounded-full px-4 py-1.5 text-sm font-bold mb-4">
          <Users className="w-3.5 h-3.5" />
          Done For You — $399/month
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2">Need someone to handle it all?</h2>
        <p className="text-slate-400 mb-6 max-w-lg mx-auto text-sm leading-relaxed">
          We publish your optimized content directly to your website, Google Business Profile, and social media — no copy-pasting required. Dedicated account manager included.
        </p>
        <Link href="/upgrade">
          <button className="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm">
            Join the Waitlist
          </button>
        </Link>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Search, title: "Why Monitor?", body: "AI citations change weekly. A single content update can move your score 10–20 points. Without weekly tracking, you're flying blind." },
          { icon: TrendingUp, title: "Typical results", body: "Most businesses that apply their fix plan see score improvements within 2–4 weeks. Monitor tracks that progress automatically." },
          { icon: Zap, title: "No tech skills needed", body: "We tell you exactly what to change in plain English. You copy the fix, paste it into your website, and we track the rest." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">{title}</h3>
            <p className="text-slate-500 text-xs leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
