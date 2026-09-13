import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRunAudit } from "@workspace/api-client-react";
import { ShieldAlert, Crosshair, Search, Loader2, Sparkles, MapPin, LocateFixed } from "lucide-react";
import SimulatorSection from "@/components/SimulatorSection";
import { trackEvent } from "@/lib/track-event";

// ─── Query suggestions per category ─────────────────────────────────────────
export const QUERY_SUGGESTIONS: Record<string, string[]> = {
  "Coffee Shop / Café": [
    "best coffee shops in [city]",
    "coffee shops with WiFi near me",
    "best espresso in [city]",
    "best brunch spots near me",
    "specialty coffee roasters in [city]",
    "where to work from a cafe in [city]",
  ],
  "Restaurant": [
    "best restaurants in [city]",
    "best brunch spots near me",
    "top-rated dining in [city]",
    "restaurants with outdoor seating near me",
    "best date night restaurants in [city]",
    "family-friendly restaurants near me",
  ],
  "Bakery": [
    "best bakery in [city]",
    "fresh pastries near me",
    "custom cakes in [city]",
    "best sourdough bread near me",
    "wedding cake bakeries in [city]",
  ],
  "Bar / Brewery": [
    "best craft beer bars in [city]",
    "local breweries near me",
    "best happy hour in [city]",
    "rooftop bars in [city]",
    "live music bars near me",
  ],
  "Dental Practice": [
    "best dentist near me",
    "family dentist in [city]",
    "teeth whitening in [city]",
    "emergency dental care near me",
    "cosmetic dentist in [city]",
  ],
  "Medical / Healthcare": [
    "best doctors near me",
    "urgent care clinic in [city]",
    "physical therapy in [city]",
    "mental health therapist near me",
    "primary care physician accepting new patients in [city]",
  ],
  "Law Firm": [
    "best personal injury lawyer in [city]",
    "employment attorney near me",
    "divorce lawyer in [city]",
    "criminal defense attorney near me",
    "estate planning lawyer in [city]",
  ],
  "Home Services": [
    "best plumber near me",
    "HVAC repair in [city]",
    "licensed electrician near me",
    "roof replacement in [city]",
    "lawn care services near me",
  ],
  "Real Estate": [
    "best real estate agent in [city]",
    "homes for sale in [city]",
    "top realtors near me",
    "how to buy a house in [city]",
    "property management company in [city]",
  ],
  "Hotel / Hospitality": [
    "best hotels in [city]",
    "boutique hotels near me",
    "hotel with pool in [city]",
    "romantic getaway near [city]",
    "pet-friendly hotels in [city]",
  ],
  "Fitness / Wellness": [
    "best gyms near me",
    "yoga studios in [city]",
    "personal trainer in [city]",
    "CrossFit gym near me",
    "pilates classes in [city]",
  ],
  "Salon / Beauty": [
    "best hair salon near me",
    "hair colorist in [city]",
    "day spa in [city]",
    "nail salon near me",
    "best barbershop in [city]",
  ],
  "Marketing Agency": [
    "best digital marketing agency in [city]",
    "top SEO agencies near me",
    "social media marketing company in [city]",
    "PPC advertising agency near me",
    "content marketing agency for small business",
  ],
  "Consulting": [
    "business consultant near me",
    "management consulting firm in [city]",
    "startup advisor in [city]",
    "strategy consultant for small business",
    "HR consulting services near me",
  ],
  "Accounting / Finance": [
    "best CPA near me",
    "small business accountant in [city]",
    "tax preparation services near me",
    "bookkeeping services in [city]",
    "financial advisor in [city]",
  ],
  "B2B SaaS / Tech": [
    "best CRM software for small business",
    "project management tool for remote teams",
    "HR software for startups",
    "invoicing software for freelancers",
    "best marketing automation tool",
  ],
  "Retail / E-Commerce": [
    "where to buy [product] near me",
    "best [product] stores in [city]",
    "online store for [product]",
    "local boutique in [city]",
    "best deals on [product] near me",
  ],
  "Auto Services": [
    "best auto repair near me",
    "oil change near me",
    "car dealership in [city]",
    "brake repair shop near me",
    "transmission repair in [city]",
  ],
  "Veterinary / Pet Services": [
    "best vet near me",
    "emergency animal hospital in [city]",
    "dog grooming near me",
    "cat veterinarian in [city]",
    "pet boarding near me",
  ],
  "Cleaning Services": [
    "house cleaning service near me",
    "commercial cleaning company in [city]",
    "move-out cleaning service near me",
    "office cleaning in [city]",
    "deep cleaning service near me",
  ],
  "Photography / Videography": [
    "wedding photographer in [city]",
    "portrait photographer near me",
    "real estate photography in [city]",
    "corporate videographer near me",
    "newborn photographer in [city]",
  ],
  "Moving / Logistics": [
    "best moving company in [city]",
    "local movers near me",
    "long distance moving company",
    "storage units near me",
    "packing services near me",
  ],
  "Insurance": [
    "best auto insurance in [city]",
    "health insurance broker near me",
    "homeowners insurance in [city]",
    "life insurance agent near me",
    "small business insurance in [city]",
  ],
};

