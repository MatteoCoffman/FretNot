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
import { AI_UNAVAILABLE_MESSAGE } from "./lib/gemini";
import { formatSlashLabel } from "./lib/chordDetection";
import {
  getToneRoleInfoFromRoot,
  legendRolesForNotes,
  parseChordRoot,
  toneRoleClassName,
  toneRoleTextClassName,
} from "./lib/chordToneRoles";
import {
  NO_PLAYABLE_VOICING_MSG,
  emptySelection,
  findPlayableVoicings,
  getNoteName,
  layoutKey,
  normalizeNote,
  pickVoicing,
  pitchClass,
} from "./lib/voicing";

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

const extractChordToken = (symbol: string) =>
  symbol.trim().split(/[\s(]+/)[0] ?? symbol.trim();

const getChordNotesFromSymbol = (symbol: string) => {
  const cleaned = extractChordToken(symbol);
  const chord = Chord.get(cleaned);
  const mapped = mapSymbolToQuality(symbol);
  let chordNotes = chord.notes ?? [];

  if (chordNotes.length === 0 && mapped?.root && mapped?.quality) {
    chordNotes = mapped.quality.intervals.map((interval) =>
      normalizeNote(Note.transpose(mapped.root!, interval))
    );
  }

  return chordNotes.map((note) => normalizeNote(note));
};

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
  const [voicingAnchor, setVoicingAnchor] = useState<{
    symbol: string;
    notes: string[];
  } | null>(null);

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

        const baseLabel = enrichChordLabel(
          normalizedRoot,
          candidate.label,
          intervalsFromRoot
        );

        return {
          label: formatSlashLabel(
            baseLabel,
            normalizedRoot,
            lowestPitchNote?.note ?? null
          ),
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
      const slashRoot = label.match(/^([A-Ga-g](?:#|b)?)/)?.[1];
      const normalizedSlashRoot = slashRoot
        ? normalizeNote(
            slashRoot.length === 1
              ? slashRoot.toUpperCase()
              : slashRoot[0].toUpperCase() + slashRoot.slice(1)
          )
        : null;
      const formatted = formatSlashLabel(
        label,
        normalizedSlashRoot,
        lowestPitchNote?.note ?? null
      );
      if (!deduped.includes(formatted)) {
        deduped.push(formatted);
      }
    });

    return deduped;
  }, [activeNotes, uniqueNotes, lowestPitchNote, customCandidates]);

  const detectedChordRoot = useMemo(() => {
    const primarySymbol = voicingAnchor?.symbol ?? detectedChords[0] ?? null;
    if (!primarySymbol) return null;
    return parseChordRoot(primarySymbol);
  }, [voicingAnchor, detectedChords]);

  const chordRootReferenceMidi = useMemo(() => {
    if (!detectedChordRoot) return null;
    const rootPc = pitchClass(detectedChordRoot);
    if (rootPc === null) return null;

    const rootOnBoard = selectedNotes.filter(
      (note) => pitchClass(note.note) === rootPc
    );
    if (rootOnBoard.length > 0) {
      return Math.min(...rootOnBoard.map((note) => note.midi));
    }

    return Note.midi(`${detectedChordRoot}2`) ?? Note.midi(detectedChordRoot);
  }, [detectedChordRoot, selectedNotes]);

  const toneLegendItems = useMemo(() => {
    if (!detectedChordRoot) return [];
    return legendRolesForNotes(
      detectedChordRoot,
      selectedNotes.map((item) => ({ note: item.note, midi: item.midi })),
      chordRootReferenceMidi
    );
  }, [detectedChordRoot, selectedNotes, chordRootReferenceMidi]);

  const getBoardToneInfo = (stringIdx: number, note: string) => {
    if (!detectedChordRoot) return null;
    const entry = selectedNotes.find((item) => item.stringIndex === stringIdx);
    return getToneRoleInfoFromRoot(detectedChordRoot, note, {
      rootMidi: chordRootReferenceMidi,
      noteMidi: entry?.midi,
    });
  };

  const hasAiKey = import.meta.env.VITE_AI_DISABLED !== "true";

  const alternateVoicings = useMemo(() => {
    if (voicingAnchor) return findPlayableVoicings(voicingAnchor.notes);
    if (detectedChords.length === 0) return [];
    return findPlayableVoicings(getChordNotesFromSymbol(detectedChords[0]));
  }, [voicingAnchor, detectedChords]);

  const hasAlternateFingering = alternateVoicings.length > 1;

  const applyPlayableVoicing = (
    notes: string[],
    options: { variantIndex?: number; symbol?: string } = {}
  ) => {
    const { variantIndex = 0, symbol } = options;
    const voicing = pickVoicing(notes, { variantIndex });
    if (!voicing) {
      setChordError(NO_PLAYABLE_VOICING_MSG);
      return false;
    }
    setChordError("");
    setSelectedFrets(voicing);
    if (symbol) {
      setVoicingAnchor({ symbol, notes });
    }
    return true;
  };

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
        error instanceof Error ? error.message : AI_UNAVAILABLE_MESSAGE
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
          name: "AI suggestions",
          reason:
            error instanceof Error
              ? error.message
              : AI_UNAVAILABLE_MESSAGE,
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
        error instanceof Error ? error.message : AI_UNAVAILABLE_MESSAGE
      );
    }
  };

  const handlePlotSuggestedChord = (symbol: string) => {
    const chordNotes = getChordNotesFromSymbol(symbol);

    if (chordNotes.length === 0) {
      setChordError(`Couldn't plot ${symbol}`);
      return;
    }

    const mapped = mapSymbolToQuality(symbol);
    if (mapped?.root) {
      setRootNote(mapped.root);
    }
    if (mapped?.quality) {
      setChordQuality(mapped.quality);
    }
    applyPlayableVoicing(chordNotes, { symbol: extractChordToken(symbol) });
  };

  const handleAlternateFingering = () => {
    const anchor =
      voicingAnchor ??
      (detectedChords[0]
        ? {
            symbol: detectedChords[0],
            notes: getChordNotesFromSymbol(detectedChords[0]),
          }
        : null);

    if (!anchor) return;

    if (!voicingAnchor) {
      setVoicingAnchor(anchor);
    }

    const voicings = findPlayableVoicings(anchor.notes);
    if (voicings.length <= 1) return;

    const currentKey = layoutKey(selectedFrets);
    const currentIdx = voicings.findIndex(
      (voicing) => layoutKey(voicing) === currentKey
    );
    const nextIdx =
      currentIdx >= 0 ? (currentIdx + 1) % voicings.length : 0;
    const nextLayout = voicings[nextIdx];

    if (layoutKey(nextLayout) === currentKey) return;

    const mapped = mapSymbolToQuality(anchor.symbol);
    if (mapped?.root) setRootNote(mapped.root);
    if (mapped?.quality) setChordQuality(mapped.quality);

    setChordError("");
    setSelectedFrets(nextLayout);
  };

  const handleFretToggle = (stringIndex: number, fret: number) => {
    setVoicingAnchor(null);
    setSelectedFrets((prev) =>
      prev.map((current, idx) => {
        if (idx !== stringIndex) return current;
        return current === fret ? -1 : fret;
      })
    );
  };

  const handleClear = () => {
    setSelectedFrets(emptySelection());
    setVoicingAnchor(null);
    setChordError("");
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

    applyPlayableVoicing(generatedNotes, {
      symbol: `${rootNote}${chordQuality.id}`,
    });
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">FretNot</p>
        <h1>Visual chord explorer for modern guitarists</h1>
        <p className="lede">
          Tap the fretboard, detect shapes instantly, or drop in a root +
          quality to sketch voicings up to the 15th fret.
        </p>
      </header>

      <div className="workspace">
        <section className="fretboard-card">
          <div className="fretboard-scroll">
            <div className="fretboard-layout">
              <div className="fretboard">
                {STRINGS.map((stringMeta, stringIdx) => (
                  <div key={stringMeta.id} className="string-row">
                    {Array.from({ length: FRET_COUNT + 1 }).map((_, fretIdx) => {
                      const isSelected = selectedFrets[stringIdx] === fretIdx;
                      const noteLabel = isSelected
                        ? getNoteName(stringIdx, fretIdx)
                        : null;
                      const toneInfo = noteLabel
                        ? getBoardToneInfo(stringIdx, noteLabel)
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
                          type="button"
                          className={fretClassNames}
                          aria-pressed={isSelected}
                          aria-label={`${stringMeta.label} string, fret ${fretIdx}${
                            noteLabel ? `, ${noteLabel}` : ", muted"
                          }`}
                          onClick={() => handleFretToggle(stringIdx, fretIdx)}
                        >
                          {fretIdx === 0 && !isSelected && (
                            <span className="string-label">
                              {stringMeta.label}
                            </span>
                          )}
                          {isSelected && (
                            <span
                              className={
                                toneInfo
                                  ? `note-dot ${toneRoleClassName(toneInfo.role)}`
                                  : "note-dot"
                              }
                            >
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
              <aside className="string-roles-rail" aria-label="String tone roles">
                {STRINGS.map((stringMeta, stringIdx) => {
                  const selectedFret = selectedFrets[stringIdx];
                  const stringNoteLabel =
                    selectedFret >= 0
                      ? getNoteName(stringIdx, selectedFret)
                      : null;
                  const toneInfo = stringNoteLabel
                    ? getBoardToneInfo(stringIdx, stringNoteLabel)
                    : null;

                  return (
                    <div
                      key={`role-${stringMeta.id}`}
                      className={`string-role-label${
                        toneInfo
                          ? ` ${toneRoleTextClassName(toneInfo.role)}`
                          : ""
                      }`}
                      aria-label={
                        toneInfo
                          ? `${stringMeta.label} string: ${toneInfo.label}`
                          : undefined
                      }
                    >
                      {toneInfo?.shortLabel ?? ""}
                    </div>
                  );
                })}
                <div className="string-roles-rail-spacer" aria-hidden="true" />
              </aside>
            </div>
          </div>

          <div className="live-panel" aria-live="polite">
            <div className="live-panel-header">
              <div className="live-panel-title">
                <h2>Chord detection</h2>
                <span className="tag">
                  {uniqueNotes.length} note{uniqueNotes.length === 1 ? "" : "s"}
                </span>
              </div>
              <button
                type="button"
                className="ghost ghost-sm"
                onClick={handleClear}
                disabled={selectedNotes.length === 0}
              >
                Clear board
              </button>
            </div>

            {detectedChords.length === 0 && !voicingAnchor ? (
              <p className="muted live-empty">
                {selectedNotes.length === 0
                  ? "Tap the fretboard to start — matches appear here instantly."
                  : "No chord match yet — try adding another note or tweak the voicing."}
              </p>
            ) : (
              <>
                <div className="detected-chords">
                  {voicingAnchor && (
                    <span className="detected-chord-label detected-chord-label--primary">
                      {voicingAnchor.symbol}
                    </span>
                  )}
                  {(voicingAnchor
                    ? detectedChords.filter(
                        (name) => name !== voicingAnchor.symbol
                      )
                    : detectedChords
                  )
                    .slice(0, voicingAnchor ? 2 : 3)
                    .map((name, idx) => (
                      <span
                        key={name}
                        className={`detected-chord-label${
                          !voicingAnchor && idx === 0
                            ? " detected-chord-label--primary"
                            : ""
                        }`}
                      >
                        {name}
                      </span>
                    ))}
                </div>
                <button
                  type="button"
                  className="alternate-fingering-btn"
                  onClick={handleAlternateFingering}
                  disabled={!hasAlternateFingering}
                  title={
                    hasAlternateFingering
                      ? "Show another way to play this chord on the fretboard"
                      : "No alternate shape available for this voicing"
                  }
                >
                  Alternate fingering
                </button>
                {toneLegendItems.length > 0 && (
                  <ul className="tone-legend" aria-label="Chord tone colors">
                    {toneLegendItems.map((item) => (
                      <li key={item.shortLabel} className="tone-legend-item">
                        <span
                          className={`tone-legend-swatch ${toneRoleClassName(item.role)}`}
                          aria-hidden="true"
                        />
                        <span className="tone-legend-label">
                          {item.shortLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {selectedNotes.length > 0 && (
              <ul className="active-notes" aria-label="Active notes">
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
          </div>

          <p className="board-footnote">
            Click any fret (open string = 0) to place a finger. Tap again to
            mute. Plotted voicings stay within a 5-fret hand span — use
            alternate fingering to explore another playable shape.
          </p>
        </section>

        <aside className="control-panel">
          <section className="panel-block">
            <h2>Chord sketcher</h2>
            <p className="muted panel-intro">
              Pick a root and quality to plot a voicing on the board.
            </p>
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
                      CHORD_QUALITIES.find(
                        (quality) => quality.label === event.target.value
                      ) ?? CHORD_QUALITIES[0];
                    setChordQuality(nextQuality);
                  }}
                >
                  <optgroup label="Triads &amp; basics">
                    {CHORD_QUALITIES.filter((q) =>
                      [
                        "Major",
                        "Minor",
                        "Sus2",
                        "Sus4",
                        "Diminished",
                        "Augmented",
                      ].includes(q.label)
                    ).map((quality) => (
                      <option key={quality.label} value={quality.label}>
                        {quality.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Sevenths">
                    {CHORD_QUALITIES.filter((q) =>
                      [
                        "Dominant 7",
                        "Major 7",
                        "Minor 7",
                        "Half-diminished (m7b5)",
                      ].includes(q.label)
                    ).map((quality) => (
                      <option key={quality.label} value={quality.label}>
                        {quality.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Sixths">
                    {CHORD_QUALITIES.filter((q) =>
                      ["Major 6", "Minor 6", "Minor ♭6"].includes(q.label)
                    ).map((quality) => (
                      <option key={quality.label} value={quality.label}>
                        {quality.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Extensions">
                    {CHORD_QUALITIES.filter(
                      (q) =>
                        ![
                          "Major",
                          "Minor",
                          "Sus2",
                          "Sus4",
                          "Diminished",
                          "Augmented",
                          "Dominant 7",
                          "Major 7",
                          "Minor 7",
                          "Half-diminished (m7b5)",
                          "Major 6",
                          "Minor 6",
                          "Minor ♭6",
                        ].includes(q.label)
                    ).map((quality) => (
                      <option key={quality.label} value={quality.label}>
                        {quality.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
            </div>
            {chordError && <p className="error">{chordError}</p>}
            <div className="builder-actions">
              <button
                type="button"
                className="primary builder-primary"
                onClick={handleApplyChord}
              >
                Plot on board
              </button>
            </div>
          </section>

          <details className="panel-block ai-details">
            <summary className="ai-summary">
              <span>AI coach</span>
              <span className="ai-summary-hint">Explain · Progression · Practice</span>
            </summary>

            <div className="ai-block-inner">
              <div className="ai-actions">
                <button
                  type="button"
                  className="ai-btn"
                  onClick={handleExplainChord}
                  disabled={!hasAiKey || uniqueNotes.length === 0}
                >
                  Explain chord
                </button>
                <button
                  type="button"
                  className="ai-btn ghost"
                  onClick={handleAddProgression}
                  disabled={uniqueNotes.length === 0}
                >
                  Add to progression
                </button>
                <button
                  type="button"
                  className="ai-btn ghost"
                  onClick={handlePracticeIdea}
                  disabled={!hasAiKey || uniqueNotes.length === 0}
                >
                  Practice idea
                </button>
              </div>

              {(insight || insightState === "loading") && (
                <div className="ai-card">
                  <h3>Chord insight</h3>
                  {insightState === "loading" ? (
                    <p className="muted">Thinking about this voicing…</p>
                  ) : (
                    <>
                      <p className={insightState === "error" ? "muted" : undefined}>
                        {insight}
                      </p>
                      {insightTips.length > 0 && (
                        <ul className="tip-list">
                          {insightTips.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="progression-panel">
                <div className="progression-header">
                  <div>
                    <h3>Progression</h3>
                    {progression.length > 0 && (
                      <p className="muted">Up to four chords saved.</p>
                    )}
                  </div>
                  {progression.length > 0 && (
                    <button
                      type="button"
                      className="link-button"
                      onClick={handleClearProgression}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {progression.length > 0 && (
                  <div className="progression-chips">
                    {progression.map((chord, idx) => (
                      <span key={`${chord.label}-${idx}`} className="chip">
                        {idx + 1}. {chord.label}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="ai-btn"
                  onClick={handleSuggestNext}
                  disabled={!hasAiKey || progression.length === 0}
                >
                  Suggest next chords
                </button>
                {(progressionSuggestions.length > 0 ||
                  progressionState === "loading") && (
                  <div className="ai-card suggestions">
                    {progressionState === "loading" ? (
                      <p className="muted">Mapping options…</p>
                    ) : (
                      progressionSuggestions.map((suggestion, idx) => (
                        <div key={idx} className="suggestion">
                          {progressionState !== "error" && (
                            <strong>{suggestion.name}</strong>
                          )}
                          <p
                            className={
                              progressionState === "error" ? "muted" : undefined
                            }
                          >
                            {suggestion.reason}
                          </p>
                          {progressionState !== "error" && (
                            <button
                              type="button"
                              className="link-button"
                              onClick={() =>
                                handlePlotSuggestedChord(suggestion.name)
                              }
                            >
                              Plot this chord
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {(practicePrompt || practiceState === "loading") && (
                <div className="ai-card">
                  <h3>Practice idea</h3>
                  {practiceState === "loading" ? (
                    <p className="muted">Sketching an exercise…</p>
                  ) : (
                    <p className={practiceState === "error" ? "muted" : undefined}>
                      {practicePrompt}
                    </p>
                  )}
                </div>
              )}
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}

export default App;
