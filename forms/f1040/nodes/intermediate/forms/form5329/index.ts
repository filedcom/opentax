import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { TS, tsSchema } from "../../../types.ts";

// ─── Constants — TY2025 ───────────────────────────────────────────────────────

// IRC §72(t)(1) — standard early distribution additional tax rate
const EARLY_DIST_RATE = 0.10;
// IRC §72(t)(6) — SIMPLE IRA rate when distributed within first 2 years of participation
const SIMPLE_IRA_EARLY_RATE = 0.25;
// IRC §4973 — excess contribution excise tax rate (Parts III–VIII)
const EXCESS_CONTRIB_RATE = 0.06;
// IRC §4979 — Part II ESA/ABLE distribution penalty rate
const ESA_ABLE_RATE = 0.10;

// ─── Schema ───────────────────────────────────────────────────────────────────

const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

function sumAmounts(value: number | number[] | undefined): number {
  if (value === undefined) return 0;
  return Array.isArray(value)
    ? value.reduce((sum, amount) => sum + amount, 0)
    : value;
}

export const ownerEntrySchema = z.object({
  owner: tsSchema,
  // ── Part I: Early Distributions (line 1–4) ──────────────────────────────
  // Distribution code from 1099-R Box 7 (informational, passed through from f1099r)
  distribution_code: accumulable(z.string()).optional(),
  // Line 1: Early distributions includible in income (from f1099r, code 1)
  early_distribution: accumulable(z.number().nonnegative()).optional(),
  // Line 2: Exception amount (portion not subject to tax)
  early_distribution_exception: z.number().nonnegative().optional(),
  early_distribution_exception_code: z.enum([
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "99",
  ]).optional(),
  // Line 1 (25% rate): SIMPLE IRA early distribution within first 2 years (code S)
  simple_ira_early_distribution: accumulable(z.number().nonnegative())
    .optional(),

  // ── Part II: ESA/QTP/ABLE Distributions (line 5–8) ──────────────────────
  // Line 5: Taxable distributions from Coverdell ESA, QTP, or ABLE account
  esa_able_distribution: z.number().nonnegative().optional(),
  // Line 6: Exception amount for ESA/ABLE distributions
  esa_able_exception: z.number().nonnegative().optional(),

  // ── Part III: Excess Contributions to Traditional IRAs (line 9–17) ──────
  // Line 16: Total excess contributions to traditional IRAs
  excess_traditional_ira: z.number().nonnegative().optional(),
  // FMV of traditional IRAs on Dec 31, 2025 (caps the 6% tax base)
  traditional_ira_value: z.number().nonnegative().optional(),

  // ── Part IV: Excess Contributions to Roth IRAs (line 18–25) ─────────────
  // Line 24: Total excess contributions to Roth IRAs
  excess_roth_ira: z.number().nonnegative().optional(),
  // FMV of Roth IRAs on Dec 31, 2025 (caps the 6% tax base)
  roth_ira_value: z.number().nonnegative().optional(),

  // ── Part V: Excess Contributions to Coverdell ESAs (line 26–33) ─────────
  // Line 32: Total excess contributions to Coverdell ESAs
  excess_coverdell_esa: z.number().nonnegative().optional(),
  // FMV of Coverdell ESAs on Dec 31, 2025 (caps the 6% tax base)
  coverdell_esa_value: z.number().nonnegative().optional(),

  // ── Part VI: Excess Contributions to Archer MSAs (line 34–41) ───────────
  // Line 40: Total excess contributions to Archer MSAs
  excess_archer_msa: z.number().nonnegative().optional(),
  // FMV of Archer MSAs on Dec 31, 2025 (caps the 6% tax base)
  archer_msa_value: z.number().nonnegative().optional(),

  // ── Part VII: Excess Contributions to HSAs (line 42–49) ─────────────────
  // Source-linked Form 8889 amounts and filed prior-year Form 5329 carryover.
  hsa_part_vii: z.object({
    line42_prior_excess: z.number().nonnegative(),
    line43_unused_contribution_room: z.number().nonnegative(),
    line44_taxable_distributions: z.number().nonnegative(),
    line47_current_year_excess: z.number().nonnegative(),
    december_31_value: z.number().nonnegative(),
  }).optional(),

  // ── Part VIII: Excess Contributions to ABLE Accounts (line 50–51) ───────
  // Line 50: Excess contributions to ABLE account
  excess_able: z.number().nonnegative().optional(),
  // FMV of ABLE account on Dec 31, 2025 (caps the 6% tax base)
  able_value: z.number().nonnegative().optional(),
}).strict();

