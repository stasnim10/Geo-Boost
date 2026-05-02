import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRunAudit } from "@workspace/api-client-react";
import { ShieldAlert, Crosshair, Search, Loader2 } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const runAudit = useRunAudit();
  
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [query1, setQuery1] = useState("");
  const [query2, setQuery2] = useState("");
  const [query3, setQuery3] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  
  const [step, setStep] = useState<"initial" | "email">("initial");

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !category || !query1 || !query2 || !query3) return;
    setStep("email");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    runAudit.mutate({
      data: {
        url,
        category,
        queries: [query1, query2, query3],
        name,
        email
      }
    }, {
      onSuccess: (result) => {
        // Store in sessionStorage or state management. For simplicity, we can pass via sessionStorage
        sessionStorage.setItem("geoboost_audit_result", JSON.stringify(result));
        sessionStorage.setItem("geoboost_audit_queries", JSON.stringify([query1, query2, query3]));
        setLocation("/results");
      }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 md:px-8">
      <div className="max-w-3xl text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold tracking-wide mb-6 border border-blue-100">
          <ShieldAlert className="w-4 h-4" /> AI Vulnerability Scanner
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
          AI is recommending your competitors.<br/>
          <span className="text-slate-500">Find out why.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
          Generative Engine Optimization (GEO) audit. Discover exactly why ChatGPT, Claude, and Perplexity are ignoring your business in their answers.
        </p>
      </div>

      <div className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8">
          {runAudit.isPending ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Analyzing {url}...</h3>
              <p className="text-slate-500 max-w-sm">
                Scanning your content for semantic density, structural formatting, and AI visibility markers.
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-8 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          ) : step === "initial" ? (
            <form onSubmit={handleNext} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-slate-700 font-semibold">Business Website URL</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input 
                    id="url"
                    placeholder="https://yourbusiness.com" 
                    className="pl-10 h-12 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 text-lg"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-slate-700 font-semibold">Business Category</Label>
                <Input 
                  id="category"
                  placeholder="e.g. B2B SaaS, Boutique Coffee Roaster" 
                  className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-4">
                <Label className="text-slate-700 font-semibold">Target AI Queries (What your customers ask ChatGPT)</Label>
                <div className="space-y-3">
                  <div className="relative">
                    <Crosshair className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Query 1" 
                      className="pl-9 bg-slate-50 border-slate-200"
                      value={query1}
                      onChange={e => setQuery1(e.target.value)}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Crosshair className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Query 2" 
                      className="pl-9 bg-slate-50 border-slate-200"
                      value={query2}
                      onChange={e => setQuery2(e.target.value)}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Crosshair className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Query 3" 
                      className="pl-9 bg-slate-50 border-slate-200"
                      value={query3}
                      onChange={e => setQuery3(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold bg-[#0f172a] hover:bg-slate-800 text-white">
                Scan My Website
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Almost done</h3>
                <p className="text-slate-500">Where should we send your detailed audit report?</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 font-semibold">Your Name</Label>
                  <Input 
                    id="name"
                    placeholder="Jane Doe" 
                    className="h-12 bg-slate-50 border-slate-200"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-semibold">Work Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    placeholder="jane@company.com" 
                    className="h-12 bg-slate-50 border-slate-200"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" size="lg" className="h-14 w-1/3" onClick={() => setStep("initial")}>
                  Back
                </Button>
                <Button type="submit" size="lg" className="h-14 w-2/3 text-lg font-bold bg-[#22c55e] hover:bg-green-600 text-white border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all">
                  Reveal Audit Score
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
