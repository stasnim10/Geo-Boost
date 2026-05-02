import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Gauge } from "@/components/gauge";
import { Button } from "@/components/ui/button";
import { AuditResult } from "@workspace/api-client-react";
import { AlertTriangle, TrendingUp, ArrowRight, Zap } from "lucide-react";

export default function Results() {
  const [, setLocation] = useLocation();
  const [result, setResult] = useState<AuditResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("geoboost_audit_result");
    if (!stored) {
      setLocation("/");
      return;
    }
    try {
      setResult(JSON.parse(stored));
    } catch (e) {
      setLocation("/");
    }
  }, [setLocation]);

  if (!result) return null;

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 md:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Audit Report for <span className="text-blue-600">{result.scrapedUrl}</span></h1>
        <p className="text-slate-500 mt-2 text-lg">AI engines are struggling to recommend your business.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
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
          <Link href="/optimizer" className="block text-center mt-4 text-xs font-medium text-slate-400 hover:text-white transition-colors">
            or try the free optimizer tool <ArrowRight className="inline w-3 h-3 ml-1" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-xl font-bold text-slate-900">Critical Weaknesses</h3>
          </div>
          {result.weaknesses.map((weakness, i) => (
            <div key={i} className="bg-red-50 rounded-lg border border-red-100 p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                {i+1}
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
    </div>
  );
}