export const inputSchema = z.object({
  owner_entries: z.array(ownerEntrySchema).optional(),
}).strict();

type Form5329Input = z.infer<typeof ownerEntrySchema>;
type Form5329Collection = z.infer<typeof inputSchema>;

function entriesOf(input: Form5329Collection): Form5329Input[] {
  return input.owner_entries ?? [];
}

function mergeOwnerEntries(entries: Form5329Input[]): Form5329Input[] {
  const owners: TS[] = [TS.T, TS.S];
  return owners.flatMap((owner) => {
    const owned = entries.filter((entry) => entry.owner === owner);
    if (owned.length === 0) return [];
    const merged: Record<string, unknown> = { owner };
    for (const entry of owned) {
      for (const [key, value] of Object.entries(entry)) {
        if (key === "owner" || value === undefined) continue;
        const existing = merged[key];
        if (existing === undefined) {
          merged[key] = value;
        } else if (key === "early_distribution" ||
          key === "simple_ira_early_distribution" ||
          key === "distribution_code") {
          merged[key] = [
            ...(Array.isArray(existing) ? existing : [existing]),
            ...(Array.isArray(value) ? value : [value]),
          ];
        } else {
          throw new Error(
            `Form 5329 ${owner} has duplicate ${key} owner sources`,
          );
        }
      }
    }
    return [ownerEntrySchema.parse(merged)];
  });
}

function hasFilingActivity(input: Form5329Input): boolean {
  return sumAmounts(input.early_distribution) > 0 ||
    sumAmounts(input.simple_ira_early_distribution) > 0 ||
    (input.early_distribution_exception ?? 0) > 0 ||
    (input.esa_able_distribution ?? 0) > 0 ||
    (input.esa_able_exception ?? 0) > 0 ||
    (input.excess_traditional_ira ?? 0) > 0 ||
    (input.excess_roth_ira ?? 0) > 0 ||
    (input.excess_coverdell_esa ?? 0) > 0 ||
    (input.excess_archer_msa ?? 0) > 0 ||
    (input.hsa_part_vii?.line42_prior_excess ?? 0) > 0 ||
    (input.hsa_part_vii?.line47_current_year_excess ?? 0) > 0 ||
    (input.excess_able ?? 0) > 0;
}

// ─── Pure Helper Functions ────────────────────────────────────────────────────

// Part I, Line 4: 10% additional tax on early distributions (non-SIMPLE IRA)
// IRC §72(t)(1); Form 5329 line 4 → Schedule 2 line 8
function partI_regularTax(input: Form5329Input): number {
  const dist = sumAmounts(input.early_distribution);
  if (dist <= 0) return 0;
  const exception = input.early_distribution_exception ?? 0;
  const netSubjectToTax = Math.max(0, dist - exception);
  return netSubjectToTax * EARLY_DIST_RATE;
}

// Part I, Line 4 (25%): Additional tax on SIMPLE IRA early distribution
// IRC §72(t)(6); applies when distribution within first 2 years of plan participation
function partI_simpleTax(input: Form5329Input): number {
  const dist = sumAmounts(input.simple_ira_early_distribution);
  if (dist <= 0) return 0;
  return dist * SIMPLE_IRA_EARLY_RATE;
}

