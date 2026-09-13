import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { Resend } from "resend";
import { db, trackedQueriesTable, queryTrackingTable, auditsTable, monitorReportLogsTable, subscriptionsTable } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { eq, desc, and, inArray } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { requireAuth } from "../audits/index";
import { parseLLMJson } from "../../lib/parse-llm-json";
import { requirePlan } from "../../lib/plan-check";
import { PLANS } from "@workspace/api-zod";

const router: IRouter = Router();

const requireMonitorPlan = requirePlan([PLANS.MONITOR, PLANS.GROW]);

// ─── GET /monitor/setup ───────────────────────────────────────────────────────
router.get("/monitor/setup", requireAuth, requireMonitorPlan, async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [row] = await db.select().from(trackedQueriesTable)
      .where(and(eq(trackedQueriesTable.clerkUserId, userId), eq(trackedQueriesTable.active, true)))
      .orderBy(desc(trackedQueriesTable.createdAt))
      .limit(1);
    if (!row) { res.status(404).json({ error: "No setup found" }); return; }
    res.json({ domain: row.domain, queries: row.queries, email: row.email });
  } catch (err) {
    logger.error({ err }, "Monitor setup GET failed");
    res.status(500).json({ error: "Failed to load setup" });
  }
});

// ─── POST /monitor/setup ──────────────────────────────────────────────────────
router.post("/monitor/setup", requireAuth, requireMonitorPlan, async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { domain, queries, email } = req.body as { domain?: string; queries?: string[]; email?: string };
  if (!domain || !Array.isArray(queries) || queries.length === 0 || !email) {
    res.status(400).json({ error: "domain, queries, and email are required" });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }
  try {
    await db.update(trackedQueriesTable)
      .set({ active: false })
      .where(eq(trackedQueriesTable.clerkUserId, userId));
    await db.insert(trackedQueriesTable).values({
      clerkUserId: userId,
      domain: domain.replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
      queries: queries.filter(q => q.trim()).slice(0, 5),
      email,
      active: true,
    });
    req.log.info({ userId, domain }, "Monitor setup saved");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Monitor setup POST failed");
    res.status(500).json({ error: "Failed to save setup" });
  }
});

// ─── GET /monitor/query-results ───────────────────────────────────────────────
router.get("/monitor/query-results", requireAuth, requireMonitorPlan, async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const results = await db.select().from(queryTrackingTable)
      .where(eq(queryTrackingTable.clerkUserId, userId))
      .orderBy(desc(queryTrackingTable.checkedAt))
      .limit(25);
    res.json(results);
  } catch (err) {
    logger.error({ err }, "Query results GET failed");
    res.status(500).json({ error: "Failed to load results" });
  }
});

// ─── checkQueryWithClaude ─────────────────────────────────────────────────────
async function checkQueryWithClaude(query: string, domain: string): Promise<{
  cited: boolean; confidence: "low" | "medium" | "high"; reason: string; suggestion: string;
}> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `You are simulating what ChatGPT would recommend when a user asks: "${query}"

Based on general knowledge, would a business at the domain "${domain}" likely be recommended? Analyze whether this domain has characteristics that would make it citable by AI assistants (clear content, specific information, structured data, local signals).

Return ONLY valid JSON:
{
  "cited": <true or false>,
  "confidence": "<low|medium|high>",
  "reason": "<one sentence explanation>",
  "suggestion": "<one sentence specific improvement tip>"
}`,
      }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const result = parseLLMJson<{ cited: boolean; confidence: string; reason: string; suggestion: string }>(text);
    if (!result.ok) throw new Error(result.error);
    const data = result.data;
    return {
      cited: Boolean(data.cited),
      confidence: (["low", "medium", "high"].includes(data.confidence) ? data.confidence : "low") as "low" | "medium" | "high",
      reason: data.reason || "",
      suggestion: data.suggestion || "",
    };
  } catch {
    return { cited: false, confidence: "low", reason: "Could not determine citation status.", suggestion: "Improve content clarity and specificity." };
  }
}

