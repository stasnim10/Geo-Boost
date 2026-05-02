import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, auditsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

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

export { requireAuth };
export default router;