// Part II, Line 8: 10% additional tax on taxable ESA/QTP/ABLE distributions
// IRC §530(d)(4), §529(c)(7); Form 5329 line 8 → Schedule 2 line 8
function partII_tax(input: Form5329Input): number {
  const dist = input.esa_able_distribution ?? 0;
  if (dist <= 0) return 0;
  const exception = input.esa_able_exception ?? 0;
  const netSubjectToTax = Math.max(0, dist - exception);
  return netSubjectToTax * ESA_ABLE_RATE;
}

// 6% excise on excess account contributions: min(excess, account_value) × 6%
// IRC §4973; Form 5329 Parts III–VIII
function excessContribTax(excess: number, accountValue?: number): number {
  if (excess <= 0) return 0;
  if (accountValue === undefined) {
    throw new Error(
      "Form 5329 needs the December 31 account value to calculate excess-contribution tax",
    );
  }
  return Math.min(excess, accountValue) * EXCESS_CONTRIB_RATE;
}

// Part III, Line 17: 6% excise on excess traditional IRA contributions
// IRC §4973(a); Form 5329 line 17 → Schedule 2 line 8
function partIII_tax(input: Form5329Input): number {
  return excessContribTax(
    input.excess_traditional_ira ?? 0,
    input.traditional_ira_value,
  );
}

// Part IV, Line 25: 6% excise on excess Roth IRA contributions
// IRC §4973(f); Form 5329 line 25 → Schedule 2 line 8
function partIV_tax(input: Form5329Input): number {
  return excessContribTax(input.excess_roth_ira ?? 0, input.roth_ira_value);
}

// Part V, Line 33: 6% excise on excess Coverdell ESA contributions
// IRC §4973(e); Form 5329 line 33 → Schedule 2 line 8
function partV_tax(input: Form5329Input): number {
  return excessContribTax(
    input.excess_coverdell_esa ?? 0,
    input.coverdell_esa_value,
  );
}

// Part VI, Line 41: 6% excise on excess Archer MSA contributions
// IRC §4973(d); Form 5329 line 41 → Schedule 2 line 8
function partVI_tax(input: Form5329Input): number {
  return excessContribTax(input.excess_archer_msa ?? 0, input.archer_msa_value);
}

// Part VII, Line 49: 6% excise on excess HSA contributions
// IRC §4973(a)(2); Form 5329 line 49 → Schedule 2 line 8
function partVII_tax(input: Form5329Input): number {
  const hsa = input.hsa_part_vii;
  if (!hsa) return 0;
  const priorRemaining = Math.max(
    0,
    hsa.line42_prior_excess -
      hsa.line43_unused_contribution_room -
      hsa.line44_taxable_distributions,
  );
  return excessContribTax(
    priorRemaining + hsa.line47_current_year_excess,
    hsa.december_31_value,
  );
}

// Part VIII, Line 51: 6% excise on excess ABLE account contributions
// IRC §4973(h); Form 5329 line 51 → Schedule 2 line 8
function partVIII_tax(input: Form5329Input): number {
  return excessContribTax(input.excess_able ?? 0, input.able_value);
}

// Total of all Form 5329 penalty taxes across all parts
function totalTax(input: Form5329Input): number {
  return (
    partI_regularTax(input) +
    partI_simpleTax(input) +
    partII_tax(input) +
    partIII_tax(input) +
    partIV_tax(input) +
    partV_tax(input) +
    partVI_tax(input) +
    partVII_tax(input) +
    partVIII_tax(input)
  );
}

// Route total Form 5329 tax to Schedule 2 line 8 when > 0
function schedule2Output(total: number, chapter1Tax: number): NodeOutput[] {
  if (total <= 0) return [];
  return [output(schedule2, {
    line8_form5329_tax: total,
    line8_form5329_chapter1_tax: chapter1Tax,
  })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form5329Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form5329";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(_ctx: NodeContext, rawInput: Form5329Collection): NodeResult {
    const result = calculateOwnerForms(inputSchema.parse(rawInput));
    return {
      outputs: [
        ...schedule2Output(result.total, result.chapter1Tax),
        ...(result.forms.length > 0
          ? [{
            nodeType: this.nodeType,
            fields: {
              owner_entries: entriesOf(rawInput),
              owner_forms: result.forms,
            },
          }]
          : []),
      ],
    };
  }
}