// ─── sendEmailWithRetry ───────────────────────────────────────────────────────
async function sendEmailWithRetry(
  resend: Resend,
  opts: Parameters<Resend["emails"]["send"]>[0],
  clerkUserId: string,
  maxAttempts = 3,
): Promise<void> {
  const backoffMs = [2000, 4000, 8000];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { error } = await resend.emails.send(opts);
    if (!error) return;
    logger.warn({ error, clerkUserId, attempt: attempt + 1 }, "Email send attempt failed");
    if (attempt < maxAttempts - 1) {
      await new Promise<void>(resolve => setTimeout(resolve, backoffMs[attempt]));
    } else {
      throw new Error(`Email failed after ${maxAttempts} attempts: ${JSON.stringify(error)}`);
    }
  }
}

// ─── buildWeeklyReportEmail ───────────────────────────────────────────────────
function buildWeeklyReportEmail(opts: {
  domain: string;
  email: string;
  currentScore: number;
  prevScore: number | null;
  queryResults: Array<{ query: string; cited: boolean; confidence: string; reason: string; suggestion: string }>;
  topPriority: string;
  appUrl: string;
  dashboardUrl: string;
}): string {
  const { domain, currentScore, prevScore, queryResults, topPriority, dashboardUrl } = opts;
  const scoreDiff = prevScore !== null ? currentScore - prevScore : null;
  const scoreColor = currentScore >= 70 ? "#22c55e" : currentScore >= 40 ? "#f59e0b" : "#ef4444";
  const scoreLabel = currentScore >= 70 ? "Good" : currentScore >= 40 ? "Needs Work" : "Critical";
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const diffHtml = scoreDiff !== null
    ? `<span style="color:${scoreDiff >= 0 ? "#22c55e" : "#ef4444"};font-size:16px;font-weight:700;">${scoreDiff >= 0 ? "▲" : "▼"} ${Math.abs(scoreDiff)} pts vs last week</span>`
    : `<span style="color:#94a3b8;font-size:13px;">First report — no previous score to compare</span>`;

  const queryRowsHtml = queryResults.map(r => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:4px;">"${r.query}"</div>
        <div style="font-size:12px;color:#64748b;">${r.reason}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Tip: ${r.suggestion}</div>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:top;white-space:nowrap;">
        <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${r.cited ? "#dcfce7" : "#fee2e2"};color:${r.cited ? "#166534" : "#991b1b"};">
          ${r.cited ? "✓ Cited" : "✗ Not Cited"}
        </span>
        <div style="font-size:10px;color:#94a3b8;margin-top:3px;">${r.confidence} confidence</div>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<tr><td style="background:#0f172a;padding:28px 32px;">
  <span style="color:#22c55e;font-size:22px;font-weight:800;">📈 GEOboost</span>
  <p style="color:#94a3b8;margin:8px 0 0;font-size:13px;">Your Weekly AI Visibility Update</p>
</td></tr>

<tr><td style="padding:28px 32px 16px;">
  <h1 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0f172a;">Weekly Report — ${domain}</h1>
  <p style="margin:0;color:#64748b;font-size:13px;">Week of ${today}</p>
</td></tr>

<tr><td style="padding:0 32px 24px;">
  <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;border:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your AI Visibility Score</p>
    <div style="font-size:52px;font-weight:800;color:${scoreColor};line-height:1;">${currentScore}</div>
    <div style="font-size:13px;font-weight:700;color:${scoreColor};margin-bottom:8px;">${scoreLabel}</div>
    ${diffHtml}
  </div>
</td></tr>

<tr><td style="padding:0 32px 24px;">
  <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0f172a;">Your 5 Tracked Queries</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
    <thead>
      <tr style="background:#f8fafc;">
        <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Query</th>
        <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
      </tr>
    </thead>
    <tbody>${queryRowsHtml}</tbody>
  </table>
</td></tr>

<tr><td style="padding:0 32px 24px;">
  <div style="background:#eff6ff;border-radius:12px;padding:20px 24px;border:1px solid #bfdbfe;">
    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e3a8a;">Your #1 Priority This Week</p>
    <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">${topPriority}</p>
  </div>
</td></tr>

<tr><td style="padding:0 32px 32px;text-align:center;">
  <a href="${dashboardUrl}" style="display:inline-block;background:#22c55e;color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;">
    View Full Report →
  </a>
</td></tr>

<tr><td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;">
  <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">You're on the GEOboost Monitor plan — $29/month. <a href="${dashboardUrl}" style="color:#94a3b8;">Manage subscription</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── getThisMondayKey ─────────────────────────────────────────────────────────
function getThisMondayKey(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

// ─── runWeeklyReportForUser ───────────────────────────────────────────────────
async function runWeeklyReportForUser(
  setup: { clerkUserId: string; domain: string; queries: string[]; email: string },
  weekKey: string,
): Promise<void> {
  const { clerkUserId, domain, queries, email } = setup;

  const [existing] = await db.select()
    .from(monitorReportLogsTable)
    .where(and(
      eq(monitorReportLogsTable.clerkUserId, clerkUserId),
      eq(monitorReportLogsTable.weekKey, weekKey),
      eq(monitorReportLogsTable.status, "success"),
    ))
    .limit(1);

  if (existing) {
    logger.info({ clerkUserId, weekKey }, "Weekly report already sent for this week, skipping");
    return;
  }

  const appUrl = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : "http://localhost:80";

  const [latestAudit, prevAudit] = await db.select()
    .from(auditsTable)
    .where(eq(auditsTable.clerkUserId, clerkUserId))
    .orderBy(desc(auditsTable.createdAt))
    .limit(2);

  const currentScore = latestAudit?.aiVisibilityScore ?? 0;
  const prevScore = prevAudit?.aiVisibilityScore ?? null;
  const weaknesses = latestAudit?.weaknesses ?? [];

  const queryResults = await Promise.all(
    queries.map(async (q) => {
      const result = await checkQueryWithClaude(q, domain);
      await db.insert(queryTrackingTable).values({
        clerkUserId,
        domain,
        query: q,
        cited: result.cited,
        confidence: result.confidence,
        reason: result.reason,
        suggestion: result.suggestion,
      });
      return { query: q, ...result };
    })
  );

  const citedCount = queryResults.filter(r => r.cited).length;
  const topPriority = citedCount === queries.length
    ? "Great week — you're being cited for all tracked queries. Focus on maintaining your content freshness and keep your Google Business Profile updated."
    : weaknesses.length > 0
    ? weaknesses[0]
    : `You're being cited for ${citedCount} of ${queries.length} queries. Improve your content by adding direct answers to the queries where you're not being cited.`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { logger.warn({ clerkUserId }, "RESEND_API_KEY not set, skipping email"); return; }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "GEOboost <onboarding@resend.dev>";
  const html = buildWeeklyReportEmail({
    domain, email, currentScore, prevScore, queryResults, topPriority,
    appUrl, dashboardUrl: `${appUrl}/dashboard`,
  });

  const emailOpts = {
    from,
    to: [email],
    subject: `Your AI Visibility Report — ${domain} — Week of ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    html,
  };

  try {
    await sendEmailWithRetry(resend, emailOpts, clerkUserId);
    await db.insert(monitorReportLogsTable).values({ clerkUserId, weekKey, status: "success" })
      .onConflictDoUpdate({
        target: [monitorReportLogsTable.clerkUserId, monitorReportLogsTable.weekKey],
        set: { status: "success", sentAt: new Date() },
      });
    logger.info({ clerkUserId, domain, score: currentScore }, "Weekly report sent");
  } catch (err) {
    await db.insert(monitorReportLogsTable).values({ clerkUserId, weekKey, status: "failed" })
      .onConflictDoUpdate({
        target: [monitorReportLogsTable.clerkUserId, monitorReportLogsTable.weekKey],
        set: { status: "failed", sentAt: new Date() },
      });
    logger.error({ err, clerkUserId, domain }, "Weekly report email failed after all retries");
  }
}

// ─── POST /send-test-report ───────────────────────────────────────────────────
router.post("/send-test-report", requireAuth, requireMonitorPlan, async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [setup] = await db.select().from(trackedQueriesTable)
      .where(and(eq(trackedQueriesTable.clerkUserId, userId), eq(trackedQueriesTable.active, true)))
      .orderBy(desc(trackedQueriesTable.createdAt))
      .limit(1);
    if (!setup) {
      res.status(404).json({ error: "No monitor setup found. Please go to /monitor-setup first." });
      return;
    }
    const weekKey = `test-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
    await runWeeklyReportForUser(
      { clerkUserId: userId, domain: setup.domain, queries: setup.queries, email: setup.email },
      weekKey,
    );
    res.json({ success: true, message: `Test report sent to ${setup.email}` });
  } catch (err) {
    logger.error({ err }, "Test report failed");
    res.status(500).json({ error: "Failed to send test report", details: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ─── Weekly scheduler ─────────────────────────────────────────────────────────
let lastWeeklyRun: string | null = null;

async function runWeeklyJobIfDue(): Promise<void> {
  const now = new Date();
  const isMonday = now.getDay() === 1;
  const isAfter8am = now.getHours() >= 8;
  const weekKey = getThisMondayKey();
  if (!isMonday || !isAfter8am || lastWeeklyRun === weekKey) return;
  lastWeeklyRun = weekKey;
  logger.info({ weekKey }, "Running weekly Monitor reports");
  try {
    const setups = await db.select({
      clerkUserId: trackedQueriesTable.clerkUserId,
      domain: trackedQueriesTable.domain,
      queries: trackedQueriesTable.queries,
      email: trackedQueriesTable.email,
    })
      .from(trackedQueriesTable)
      .innerJoin(subscriptionsTable, eq(trackedQueriesTable.clerkUserId, subscriptionsTable.clerkUserId))
      .where(and(
        eq(trackedQueriesTable.active, true),
        inArray(subscriptionsTable.plan, ["monitor", "grow"]),
        eq(subscriptionsTable.status, "active"),
      ));
    for (const setup of setups) {
      try {
        await runWeeklyReportForUser(
          { clerkUserId: setup.clerkUserId, domain: setup.domain, queries: setup.queries, email: setup.email },
          weekKey,
        );
      } catch (err) {
        logger.error({ err, userId: setup.clerkUserId }, "Weekly report failed for user");
      }
    }
    logger.info({ count: setups.length }, "Weekly Monitor reports complete");
  } catch (err) {
    logger.error({ err }, "Weekly job query failed");
  }
}

// ─── Startup catch-up ─────────────────────────────────────────────────────────
// Runs once on server start: for any active Monitor user who hasn't received a
// successful report for the current week yet, send it now — regardless of the
// day or time (catches missed reports after outages, restarts, etc.).
export async function runStartupCatchup(): Promise<void> {
  const weekKey = getThisMondayKey();
  try {
    const setups = await db.select({
      clerkUserId: trackedQueriesTable.clerkUserId,
      domain: trackedQueriesTable.domain,
      queries: trackedQueriesTable.queries,
      email: trackedQueriesTable.email,
    })
      .from(trackedQueriesTable)
      .innerJoin(subscriptionsTable, eq(trackedQueriesTable.clerkUserId, subscriptionsTable.clerkUserId))
      .where(and(
        eq(trackedQueriesTable.active, true),
        inArray(subscriptionsTable.plan, ["monitor", "grow"]),
        eq(subscriptionsTable.status, "active"),
      ));
    if (setups.length === 0) return;

    const alreadySent = await db.select()
      .from(monitorReportLogsTable)
      .where(and(
        eq(monitorReportLogsTable.weekKey, weekKey),
        eq(monitorReportLogsTable.status, "success"),
      ));

    const sentUserIds = new Set(alreadySent.map(r => r.clerkUserId));
    const missed = setups.filter(s => !sentUserIds.has(s.clerkUserId));

    if (missed.length === 0) {
      logger.info({ weekKey }, "Startup catch-up: all Monitor reports already sent for this week");
      return;
    }

    logger.info({ count: missed.length, weekKey }, "Startup catch-up: sending missed Monitor reports");
    for (const setup of missed) {
      await new Promise<void>(resolve => setTimeout(resolve, 500));
      runWeeklyReportForUser(
        { clerkUserId: setup.clerkUserId, domain: setup.domain, queries: setup.queries, email: setup.email },
        weekKey,
      ).catch(err => logger.error({ err, userId: setup.clerkUserId }, "Startup catch-up report failed"));
    }
  } catch (err) {
    logger.error({ err }, "Startup catch-up query failed");
  }
}

setInterval(() => { runWeeklyJobIfDue().catch(err => logger.error({ err }, "Weekly scheduler error")); }, 60 * 60 * 1000);

export { runWeeklyReportForUser };
export default router;
