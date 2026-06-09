import app from "./app";
import { logger } from "./lib/logger";
import { runStartupCatchup } from "./routes/monitor/index";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const OPTIONAL_ENV_VARS = [
  { key: "RESEND_API_KEY", feature: "email delivery (weekly reports and audit results)" },
  { key: "RESEND_FROM_EMAIL", feature: "branded email sender address" },
  { key: "STRIPE_WEBHOOK_SECRET", feature: "Stripe webhook signature verification" },
];

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  for (const { key, feature } of OPTIONAL_ENV_VARS) {
    if (!process.env[key]) {
      logger.warn({ envVar: key }, `Optional env var ${key} is not set — ${feature} will be disabled`);
    }
  }

  setTimeout(() => {
    runStartupCatchup().catch(err => logger.error({ err }, "Startup catch-up failed"));
  }, 5000);
});
