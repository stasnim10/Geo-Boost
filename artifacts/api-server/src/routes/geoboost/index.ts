import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { Resend } from "resend";
import { RunAuditBody, OptimizeContentBody, DetectCategoryBody } from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, auditsTable, sharedResultsTable, waitlistTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { parseLLMJson } from "../../lib/parse-llm-json";
import { requirePlan } from "../../lib/plan-check";

const router: IRouter = Router();

const CATEGORY_RULES: { patterns: RegExp[]; label: string; confidence: "high" | "low" }[] = [
  { patterns: [/coffee|cafe|caf[eé]|espresso|latte|brew|roast|barista/], label: "Coffee Shop / Café", confidence: "high" },
  { patterns: [/restaurant|bistro|eatery|grill|kitchen|burger|pizza|sushi|taco|ramen|bbq|steakhouse|dining/], label: "Restaurant", confidence: "high" },
  { patterns: [/bakery|bake|pastry|cake|cookie|bread|patisserie/], label: "Bakery", confidence: "high" },
  { patterns: [/brewery|craft.?beer|taproom|distillery|winery/], label: "Bar / Brewery", confidence: "high" },
  { patterns: [/dental|dentist|orthodont|tooth|teeth|smile/], label: "Dental Practice", confidence: "high" },
  { patterns: [/medical|physician|urgent.?care|chiropractic|chiropractor|physical.?therapy|optometry/], label: "Medical / Healthcare", confidence: "high" },
  { patterns: [/therapy|therapist|counseling|counselor|mental.?health|psychology|psychiatry/], label: "Medical / Healthcare", confidence: "high" },
  { patterns: [/attorney|lawyer|law.?firm|legal.?services|litigation|paralegal/], label: "Law Firm", confidence: "high" },
  { patterns: [/plumbing|plumber|hvac|heating|cooling|electrical|contractor|roofing|landscaping|pest.?control|handyman/], label: "Home Services", confidence: "high" },
  { patterns: [/real.?estate|realtor|realty|property.?management|mortgage|homes.?for.?sale/], label: "Real Estate", confidence: "high" },
  { patterns: [/hotel|motel|resort|lodge|hostel|bed.?and.?breakfast|vacation.?rental/], label: "Hotel / Hospitality", confidence: "high" },
  { patterns: [/gym|fitness|yoga|crossfit|pilates|personal.?train|sport|wellness.?center/], label: "Fitness / Wellness", confidence: "high" },
  { patterns: [/salon|hair.?salon|barbershop|nail.?salon|day.?spa|beauty/], label: "Salon / Beauty", confidence: "high" },
  { patterns: [/digital.?marketing|marketing.?agency|seo.?agency|advertising.?agency|creative.?agency/], label: "Marketing Agency", confidence: "high" },
  { patterns: [/consulting|management.?consulting|business.?consultant|strategy.?consultant/], label: "Consulting", confidence: "high" },
  { patterns: [/accounting|bookkeeping|cpa|tax.?preparation|payroll|financial.?advisor/], label: "Accounting / Finance", confidence: "high" },
  { patterns: [/saas|software.?as.?a.?service|b2b.?software|enterprise.?software|cloud.?platform/], label: "B2B SaaS / Tech", confidence: "high" },
  { patterns: [/ecommerce|e-commerce|online.?store|shopify|woocommerce/], label: "Retail / E-Commerce", confidence: "high" },
  { patterns: [/auto.?repair|mechanic|car.?dealership|tire.?shop|auto.?body/], label: "Auto Services", confidence: "high" },
  { patterns: [/veterinary|animal.?hospital|pet.?clinic|dog.?grooming/], label: "Veterinary / Pet Services", confidence: "high" },
  { patterns: [/cleaning.?service|maid.?service|janitorial|house.?cleaning/], label: "Cleaning Services", confidence: "high" },
  { patterns: [/photography|photographer|videography|videographer|portrait.?studio|wedding.?photo/], label: "Photography / Videography", confidence: "high" },
  { patterns: [/moving.?company|moving.?service|storage.?unit|relocation/], label: "Moving / Logistics", confidence: "high" },
  { patterns: [/insurance.?agency|life.?insurance|auto.?insurance|health.?insurance/], label: "Insurance", confidence: "high" },
  { patterns: [/food|eat|dine|menu|chef|cuisine|catering/], label: "Restaurant", confidence: "low" },
  { patterns: [/health|clinic|care|doctor|medical/], label: "Medical / Healthcare", confidence: "low" },
  { patterns: [/tech|software|app|platform|digital|cloud|api|solution/], label: "B2B SaaS / Tech", confidence: "low" },
  { patterns: [/shop|store|buy|product|brand|retail/], label: "Retail / E-Commerce", confidence: "low" },
  { patterns: [/market|agency|creative|design|brand/], label: "Marketing Agency", confidence: "low" },
];

