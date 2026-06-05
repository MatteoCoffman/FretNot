const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL ?? "/api/gemini";

export const AI_UNAVAILABLE_MESSAGE =
  "Oops, we're out of credits today! Check back soon for AI feature access.";

const stripCodeFence = (text: string) =>
  text.replace(/```json/gi, "").replace(/```/g, "").trim();

const isQuotaOrRateLimitError = (status: number, message: string) => {
  const lower = message.toLowerCase();
  return (
    status === 429 ||
    lower.includes("quota exceeded") ||
    lower.includes("exceeded your current quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("limit: 0") ||
    (status === 403 &&
      (lower.includes("quota") ||
        lower.includes("billing") ||
        lower.includes("permission")))
  );
};

export function formatAiErrorForUser(status: number, message: string): string {
  if (isQuotaOrRateLimitError(status, message)) {
    return AI_UNAVAILABLE_MESSAGE;
  }
  if (status === 404 && message.includes("<!DOCTYPE")) {
    return "AI features aren't available right now. Please try again later.";
  }
  if (status >= 500) {
    return "AI features aren't available right now. Please try again later.";
  }
  return message;
}

export async function generateGeminiContent(prompt: string) {
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message =
      errorText || `Gemini request failed with status ${response.status}`;
    try {
      const parsed = JSON.parse(errorText) as {
        error?: string;
        hint?: string;
      };
      if (parsed.error) {
        message = parsed.hint
          ? `${parsed.error} (${parsed.hint})`
          : parsed.error;
      }
    } catch {
      // keep raw text
    }
    throw new Error(formatAiErrorForUser(response.status, message));
  }

  const data = (await response.json()) as { text?: string };
  return data.text ?? "";
}

export function parseJsonResponse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(stripCodeFence(text)) as T;
  } catch {
    return null;
  }
}
