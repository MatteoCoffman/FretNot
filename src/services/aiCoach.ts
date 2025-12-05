import { generateGeminiContent, parseJsonResponse } from "../lib/gemini";

export type FretSummary = {
  string: string;
  fret: number;
};

export type ChordSummary = {
  label: string;
  notes: string[];
  frets: FretSummary[];
};

export type ProgressionSuggestion = {
  name: string;
  reason: string;
};

const chordInsightPrompt = (summary: ChordSummary) => `
You are an expert guitar instructor. Provide an encouraging, precise explanation
of this voicing for intermediate players.

Chord: ${summary.label}
Notes: ${summary.notes.join(", ")}
Fretboard positions: ${summary.frets
  .map((fret) => `${fret.string} string @ fret ${fret.fret}`)
  .join("; ")}

Reply in JSON: {"insight": "<120 word description>","tips":["tip1","tip2"]}.
`;

const progressionPrompt = (progression: ChordSummary[]) => `
You are a reharmonisation assistant. Suggest two chords that could follow this progression.

Progression: ${progression
  .map((chord, idx) => `${idx + 1}. ${chord.label} (${chord.notes.join(",")})`)
  .join(" | ")}

Return JSON:
{
  "suggestions": [
    {"name":"Suggested chord","reason":"why it works"},
    {"name":"Another chord","reason":"explain tension/resolution"}
  ]
}
Limit responses to 50 words of explanation each.
`;

const practicePrompt = (summary: ChordSummary) => `
Create a short practice assignment for this chord. Mention target tempo and technique focus.
Chord: ${summary.label}; Notes: ${summary.notes.join(", ")}; Frets: ${summary.frets
  .map((f) => `${f.string}@${f.fret}`)
  .join(" ")}

Return JSON: {"prompt":"two sentences with actionable guidance"}.
`;

export async function fetchChordInsight(summary: ChordSummary) {
  const text = await generateGeminiContent(chordInsightPrompt(summary));
  const parsed = parseJsonResponse<{ insight?: string; tips?: string[] }>(text);
  if (parsed?.insight) {
    return {
      insight: parsed.insight,
      tips: parsed.tips ?? [],
    };
  }
  return { insight: text, tips: [] };
}

export async function fetchProgressionSuggestions(
  progression: ChordSummary[]
): Promise<ProgressionSuggestion[]> {
  const text = await generateGeminiContent(progressionPrompt(progression));
  const parsed = parseJsonResponse<{ suggestions: ProgressionSuggestion[] }>(
    text
  );
  if (parsed?.suggestions) {
    return parsed.suggestions;
  }
  return [
    {
      name: "Try modal interchange",
      reason: text,
    },
  ];
}

export async function fetchPracticePrompt(summary: ChordSummary) {
  const text = await generateGeminiContent(practicePrompt(summary));
  const parsed = parseJsonResponse<{ prompt: string }>(text);
  return parsed?.prompt ?? text;
}

