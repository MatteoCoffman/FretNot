const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL ?? "/api/gemini";

const stripCodeFence = (text: string) =>
  text.replace(/```json/gi, "").replace(/```/g, "").trim();

export async function generateGeminiContent(prompt: string) {
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `Gemini request failed with status ${response.status}`
    );
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

