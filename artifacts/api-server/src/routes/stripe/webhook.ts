import type { Request, Response } from "express";
import Stripe from "stripe";
import { Resend } from "resend";
import { db, stripeWebhookEventsTable, subscriptionsTable } from "@workspace/db";
import {
  PLANS,
  type Plan,
  type SubscriptionStatus,
  isPlan,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { invalidatePlanCache } from "../../lib/plan-check";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

function getAppUrl(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const first = domains.split(",")[0].trim();
    return `https://${first}`;
  }
  return "http://localhost:80";
}

function buildPastDueEmail(opts: { email: string; dashboardUrl: string }): string {
  const { dashboardUrl } = opts;
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;max-width:560px;">
        <tr>
          <td style="background:#0f172a;padding:24px 32px;text-align:center;">
            <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Show me on AI</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
              <div style="font-size:28px;margin-bottom:8px;">⚠️</div>
              <div style="font-size:18px;font-weight:700;color:#991b1b;margin-bottom:4px;">Payment failed — action needed</div>
              <div style="font-size:13px;color:#b91c1c;">Your subscription renewal could not be processed.</div>
            </div>

            <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 16px;">
              We tried to renew your subscription but the charge was unsuccessful. To keep your access uninterrupted, please update your payment method as soon as possible.
            </p>
            <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 28px;">
              If your payment isn't updated soon, your plan will be downgraded and you'll lose access to your tracked queries and weekly reports.
            </p>

            <div style="text-align:center;margin-bottom:28px;">
              <a href="${dashboardUrl}" style="display:inline-block;background:#22c55e;color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                Update payment method →
              </a>
            </div>

            <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;font-size:13px;color:#64748b;line-height:1.6;">
              <strong style="color:#0f172a;">How to fix this:</strong><br>
              1. Click the button above to go to your dashboard<br>
              2. Click <strong>Manage billing</strong> on the billing card<br>
              3. Update your payment details in the secure Stripe portal
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
            <p style="font-size:12px;color:#94a3b8;margin:0;">
              You're receiving this because your Show me on AI subscription payment failed.<br>
              Questions? Reply to this email and we'll help.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendPastDueWarning(opts: {
  toEmail: string;
  clerkUserId: string;
  customerId: string;
}): Promise<void> {
  const { toEmail, clerkUserId, customerId } = opts;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn({ clerkUserId, customerId }, "RESEND_API_KEY not set — skipping past_due warning email");
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "Show me on AI <onboarding@resend.dev>";
  const dashboardUrl = `${getAppUrl()}/dashboard`;

  const { error } = await resend.emails.send({
    from,
    to: [toEmail],
    subject: "Action needed: your subscription payment failed",
    html: buildPastDueEmail({ email: toEmail, dashboardUrl }),
  });

  if (error) {
    logger.error({ error, clerkUserId, customerId }, "Failed to send past_due warning email");
  } else {
    logger.info({ clerkUserId, customerId, toEmail }, "Sent past_due warning email");
  }
}

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
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

async function resolveClerkUserId(opts: {
  clientReferenceId?: string | null;
  metadataClerkUserId?: string | null;
  stripeCustomerId?: string | null;
  eventId: string;
}): Promise<string | null> {
  if (opts.clientReferenceId) return opts.clientReferenceId;
  if (opts.metadataClerkUserId) return opts.metadataClerkUserId;

  if (opts.stripeCustomerId) {
    const rows = await db
      .select({ clerkUserId: subscriptionsTable.clerkUserId })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.stripeCustomerId, opts.stripeCustomerId))
      .limit(1);
    if (rows[0]?.clerkUserId) return rows[0].clerkUserId;
  }

  logger.warn(
    { eventId: opts.eventId, stripeCustomerId: opts.stripeCustomerId },
    "Stripe webhook could not resolve a Clerk user; email matching is intentionally not used",
  );
  return null;
}

async function markEventProcessed(event: Stripe.Event): Promise<void> {
  await db
    .insert(stripeWebhookEventsTable)
    .values({ eventId: event.id, eventType: event.type })
    .onConflictDoNothing();
}

