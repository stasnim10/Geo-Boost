import { logger } from "./logger";

export type LLMJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function parseLLMJson<T = unknown>(text: string): LLMJsonResult<T> {
  const trimmed = text.trim();

  try {
    return { ok: true, data: JSON.parse(trimmed) as T };
  } catch { /* fall through */ }

  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return { ok: true, data: JSON.parse(objMatch[0]) as T };
    } catch { /* fall through */ }
  }

  const arrMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return { ok: true, data: JSON.parse(arrMatch[0]) as T };
    } catch { /* fall through */ }
  }

  const error = `Could not parse LLM JSON from response (first 200 chars): ${trimmed.slice(0, 200)}`;
  logger.warn({ text: trimmed.slice(0, 200) }, "parseLLMJson: all strategies failed");
  return { ok: false, error };
}