function detectCategoryFromText(text: string): { category: string | null; confidence: "high" | "low" } {
  const lower = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.confidence === "high" && rule.patterns.some(p => p.test(lower))) {
      return { category: rule.label, confidence: "high" };
    }
  }
  for (const rule of CATEGORY_RULES) {
    if (rule.confidence === "low" && rule.patterns.some(p => p.test(lower))) {
      return { category: rule.label, confidence: "low" };
    }
  }
  return { category: null, confidence: "low" };
}

interface ScrapeResult {
  text: string;
  listCount: number;
  hasShortAnswerSections: boolean;
  partial?: boolean;
}

async function scrapeUrlFull(url: string): Promise<ScrapeResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GEOboost/1.0; +https://geoboost.app)" },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    logger.warn({ err, url }, "scrapeUrlFull: network error, returning partial result");
    return { text: "", listCount: 0, hasShortAnswerSections: false, partial: true };
  }
  if (!response.ok) {
    logger.warn({ url, status: response.status }, "scrapeUrlFull: non-2xx response, returning partial result");
    return { text: "", listCount: 0, hasShortAnswerSections: false, partial: true };
  }
  const html = await response.text();

  const listMatches = html.match(/<(ul|ol|li)[^>]*>/gi);
  const listCount = listMatches ? listMatches.length : 0;

  const paragraphRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let hasShortAnswerSections = false;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = paragraphRe.exec(html)) !== null) {
    const text = pMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 30 && wordCount <= 200) {
      hasShortAnswerSections = true;
      break;
    }
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim().slice(0, 8000);

  return { text, listCount, hasShortAnswerSections };
}

async function scrapeUrl(url: string): Promise<string> {
  const result = await scrapeUrlFull(url);
  return result.text;
}

async function scrapeMetadata(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GEOboost/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const parts: string[] = [];
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) parts.push(`title: ${titleMatch[1]}`);
  const metaRe = /<meta[^>]+>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(html)) !== null) {
    const tag = m[0];
    const nameM = tag.match(/(?:name|property)=["']([^"']+)["']/i);
    const contentM = tag.match(/content=["']([^"']+)["']/i);
    if (nameM && contentM) {
      const key = nameM[1].toLowerCase();
      if (["description", "keywords", "og:title", "og:type", "og:description", "twitter:title"].includes(key)) {
        parts.push(`${key}: ${contentM[1]}`);
      }
    }
  }
  const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = jsonLdRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const types = Array.isArray(data) ? data.map((d: { "@type"?: unknown }) => d["@type"]) : [data["@type"]];
      types.filter(Boolean).forEach((t: unknown) => parts.push(`schema-type: ${String(t)}`));
    } catch { /* skip */ }
  }
  const h1Re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let count = 0;
  while ((m = h1Re.exec(html)) !== null && count < 3) {
    parts.push(`h1: ${m[1].replace(/<[^>]+>/g, "").trim()}`);
    count++;
  }
  return parts.join(" | ").slice(0, 2000);
}

