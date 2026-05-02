import { Router, type IRouter } from "express";
import { RunAuditBody, OptimizeContentBody, DetectCategoryBody } from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
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
  // Looser matches
  { patterns: [/food|eat|dine|menu|chef|cuisine|catering/], label: "Restaurant", confidence: "low" },
  { patterns: [/health|clinic|care|doctor|medical/], label: "Medical / Healthcare", confidence: "low" },
  { patterns: [/tech|software|app|platform|digital|cloud|api|solution/], label: "B2B SaaS / Tech", confidence: "low" },
  { patterns: [/shop|store|buy|product|brand|retail/], label: "Retail / E-Commerce", confidence: "low" },
  { patterns: [/market|agency|creative|design|brand/], label: "Marketing Agency", confidence: "low" },
];

function detectCategoryFromText(text: string): { category: string | null; confidence: "high" | "low" } {
  const lower = text.toLowerCase();
  // Try high-confidence first
  for (const rule of CATEGORY_RULES) {
    if (rule.confidence === "high" && rule.patterns.some(p => p.test(lower))) {
      return { category: rule.label, confidence: "high" };
    }
  }
  // Fall back to low-confidence
  for (const rule of CATEGORY_RULES) {
    if (rule.confidence === "low" && rule.patterns.some(p => p.test(lower))) {
      return { category: rule.label, confidence: "low" };
    }
  }
  return { category: null, confidence: "low" };
}

async function scrapeUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; GEOboost/1.0; +https://geoboost.app)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, 8000);
}

async function scrapeMetadata(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GEOboost/1.0)" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const html = await response.text();
  const parts: string[] = [];

  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) parts.push(`title: ${titleMatch[1]}`);

  // Meta tags (description, keywords, og:title, og:type, og:description)
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

  // JSON-LD schema @type
  const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = jsonLdRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const types = Array.isArray(data) ? data.map((d: { "@type"?: unknown }) => d["@type"]) : [data["@type"]];
      types.filter(Boolean).forEach((t: unknown) => parts.push(`schema-type: ${String(t)}`));
    } catch { /* skip invalid JSON */ }
  }

  // h1 tags
  const h1Re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let count = 0;
  while ((m = h1Re.exec(html)) !== null && count < 3) {
    parts.push(`h1: ${m[1].replace(/<[^>]+>/g, "").trim()}`);
    count++;
  }

  return parts.join(" | ").slice(0, 2000);
}

// ─── detect-category ───────────────────────────────────────────────────────
router.post("/geoboost/detect-category", async (req, res): Promise<void> => {
  const parsed = DetectCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { url } = parsed.data;

  try {
    const metadata = await scrapeMetadata(url);
    const result = detectCategoryFromText(metadata);
    res.json(result);
  } catch (err) {
    req.log.warn({ err, url }, "detect-category scrape failed");
    res.status(400).json({ error: "Could not access website" });
  }
});

