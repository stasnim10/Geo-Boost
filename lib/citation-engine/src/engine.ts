import { anthropic } from "@workspace/integrations-anthropic-ai";
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

const SYSTEM_PROMPT = `You are a helpful AI assistant. Answer the user's question naturally and helpfully.

You MUST respond with valid JSON only, in exactly this format:
{
  "answer": "<your full, natural, helpful answer to the user's question>",
  "businesses": [
    { "name": "<business or service name>", "rank": 1, "url": "<website URL or null>" }
  ]
}

In the "businesses" array, list any specific businesses, companies, products, services, or providers you mention or recommend. Use rank 1 for the top/first recommendation, rank 2 for second, etc. If you don't recommend specific named businesses, use an empty array []. Include a URL if you know it, otherwise use null.`;

interface RawModelResponse {
  answer: string;
  businesses?: Array<{ name?: string; rank?: number; url?: string | null }>;
}

function parseModelResponse(raw: string): { answer: string; businesses: CitationBusiness[] } {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { answer: raw.slice(0, 500), businesses: [] };
    const parsed = JSON.parse(jsonMatch[0]) as RawModelResponse;
    const answer = typeof parsed.answer === "string" ? parsed.answer : raw.slice(0, 500);
    const businesses: CitationBusiness[] = Array.isArray(parsed.businesses)
      ? parsed.businesses
          .filter((b): b is { name: string; rank: number; url?: string | null } =>
            typeof b === "object" && b !== null && typeof b.name === "string" && b.name.trim().length > 0
          )
          .map((b, i) => ({
            name: b.name.trim(),
            rank: typeof b.rank === "number" ? b.rank : i + 1,
            url: typeof b.url === "string" ? b.url : null,
          }))
      : [];
    return { answer, businesses };
  } catch {
    return { answer: raw.slice(0, 500), businesses: [] };
  }
}

function extractSources(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s"',>)]+/g;
  const matches = text.match(urlRegex) ?? [];
  const seen = new Set<string>();
  return matches.filter(url => {
    const clean = url.replace(/[.,;!?]+$/, "");
    if (seen.has(clean)) return false;
    seen.add(clean);
    return true;
  }).slice(0, 5);
}

function checkMentioned(text: string, domain?: string): { mentioned: boolean; position: number | null } {
  if (!domain) return { mentioned: false, position: null };
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase();
  const lowerText = text.toLowerCase();
  if (!lowerText.includes(cleanDomain)) return { mentioned: false, position: null };
  const idx = lowerText.indexOf(cleanDomain);
  const before = text.slice(0, idx);
  const numberedBefore = (before.match(/\d+\./g) ?? []).length;
  const bulletsBefore = (before.match(/[\n\r][\s]*[-•*]/g) ?? []).length;
  const position = Math.max(numberedBefore, bulletsBefore) + 1;
  return { mentioned: true, position };
}

async function queryChatGPT(query: string): Promise<{ raw: string; answer: string; businesses: CitationBusiness[]; sources: string[] }> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: query },
    ],
  });
  const raw = response.choices[0]?.message?.content ?? "";
  const { answer, businesses } = parseModelResponse(raw);
  return { raw, answer, businesses, sources: extractSources(raw) };
}

async function queryClaude(query: string): Promise<{ raw: string; answer: string; businesses: CitationBusiness[]; sources: string[] }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: query }],
  });
  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  const { answer, businesses } = parseModelResponse(raw);
  return { raw, answer, businesses, sources: extractSources(raw) };
}

async function queryGemini(query: string): Promise<{ raw: string; answer: string; businesses: CitationBusiness[]; sources: string[] }> {
  const response = await gemini.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\nUser question: ${query}` }] },
    ],
    config: { maxOutputTokens: 8192 },
  });
  const raw = response.text ?? "";
  const { answer, businesses } = parseModelResponse(raw);
  return { raw, answer, businesses, sources: extractSources(raw) };
}

async function queryPerplexity(query: string): Promise<{ raw: string; answer: string; businesses: CitationBusiness[]; sources: string[] }> {
  const response = await openrouter.chat.completions.create({
    model: PERPLEXITY_MODEL,
    max_tokens: 8192,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: query },
    ],
  });
  const raw = response.choices[0]?.message?.content ?? "";
  const { answer, businesses } = parseModelResponse(raw);
  return { raw, answer, businesses, sources: extractSources(raw) };
}

async function runModelQuery(
  model: AiModel,
  query: string,
  domain?: string
): Promise<ModelCitationResult> {
  try {
    let result: { raw: string; answer: string; businesses: CitationBusiness[]; sources: string[] };
    if (model === "chatgpt") result = await queryChatGPT(query);
    else if (model === "claude") result = await queryClaude(query);
    else if (model === "gemini") result = await queryGemini(query);
    else result = await queryPerplexity(query);

    const { mentioned, position } = checkMentioned(result.raw + " " + result.businesses.map(b => b.url ?? "").join(" "), domain);

    return {
      model,
      modelLabel: MODEL_LABELS[model],
      mentioned,
      position,
      businesses: result.businesses,
      sources: result.sources,
      excerpt: result.answer.slice(0, 600),
      rawResponse: result.raw.slice(0, 2000),
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
  const { query, domain } = options;
  const start = Date.now();

  const models: AiModel[] = ["chatgpt", "claude", "gemini", "perplexity"];
  const results = await Promise.all(models.map(model => runModelQuery(model, query, domain)));

  return {
    query,
    domain,
    results,
    durationMs: Date.now() - start,
  };
}
