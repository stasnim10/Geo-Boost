import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const mockStripeInstance = vi.hoisted(() => ({
  webhooks: {
    constructEvent: vi.fn(),
  },
  subscriptions: {
    retrieve: vi.fn(),
  },
}));

const mockInsertChain = vi.hoisted(() => ({
  values: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  onConflictDoNothing: vi.fn(),
  returning: vi.fn(),
}));

const mockSelectChain = vi.hoisted(() => ({
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));

const mockUpdateChain = vi.hoisted(() => ({
  set: vi.fn(),
  where: vi.fn(),
  returning: vi.fn(),
}));

const mockDb = vi.hoisted(() => ({
  insert: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
}));

vi.mock("stripe", () => {
  const instance = mockStripeInstance;
  return {
    default: class MockStripe {
      webhooks = instance.webhooks;
      subscriptions = instance.subscriptions;
    },
  };
});

vi.mock("@workspace/db", () => ({
  db: mockDb,
  subscriptionsTable: { clerkUserId: "clerkUserId", stripeCustomerId: "stripeCustomerId" },
  stripeWebhookEventsTable: { eventId: "eventId" },
}));

vi.mock("../../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockInvalidatePlanCache = vi.hoisted(() => vi.fn());
vi.mock("../../lib/plan-check", () => ({
  invalidatePlanCache: mockInvalidatePlanCache,
}));

import { stripeWebhookHandler } from "./webhook.js";

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: { "stripe-signature": "test-sig" },
    body: Buffer.from("{}"),
    ...overrides,
  } as unknown as Request;
}

function makeRes(): { res: Response; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const res: any = { json };
  res.status = vi.fn().mockReturnValue(res);
  return { res, json, status: res.status };
}

beforeEach(() => {
  vi.clearAllMocks();

  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";

  mockInsertChain.onConflictDoUpdate.mockReturnValue(mockInsertChain);
  mockInsertChain.onConflictDoNothing.mockResolvedValue([]);
  mockInsertChain.returning.mockResolvedValue([{ clerkUserId: "user_123" }]);
  mockInsertChain.values.mockReturnValue(mockInsertChain);
  mockDb.insert.mockReturnValue(mockInsertChain);

  mockSelectChain.limit.mockResolvedValue([]);
  mockSelectChain.where.mockReturnValue(mockSelectChain);
  mockSelectChain.from.mockReturnValue(mockSelectChain);
  mockDb.select.mockReturnValue(mockSelectChain);

  mockUpdateChain.returning.mockResolvedValue([{ clerkUserId: "user_123" }]);
  mockUpdateChain.where.mockReturnValue(mockUpdateChain);
  mockUpdateChain.set.mockReturnValue(mockUpdateChain);
  mockDb.update.mockReturnValue(mockUpdateChain);
});

describe("stripeWebhookHandler — request validation", () => {
  it("returns 500 when STRIPE_WEBHOOK_SECRET is not set", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { res, status, json } = makeRes();
    await stripeWebhookHandler(makeReq(), res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const { res, status, json } = makeRes();
    await stripeWebhookHandler(makeReq({ headers: {} }), res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it("returns 400 when signature verification fails", async () => {
    mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Signature mismatch");
    });
    const { res, status, json } = makeRes();
    await stripeWebhookHandler(makeReq(), res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });
});

describe("stripeWebhookHandler — replay protection", () => {
  it("short-circuits a previously processed event without changing subscription state", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_replayed",
      data: { object: { id: "cs_replayed", mode: "payment" } },
    });
    mockSelectChain.limit.mockResolvedValueOnce([{ eventId: "evt_replayed" }]);

    const { res, json } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(json).toHaveBeenCalledWith({ received: true, duplicate: true });
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe("stripeWebhookHandler — checkout.session.completed (payment mode)", () => {
  it("upserts plan=fix when mode is payment", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_001",
      data: {
        object: {
          id: "cs_001",
          mode: "payment",
          customer: "cus_abc",
          subscription: null,
          metadata: { clerkUserId: "user_abc" },
        },
      },
    });

    const { res, json, status } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ received: true });

    // One subscription write plus one processed-event record makes replay safe.
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
    const insertValues = mockInsertChain.values.mock.calls[0][0];
    expect(insertValues).toMatchObject({ plan: "fix", status: "active", clerkUserId: "user_abc" });

    const conflictSet = mockInsertChain.onConflictDoUpdate.mock.calls[0][0].set;
    expect(conflictSet).toMatchObject({ plan: "fix", status: "active" });
  });

  it("returns a retryable failure when checkout identity is absent", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_002",
      data: {
        object: {
          id: "cs_002",
          mode: "payment",
          customer: "cus_abc",
          subscription: null,
          metadata: {},
        },
      },
    });

    const { res, json, status } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Webhook handler failed" });
  });
});