// ─── audit ─────────────────────────────────────────────────────────────────
router.post("/geoboost/audit", async (req, res): Promise<void> => {
  const parsed = RunAuditBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { url, category, queries, name, email, location } = parsed.data;

  req.log.info({ url, category, location, name, email }, "Starting audit");

  let scrapedContent: string;
  try {
    scrapedContent = await scrapeUrl(url);
  } catch (err) {
    req.log.warn({ err, url }, "Failed to scrape URL");
    res.status(400).json({
      error: "Could not access website",
      details: err instanceof Error ? err.message : "Unknown error",
    });
    return;
  }

  if (!scrapedContent || scrapedContent.length < 50) {
    res.status(400).json({
      error: "Could not extract content from website",
      details: "The page appears to have no readable text content. Try a different URL.",
    });
    return;
  }

  const locationContext = location
    ? `The business is located in ${location}. Factor local search intent into your analysis — competitors in this area and region-specific AI queries are highly relevant.`
    : "";

  const systemPrompt = `You are an AI visibility analyst. Your job is to evaluate how well a business's web content is optimized to be cited by AI assistants like ChatGPT, Claude, and Perplexity.

You must be brutally honest and specific. Vague, high scores are useless. Most small business websites score between 10-35. A score above 70 is genuinely excellent. Be specific about WHY the content fails — name exact patterns, missing elements, and structural flaws.

${locationContext}

Always return valid JSON in this exact format:
{
  "aiVisibilityScore": <0-100 integer>,
  "semanticDensityScore": <0-100 integer>,
  "structuralFormattingScore": <0-100 integer>,
  "weaknesses": [
    "<specific weakness 1 — reference actual content from the page>",
    "<specific weakness 2 — reference actual content from the page>",
    "<specific weakness 3 — reference actual content from the page>"
  ],
  "competitorPatterns": [
    "<pattern 1 that top-cited competitors in this space use>",
    "<pattern 2 that top-cited competitors in this space use>",
    "<pattern 3 that top-cited competitors in this space use>"
  ]
}

Scoring guide:
- aiVisibilityScore: Overall likelihood that AI assistants will cite this page
- semanticDensityScore: How rich is the content with specific, factual claims, numbers, and named entities?
- structuralFormattingScore: Does the content use headers, Q&A structures, bold entities, and definition-first answers?

Be brutal and specific. If the content is vague marketing copy, say so and score it low (10-25). Reference actual text from their page in the weaknesses.`;

  const userPrompt = `Audit this website for AI visibility.

Business URL: ${url}
Business Category: ${category}${location ? `\nBusiness Location: ${location}` : ""}
Target AI queries they want to rank for:
1. "${queries[0]}"
2. "${queries[1]}"
3. "${queries[2]}"

Scraped page content:
---
${scrapedContent}
---

Analyze this content and return the JSON audit result. Be specific and brutal — reference actual text from their page. Most sites score 15-35. Only genuinely excellent content scores above 70.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude did not return valid JSON");

    const auditData = JSON.parse(jsonMatch[0]) as {
      aiVisibilityScore: number;
      semanticDensityScore: number;
      structuralFormattingScore: number;
      weaknesses: string[];
      competitorPatterns: string[];
    };

    req.log.info({ url, score: auditData.aiVisibilityScore }, "Audit complete");

    res.json({
      aiVisibilityScore: Math.min(100, Math.max(0, auditData.aiVisibilityScore)),
      semanticDensityScore: Math.min(100, Math.max(0, auditData.semanticDensityScore)),
      structuralFormattingScore: Math.min(100, Math.max(0, auditData.structuralFormattingScore)),
      weaknesses: auditData.weaknesses.slice(0, 3),
      competitorPatterns: auditData.competitorPatterns.slice(0, 3),
      scrapedUrl: url,
    });
  } catch (err) {
    logger.error({ err }, "Claude audit failed");
    res.status(500).json({
      error: "Audit failed",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

// ─── optimize ──────────────────────────────────────────────────────────────
router.post("/geoboost/optimize", async (req, res): Promise<void> => {
  const parsed = OptimizeContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { content, queries, category } = parsed.data;

  req.log.info({ contentLength: content.length, queries }, "Starting content optimization");

  const systemPrompt = `You are a GEO (Generative Engine Optimization) expert. Your job is to rewrite web content so it gets cited more often by AI assistants like ChatGPT, Claude, and Perplexity.

Apply ALL of these rules:
1. Add definition-first answers to every likely AI query — lead with the direct answer, then elaborate
2. Convert vague marketing language into specific factual claims with numbers, metrics, and data points
3. Add structured sections with clear headers that match query intent exactly
4. Bold key entities, proper nouns, specifications, and technical terms
5. Add a FAQ section at the bottom with direct Q&A format matching the target queries
6. Increase semantic density by weaving in specific data points, certifications, locations, years, and named processes

Return ONLY valid JSON in this exact format:
{
  "optimizedContent": "<the full rewritten content with markdown formatting>",
  "changes": [
    {
      "type": "<change type: definition-first|specificity|structure|bold-entity|faq|semantic-density>",
      "reason": "<specific reason why this improves AI citation likelihood>",
      "original": "<brief excerpt of original text>",
      "optimized": "<brief excerpt of optimized replacement>"
    }
  ]
}

Document at least 6-10 specific changes. Make the optimized content genuinely better — not just cosmetically different.`;

  const userPrompt = `Optimize this content for AI visibility.

${category ? `Business Category: ${category}` : ""}
Target AI queries:
${queries.map((q, i) => `${i + 1}. "${q}"`).join("\n")}

Current content to optimize:
---
${content.slice(0, 6000)}
---

Rewrite this content following all GEO optimization rules. Return the JSON response.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude did not return valid JSON");

    const optimizeData = JSON.parse(jsonMatch[0]) as {
      optimizedContent: string;
      changes: Array<{ type: string; reason: string; original: string; optimized: string }>;
    };

    req.log.info({ changesCount: optimizeData.changes?.length }, "Optimization complete");

    res.json({
      originalContent: content,
      optimizedContent: optimizeData.optimizedContent,
      changes: optimizeData.changes || [],
    });
  } catch (err) {
    logger.error({ err }, "Claude optimization failed");
    res.status(500).json({
      error: "Optimization failed",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
