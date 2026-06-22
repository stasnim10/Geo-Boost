import { anthropic } from "@workspace/integrations-anthropic-ai";
import { batchProcess } from "@workspace/integrations-anthropic-ai/batch";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ai as gemini } from "@workspace/integrations-gemini-ai";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import type { AiModel, CitationBusiness, CitationTestOptions, CitationTestResult, ModelCitationResult } from "./types.js";

const PERPLEXITY_MODEL = "perplexity/sonar";

const MODEL_LABELS: Record<AiModel, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

const NATURAL_SYSTEM_PROMPT = `You are a helpful AI assistant. Answer the user's question naturally and helpfully.`;

function buildExtractionPrompt(query: string, modelResponse: string): string {
  return `You are a structured data extractor. Given an AI assistant's response to a user search query, extract key structured information.

Original user query: "${query}"

AI assistant response:
${modelResponse.slice(0, 4000)}

Extract the following and respond with ONLY valid JSON (no markdown fences, no explanation):
{
  "answer": "<the key helpful answer, max 600 characters>",
  "businesses": [
    { "name": "<specific business/company/product name>", "rank": <integer starting at 1>, "url": "<URL string or null>" }
  ]
}

Rules:
- Only list specific named businesses, companies, products, or service providers that are explicitly recommended
- Do NOT include generic categories like "local coffee shops" or "nearby restaurants"
- Rank 1 = first / top recommendation, increasing from there
- Include a URL only if it appears in the response text; otherwise use null
- If no specific businesses are mentioned, use an empty array []`;
}

async function extractWithClaude(
  query: string,
  rawResponse: string,
): Promise<{ answer: string; businesses: CitationBusiness[] }> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: buildExtractionPrompt(query, rawResponse) }],
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { answer: rawResponse.slice(0, 600), businesses: [] };
    const parsed = JSON.parse(jsonMatch[0]) as {
      answer?: string;
      businesses?: Array<{ name?: string; rank?: number; url?: string | null }>;
    };
    const answer = typeof parsed.answer === "string" ? parsed.answer : rawResponse.slice(0, 600);
    const businesses: CitationBusiness[] = Array.isArray(parsed.businesses)
      ? parsed.businesses
          .filter(
            (b): b is { name: string; rank: number; url?: string | null } =>
              typeof b === "object" && b !== null && typeof b.name === "string" && b.name.trim().length > 0,
          )
          .map((b, i) => ({
            name: b.name.trim(),
            rank: typeof b.rank === "number" ? b.rank : i + 1,
            url: typeof b.url === "string" ? b.url : null,
          }))
      : [];
    return { answer, businesses };
  } catch {
    return { answer: rawResponse.slice(0, 600), businesses: [] };
  }
}

function extractSources(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s"',>)]+/g;
  const matches = text.match(urlRegex) ?? [];
  const seen = new Set<string>();
  return matches
    .map(url => url.replace(/[.,;!?]+$/, ""))
    .filter(url => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .slice(0, 5);
}

function checkMentioned(
  text: string,
  domain?: string,
): { mentioned: boolean; position: number | null } {
  if (!domain) return { mentioned: false, position: null };
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  const lowerText = text.toLowerCase();
  if (!lowerText.includes(cleanDomain)) return { mentioned: false, position: null };
  const idx = lowerText.indexOf(cleanDomain);
  const before = text.slice(0, idx);
  const numberedBefore = (before.match(/\d+\./g) ?? []).length;
  const bulletsBefore = (before.match(/[\n\r][\s]*[-•*]/g) ?? []).length;
  const position = Math.max(numberedBefore, bulletsBefore) + 1;
  return { mentioned: true, position };
}

async function fetchRawChatGPT(query: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    max_completion_tokens: 2048,
    messages: [
      { role: "system", content: NATURAL_SYSTEM_PROMPT },
      { role: "user", content: query },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

async function fetchRawClaude(query: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: NATURAL_SYSTEM_PROMPT,
    messages: [{ role: "user", content: query }],
  });
  return response.content[0]?.type === "text" ? response.content[0].text : "";
}

async function fetchRawGemini(query: string): Promise<string> {
  const response = await gemini.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: query }] }],
    config: {
      maxOutputTokens: 2048,
      systemInstruction: NATURAL_SYSTEM_PROMPT,
    },
  });
  return response.text ?? "";
}

async function fetchRawPerplexity(query: string): Promise<string> {
  const response = await openrouter.chat.completions.create({
    model: PERPLEXITY_MODEL,
    max_tokens: 2048,
    messages: [
      { role: "system", content: NATURAL_SYSTEM_PROMPT },
      { role: "user", content: query },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

const MODEL_FETCHERS: Record<AiModel, (query: string) => Promise<string>> = {
  chatgpt: fetchRawChatGPT,
  claude: fetchRawClaude,
  gemini: fetchRawGemini,
  perplexity: fetchRawPerplexity,
};

async function runModelQuery(
  model: AiModel,
  query: string,
  domain?: string,
): Promise<ModelCitationResult> {
  try {
    const raw = await MODEL_FETCHERS[model](query);
    const { answer, businesses } = await extractWithClaude(query, raw);
    const searchText = raw + " " + businesses.map(b => b.url ?? "").join(" ");
    const { mentioned, position } = checkMentioned(searchText, domain);

    return {
      model,
      modelLabel: MODEL_LABELS[model],
      mentioned,
      position,
      businesses,
      sources: extractSources(raw),
      excerpt: answer,
      rawResponse: raw.slice(0, 2000),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      model,
      modelLabel: MODEL_LABELS[model],
      mentioned: false,
      position: null,
      businesses: [],
      sources: [],
      excerpt: "",
      rawResponse: "",
      error: message,
    };
  }
}

export async function runCitationTest(options: CitationTestOptions): Promise<CitationTestResult> {
  const { query, domain, models: requestedModels } = options;
  const start = Date.now();

  const models: AiModel[] = requestedModels && requestedModels.length > 0
    ? requestedModels
    : ["chatgpt", "claude", "gemini", "perplexity"];

  const results = await batchProcess(
    models,
    (model) => runModelQuery(model, query, domain),
    { concurrency: 4, retries: 2, minTimeout: 600, maxTimeout: 5000 },
  );

  return {
    query,
    domain,
    results,
    durationMs: Date.now() - start,
  };
}
