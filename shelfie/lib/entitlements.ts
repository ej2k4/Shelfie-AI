// lib/entitlements.ts
// Plan limits — exact copy from Section 4B of the implementation plan.
// Never gates the core reservation/request loop.

export type PlanId = "FREE" | "PRO" | "ASSOCIATION";

export interface PlanLimits {
  maxProducts: number;
  insights: "BASIC" | "FULL";
  sponsoredEligible: boolean;
  requestRoutingTiebreak: boolean;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  FREE:        { maxProducts: 20,   insights: "BASIC", sponsoredEligible: false, requestRoutingTiebreak: false },
  PRO:         { maxProducts: 1000, insights: "FULL",  sponsoredEligible: true,  requestRoutingTiebreak: true  },
  ASSOCIATION: { maxProducts: 1000, insights: "FULL",  sponsoredEligible: true,  requestRoutingTiebreak: true  },
};

export interface ShopPlan {
  id: PlanId;
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED";
  currentPeriodEnd: string | null;
}

/** A paid plan only counts while ACTIVE and not past its period end. */
export function effectivePlan(plan: ShopPlan | undefined, now = new Date()): PlanId {
  if (!plan || plan.id === "FREE") return "FREE";
  if (plan.status !== "ACTIVE") return "FREE";
  if (plan.currentPeriodEnd && new Date(plan.currentPeriodEnd) < now) return "FREE";
  return plan.id;
}

export class PlanLimitError extends Error {
  status = 402;
  constructor(public limit: string, public planId: PlanId) {
    super(`PLAN_LIMIT:${limit}`);
  }
}

/** Call from product create paths only — never from reserve/request paths. */
export function assertCanAddProducts(
  plan: ShopPlan | undefined,
  currentCount: number,
  adding = 1
) {
  const id = effectivePlan(plan);
  const max = PLANS[id].maxProducts;
  if (currentCount + adding > max) throw new PlanLimitError("maxProducts", id);
}
