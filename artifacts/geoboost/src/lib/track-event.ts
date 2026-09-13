/**
 * Lightweight funnel analytics helper.
 * - Generates/retrieves an anonymous session ID from sessionStorage (no PII stored).
 * - Logs to the console in development.
 * - POSTs to /api/events in all environments (fire-and-forget; never throws).
 *
 * Rules for callers:
 *   - Never pass email addresses, names, or any other PII as properties.
 *   - Domain (public website URL) is acceptable.
 */
function getSessionId(): string {
  try {
    let id = sessionStorage.getItem("_geo_sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("_geo_sid", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function trackEvent(
  name: string,
  props: Record<string, unknown> = {},
): void {
  if (import.meta.env.DEV) {
    console.log("[analytics]", name, props);
  }

  const sessionId = getSessionId();

  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: name, properties: props, session_id: sessionId }),
    keepalive: true,
  }).catch(() => {
    /* fire-and-forget — never propagate errors */
  });
}
