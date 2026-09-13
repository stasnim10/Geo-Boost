import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@clerk/react";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { PLANS, getPlanLabel, type Plan } from "@workspace/api-zod";

type ActivationState = "confirming" | "confirmed" | "delayed" | "sign-in-required" | "error";

type BillingStatus = {
  plan: Plan;
  confirmed: boolean;
};

const CONFIRMATION_WINDOW_MS = 15_000;
const POLL_INTERVAL_MS = 1_500;

export default function Success() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { getToken, isSignedIn } = useAuth();
  const sessionId = new URLSearchParams(search).get("session_id");
  const [state, setState] = useState<ActivationState>("confirming");
  const [confirmedPlan, setConfirmedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      return;
    }
    if (isSignedIn === false) {
      setState("sign-in-required");
      return;
    }
    if (!isSignedIn) return;

    let cancelled = false;
    const startedAt = Date.now();

    const checkBilling = async () => {
      try {
        const token = await getToken();
        const response = await fetch(
          `${import.meta.env.BASE_URL}api/billing/status?session_id=${encodeURIComponent(sessionId)}`,
          {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );

        if (response.status === 401) {
          if (!cancelled) setState("sign-in-required");
          return true;
        }
        if (!response.ok) {
          if (!cancelled) setState("error");
          return true;
        }

        const billing = (await response.json()) as BillingStatus;
        if (billing.confirmed && billing.plan !== PLANS.FREE) {
          if (!cancelled) {
            setConfirmedPlan(billing.plan);
            setState("confirmed");
          }
          return true;
        }

        if (Date.now() - startedAt >= CONFIRMATION_WINDOW_MS) {
          await fetch(`${import.meta.env.BASE_URL}api/billing/activation-timeout`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ sessionId }),
          }).catch(() => undefined);
          if (!cancelled) setState("delayed");
          return true;
        }
      } catch {
        if (!cancelled) setState("error");
        return true;
      }
      return false;
    };

    const poll = async () => {
      const done = await checkBilling();
      if (!done && !cancelled) window.setTimeout(poll, POLL_INTERVAL_MS);
    };
    void poll();

    return () => {
      cancelled = true;
    };
  }, [getToken, isSignedIn, sessionId]);

  const nextPath = confirmedPlan === PLANS.FIX ? "/optimizer" : "/monitor-setup";
  const nextLabel = confirmedPlan === PLANS.FIX ? "Start your fixes" : "Set up monitoring";

  return (
    <main className="min-h-[70dvh] bg-slate-50 px-4 py-16">
      <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {state === "confirming" && (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-green-600" />
            <h1 className="text-2xl font-bold text-slate-900">Confirming your purchase</h1>
            <p className="mt-3 text-slate-600">We’re verifying your payment securely. This usually takes a few seconds.</p>
          </>
        )}

        {state === "confirmed" && confirmedPlan && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <h1 className="text-2xl font-bold text-slate-900">{getPlanLabel(confirmedPlan)} is active</h1>
            <p className="mt-3 text-slate-600">Your account has been updated and is ready to use.</p>
            <Link href={nextPath}>
              <button className="mt-6 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
                {nextLabel}
              </button>
            </Link>
          </>
        )}

        {state === "sign-in-required" && (
          <>
            <CircleAlert className="mx-auto mb-4 h-10 w-10 text-amber-500" />
            <h1 className="text-2xl font-bold text-slate-900">Sign in to confirm your purchase</h1>
            <p className="mt-3 text-slate-600">Use the account you used when starting checkout. We’ll finish confirming your access after you sign in.</p>
            <button
              onClick={() => setLocation(`/sign-in?redirect_url=${encodeURIComponent(`/success?session_id=${sessionId}`)}`)}
              className="mt-6 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
            >
              Sign in
            </button>
          </>
        )}

        {state === "delayed" && (
          <>
            <CircleAlert className="mx-auto mb-4 h-10 w-10 text-amber-500" />
            <h1 className="text-2xl font-bold text-slate-900">Your payment is still being confirmed</h1>
            <p className="mt-3 text-slate-600">We’ve recorded this for review. Please return to your dashboard in a moment; access will appear only after confirmation.</p>
            <Link href="/dashboard">
              <button className="mt-6 rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                Go to dashboard
              </button>
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <CircleAlert className="mx-auto mb-4 h-10 w-10 text-red-500" />
            <h1 className="text-2xl font-bold text-slate-900">We couldn’t confirm this purchase</h1>
            <p className="mt-3 text-slate-600">For your security, we haven’t changed your access. Please return to your dashboard or contact support if this continues.</p>
            <Link href="/dashboard">
              <button className="mt-6 rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                Go to dashboard
              </button>
            </Link>
          </>
        )}
      </section>
    </main>
  );
}