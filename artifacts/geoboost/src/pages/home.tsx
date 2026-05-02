import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRunAudit } from "@workspace/api-client-react";
import { ShieldAlert, Crosshair, Search, Loader2, Sparkles, MapPin, LocateFixed } from "lucide-react";

// ─── Query suggestions per category ─────────────────────────────────────────
const QUERY_SUGGESTIONS: Record<string, string[]> = {
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
  const [, navigate] = useLocation();
  const runAudit = useRunAudit();

  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [categorySuggestion, setCategorySuggestion] = useState<{ label: string; source: "quick" | "server" } | null>(null);
  const [detectingCategory, setDetectingCategory] = useState(false);

  const [location, setLocation] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [query1, setQuery1] = useState("");
  const [query2, setQuery2] = useState("");
  const [query3, setQuery3] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"initial" | "email">("initial");

  const urlDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extract city from location string for personalizing query chips
  const city = location.split(",")[0].trim();
  const activeCategory = category || categorySuggestion?.label || "";
  const querySuggestions = activeCategory ? getSuggestions(activeCategory, city) : [];

  useEffect(() => {
    if (urlDebounce.current) clearTimeout(urlDebounce.current);
    if (!url) { setCategorySuggestion(null); return; }

    // Instant client-side guess
    const quick = quickDetect(url);
    if (quick) setCategorySuggestion({ label: quick, source: "quick" });

    // Server-side refinement after 800ms
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
          const data = await res.json() as { category: string | null; confidence: string };
          if (data.category) {
            setCategorySuggestion({ label: data.category, source: "server" });
          }
        }
      } catch { /* ignore */ } finally {
        setDetectingCategory(false);
      }
    }, 800);

    return () => { if (urlDebounce.current) clearTimeout(urlDebounce.current); };
  }, [url]);

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

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !category || !query1 || !query2 || !query3) return;
    setStep("email");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    runAudit.mutate(
      { data: { url, category, queries: [query1, query2, query3], location: location || undefined, name, email } },
      {
        onSuccess: (result) => {
          sessionStorage.setItem("geoboost_audit_result", JSON.stringify(result));
          sessionStorage.setItem("geoboost_audit_queries", JSON.stringify([query1, query2, query3]));
          sessionStorage.setItem("geoboost_audit_category", category);
          navigate("/results");
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
        <p className="text-sm text-slate-400 mt-3">No tech knowledge needed. Results in 60 seconds.</p>
      </div>

      <div className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
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
          ) : step === "initial" ? (
            <form onSubmit={handleNext} className="space-y-5">
              {/* URL */}
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

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-slate-700 font-semibold">Business Category</Label>
                <div className="relative">
                  <Input
                    id="category"
                    placeholder="e.g. B2B SaaS, Boutique Coffee Roaster"
                    className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 pr-8"
                    value={category}
                    onChange={e => { setCategory(e.target.value); setCategorySuggestion(null); }}
                    required
                  />
                  {detectingCategory && (
                    <Loader2 className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 animate-spin" />
                  )}
                </div>
                {showSuggestion && (
                  <button
                    type="button"
                    onClick={acceptSuggestion}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
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
                    className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    {detectingLocation
                      ? <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                      : <LocateFixed className="w-4 h-4 text-slate-500" />}
                  </button>
                </div>
              </div>

              {/* Queries */}
              <div className="space-y-3">
                <Label className="text-slate-700 font-semibold">What Do Your Customers Ask AI?</Label>
                <p className="text-xs text-slate-400">Type the questions your customers ask ChatGPT or Google when looking for a business like yours.</p>
                <div className="space-y-2">
                  {[
                    { val: query1, set: setQuery1, ph: "Query 1" },
                    { val: query2, set: setQuery2, ph: "Query 2" },
                    { val: query3, set: setQuery3, ph: "Query 3" },
                  ].map(({ val, set, ph }, i) => (
                    <div key={i} className="relative">
                      <Crosshair className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder={ph}
                        className="pl-9 bg-slate-50 border-slate-200"
                        value={val}
                        onChange={e => set(e.target.value)}
                        required
                      />
                    </div>
                  ))}
                </div>

                {/* Suggestion chips */}
                {querySuggestions.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs text-slate-400 mb-2 font-medium">Tap to add a query:</p>
                    <div className="flex flex-wrap gap-2">
                      {querySuggestions.map((s, i) => {
                        const alreadyUsed = [query1, query2, query3].includes(s);
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={alreadyUsed}
                            onClick={() => fillQuery(s)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
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

              <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold bg-[#0f172a] hover:bg-slate-800 text-white">
                Check My AI Visibility — Free
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
                  <Input id="name" placeholder="Jane Doe" className="h-12 bg-slate-50 border-slate-200" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-semibold">Work Email</Label>
                  <Input id="email" type="email" placeholder="jane@company.com" className="h-12 bg-slate-50 border-slate-200" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" size="lg" className="h-14 w-1/3" onClick={() => setStep("initial")}>Back</Button>
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
