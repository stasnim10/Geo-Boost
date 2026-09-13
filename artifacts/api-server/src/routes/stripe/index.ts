import { Router, type IRouter, type Request, type Response } from "express";
import Stripe from "stripe";
import { getAuth } from "@clerk/express";
import { db, subscriptionsTable } from "@workspace/db";
import { PLANS, type Plan } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

function getBaseUrl(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const first = domains.split(",")[0].trim();
    return `https://${first}`;
  }
  return "http://localhost:80";
}

function requireCheckoutUser(req: Request, res: Response): string | null {
  const clerkUserId = getAuth(req)?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "sign_in_required" });
    return null;
  }
  return clerkUserId;
}

function checkoutSuccessUrl(base: string): string {
  return `${base}/success?session_id={CHECKOUT_SESSION_ID}`;
}

function subscriptionMetadata(clerkUserId: string, plan: Plan) {
  return { clerkUserId, plan };
}

router.post("/create-checkout-session", async (req, res): Promise<void> => {
  try {
    const stripe = getStripe();
    const base = getBaseUrl();
    const clerkUserId = requireCheckoutUser(req, res);
    if (!clerkUserId) return;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            recurring: { interval: "month" },
            product_data: {
              name: "GEOboost Pro",
              description:
                "Monthly subscription — optimize your content to get cited by ChatGPT, Claude, and Perplexity.",
            },
            unit_amount: 14900,
          },
          quantity: 1,
        },
      ],
      client_reference_id: clerkUserId,
      metadata: subscriptionMetadata(clerkUserId, PLANS.GROW),
      subscription_data: { metadata: subscriptionMetadata(clerkUserId, PLANS.GROW) },
      success_url: checkoutSuccessUrl(base),
      cancel_url: `${base}/cancel`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      res.status(500).json({ error: "Stripe did not return a session URL" });
      return;
    }

    logger.info({ sessionId: session.id }, "Stripe checkout session created");
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Failed to create Stripe checkout session");
    res.status(500).json({
      error: "Could not create checkout session",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.post("/create-monitor-checkout", async (req, res): Promise<void> => {
  try {
    const stripe = getStripe();
    const base = getBaseUrl();
    const clerkUserId = requireCheckoutUser(req, res);
    if (!clerkUserId) return;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            recurring: { interval: "month" },
            product_data: {
              name: "Show me on AI — Monitor",
              description: "Weekly AI visibility re-audits, 5 tracked queries, email reports every Monday.",
            },
            unit_amount: 4900,
          },
          quantity: 1,
        },
      ],
      client_reference_id: clerkUserId,
      metadata: subscriptionMetadata(clerkUserId, PLANS.MONITOR),
      subscription_data: { metadata: subscriptionMetadata(clerkUserId, PLANS.MONITOR) },
      success_url: checkoutSuccessUrl(base),
      cancel_url: `${base}/pricing`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      res.status(500).json({ error: "Stripe did not return a session URL" });
      return;
    }

    logger.info({ sessionId: session.id }, "Monitor checkout session created");
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Failed to create Monitor checkout session");
    res.status(500).json({
      error: "Could not create checkout session",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.post("/create-monitor-annual-checkout", async (req, res): Promise<void> => {
  try {
    const stripe = getStripe();
    const base = getBaseUrl();
    const clerkUserId = requireCheckoutUser(req, res);
    if (!clerkUserId) return;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            recurring: { interval: "year" },
            product_data: {
              name: "Show me on AI — Monitor (Annual)",
              description: "Weekly AI visibility re-audits, 5 tracked queries, email reports. Billed annually — save 20%.",
            },
            unit_amount: 46800,
          },
          quantity: 1,
        },
      ],
      client_reference_id: clerkUserId,
      metadata: subscriptionMetadata(clerkUserId, PLANS.MONITOR),
      subscription_data: { metadata: subscriptionMetadata(clerkUserId, PLANS.MONITOR) },
      success_url: checkoutSuccessUrl(base),
      cancel_url: `${base}/pricing`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      res.status(500).json({ error: "Stripe did not return a session URL" });
      return;
    }

    logger.info({ sessionId: session.id }, "Monitor annual checkout session created");
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Failed to create Monitor annual checkout session");
    res.status(500).json({
      error: "Could not create checkout session",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.post("/create-grow-checkout", async (req, res): Promise<void> => {
  try {
    const stripe = getStripe();
    const base = getBaseUrl();
    const clerkUserId = requireCheckoutUser(req, res);
    if (!clerkUserId) return;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            recurring: { interval: "month" },
            product_data: {
              name: "Show me on AI — Grow",
              description: "3 domains, 20 tracked queries, competitor tracking, monthly PDF report.",
            },
            unit_amount: 14900,
          },
          quantity: 1,
        },
      ],
      client_reference_id: clerkUserId,
      metadata: subscriptionMetadata(clerkUserId, PLANS.GROW),
      subscription_data: { metadata: subscriptionMetadata(clerkUserId, PLANS.GROW) },
      success_url: checkoutSuccessUrl(base),
      cancel_url: `${base}/pricing`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      res.status(500).json({ error: "Stripe did not return a session URL" });
      return;
    }

    logger.info({ sessionId: session.id }, "Grow checkout session created");
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Failed to create Grow checkout session");
    res.status(500).json({
      error: "Could not create checkout session",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.post("/create-grow-annual-checkout", async (req, res): Promise<void> => {
  try {
    const stripe = getStripe();
    const base = getBaseUrl();
    const clerkUserId = requireCheckoutUser(req, res);
    if (!clerkUserId) return;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            recurring: { interval: "year" },
            product_data: {
              name: "Show me on AI — Grow (Annual)",
              description: "3 domains, 20 tracked queries, competitor tracking, monthly PDF report. Billed annually — save 20%.",
            },
            unit_amount: 142800,
          },
          quantity: 1,
        },
      ],
      client_reference_id: clerkUserId,
      metadata: subscriptionMetadata(clerkUserId, PLANS.GROW),
      subscription_data: { metadata: subscriptionMetadata(clerkUserId, PLANS.GROW) },
      success_url: checkoutSuccessUrl(base),
      cancel_url: `${base}/pricing`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      res.status(500).json({ error: "Stripe did not return a session URL" });
      return;
    }

    logger.info({ sessionId: session.id }, "Grow annual checkout session created");
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Failed to create Grow annual checkout session");
    res.status(500).json({
      error: "Could not create checkout session",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.post("/create-fix-checkout", async (req, res): Promise<void> => {
  try {
    const stripe = getStripe();
    const base = getBaseUrl();
    const clerkUserId = requireCheckoutUser(req, res);
    if (!clerkUserId) return;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "GEOboost Fix Package",
              description: "Complete AI visibility fix: JSON-LD schema markup, Google Business Profile copy, social media bios, and a full content brief.",
            },
            unit_amount: 4900,
          },
          quantity: 1,
        },
      ],
      client_reference_id: clerkUserId,
      metadata: subscriptionMetadata(clerkUserId, PLANS.FIX),
      success_url: checkoutSuccessUrl(base),
      cancel_url: `${base}/fix`,
    });

    if (!session.url) {
      res.status(500).json({ error: "Stripe did not return a session URL" });
      return;
    }

    logger.info({ sessionId: session.id }, "Fix package checkout session created");
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Failed to create fix checkout session");
    res.status(500).json({
      error: "Could not create checkout session",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

async function getBillingStatus(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "sign_in_required" });
    return;
  }

  try {
    const sessionId = typeof req.query.session_id === "string" ? req.query.session_id : null;
    let checkoutPaid = false;

    if (sessionId) {
      if (!sessionId.startsWith("cs_")) {
        res.status(400).json({ error: "invalid_checkout_session" });
        return;
      }

      const checkoutSession = await getStripe().checkout.sessions.retrieve(sessionId);
      if (checkoutSession.client_reference_id !== clerkUserId) {
        logger.warn(
          { sessionId, clerkUserId, checkoutOwner: checkoutSession.client_reference_id },
          "Billing status requested for checkout session owned by another user",
        );
        res.status(403).json({ error: "checkout_session_not_owned" });
        return;
      }
      checkoutPaid = checkoutSession.payment_status === "paid";
    }

    const rows = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.clerkUserId, clerkUserId))
      .limit(1);

    if (rows.length === 0) {
      res.json({
        plan: PLANS.FREE,
        status: "active",
        currentPeriodEnd: null,
        checkoutPaid,
        confirmed: false,
      });
      return;
    }

    const sub = rows[0];
    res.json({
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      stripeCustomerId: sub.stripeCustomerId,
      checkoutPaid,
      confirmed: checkoutPaid && sub.plan !== PLANS.FREE && (sub.status === "active" || sub.status === "trialing"),
    });
  } catch (err) {
    logger.error({ err, clerkUserId }, "Failed to fetch billing status");
    res.status(500).json({ error: "Could not fetch billing status" });
  }
}

router.get("/billing/status", getBillingStatus);

// Backward-compatible route for existing clients. New code should use /billing/status.
router.get("/subscription", getBillingStatus);

router.post("/billing/activation-timeout", async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = getAuth(req)?.userId;
  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : null;

  if (!clerkUserId || !sessionId) {
    res.status(400).json({ error: "invalid_activation_timeout_report" });
    return;
  }

  logger.error({ clerkUserId, sessionId }, "Billing activation exceeded confirmation window");
  res.status(204).end();
});

router.post("/portal", async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.clerkUserId, clerkUserId))
      .limit(1);

    const stripeCustomerId = rows[0]?.stripeCustomerId;

    if (!stripeCustomerId) {
      res.status(404).json({ error: "No billing account found. Please purchase a plan first." });
      return;
    }

    const stripe = getStripe();
    const base = getBaseUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${base}/dashboard`,
    });

    logger.info({ clerkUserId }, "Stripe billing portal session created");
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Failed to create billing portal session");
    res.status(500).json({
      error: "Could not open billing portal",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
