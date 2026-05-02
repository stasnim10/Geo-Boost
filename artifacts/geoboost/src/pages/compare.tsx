import { Link } from "wouter";
import { Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const rows = [
  { feature: "Built for", geoboost: "Small business owners", them: "Marketing agencies & enterprises" },
  { feature: "Free audit included", geoboost: true, them: false },
  { feature: "Results in plain English", geoboost: true, them: false },
  { feature: "Fix package (one-time)", geoboost: "$49", them: "Not available" },
  { feature: "Monthly subscription", geoboost: "$149/month", them: "$200+/month" },
  { feature: "Schema markup generator", geoboost: true, them: false },
  { feature: "Google Business Profile optimizer", geoboost: true, them: false },
  { feature: "Social media bio optimizer", geoboost: true, them: false },
  { feature: "Requires marketing expertise", geoboost: false, them: true },
  { feature: "Minimum contract", geoboost: "None — cancel anytime", them: "Annual plans common" },
];

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100">
        <Check className="w-4 h-4 text-green-600" />
      </span>
    ) : (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50">
        <X className="w-4 h-4 text-red-400" />
      </span>
    );
  }
  return <span className="text-sm font-semibold text-slate-700">{value}</span>;
}

export default function Compare() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold tracking-wide mb-4 border border-green-100">
          GEOboost vs Enterprise Tools
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
          Built for small businesses,<br />not marketing departments.
        </h1>
        <p className="text-slate-500 text-base max-w-xl mx-auto">
          Enterprise SEO tools are powerful — but they're built for agencies and marketing teams. GEOboost is the only AI visibility tool designed for business owners who just want more customers.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="grid grid-cols-3 bg-slate-900 text-white text-sm font-bold px-6 py-4">
          <div className="text-slate-400">Feature</div>
          <div className="text-center text-green-400">GEOboost</div>
          <div className="text-center text-slate-400">Surfer &amp; Others</div>
        </div>
        {rows.map((row, i) => (
          <div
            key={row.feature}
            className={`grid grid-cols-3 px-6 py-4 items-center ${i % 2 === 0 ? "bg-white" : "bg-slate-50"} border-b border-slate-100 last:border-0`}
          >
            <div className="text-sm text-slate-700 font-medium pr-4">{row.feature}</div>
            <div className="flex justify-center">
              <Cell value={row.geoboost} />
            </div>
            <div className="flex justify-center">
              <Cell value={row.them} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-extrabold mb-2">Ready to get started?</h2>
        <p className="text-slate-300 text-sm mb-6 max-w-md mx-auto">
          Run a free audit in 60 seconds. No credit card, no marketing jargon, no agency required.
        </p>
        <Link href="/">
          <Button className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3 h-12 text-base">
            Check My AI Visibility — Free <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
        <p className="text-xs text-slate-500 mt-4">Results in 60 seconds. No tech knowledge needed.</p>
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900">
        <strong>The biggest insight from recent research:</strong> 48% of businesses cited by AI don't even rank on Google's first page. AI is a new playing field — and it's wide open for small businesses who optimize their content the right way.
        <span className="block text-xs text-amber-600 mt-1">Source: Surfer SEO analysis of 405,576 Google AI overview searches</span>
      </div>
    </div>
  );
}