export async function stripeWebhookHandler(
  req: Request,
  res: Response,
  opts: { legacyPath?: boolean } = {},
): Promise<void> {
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

  if (opts.legacyPath) {
    logger.warn({ eventId: event.id, eventType: event.type }, "Stripe webhook received through legacy /api/webhook alias");
  }

  const processed = await db
    .select({ eventId: stripeWebhookEventsTable.eventId })
    .from(stripeWebhookEventsTable)
    .where(eq(stripeWebhookEventsTable.eventId, event.id))
    .limit(1);
  if (processed.length > 0) {
    logger.info({ eventId: event.id, eventType: event.type }, "Duplicate Stripe webhook event ignored");
    res.json({ received: true, duplicate: true });
    return;
  }

  logger.info({ type: event.type, id: event.id }, "Stripe webhook received");

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === "string" ? session.customer : null;
        const clerkUserId = await resolveClerkUserId({
          clientReferenceId: session.client_reference_id,
          metadataClerkUserId: session.metadata?.clerkUserId,
          stripeCustomerId: customerId,
          eventId: event.id,
        });

        if (!clerkUserId) {
          throw new Error(`Unable to resolve Clerk user for checkout session ${session.id}`);
        }

        if (session.mode === "payment") {
          const upserted = await db
            .insert(subscriptionsTable)
            .values({
              clerkUserId,
              stripeCustomerId: customerId,
              stripePriceId: null,
              plan: PLANS.FIX,
              status: "active",
              currentPeriodEnd: null,
            })
            .onConflictDoUpdate({
              target: subscriptionsTable.clerkUserId,
              set: {
                stripeCustomerId: customerId,
                stripePriceId: null,
                plan: PLANS.FIX,
                status: "active",
                currentPeriodEnd: null,
                updatedAt: new Date(),
              },
            })
            .returning({ clerkUserId: subscriptionsTable.clerkUserId });

          if (upserted.length === 0) {
            throw new Error(`Fix checkout session ${session.id} did not update a subscription row`);
          }

          invalidatePlanCache(clerkUserId);
          logger.info(
            { eventId: event.id, clerkUserId, sessionId: session.id, rowsAffected: 1 },
            "Fix package subscription upserted",
          );
        } else if (session.mode === "subscription") {
          const rawPlan = session.metadata?.plan;
          if (!isPlan(rawPlan) || rawPlan === PLANS.FREE) {
            throw new Error(`Checkout session ${session.id} has an invalid paid plan`);
          }
          const plan: Plan = rawPlan;
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

          const upserted = await db
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
            })
            .returning({ clerkUserId: subscriptionsTable.clerkUserId });

          if (upserted.length === 0) {
            throw new Error(`Subscription checkout session ${session.id} did not update a subscription row`);
          }

          invalidatePlanCache(clerkUserId);
          logger.info(
            { eventId: event.id, clerkUserId, plan, sessionId: session.id, rowsAffected: 1 },
            "Subscription upserted from checkout",
          );
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

        if (updated.length === 0) {
          throw new Error(`invoice.paid could not find a subscription for customer ${customerId}`);
        }
        for (const row of updated) invalidatePlanCache(row.clerkUserId);
        logger.info({ eventId: event.id, customerId, clerkUserId: updated[0].clerkUserId, rowsAffected: updated.length }, "invoice.paid: refreshed currentPeriodEnd");
        break;
      }

      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const customerId = typeof stripeSub.customer === "string" ? stripeSub.customer : null;
        if (!customerId) break;

        const previousAttributes = event.data.previous_attributes as Record<string, unknown> | undefined;
        const previousStatus = previousAttributes?.status as string | undefined;
        const newStatus = stripeSub.status;

        const status = mapStripeStatus(newStatus);
        const subPeriodEnd = stripeSub.items.data[0]?.current_period_end;
        const currentPeriodEnd = subPeriodEnd ? new Date(subPeriodEnd * 1000) : null;

        const updated = await db
          .update(subscriptionsTable)
          .set({ status, currentPeriodEnd, updatedAt: new Date() })
          .where(eq(subscriptionsTable.stripeCustomerId, customerId))
          .returning({ clerkUserId: subscriptionsTable.clerkUserId });

        if (updated.length === 0) {
          throw new Error(`customer.subscription.updated could not find a subscription for customer ${customerId}`);
        }
        for (const row of updated) invalidatePlanCache(row.clerkUserId);
        logger.info({ eventId: event.id, customerId, clerkUserId: updated[0].clerkUserId, status, rowsAffected: updated.length }, "customer.subscription.updated: synced status");

        if (newStatus === "past_due" && previousStatus !== "past_due") {
          const stripe = getStripe();
          try {
            const customer = await stripe.customers.retrieve(customerId);
            const customerEmail = !customer.deleted && customer.email ? customer.email : null;
            if (customerEmail && updated.length > 0) {
              await sendPastDueWarning({
                toEmail: customerEmail,
                clerkUserId: updated[0].clerkUserId,
                customerId,
              });
            } else {
              logger.warn({ customerId }, "past_due transition: no email found on Stripe customer, skipping warning");
            }
          } catch (emailErr) {
            logger.error({ emailErr, customerId }, "past_due transition: failed to fetch customer or send warning email");
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const customerId = typeof stripeSub.customer === "string" ? stripeSub.customer : null;
        if (!customerId) break;

        const updated = await db
          .update(subscriptionsTable)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(subscriptionsTable.stripeCustomerId, customerId))
          .returning({ clerkUserId: subscriptionsTable.clerkUserId });

        if (updated.length === 0) {
          throw new Error(`customer.subscription.deleted could not find a subscription for customer ${customerId}`);
        }
        for (const row of updated) invalidatePlanCache(row.clerkUserId);
        logger.info({ eventId: event.id, customerId, clerkUserId: updated[0].clerkUserId, rowsAffected: updated.length }, "customer.subscription.deleted: marked cancelled");
        break;
      }

      default:
        logger.info({ type: event.type }, "Unhandled Stripe webhook event type");
    }

    await markEventProcessed(event);
    res.json({ received: true });
  } catch (err) {
    logger.error({ err, eventType: event.type }, "Error handling Stripe webhook event");
    res.status(500).json({ error: "Webhook handler failed" });
  }
}
