import { useMemo, useState } from "react";
import { Chord, Interval, Note } from "@tonaljs/tonal";
import "./App.css";

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
const CHORD_QUALITIES = [
  { label: "Major", id: "maj", intervals: ["1P", "3M", "5P"] },
  { label: "Minor", id: "min", intervals: ["1P", "3m", "5P"] },
  { label: "Dominant 7", id: "7", intervals: ["1P", "3M", "5P", "7m"] },
  { label: "Major 7", id: "maj7", intervals: ["1P", "3M", "5P", "7M"] },
  { label: "Minor 7", id: "m7", intervals: ["1P", "3m", "5P", "7m"] },
  { label: "Sus2", id: "sus2", intervals: ["1P", "2M", "5P"] },
  { label: "Sus4", id: "sus4", intervals: ["1P", "4P", "5P"] },
  { label: "Diminished", id: "dim", intervals: ["1P", "3m", "5d"] },
  { label: "Augmented", id: "aug", intervals: ["1P", "3M", "5A"] },
] as const;

type ChordQuality = (typeof CHORD_QUALITIES)[number];

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
    name: "minor",
    intervals: ["1P", "3m", "5P"],
    optional: [],
    aliases: ["m"],
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
  const [chordQuality, setChordQuality] = useState<ChordQuality>(CHORD_QUALITIES[0]);
  const [chordError, setChordError] = useState<string>("");

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

  const uniqueNotes = useMemo(
    () => Array.from(new Set(selectedNotes.map((n) => n.note))),
    [selectedNotes]
  );

  const uniqueNoteObjects = useMemo(() => {
    return uniqueNotes.map((note) => ({
      name: note,
      midi: selectedNotes.find((item) => item.note === note)?.midi ?? null,
    }));
  }, [uniqueNotes, selectedNotes]);

  const computeIntervalsFromRoot = (rootNote: string) => {
    return uniqueNoteObjects
      .filter((item) => item.name !== rootNote)
      .map((item) => {
        const rootMidi =
          selectedNotes.find((note) => note.note === rootNote)?.midi ?? null;
        const targetMidi = item.midi;
        if (rootMidi === null || targetMidi === null) {
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
    if (uniqueNotes.length < 2) return [];
    const candidates: CustomChordCandidate[] = [];

    uniqueNotes.forEach((rootCandidate) => {
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
    if (uniqueNotes.length < 2) return [];
    const tonalCandidates = Chord.detect(uniqueNotes).map((name) => ({
      label: name,
      symbol: name,
      completionScore: 1,
    }));
    const combined = [...customCandidates, ...tonalCandidates];

    return combined
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
          label: candidate.label,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.label);
  }, [uniqueNotes, lowestPitchNote, customCandidates]);

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
                Need at least two unique notes to guess a chord.
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
