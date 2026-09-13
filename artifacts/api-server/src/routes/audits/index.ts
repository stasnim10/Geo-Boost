import { Resvg } from "@resvg/resvg-js";
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
  const auditId = parseInt(String(req.params.id), 10);

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

function getAppUrl(req: Request): string {
  const replitDomains = process.env.REPLIT_DOMAINS;
  if (replitDomains) {
    return `https://${replitDomains.split(",")[0]}`;
  }
  return `${req.protocol}://${req.get("host") ?? "localhost"}`;
}

function scoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score: number): string {
  if (score >= 70) return "Good";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeSvgText(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function buildOgImageSvg(params: {
  domain: string;
  score: number;
  category: string;
  weakness: string;
}): string {
  const { score } = params;
  const color = scoreColor(score);
  const label = scoreLabel(score);

  const domain = escapeSvgText(truncate(params.domain, 32));
  const category = escapeSvgText(truncate(params.category, 28));

  const weaknessTruncated = truncate(params.weakness, 140);
  const weaknessWords = weaknessTruncated.split(" ");
  const line1 = escapeSvgText(weaknessWords.slice(0, 7).join(" "));
  const line2 = escapeSvgText(weaknessWords.slice(7, 14).join(" "));
  const line3 = escapeSvgText(weaknessWords.slice(14, 21).join(" "));

  const arcRadius = 80;
  const circumference = 2 * Math.PI * arcRadius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Decorative accent line at top -->
  <rect x="0" y="0" width="1200" height="4" fill="${color}"/>

  <!-- Left panel: score gauge area -->
  <rect x="60" y="80" width="380" height="470" rx="20" fill="url(#card)" stroke="#334155" stroke-width="1"/>

  <!-- Score circle track -->
  <circle cx="250" cy="260" r="${arcRadius}" fill="none" stroke="#334155" stroke-width="14"/>
  <!-- Score circle fill -->
  <circle cx="250" cy="260" r="${arcRadius}" fill="none" stroke="${color}" stroke-width="14"
    stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${dashOffset.toFixed(2)}"
    stroke-linecap="round" transform="rotate(-90 250 260)"/>

  <!-- Score number -->
  <text x="250" y="248" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="800" fill="white">${score}</text>
  <text x="250" y="275" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#94a3b8">out of 100</text>

  <!-- Label badge -->
  <rect x="200" y="300" width="100" height="28" rx="14" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1"/>
  <text x="250" y="319" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="${color}">${label}</text>

  <!-- AI Visibility label -->
  <text x="250" y="380" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#64748b" letter-spacing="1">AI VISIBILITY SCORE</text>

  <!-- Category -->
  <text x="250" y="415" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#94a3b8">${category}</text>

  <!-- Brand -->
  <text x="250" y="500" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" fill="#22c55e">Show me on AI</text>
  <text x="250" y="522" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#475569">showmeonai.com</text>

  <!-- Right panel -->
  <rect x="480" y="80" width="660" height="470" rx="20" fill="url(#card)" stroke="#334155" stroke-width="1"/>

  <!-- Domain -->
  <text x="810" y="155" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800" fill="white">${domain}</text>

  <!-- Headline -->
  <text x="810" y="195" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#94a3b8">AI Visibility Audit Report</text>

  <!-- Divider -->
  <line x1="540" y1="220" x2="1080" y2="220" stroke="#334155" stroke-width="1"/>

  <!-- Sub-scores -->
  <!-- Semantic Density label -->
  <text x="630" y="260" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#64748b">Semantic Density</text>
  <!-- Structural Formatting label -->
  <text x="990" y="260" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#64748b">Structural Formatting</text>

  <!-- Top weakness section -->
  <rect x="520" y="275" width="580" height="180" rx="12" fill="#1a0505" stroke="#7f1d1d" stroke-width="1"/>
  <rect x="520" y="275" width="4" height="180" rx="2" fill="#ef4444"/>

  <text x="548" y="305" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#ef4444" letter-spacing="0.8">TOP ISSUE FOUND</text>
  <text x="548" y="332" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#fca5a5">${line1}</text>
  ${line2 ? `<text x="548" y="356" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#fca5a5">${line2}</text>` : ""}
  ${line3 ? `<text x="548" y="380" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#fca5a5">${line3}</text>` : ""}

  <!-- CTA -->
  <rect x="575" y="478" width="470" height="52" rx="10" fill="${color}"/>
  <text x="810" y="510" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="700" fill="white">Run a Free AI Visibility Audit &#x2192;</text>
</svg>`;
}

function buildOgHtml(params: {
  token: string;
  domain: string;
  score: number;
  category: string;
  weakness: string;
  appUrl: string;
}): string {
  const { token, score, appUrl } = params;

  const domain = truncate(params.domain, 100);
  const weakness = truncate(params.weakness, 200);

  const label = scoreLabel(score);
  const rawTitle = `${domain} scored ${score}/100 on AI Visibility`;
  const rawDescription = `${label} — Top issue: ${weakness}. See the full report and fix how AI assistants like ChatGPT and Perplexity recommend your business.`;

  const title = escapeHtml(rawTitle);
  const description = escapeHtml(rawDescription);
  const ogImageUrl = escapeHtml(`${appUrl}/api/audits/shared/${token}/og-image`);
  const spaUrl = escapeHtml(`${appUrl}/shared/${token}`);
  const rawSpaUrl = `${appUrl}/shared/${token}`;
  const pageUrl = escapeHtml(`${appUrl}/api/audits/shared/${token}`);
  const domainEscaped = escapeHtml(domain);

  const scoreColorHex = scoreColor(score);
  const scoreLabelText = escapeHtml(label);
  const scoreBadgeBg = score >= 70 ? "#dcfce7" : score >= 40 ? "#fef3c7" : "#fee2e2";
  const scoreBadgeText = score >= 70 ? "#15803d" : score >= 40 ? "#b45309" : "#b91c1c";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="AI Visibility score card for ${domainEscaped}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:site_name" content="Show me on AI" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
  <meta name="twitter:image:alt" content="AI Visibility score card for ${domainEscaped}" />

  <!-- Canonical & description -->
  <link rel="canonical" href="${spaUrl}" />
  <meta name="description" content="${description}" />

  <!-- Redirect real visitors to the interactive SPA page -->
  <meta http-equiv="refresh" content="0; url=${spaUrl}" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    body {
      min-height: 100vh;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 40px 48px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.5);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 28px;
    }
    .brand-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22c55e;
      flex-shrink: 0;
    }
    .brand-name {
      font-size: 14px;
      font-weight: 700;
      color: #22c55e;
      letter-spacing: 0.02em;
    }
    .score-ring {
      position: relative;
      width: 120px;
      height: 120px;
      margin: 0 auto 20px;
    }
    .score-ring svg { transform: rotate(-90deg); }
    .score-value {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .score-number {
      font-size: 36px;
      font-weight: 800;
      color: #fff;
      line-height: 1;
    }
    .score-out {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 20px;
      background: ${scoreBadgeBg};
      color: ${scoreBadgeText};
    }
    .domain {
      font-size: 18px;
      font-weight: 800;
      color: #f1f5f9;
      margin-bottom: 4px;
      word-break: break-all;
    }
    .category {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 28px;
    }
    .loading-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #94a3b8;
      font-size: 13px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid #334155;
      border-top-color: #22c55e;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    .skip-link {
      display: block;
      margin-top: 20px;
      font-size: 12px;
      color: #475569;
    }
    .skip-link a { color: #22c55e; text-decoration: none; }
    .skip-link a:hover { text-decoration: underline; }
  </style>
  <script>window.location.replace(${JSON.stringify(rawSpaUrl)});</script>
</head>
<body>
  <div class="card">
    <div class="brand">
      <span class="brand-dot"></span>
      <span class="brand-name">Show me on AI</span>
    </div>

    <div class="score-ring">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#334155" stroke-width="10"/>
        <circle cx="60" cy="60" r="50" fill="none" stroke="${scoreColorHex}" stroke-width="10"
          stroke-dasharray="${(2 * Math.PI * 50).toFixed(2)}"
          stroke-dashoffset="${((2 * Math.PI * 50) * (1 - Math.max(0, Math.min(100, score)) / 100)).toFixed(2)}"
          stroke-linecap="round"/>
      </svg>
      <div class="score-value">
        <span class="score-number">${score}</span>
        <span class="score-out">/ 100</span>
      </div>
    </div>

    <div class="badge">${scoreLabelText}</div>

    <div class="domain">${domainEscaped}</div>
    <div class="category">AI Visibility Report</div>

    <div class="loading-row">
      <div class="spinner"></div>
      <span>Loading your full report…</span>
    </div>

    <div class="skip-link">
      Not redirecting? <a href="${spaUrl}">Open report</a>
    </div>
  </div>
</body>
</html>`;
}

router.get("/audits/shared/:token/og-image", async (req: Request, res: Response): Promise<void> => {
  const tokenStr = String(req.params.token ?? "");
  if (!tokenStr || !/^[0-9a-f-]{36}$/.test(tokenStr)) {
    res.status(400).send("Invalid token");
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(sharedResultsTable)
      .where(eq(sharedResultsTable.token, tokenStr))
      .limit(1);

    if (!row) {
      res.status(404).send("Not found");
      return;
    }

    let domain = row.url;
    try { domain = new URL(row.url.startsWith("http") ? row.url : `https://${row.url}`).hostname.replace(/^www\./, ""); } catch { /* keep */ }

    const weakness = Array.isArray(row.weaknesses) && row.weaknesses.length > 0
      ? String(row.weaknesses[0])
      : "No specific issues detected.";

    const svg = buildOgImageSvg({
      domain,
      score: row.aiVisibilityScore,
      category: row.category,
      weakness,
    });

    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(pngBuffer);
  } catch (err) {
    logger.error({ err }, "Failed to generate OG image");
    res.status(500).send("Error generating image");
  }
});

router.get("/audits/shared/:token", async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;

  const tokenStr = String(token);
  if (!tokenStr || !/^[0-9a-f-]{36}$/.test(tokenStr)) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(sharedResultsTable)
      .where(eq(sharedResultsTable.token, tokenStr))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Share link not found" });
      return;
    }

    const acceptHeader = req.get("Accept") ?? "";
    const wantsHtml = acceptHeader.includes("text/html") && !acceptHeader.includes("application/json");

    if (wantsHtml) {
      let domain = row.url;
      try { domain = new URL(row.url.startsWith("http") ? row.url : `https://${row.url}`).hostname.replace(/^www\./, ""); } catch { /* keep */ }

      const weakness = Array.isArray(row.weaknesses) && row.weaknesses.length > 0
        ? String(row.weaknesses[0])
        : "No specific issues detected.";

      const appUrl = getAppUrl(req);
      const html = buildOgHtml({
        token: tokenStr,
        domain,
        score: row.aiVisibilityScore,
        category: row.category,
        weakness,
        appUrl,
      });

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(html);
      return;
    }

    res.json({
      url: row.url,
      category: row.category,
      aiVisibilityScore: row.aiVisibilityScore,
      semanticDensityScore: row.semanticDensityScore,
      structuralFormattingScore: row.structuralFormattingScore,
      aiCitationScore: row.aiCitationScore ?? null,
      weaknesses: row.weaknesses,
      competitorPatterns: row.competitorPatterns,
      citationResults: row.citationResults ?? null,
      createdAt: row.createdAt,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch shared result");
    res.status(500).json({ error: "Failed to load shared results" });
  }
});

export { requireAuth };
export default router;
