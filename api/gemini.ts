import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEFAULT_MODEL = "gemini-3.0-pro-preview";
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN ?? "*";

function applyCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "GEMINI_API_KEY is not configured on the server" });
  }

  const prompt =
    typeof req.body === "string" ? req.body : (req.body?.prompt as string);

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.65 },
    }),
  });

  if (!upstream.ok) {
    const message = await upstream.text();
    return res
      .status(upstream.status)
      .send(message || "Gemini request failed.");
  }

  const data = await upstream.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join(" ")
      .trim() ?? "";

  return res.status(200).json({ text });
}

