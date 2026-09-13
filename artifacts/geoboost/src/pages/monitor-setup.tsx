import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useUser } from "@clerk/react";
import { Loader2, CheckCircle2, Search, Globe, Mail, Plus, X, Lock } from "lucide-react";

export default function MonitorSetup() {
  const { user, isLoaded } = useUser();
  const [, navigate] = useLocation();

  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [queries, setQueries] = useState<string[]>(["", "", "", "", ""]);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [existing, setExisting] = useState<{ domain: string; queries: string[]; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Monitor Setup — Show me on AI";
    return () => { document.title = "Show me on AI"; };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { navigate("/sign-in"); return; }

    const email = user.emailAddresses[0]?.emailAddress ?? "";
    setEmail(email);

    const stored = sessionStorage.getItem("geoboost_audit_result");
    const storedQ = sessionStorage.getItem("geoboost_audit_queries");
    if (stored) {
      try {
        const r = JSON.parse(stored) as { scrapedUrl?: string };
        const d = r.scrapedUrl?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? "";
        setDomain(d);
      } catch {}
    }
    if (storedQ) {
      try {
        const q = JSON.parse(storedQ) as string[];
        setQueries(prev => {
          const merged = [...q, ...prev].slice(0, 5);
          while (merged.length < 5) merged.push("");
          return merged;
        });
      } catch {}
    }

    Promise.all([
      fetch("/api/stripe/subscription", { credentials: "include" })
        .then(r => r.ok ? r.json() as Promise<{ plan: string }> : { plan: "free" })
        .catch(() => ({ plan: "free" })),
      fetch("/api/monitor/setup", { credentials: "include" })
        .then(r => r.ok ? r.json() as Promise<{ domain: string; queries: string[]; email: string }> : null)
        .catch(() => null),
    ]).then(([subData, setupData]) => {
      setPlan(subData.plan);
      if (setupData) {
        setExisting(setupData);
        setDomain(setupData.domain);
        setEmail(setupData.email);
        const q = [...setupData.queries];
        while (q.length < 5) q.push("");
        setQueries(q.slice(0, 5));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isLoaded, user, navigate]);

  const updateQuery = (i: number, val: string) => {
    setQueries(prev => prev.map((q, idx) => idx === i ? val : q));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = queries.filter(q => q.trim());
    if (!domain.trim() || !email.trim() || filled.length === 0) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/monitor/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ domain: domain.trim(), queries: filled, email: email.trim() }),
      });
      if (res.ok) {
        setStatus("done");
      } else {
        const d = await res.json() as { error?: string };
        setErrorMsg(d.error ?? "Something went wrong");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (plan === "free") {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <div className="w-20 h-20 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-9 h-9 text-amber-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-3">Monitor is a paid feature</h1>
        <p className="text-slate-500 mb-2 leading-relaxed">
          Weekly AI visibility re-audits, 5 tracked queries, and a Monday morning email report are available on the <strong>Monitor plan</strong> ($49/month) or the <strong>Grow plan</strong> ($149/month).
        </p>
        <p className="text-sm text-slate-400 mb-8">You're currently on the free plan.</p>
        <Link href="/pricing?plan=monitor">
          <button
            style={{ backgroundColor: "#22c55e" }}
            className="px-8 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            View Pricing &amp; Upgrade
          </button>
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">You're all set!</h1>
        <p className="text-slate-500 mb-3 leading-relaxed">
          We'll re-audit <strong>{domain}</strong> every week and email your AI visibility report to <strong>{email}</strong> every Monday morning.
        </p>
        <p className="text-sm text-slate-400 mb-8">Your first report will arrive next Monday. You can update these settings any time.</p>
        <button
          onClick={() => navigate("/dashboard")}
          style={{ backgroundColor: "#22c55e" }}
          className="px-8 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 md:px-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-full px-3.5 py-1.5 text-xs font-bold mb-4">
          <Search className="w-3 h-3" />
          Monitor Setup
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Set up your weekly AI tracking
        </h1>
        <p className="text-slate-500 leading-relaxed">
          Every Monday we'll check how often ChatGPT, Claude, and Perplexity recommend your business for these searches — and email you a full report.
        </p>
        {existing && (
          <div className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
            You already have tracking set up. Update it below.
          </div>
        )}
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              <Globe className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
              Your domain
            </label>
            <input
              type="text"
              required
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="yourbusiness.com"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">Just the domain — no https:// needed</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              <Mail className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
              Report email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@business.com"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1">We'll send your weekly report here every Monday</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
            <Search className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
            5 AI queries to track
          </label>
          <p className="text-xs text-slate-400 mb-4">What would your customers type into ChatGPT to find a business like yours?</p>
          <div className="space-y-3">
            {queries.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <input
                  type="text"
                  value={q}
                  onChange={e => updateQuery(i, e.target.value)}
                  placeholder={[
                    "best plumber in Austin",
                    "emergency plumber near me",
                    "affordable plumbing services Austin",
                    "licensed plumber Austin TX",
                    "pipe repair service near me",
                  ][i] ?? `Query ${i + 1}`}
                  className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {q && (
                  <button type="button" onClick={() => updateQuery(i, "")} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            <Plus className="w-3 h-3 inline" /> You need at least 1 query. Fill as many as you want up to 5.
          </p>
        </div>

        {status === "error" && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{errorMsg}</div>
        )}

        <button
          type="submit"
          disabled={status === "saving" || !domain.trim() || !email.trim() || queries.filter(q => q.trim()).length === 0}
          style={{ backgroundColor: "#22c55e" }}
          className="w-full flex items-center justify-center gap-2 py-4 text-white font-bold rounded-xl text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
          {status === "saving" ? "Saving…" : existing ? "Update Tracking Setup" : "Start Weekly Monitoring"}
        </button>
        <p className="text-xs text-slate-400 text-center">
          Reports arrive every Monday at 8am. You can update your queries any time.
        </p>
      </form>
    </div>
  );
}
