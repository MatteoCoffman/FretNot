const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const modelName =
  import.meta.env.VITE_GEMINI_MODEL ?? "gemini-3.0-flash-preview";

const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

const stripCodeFence = (text: string) =>
  text.replace(/```json/gi, "").replace(/```/g, "").trim();

export async function generateGeminiContent(prompt: string) {
  if (!apiKey) {
    throw new Error(
      "Gemini API key missing. Add VITE_GEMINI_API_KEY to your .env."
    );
  }

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.65 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Gemini request failed (${response.status}): ${text.slice(0, 200)}`
    );
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((part: { text: string }) => part.text).join(" ") ??
    "";
  return text;
}

export function parseJsonResponse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(stripCodeFence(text)) as T;
  } catch {
    return null;
  }
}

