import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

// ─── Enums ────────────────────────────────────────────────────────────────────

// IRC §108(a)(1) exclusion reasons — each maps to a checkbox on Form 982 lines 1a–1e
export enum ExclusionType {
  Bankruptcy = "bankruptcy",               // Line 1a — Title 11 case
  Insolvency = "insolvency",               // Line 1b — Insolvency (capped at insolvent amount)
  FarmDebt = "farm_debt",                  // Line 1c — Qualified farm indebtedness
  RealPropertyBusiness = "real_property_business", // Line 1d — Qualified real property business debt
  Qpri = "qpri",                          // Line 1e — Qualified principal residence indebtedness
}

// ─── Constants ────────────────────────────────────────────────────────────────

// IRC §108(a)(1)(E); Form 982 instructions (Rev. Dec 2021)
// Applies to discharges before January 1, 2026
const QPRI_CAP_STANDARD = 750_000;
const QPRI_CAP_MFS = 375_000;

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Line 2: total excluded COD amount (routed from f1099c)
  line2_excluded_cod: z.number().nonnegative(),

  // Lines 1a–1e: reason for exclusion
  exclusion_type: z.nativeEnum(ExclusionType),

  // For insolvency (line 1b): the excess of liabilities over FMV of assets
  // immediately before the discharge — the cap for the insolvency exclusion
  insolvency_amount: z.number().nonnegative().optional(),

  // For QPRI (line 1e): true if married filing separately (lowers cap to $375k)
  qpri_mfs: z.boolean().optional(),
});

type Form982Input = z.infer<typeof inputSchema>;

// ─── Cap Helpers ─────────────────────────────────────────────────────────────

// Returns the maximum amount that can be excluded under the given exclusion type.
// Infinity = no cap (bankruptcy, farm debt, real property business).
function exclusionCap(input: Form982Input): number {
  switch (input.exclusion_type) {
    case ExclusionType.Bankruptcy:
      return Infinity; // Title 11 — no dollar cap (IRC §108(a)(1)(A))

    case ExclusionType.Insolvency:
      // Capped at the amount of insolvency (IRC §108(a)(1)(B), §108(a)(3))
      // If insolvency_amount was not provided, cap is 0 (cannot exclude anything)
      return input.insolvency_amount ?? 0;

    case ExclusionType.FarmDebt:
      // No explicit dollar cap; limited by tax attributes in practice
      // (IRC §108(a)(1)(C), §108(g)) — attribute tracking not on the 1040 return
      return Infinity;

    case ExclusionType.RealPropertyBusiness:
      // No explicit dollar cap; limited by adjusted basis of depreciable real property
      // (IRC §108(a)(1)(D), §108(c)) — basis tracking not on the 1040 return
      return Infinity;

    case ExclusionType.Qpri: {
      // IRC §108(a)(1)(E): max $750,000 ($375,000 if MFS); discharges before Jan 1, 2026
      const cap = input.qpri_mfs === true ? QPRI_CAP_MFS : QPRI_CAP_STANDARD;
      return cap;
    }
  }
}

// ─── Core Computation ────────────────────────────────────────────────────────

// Returns the amount of COD that can actually be excluded (after applying the cap).
function computeExcluded(cod: number, cap: number): number {
  return Math.min(cod, cap);
}

// Returns the portion of COD that exceeds the exclusion cap — this becomes taxable.
function computeTaxableExcess(cod: number, excluded: number): number {
  return Math.max(0, cod - excluded);
}

// Builds the schedule1 output when there is a taxable excess.
function buildSchedule1Output(taxableExcess: number): NodeOutput {
  return {
    nodeType: schedule1.nodeType,
    input: { line8c_cod_income: taxableExcess },
  };
}

// ─── Node Class ──────────────────────────────────────────────────────────────

class Form982Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form982";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(rawInput: Form982Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    // Nothing to process if no excluded COD was passed from upstream
    if (input.line2_excluded_cod === 0) {
      return { outputs: [] };
    }

    const cap = exclusionCap(input);
    const excluded = computeExcluded(input.line2_excluded_cod, cap);
    const taxableExcess = computeTaxableExcess(input.line2_excluded_cod, excluded);

    if (taxableExcess <= 0) {
      return { outputs: [] };
    }

    return { outputs: [buildSchedule1Output(taxableExcess)] };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form982 = new Form982Node();
