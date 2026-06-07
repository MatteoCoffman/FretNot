import { Chord, Note } from "@tonaljs/tonal";
import { normalizeNote, pitchClass } from "./voicing";

export type ChordToneRole =
  | "root"
  | "thirdMajor"
  | "thirdMinor"
  | "fifth"
  | "seventhMajor"
  | "seventhMinor"
  | "ninthMajor"
  | "ninthMinor"
  | "eleventh"
  | "thirteenthMajor"
  | "thirteenthMinor"
  | "suspension";

const INTERVAL_TO_ROLE: Record<string, ChordToneRole> = {
  "1P": "root",
  "2M": "suspension",
  "3M": "thirdMajor",
  "3m": "thirdMinor",
  "4P": "suspension",
  "5P": "fifth",
  "5d": "fifth",
  "5A": "fifth",
  "7M": "seventhMajor",
  "7m": "seventhMinor",
  "9M": "ninthMajor",
  "9m": "ninthMinor",
  "11P": "eleventh",
  "11A": "eleventh",
  "13M": "thirteenthMajor",
  "13m": "thirteenthMinor",
};

export const TONE_ROLE_LABELS: Record<ChordToneRole, string> = {
  root: "Root",
  thirdMajor: "Major 3rd",
  thirdMinor: "Minor 3rd",
  fifth: "5th",
  seventhMajor: "Major 7th",
  seventhMinor: "Minor 7th",
  ninthMajor: "Major 9th",
  ninthMinor: "Minor 9th",
  eleventh: "11th",
  thirteenthMajor: "Major 13th",
  thirteenthMinor: "Minor 13th",
  suspension: "Sus",
};

export const TONE_ROLE_SHORT_LABELS: Record<ChordToneRole, string> = {
  root: "Root",
  thirdMajor: "Maj 3",
  thirdMinor: "Min 3",
  fifth: "5th",
  seventhMajor: "Maj 7",
  seventhMinor: "Min 7",
  ninthMajor: "Maj 9",
  ninthMinor: "Min 9",
  eleventh: "11th",
  thirteenthMajor: "Maj 13",
  thirteenthMinor: "Min 13",
  suspension: "Sus",
};

const LEGEND_ORDER: ChordToneRole[] = [
  "root",
  "thirdMajor",
  "thirdMinor",
  "fifth",
  "seventhMajor",
  "seventhMinor",
  "ninthMajor",
  "ninthMinor",
  "eleventh",
  "thirteenthMajor",
  "thirteenthMinor",
  "suspension",
];

export const extractChordToken = (symbol: string) => {
  const head = symbol.trim().split(/[\s(]+/)[0] ?? symbol.trim();
  return head.split("/")[0] ?? head;
};

export const parseChordRoot = (symbol: string): string | null => {
  const cleaned = extractChordToken(symbol);
  const match = cleaned.match(/^([A-Ga-g](?:#|b)?)/);
  if (!match) return null;
  const rawRoot = match[1];
  return normalizeNote(
    rawRoot.length === 1
      ? rawRoot.toUpperCase()
      : rawRoot[0].toUpperCase() + rawRoot.slice(1)
  );
};

export const intervalToToneRole = (interval: string): ChordToneRole | null =>
  INTERVAL_TO_ROLE[interval] ?? null;

export const toneRoleClassName = (role: ChordToneRole): string =>
  `note-dot--${role}`;

export const toneRoleTextClassName = (role: ChordToneRole): string =>
  `tone-role-text--${role}`;

export const buildChordToneRoleMap = (
  symbol: string
): Map<number, ChordToneRole> => {
  const roleMap = new Map<number, ChordToneRole>();
  const root = parseChordRoot(symbol);
  if (!root) return roleMap;

  const rootPC = pitchClass(root);
  if (rootPC !== null) {
    roleMap.set(rootPC, "root");
  }

  const token = extractChordToken(symbol);
  const intervals = Chord.get(token).intervals ?? [];

  intervals.forEach((interval) => {
    const role = intervalToToneRole(interval);
    if (!role || interval === "1P") return;

    const note = normalizeNote(Note.transpose(root, interval));
    const pc = pitchClass(note);
    if (pc !== null) {
      roleMap.set(pc, role);
    }
  });

  return roleMap;
};

export const legendRolesForMap = (
  roleMap: Map<number, ChordToneRole>
): ChordToneRole[] => {
  const present = new Set(roleMap.values());
  return LEGEND_ORDER.filter((role) => present.has(role));
};

export const getRoleForNote = (
  roleMap: Map<number, ChordToneRole>,
  note: string
): ChordToneRole | undefined => {
  const pc = pitchClass(note);
  if (pc === null) return undefined;
  return roleMap.get(pc);
};
