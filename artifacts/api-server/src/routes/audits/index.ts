import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, auditsTable, sharedResultsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as Request & { userId: string }).userId = userId;
  next();
}

router.get("/audits", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const audits = await db
    .select()
    .from(auditsTable)
    .where(eq(auditsTable.clerkUserId, userId))
    .orderBy(desc(auditsTable.createdAt));
  res.json(audits);
});

router.post("/audits/:id/share", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const auditId = parseInt(req.params.id, 10);

  if (isNaN(auditId)) {
    res.status(400).json({ error: "Invalid audit ID" });
    return;
  }

  try {
    const [audit] = await db
      .select()
      .from(auditsTable)
      .where(eq(auditsTable.id, auditId))
      .limit(1);

    if (!audit) {
      res.status(404).json({ error: "Audit not found" });
      return;
    }

    if (audit.clerkUserId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [row] = await db
      .insert(sharedResultsTable)
      .values({
        url: audit.url,
        category: audit.category,
        aiVisibilityScore: audit.aiVisibilityScore,
        semanticDensityScore: audit.semanticDensityScore,
        structuralFormattingScore: audit.structuralFormattingScore,
        weaknesses: audit.weaknesses,
        competitorPatterns: audit.competitorPatterns,
      })
      .returning({ token: sharedResultsTable.token });

    req.log.info({ token: row.token, auditId }, "Share token created for audit");
    res.json({ token: row.token });
  } catch (err) {
    logger.error({ err }, "Failed to create share token");
    res.status(500).json({ error: "Failed to create share link" });
  }
});

router.get("/audits/shared/:token", async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;

  if (!token || !/^[0-9a-f-]{36}$/.test(token)) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(sharedResultsTable)
      .where(eq(sharedResultsTable.token, token))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Share link not found" });
      return;
    }

    res.json({
      url: row.url,
      category: row.category,
      aiVisibilityScore: row.aiVisibilityScore,
      semanticDensityScore: row.semanticDensityScore,
      structuralFormattingScore: row.structuralFormattingScore,
      weaknesses: row.weaknesses,
      competitorPatterns: row.competitorPatterns,
      createdAt: row.createdAt,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch shared result");
    res.status(500).json({ error: "Failed to load shared results" });
  }
});

export { requireAuth };
export default router;
