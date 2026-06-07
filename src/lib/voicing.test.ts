import { describe, expect, it } from "vitest";
import {
  chordPitchClasses,
  findPlayableVoicings,
  getNoteName,
  isPlayableLayout,
  layoutKey,
  pickVoicing,
  pitchClass,
} from "./voicing";

const layoutPitchClasses = (layout: number[]) => {
  const pcs = new Set<number>();
  layout.forEach((fret, stringIdx) => {
    if (fret < 0) return;
    const pc = pitchClass(getNoteName(stringIdx, fret));
    if (pc !== null) pcs.add(pc);
  });
  return pcs;
};

const matchedChordPitchClasses = (
  layout: number[],
  chordNotes: string[]
) => {
  const chordPCs = chordPitchClasses(chordNotes);
  const matched = new Set<number>();
  layout.forEach((fret, stringIdx) => {
    if (fret < 0) return;
    const pc = pitchClass(getNoteName(stringIdx, fret));
    if (pc !== null && chordPCs.has(pc)) matched.add(pc);
  });
  return matched;
};

describe("isPlayableLayout", () => {
  it("allows open C major shape", () => {
    expect(isPlayableLayout([0, 0, 1, 3, 3, 0])).toBe(true);
  });

  it("rejects wide fretted spans", () => {
    expect(isPlayableLayout([1, 1, 1, 1, 8, 8])).toBe(false);
  });

  it("allows a single fretted note with open strings", () => {
    expect(isPlayableLayout([-1, 0, 2, -1, -1, -1])).toBe(true);
  });

  it("rejects more than four fretted strings", () => {
    expect(isPlayableLayout([1, 2, 3, 4, 5, -1])).toBe(false);
  });
});

describe("findPlayableVoicings", () => {
  it("finds at least one voicing for C major", () => {
    const voicings = findPlayableVoicings(["C", "E", "G"]);
    expect(voicings.length).toBeGreaterThan(0);
    voicings.forEach((layout) => {
      expect(isPlayableLayout(layout)).toBe(true);
    });
  });

  it("finds at least one voicing for Am", () => {
    const voicings = findPlayableVoicings(["A", "C", "E"]);
    expect(voicings.length).toBeGreaterThan(0);
  });

  it("finds multiple alternate fingerings for common chords", () => {
    const voicings = findPlayableVoicings(["G", "B", "D"]);
    expect(voicings.length).toBeGreaterThan(1);
  });

  it("finds C#maj7 voicings with all four pitch classes", () => {
    const chordNotes = ["C#", "E#", "G#", "B#"];
    const voicings = findPlayableVoicings(chordNotes);
    expect(voicings.length).toBeGreaterThan(0);

    const requiredPCs = chordPitchClasses(chordNotes);
    voicings.forEach((layout) => {
      const matched = matchedChordPitchClasses(layout, chordNotes);
      expect(matched.size).toBe(requiredPCs.size);
    });
  });

  it("does not accept two-note root-plus-fifth layouts for maj7", () => {
    const chordNotes = ["C#", "E#", "G#", "B#"];
    const requiredPCs = chordPitchClasses(chordNotes);
    const voicings = findPlayableVoicings(chordNotes);

    voicings.forEach((layout) => {
      expect(matchedChordPitchClasses(layout, chordNotes).size).toBeGreaterThan(
        2
      );
      expect(matchedChordPitchClasses(layout, chordNotes).size).toBe(
        requiredPCs.size
      );
    });
  });

  it("matches enharmonic chord tones to fretboard spellings", () => {
    const voicings = findPlayableVoicings(["C#", "E#", "G#"]);
    expect(voicings.length).toBeGreaterThan(0);

    const thirdPC = pitchClass("E#");
    voicings.forEach((layout) => {
      const boardPCs = layoutPitchClasses(layout);
      expect(boardPCs.has(thirdPC!)).toBe(true);
    });
  });
});

describe("pickVoicing", () => {
  it("returns null when no playable voicing exists", () => {
    expect(pickVoicing([])).toBeNull();
  });

  it("returns the first ranked voicing by default", () => {
    const voicing = pickVoicing(["D", "F#", "A"]);
    expect(voicing).not.toBeNull();
    if (voicing) {
      expect(isPlayableLayout(voicing)).toBe(true);
    }
  });

  it("returns C#maj7 voicing including 3rd and 7th pitch classes", () => {
    const chordNotes = ["C#", "E#", "G#", "B#"];
    const voicing = pickVoicing(chordNotes);
    expect(voicing).not.toBeNull();
    if (!voicing) return;

    const matched = matchedChordPitchClasses(voicing, chordNotes);
    expect(matched.has(pitchClass("C#")!)).toBe(true);
    expect(matched.has(pitchClass("E#")!)).toBe(true);
    expect(matched.has(pitchClass("G#")!)).toBe(true);
    expect(matched.has(pitchClass("B#")!)).toBe(true);
  });

  it("prefers Cmaj7 root-in-bass over low E inversion", () => {
    const voicing = pickVoicing(["C", "E", "G", "B"]);
    expect(voicing).not.toBeNull();
    if (!voicing) return;

    const withLowE = [0, 0, 0, -1, 3, 0];
    const rootInBass = [0, 0, 0, -1, 3, -1];
    expect(layoutKey(voicing)).toBe(layoutKey(rootInBass));
    expect(layoutKey(voicing)).not.toBe(layoutKey(withLowE));
  });
});