// ─── detect-category ──────────────────────────────────────────────────────────
router.post("/geoboost/detect-category", async (req, res): Promise<void> => {
  const parsed = DetectCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const metadata = await scrapeMetadata(parsed.data.url);
    const regexResult = detectCategoryFromText(metadata);

    // If regex got a high-confidence match, return it with AI-generated query suggestions
    if (regexResult.category && regexResult.confidence === "high") {
      // Fire off Claude in parallel to generate query suggestions
      try {
        const msg = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 256,
          messages: [{
            role: "user",
            content: `Business metadata: ${metadata.slice(0, 800)}
Category: ${regexResult.category}

Generate exactly 5 short search queries that customers ask ChatGPT or Google when looking for a business like this. Make them specific and natural (e.g. "best dentist near me", "cosmetic dentist in Austin").

Return ONLY a JSON array of 5 strings. No explanation.`,
          }],
        });
        const text = msg.content[0].type === "text" ? msg.content[0].text : "";
        const llmQueries = parseLLMJson<string[]>(text);
        const queries: string[] = llmQueries.ok && Array.isArray(llmQueries.data) ? llmQueries.data.slice(0, 5) : [];
        res.json({ ...regexResult, queries });
      } catch {
        res.json(regexResult);
      }
      return;
    }

    // Fallback: use Claude to detect category AND generate query suggestions
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `Analyze this business website metadata and identify what type of business it is.

Website metadata:
${metadata.slice(0, 1200)}

Return ONLY valid JSON:
{
  "category": "<short business category, e.g. 'Dental Practice', 'Coffee Shop / Café', 'B2B SaaS / Tech', 'Home Services'>",
  "queries": ["<query 1>", "<query 2>", "<query 3>", "<query 4>", "<query 5>"]
}

The queries should be realistic questions customers would ask ChatGPT or Google when searching for this type of business (e.g. "best dentist near me", "affordable HVAC repair").`,
      }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const llmCategory = parseLLMJson<{ category?: string; queries?: string[] }>(text);
    if (llmCategory.ok) {
      res.json({
        category: llmCategory.data.category || regexResult.category,
        confidence: "high" as const,
        queries: Array.isArray(llmCategory.data.queries) ? llmCategory.data.queries.slice(0, 5) : [],
      });
    } else {
      res.json(regexResult);
    }
  } catch (err) {
    req.log.warn({ err, url: parsed.data.url }, "detect-category failed");
    res.status(400).json({ error: "Could not access website" });
  }
});

// ─── infrastructure checks ────────────────────────────────────────────────────
async function checkBingIndexed(domain: string): Promise<boolean> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const response = await fetch(`https://www.bing.com/search?q=site:${cleanDomain}&setmkt=en-US`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    const html = await response.text();
    const noResults =
      html.includes("There are no results for") ||
      html.includes("No webpage was found for the web address") ||
      html.includes("Make sure all words are spelled correctly") ||
      (html.includes("no-results") && !html.includes("b_algo"));
    return !noResults;
  } catch {
    return true;
  }
}

