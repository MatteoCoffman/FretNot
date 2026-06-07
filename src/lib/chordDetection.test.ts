import { describe, expect, it } from "vitest";
import { formatSlashLabel } from "./chordDetection";

describe("formatSlashLabel", () => {
  it("appends bass note when root differs from bass", () => {
    expect(formatSlashLabel("Cmaj7", "C", "E")).toBe("Cmaj7/E");
  });

  it("returns symbol unchanged when root equals bass", () => {
    expect(formatSlashLabel("Em", "E", "E")).toBe("Em");
  });

  it("preserves existing slash notation from tonal", () => {
    expect(formatSlashLabel("Cmaj7/E", "C", "E")).toBe("Cmaj7/E");
  });

  it("returns symbol unchanged when root or bass is missing", () => {
    expect(formatSlashLabel("Cmaj7", null, "E")).toBe("Cmaj7");
    expect(formatSlashLabel("Cmaj7", "C", null)).toBe("Cmaj7");
  });

  it("does not add slash for Em when E is in the bass", () => {
    expect(formatSlashLabel("Em", "E", "E")).toBe("Em");
  });
});
