import { useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Loader2, Zap, Globe, BarChart2, Users } from "lucide-react";

const PLATFORMS = ["WordPress", "Shopify", "Webflow", "Squarespace", "Wix", "Other"];

export default function Upgrade() {
  const [form, setForm] = useState({ name: "", email: "", websiteUrl: "", platform: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.websiteUrl || !form.platform) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (res.ok) {
        setStatus("done");
      } else {
        setErrorMsg(data.error ?? "Something went wrong");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  const features = [
    { icon: Globe, text: "Automatic content publishing to your CMS" },
    { icon: BarChart2, text: "Google Business Profile optimization" },
    { icon: Zap, text: "Monthly re-audits and re-optimization" },
    { icon: Users, text: "Dedicated account manager" },
  ];

  return (
    <div className="max-w-4xl mx-auto py-16 px-4 md:px-8">
      {/* Hero */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-full px-4 py-1.5 text-sm font-bold mb-6">
          <Zap className="w-3.5 h-3.5" />
          Done For You
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 leading-tight">
          Show me on AI Done For You
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          We publish your optimized content directly to your website, Google Business Profile, and social media —
          <strong className="text-slate-700"> no copy-pasting required.</strong>
        </p>
        <div className="mt-6 inline-flex items-baseline gap-1">
          <span className="text-5xl font-extrabold text-slate-900">$399</span>
          <span className="text-slate-500 text-lg">/month</span>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
        {features.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className="w-4.5 h-4.5 text-green-600 w-4 h-4" />
            </div>
            <span className="text-slate-700 font-medium text-sm">{text}</span>
          </div>
        ))}
      </div>

      {/* Waitlist form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#0f172a] px-8 py-6 text-white text-center">
          <h2 className="text-2xl font-extrabold mb-1">Join the Waitlist</h2>
          <p className="text-slate-400 text-sm">Limited spots available. We'll contact you within 24 hours to get you set up.</p>
        </div>

        {status === "done" ? (
          <div className="px-8 py-16 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">You're on the list!</h3>
            <p className="text-slate-500 mb-8">We'll contact you within 24 hours to get you set up.</p>
            <Link href="/">
              <button className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors text-sm">
                Back to Home
              </button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="px-8 py-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@business.com"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Website URL</label>
              <input
                type="url"
                required
                value={form.websiteUrl}
                onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                placeholder="https://yourbusiness.com"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Current platform / CMS</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, platform: p }))}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${form.platform === p ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {status === "error" && (
              <p className="text-red-600 text-sm">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "submitting" || !form.name || !form.email || !form.websiteUrl || !form.platform}
              style={{ backgroundColor: status === "submitting" || !form.platform ? undefined : "#22c55e" }}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-bold rounded-lg text-base hover:opacity-90 transition-opacity disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {status === "submitting" && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === "submitting" ? "Joining…" : "Join Waitlist"}
            </button>
            <p className="text-xs text-slate-400 text-center">No commitment. We'll reach out to confirm your spot before charging anything.</p>
          </form>
        )}
      </div>
    </div>
  );
}
