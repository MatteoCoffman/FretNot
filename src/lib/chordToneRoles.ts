import { Chord, Interval, Note } from "@tonaljs/tonal";
import { normalizeNote, pitchClass } from "./voicing";

export type ChordToneRole =
  | "root"
  | "secondMajor"
  | "secondMinor"
  | "thirdMajor"
  | "thirdMinor"
  | "fourth"
  | "fifth"
  | "sixthMinor"
  | "sixthMajor"
  | "seventhMajor"
  | "seventhMinor"
  | "ninthMajor"
  | "ninthMinor"
  | "eleventh"
  | "thirteenthMajor"
  | "thirteenthMinor"
  | "suspension"
  | "extension";

const INTERVAL_TO_ROLE: Record<string, ChordToneRole> = {
  "1P": "root",
  "2M": "secondMajor",
  "2m": "secondMinor",
  "3M": "thirdMajor",
  "3m": "thirdMinor",
  "4P": "fourth",
  "4A": "extension",
  "5d": "fifth",
  "5P": "fifth",
  "5A": "fifth",
  "6m": "sixthMinor",
  "6M": "sixthMajor",
  "7m": "seventhMinor",
  "7M": "seventhMajor",
  "8P": "root",
  "9m": "ninthMinor",
  "9M": "ninthMajor",
  "10m": "extension",
  "10M": "eleventh",
  "11P": "eleventh",
  "11A": "eleventh",
  "12m": "extension",
  "12M": "extension",
  "13m": "thirteenthMinor",
  "13M": "thirteenthMajor",
};

export const INTERVAL_SHORT_LABELS: Record<string, string> = {
  "1P": "Root",
  "2m": "b2",
  "2M": "2nd",
  "3m": "Min 3",
  "3M": "Maj 3",
  "4P": "4th",
  "4A": "#4",
  "5d": "b5",
  "5P": "5th",
  "5A": "#5",
  "6m": "Min 6",
  "6M": "Maj 6",
  "7m": "Min 7",
  "7M": "Maj 7",
  "8P": "Root",
  "9m": "Min 9",
  "9M": "Maj 9",
  "10m": "#9",
  "10M": "b11",
  "11P": "11th",
  "11A": "#11",
  "13m": "Min 13",
  "13M": "Maj 13",
};

export const TONE_ROLE_LABELS: Record<ChordToneRole, string> = {
  root: "Root",
  secondMajor: "Major 2nd",
  secondMinor: "Minor 2nd",
  thirdMajor: "Major 3rd",
  thirdMinor: "Minor 3rd",
  fourth: "4th",
  fifth: "5th",
  sixthMinor: "Minor 6th",
  sixthMajor: "Major 6th",
  seventhMajor: "Major 7th",
  seventhMinor: "Minor 7th",
  ninthMajor: "Major 9th",
  ninthMinor: "Minor 9th",
  eleventh: "11th",
  thirteenthMajor: "Major 13th",
  thirteenthMinor: "Minor 13th",
  suspension: "Sus",
  extension: "Extension",
};

export const TONE_ROLE_SHORT_LABELS: Record<ChordToneRole, string> = {
  root: "Root",
  secondMajor: "2nd",
  secondMinor: "b2",
  thirdMajor: "Maj 3",
  thirdMinor: "Min 3",
  fourth: "4th",
  fifth: "5th",
  sixthMinor: "Min 6",
  sixthMajor: "Maj 6",
  seventhMajor: "Maj 7",
  seventhMinor: "Min 7",
  ninthMajor: "Maj 9",
  ninthMinor: "Min 9",
  eleventh: "11th",
  thirteenthMajor: "Maj 13",
  thirteenthMinor: "Min 13",
  suspension: "Sus",
  extension: "Ext",
};

