import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Gauge } from "@/components/gauge";
import { AuditResult } from "@workspace/api-client-react";
import { AlertTriangle, TrendingUp, ArrowRight, Zap, DollarSign } from "lucide-react";

function estimateMonthlyLoss(score: number, category: string): { amount: number; monthlyQueries: number; conversionRate: number; avgTransaction: number } {
  const cat = category.toLowerCase();

  // Categorize and set economic parameters
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

  // Queries being won vs lost based on score
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

export default function Results() {
  const [, setLocation] = useLocation();
  const [result, setResult] = useState<AuditResult | null>(null);
  const [category, setCategory] = useState("your industry");

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
    } catch (e) {
      setLocation("/");
    }
  }, [setLocation]);

  if (!result) return null;

  const invisibilityRate = 100 - result.aiVisibilityScore;
  const roi = estimateMonthlyLoss(result.aiVisibilityScore, category);

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 md:px-8">
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
          <button
            style={{ backgroundColor: "#10B981" }}
            className="w-full hover:opacity-90 text-white font-bold h-12 text-base rounded-lg transition-opacity"
          >
            Optimize My Content — $149/month
          </button>
          <a href="/optimizer" className="block text-center mt-4 text-xs font-medium text-slate-400 hover:text-white underline transition-colors">
            or try the free optimizer tool
          </a>
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
            <button
              style={{ backgroundColor: "#10B981" }}
              className="flex-shrink-0 hover:opacity-90 text-white font-bold px-6 py-3 rounded-lg transition-opacity text-sm whitespace-nowrap"
            >
              Fix This Now — $149/mo
            </button>
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
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                <Zap className="w-3 h-3" />
              </div>
              <p className="text-blue-900 text-sm">{pattern}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 bg-[#0f172a] rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-extrabold mb-2">Stop losing {formatMoney(roi.amount)}/month to competitors</h2>
        <p className="text-slate-400 mb-6 max-w-xl mx-auto">
          GEOboost rewrites your content to match what AI assistants want to cite — specific facts, structured answers, and direct responses to the queries your customers are already asking.
        </p>
        <button
          style={{ backgroundColor: "#10B981" }}
          className="hover:opacity-90 text-white font-bold px-10 py-4 rounded-lg transition-opacity text-lg"
        >
          Optimize My Content — $149/month
        </button>
        <div className="mt-4">
            <a href="/optimizer" className="text-slate-400 hover:text-white text-sm underline transition-colors">
            or try the free optimizer tool
          </a>
        </div>
      </div>
    </div>
  );
}
