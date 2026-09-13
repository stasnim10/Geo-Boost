import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import healthRouter from "./routes/health";
import { stripeWebhookHandler } from "./routes/stripe/webhook";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the first proxy hop (Replit's nginx reverse proxy) so req.ip
// reflects the real client IP from x-forwarded-for rather than the proxy's IP.
// Setting this to 1 means only the last x-forwarded-for entry added by the
// trusted proxy is used — spoofed client-supplied headers are ignored.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Health check must be before Clerk middleware — no auth required
app.use("/api", healthRouter);

// Clerk proxy must be before body parsers — streams raw bytes
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Stripe webhook must be mounted with raw body BEFORE express.json()
// Stripe requires the raw request body for signature verification
// Mount on both paths: /api/stripe/webhook (canonical) and /api/webhook
// (legacy — some Stripe dashboard configs point here)
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
