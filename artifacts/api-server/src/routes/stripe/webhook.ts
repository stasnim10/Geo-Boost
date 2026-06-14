import type { Request, Response } from "express";
import Stripe from "stripe";
import { db, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { invalidatePlanCache } from "../../lib/plan-check";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

type Plan = "free" | "fix" | "monitor" | "grow";
type Status = "active" | "cancelled" | "past_due" | "trialing";

function mapStripeStatus(stripeStatus: string): Status {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "trialing":
      return "trialing";
    case "canceled":
    case "cancelled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return "cancelled";
    default:
      return "active";
  }
}

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET is not set");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (!sig) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err) {
    logger.warn({ err }, "Stripe webhook signature verification failed");
    res.status(400).json({ error: "Webhook signature verification failed" });
    return;
  }

  logger.info({ type: event.type, id: event.id }, "Stripe webhook received");

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkUserId = session.metadata?.clerkUserId;

        if (!clerkUserId) {
          logger.warn({ sessionId: session.id }, "checkout.session.completed: no clerkUserId in metadata, skipping");
          break;
        }

        const customerId = typeof session.customer === "string" ? session.customer : null;

        if (session.mode === "payment") {
          await db
            .insert(subscriptionsTable)
            .values({
              clerkUserId,
              stripeCustomerId: customerId,
              stripePriceId: null,
              plan: "fix",
              status: "active",
              currentPeriodEnd: null,
            })
            .onConflictDoUpdate({
              target: subscriptionsTable.clerkUserId,
              set: {
                stripeCustomerId: customerId,
                stripePriceId: null,
                plan: "fix",
                status: "active",
                currentPeriodEnd: null,
                updatedAt: new Date(),
              },
            });

          invalidatePlanCache(clerkUserId);
          logger.info({ clerkUserId, sessionId: session.id }, "Fix package subscription upserted");
        } else if (session.mode === "subscription") {
          const plan: Plan = (session.metadata?.plan as Plan) ?? "free";
          let currentPeriodEnd: Date | null = null;
          let stripePriceId: string | null = null;

          if (session.subscription) {
            const subscriptionId = typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
            const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
            const periodEnd = stripeSub.items.data[0]?.current_period_end;
            currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : null;
            stripePriceId = stripeSub.items.data[0]?.price?.id ?? null;
          }

          await db
            .insert(subscriptionsTable)
            .values({
              clerkUserId,
              stripeCustomerId: customerId,
              stripePriceId,
              plan,
              status: "active",
              currentPeriodEnd,
            })
            .onConflictDoUpdate({
              target: subscriptionsTable.clerkUserId,
              set: {
                stripeCustomerId: customerId,
                stripePriceId,
                plan,
                status: "active",
                currentPeriodEnd,
                updatedAt: new Date(),
              },
            });

          invalidatePlanCache(clerkUserId);
          logger.info({ clerkUserId, plan, sessionId: session.id }, "Subscription upserted from checkout");
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
        if (!customerId) break;

        const invoiceSub = invoice.parent?.type === "subscription_details"
          ? invoice.parent.subscription_details?.subscription
          : null;
        const subscriptionId = typeof invoiceSub === "string"
          ? invoiceSub
          : invoiceSub?.id ?? null;
        if (!subscriptionId) break;

        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEndTs = stripeSub.items.data[0]?.current_period_end;
        const currentPeriodEnd = periodEndTs ? new Date(periodEndTs * 1000) : null;

        const updated = await db
          .update(subscriptionsTable)
          .set({ currentPeriodEnd, updatedAt: new Date() })
          .where(eq(subscriptionsTable.stripeCustomerId, customerId))
          .returning({ clerkUserId: subscriptionsTable.clerkUserId });

        for (const row of updated) invalidatePlanCache(row.clerkUserId);
        logger.info({ customerId, updatedCount: updated.length }, "invoice.paid: refreshed currentPeriodEnd");
        break;
      }

      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const customerId = typeof stripeSub.customer === "string" ? stripeSub.customer : null;
        if (!customerId) break;

        const status = mapStripeStatus(stripeSub.status);
        const subPeriodEnd = stripeSub.items.data[0]?.current_period_end;
        const currentPeriodEnd = subPeriodEnd ? new Date(subPeriodEnd * 1000) : null;

        const updated = await db
          .update(subscriptionsTable)
          .set({ status, currentPeriodEnd, updatedAt: new Date() })
          .where(eq(subscriptionsTable.stripeCustomerId, customerId))
          .returning({ clerkUserId: subscriptionsTable.clerkUserId });

        for (const row of updated) invalidatePlanCache(row.clerkUserId);
        logger.info({ customerId, status, updatedCount: updated.length }, "customer.subscription.updated: synced status");
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const customerId = typeof stripeSub.customer === "string" ? stripeSub.customer : null;
        if (!customerId) break;

        const updated = await db
          .update(subscriptionsTable)
          .set({ status: "cancelled", plan: "free", updatedAt: new Date() })
          .where(eq(subscriptionsTable.stripeCustomerId, customerId))
          .returning({ clerkUserId: subscriptionsTable.clerkUserId });

        for (const row of updated) invalidatePlanCache(row.clerkUserId);
        logger.info({ customerId, updatedCount: updated.length }, "customer.subscription.deleted: downgraded to free");
        break;
      }

      default:
        logger.info({ type: event.type }, "Unhandled Stripe webhook event type");
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err, eventType: event.type }, "Error handling Stripe webhook event");
    res.status(500).json({ error: "Webhook handler failed" });
  }
}
