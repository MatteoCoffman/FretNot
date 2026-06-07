import { Note } from "@tonaljs/tonal";

export const FRET_COUNT = 15;
export const STRING_COUNT = 6;
export const MAX_FRET_SPAN = 4;
export const MAX_FRETTED_STRINGS = 4;

export const NO_PLAYABLE_VOICING_MSG =
  "No playable voicing found within a 5-fret stretch.";

const NOTE_SEQUENCE = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const OPEN_STRING_LABELS = ["E", "B", "G", "D", "A", "E"] as const;
const STRING_REGISTERS = ["E4", "B3", "G3", "D3", "A2", "E2"] as const;
const STRING_BASE_MIDI = STRING_REGISTERS.map((register) => Note.midi(register) ?? 0);

export const emptySelection = () => Array(STRING_COUNT).fill(-1);

export const normalizeNote = (note: string) => {
  const normalized = note.replace("♯", "#").replace("♭", "b");
  if (normalized.includes("b")) {
    const enharmonic = Note.enharmonic(normalized);
    return enharmonic.replace("♯", "#");
  }
  return normalized;
};

export const pitchClass = (note: string): number | null => {
  const chroma = Note.chroma(normalizeNote(note));
  return chroma ?? null;
};

export const chordPitchClasses = (notes: string[]): Set<number> => {
  const pcs = new Set<number>();
  for (const note of notes) {
    const pc = pitchClass(note);
    if (pc !== null) pcs.add(pc);
  }
  return pcs;
};

export const getNoteName = (stringIndex: number, fret: number) => {
  const openNote = OPEN_STRING_LABELS[stringIndex];
  const startIndex = NOTE_SEQUENCE.indexOf(openNote);
  const noteIndex = (startIndex + fret) % NOTE_SEQUENCE.length;
  return NOTE_SEQUENCE[noteIndex];
};

export const layoutKey = (layout: number[]) => layout.join("|");

export const isPlayableLayout = (layout: number[]) => {
  const fretted = layout.filter((fret) => fret > 0);
  if (fretted.length > MAX_FRETTED_STRINGS) return false;
  if (fretted.length <= 1) return true;
  return Math.max(...fretted) - Math.min(...fretted) <= MAX_FRET_SPAN;
};

const partialSpanExceedsLimit = (layout: number[], upToString: number) => {
  const fretted = layout
    .slice(0, upToString + 1)
    .filter((fret) => fret > 0);
  if (fretted.length <= 1) return false;
  return Math.max(...fretted) - Math.min(...fretted) > MAX_FRET_SPAN;
};

const countFretted = (layout: number[]) =>
  layout.filter((fret) => fret > 0).length;

const matchedPitchClasses = (
  layout: number[],
  chordPCs: Set<number>
): Set<number> => {
  const matched = new Set<number>();
  layout.forEach((fret, stringIdx) => {
    if (fret < 0) return;
    const pc = pitchClass(getNoteName(stringIdx, fret));
    if (pc !== null && chordPCs.has(pc)) matched.add(pc);
  });
  return matched;
};

const minRequiredPitchClasses = (chordPCs: Set<number>): number => {
  const count = chordPCs.size;
  if (count >= 4) return Math.min(count, MAX_FRETTED_STRINGS);
  if (count === 3) return 3;
  return 2;
};

const bassPitchClass = (layout: number[]): number | null => {
  let lowestMidi = Infinity;
  let bassPC: number | null = null;

  layout.forEach((fret, stringIdx) => {
    if (fret < 0) return;
    const midi = (STRING_BASE_MIDI[stringIdx] ?? 0) + fret;
    if (midi < lowestMidi) {
      lowestMidi = midi;
      bassPC = pitchClass(getNoteName(stringIdx, fret));
    }
  });

  return bassPC;
};

const scoreLayout = (
  layout: number[],
  chordPCs: Set<number>,
  rootPC: number
) => {
  const matched = matchedPitchClasses(layout, chordPCs);
  const placed = layout.filter((fret) => fret >= 0);
  const fretted = placed.filter((fret) => fret > 0);
  const avgFret =
    placed.length === 0
      ? 0
      : placed.reduce((sum, fret) => sum + fret, 0) / placed.length;
  const span =
    fretted.length > 1
      ? Math.max(...fretted) - Math.min(...fretted)
      : 0;

  const bassPC = bassPitchClass(layout);
  let bassAlignment = 0;
  if (bassPC !== null) {
    if (bassPC === rootPC) {
      bassAlignment = -60;
    } else if (chordPCs.has(bassPC)) {
      bassAlignment = 25;
    }
  }

  const hasRoot = matched.has(rootPC) ? 0 : 500;
  const toneCoverage = (chordPCs.size - matched.size) * 80;
  const noteCountPenalty = Math.max(0, 4 - placed.length) * 15;

  return (
    avgFret * 12 +
    span * 6 +
    toneCoverage +
    hasRoot +
    noteCountPenalty +
    bassAlignment -
    matched.size * 25
  );
};

const isValidVoicing = (
  layout: number[],
  chordPCs: Set<number>,
  rootPC: number
) => {
  const placedCount = layout.filter((fret) => fret >= 0).length;
  if (placedCount < 2 || !isPlayableLayout(layout)) return false;

  const matched = matchedPitchClasses(layout, chordPCs);
  if (!matched.has(rootPC)) return false;
  if (matched.size < minRequiredPitchClasses(chordPCs)) return false;

  return true;
};

export const findPlayableVoicings = (notes: string[]): number[][] => {
  const chordTones = [
    ...new Set(notes.map((note) => normalizeNote(note)).filter(Boolean)),
  ];
  if (chordTones.length === 0) return [];

  const root = chordTones[0];
  const rootPC = pitchClass(root);
  if (rootPC === null) return [];

  const chordPCs = chordPitchClasses(chordTones);
  const seen = new Set<string>();
  const results: Array<{ layout: number[]; score: number }> = [];

  const layout = emptySelection();

  const search = (stringIdx: number) => {
    if (stringIdx >= STRING_COUNT) {
      if (!isValidVoicing(layout, chordPCs, rootPC)) return;

      const key = layoutKey(layout);
      if (seen.has(key)) return;
      seen.add(key);

      results.push({
        layout: [...layout],
        score: scoreLayout(layout, chordPCs, rootPC),
      });
      return;
    }

    layout[stringIdx] = -1;
    search(stringIdx + 1);

    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      const note = getNoteName(stringIdx, fret);
      const pc = pitchClass(note);
      if (pc === null || !chordPCs.has(pc)) continue;

      layout[stringIdx] = fret;
      if (countFretted(layout) > MAX_FRETTED_STRINGS) {
        layout[stringIdx] = -1;
        continue;
      }
      if (partialSpanExceedsLimit(layout, stringIdx)) {
        layout[stringIdx] = -1;
        continue;
      }

      search(stringIdx + 1);
      layout[stringIdx] = -1;
    }
  };

  search(0);

  results.sort((a, b) => a.score - b.score);
  return results.map((entry) => entry.layout);
};

export type PickVoicingOptions = {
  variantIndex?: number;
  avoidLayout?: number[];
};

export const pickVoicing = (
  notes: string[],
  options: PickVoicingOptions = {}
): number[] | null => {
  const { variantIndex = 0, avoidLayout } = options;
  let voicings = findPlayableVoicings(notes);

  if (avoidLayout) {
    const avoidKey = layoutKey(avoidLayout);
    voicings = voicings.filter(
      (layout) => layoutKey(layout) !== avoidKey
    );
  }

  if (voicings.length === 0) return null;
  return voicings[variantIndex % voicings.length];
};