export function calculateOwnerForms(rawInput: Form5329Collection) {
  const input = inputSchema.parse(rawInput);
  const owners = mergeOwnerEntries(entriesOf(input)).filter(hasFilingActivity);
  const forms = owners.map((ownerInput) => {
    if (
      (ownerInput.early_distribution_exception ?? 0) >
        sumAmounts(ownerInput.early_distribution)
    ) {
      throw new Error(
        "Form 5329 early-distribution exception exceeds regular distributions",
      );
    }
    if (
      (ownerInput.esa_able_exception ?? 0) >
        (ownerInput.esa_able_distribution ?? 0)
    ) {
      throw new Error(
        "Form 5329 education-account exception exceeds distributions",
      );
    }
    const regular = sumAmounts(ownerInput.early_distribution);
    const simple = sumAmounts(ownerInput.simple_ira_early_distribution);
    const hsa = ownerInput.hsa_part_vii;
    const hsaLine45 = hsa
      ? hsa.line43_unused_contribution_room + hsa.line44_taxable_distributions
      : 0;
    const hsaLine46 = hsa
      ? Math.max(0, hsa.line42_prior_excess - hsaLine45)
      : 0;
    const hsaLine48 = hsa ? hsaLine46 + hsa.line47_current_year_excess : 0;
    return {
      ...ownerInput,
      ...(regular > 0 ? { early_distribution: regular } : {}),
      ...(simple > 0 ? { simple_ira_early_distribution: simple } : {}),
      ...(hsa
        ? {
          print_hsa_line42: hsa.line42_prior_excess,
          print_hsa_line43: hsa.line43_unused_contribution_room,
          print_hsa_line44: hsa.line44_taxable_distributions,
          print_hsa_line45: hsaLine45,
          print_hsa_line46: hsaLine46,
          print_hsa_line47: hsa.line47_current_year_excess,
          print_hsa_line48: hsaLine48,
          print_hsa_line49: partVII_tax(ownerInput),
        }
        : {}),
      print_total_tax: totalTax(ownerInput),
      print_chapter1_tax: partI_regularTax(ownerInput) +
        partI_simpleTax(ownerInput) + partII_tax(ownerInput),
    };
  });
  return {
    forms,
    total: forms.reduce((sum, form) => sum + form.print_total_tax, 0),
    chapter1Tax: forms.reduce(
      (sum, form) => sum + form.print_chapter1_tax,
      0,
    ),
  };
}

export function reconcileHsaOwnerForms(
  forms: ReturnType<typeof calculateOwnerForms>["forms"],
  raw8889: unknown,
): void {
  if (!forms.some((form) => form.hsa_part_vii !== undefined)) return;
  const hsaForms = z.object({
    forms: z.array(z.object({
      owner: z.enum(["primary", "spouse"]),
      print_line2_taxpayer_contributions: z.number().nonnegative().optional(),
      print_line12: z.number().nonnegative().optional(),
      print_line16_taxable: z.number().nonnegative().optional(),
    }).passthrough()).min(1).max(2),
  }).passthrough().parse(raw8889).forms;
  for (const form of forms) {
    const hsa = form.hsa_part_vii;
    if (!hsa) continue;
    const owner = form.owner === TS.T ? "primary" : "spouse";
    const source = hsaForms.find((entry) => entry.owner === owner);
    if (!source || source.print_line12 === undefined) {
      throw new Error(`Form 5329 ${owner} HSA needs its Form 8889`);
    }
    if (
      hsa.line43_unused_contribution_room !== Math.max(
        0,
        source.print_line12 -
          (source.print_line2_taxpayer_contributions ?? 0),
      ) ||
      hsa.line44_taxable_distributions !==
        (source.print_line16_taxable ?? 0)
    ) {
      throw new Error(`Form 5329 ${owner} HSA source does not reconcile to Form 8889`);
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form5329 = new Form5329Node();
