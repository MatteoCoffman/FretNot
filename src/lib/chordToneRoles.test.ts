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
    expect(roles).toContain("ninthMajor");
    notes.forEach((entry) => {
      expect(
        getToneRoleInfoFromRoot("C", entry.note, {
          rootMidi: 48,
          noteMidi: entry.midi,
        })?.role
      ).toBeTruthy();
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
