import { z } from "zod";

// ─── Filing Status ────────────────────────────────────────────────────────────

export enum FilingStatus {
  Single = "single",
  MFS = "mfs",
  MFJ = "mfj",
  HOH = "hoh",
  QSS = "qss",
}

export const filingStatusSchema = z.nativeEnum(FilingStatus);

// ─── Taxpayer / Spouse / Joint ────────────────────────────────────────────────

export enum TSJ {
  T = "T",
  S = "S",
  J = "J",
}

export const tsjSchema = z.nativeEnum(TSJ);

// ─── Taxpayer / Spouse ────────────────────────────────────────────────────────

export enum TS {
  T = "T",
  S = "S",
}

export const tsSchema = z.nativeEnum(TS);