function getSuggestions(category: string, city: string): string[] {
  const suggestions = QUERY_SUGGESTIONS[category] || [];
  return suggestions.map(s => city ? s.replace(/\[city\]/gi, city) : s.replace(/ in \[city\]| near \[city\]/gi, " near me"));
}

// ─── Client-side URL keyword detection (instant, before server responds) ────
const QUICK_RULES: { patterns: RegExp[]; label: string }[] = [
  { patterns: [/coffee|cafe|caf[eé]|espresso|brew|roast/], label: "Coffee Shop / Café" },
  { patterns: [/restaurant|bistro|grill|kitchen|burger|pizza|sushi|taco|dining/], label: "Restaurant" },
  { patterns: [/bakery|pastry|cake|bread/], label: "Bakery" },
  { patterns: [/brewery|beer|taproom|winery|distill/], label: "Bar / Brewery" },
  { patterns: [/dental|dentist|orthodont/], label: "Dental Practice" },
  { patterns: [/medical|doctor|clinic|therapy|therapist|chiro|physio/], label: "Medical / Healthcare" },
  { patterns: [/attorney|lawyer|lawfirm|legal/], label: "Law Firm" },
  { patterns: [/plumb|hvac|electric|roofing|landscap|pest|handyman|contractor/], label: "Home Services" },
  { patterns: [/realestate|realtor|realty|mortgage/], label: "Real Estate" },
  { patterns: [/hotel|motel|resort|lodge|hostel/], label: "Hotel / Hospitality" },
  { patterns: [/gym|fitness|yoga|crossfit|pilates/], label: "Fitness / Wellness" },
  { patterns: [/salon|hair|barbershop|nail|spa|beauty/], label: "Salon / Beauty" },
  { patterns: [/agency|marketing|seo|advertising|creative/], label: "Marketing Agency" },
  { patterns: [/consult|coach|advisor/], label: "Consulting" },
  { patterns: [/accounting|cpa|bookkeep|tax/], label: "Accounting / Finance" },
  { patterns: [/saas|software|platform|tech|startup/], label: "B2B SaaS / Tech" },
  { patterns: [/shop|store|retail|boutique|ecommerce/], label: "Retail / E-Commerce" },
  { patterns: [/auto|mechanic|dealership|tire|repair/], label: "Auto Services" },
  { patterns: [/vet|veterinary|pet|kennel/], label: "Veterinary / Pet Services" },
  { patterns: [/clean|maid|janitorial/], label: "Cleaning Services" },
  { patterns: [/photo|photographer|videograph/], label: "Photography / Videography" },
  { patterns: [/moving|mover|storage|logistic/], label: "Moving / Logistics" },
  { patterns: [/insur|insurance/], label: "Insurance" },
];

function quickDetect(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    const text = (u.hostname + " " + u.pathname)
      .replace(/www\.|\.com|\.net|\.org|\.io|\.co|[-_./]/g, " ")
      .toLowerCase();
    for (const rule of QUICK_RULES) {
      if (rule.patterns.some(p => p.test(text))) return rule.label;
    }
  } catch { /* ignore */ }
  return null;
}

