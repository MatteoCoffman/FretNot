import { useMemo, useState } from "react";
import { Chord, Interval, Note } from "@tonaljs/tonal";
import "./App.css";
import {
  ChordSummary,
  ProgressionSuggestion,
  fetchChordInsight,
  fetchPracticePrompt,
  fetchProgressionSuggestions,
} from "./services/aiCoach";

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

const STRINGS = [
  { id: "string-1", label: "E", register: "E4" },
  { id: "string-2", label: "B", register: "B3" },
  { id: "string-3", label: "G", register: "G3" },
  { id: "string-4", label: "D", register: "D3" },
  { id: "string-5", label: "A", register: "A2" },
  { id: "string-6", label: "E", register: "E2" },
] as const;

const STRING_BASE_MIDI = STRINGS.map(
  (stringMeta) => Note.midi(stringMeta.register) ?? 0
);

const FRET_COUNT = 15;
const MARKER_FRETS = [3, 5, 7, 9, 12, 15];
const ROOT_NOTES = NOTE_SEQUENCE;
type ChordQuality = {
  label: string;
  id: string;
  intervals: string[];
};

const CHORD_QUALITIES: ChordQuality[] = [
  { label: "Major", id: "maj", intervals: ["1P", "3M", "5P"] },
  { label: "Minor", id: "min", intervals: ["1P", "3m", "5P"] },
  { label: "Dominant 7", id: "7", intervals: ["1P", "3M", "5P", "7m"] },
  { label: "Dominant 9", id: "9", intervals: ["1P", "3M", "5P", "7m", "9M"] },
  {
    label: "Dominant 13",
    id: "13",
    intervals: ["1P", "3M", "5P", "7m", "9M", "13M"],
  },
  {
    label: "Dominant 7(b9)",
    id: "7b9",
    intervals: ["1P", "3M", "5P", "7m", "9m"],
  },
  { label: "Major 7", id: "maj7", intervals: ["1P", "3M", "5P", "7M"] },
  { label: "Major 6", id: "maj6", intervals: ["1P", "3M", "5P", "6M"] },
  {
    label: "Major 9",
    id: "maj9",
    intervals: ["1P", "3M", "5P", "7M", "9M"],
  },
  {
    label: "Major 13",
    id: "maj13",
    intervals: ["1P", "3M", "5P", "7M", "9M", "13M"],
  },
  { label: "Minor 7", id: "m7", intervals: ["1P", "3m", "5P", "7m"] },
  {
    label: "Minor 9",
    id: "m9",
    intervals: ["1P", "3m", "5P", "7m", "9M"],
  },
  {
    label: "Minor 11",
    id: "m11",
    intervals: ["1P", "3m", "5P", "7m", "9M", "11P"],
  },
  {
    label: "Minor 13",
    id: "m13",
    intervals: ["1P", "3m", "5P", "7m", "9M", "13M"],
  },
  {
    label: "Minor 6",
    id: "m6",
    intervals: ["1P", "3m", "5P", "6M"],
  },
  {
    label: "Minor ♭6",
    id: "mb6",
    intervals: ["1P", "3m", "5P", "6m"],
  },
  {
    label: "Half-diminished (m7b5)",
    id: "m7b5",
    intervals: ["1P", "3m", "5d", "7m"],
  },
  { label: "Sus2", id: "sus2", intervals: ["1P", "2M", "5P"] },
  { label: "Sus4", id: "sus4", intervals: ["1P", "4P", "5P"] },
  { label: "Diminished", id: "dim", intervals: ["1P", "3m", "5d"] },
  { label: "Augmented", id: "aug", intervals: ["1P", "3M", "5A"] },
];

