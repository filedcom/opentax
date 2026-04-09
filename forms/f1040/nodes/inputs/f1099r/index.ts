import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { form5329 } from "../../intermediate/forms/form5329/index.ts";
import { form4972 } from "../../intermediate/forms/form4972/index.ts";
import { form8606 } from "../../intermediate/forms/form8606/index.ts";
import { tsSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../config/index.ts";

// Distribution codes that produce zero taxable income (pure rollovers/non-taxable exchanges)
const ZERO_TAXABLE_CODES = new Set(["G", "N", "R", "Q", "T", "6", "W"]);

// Distribution codes triggering form5329 (early distribution penalty)
const EARLY_DIST_CODES = new Set(["1"]);

// Distribution codes triggering form4972 (lump-sum election)
const LUMP_SUM_CODES = new Set(["5"]);

// Simplified Method Table 1 — single-life annuity (annuity start after 12/31/1997)
function simplifiedMethodMonthsTable1(age: number): number {
  if (age <= 55) return 360;
  if (age <= 60) return 310;
  if (age <= 65) return 260;
  if (age <= 70) return 210;
  return 160;
}

// Simplified Method Table 2 — joint-life annuity
function simplifiedMethodMonthsTable2(combinedAges: number): number {
  if (combinedAges <= 110) return 410;
  if (combinedAges <= 120) return 360;
  if (combinedAges <= 130) return 310;
  if (combinedAges <= 140) return 260;
  return 210;
}

// Compute annual excludable amount using Simplified Method Worksheet
// Returns the excludable (tax-free) portion for the year
function simplifiedMethodExclusion(item: R1099Item): number {
  if (!item.simplified_method_flag) return 0;
  const cost = item.cost_in_contract ?? 0;
  if (cost <= 0) return 0;

  const priorRecovered = item.prior_excludable_recovered ?? 0;
  const remainingCost = cost - priorRecovered;
  if (remainingCost <= 0) return 0;

  let expectedMonths: number;
  if (item.joint_annuity === true) {
    const combined = item.combined_ages_at_start ?? 0;
    expectedMonths = simplifiedMethodMonthsTable2(combined);
  } else {
    const age = item.age_at_annuity_start ?? 0;
    expectedMonths = simplifiedMethodMonthsTable1(age);
  }

  // Monthly exclusion = remaining cost / expected months
  const monthlyExclusion = remainingCost / expectedMonths;
  // Annual exclusion = monthly * 12 (full year)
  const annualExclusion = monthlyExclusion * 12;
  // Cannot exceed gross distribution received
  const gross = item.box1_gross_distribution;
  return Math.min(annualExclusion, gross);
}

// Compute effective taxable amount for a single item, accounting for:
// - zero-taxable distribution codes
// - rollover codes (G, S, X = zero taxable; C = Roth conversion, still taxable)
// - QCD exclusion
// - PSO premium exclusion (pension only)
// - Simplified Method exclusion (pension only)
// - exclude_4972 / exclude_8606_roth flags (suppresses income lines)
function effectiveTaxableAmount(
  item: R1099Item,
  qcdAnnualLimit: number,
  psoExclusionLimit: number,
): number {
  // Suppressed items contribute no taxable income
  if (item.exclude_4972 === true) return 0;
  if (item.exclude_8606_roth === true) return 0;

  const rawTaxable = item.box2a_taxable_amount ?? item.box1_gross_distribution;

  // Zero-taxable distribution codes
  const code1 = item.box7_distribution_code;
  if (ZERO_TAXABLE_CODES.has(code1)) return 0;

  // Rollover codes G and S produce zero taxable (not C — that's a Roth conversion)
  if (item.rollover_code === "G" || item.rollover_code === "S") return 0;
  // Rollover_code X: partial rollover — only the non-rolled portion is taxable
  if (item.rollover_code === "X") {
    const rolled = item.partial_rollover_amount ?? 0;
    return Math.max(0, rawTaxable - rolled);
  }

  let taxable = rawTaxable;

  // QCD exclusion — IRA distributions only; reduces taxable portion
  if (item.box7_ira_simple_indicator === true) {
    if (item.qcd_full === true) {
      const qcdAmount = Math.min(item.box1_gross_distribution, qcdAnnualLimit);
      taxable = Math.max(0, taxable - qcdAmount);
    } else if ((item.qcd_partial_amount ?? 0) > 0) {
      const qcdAmount = Math.min(item.qcd_partial_amount!, qcdAnnualLimit);
      taxable = Math.max(0, taxable - qcdAmount);
    }
  }

  // PSO premium exclusion — pension distributions only (not IRA)
  if (item.box7_ira_simple_indicator !== true && (item.pso_premium ?? 0) > 0) {
    const psoExclusion = Math.min(item.pso_premium!, psoExclusionLimit);
    taxable = Math.max(0, taxable - psoExclusion);
  }

  // Simplified Method exclusion — pension distributions only
  if (item.box7_ira_simple_indicator !== true && item.simplified_method_flag === true) {
    const exclusion = simplifiedMethodExclusion(item);
    taxable = Math.max(0, taxable - exclusion);
  }

  return taxable;
}

// Distribution code enum covering all valid 1099-R Box 7 codes for TY2025
export enum DistributionCode {
  Code1 = "1",
  Code2 = "2",
  Code3 = "3",
  Code4 = "4",
  Code5 = "5",
  Code6 = "6",
  Code7 = "7",
  Code8 = "8",
  CodeA = "A",
  CodeB = "B",
  CodeC = "C",
  CodeD = "D",
  CodeE = "E",
  CodeF = "F",
  CodeG = "G",
  CodeH = "H",
  CodeJ = "J",
  CodeK = "K",
  CodeL = "L",
  CodeM = "M",
  CodeN = "N",
  CodeP = "P",
  CodeQ = "Q",
  CodeR = "R",
  CodeS = "S",
  CodeT = "T",
  CodeU = "U",
  CodeV = "V",
  CodeW = "W",
  CodeY = "Y",
}

export enum RolloverCode {
  C = "C",
  G = "G",
  S = "S",
  X = "X",
}

// Per-item schema — one 1099-R from one payer
export const itemSchema = z.object({
  // Required identifiers
  payer_name: z.string().min(1),
  payer_ein: z.string().min(1),
  account_number: z.string().optional(),
  ts: tsSchema.optional(),

  // Box 1: Gross distribution (required)
  box1_gross_distribution: z.number().nonnegative(),

  // Box 2a: Taxable amount (optional — if absent, use box1_gross_distribution)
  box2a_taxable_amount: z.number().nonnegative().optional(),

  // Box 2b flags
  box2b_not_determined: z.boolean().optional(),
  box2b_total_dist: z.boolean().optional(),

  // Box 3: Capital gain (must be ≤ box2a_taxable)
  box3_capital_gain: z.number().nonnegative().optional(),

  // Box 4: Federal income tax withheld
  box4_federal_withheld: z.number().nonnegative().optional(),

  // Box 5: Employee contributions / Roth / insurance premiums
  box5_employee_contributions: z.number().nonnegative().optional(),

  // Box 6: Net unrealized appreciation
  box6_nua: z.number().nonnegative().optional(),

  // Box 7: Distribution codes and IRA checkbox
  box7_distribution_code: z.nativeEnum(DistributionCode),
  box7_code2: z.nativeEnum(DistributionCode).optional(),
  box7_ira_simple_indicator: z.boolean().optional(),

  // Box 8: Other
  box8_other: z.number().nonnegative().optional(),

  // Box 9a: Percentage of total distribution
  box9a_pct_total: z.number().min(0).max(100).optional(),

  // Box 9b: Total employee contributions
  box9b_total_employee_contributions: z.number().nonnegative().optional(),

  // Box 10: IRR within 5 years
  box10_irr_within_5yr: z.number().nonnegative().optional(),

  // Box 11: First year of designated Roth contributions
  box11_first_year_roth: z.number().optional(),

  // Box 12: FATCA filing requirement
  box12_fatca: z.boolean().optional(),

  // Box 13: Date of payment
  box13_date_of_payment: z.string().optional(),

  // Boxes 14-19: State and local fields (informational)
  box14_state_tax: z.number().nonnegative().optional(),
  box15_payer_state: z.string().optional(),
  box16_state_distribution: z.number().nonnegative().optional(),
  box17_local_tax: z.number().nonnegative().optional(),
  box18_locality_name: z.string().optional(),
  box19_local_distribution: z.number().nonnegative().optional(),

  // Rollover treatment dropdown
  rollover_code: z.nativeEnum(RolloverCode).optional(),
  partial_rollover_amount: z.number().nonnegative().optional(),

  // Disability flags
  disability_flag: z.boolean().optional(),
  disability_as_wages: z.boolean().optional(),

  // Special treatment flags
  carry_to_5329: z.boolean().optional(),
  exclude_4972: z.boolean().optional(),
  exclude_8606_roth: z.boolean().optional(),

  // QCD fields
  qcd_full: z.boolean().optional(),
  qcd_partial_amount: z.number().nonnegative().optional(),

  // PSO insurance premium exclusion
  pso_premium: z.number().nonnegative().optional(),

  // Simplified Method Worksheet fields
  simplified_method_flag: z.boolean().optional(),
  cost_in_contract: z.number().nonnegative().optional(),
  annuity_start_date: z.string().optional(),
  age_at_annuity_start: z.number().nonnegative().optional(),
  joint_annuity: z.boolean().optional(),
  combined_ages_at_start: z.number().nonnegative().optional(),
  prior_excludable_recovered: z.number().nonnegative().optional(),

  // Form 8606 — traditional IRA prior basis (nondeductible contributions carried forward).
  // When set, this item's gross distribution is routed through Form 8606 Part I to compute
  // the correct taxable amount (box2a is suppressed from line4b; form8606 emits taxable instead).
  prior_ira_basis: z.number().nonnegative().optional(),

  // Form 8606 — year-end FMV of all traditional IRAs (line 6).
  // Required when prior_ira_basis is set and there are remaining IRA assets after distribution.
  // Defaults to 0 when absent (full distribution consumed the IRA).
  year_end_ira_value: z.number().nonnegative().optional(),

  // Miscellaneous flags
  altered_or_handwritten: z.boolean().optional(),
  no_distribution_received: z.boolean().optional(),
});

// Node inputSchema — receives all 1099-Rs for this return as a single array
export const inputSchema = z.object({
  f1099rs: z.array(itemSchema).min(1),
});

type R1099Item = z.infer<typeof itemSchema>;
type R1099Items = R1099Item[];

// Cross-field validation for a single item
function validateItem(item: R1099Item): void {
  const cap3 = item.box3_capital_gain ?? 0;
  const taxable = item.box2a_taxable_amount ?? item.box1_gross_distribution;
  if (cap3 > taxable) {
    throw new Error(
      `1099-R validation: box3_capital_gain (${cap3}) cannot exceed box2a_taxable (${taxable})`,
    );
  }
}

// Active items: exclude those where no_distribution_received = true
function activeItems(items: R1099Items): R1099Items {
  return items.filter((item) => item.no_distribution_received !== true);
}

// IRA items: box7_ira_simple_indicator = true
function iraItems(items: R1099Items): R1099Items {
  return items.filter((item) => item.box7_ira_simple_indicator === true);
}

// Pension/annuity items: box7_ira_simple_indicator !== true
function pensionItems(items: R1099Items): R1099Items {
  return items.filter((item) => item.box7_ira_simple_indicator !== true);
}

// Disability-as-wages items: disability routing to line1a
function disabilityWagesItems(items: R1099Items): R1099Items {
  return items.filter(
    (item) => item.disability_flag === true && item.disability_as_wages === true,
  );
}

// Whether an item should be excluded from gross distribution lines (4a/5a).
// Per IRS Form 1040 instructions, direct rollovers and recharacterizations
// are not reported on lines 4a/5a — only the taxable portion (4b/5b) matters,
// and for these codes that is always zero.
function isExcludedFromGross(item: R1099Item): boolean {
  if (item.exclude_4972 === true) return true;
  if (item.exclude_8606_roth === true) return true;
  if (ZERO_TAXABLE_CODES.has(item.box7_distribution_code)) return true;
  if (item.rollover_code === "G" || item.rollover_code === "S") return true;
  return false;
}

// Whether this IRA item's taxable amount is delegated to Form 8606 Part I.
// When prior_ira_basis is set, box2a is suppressed from line4b and form8606 computes
// the correct taxable amount after applying the nondeductible basis ratio.
function routedThrough8606PartI(item: R1099Item): boolean {
  return item.box7_ira_simple_indicator === true && (item.prior_ira_basis ?? 0) > 0;
}

// Build f1040 output for IRA distributions
function iraF1040Fields(
  items: R1099Items,
  qcdAnnualLimit: number,
  psoExclusionLimit: number,
): Record<string, number> {
  const active = iraItems(activeItems(items));
  // Per IRS instructions, zero-taxable-code items (rollovers, recharacterizations, etc.)
  // are not reported on line 4a (gross). Only reportable distributions contribute to gross.
  const reportableItems = active.filter((item) => !isExcludedFromGross(item));
  const gross = reportableItems.reduce((sum, item) => sum + item.box1_gross_distribution, 0);
  // Items routed through Form 8606 Part I are excluded here — form8606 emits line4b for them.
  const nonBasisItems = active.filter((item) => !routedThrough8606PartI(item));
  const taxable = nonBasisItems.reduce(
    (sum, item) => sum + effectiveTaxableAmount(item, qcdAnnualLimit, psoExclusionLimit),
    0,
  );
  const has8606Items = active.some((item) => routedThrough8606PartI(item));
  const fields: Record<string, number> = {};
  if (gross > 0) fields.line4a_ira_gross = gross;
  // Emit line4b when taxable > 0, or when there are non-basis IRA items with zero taxable
  // (so rollover/QCD zero cases remain visible). When all IRA taxable is handled by form8606,
  // suppress the zero to avoid accumulation conflicts with form8606's own line4b emission.
  if (taxable > 0 || (nonBasisItems.length > 0 && !has8606Items)) {
    fields.line4b_ira_taxable = taxable;
  }
  return fields;
}

// Build f1040 output for pension/annuity distributions
function pensionF1040Fields(
  items: R1099Items,
  qcdAnnualLimit: number,
  psoExclusionLimit: number,
): Record<string, number> {
  // Exclude disability-as-wages items from pension lines (they go to line1a)
  const disWagesSet = new Set(disabilityWagesItems(activeItems(items)));
  const active = pensionItems(activeItems(items)).filter((item) => !disWagesSet.has(item));
  // Per IRS instructions, zero-taxable-code items (rollovers, recharacterizations, etc.)
  // are not reported on line 5a (gross). Only reportable distributions contribute to gross.
  const reportableItems = active.filter((item) => !isExcludedFromGross(item));
  const gross = reportableItems.reduce((sum, item) => sum + item.box1_gross_distribution, 0);
  const taxable = active.reduce(
    (sum, item) => sum + effectiveTaxableAmount(item, qcdAnnualLimit, psoExclusionLimit),
    0,
  );
  const fields: Record<string, number> = {};
  if (gross > 0) fields.line5a_pension_gross = gross;
  if (active.length > 0) fields.line5b_pension_taxable = taxable;
  return fields;
}

// Build f1040 line1a output for disability-as-wages items
function disabilityWagesF1040Fields(
  items: R1099Items,
  qcdAnnualLimit: number,
  psoExclusionLimit: number,
): Record<string, number> {
  const disItems = disabilityWagesItems(activeItems(items));
  if (disItems.length === 0) return {};
  const total = disItems.reduce(
    (sum, item) => sum + effectiveTaxableAmount(item, qcdAnnualLimit, psoExclusionLimit),
    0,
  );
  if (total <= 0) return {};
  return { line1a_wages: total };
}

// Build f1040 withholding output (line25b)
function withholdingF1040Fields(items: R1099Items): Record<string, number> {
  const total = activeItems(items).reduce(
    (sum, item) => sum + (item.box4_federal_withheld ?? 0),
    0,
  );
  if (total <= 0) return {};
  return { line25b_withheld_1099: total };
}

// Form 5329 outputs: code 1 (early, no exception) routes automatically for all distributions
// (both IRA and pension) with code 1. The penalty applies to both account types unless an
// exception applies, which is determined on Form 5329 itself.
function form5329Outputs(items: R1099Items): NodeOutput[] {
  const earlyItems = activeItems(items).filter(
    (item) => EARLY_DIST_CODES.has(item.box7_distribution_code),
  );
  return earlyItems.map((item) => {
    const taxable = item.box2a_taxable_amount ?? item.box1_gross_distribution;
    return output(form5329, {
        early_distribution: taxable,
        distribution_code: item.box7_distribution_code as string,
      });
  });
}

// Form 4972 outputs: code 5 (prohibited transaction / lump-sum) routes automatically
// Also triggered by exclude_4972 = true
function form4972Outputs(items: R1099Items): NodeOutput[] {
  const lumpItems = activeItems(items).filter(
    (item) => LUMP_SUM_CODES.has(item.box7_distribution_code) || item.exclude_4972 === true,
  );
  return lumpItems.map((item) => (output(form4972, { lump_sum_amount: item.box1_gross_distribution })));
}

// Form 8606 outputs: triggered by exclude_8606_roth, rollover_code = C, or prior_ira_basis.
function form8606Outputs(items: R1099Items): NodeOutput[] {
  const outputs: NodeOutput[] = [];
  for (const item of activeItems(items)) {
    if (item.exclude_8606_roth === true) {
      outputs.push(output(form8606, {
          roth_distribution: item.box1_gross_distribution,
        }));
    } else if (item.rollover_code === "C") {
      outputs.push(output(form8606, {
          roth_conversion: item.box2a_taxable_amount ?? item.box1_gross_distribution,
        }));
    } else if (routedThrough8606PartI(item)) {
      // Traditional IRA with nondeductible basis: Form 8606 Part I computes the taxable amount.
      // prior_ira_basis is the total nondeductible basis carried into this year (line 2).
      // year_end_ira_value is the FMV of remaining traditional IRAs on 12/31 (line 6; 0 if fully distributed).
      outputs.push(output(form8606, {
          nondeductible_contributions: 0,
          prior_basis: item.prior_ira_basis!,
          traditional_distributions: item.box1_gross_distribution,
          year_end_ira_value: item.year_end_ira_value ?? 0,
        }));
    }
  }
  return outputs;
}

class F1099rNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099r";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, agi_aggregator, form5329, form4972, form8606]);

  compute(ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const parsed = inputSchema.parse(input);
    const { f1099rs: r1099s } = parsed;

    // Cross-field validation
    for (const item of r1099s) {
      validateItem(item);
    }

    const outputs: NodeOutput[] = [];

    // IRA f1040 fields
    const iraFields = iraF1040Fields(r1099s, cfg.qcdAnnualLimit, cfg.psoExclusionLimit);
    // Pension f1040 fields
    const pensionFields = pensionF1040Fields(r1099s, cfg.qcdAnnualLimit, cfg.psoExclusionLimit);
    // Disability-as-wages fields
    const disWagesFields = disabilityWagesF1040Fields(r1099s, cfg.qcdAnnualLimit, cfg.psoExclusionLimit);
    // Withholding fields
    const withholdingFields = withholdingF1040Fields(r1099s);

    // Merge all f1040 fields into one output
    const f1040Fields: Partial<z.infer<typeof f1040["inputSchema"]>> = {
      ...iraFields,
      ...pensionFields,
      ...disWagesFields,
      ...withholdingFields,
    };
    if (Object.keys(f1040Fields).length > 0) {
      outputs.push(this.outputNodes.output(f1040, f1040Fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>));
    }

    // Route IRA/pension taxable amounts to AGI aggregator.
    // Only emit line4b_ira_taxable when > 0 to avoid accumulation conflicts with form8606,
    // which emits its own line4b_ira_taxable to agi_aggregator for items with prior_ira_basis.
    const agiFields: Partial<z.infer<typeof agi_aggregator["inputSchema"]>> = {};
    if ((iraFields.line4b_ira_taxable ?? 0) > 0) agiFields.line4b_ira_taxable = iraFields.line4b_ira_taxable;
    if (pensionFields.line5b_pension_taxable !== undefined) agiFields.line5b_pension_taxable = pensionFields.line5b_pension_taxable;
    if (Object.keys(agiFields).length > 0) {
      outputs.push(this.outputNodes.output(agi_aggregator, agiFields as AtLeastOne<z.infer<typeof agi_aggregator["inputSchema"]>>));
    }

    // Secondary form outputs
    outputs.push(...form5329Outputs(r1099s));
    outputs.push(...form4972Outputs(r1099s));
    outputs.push(...form8606Outputs(r1099s));

    return { outputs };
  }
}

export const f1099r = new F1099rNode();