export default function Home() {
  useEffect(() => {
    document.title = "Show me on AI";
  }, []);
  const [, navigate] = useLocation();
  const runAudit = useRunAudit();
  const { user, isSignedIn } = useUser();

  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [categorySuggestion, setCategorySuggestion] = useState<{ label: string; source: "quick" | "server" } | null>(null);
  const [detectingCategory, setDetectingCategory] = useState(false);
  const [aiQuerySuggestions, setAiQuerySuggestions] = useState<string[]>([]);

  const [location, setLocation] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [query1, setQuery1] = useState("");
  const [query2, setQuery2] = useState("");
  const [query3, setQuery3] = useState("");

  // Inline validation
  const [touched, setTouched] = useState({ url: false, category: false, query1: false });

  // Undo toast for auto-fill
  const [undoSnapshot, setUndoSnapshot] = useState<[string, string, string] | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Submit error state (rate limit, generic, etc.)
  const [submitError, setSubmitError] = useState<"free_limit_reached" | "site_unreachable" | "invalid_input" | "generic" | null>(null);
  // Track that form_start has only fired once
  const hasTrackedStart = useRef(false);

  // For signed-in users we still pass name/email to the audit API so the welcome email fires
  const clerkName = isSignedIn && user ? (user.fullName || user.firstName || "") : "";
  const clerkEmail = isSignedIn && user ? (user.emailAddresses[0]?.emailAddress || "") : "";

  const urlDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extract city from location string for personalizing query chips
  const city = location.split(",")[0].trim();
  const activeCategory = category || categorySuggestion?.label || "";
  // Prefer AI-generated suggestions from server; fall back to static list
  const querySuggestions = aiQuerySuggestions.length > 0
    ? aiQuerySuggestions
    : activeCategory ? getSuggestions(activeCategory, city) : [];

  useEffect(() => {
    if (urlDebounce.current) clearTimeout(urlDebounce.current);
    if (!url) { setCategorySuggestion(null); setAiQuerySuggestions([]); return; }

    // Instant client-side guess
    const quick = quickDetect(url);
    if (quick) setCategorySuggestion({ label: quick, source: "quick" });

    // Server-side refinement after 500ms — detects category and returns AI query suggestions
    urlDebounce.current = setTimeout(async () => {
      try {
        const normalized = url.startsWith("http") ? url : `https://${url}`;
        new URL(normalized); // validate before fetching
        setDetectingCategory(true);
        const res = await fetch("/api/geoboost/detect-category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: normalized }),
        });
        if (res.ok) {
          const data = await res.json() as { category: string | null; confidence: string; queries?: string[] };
          if (data.category) {
            setCategorySuggestion({ label: data.category, source: "server" });
          }
          if (data.queries && data.queries.length > 0) {
            setAiQuerySuggestions(data.queries);
          }
        }
      } catch { /* ignore */ } finally {
        setDetectingCategory(false);
      }
    }, 500);

    return () => { if (urlDebounce.current) clearTimeout(urlDebounce.current); };
  }, [url]);

  // Proactively fetch AI query suggestions when the user types/selects a category
  // (if url is already populated and server hasn't already returned suggestions)
  useEffect(() => {
    if (categoryDebounce.current) clearTimeout(categoryDebounce.current);
    if (!category || !url || aiQuerySuggestions.length > 0) return;

    categoryDebounce.current = setTimeout(async () => {
      try {
        const normalized = url.startsWith("http") ? url : `https://${url}`;
        new URL(normalized);
        const res = await fetch("/api/geoboost/detect-category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: normalized }),
        });
        if (res.ok) {
          const data = await res.json() as { category: string | null; confidence: string; queries?: string[] };
          if (data.queries && data.queries.length > 0) {
            setAiQuerySuggestions(data.queries);
          }
        }
      } catch { /* ignore */ }
    }, 500);

    return () => { if (categoryDebounce.current) clearTimeout(categoryDebounce.current); };
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  const acceptSuggestion = () => {
    if (categorySuggestion) {
      setCategory(categorySuggestion.label);
      setCategorySuggestion(null);
    }
  };

  const fillQuery = (suggestion: string) => {
    if (!query1) { setQuery1(suggestion); return; }
    if (!query2) { setQuery2(suggestion); return; }
    if (!query3) { setQuery3(suggestion); return; }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json() as { address: Record<string, string> };
          const city = data.address.city || data.address.town || data.address.village || data.address.county || "";
          const state = data.address.state_code || data.address.state || "";
          setLocation(city && state ? `${city}, ${state}` : city || state);
        } catch { /* ignore */ } finally {
          setDetectingLocation(false);
        }
      },
      () => setDetectingLocation(false)
    );
  };

  // Send only the queries the user actually filled in (1–3 non-empty strings).
  // Empty optional fields are stripped so the backend never sees blank entries.
  const getQueriesForSubmit = (): string[] =>
    [query1, query2, query3].filter(q => q.trim().length > 0);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    // Mark all required fields as touched to show inline errors
    setTouched({ url: true, category: true, query1: true });
    if (!url || !category || !query1) return;
    const queries = getQueriesForSubmit();

    // Analytics: form submitted
    const domain = (() => {
      try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, ""); }
      catch { return url; }
    })();
    trackEvent("form_submit", { domain, category, has_location: !!location });

    runAudit.mutate(
      {
        data: {
          url,
          category,
          queries,
          location: location || undefined,
          // Pass Clerk details for signed-in users so the welcome email fires immediately;
          // anonymous users are captured by the email gate on the results page instead.
          name: clerkName || undefined,
          email: clerkEmail || undefined,
        },
      },
      {
        onSuccess: (result) => {
          sessionStorage.setItem("geoboost_audit_result", JSON.stringify(result));
          sessionStorage.setItem("geoboost_audit_queries", JSON.stringify(queries));
          sessionStorage.setItem("geoboost_audit_category", category);
          navigate("/results");
        },
        onError: (error: unknown) => {
          const apiErr = error as { status?: number; data?: { code?: string; error?: string } };
          if (apiErr.status === 429 || apiErr.data?.error === "free_limit_reached") {
            setSubmitError("free_limit_reached");
          } else if (apiErr.data?.code === "SITE_UNREACHABLE") {
            setSubmitError("site_unreachable");
          } else if (apiErr.data?.code === "INVALID_INPUT") {
            setSubmitError("invalid_input");
          } else {
            setSubmitError("generic");
          }
        },
      }
    );
  };

  const showSuggestion = categorySuggestion && categorySuggestion.label !== category;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 md:px-8">
      <div className="max-w-3xl text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold tracking-wide mb-6 border border-blue-100">
          <ShieldAlert className="w-4 h-4" /> AI Vulnerability Scanner
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
          AI is recommending your competitors.<br />
          <span className="text-slate-500">Find out why.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
          Find out if ChatGPT, Claude, and Google AI are recommending your business — or sending customers to your competitors instead.
        </p>
        <p className="text-sm text-slate-600 mt-3">No tech knowledge needed. Results in 60 seconds.</p>
      </div>

      <SimulatorSection />

      <div className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden mt-16">
        <div className="p-8">
          {runAudit.isPending ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Analyzing {url}...</h3>
              <p className="text-slate-500 max-w-sm">
                Checking how often AI recommends your business versus your competitors. This takes about 30–60 seconds.
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-8 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
            </div>
          ) : (
            <form onSubmit={handleNext} className="space-y-5">
              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="url" className="text-slate-700 font-semibold">Business Website URL</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <Input
                    id="url"
                    placeholder="https://yourbusiness.com"
                    className={`pl-10 h-12 bg-slate-50 focus-visible:ring-blue-500 text-lg ${touched.url && !url ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                    value={url}
                    onChange={e => {
                      setUrl(e.target.value);
                      if (touched.url) setTouched(t => ({ ...t, url: true }));
                      if (!hasTrackedStart.current && e.target.value) {
                        hasTrackedStart.current = true;
                        trackEvent("form_start");
                      }
                    }}
                    onBlur={() => setTouched(t => ({ ...t, url: true }))}
                  />
                </div>
                {touched.url && !url && (
                  <p className="text-xs text-red-600 font-medium" role="alert">Please enter your business website URL.</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-slate-700 font-semibold">Business Category</Label>
                <div className="relative">
                  <Input
                    id="category"
                    placeholder="e.g. B2B SaaS, Boutique Coffee Roaster"
                    className={`h-12 bg-slate-50 focus-visible:ring-blue-500 pr-8 ${touched.category && !category ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                    value={category}
                    onChange={e => { setCategory(e.target.value); setCategorySuggestion(null); }}
                    onBlur={() => setTouched(t => ({ ...t, category: true }))}
                  />
                  {detectingCategory && (
                    <Loader2 className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 animate-spin" />
                  )}
                </div>
                {touched.category && !category && (
                  <p className="text-xs text-red-600 font-medium" role="alert">Please enter your business category.</p>
                )}
                {showSuggestion && (
                  <button
                    type="button"
                    onClick={acceptSuggestion}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    {categorySuggestion?.source === "server" ? "Detected" : "Suggested"}: {categorySuggestion?.label} — tap to use
                  </button>
                )}
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-slate-700 font-semibold">
                  Your City or Region <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input
                      id="location"
                      placeholder="e.g. Rochester, NY"
                      className="pl-10 h-12 bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    title="Detect my location"
                    aria-label="Detect my location"
                    className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                  >
                    {detectingLocation
                      ? <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                      : <LocateFixed className="w-4 h-4 text-slate-500" />}
                  </button>
                </div>
              </div>

              {/* Queries */}
              <div className="space-y-3">
                <Label id="queries-label" className="text-slate-700 font-semibold">What Do Your Customers Ask AI?</Label>
                <p className="text-xs text-slate-600">Type the questions your customers ask ChatGPT or Google when looking for a business like yours.</p>
                <div className="space-y-2">
                  {/* Query 1 — required */}
                  <div>
                    <div className="relative">
                      <Crosshair className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                      <Input
                        id="query1"
                        aria-label="First customer query (required)"
                        aria-required="true"
                        aria-describedby={touched.query1 && !query1 ? "query1-error" : undefined}
                        placeholder="Query 1"
                        className={`pl-9 bg-slate-50 ${touched.query1 && !query1 ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                        value={query1}
                        onChange={e => setQuery1(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, query1: true }))}
                      />
                    </div>
                    {touched.query1 && !query1 && (
                      <p id="query1-error" className="text-xs text-red-600 font-medium mt-1" role="alert">At least one query is required.</p>
                    )}
                  </div>
                  {/* Query 2 — optional */}
                  <div className="relative">
                    <Crosshair className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                    <Input
                      id="query2"
                      aria-label="Second customer query (optional)"
                      placeholder="Query 2 (optional)"
                      className="pl-9 bg-slate-50 border-slate-200"
                      value={query2}
                      onChange={e => setQuery2(e.target.value)}
                    />
                  </div>
                  {/* Query 3 — optional */}
                  <div className="relative">
                    <Crosshair className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                    <Input
                      id="query3"
                      aria-label="Third customer query (optional)"
                      placeholder="Query 3 (optional)"
                      className="pl-9 bg-slate-50 border-slate-200"
                      value={query3}
                      onChange={e => setQuery3(e.target.value)}
                    />
                  </div>
                </div>

                {/* Suggestion chips */}
                {querySuggestions.length > 0 && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-600 font-medium">
                        {aiQuerySuggestions.length > 0 ? "✨ AI-suggested queries — tap to add:" : "Tap to add a query:"}
                      </p>
                      {aiQuerySuggestions.length >= 1 && (!query1 || !query2 || !query3) && (
                        <button
                          type="button"
                          onClick={() => {
                            const suggestions = aiQuerySuggestions.slice(0, 3);
                            // Only fill empty slots — never overwrite text the user typed
                            const newQ1 = query1 || suggestions[0] || query1;
                            const newQ2 = query2 || suggestions[1] || query2;
                            const newQ3 = query3 || suggestions[2] || query3;
                            const changed = newQ1 !== query1 || newQ2 !== query2 || newQ3 !== query3;
                            if (!changed) return;
                            // Snapshot for undo
                            setUndoSnapshot([query1, query2, query3]);
                            setQuery1(newQ1);
                            setQuery2(newQ2);
                            setQuery3(newQ3);
                            setShowUndo(true);
                            if (undoTimer.current) clearTimeout(undoTimer.current);
                            undoTimer.current = setTimeout(() => setShowUndo(false), 5000);
                          }}
                          className="text-xs font-bold px-3 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                        >
                          Auto-fill empty slots ↑
                        </button>
                      )}
                    </div>
                    {/* Undo toast */}
                    {showUndo && undoSnapshot && (
                      <div className="flex items-center gap-3 mb-2 px-3 py-2 rounded-lg bg-slate-800 text-white text-xs">
                        <span className="flex-1">Queries filled</span>
                        <button
                          type="button"
                          onClick={() => {
                            setQuery1(undoSnapshot[0]);
                            setQuery2(undoSnapshot[1]);
                            setQuery3(undoSnapshot[2]);
                            setShowUndo(false);
                            if (undoTimer.current) clearTimeout(undoTimer.current);
                          }}
                          className="font-bold underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800 rounded"
                        >
                          Undo
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {querySuggestions.map((s, i) => {
                        const alreadyUsed = [query1, query2, query3].includes(s);
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={alreadyUsed}
                            onClick={() => fillQuery(s)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                              alreadyUsed
                                ? "bg-green-50 border-green-200 text-green-600 cursor-default"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                            }`}
                          >
                            {alreadyUsed ? "✓ " : ""}{s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold bg-[#0f172a] hover:bg-slate-800 text-white">
                  Check My AI Visibility — Free
                </Button>
                <p className="text-center text-xs text-slate-600 mt-2">
                  We'll test your site against real AI models and score it in ~60 seconds.
                </p>
                {submitError === "free_limit_reached" && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-left">
                    <p className="text-sm font-semibold text-amber-900">Free audit limit reached</p>
                    <p className="text-xs text-amber-800 mt-1">
                      You've already run a free audit for this domain this month.{" "}
                      <a href="/sign-up" className="underline font-semibold">Create a free account</a>{" "}
                      for unlimited audits.
                    </p>
                  </div>
                )}
                {submitError === "site_unreachable" && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-left">
                    <p className="text-sm font-semibold text-red-900">We couldn't reach that website</p>
                    <p className="text-xs text-red-800 mt-1">
                      The site may be blocking automated checks. Double-check the URL, or try a different one.
                    </p>
                  </div>
                )}
                {submitError === "invalid_input" && (
                  <p className="text-sm text-red-600 text-center">Please fill in at least one search query.</p>
                )}
                {submitError === "generic" && (
                  <p className="text-sm text-red-600 text-center">Something went wrong on our end — please try again in a moment.</p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Research Stat Banner */}
      <div className="w-full max-w-3xl mt-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              stat: "48%",
              desc: "of businesses cited by AI don't even rank on Google's first page",
              sub: "AI is a completely different playing field",
            },
            {
              stat: "5",
              desc: "businesses cited per AI answer on average",
              sub: "There are always open citation slots",
            },
            {
              stat: "61%",
              desc: "of AI answers use bullet-point lists",
              sub: "Structure beats length every time",
            },
          ].map(({ stat, desc, sub }) => (
            <div key={stat} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-5 text-center">
              <div className="text-4xl font-extrabold text-slate-900 mb-1">{stat}</div>
              <div className="text-sm font-semibold text-slate-700 leading-snug mb-1">{desc}</div>
              <div className="text-xs text-slate-600">{sub}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-600 mt-3">Source: Surfer SEO study of 405,576 Google AI overview searches</p>
      </div>

    </div>
  );
}
