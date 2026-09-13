export const PLANS = {
  FREE: "free",
  FIX: "fix",
  MONITOR: "monitor",
  GROW: "grow",
} as const;

export type Plan = (typeof PLANS)[keyof typeof PLANS];

export const SUBSCRIPTION_STATUSES = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
  PAST_DUE: "past_due",
  TRIALING: "trialing",
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES];

export const ACTIVE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  SUBSCRIPTION_STATUSES.ACTIVE,
  SUBSCRIPTION_STATUSES.TRIALING,
];

export const PAID_PLANS: readonly Plan[] = [
  PLANS.FIX,
  PLANS.MONITOR,
  PLANS.GROW,
];

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && Object.values(PLANS).includes(value as Plan);
}

export function hasPlanEntitlement(
  plan: Plan,
  status: SubscriptionStatus,
  allowedPlans: readonly Plan[],
): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status) && allowedPlans.includes(plan);
}

export function getPlanLabel(plan: Plan): string {
  switch (plan) {
    case PLANS.FIX:
      return "Fix Package";
    case PLANS.MONITOR:
      return "Monitor";
    case PLANS.GROW:
      return "Grow";
    default:
      return "Free";
  }
}