describe("stripeWebhookHandler — checkout.session.completed (subscription mode)", () => {
  const futureEpoch = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

  beforeEach(() => {
    mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
      items: { data: [{ current_period_end: futureEpoch, price: { id: "price_monitor" } }] },
    });
  });

  it("upserts plan=monitor when metadata.plan is monitor", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_003",
      data: {
        object: {
          id: "cs_003",
          mode: "subscription",
          customer: "cus_abc",
          subscription: "sub_123",
          metadata: { clerkUserId: "user_abc", plan: "monitor" },
        },
      },
    });

    const { res, json, status } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ received: true });

    expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith("sub_123");

    const insertValues = mockInsertChain.values.mock.calls[0][0];
    expect(insertValues).toMatchObject({
      plan: "monitor",
      status: "active",
      clerkUserId: "user_abc",
      stripeCustomerId: "cus_abc",
      stripePriceId: "price_monitor",
      currentPeriodEnd: new Date(futureEpoch * 1000),
    });

    const conflictSet = mockInsertChain.onConflictDoUpdate.mock.calls[0][0].set;
    expect(conflictSet).toMatchObject({ plan: "monitor", status: "active" });
  });

  it("upserts plan=grow when metadata.plan is grow", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_004",
      data: {
        object: {
          id: "cs_004",
          mode: "subscription",
          customer: "cus_xyz",
          subscription: "sub_456",
          metadata: { clerkUserId: "user_xyz", plan: "grow" },
        },
      },
    });

    const { res, json } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(json).toHaveBeenCalledWith({ received: true });
    const insertValues = mockInsertChain.values.mock.calls[0][0];
    expect(insertValues.plan).toBe("grow");
  });

  it("returns a retryable failure when a paid checkout is missing its plan", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_005",
      data: {
        object: {
          id: "cs_005",
          mode: "subscription",
          customer: "cus_xyz",
          subscription: "sub_789",
          metadata: { clerkUserId: "user_xyz" },
        },
      },
    });

    const { res, json, status } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Webhook handler failed" });
  });
});

describe("stripeWebhookHandler — invoice.paid", () => {
  it("refreshes currentPeriodEnd for the matching customer", async () => {
    const futureEpoch = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

    mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
      items: { data: [{ current_period_end: futureEpoch }] },
    });

    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "invoice.paid",
      id: "evt_006",
      data: {
        object: {
          customer: "cus_abc",
          parent: {
            type: "subscription_details",
            subscription_details: { subscription: "sub_123" },
          },
        },
      },
    });

    const { res, json, status } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ received: true });

    expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith("sub_123");
    expect(mockDb.update).toHaveBeenCalledOnce();

    const setArgs = mockUpdateChain.set.mock.calls[0][0];
    expect(setArgs.currentPeriodEnd).toEqual(new Date(futureEpoch * 1000));
    expect(setArgs).toHaveProperty("updatedAt");
  });

  it("skips update when customerId is missing", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "invoice.paid",
      id: "evt_007",
      data: {
        object: {
          customer: null,
          subscription: "sub_123",
        },
      },
    });

    const { res, json } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(mockDb.update).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ received: true });
  });

  it("skips update when subscriptionId is missing", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "invoice.paid",
      id: "evt_008",
      data: {
        object: {
          customer: "cus_abc",
          subscription: null,
        },
      },
    });

    const { res, json } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(mockDb.update).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ received: true });
  });
});

describe("stripeWebhookHandler — customer.subscription.updated", () => {
  const futureEpoch = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

  it("syncs status and currentPeriodEnd for the matching customer", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      id: "evt_011",
      data: {
        object: {
          customer: "cus_abc",
          status: "active",
          items: { data: [{ current_period_end: futureEpoch, price: { id: "price_123" } }] },
        },
      },
    });

    const { res, json, status } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ received: true });

    expect(mockDb.update).toHaveBeenCalledOnce();
    const setArgs = mockUpdateChain.set.mock.calls[0][0];
    expect(setArgs).toMatchObject({ status: "active", currentPeriodEnd: new Date(futureEpoch * 1000) });
    expect(setArgs).toHaveProperty("updatedAt");
  });

  it("maps stripe canceled status to cancelled", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      id: "evt_012",
      data: {
        object: {
          customer: "cus_abc",
          status: "canceled",
          items: { data: [] },
        },
      },
    });

    const { res, json } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(json).toHaveBeenCalledWith({ received: true });
    const setArgs = mockUpdateChain.set.mock.calls[0][0];
    expect(setArgs.status).toBe("cancelled");
  });

  it("invalidates the plan cache for the affected user", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      id: "evt_013",
      data: {
        object: {
          customer: "cus_abc",
          status: "active",
          items: { data: [] },
        },
      },
    });

    const { res } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(mockInvalidatePlanCache).toHaveBeenCalledWith("user_123");
  });

  it("skips update when customerId is missing", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      id: "evt_014",
      data: {
        object: {
          customer: null,
          status: "active",
          items: { data: [] },
        },
      },
    });

    const { res, json } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(mockDb.update).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ received: true });
  });
});

describe("stripeWebhookHandler — customer.subscription.deleted", () => {
  it("marks the subscription cancelled while retaining the plan record for billing history", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      id: "evt_009",
      data: {
        object: {
          customer: "cus_abc",
          status: "canceled",
          current_period_end: Math.floor(Date.now() / 1000),
          items: { data: [] },
        },
      },
    });

    const { res, json, status } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ received: true });

    expect(mockDb.update).toHaveBeenCalledOnce();

    const setArgs = mockUpdateChain.set.mock.calls[0][0];
    expect(setArgs).toMatchObject({ status: "cancelled" });
    expect(setArgs).not.toHaveProperty("plan");
  });

  it("skips update when customerId is missing", async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      id: "evt_010",
      data: {
        object: {
          customer: null,
          status: "canceled",
          items: { data: [] },
        },
      },
    });

    const { res, json } = makeRes();
    await stripeWebhookHandler(makeReq(), res);

    expect(mockDb.update).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ received: true });
  });
});
