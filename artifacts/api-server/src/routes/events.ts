import { Router, type IRouter } from "express";
import { db, eventsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/events", async (req, res): Promise<void> => {
  // Analytics must NEVER block or fail a user action.
  // Always return 204 — even if the DB is down or the payload is invalid.
  // Validation and insertion both happen after the response is sent.
  try {
    const { event, properties, session_id } = req.body as {
      event?: unknown;
      properties?: unknown;
      session_id?: unknown;
    };

    if (typeof event !== "string" || !event.trim() || event.length > 100) {
      // Silently swallow bad payloads rather than returning 400 —
      // a 400 from the client-side fire-and-forget trackEvent() would
      // be logged as an error, but there's nothing the user can do about it.
      res.status(204).end();
      return;
    }

    const safeProps =
      properties !== null && typeof properties === "object" && !Array.isArray(properties)
        ? (properties as Record<string, unknown>)
        : {};

    const safeSessionId =
      typeof session_id === "string" && session_id.length <= 200
        ? session_id
        : null;

    // Fire-and-forget — never block the response on the insert
    db.insert(eventsTable)
      .values({ event: event.trim(), properties: safeProps, sessionId: safeSessionId })
      .catch((err) => logger.warn({ err, event }, "Failed to insert analytics event"));
  } catch (err) {
    // Catch-all: if anything above throws unexpectedly, swallow it silently.
    // The response below is still 204 — analytics failures must not surface to users.
    logger.warn({ err }, "Unexpected error in /events handler — swallowed");
  }

  res.status(204).end();
});

export default router;