const QUALITY_ALIAS_MAP: Array<{ regex: RegExp; id: string }> = [
  { regex: /maj13/i, id: "maj13" },
  { regex: /maj9/i, id: "maj9" },
  { regex: /maj7/i, id: "maj7" },
  { regex: /maj6|M6|6(?=$|\s|\/)/i, id: "maj6" },
  { regex: /(Δ|major)/i, id: "maj7" },
  { regex: /^M$/i, id: "maj" },
  { regex: /maj/i, id: "maj" },
  { regex: /m13/i, id: "m13" },
  { regex: /m11/i, id: "m11" },
  { regex: /m9/i, id: "m9" },
  { regex: /m7/i, id: "m7" },
  { regex: /m6/i, id: "m6" },
  { regex: /mb6|m♭6|mflat6/i, id: "mb6" },
  { regex: /(min|−)/i, id: "min" },
  { regex: /m/i, id: "min" },
  { regex: /13\(b9\)/i, id: "13" },
  { regex: /13/i, id: "13" },
  { regex: /b13/i, id: "13" },
  { regex: /#11/i, id: "13" },
  { regex: /add13/i, id: "13" },
  { regex: /add11/i, id: "m11" },
  { regex: /add9/i, id: "maj9" },
  { regex: /7\(b9\)/i, id: "7b9" },
  { regex: /b9/i, id: "7b9" },
  { regex: /alt/i, id: "7" },
  { regex: /9/i, id: "9" },
  { regex: /7/i, id: "7" },
  { regex: /m7b5|ø|half[-\s]?dim/i, id: "m7b5" },
  { regex: /dim7|°7/i, id: "dim" },
  { regex: /sus2/i, id: "sus2" },
  { regex: /sus4/i, id: "sus4" },
  { regex: /sus/i, id: "sus4" },
  { regex: /dim/i, id: "dim" },
  { regex: /aug/i, id: "aug" },
];

type ChordFormula = {
  name: string;
  intervals: string[];
  optional?: string[];
  aliases?: string[];
};

const intervalToSemitone = (interval: string) => {
  const semitones = Interval.semitones(interval);
  if (typeof semitones !== "number") {
    return null;
  }
  return ((semitones % 12) + 12) % 12;
};

const CUSTOM_CHORD_LIBRARY: ChordFormula[] = [
  {
    name: "major",
    intervals: ["1P", "3M", "5P"],
    optional: [],
    aliases: ["M"],
  },
  {
    name: "maj6",
    intervals: ["1P", "3M", "5P", "6M"],
    optional: ["5P"],
    aliases: ["maj6", "M6", "6"],
  },
  {
    name: "minor",
    intervals: ["1P", "3m", "5P"],
    optional: [],
    aliases: ["m"],
  },
  {
    name: "m6",
    intervals: ["1P", "3m", "5P", "6M"],
    optional: ["5P"],
    aliases: ["m6"],
  },
  {
    name: "mb6",
    intervals: ["1P", "3m", "5P", "6m"],
    optional: ["5P"],
    aliases: ["mb6", "mb♭6", "mflat6"],
  },
  {
    name: "maj7",
    intervals: ["1P", "3M", "5P", "7M"],
    optional: [],
  },
  {
    name: "m7",
    intervals: ["1P", "3m", "5P", "7m"],
    optional: [],
  },
  {
    name: "7",
    intervals: ["1P", "3M", "5P", "7m"],
    optional: [],
  },
  {
    name: "sus2",
    intervals: ["1P", "2M", "5P"],
    optional: [],
  },
  {
    name: "sus4",
    intervals: ["1P", "4P", "5P"],
    optional: [],
  },
  {
    name: "dim",
    intervals: ["1P", "3m", "5d"],
    optional: [],
  },
  {
    name: "aug",
    intervals: ["1P", "3M", "5A"],
    optional: [],
  },
  {
    name: "m11",
    intervals: ["1P", "3m", "5P", "7m", "9M", "11P"],
    optional: ["5P", "9M"],
    aliases: ["m11", "min11"],
  },
  {
    name: "m11 (no9)",
    intervals: ["1P", "3m", "5P", "7m", "11P"],
    optional: ["5P"],
    aliases: ["m11"],
  },
  {
    name: "m11 (shell)",
    intervals: ["1P", "3m", "7m", "11P"],
    optional: [],
    aliases: ["m11"],
  },
  {
    name: "m9",
    intervals: ["1P", "3m", "5P", "7m", "9M"],
    optional: ["5P"],
  },
  {
    name: "maj9",
    intervals: ["1P", "3M", "5P", "7M", "9M"],
    optional: ["5P"],
  },
  {
    name: "7sus4",
    intervals: ["1P", "4P", "5P", "7m"],
    optional: [],
  },
];

const SEMITONE_TO_INTERVAL: Record<number, string> = {
  0: "1P",
  1: "2m",
  2: "2M",
  3: "3m",
  4: "3M",
  5: "4P",
  6: "5d",
  7: "5P",
  8: "6m",
  9: "6M",
  10: "7m",
  11: "7M",
  12: "8P",
};

const emptySelection = () => Array(STRINGS.length).fill(-1);

const normalizeNote = (note: string) => {
  const normalized = note.replace("♯", "#").replace("♭", "b");
  if (normalized.includes("b")) {
    const enharmonic = Note.enharmonic(normalized);
    return enharmonic.replace("♯", "#");
  }
  return normalized;
};

const extractChordToken = (symbol: string) =>
  symbol.trim().split(/[\s(]+/)[0] ?? symbol.trim();

const mapSymbolToQuality = (
  symbol: string
): { root?: string; quality?: ChordQuality } | null => {
  const cleaned = extractChordToken(symbol);
  const match = cleaned.match(/^([A-Ga-g](?:#|b)?)/);
  if (!match) return null;
  const rawRoot = match[1];
  const normalizedRoot = normalizeNote(
    rawRoot.length === 1
      ? rawRoot.toUpperCase()
      : rawRoot[0].toUpperCase() + rawRoot.slice(1)
  );
  const qualityToken = cleaned.slice(rawRoot.length).trim();
  const alias = QUALITY_ALIAS_MAP.find(({ regex }) =>
    regex.test(qualityToken)
  );
  const quality = alias
    ? CHORD_QUALITIES.find((entry) => entry.id === alias.id)
    : undefined;

  return {
    root: normalizedRoot,
    quality,
  };
};

const enrichChordLabel = (
  root: string | null,
  baseLabel: string,
  intervals: { interval: string }[]
) => {
  if (!root) return baseLabel;
  const hasInterval = (targets: string[]) =>
    intervals.some((entry) => entry.interval && targets.includes(entry.interval));
  const hasMajorThird = hasInterval(["3M"]);
  const hasMinorThird = hasInterval(["3m"]);
  const hasSix = hasInterval(["6M", "13M"]);

  const lower = baseLabel.toLowerCase();
  if (
    hasMajorThird &&
    hasSix &&
    !lower.includes("6") &&
    !lower.includes("13")
  ) {
    return `${root}maj6`;
  }

  if (
    hasMinorThird &&
    hasSix &&
    !lower.includes("6") &&
    !lower.includes("13")
  ) {
    return `${root}m6`;
  }

  return baseLabel;
};

const getNoteName = (stringIndex: number, fret: number) => {
  const openNote = STRINGS[stringIndex].label;
  const startIndex = NOTE_SEQUENCE.indexOf(openNote);
  const noteIndex = (startIndex + fret) % NOTE_SEQUENCE.length;
  return NOTE_SEQUENCE[noteIndex];
};

const findFretForNote = (stringIndex: number, targetNote: string) => {
  for (let fret = 0; fret <= FRET_COUNT; fret++) {
    if (getNoteName(stringIndex, fret) === targetNote) {
      return fret;
    }
  }
  return -1;
};

type SelectedNote = {
  note: string;
  fret: number;
  stringLabel: string;
  stringIndex: number;
  midi: number;
};

function App() {
  const [selectedFrets, setSelectedFrets] = useState<number[]>(emptySelection);
  const [rootNote, setRootNote] = useState<string>("E");
  const [chordQuality, setChordQuality] = useState<ChordQuality>(
    CHORD_QUALITIES[0]
  );
  const [chordError, setChordError] = useState<string>("");
  const [insight, setInsight] = useState<string>("");
  const [insightTips, setInsightTips] = useState<string[]>([]);
  const [insightState, setInsightState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [progression, setProgression] = useState<ChordSummary[]>([]);
  const [progressionState, setProgressionState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [progressionSuggestions, setProgressionSuggestions] = useState<
    ProgressionSuggestion[]
  >([]);
  const [practicePrompt, setPracticePrompt] = useState<string>("");
  const [practiceState, setPracticeState] = useState<
    "idle" | "loading" | "error"
  >("idle");

  const selectedNotes: SelectedNote[] = useMemo(() => {
    return selectedFrets
      .map((fret, idx) =>
        fret >= 0
          ? {
              note: getNoteName(idx, fret),
              fret,
              stringLabel: STRINGS[idx].register,
              stringIndex: idx,
              midi: (STRING_BASE_MIDI[idx] ?? 0) + fret,
            }
          : null
      )
      .filter(Boolean) as SelectedNote[];
  }, [selectedFrets]);

  const lowestPitchNote = useMemo(() => {
    if (selectedNotes.length === 0) return null;
    return selectedNotes.reduce((lowest, current) => {
      if (!lowest) return current;
      return current.midi < lowest.midi ? current : lowest;
    });
  }, [selectedNotes]);

const uniqueNoteObjects = useMemo(() => {
  const map = new Map<string, { midi: number | null; priority: number }>();
  selectedNotes.forEach((note) => {
    const existing = map.get(note.note);
    const candidate = { midi: note.midi ?? null, priority: note.stringIndex };
    if (
      !existing ||
      (candidate.midi ?? Infinity) < (existing.midi ?? Infinity) ||
      candidate.priority > existing.priority
    ) {
      map.set(note.note, candidate);
    }
  });
  return Array.from(map.entries()).map(([name, data]) => ({
    name,
    midi: data.midi,
  }));
}, [selectedNotes]);

const activeNotes = useMemo(
  () =>
    uniqueNoteObjects
      .filter((item) => item.midi !== null)
      .map((item) => item.name),
  [uniqueNoteObjects]
);

const uniqueNotes = useMemo(
  () => uniqueNoteObjects.map((item) => item.name),
  [uniqueNoteObjects]
);

  const computeIntervalsFromRoot = (rootNote: string) => {
    const rootMidi =
      selectedNotes.find((note) => note.note === rootNote)?.midi ??
      (Note.midi(rootNote) ?? null);
    if (rootMidi === null) return [];

    return uniqueNoteObjects
      .filter((item) => item.name !== rootNote)
      .map((item) => {
        const targetMidi = item.midi;
        if (targetMidi === null) {
          return {
            note: item.name,
            interval: Interval.distance(rootNote, item.name),
            semitone: null,
          };
        }

        const diff = ((targetMidi - rootMidi) % 12 + 12) % 12;
        return {
          note: item.name,
          interval: SEMITONE_TO_INTERVAL[diff] ?? Interval.distance(rootNote, item.name),
          semitone: diff,
        };
      });
  };

type CustomChordCandidate = {
  label: string;
  symbol: string;
  completionScore: number;
};

const detectCustomChords = (): CustomChordCandidate[] => {
    if (activeNotes.length < 2) return [];
    const candidates: CustomChordCandidate[] = [];

    activeNotes.forEach((rootCandidate) => {
      const normalizedRoot = normalizeNote(rootCandidate);
      const intervalsFromRoot = computeIntervalsFromRoot(normalizedRoot);

      CUSTOM_CHORD_LIBRARY.forEach((formula) => {
        const essentialIntervals = formula.intervals
          .filter((interval) => interval !== "1P")
          .filter((interval) => !formula.optional?.includes(interval));

        const hasEssentials = essentialIntervals.every((interval) => {
          const targetSemitone = intervalToSemitone(interval);
          if (targetSemitone === null) return false;
          return intervalsFromRoot.some(
            (entry) =>
              entry.semitone === targetSemitone || entry.interval === interval
          );
        });

        if (!hasEssentials) return;

        const missingOptional =
          formula.optional?.filter(
            (optionalInterval) =>
              !intervalsFromRoot.some((entry) => {
                const targetSemitone = intervalToSemitone(optionalInterval);
                if (targetSemitone === null) return false;
                return (
                  entry.semitone === targetSemitone ||
                  entry.interval === optionalInterval
                );
              })
          ) ?? [];

        const completionScore =
          (formula.intervals.length - missingOptional.length) /
          formula.intervals.length;

        const symbol = `${normalizedRoot}${formula.aliases?.[0] ?? formula.name}`;
        const label =
          completionScore < 1
            ? `${symbol} (partial)`
            : symbol;

        candidates.push({
          label,
          symbol,
          completionScore,
        });
      });
    });

    const uniqueCandidatesMap = new Map<string, CustomChordCandidate>(
      candidates.map((candidate) => [candidate.symbol, candidate])
    );

    // ensure highest completionScore kept
    candidates.forEach((candidate) => {
      const existing = uniqueCandidatesMap.get(candidate.symbol);
      if (!existing || candidate.completionScore > existing.completionScore) {
        uniqueCandidatesMap.set(candidate.symbol, candidate);
      }
    });

    return Array.from(uniqueCandidatesMap.values());
  };

  const customCandidates = detectCustomChords();

const detectedChords = useMemo(() => {
    if (activeNotes.length < 2) return [];
    const tonalCandidates = Chord.detect(uniqueNotes).map((name) => ({
      label: name,
      symbol: name,
      completionScore: 1,
    }));
    const combined = [...customCandidates, ...tonalCandidates];

    const ranked = combined
      .map((candidate) => {
        const chord = Chord.get(candidate.symbol);
        const normalizedRoot = chord.tonic ? normalizeNote(chord.tonic) : null;
        const intervalsFromRoot = normalizedRoot
          ? computeIntervalsFromRoot(normalizedRoot)
          : [];
        let score = 0;

        if (normalizedRoot && lowestPitchNote && normalizedRoot === lowestPitchNote.note) {
          score += 4;
        }

        const hasExtendedStructure =
          Array.isArray(chord.intervals) && chord.intervals.length >= 4;
        if (hasExtendedStructure) {
          score += 1;
        }

        if (normalizedRoot && uniqueNotes.includes(normalizedRoot)) {
          score += 1;
        }

        const hasSeventh = intervalsFromRoot.some(
          (entry) => entry.interval === "7m" || entry.interval === "7M"
        );
        if (hasSeventh) {
          score += 2;
        }

        const hasExtension = intervalsFromRoot.some((entry) =>
          ["9m", "9M", "11P", "11A", "13M", "13m"].includes(entry.interval)
        );
        if (hasExtension) {
          score += 1;
        }

        score += candidate.completionScore ?? 0;

        return {
          label: enrichChordLabel(normalizedRoot, candidate.label, intervalsFromRoot),
          symbol: candidate.symbol,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.label);

    const deduped: string[] = [];
    ranked.forEach((label) => {
      if (!deduped.includes(label)) {
        deduped.push(label);
      }
    });

    const heuristics = new Set<string>();
    activeNotes.forEach((rootCandidate) => {
      const normalizedRoot = normalizeNote(rootCandidate);
      const intervals = computeIntervalsFromRoot(normalizedRoot);
      const hasInterval = (targets: string[]) =>
        intervals.some(
          (entry) => entry.interval && targets.includes(entry.interval)
        );
      const hasMajorThird = hasInterval(["3M"]);
      const hasMinorThird = hasInterval(["3m"]);
      const hasMajorSeventh = hasInterval(["7M"]);
      const hasMinorSeventh = hasInterval(["7m"]);
      const hasSixth = hasInterval(["6M", "13M"]);
      const hasFlatSix = hasInterval(["6m", "13m"]);

      if (hasMajorThird && hasMajorSeventh) {
        heuristics.add(`${normalizedRoot}maj7`);
      } else if (hasMinorThird && hasMinorSeventh) {
        heuristics.add(`${normalizedRoot}m7`);
      } else if (hasMajorThird && hasMinorSeventh) {
        heuristics.add(`${normalizedRoot}7`);
      }

      if (hasMajorThird && hasSixth && !hasMajorSeventh && !hasMinorSeventh) {
        heuristics.add(`${normalizedRoot}maj6`);
      }
      if (hasMinorThird && hasSixth && !hasMajorSeventh && !hasMinorSeventh) {
        heuristics.add(`${normalizedRoot}m6`);
      }
      if (hasMinorThird && hasFlatSix && !hasMajorSeventh && !hasMinorSeventh) {
        heuristics.add(`${normalizedRoot}mb6`);
      }
    });

    heuristics.forEach((label) => {
      if (!deduped.includes(label)) {
        deduped.push(label);
      }
    });

    return deduped;
  }, [activeNotes, uniqueNotes, lowestPitchNote, customCandidates]);

  const hasAiKey = import.meta.env.VITE_AI_DISABLED !== "true";

  const buildChordSummary = (): ChordSummary | null => {
    if (uniqueNotes.length === 0) return null;
    return {
      label: detectedChords[0] ?? "Custom voicing",
      notes: uniqueNotes,
      frets: selectedNotes.map((selected) => ({
        string: STRINGS[selected.stringIndex].label,
        fret: selected.fret,
      })),
    };
  };

  const handleExplainChord = async () => {
    const summary = buildChordSummary();
    if (!summary || !hasAiKey) return;
    setInsightState("loading");
    setInsight("");
    try {
      const payload = await fetchChordInsight(summary);
      setInsight(payload.insight);
      setInsightTips(payload.tips ?? []);
      setInsightState("idle");
    } catch (error) {
      setInsightState("error");
      setInsight(
        error instanceof Error ? error.message : "Something went sideways."
      );
    }
  };

  const handleAddProgression = () => {
    const summary = buildChordSummary();
    if (!summary) return;
    setProgression((prev) => {
      const next = [...prev, summary];
      return next.slice(-4);
    });
  };

  const handleClearProgression = () => {
    setProgression([]);
    setProgressionSuggestions([]);
  };

  const handleSuggestNext = async () => {
    if (progression.length === 0 || !hasAiKey) return;
    setProgressionState("loading");
    try {
      const suggestions = await fetchProgressionSuggestions(progression);
      setProgressionSuggestions(suggestions);
      setProgressionState("idle");
    } catch (error) {
      setProgressionState("error");
      setProgressionSuggestions([
        {
          name: "Oops",
          reason:
            error instanceof Error
              ? error.message
              : "AI suggestion failed unexpectedly.",
        },
      ]);
    }
  };

  const handlePracticeIdea = async () => {
    const summary = buildChordSummary();
    if (!summary || !hasAiKey) return;
    setPracticeState("loading");
    try {
      const prompt = await fetchPracticePrompt(summary);
      setPracticePrompt(prompt);
      setPracticeState("idle");
    } catch (error) {
      setPracticeState("error");
      setPracticePrompt(
        error instanceof Error ? error.message : "Practice prompt failed."
      );
    }
  };

  const handlePlotSuggestedChord = (symbol: string) => {
    const cleaned = extractChordToken(symbol);
    const chord = Chord.get(cleaned);
    const mapped = mapSymbolToQuality(symbol);
    let chordNotes = chord.notes ?? [];

    if (chordNotes.length === 0 && mapped?.root && mapped?.quality) {
      const generated = mapped.quality.intervals.map((interval) =>
        normalizeNote(Note.transpose(mapped.root!, interval))
      );
      chordNotes = generated;
    }

    if (chordNotes.length === 0) {
      setChordError(`Couldn't plot ${symbol}`);
      return;
    }

    if (mapped?.root) {
      setRootNote(mapped.root);
    }
    if (mapped?.quality) {
      setChordQuality(mapped.quality);
    }
    setChordError("");
    applyChordToBoard(chordNotes.map((note) => normalizeNote(note)));
  };

  const handleFretToggle = (stringIndex: number, fret: number) => {
    setSelectedFrets((prev) =>
      prev.map((current, idx) => {
        if (idx !== stringIndex) return current;
        return current === fret ? -1 : fret;
      })
    );
  };

  const handleClear = () => {
    setSelectedFrets(emptySelection());
    setChordError("");
  };

const applyChordToBoard = (notes: string[]) => {
    const layout = emptySelection();
    const stringOrder = STRINGS.map((_, idx) => idx).reverse(); // start from low E for voicing

    stringOrder.forEach((stringIdx, orderIdx) => {
      const targetNote = normalizeNote(notes[orderIdx % notes.length]);
      const fret = findFretForNote(stringIdx, targetNote);
      if (fret !== -1) {
        layout[stringIdx] = fret;
      }
    });

    setSelectedFrets(layout);
  };

  const handleApplyChord = () => {
    if (!chordQuality.intervals || chordQuality.intervals.length === 0) {
      setChordError("Chord shape unavailable. Try another quality.");
      return;
    }
    const generatedNotes = chordQuality.intervals
      .map((interval) => Note.transpose(rootNote, interval))
      .map((note) => normalizeNote(note));

    if (generatedNotes.length === 0) {
      setChordError("Chord shape unavailable. Try another quality.");
      return;
    }

    setChordError("");
    applyChordToBoard(generatedNotes);
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">FretNot • rebuilt</p>
          <h1>Visual chord explorer for modern guitarists</h1>
          <p className="lede">
            Tap the maple fretboard, detect shapes instantly with tonal.js, or
            drop in a root + quality to sketch voicings up to the 15th fret.
          </p>
        </div>
        <div className="hero-actions">
          <button className="ghost" onClick={handleClear}>
            Reset fretboard
          </button>
          <button className="primary" onClick={handleApplyChord}>
            Plot chord
          </button>
        </div>
      </header>

      <div className="workspace">
        <section className="fretboard-card">
          <div className="fretboard">
            {STRINGS.map((stringMeta, stringIdx) => (
              <div key={stringMeta.id} className="string-row">
                {Array.from({ length: FRET_COUNT + 1 }).map((_, fretIdx) => {
                  const isSelected = selectedFrets[stringIdx] === fretIdx;
                  const noteLabel = isSelected
                    ? getNoteName(stringIdx, fretIdx)
                    : null;
                  const fretClassNames = [
                    "fret",
                    fretIdx === 0 ? "nut" : "",
                    isSelected ? "selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button
                      key={`${stringMeta.id}-${fretIdx}`}
                      className={fretClassNames}
                      aria-pressed={isSelected}
                      onClick={() => handleFretToggle(stringIdx, fretIdx)}
                    >
                      {fretIdx === 0 && (
                        <span className="string-label">{stringMeta.label}</span>
                      )}
                      {isSelected && (
                        <span className="note-dot">
                          <span className="note-label">{noteLabel}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="fret-markers-row">
              {Array.from({ length: FRET_COUNT + 1 }).map((_, fretIdx) => (
                <div key={`marker-${fretIdx}`} className="marker-slot">
                  {MARKER_FRETS.includes(fretIdx) && (
                    <span
                      className={`marker-dot ${
                        fretIdx === 12 ? "double" : ""
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="board-footnote">
            Click any fret (0 = open) to place a finger. Tap again to mute that
            string.
          </p>
        </section>

        <aside className="control-panel">
        <section className="panel-block ai-block">
          <div className="ai-header">
            <div>
              <h2>AI coach</h2>
                {!hasAiKey && (
                  <p className="muted">
                    Configure a server-side <code>GEMINI_API_KEY</code> to enable
                    suggestions.
                  </p>
                )}
            </div>
            <div className="ai-actions">
              <button
                className="ai-btn"
                onClick={handleExplainChord}
                disabled={!hasAiKey || uniqueNotes.length === 0}
              >
                Explain chord
              </button>
              <button
                className="ai-btn ghost"
                onClick={handleAddProgression}
                disabled={uniqueNotes.length === 0}
              >
                Add to progression
              </button>
              <button
                className="ai-btn ghost"
                onClick={handlePracticeIdea}
                disabled={!hasAiKey || uniqueNotes.length === 0}
              >
                Practice idea
              </button>
            </div>
          </div>

          <div className="ai-card">
            <h3>Chord insight</h3>
            {insightState === "loading" ? (
              <p className="muted">Thinking about this voicing…</p>
            ) : insight ? (
              <>
                <p>{insight}</p>
                {insightTips.length > 0 && (
                  <ul className="tip-list">
                    {insightTips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="muted">
                Tap “Explain chord” to get an AI breakdown.
              </p>
            )}
          </div>

          <div className="progression-panel">
            <div className="progression-header">
              <div>
                <h3>Progression</h3>
                <p className="muted">
                  {progression.length === 0
                    ? "Add chords as you explore the board."
                    : "Up to four chords saved at a time."}
                </p>
              </div>
              {progression.length > 0 && (
                <button className="link-button" onClick={handleClearProgression}>
                  Clear
                </button>
              )}
            </div>
            <div className="progression-chips">
              {progression.map((chord, idx) => (
                <span key={`${chord.label}-${idx}`} className="chip">
                  {idx + 1}. {chord.label}
                </span>
              ))}
            </div>
            <button
              className="ai-btn"
              onClick={handleSuggestNext}
              disabled={!hasAiKey || progression.length === 0}
            >
              Suggest next chords
            </button>
            <div className="ai-card suggestions">
              {progressionState === "loading" ? (
                <p className="muted">Mapping options…</p>
              ) : progressionSuggestions.length > 0 ? (
                progressionSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="suggestion">
                    <strong>{suggestion.name}</strong>
                    <p>{suggestion.reason}</p>
                    <button
                      className="link-button"
                      onClick={() => handlePlotSuggestedChord(suggestion.name)}
                    >
                      Plot this chord
                    </button>
                  </div>
                ))
              ) : (
                <p className="muted">
                  Once you have chords in the queue, AI will pitch follow-ups.
                </p>
              )}
            </div>
          </div>

          <div className="ai-card">
            <h3>Practice idea</h3>
            {practiceState === "loading" ? (
              <p className="muted">Sketching an exercise…</p>
            ) : practicePrompt ? (
              <p>{practicePrompt}</p>
            ) : (
              <p className="muted">
                Ask for a practice idea to get tempo + technique guidance.
              </p>
            )}
          </div>
        </section>

        <section className="panel-block">
            <h2>Selected notes</h2>
            {selectedNotes.length === 0 ? (
              <p className="muted">No notes yet. Start tapping the fretboard.</p>
            ) : (
              <ul className="note-grid">
                {selectedNotes.map((item, idx) => (
                  <li key={`${item.stringLabel}-${item.fret}-${idx}`}>
                    <span className="note-chip">{item.note}</span>
                    <span className="note-meta">
                      {item.stringLabel} · fret {item.fret}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel-block">
            <div className="panel-header">
              <h2>Chord detection</h2>
              <span className="tag">
                {uniqueNotes.length} note{uniqueNotes.length === 1 ? "" : "s"}
              </span>
            </div>
            {detectedChords.length === 0 ? (
              <p className="muted">
                No chord match yet—try adding another note or tweak the voicing.
              </p>
            ) : (
              <ul className="detected-list">
                {detectedChords.slice(0, 3).map((name) => (
                  <li key={name}>
                    <span className="chord-name">{name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel-block">
            <h2>Chord sketcher</h2>
            <div className="form-grid">
              <label>
                Root
                <select
                  value={rootNote}
                  onChange={(event) => setRootNote(event.target.value)}
                >
                  {ROOT_NOTES.map((note) => (
                    <option key={note} value={note}>
                      {note}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quality
                <select
                  value={chordQuality.label}
                  onChange={(event) => {
                    const nextQuality =
                      CHORD_QUALITIES.find((quality) => quality.label === event.target.value) ??
                      CHORD_QUALITIES[0];
                    setChordQuality(nextQuality);
                  }}
                >
                  {CHORD_QUALITIES.map((quality) => (
                    <option key={quality.label} value={quality.label}>
                      {quality.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {chordError && <p className="error">{chordError}</p>}
            <div className="builder-actions">
              <button className="secondary" onClick={handleApplyChord}>
                Apply voicing
              </button>
              <button className="ghost" onClick={handleClear}>
                Clear
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default App;
