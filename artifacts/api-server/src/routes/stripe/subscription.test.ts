import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const mockSelectChain = vi.hoisted(() => ({
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
}));

const mockGetAuth = vi.hoisted(() => vi.fn());

vi.mock("@workspace/db", () => ({
  db: mockDb,
  subscriptionsTable: { clerkUserId: "clerkUserId" },
}));

vi.mock("@clerk/express", () => ({
  getAuth: mockGetAuth,
}));

vi.mock("stripe", () => ({
  default: class MockStripe {},
}));

vi.mock("../../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import stripeRouter from "./index.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/stripe", stripeRouter);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();

  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

  mockSelectChain.limit.mockResolvedValue([]);
  mockSelectChain.where.mockReturnValue(mockSelectChain);
  mockSelectChain.from.mockReturnValue(mockSelectChain);
  mockDb.select.mockReturnValue(mockSelectChain);
});

describe("GET /stripe/subscription — authentication", () => {
  it("returns 401 when the request is not authenticated", async () => {
    mockGetAuth.mockReturnValue({ userId: null });

    const app = buildApp();
    const res = await request(app).get("/stripe/subscription");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });
});

describe("GET /stripe/subscription — free user (no DB row)", () => {
  it("returns plan=free with status=active for an unknown user", async () => {
    mockGetAuth.mockReturnValue({ userId: "user_unknown" });
    mockSelectChain.limit.mockResolvedValue([]);

    const app = buildApp();
    const res = await request(app).get("/stripe/subscription");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      plan: "free",
      status: "active",
      currentPeriodEnd: null,
      confirmed: false,
    });
  });
});

describe("GET /stripe/subscription — paying user (DB row present)", () => {
  it("returns the stored plan and status for a monitor subscriber", async () => {
    mockGetAuth.mockReturnValue({ userId: "user_monitor" });

    const periodEnd = new Date("2026-07-13T00:00:00.000Z");
    mockSelectChain.limit.mockResolvedValue([
      {
        plan: "monitor",
        status: "active",
        currentPeriodEnd: periodEnd,
        stripeCustomerId: "cus_abc",
      },
    ]);

    const app = buildApp();
    const res = await request(app).get("/stripe/subscription");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      plan: "monitor",
      status: "active",
      stripeCustomerId: "cus_abc",
    });
    expect(res.body.currentPeriodEnd).toBe(periodEnd.toISOString());
  });

  it("returns the stored plan and status for a grow subscriber", async () => {
    mockGetAuth.mockReturnValue({ userId: "user_grow" });

    mockSelectChain.limit.mockResolvedValue([
      {
        plan: "grow",
        status: "active",
        currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
        stripeCustomerId: "cus_xyz",
      },
    ]);

    const app = buildApp();
    const res = await request(app).get("/stripe/subscription");

    expect(res.status).toBe(200);
    expect(res.body.plan).toBe("grow");
  });

  it("returns plan=fix and no currentPeriodEnd for a one-time fix purchaser", async () => {
    mockGetAuth.mockReturnValue({ userId: "user_fix" });

    mockSelectChain.limit.mockResolvedValue([
      {
        plan: "fix",
        status: "active",
        currentPeriodEnd: null,
        stripeCustomerId: "cus_fix",
      },
    ]);

    const app = buildApp();
    const res = await request(app).get("/stripe/subscription");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      plan: "fix",
      status: "active",
      currentPeriodEnd: null,
    });
  });

  it("returns cancelled status correctly after downgrade", async () => {
    mockGetAuth.mockReturnValue({ userId: "user_cancelled" });

    mockSelectChain.limit.mockResolvedValue([
      {
        plan: "free",
        status: "cancelled",
        currentPeriodEnd: null,
        stripeCustomerId: "cus_old",
      },
    ]);

    const app = buildApp();
    const res = await request(app).get("/stripe/subscription");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ plan: "free", status: "cancelled" });
  });
});
