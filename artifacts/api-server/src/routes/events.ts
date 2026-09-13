import { Router, type IRouter } from "express";
import { db, eventsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/events", async (req, res): Promise<void> => {
  const { event, properties, session_id } = req.body as {
    event?: unknown;
    properties?: unknown;
    session_id?: unknown;
  };

  if (typeof event !== "string" || !event.trim() || event.length > 100) {
    res.status(400).json({ error: "Invalid event payload" });
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

  res.status(204).end();
});

export default router;
