export type AiModel = "chatgpt" | "claude" | "gemini" | "perplexity";

export interface CitationBusiness {
  name: string;
  rank: number;
  url: string | null;
}

export interface ModelCitationResult {
  model: AiModel;
  modelLabel: string;
  mentioned: boolean;
  position: number | null;
  businesses: CitationBusiness[];
  sources: string[];
  excerpt: string;
  rawResponse: string;
  error?: string;
}

export interface CitationTestOptions {
  query: string;
  domain?: string;
  models?: AiModel[];
}

export interface CitationTestResult {
  query: string;
  domain?: string;
  results: ModelCitationResult[];
  durationMs: number;
}
