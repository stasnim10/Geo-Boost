import { Link } from "wouter";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  fix: "Fix Package",
  monitor: "Monitor",
  grow: "Grow",
};

export default function Success() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    async function fetchSubscription() {
      try {
        const token = await getToken();
        const res = await fetch(`${import.meta.env.BASE_URL}api/stripe/subscription`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setPlan(data.plan ?? "free");
        }
      } catch {
        // Non-critical — fall back to generic message
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [isLoaded, isSignedIn, getToken]);

  const planLabel = plan ? (PLAN_LABELS[plan] ?? plan) : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-20 px-4 text-center">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-8">
        <CheckCircle2 className="w-14 h-14 text-green-500" strokeWidth={1.5} />
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
        You're in. Welcome to Show me on AI.
      </h1>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-lg mb-10">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Confirming your plan…</span>
        </div>
      ) : planLabel ? (
        <p className="text-lg text-slate-500 max-w-lg mb-10">
          Your <span className="font-semibold text-green-600">{planLabel}</span> plan is now active.
          Start optimizing your content to get found by ChatGPT, Claude, and Perplexity.
        </p>
      ) : (
        <p className="text-lg text-slate-500 max-w-lg mb-10">
          Your account is active. Start optimizing your content to get found by
          ChatGPT, Claude, and Perplexity.
        </p>
      )}

      <Link href="/optimizer">
        <button
          style={{ backgroundColor: "#22c55e" }}
          className="hover:opacity-90 text-white font-bold px-10 py-4 rounded-lg text-lg transition-opacity border-b-4 border-green-700 active:border-b-0 active:translate-y-1"
        >
          Start Optimizing Now
        </button>
      </Link>

      <Link href="/">
        <span className="block mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
          Back to home
        </span>
      </Link>
    </div>
  );
}
