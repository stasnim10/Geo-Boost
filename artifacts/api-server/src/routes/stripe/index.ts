import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2025-04-30.basil" });
}

function getBaseUrl(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const first = domains.split(",")[0].trim();
    return `https://${first}`;
  }
  return "http://localhost:80";
}

router.post("/create-checkout-session", async (req, res): Promise<void> => {
  try {
    const stripe = getStripe();
    const base = getBaseUrl();

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
      success_url: `${base}/success`,
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

router.post("/create-fix-checkout", async (req, res): Promise<void> => {
  try {
    const stripe = getStripe();
    const base = getBaseUrl();

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
      success_url: `${base}/fix-success`,
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

export default router;
