import { Router, type IRouter, type Request } from "express";
import { runCitationTest } from "@workspace/citation-engine";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateStore = new Map<string, RateEntry>();

function getClientIp(req: Request): string {
  // req.ip is set correctly by Express when trust proxy is configured in app.ts.
  // It uses the x-forwarded-for chain validated against the trusted proxy count,
  // so client-supplied spoofed headers are ignored.
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

router.post("/citation/simulate", async (req, res): Promise<void> => {
  const body = req.body as { query?: unknown; domain?: unknown };

  if (typeof body.query !== "string" || body.query.trim().length < 3 || body.query.length > 300) {
    res.status(400).json({ error: "query must be a string between 3 and 300 characters" });
    return;
  }

  const query = body.query.trim();
  const domain = typeof body.domain === "string" ? body.domain.trim() : undefined;

  const ip = getClientIp(req);
  const { allowed, remaining } = checkRateLimit(ip);
  if (!allowed) {
    res.status(429).json({
      error: "Rate limit exceeded. Sign up to continue searching.",
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    });
    return;
  }

  res.setHeader("X-RateLimit-Remaining", remaining.toString());

  logger.info({ ip, query, domain }, "citation simulate request");

  try {
    const result = await runCitationTest({ query, domain });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "citation simulate failed");
    res.status(500).json({ error: "Citation test failed" });
  }
});

export default router;
