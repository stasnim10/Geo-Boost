import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, Copy, Check, Lock, Zap, Globe, BarChart2, FileText, ChevronDown, ChevronUp, Download, Mail, X, CheckCircle2 } from "lucide-react";

interface FixContext {
  url: string;
  category: string;
  queries: string[];
  weaknesses: string[];
  location: string;
  aiVisibilityScore: number;
  semanticDensityScore: number;
  structuralFormattingScore: number;
  bingIndexed?: boolean;
  blockedBots?: string[];
}

interface SchemaData { schema: string }
interface GBPData { description: string; posts: string[]; qa: { q: string; a: string }[] }
interface SocialData { twitter: string; linkedin: string; instagram: string; facebook: string }
interface BriefData {
  executiveSummary: string;
  weaknessFixes: { weakness: string; before: string; after: string; recommendation: string }[];
  priorityOrder: string[];
  contentAdditions: string[];
  faqSection: { q: string; a: string }[];
}

type SectionStatus = "idle" | "loading" | "done" | "error";

function useCopyButton() {
  const [copiedKey, setCopiedKey] = useState("");
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  }, []);
  return { copiedKey, copy };
}

function CopyBtn({ text, label = "Copy", copyKey, activeCopyKey, onCopy }: {
  text: string; label?: string; copyKey: string;
  activeCopyKey: string; onCopy: (text: string, key: string) => void;
}) {
  const active = activeCopyKey === copyKey;
  return (
    <button
      onClick={() => onCopy(text, copyKey)}
      style={active ? { backgroundColor: "#22c55e" } : undefined}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${active ? "text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
    >
      {active ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {active ? "Copied!" : label}
    </button>
  );
}

function SectionShell({ icon, title, subtitle, status, error, onRetry, children }: {
  icon: React.ReactNode; title: string; subtitle: string;
  status: SectionStatus; error: string; onRetry: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 flex items-start gap-4 border-b border-slate-100">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {status === "loading" && <Loader2 className="w-5 h-5 animate-spin text-green-500 flex-shrink-0 mt-1" />}
        {status === "done" && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />}
      </div>
      <div className="p-6">
        {status === "loading" && (
          <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Generating with AI…</span>
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-3 py-4">
            <p className="text-red-600 text-sm flex-1">{error}</p>
            <button onClick={onRetry} className="text-xs font-bold text-red-600 underline whitespace-nowrap">Retry</button>
          </div>
        )}
        {status === "done" && children}
      </div>
    </div>
  );
}

function SchemaSection({ ctx, unlocked }: { ctx: FixContext; unlocked: boolean }) {
  const [status, setStatus] = useState<SectionStatus>("idle");
  const [data, setData] = useState<SchemaData | null>(null);
  const [error, setError] = useState("");
  const { copiedKey, copy } = useCopyButton();
  const [guideOpen, setGuideOpen] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    fetch("/api/geoboost/fix/schema", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) })
      .then(r => r.json() as Promise<SchemaData & { error?: string }>)
      .then(d => { if (d.error) { setError(d.error); setStatus("error"); } else { setData(d); setStatus("done"); } })
      .catch(() => { setError("Generation failed. Please retry."); setStatus("error"); });
  }, [ctx]);

  useEffect(() => { if (unlocked) load(); }, [unlocked]);

  return (
    <SectionShell icon={<Globe className="w-5 h-5 text-blue-600" />} title="Tell AI What Your Business Is"
      subtitle="This is hidden code that goes on your website. It tells AI assistants your business name, location, hours, and category in a language they understand perfectly. Copy this and give it to your web developer, or paste it yourself."
      status={status} error={error} onRetry={load}>
      {data && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <CopyBtn text={data.schema} label="Copy Schema" copyKey="schema" activeCopyKey={copiedKey} onCopy={copy} />
          </div>
          <pre className="bg-[#0f172a] text-green-300 rounded-xl p-5 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
            {data.schema}
          </pre>
          <button onClick={() => setGuideOpen(!guideOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            {guideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            How to add this to your website
          </button>
          {guideOpen && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3 text-sm text-slate-700">
              <p className="font-bold text-slate-900">Step-by-step instructions:</p>
              <div className="space-y-2">
                {[
                  { platform: "WordPress", steps: "Go to Appearance → Theme Editor → header.php, or use a plugin like Insert Headers and Footers. Paste just before </head>." },
                  { platform: "Shopify", steps: "Go to Online Store → Themes → Edit Code → Layout → theme.liquid. Paste just before </head>." },
                  { platform: "Webflow", steps: "Go to Project Settings → Custom Code → Head Code. Paste the script there and publish." },
                ].map(({ platform, steps }) => (
                  <div key={platform}>
                    <span className="font-semibold text-slate-800">{platform}:</span> {steps}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionShell>
  );
}

function GBPSection({ ctx, unlocked }: { ctx: FixContext; unlocked: boolean }) {
  const [status, setStatus] = useState<SectionStatus>("idle");
  const [data, setData] = useState<GBPData | null>(null);
  const [error, setError] = useState("");
  const { copiedKey, copy } = useCopyButton();
  const [guideOpen, setGuideOpen] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    fetch("/api/geoboost/fix/gbp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) })
      .then(r => r.json() as Promise<GBPData & { error?: string }>)
      .then(d => { if (d.error) { setError(d.error); setStatus("error"); } else { setData(d); setStatus("done"); } })
      .catch(() => { setError("Generation failed. Please retry."); setStatus("error"); });
  }, [ctx]);

  useEffect(() => { if (unlocked) load(); }, [unlocked]);

  return (
    <SectionShell icon={<BarChart2 className="w-5 h-5 text-orange-500" />} title="Your Google Business Listing"
      subtitle="These are ready-to-use descriptions and posts for your free Google Business listing — the one that shows up on Google Maps. Keeping this updated helps AI recommend you for local searches."
      status={status} error={error} onRetry={load}>
      {data && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 text-sm">Business Description</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{data.description.length}/750 chars</span>
                <CopyBtn text={data.description} label="Copy" copyKey="gbp-desc" activeCopyKey={copiedKey} onCopy={copy} />
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm text-slate-800 leading-relaxed">{data.description}</div>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-3">5 Ready-to-Publish GBP Posts</h3>
            <div className="space-y-3">
              {data.posts.map((post, i) => (
                <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-500 mb-1 block">Week {i + 1}</span>
                      <p className="text-sm text-slate-800 leading-relaxed">{post}</p>
                    </div>
                    <CopyBtn text={post} label="Copy" copyKey={`post-${i}`} activeCopyKey={copiedKey} onCopy={copy} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-3">3 Q&A Pairs for GBP Q&A Section</h3>
            <div className="space-y-3">
              {data.qa.map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">Q: {item.q}</p>
                      <p className="text-sm text-slate-700">A: {item.a}</p>
                    </div>
                    <CopyBtn text={`Q: ${item.q}\nA: ${item.a}`} label="Copy" copyKey={`qa-${i}`} activeCopyKey={copiedKey} onCopy={copy} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setGuideOpen(!guideOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            {guideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            How to update your Google Business Profile
          </button>
          {guideOpen && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-sm text-slate-700 space-y-2">
              <p><span className="font-semibold">Description:</span> Go to business.google.com → Edit Profile → Business information → Description. Paste and save.</p>
              <p><span className="font-semibold">Posts:</span> In your GBP dashboard, click "Add update" → Write post → Paste content → Add a photo → Publish.</p>
              <p><span className="font-semibold">Q&A:</span> Search your business on Google → scroll to Q&A section → "Ask a question" → paste each question. Then answer using your GBP account.</p>
            </div>
          )}
        </div>
      )}
    </SectionShell>
  );
}

function SocialSection({ ctx, unlocked }: { ctx: FixContext; unlocked: boolean }) {
  const [status, setStatus] = useState<SectionStatus>("idle");
  const [data, setData] = useState<SocialData | null>(null);
  const [error, setError] = useState("");
  const { copiedKey, copy } = useCopyButton();

  const load = useCallback(() => {
    setStatus("loading");
    fetch("/api/geoboost/fix/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) })
      .then(r => r.json() as Promise<SocialData & { error?: string }>)
      .then(d => { if (d.error) { setError(d.error); setStatus("error"); } else { setData(d); setStatus("done"); } })
      .catch(() => { setError("Generation failed. Please retry."); setStatus("error"); });
  }, [ctx]);

  useEffect(() => { if (unlocked) load(); }, [unlocked]);

  const platforms = data ? [
    { name: "Twitter / X", key: "twitter", text: data.twitter, limit: 160, color: "bg-sky-50 border-sky-200" },
    { name: "LinkedIn Company Page", key: "linkedin", text: data.linkedin, limit: 2000, color: "bg-blue-50 border-blue-200" },
    { name: "Instagram", key: "instagram", text: data.instagram, limit: 150, color: "bg-purple-50 border-purple-200" },
    { name: "Facebook", key: "facebook", text: data.facebook, limit: 255, color: "bg-indigo-50 border-indigo-200" },
  ] : [];

  return (
    <SectionShell icon={<Zap className="w-5 h-5 text-purple-500" />} title="Your Social Media Descriptions"
      subtitle="AI assistants also read your social media profiles. These optimized descriptions help AI understand what your business does and where you are — ready to copy and paste."
      status={status} error={error} onRetry={load}>
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map(({ name, key, text, limit, color }) => (
            <div key={key} className={`rounded-xl border p-4 ${color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 text-sm">{name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${text.length > limit ? "text-red-500" : "text-slate-400"}`}>
                    {text.length}/{limit}
                  </span>
                  <CopyBtn text={text} label="Copy" copyKey={key} activeCopyKey={copiedKey} onCopy={copy} />
                </div>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{text}</p>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function BriefSection({ ctx, unlocked }: { ctx: FixContext; unlocked: boolean }) {
  const [status, setStatus] = useState<SectionStatus>("idle");
  const [data, setData] = useState<BriefData | null>(null);
  const [error, setError] = useState("");
  const { copiedKey, copy } = useCopyButton();
  const [emailPanel, setEmailPanel] = useState(false);
  const [emailAddr, setEmailAddr] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const load = useCallback(() => {
    setStatus("loading");
    fetch("/api/geoboost/fix/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) })
      .then(r => r.json() as Promise<BriefData & { error?: string }>)
      .then(d => { if (d.error) { setError(d.error); setStatus("error"); } else { setData(d); setStatus("done"); } })
      .catch(() => { setError("Generation failed. Please retry."); setStatus("error"); });
  }, [ctx]);

  useEffect(() => { if (unlocked) load(); }, [unlocked]);

  const download = () => {
    if (!data) return;
    const lines: string[] = [
      "GEOboost Content Fix Brief", "=".repeat(40), "",
      "EXECUTIVE SUMMARY", "-".repeat(20), data.executiveSummary, "",
      "PRIORITY ORDER", "-".repeat(20), ...data.priorityOrder.map((p, i) => `${i + 1}. ${p}`), "",
      "WEAKNESS FIXES", "-".repeat(20),
      ...data.weaknessFixes.flatMap(f => [
        `Issue: ${f.weakness}`, `Before: ${f.before}`, `After: ${f.after}`, `Why: ${f.recommendation}`, "",
      ]),
      "CONTENT ADDITIONS", "-".repeat(20), ...data.contentAdditions.map((p, i) => `${i + 1}. ${p}\n`), "",
      "FAQ SECTION", "-".repeat(20), ...data.faqSection.flatMap(fq => [`Q: ${fq.q}`, `A: ${fq.a}`, ""]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "geoboost-fix-brief.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const sendEmail = async () => {
    if (!emailAddr.trim() || !data) return;
    setEmailStatus("sending");
    const body = `Your GEOboost Content Fix Brief for ${ctx.url}\n\n` +
      `Current Score: ${ctx.aiVisibilityScore}/100\n\n` +
      `EXECUTIVE SUMMARY\n${data.executiveSummary}\n\n` +
      `PRIORITY ORDER\n${data.priorityOrder.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n` +
      `WEAKNESS FIXES\n${data.weaknessFixes.map(f => `Issue: ${f.weakness}\nBefore: ${f.before}\nAfter: ${f.after}\n`).join("\n")}\n\n` +
      `FAQ SECTION\n${data.faqSection.map(fq => `Q: ${fq.q}\nA: ${fq.a}`).join("\n\n")}`;
    try {
      const res = await fetch("/api/geoboost/send-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddr.trim(), url: ctx.url, body }),
      });
      if (res.ok) { setEmailStatus("sent"); }
      else { setEmailStatus("error"); }
    } catch { setEmailStatus("error"); }
  };

  return (
    <SectionShell icon={<FileText className="w-5 h-5 text-green-600" />} title="Your Website Fix Guide"
      subtitle="A plain-English guide showing exactly what to change on your website, with the new content already written for you. No writing required — just copy and paste."
      status={status} error={error} onRetry={load}>
      {data && (
        <div className="space-y-6">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button onClick={download}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors">
              <Download className="w-4 h-4" />
              Download as .txt
            </button>
            <button onClick={() => setEmailPanel(!emailPanel)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors">
              <Mail className="w-4 h-4" />
              Send to Email
            </button>
          </div>
          {emailPanel && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              {emailStatus === "sent" ? (
                <p className="text-green-700 text-sm font-medium flex items-center gap-2"><Check className="w-4 h-4" />Brief sent to {emailAddr}</p>
              ) : (
                <div className="flex gap-2">
                  <input type="email" value={emailAddr} onChange={e => setEmailAddr(e.target.value)} onKeyDown={e => e.key === "Enter" && sendEmail()}
                    placeholder="your@email.com"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <button onClick={sendEmail} disabled={emailStatus === "sending" || !emailAddr.trim()}
                    style={{ backgroundColor: emailStatus === "sending" || !emailAddr.trim() ? undefined : "#22c55e" }}
                    className="px-4 py-2 text-white text-sm font-bold rounded-lg disabled:bg-slate-300 whitespace-nowrap">
                    {emailStatus === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                  </button>
                  <button onClick={() => setEmailPanel(false)} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          )}

          {/* Executive Summary */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <h3 className="font-bold text-green-900 mb-2 text-sm">Executive Summary</h3>
            <p className="text-green-800 text-sm leading-relaxed">{data.executiveSummary}</p>
          </div>

          {/* Priority order */}
          <div>
            <h3 className="font-bold text-slate-900 mb-3 text-sm">Priority Order — Fix These First</h3>
            <ol className="space-y-2">
              {data.priorityOrder.map((item, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <p className="text-sm text-slate-700 pt-0.5">{item}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Weakness fixes */}
          <div>
            <h3 className="font-bold text-slate-900 mb-3 text-sm">Specific Rewrites for Each Weakness</h3>
            <div className="space-y-4">
              {data.weaknessFixes.map((fix, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-red-700">Issue {i + 1}: {fix.weakness}</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-1">BEFORE</p>
                      <p className="text-sm text-slate-600 bg-red-50 rounded-lg p-3 leading-relaxed">{fix.before}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-slate-500">AFTER</p>
                        <CopyBtn text={fix.after} label="Copy" copyKey={`fix-${i}`} activeCopyKey={copiedKey} onCopy={copy} />
                      </div>
                      <p className="text-sm text-slate-800 bg-green-50 rounded-lg p-3 leading-relaxed">{fix.after}</p>
                    </div>
                  </div>
                  <div className="px-4 pb-3">
                    <p className="text-xs text-slate-500 italic">{fix.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content additions */}
          <div>
            <h3 className="font-bold text-slate-900 mb-3 text-sm">5 Paragraphs to Add to Your Website</h3>
            <div className="space-y-3">
              {data.contentAdditions.map((para, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-500 block mb-1">Paragraph {i + 1}</span>
                      <p className="text-sm text-slate-800 leading-relaxed">{para}</p>
                    </div>
                    <CopyBtn text={para} label="Copy" copyKey={`para-${i}`} activeCopyKey={copiedKey} onCopy={copy} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h3 className="font-bold text-slate-900 mb-3 text-sm">FAQ Section to Add to Your Website</h3>
            <div className="space-y-3">
              {data.faqSection.map((item, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-semibold text-slate-900">Q: {item.q}</p>
                      <p className="text-sm text-slate-700">A: {item.a}</p>
                    </div>
                    <CopyBtn text={`Q: ${item.q}\nA: ${item.a}`} label="Copy" copyKey={`faq-${i}`} activeCopyKey={copiedKey} onCopy={copy} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SectionShell>
  );
}

export default function FixPage() {
  const [, navigate] = useLocation();
  const [ctx, setCtx] = useState<FixContext | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("geoboost_audit_result");
    const storedCat = sessionStorage.getItem("geoboost_audit_category");
    const storedQ = sessionStorage.getItem("geoboost_audit_queries");
    const storedLoc = sessionStorage.getItem("geoboost_audit_location");
    if (!stored) { navigate("/"); return; }
    try {
      const r = JSON.parse(stored) as {
        scrapedUrl?: string; aiVisibilityScore?: number;
        semanticDensityScore?: number; structuralFormattingScore?: number; weaknesses?: string[];
        bingIndexed?: boolean; blockedBots?: string[];
      };
      const q = storedQ ? (JSON.parse(storedQ) as string[]) : [];
      setCtx({
        url: r.scrapedUrl ?? "",
        category: storedCat ?? "",
        queries: q,
        weaknesses: r.weaknesses ?? [],
        location: storedLoc ?? "",
        aiVisibilityScore: r.aiVisibilityScore ?? 0,
        semanticDensityScore: r.semanticDensityScore ?? 0,
        structuralFormattingScore: r.structuralFormattingScore ?? 0,
        bingIndexed: r.bingIndexed,
        blockedBots: r.blockedBots,
      });
    } catch { navigate("/"); }

    const isUnlocked = sessionStorage.getItem("fix_unlocked") === "true";
    setUnlocked(isUnlocked);
  }, [navigate]);

  const startCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-fix-checkout", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) { window.location.href = data.url; }
      else { alert(data.error ?? "Could not start checkout."); setCheckoutLoading(false); }
    } catch { alert("Network error. Please try again."); setCheckoutLoading(false); }
  };

  const scoreColor = (s: number) => s >= 70 ? "text-green-600" : s >= 40 ? "text-amber-600" : "text-red-600";

  if (!ctx) return null;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          Your Complete AI Visibility Fix Package
        </h1>
        <p className="text-slate-500 text-lg">
          Everything you need to get cited by ChatGPT, Claude, and Perplexity — ready to use in minutes.
        </p>
        {ctx && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-500">Audit for <strong className="text-slate-700">{ctx.url}</strong></span>
            <span className={`text-sm font-extrabold ${scoreColor(ctx.aiVisibilityScore)}`}>
              Score: {ctx.aiVisibilityScore}/100
            </span>
          </div>
        )}
      </div>

      {/* Foundation Check — Section 0 */}
      {ctx.bingIndexed !== undefined && (
        <div className={`mb-8 rounded-2xl overflow-hidden border-2 ${ctx.bingIndexed ? "border-green-300" : "border-red-400"}`}>
          <div className={`px-6 py-4 flex items-center gap-3 ${ctx.bingIndexed ? "bg-green-600" : "bg-red-600"}`}>
            <span className="text-2xl">{ctx.bingIndexed ? "✅" : "🚨"}</span>
            <div>
              <h2 className="text-white font-extrabold text-base leading-tight">
                {ctx.bingIndexed ? "Step 0 — Foundation: ChatGPT Can Find You" : "Step 0 — Do This First: ChatGPT Cannot Find You"}
              </h2>
              <p className={`text-sm mt-0.5 ${ctx.bingIndexed ? "text-green-100" : "text-red-100"}`}>
                {ctx.bingIndexed ? "Your site is indexed in Bing — the directory ChatGPT uses" : "This must be fixed before any content optimization will help"}
              </p>
            </div>
          </div>
          <div className={`px-6 py-5 ${ctx.bingIndexed ? "bg-green-50" : "bg-red-50"}`}>
            {ctx.bingIndexed ? (
              <p className="text-green-900 text-sm leading-relaxed">
                <strong>Good news:</strong> Your website appears in Bing's index, so ChatGPT is able to find and recommend your business. Now the content fixes below will make a real difference.
              </p>
            ) : (
              <>
                <p className="text-red-900 text-sm leading-relaxed mb-4">
                  <strong>ChatGPT uses Bing to find businesses to recommend.</strong> Your website does not appear in Bing's index — meaning all the content optimization in the world will not help until this is fixed. The good news: it takes 10 minutes and is completely free.
                </p>
                <div className="space-y-3">
                  {[
                    { step: 1, text: "Go to bing.com/webmasters and sign in with a Microsoft account (free)." },
                    { step: 2, text: `Add your website: ${ctx.url}` },
                    { step: 3, text: "Download your sitemap. A sitemap lists every page on your site so search engines can find them. WordPress users: install Yoast SEO and your sitemap is at yoursite.com/sitemap.xml." },
                    { step: 4, text: "Submit your sitemap in Bing Webmaster Tools under 'Sitemaps'." },
                    { step: 5, text: "Wait 48–72 hours for Bing to crawl your site." },
                    { step: 6, text: "Run a new GEOboost audit — your score will update automatically." },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
                      <p className="text-sm text-red-900 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Locked banner */}
      {!unlocked && (
        <div className="mb-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="font-extrabold text-lg">Premium Fix Package</p>
                <p className="text-slate-400 text-sm">One-time payment — yours to keep forever</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { icon: "🔧", label: "Business Info Code" },
                { icon: "📍", label: "Google Business Listing" },
                { icon: "📱", label: "Social Descriptions" },
                { icon: "📄", label: "Website Fix Guide" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm font-semibold">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                onClick={startCheckout}
                disabled={checkoutLoading}
                style={{ backgroundColor: checkoutLoading ? undefined : "#22c55e" }}
                className="flex items-center gap-2 px-8 py-3.5 text-white font-extrabold text-lg rounded-xl hover:opacity-90 transition-opacity disabled:bg-slate-500"
              >
                {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                {checkoutLoading ? "Redirecting…" : "Unlock Fix Package — $49"}
              </button>
              <p className="text-slate-400 text-sm">Or included in <Link href="/upgrade"><span className="text-green-400 underline cursor-pointer">Pro plan</span></Link></p>
            </div>
          </div>
        </div>
      )}

      {/* Sections — all load in parallel */}
      {unlocked && ctx && (
        <div className="space-y-6">
          <SchemaSection ctx={ctx} unlocked={unlocked} />
          <GBPSection ctx={ctx} unlocked={unlocked} />
          <SocialSection ctx={ctx} unlocked={unlocked} />
          <BriefSection ctx={ctx} unlocked={unlocked} />
        </div>
      )}

      {/* Preview (locked) */}
      {!unlocked && (
        <div className="space-y-4">
          {[
            { icon: <Globe className="w-5 h-5 text-blue-600" />, title: "Tell AI What Your Business Is", locked: true },
            { icon: <BarChart2 className="w-5 h-5 text-orange-500" />, title: "Your Google Business Listing", locked: true },
            { icon: <Zap className="w-5 h-5 text-purple-500" />, title: "Your Social Media Descriptions", locked: true },
            { icon: <FileText className="w-5 h-5 text-green-600" />, title: "Your Website Fix Guide", locked: true },
          ].map(({ icon, title }) => (
            <div key={title} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden opacity-60 select-none">
              <div className="px-6 py-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">{icon}</div>
                <div className="flex-1">
                  <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
                </div>
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="h-24 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
                <span className="text-slate-400 text-sm font-medium">Unlock to generate</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
