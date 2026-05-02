import { Router, type IRouter } from "express";
import { RunAuditBody, OptimizeContentBody } from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

async function scrapeUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GEOboost/1.0; +https://geoboost.app)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Strip HTML tags and extract meaningful text
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

  // Limit to ~8000 chars to stay within token limits
  return text.slice(0, 8000);
}

router.post("/geoboost/audit", async (req, res): Promise<void> => {
  const parsed = RunAuditBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { url, category, queries, name, email } = parsed.data;

  req.log.info({ url, category, name, email }, "Starting audit");

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
      details:
        "The page appears to have no readable text content. Try a different URL.",
    });
    return;
  }

  const systemPrompt = `You are an AI visibility analyst. Your job is to evaluate how well a business's web content is optimized to be cited by AI assistants like ChatGPT, Claude, and Perplexity.

You must be brutally honest and specific. Vague, high scores are useless. Most small business websites score between 10-35. A score above 70 is genuinely excellent. Be specific about WHY the content fails — name exact patterns, missing elements, and structural flaws.

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
- aiVisibilityScore: Overall likelihood that AI assistants will cite this page (considers all factors)
- semanticDensityScore: How rich is the content with specific, factual claims, numbers, and named entities?
- structuralFormattingScore: Does the content use headers, Q&A structures, bold entities, and definition-first answers?

Be brutal and specific. If the content is vague marketing copy, say so and score it low (10-25). If it lacks numbers and specifics, reflect that. Reference actual text from their page in the weaknesses.`;

  const userPrompt = `Audit this website for AI visibility.

Business URL: ${url}
Business Category: ${category}
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

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Claude did not return valid JSON");
    }

    const auditData = JSON.parse(jsonMatch[0]) as {
      aiVisibilityScore: number;
      semanticDensityScore: number;
      structuralFormattingScore: number;
      weaknesses: string[];
      competitorPatterns: string[];
    };

    req.log.info(
      { url, score: auditData.aiVisibilityScore },
      "Audit complete"
    );

    res.json({
      aiVisibilityScore: Math.min(100, Math.max(0, auditData.aiVisibilityScore)),
      semanticDensityScore: Math.min(
        100,
        Math.max(0, auditData.semanticDensityScore)
      ),
      structuralFormattingScore: Math.min(
        100,
        Math.max(0, auditData.structuralFormattingScore)
      ),
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

router.post("/geoboost/optimize", async (req, res): Promise<void> => {
  const parsed = OptimizeContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { content, queries, category } = parsed.data;

  req.log.info(
    { contentLength: content.length, queries },
    "Starting content optimization"
  );

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
    if (!jsonMatch) {
      throw new Error("Claude did not return valid JSON");
    }

    const optimizeData = JSON.parse(jsonMatch[0]) as {
      optimizedContent: string;
      changes: Array<{
        type: string;
        reason: string;
        original: string;
        optimized: string;
      }>;
    };

    req.log.info(
      { changesCount: optimizeData.changes?.length },
      "Optimization complete"
    );

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
