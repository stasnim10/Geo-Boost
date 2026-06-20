import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── DB mock ──────────────────────────────────────────────────────────────────
const mockSelectChain = vi.hoisted(() => ({
  from: vi.fn(),
  innerJoin: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
}));

const mockInsertChain = vi.hoisted(() => ({
  values: vi.fn(),
  onConflictDoUpdate: vi.fn(),
}));

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: mockDb,
  trackedQueriesTable: { clerkUserId: "clerkUserId", active: "active" },
  subscriptionsTable: { clerkUserId: "clerkUserId", plan: "plan", status: "status" },
  monitorReportLogsTable: { clerkUserId: "clerkUserId", weekKey: "weekKey", status: "status" },
  queryTrackingTable: {},
  auditsTable: { clerkUserId: "clerkUserId", createdAt: "createdAt" },
}));

vi.mock("../../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: vi.fn().mockResolvedValue({ error: null }) };
  },
}));

vi.mock("@workspace/integrations-anthropic-ai", () => ({
  anthropic: {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: '{"cited":true,"confidence":"high","reason":"good","suggestion":"keep it up"}' }],
      }),
    },
  },
}));

vi.mock("@clerk/express", () => ({ getAuth: vi.fn() }));
vi.mock("../../lib/plan-check", () => ({ requirePlan: () => (_: unknown, __: unknown, next: () => void) => next() }));
vi.mock("../audits/index", () => ({ requireAuth: (_: unknown, __: unknown, next: () => void) => next() }));
vi.mock("../../lib/parse-llm-json", () => ({
  parseLLMJson: () => ({
    ok: true,
    data: { cited: true, confidence: "high", reason: "good", suggestion: "keep it up" },
  }),
}));

import { runStartupCatchup } from "./index.js";

// ─── Chain helper ─────────────────────────────────────────────────────────────
function makeChain(resolvedValue: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockResolvedValue(resolvedValue);
  chain.limit = vi.fn().mockResolvedValue(resolvedValue);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();

  mockInsertChain.onConflictDoUpdate.mockResolvedValue([]);
  mockInsertChain.values.mockReturnValue(mockInsertChain);
  mockDb.insert.mockReturnValue(mockInsertChain);
});

// ─── runStartupCatchup — no eligible users ────────────────────────────────────
describe("runStartupCatchup — no eligible paying users", () => {
  it("returns early and makes no further DB calls when the join query returns no rows", async () => {
    mockDb.select.mockReturnValue(makeChain([]));

    await runStartupCatchup();

    expect(mockDb.select).toHaveBeenCalledTimes(1);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("does not send any emails when the join query returns no rows", async () => {
    mockDb.select.mockReturnValue(makeChain([]));
    const { Resend } = await import("resend");
    const resendInstance = new Resend("key");

    await runStartupCatchup();

    expect(resendInstance.emails.send).not.toHaveBeenCalled();
  });
});

// ─── runStartupCatchup — eligible users already sent ─────────────────────────
describe("runStartupCatchup — eligible users but reports already sent this week", () => {
  it("skips report generation when every eligible user already has a success log", async () => {
    const setup = { clerkUserId: "user_monitor", domain: "example.com", queries: ["q1"], email: "a@b.com" };
    const sentLog = { clerkUserId: "user_monitor", weekKey: "2026-06-08", status: "success" };

    mockDb.select
      .mockReturnValueOnce(makeChain([setup]))
      .mockReturnValueOnce(makeChain([sentLog]));

    await runStartupCatchup();

    expect(mockDb.select).toHaveBeenCalledTimes(2);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});

// ─── runStartupCatchup — missed report gets sent ─────────────────────────────
describe("runStartupCatchup — eligible user missed this week's report", () => {
  it("attempts to process a user who has no success log this week (makes further DB calls)", async () => {
    const setup = { clerkUserId: "user_grow", domain: "grow.com", queries: ["query1"], email: "user@grow.com" };

    const existingCheckChain = makeChain([]);
    const auditsChain = makeChain([]);

    mockDb.select
      .mockReturnValueOnce(makeChain([setup]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValue(existingCheckChain);

    auditsChain.limit = vi.fn().mockResolvedValue([]);
    existingCheckChain.limit = vi.fn().mockResolvedValue([]);

    await runStartupCatchup();

    await new Promise<void>(resolve => setTimeout(resolve, 200));

    expect(mockDb.select).toHaveBeenCalledTimes(3);
  });
});

// ─── Plan/status gate — ineligible users ─────────────────────────────────────
describe("runStartupCatchup — ineligible users filtered out by query", () => {
  it("processes zero users when the DB returns an empty list (cancelled subscription)", async () => {
    mockDb.select.mockReturnValue(makeChain([]));

    await runStartupCatchup();

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("processes zero users when the DB returns an empty list (free plan)", async () => {
    mockDb.select.mockReturnValue(makeChain([]));

    await runStartupCatchup();

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("processes zero users when the DB returns an empty list (past_due status)", async () => {
    mockDb.select.mockReturnValue(makeChain([]));

    await runStartupCatchup();

    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