const LEGEND_ORDER: ChordToneRole[] = [
  "root",
  "secondMajor",
  "secondMinor",
  "thirdMajor",
  "thirdMinor",
  "fourth",
  "fifth",
  "sixthMinor",
  "sixthMajor",
  "seventhMajor",
  "seventhMinor",
  "ninthMajor",
  "ninthMinor",
  "eleventh",
  "thirteenthMajor",
  "thirteenthMinor",
  "suspension",
  "extension",
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

export const intervalToToneRole = (interval: string): ChordToneRole =>
  INTERVAL_TO_ROLE[interval] ?? "extension";

export const toneRoleClassName = (role: ChordToneRole): string =>
  `note-dot--${role}`;

export const toneRoleTextClassName = (role: ChordToneRole): string =>
  `tone-role-text--${role}`;

export type ToneRoleInfo = {
  role: ChordToneRole;
  interval: string;
  shortLabel: string;
  label: string;
};

const buildToneRoleInfo = (interval: string): ToneRoleInfo => {
  const role = intervalToToneRole(interval);
  return {
    role,
    interval,
    shortLabel: INTERVAL_SHORT_LABELS[interval] ?? TONE_ROLE_SHORT_LABELS[role],
    label: TONE_ROLE_LABELS[role],
  };
};

const KNOWN_INTERVALS = new Set(Object.keys(INTERVAL_TO_ROLE));

const INTERVAL_ALIASES: Record<string, string> = {
  "1A": "2m",
};

const normalizeIntervalName = (interval: string | null): string | null => {
  if (!interval) return null;
  if (KNOWN_INTERVALS.has(interval)) return interval;
  const alias = INTERVAL_ALIASES[interval];
  if (alias && KNOWN_INTERVALS.has(alias)) return alias;
  return interval;
};

const COMPOUND_EXTENSION_INTERVALS = new Set([
  "8P",
  "9m",
  "9M",
  "11P",
  "11A",
  "13m",
  "13M",
]);

const simpleIntervalFromSemitones = (semitones: number): string | null => {
  const withinOctave = semitones % 12;
  if (withinOctave === 0) {
    return semitones === 0 ? "1P" : "8P";
  }
  const simple = Interval.fromSemitones(withinOctave);
  if (simple && KNOWN_INTERVALS.has(simple)) {
    return simple;
  }
  return null;
};

const intervalFromSemitones = (semitones: number): string | null => {
  if (semitones < 0) return null;

  const simpleKnown = simpleIntervalFromSemitones(semitones);

  if (semitones <= 24) {
    const direct = Interval.fromSemitones(semitones);
    if (direct && KNOWN_INTERVALS.has(direct)) {
      if (COMPOUND_EXTENSION_INTERVALS.has(direct)) {
        return direct;
      }
      if (direct === "7M" || direct === "7m") {
        return direct;
      }
      if (simpleKnown) {
        return simpleKnown;
      }
      return direct;
    }
  }

  if (simpleKnown) {
    return simpleKnown;
  }

  if (semitones <= 24) {
    const direct = Interval.fromSemitones(semitones);
    return normalizeIntervalName(direct);
  }

  return null;
};

export const getIntervalFromRoot = (
  root: string,
  note: string,
  options: { rootMidi?: number | null; noteMidi?: number | null } = {}
): string | null => {
  const { rootMidi, noteMidi } = options;

  if (
    rootMidi != null &&
    noteMidi != null &&
    Number.isFinite(rootMidi) &&
    Number.isFinite(noteMidi)
  ) {
    const semitones = noteMidi - rootMidi;
    const fromSemitones = intervalFromSemitones(semitones);
    if (fromSemitones) {
      return fromSemitones;
    }
  }

  const distance = Interval.distance(root, note);
  return normalizeIntervalName(distance || null);
};

export const getToneRoleInfoFromRoot = (
  root: string,
  note: string,
  options: { rootMidi?: number | null; noteMidi?: number | null } = {}
): ToneRoleInfo | null => {
  const interval = getIntervalFromRoot(root, note, options);
  if (!interval) return null;
  return buildToneRoleInfo(interval);
};

export const buildChordToneRoleMap = (
  symbol: string
): Map<number, ChordToneRole> => {
  const roleMap = new Map<number, ChordToneRole>();
  const root = parseChordRoot(symbol);
  if (!root) return roleMap;

  const token = extractChordToken(symbol);
  const intervals = Chord.get(token).intervals ?? [];

  intervals.forEach((interval) => {
    const note = normalizeNote(Note.transpose(root, interval));
    const pc = pitchClass(note);
    if (pc !== null) {
      roleMap.set(pc, intervalToToneRole(interval));
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

export const legendRolesForNotes = (
  root: string,
  notes: Array<{ note: string; midi?: number | null }>,
  rootMidi?: number | null
): ToneRoleInfo[] => {
  const byLabel = new Map<string, ToneRoleInfo>();
  notes.forEach((entry) => {
    const info = getToneRoleInfoFromRoot(root, entry.note, {
      rootMidi,
      noteMidi: entry.midi,
    });
    if (info && !byLabel.has(info.shortLabel)) {
      byLabel.set(info.shortLabel, info);
    }
  });

  return [...byLabel.values()].sort((a, b) => {
    const orderA = LEGEND_ORDER.indexOf(a.role);
    const orderB = LEGEND_ORDER.indexOf(b.role);
    if (orderA !== orderB) return orderA - orderB;
    return a.shortLabel.localeCompare(b.shortLabel);
  });
};

export const getRoleForNote = (
  roleMap: Map<number, ChordToneRole>,
  note: string
): ChordToneRole | undefined => {
  const pc = pitchClass(note);
  if (pc === null) return undefined;
  return roleMap.get(pc);
};
