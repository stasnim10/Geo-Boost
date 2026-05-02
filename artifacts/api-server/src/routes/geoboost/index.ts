import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { RunAuditBody, OptimizeContentBody, DetectCategoryBody } from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, auditsTable } from "@workspace/db";
import { logger } from "../../lib/logger";

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

async function scrapeUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GEOboost/1.0; +https://geoboost.app)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  const html = await response.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim().slice(0, 8000);
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
    res.json(detectCategoryFromText(metadata));
  } catch (err) {
    req.log.warn({ err, url: parsed.data.url }, "detect-category scrape failed");
    res.status(400).json({ error: "Could not access website" });
  }
});

// ─── audit ────────────────────────────────────────────────────────────────────
router.post("/geoboost/audit", async (req, res): Promise<void> => {
  const parsed = RunAuditBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { url, category, queries, name, email, location } = parsed.data;
  req.log.info({ url, category, location, name, email }, "Starting audit");

  let scrapedContent: string;
  try {
    scrapedContent = await scrapeUrl(url);
  } catch (err) {
    req.log.warn({ err, url }, "Failed to scrape URL");
    res.status(400).json({ error: "Could not access website", details: err instanceof Error ? err.message : "Unknown error" });
    return;
  }

  if (!scrapedContent || scrapedContent.length < 50) {
    res.status(400).json({ error: "Could not extract content from website", details: "The page appears to have no readable text content." });
    return;
  }

  const locationContext = location
    ? `The business is located in ${location}. Factor local search intent into your analysis.`
    : "";

  const systemPrompt = `You are an AI visibility analyst. Evaluate how well a business's web content is optimized to be cited by AI assistants like ChatGPT, Claude, and Perplexity.

Be brutally honest. Most small business websites score 10-35. A score above 70 is genuinely excellent.
${locationContext}

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

Return the JSON audit result. Be specific and brutal — reference actual text from their page.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude did not return valid JSON");

    const auditData = JSON.parse(jsonMatch[0]) as {
      aiVisibilityScore: number;
      semanticDensityScore: number;
      structuralFormattingScore: number;
      weaknesses: string[];
      competitorPatterns: string[];
    };

    const auditResponse = {
      aiVisibilityScore: Math.min(100, Math.max(0, auditData.aiVisibilityScore)),
      semanticDensityScore: Math.min(100, Math.max(0, auditData.semanticDensityScore)),
      structuralFormattingScore: Math.min(100, Math.max(0, auditData.structuralFormattingScore)),
      weaknesses: auditData.weaknesses.slice(0, 3),
      competitorPatterns: auditData.competitorPatterns.slice(0, 3),
      scrapedUrl: url,
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
router.post("/geoboost/optimize", async (req, res): Promise<void> => {
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
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude did not return valid JSON");

    const optimizeData = JSON.parse(jsonMatch[0]) as {
      optimizedContent: string;
      changes: Array<{ type: string; reason: string; original: string; optimized: string }>;
    };

    req.log.info({ changesCount: optimizeData.changes?.length }, "Optimization complete");
    res.json({ originalContent: content, optimizedContent: optimizeData.optimizedContent, changes: optimizeData.changes || [] });
  } catch (err) {
    logger.error({ err }, "Claude optimization failed");
    res.status(500).json({ error: "Optimization failed", details: err instanceof Error ? err.message : "Unknown error" });
  }
});

export default router;
