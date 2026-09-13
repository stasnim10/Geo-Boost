import { db, subscriptionsTable } from "@workspace/db";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  PLANS,
  type Plan,
  type SubscriptionStatus,
  hasPlanEntitlement,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";

interface PlanInfo {
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
}

const cache = new Map<string, { data: PlanInfo; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function getUserPlan(clerkUserId: string): Promise<PlanInfo> {
  const now = Date.now();
  const cached = cache.get(clerkUserId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const rows = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.clerkUserId, clerkUserId))
    .limit(1);

  let data: PlanInfo;
  if (rows.length === 0) {
    data = {
      plan: PLANS.FREE,
      status: "active",
      currentPeriodEnd: null,
      stripeCustomerId: null,
    };
  } else {
    const row = rows[0];
    data = {
      plan: ACTIVE_SUBSCRIPTION_STATUSES.includes(row.status as SubscriptionStatus)
        ? (row.plan as Plan)
        : PLANS.FREE,
      status: row.status as SubscriptionStatus,
      currentPeriodEnd: row.currentPeriodEnd ?? null,
      stripeCustomerId: row.stripeCustomerId ?? null,
    };
  }

  cache.set(clerkUserId, { data, expiresAt: now + CACHE_TTL_MS });
  return data;
}

export function invalidatePlanCache(clerkUserId: string): void {
  cache.delete(clerkUserId);
}

export function requirePlan(allowedPlans: readonly Plan[]) {
  return async (
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction
  ): Promise<void> => {
    const { getAuth } = await import("@clerk/express");
    const auth = getAuth(req);
    const userId = auth?.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { plan, status } = await getUserPlan(userId);

    if (!hasPlanEntitlement(plan, status, allowedPlans)) {
      const minPlan = allowedPlans[0];
      res.status(403).json({
        error: "upgrade_required",
        requiredPlan: minPlan,
        currentPlan: plan,
        upgradeUrl: `/pricing?plan=${minPlan}`,
      });
      return;
    }

    next();
  };
}
