import { describe, expect, it } from "vitest";
import {
  buildChordToneRoleMap,
  getRoleForNote,
  getToneRoleInfoFromRoot,
  intervalToToneRole,
  legendRolesForNotes,
  toneRoleClassName,
} from "./chordToneRoles";

describe("intervalToToneRole", () => {
  it("maps core intervals to roles", () => {
    expect(intervalToToneRole("1P")).toBe("root");
    expect(intervalToToneRole("3M")).toBe("thirdMajor");
    expect(intervalToToneRole("3m")).toBe("thirdMinor");
    expect(intervalToToneRole("5P")).toBe("fifth");
    expect(intervalToToneRole("7M")).toBe("seventhMajor");
    expect(intervalToToneRole("7m")).toBe("seventhMinor");
    expect(intervalToToneRole("9M")).toBe("ninthMajor");
    expect(intervalToToneRole("6M")).toBe("sixthMajor");
  });
});

describe("getToneRoleInfoFromRoot", () => {
  it("maps Cmaj7 tones correctly", () => {
    expect(getToneRoleInfoFromRoot("C", "C")?.role).toBe("root");
    expect(getToneRoleInfoFromRoot("C", "E")?.role).toBe("thirdMajor");
    expect(getToneRoleInfoFromRoot("C", "G")?.role).toBe("fifth");
    expect(getToneRoleInfoFromRoot("C", "B")?.role).toBe("seventhMajor");
  });

  it("labels a 9th using board midi when available", () => {
    const info = getToneRoleInfoFromRoot("C", "D", {
      rootMidi: 48,
      noteMidi: 62,
    });
    expect(info?.role).toBe("ninthMajor");
    expect(info?.shortLabel).toBe("Maj 9");
  });

  it("labels major 6th tones", () => {
    const info = getToneRoleInfoFromRoot("C", "A");
    expect(info?.role).toBe("sixthMajor");
    expect(info?.shortLabel).toBe("Maj 6");
  });

  it("labels every note on a Cmaj9 board", () => {
    const notes = [
      { note: "C", midi: 48 },
      { note: "E", midi: 52 },
      { note: "G", midi: 55 },
      { note: "B", midi: 59 },
      { note: "D", midi: 62 },
    ];
    const roles = legendRolesForNotes("C", notes, 48);
    expect(roles.map((item) => item.role)).toContain("ninthMajor");
    notes.forEach((entry) => {
      expect(
        getToneRoleInfoFromRoot("C", entry.note, {
          rootMidi: 48,
          noteMidi: entry.midi,
        })?.role
      ).toBeTruthy();
    });
  });

  it("preserves b5 label in legend instead of generic 5th", () => {
    const items = legendRolesForNotes("C", [{ note: "Gb", midi: 54 }], 48);
    expect(items).toHaveLength(1);
    expect(items[0]?.shortLabel).toBe("b5");
    expect(items[0]?.role).toBe("fifth");
  });

  it("dedupes duplicate roots in legend", () => {
    const items = legendRolesForNotes(
      "C",
      [
        { note: "C", midi: 48 },
        { note: "C", midi: 60 },
      ],
      48
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.shortLabel).toBe("Root");
  });

  it("labels compound fifth above bass root as 5th, not Ext", () => {
    // Gmaj7 voicing 3,x,4,4,3,x — D on B string is a 12th above bass G
    const info = getToneRoleInfoFromRoot("G", "D", {
      rootMidi: 43,
      noteMidi: 62,
    });
    expect(info?.role).toBe("fifth");
    expect(info?.shortLabel).toBe("5th");
  });

  it("labels G# above bass G as b2 for wide Gmaj7 voicing 3,x,4,4,3,4", () => {
    const gSharp = getToneRoleInfoFromRoot("G", "G#", {
      rootMidi: 43,
      noteMidi: 68,
    });
    expect(gSharp?.role).toBe("secondMinor");
    expect(gSharp?.shortLabel).toBe("b2");

    const voicing = [
      { note: "G", midi: 43 },
      { note: "F#", midi: 54 },
      { note: "B", midi: 59 },
      { note: "D", midi: 62 },
      { note: "G#", midi: 68 },
    ];
    const legend = legendRolesForNotes("G", voicing, 43);
    expect(legend.map((item) => item.shortLabel)).toEqual([
      "Root",
      "b2",
      "Maj 3",
      "5th",
      "Maj 7",
    ]);
    voicing.forEach((entry) => {
      expect(
        getToneRoleInfoFromRoot("G", entry.note, {
          rootMidi: 43,
          noteMidi: entry.midi,
        })?.shortLabel
      ).not.toBe("Ext");
    });
  });
});

describe("buildChordToneRoleMap", () => {
  it("maps slash chords using the chord root", () => {
    const roles = buildChordToneRoleMap("Cmaj7/E");
    expect(getRoleForNote(roles, "C")).toBe("root");
    expect(getRoleForNote(roles, "E")).toBe("thirdMajor");
  });

  it("includes ninth role for G9", () => {
    const roles = buildChordToneRoleMap("G9");
    expect(getRoleForNote(roles, "A")).toBe("ninthMajor");
  });
});

describe("toneRoleClassName", () => {
  it("returns css modifier class names", () => {
    expect(toneRoleClassName("fifth")).toBe("note-dot--fifth");
    expect(toneRoleClassName("ninthMajor")).toBe("note-dot--ninthMajor");
  });
});
