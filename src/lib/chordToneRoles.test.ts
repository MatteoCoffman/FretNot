import { describe, expect, it } from "vitest";
import {
  buildChordToneRoleMap,
  getRoleForNote,
  intervalToToneRole,
  legendRolesForMap,
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
  });
});

describe("buildChordToneRoleMap", () => {
  it("maps Cmaj7 tones correctly", () => {
    const roles = buildChordToneRoleMap("Cmaj7");
    expect(getRoleForNote(roles, "C")).toBe("root");
    expect(getRoleForNote(roles, "E")).toBe("thirdMajor");
    expect(getRoleForNote(roles, "G")).toBe("fifth");
    expect(getRoleForNote(roles, "B")).toBe("seventhMajor");
  });

  it("maps Em tones correctly", () => {
    const roles = buildChordToneRoleMap("Em");
    expect(getRoleForNote(roles, "E")).toBe("root");
    expect(getRoleForNote(roles, "G")).toBe("thirdMinor");
    expect(getRoleForNote(roles, "B")).toBe("fifth");
  });

  it("maps Cm7 with minor third and minor seventh", () => {
    const roles = buildChordToneRoleMap("Cm7");
    expect(getRoleForNote(roles, "C")).toBe("root");
    expect(getRoleForNote(roles, "Eb")).toBe("thirdMinor");
    expect(getRoleForNote(roles, "D#")).toBe("thirdMinor");
    expect(getRoleForNote(roles, "G")).toBe("fifth");
    expect(getRoleForNote(roles, "Bb")).toBe("seventhMinor");
    expect(getRoleForNote(roles, "A#")).toBe("seventhMinor");
  });

  it("maps slash chords using the chord root", () => {
    const roles = buildChordToneRoleMap("Cmaj7/E");
    expect(getRoleForNote(roles, "C")).toBe("root");
    expect(getRoleForNote(roles, "E")).toBe("thirdMajor");
  });

  it("includes ninth role for G9", () => {
    const roles = buildChordToneRoleMap("G9");
    expect(getRoleForNote(roles, "G")).toBe("root");
    expect(getRoleForNote(roles, "A")).toBe("ninthMajor");
    expect(legendRolesForMap(roles)).toContain("ninthMajor");
  });

  it("includes ninth role for Cmaj9", () => {
    const roles = buildChordToneRoleMap("Cmaj9");
    expect(getRoleForNote(roles, "D")).toBe("ninthMajor");
  });
});

describe("toneRoleClassName", () => {
  it("returns css modifier class names", () => {
    expect(toneRoleClassName("fifth")).toBe("note-dot--fifth");
    expect(toneRoleClassName("thirdMinor")).toBe("note-dot--thirdMinor");
  });
});