async function checkRobotsTxt(url: string): Promise<string[]> {
  try {
    const { origin } = new URL(url);
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": "GEOboost/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const text = await response.text();
    const blockedBots: string[] = [];
    const bots = ["GPTBot", "ClaudeBot", "PerplexityBot", "ChatGPT-User", "Anthropic-AI", "Google-Extended"];
    const lines = text.split("\n");
    let currentAgent: string | null = null;
    for (const raw of lines) {
      const line = raw.trim();
      const agentMatch = line.match(/^User-agent:\s*(.+)/i);
      if (agentMatch) {
        currentAgent = agentMatch[1].trim();
        continue;
      }
      const disallowMatch = line.match(/^Disallow:\s*\//i);
      if (disallowMatch && currentAgent) {
        const matched = bots.find(b => currentAgent!.toLowerCase() === b.toLowerCase());
        if (matched && !blockedBots.includes(matched)) blockedBots.push(matched);
      }
    }
    return blockedBots;
  } catch {
    return [];
  }
}

// ─── audit ────────────────────────────────────────────────────────────────────
router.post("/geoboost/audit", async (req, res): Promise<void> => {
  const parsed = RunAuditBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { url, category, queries, name, email, location } = parsed.data;
  req.log.info({ url, category, location, name, email }, "Starting audit");

  const scrapeResult = await scrapeUrlFull(url);
  const scrapedContent = scrapeResult.text;

  if (scrapeResult.partial || !scrapedContent || scrapedContent.length < 50) {
    res.status(400).json({
      error: "Could not access website",
      details: scrapeResult.partial
        ? "The site blocked our request or is not publicly accessible. Please check the URL and try again."
        : "The page appears to have no readable text content.",
    });
    return;
  }

  const locationContext = location
    ? `The business is located in ${location}. Factor local search intent into your analysis.`
    : "";

  const structuralContext = `
Structural metrics detected on this page:
- List/bullet structures found: ${scrapeResult.listCount} (ul, ol, li elements). Research shows 61% of AI overview answers use unordered bullet lists. Low list count is a significant weakness.
- Contains concise answer sections (30-200 word paragraphs that directly address questions): ${scrapeResult.hasShortAnswerSections ? "Yes" : "No"}. AI overviews average 157 words and prefer pages with clear, concise direct answers.

If list count is below 3, you MUST include a weakness about the lack of bullet points/lists.
If there are no concise answer sections, you MUST include a weakness about the lack of direct answer content.`;

  const systemPrompt = `You are an AI visibility analyst. Evaluate how well a business's web content is optimized to be cited by AI assistants like ChatGPT, Claude, and Perplexity.

Be brutally honest. Most small business websites score 10-35. A score above 70 is genuinely excellent.
${locationContext}
${structuralContext}

Return valid JSON:
{
  "aiVisibilityScore": <0-100>,
  "semanticDensityScore": <0-100>,
  "structuralFormattingScore": <0-100>,
  "weaknesses": ["<specific weakness referencing actual content>", ...3 items],
  "competitorPatterns": ["<pattern top-cited competitors use>", ...3 items]
}`;

  const userPrompt = `Audit this website for AI visibility.

Business URL: ${url}
Business Category: ${category}${location ? `\nBusiness Location: ${location}` : ""}
Target AI queries:
1. "${queries[0]}"
2. "${queries[1]}"
3. "${queries[2]}"

Scraped page content:
---
${scrapedContent}
---

Structural data: ${scrapeResult.listCount} list elements detected, concise answer sections: ${scrapeResult.hasShortAnswerSections ? "present" : "absent"}.

Return the JSON audit result. Be specific and brutal — reference actual text from their page.`;

  try {
    const [message, bingIndexed, blockedBots] = await Promise.all([
      anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        messages: [{ role: "user", content: userPrompt }],
        system: systemPrompt,
      }),
      checkBingIndexed(url),
      checkRobotsTxt(url),
    ]);

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const auditParsed = parseLLMJson<{
      aiVisibilityScore: number;
      semanticDensityScore: number;
      structuralFormattingScore: number;
      weaknesses: string[];
      competitorPatterns: string[];
    }>(responseText);
    if (!auditParsed.ok) throw new Error(`Claude did not return valid JSON: ${auditParsed.error}`);
    const auditData = auditParsed.data;

    let aiVisibilityScore = Math.min(100, Math.max(0, auditData.aiVisibilityScore));
    if (!bingIndexed) {
      aiVisibilityScore = Math.min(20, aiVisibilityScore);
      req.log.info({ url }, "Bing not indexed — capping score at 20");
    }

    const auditResponse = {
      aiVisibilityScore,
      semanticDensityScore: Math.min(100, Math.max(0, auditData.semanticDensityScore)),
      structuralFormattingScore: Math.min(100, Math.max(0, auditData.structuralFormattingScore)),
      weaknesses: auditData.weaknesses.slice(0, 3),
      competitorPatterns: auditData.competitorPatterns.slice(0, 3),
      scrapedUrl: url,
      bingIndexed,
      blockedBots,
    };

    req.log.info({ url, score: auditResponse.aiVisibilityScore }, "Audit complete");

    // Save to DB if user is logged in
    const auth = getAuth(req);
    if (auth?.userId) {
      try {
        await db.insert(auditsTable).values({
          clerkUserId: auth.userId,
          url,
          category,
          queries,
          location: location || null,
          aiVisibilityScore: auditResponse.aiVisibilityScore,
          semanticDensityScore: auditResponse.semanticDensityScore,
          structuralFormattingScore: auditResponse.structuralFormattingScore,
          weaknesses: auditResponse.weaknesses,
          competitorPatterns: auditResponse.competitorPatterns,
        });
        req.log.info({ userId: auth.userId }, "Audit saved to DB");
      } catch (err) {
        logger.warn({ err }, "Failed to save audit to DB");
      }
    }

    res.json(auditResponse);
  } catch (err) {
    logger.error({ err }, "Claude audit failed");
    res.status(500).json({ error: "Audit failed", details: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ─── optimize ─────────────────────────────────────────────────────────────────
router.post("/geoboost/optimize", requirePlan(["fix", "monitor", "grow"]), async (req, res): Promise<void> => {
  const parsed = OptimizeContentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { content, queries, category } = parsed.data;
  req.log.info({ contentLength: content.length, queries }, "Starting content optimization");

  const systemPrompt = `You are a GEO (Generative Engine Optimization) expert. Rewrite web content so it gets cited more often by AI assistants.

Apply ALL rules:
1. Add definition-first answers to every likely AI query
2. Convert vague marketing language into specific factual claims with numbers and data
3. Add structured sections with clear headers matching query intent
4. Bold key entities, proper nouns, and technical terms
5. Add a FAQ section with direct Q&A format matching target queries
6. Increase semantic density with data points, certifications, locations, years

Return ONLY valid JSON:
{
  "optimizedContent": "<full rewritten content with markdown>",
  "changes": [{"type": "<definition-first|specificity|structure|bold-entity|faq|semantic-density>", "reason": "<why this improves AI citation>", "original": "<brief excerpt>", "optimized": "<brief replacement>"}]
}
Document 6-10 specific changes.`;

  const userPrompt = `Optimize this content for AI visibility.
${category ? `\nBusiness Category: ${category}` : ""}
Target AI queries:
${queries.map((q, i) => `${i + 1}. "${q}"`).join("\n")}

Current content:
---
${content.slice(0, 6000)}
---`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const optimizeParsed = parseLLMJson<{
      optimizedContent: string;
      changes: Array<{ type: string; reason: string; original: string; optimized: string }>;
    }>(responseText);
    if (!optimizeParsed.ok) throw new Error(`Claude did not return valid JSON: ${optimizeParsed.error}`);
    const optimizeData = optimizeParsed.data;

    req.log.info({ changesCount: optimizeData.changes?.length }, "Optimization complete");
    res.json({ originalContent: content, optimizedContent: optimizeData.optimizedContent, changes: optimizeData.changes || [] });
  } catch (err) {
    logger.error({ err }, "Claude optimization failed");
    res.status(500).json({ error: "Optimization failed", details: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ─── send-results ─────────────────────────────────────────────────────────────
router.post("/geoboost/send-results", async (req, res): Promise<void> => {
  const { email, url, category, aiVisibilityScore, semanticDensityScore, structuralFormattingScore, weaknesses, competitorPatterns } = req.body as {
    email: string;
    url: string;
    category: string;
    aiVisibilityScore: number;
    semanticDensityScore: number;
    structuralFormattingScore: number;
    weaknesses: string[];
    competitorPatterns: string[];
  };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Valid email address required" });
    return;
  }
  if (!url || !category || typeof aiVisibilityScore !== "number" || !Array.isArray(weaknesses) || !Array.isArray(competitorPatterns)) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Email service not configured. Add a RESEND_API_KEY to enable this feature." });
    return;
  }

  const scoreColor = (s: number) => s >= 70 ? "#22c55e" : s >= 40 ? "#f59e0b" : "#ef4444";
  const scoreLabel = (s: number) => s >= 70 ? "Good" : s >= 40 ? "Needs Work" : "Critical";

  let hostname = url;
  try { hostname = new URL(url).hostname; } catch { /* keep full url */ }

  const appUrl = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : "https://geoboost.app";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GEO Audit Results</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:#0f172a;padding:28px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><span style="color:#22c55e;font-size:22px;font-weight:800;letter-spacing:-0.5px;">📈 GEOboost</span>
    <p style="color:#94a3b8;margin:8px 0 0;font-size:13px;">Your AI Visibility Audit Report</p></td>
  </tr></table>
</td></tr>

<!-- URL / Category -->
<tr><td style="padding:28px 32px 16px;">
  <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#0f172a;">Audit Results</h1>
  <p style="margin:0;color:#64748b;font-size:14px;word-break:break-all;">${url}</p>
  <p style="margin:6px 0 0;color:#64748b;font-size:13px;">Category: <strong style="color:#0f172a;">${category}</strong></p>
</td></tr>

<!-- Scores -->
<tr><td style="padding:0 20px 20px;">
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    ${[["AI Visibility", aiVisibilityScore], ["Semantic Density", semanticDensityScore], ["Structure", structuralFormattingScore]].map(([label, score]) => `
    <td width="33%" style="padding:6px;">
      <div style="background:#f8fafc;border-radius:12px;padding:16px 8px;text-align:center;border:1px solid #e2e8f0;">
        <div style="font-size:30px;font-weight:800;color:${scoreColor(score as number)};">${score}</div>
        <div style="font-size:9px;font-weight:700;color:${scoreColor(score as number)};text-transform:uppercase;letter-spacing:0.5px;">${scoreLabel(score as number)}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px;">${label}</div>
      </div>
    </td>`).join("")}
  </tr>
  </table>
</td></tr>

<!-- Weaknesses -->
<tr><td style="padding:0 32px 20px;">
  <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0f172a;">⚠️ Critical Weaknesses</h2>
  ${weaknesses.map((w, i) => `
  <div style="background:#fef2f2;border-radius:8px;padding:12px 14px;margin-bottom:8px;border-left:3px solid #ef4444;">
    <span style="color:#991b1b;font-size:12px;font-weight:700;margin-right:6px;">${i + 1}.</span>
    <span style="color:#7f1d1d;font-size:13px;">${w}</span>
  </div>`).join("")}
</td></tr>

<!-- Competitor patterns -->
<tr><td style="padding:0 32px 24px;">
  <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0f172a;">🏆 What Top Competitors Do</h2>
  ${competitorPatterns.map(p => `
  <div style="background:#eff6ff;border-radius:8px;padding:12px 14px;margin-bottom:8px;border-left:3px solid #3b82f6;">
    <span style="color:#1e3a8a;font-size:13px;">⚡ ${p}</span>
  </div>`).join("")}
</td></tr>

<!-- CTA -->
<tr><td style="padding:0 32px 32px;">
  <div style="background:#0f172a;border-radius:12px;padding:24px;text-align:center;">
    <p style="color:#ffffff;font-size:16px;font-weight:700;margin:0 0 6px;">Ready to fix your AI visibility?</p>
    <p style="color:#94a3b8;font-size:13px;margin:0 0 16px;">Start appearing in ChatGPT, Claude, and Perplexity answers.</p>
    <a href="${appUrl}/pricing" style="display:inline-block;background:#22c55e;color:#ffffff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">Monitor My Progress — $29/mo</a>
  </div>
</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;">
  <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">GEOboost · Generative Engine Optimization · You requested this audit for ${hostname}.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || "GEOboost <onboarding@resend.dev>";

    const { error } = await resend.emails.send({
      from,
      to: [email],
      subject: `Your GEO Audit Results for ${hostname}`,
      html,
    });

    if (error) {
      req.log.warn({ error }, "Resend returned an error");
      res.status(500).json({ error: (error as { message?: string }).message || "Failed to send email" });
      return;
    }

    req.log.info({ email, url }, "Audit results email sent");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Email send error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ─── fix: schema ──────────────────────────────────────────────────────────────
router.post("/geoboost/fix/schema", async (req, res): Promise<void> => {
  const { url, category, location, queries, weaknesses } = req.body as {
    url: string; category: string; location?: string; queries: string[]; weaknesses: string[];
  };
  if (!url || !category) { res.status(400).json({ error: "url and category required" }); return; }

  const prompt = `Generate a complete JSON-LD schema markup for this local business. Return ONLY the JSON-LD script tag, nothing else.

Business URL: ${url}
Business Category: ${category}
Location: ${location || "Not specified"}
Target Queries: ${queries.join(", ")}
Known Issues to Fix: ${weaknesses.join("; ")}

Generate a comprehensive LocalBusiness JSON-LD schema including:
- @context, @type (use most specific BusinessType subtype e.g. CafeOrCoffeeShop, Dentist, LegalService etc.)
- name (infer from URL domain), url
- description: 150-200 chars, dense with category keywords matching the target queries
- address with addressLocality/addressRegion/addressCountry based on location
- openingHours: realistic placeholder for this business type
- priceRange: appropriate for this business type (e.g. "$$")
- aggregateRating: @type AggregateRating, ratingValue 4.6, reviewCount 47
- hasMap pointing to a Google Maps search URL

Return ONLY the complete <script type="application/ld+json">...</script> block, formatted and ready to paste.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    let schema = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    // Strip markdown code fences if Claude wrapped the output
    schema = schema.replace(/^```(?:html|json|javascript)?\s*/i, "").replace(/\s*```$/i, "").trim();
    res.json({ schema });
  } catch (err) {
    logger.error({ err }, "Fix schema generation failed");
    res.status(500).json({ error: "Schema generation failed" });
  }
});

// ─── fix: gbp ─────────────────────────────────────────────────────────────────
router.post("/geoboost/fix/gbp", async (req, res): Promise<void> => {
  const { url, category, location, queries, weaknesses } = req.body as {
    url: string; category: string; location?: string; queries: string[]; weaknesses: string[];
  };
  if (!url || !category) { res.status(400).json({ error: "url and category required" }); return; }

  const prompt = `Generate Google Business Profile content for this business. Return ONLY valid JSON.

Business URL: ${url}
Category: ${category}
Location: ${location || "Not specified"}
Target Queries: ${queries.join(", ")}
Weaknesses to Fix: ${weaknesses.join("; ")}

Return JSON with this exact structure:
{
  "description": "750-char max GBP business description — fact-dense, specific, includes location, addresses target queries directly. NO marketing fluff.",
  "posts": [
    "Week 1 post (150-300 chars): answers query '${queries[0] || "about their service"}'",
    "Week 2 post: answers query '${queries[1] || "pricing or hours"}'",
    "Week 3 post: highlights a specific differentiator",
    "Week 4 post: seasonal or timely content",
    "Week 5 post: customer-focused benefit"
  ],
  "qa": [
    {"q": "specific question a customer would search", "a": "specific factual answer with details"},
    {"q": "pricing or availability question", "a": "direct factual answer"},
    {"q": "third relevant question", "a": "specific answer that improves AI visibility"}
  ]
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const gbpParsed = parseLLMJson(text);
    if (!gbpParsed.ok) throw new Error(gbpParsed.error);
    res.json(gbpParsed.data);
  } catch (err) {
    logger.error({ err }, "Fix GBP generation failed");
    res.status(500).json({ error: "GBP content generation failed" });
  }
});

// ─── fix: social ──────────────────────────────────────────────────────────────
router.post("/geoboost/fix/social", async (req, res): Promise<void> => {
  const { url, category, location, queries, weaknesses } = req.body as {
    url: string; category: string; location?: string; queries: string[]; weaknesses: string[];
  };
  if (!url || !category) { res.status(400).json({ error: "url and category required" }); return; }

  const prompt = `Generate AI-optimized social media bios for this business. Return ONLY valid JSON.

Business URL: ${url}
Category: ${category}
Location: ${location || "Not specified"}
Target Queries: ${queries.join(", ")}

Each bio must: include specific location, category keywords, a measurable differentiator, and be fact-dense (no generic marketing language).

Return JSON with this exact structure:
{
  "twitter": "160 chars max — punchy, includes location + category + one specific differentiator + website",
  "linkedin": "150-300 chars — professional, includes category, location, specific services, and target audience",
  "instagram": "150 chars max — engaging, includes location, category, relevant emojis (2-3 max), call to action",
  "facebook": "255 chars max — friendly, includes full location, services, hours hint, and call to action"
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const socialParsed = parseLLMJson(text);
    if (!socialParsed.ok) throw new Error(socialParsed.error);
    res.json(socialParsed.data);
  } catch (err) {
    logger.error({ err }, "Fix social generation failed");
    res.status(500).json({ error: "Social bio generation failed" });
  }
});

// ─── fix: brief ───────────────────────────────────────────────────────────────
router.post("/geoboost/fix/brief", async (req, res): Promise<void> => {
  const { url, category, location, queries, weaknesses, aiVisibilityScore } = req.body as {
    url: string; category: string; location?: string; queries: string[];
    weaknesses: string[]; aiVisibilityScore: number;
  };
  if (!url || !category) { res.status(400).json({ error: "url and category required" }); return; }

  const prompt = `Generate a complete content fix brief for this business. Return ONLY valid JSON.

Business URL: ${url}
Category: ${category}
Location: ${location || "Not specified"}
Current AI Visibility Score: ${aiVisibilityScore}/100
Target Queries: ${queries.join(", ")}
Identified Weaknesses: ${weaknesses.join("; ")}

Return JSON with this exact structure:
{
  "executiveSummary": "2-3 sentence summary: current score ${aiVisibilityScore}/100, target score (estimate 65-75 after fixes), estimated 3-6 weeks timeline, primary reason AI assistants are not citing this business",
  "weaknessFixes": [
    ${weaknesses.slice(0, 4).map(w => `{"weakness": "${w.replace(/"/g, "'")}", "before": "example of current weak language/content", "after": "specific improved version with facts and clarity", "recommendation": "one sentence explaining why this change improves AI citation probability"}`).join(",\n    ")}
  ],
  "priorityOrder": [
    "Fix #1 with highest ROI — be specific about what to do",
    "Fix #2 — be specific",
    "Fix #3 — be specific",
    "Fix #4 — be specific",
    "Fix #5 — be specific"
  ],
  "contentAdditions": [
    "Complete paragraph 1 to add — 50-100 words, factual, answers '${queries[0] || "target query 1"}'",
    "Complete paragraph 2 — answers '${queries[1] || "target query 2"}'",
    "Complete paragraph 3 — addresses a specific weakness",
    "Complete paragraph 4 — adds semantic density with specific facts about this category",
    "Complete paragraph 5 — adds location-specific content for local AI visibility"
  ],
  "faqSection": [
    {"q": "question 1 customers ask", "a": "specific factual answer"},
    {"q": "question 2", "a": "specific answer"},
    {"q": "question 3", "a": "specific answer"},
    {"q": "question 4", "a": "specific answer"},
    {"q": "question 5", "a": "specific answer"},
    {"q": "question 6", "a": "specific answer"},
    {"q": "question 7", "a": "specific answer"},
    {"q": "question 8 about pricing, hours, or services", "a": "specific answer"}
  ]
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 5000,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const briefParsed = parseLLMJson(text);
    if (!briefParsed.ok) throw new Error(briefParsed.error);
    res.json(briefParsed.data);
  } catch (err) {
    logger.error({ err }, "Fix brief generation failed");
    res.status(500).json({ error: "Brief generation failed" });
  }
});

// ─── fix: send-brief ──────────────────────────────────────────────────────────
router.post("/geoboost/send-brief", async (req, res): Promise<void> => {
  const { email, url, body } = req.body as { email?: string; url?: string; body?: string };
  if (!email || !body) { res.status(400).json({ error: "email and body required" }); return; }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { res.status(503).json({ error: "Email not configured" }); return; }
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "GEOboost <onboarding@resend.dev>";
  const { error } = await resend.emails.send({
    from, to: email,
    subject: `Your GEOboost Content Fix Brief — ${url}`,
    text: body,
  });
  if (error) { res.status(500).json({ error: "Failed to send email" }); return; }
  res.json({ success: true });
});

// ─── scrape-content ───────────────────────────────────────────────────────────
router.post("/geoboost/scrape-content", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }
  try {
    const content = await scrapeUrl(url);
    res.json({ content });
  } catch (err) {
    req.log.warn({ err, url }, "scrape-content failed");
    res.status(400).json({ error: "Could not fetch that URL. Make sure it's publicly accessible." });
  }
});

// ─── waitlist ─────────────────────────────────────────────────────────────────
router.post("/waitlist", async (req, res): Promise<void> => {
  const { name, email, websiteUrl, platform } = req.body as {
    name?: string; email?: string; websiteUrl?: string; platform?: string;
  };
  if (!name || !email || !websiteUrl || !platform) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }
  try {
    await db.insert(waitlistTable).values({ name, email, websiteUrl, platform });
    req.log.info({ email, platform }, "Waitlist signup");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Waitlist insert error");
    res.status(500).json({ error: "Failed to save. Please try again." });
  }
});

// ─── share ────────────────────────────────────────────────────────────────────
router.post("/geoboost/share", async (req, res): Promise<void> => {
  const { url, category, aiVisibilityScore, semanticDensityScore, structuralFormattingScore, weaknesses, competitorPatterns } = req.body as {
    url: string;
    category: string;
    aiVisibilityScore: number;
    semanticDensityScore: number;
    structuralFormattingScore: number;
    weaknesses: string[];
    competitorPatterns: string[];
  };

  if (!url || !category || typeof aiVisibilityScore !== "number" || !Array.isArray(weaknesses) || !Array.isArray(competitorPatterns)) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const [row] = await db.insert(sharedResultsTable).values({
      url,
      category,
      aiVisibilityScore,
      semanticDensityScore,
      structuralFormattingScore,
      weaknesses,
      competitorPatterns,
    }).returning({ token: sharedResultsTable.token });

    req.log.info({ token: row.token, url }, "Shared result created");
    res.json({ token: row.token });
  } catch (err) {
    logger.error({ err }, "Share creation error");
    res.status(500).json({ error: "Failed to create share link" });
  }
});

router.get("/geoboost/share/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  if (!token || !/^[0-9a-f-]{36}$/.test(token)) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  try {
    const [row] = await db.select().from(sharedResultsTable).where(eq(sharedResultsTable.token, token)).limit(1);
    if (!row) {
      res.status(404).json({ error: "Share link not found or expired" });
      return;
    }
    res.json(row);
  } catch (err) {
    logger.error({ err }, "Share fetch error");
    res.status(500).json({ error: "Failed to load shared results" });
  }
});

export default router;
