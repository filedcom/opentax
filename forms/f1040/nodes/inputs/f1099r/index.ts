import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import {
  type AtLeastOne,
  output,
  TaxNode,
} from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { form5329 } from "../../intermediate/forms/form5329/index.ts";
import { form4972 } from "../../intermediate/forms/form4972/index.ts";
import {
  form8606,
  type Form8606Input,
  taxableTraditionalDistribution,
} from "../../intermediate/forms/form8606/index.ts";
import { tsSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../config/index.ts";

// Distribution codes that produce zero taxable income (non-taxable exchanges).
// Code G is not included: a direct rollover to a Roth account can have a
// taxable amount explicitly reported in box 2a.
const ZERO_TAXABLE_CODES = new Set(["N", "R", "Q", "T", "6", "W"]);

// Distribution codes triggering form5329 (early distribution penalty)
// Code 1 = early distribution, no known exception (traditional/SEP/SIMPLE IRA, pension)
// Code J = early distribution from Roth IRA, no known exception (IRC §72(t))
const EARLY_DIST_CODES = new Set(["1", "J", "S"]);

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
  // A code-G Form 1099-R can report a taxable Roth rollover in box 2a.
  // With no box 2a, retain the non-taxable direct-rollover treatment.
  if (code1 === "G" && item.box2a_taxable_amount === undefined) return 0;
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
  if (
    item.box7_ira_simple_indicator !== true &&
    item.simplified_method_flag === true
  ) {
    const exclusion = simplifiedMethodExclusion(item);
    taxable = Math.max(0, taxable - exclusion);
  }

  return item.form8915f_treatment === "three_years"
    ? Math.round(taxable / 3)
    : taxable;
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
  payer_address_line1: z.string().optional(),
  payer_address_city: z.string().optional(),
  payer_address_state: z.string().optional(),
  payer_address_zip: z.string().optional(),
  recipient_address_line1: z.string().optional(),
  recipient_address_city: z.string().optional(),
  recipient_address_state: z.string().optional(),
  recipient_address_zip: z.string().optional(),
  account_number: z.string().optional(),
  source_document_reference: z.string().trim().min(1).optional(),
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
  // Percentage printed alongside box 8's annuity actuarial value. This can
  // differ from box 9a and is required for a shared Form 4972 distribution.
  box8_pct_total: z.number().min(0).max(100).optional(),

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
  ira_rollover: z.object({
    source_ira_type: z.enum([
      "traditional",
      "traditional_sep",
      "traditional_simple",
      "roth",
      "roth_sep",
      "roth_simple",
    ]),
    destination: z.enum(["ira", "qualified_plan"]),
    destination_ira_type: z.enum([
      "traditional",
      "traditional_sep",
      "traditional_simple",
      "roth",
      "roth_sep",
      "roth_simple",
    ]).optional(),
    destination_name: z.string().min(1).max(120).regex(/^[!-~]+(?: [!-~]+)*$/)
      .optional(),
    distributed_on: z.string().date(),
    completed_on: z.string().date(),
    // Null means the owner's prior 12-month IRA-to-IRA history was reviewed
    // and no earlier rollover was found; omission is not a reviewed answer.
    last_ira_to_ira_rollover_on: z.string().date().nullable(),
  }).optional(),
  // Code G also covers designated Roth employer contributions. A confirmed
  // direct-rollover fact is needed before checking Form 1040 line 5c(1).
  direct_rollover_confirmed: z.boolean().optional(),

  // Disability flags
  disability_flag: z.boolean().optional(),
  disability_as_wages: z.boolean().optional(),

  // Special treatment flags
  carry_to_5329: z.boolean().optional(),
  exclude_4972: z.boolean().optional(),
  exclude_8606_roth: z.boolean().optional(),
  // The reviewed Form 8915-F source must own this tax-year treatment.
  form8915f_treatment: z.enum(["full", "three_years"]).optional(),

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

// Form 1040 line 5c(1) follows a payer-reported pension/plan direct rollover,
// not an IRA distribution, an excluded Form 4972 distribution, or a disability
// payment reported as wages. Code G can have a taxable Roth portion in box 2a.
export function isPensionDirectRollover(item: R1099Item): boolean {
  return item.box7_distribution_code === DistributionCode.CodeG &&
    item.direct_rollover_confirmed === true &&
    item.box7_ira_simple_indicator !== true &&
    item.box1_gross_distribution > 0 &&
    item.no_distribution_received !== true &&
    item.exclude_4972 !== true &&
    item.exclude_8606_roth !== true &&
    !(item.disability_flag === true && item.disability_as_wages === true);
}

export function isIraRollover(item: R1099Item): boolean {
  return item.box7_ira_simple_indicator === true &&
    item.ira_rollover !== undefined &&
    (item.rollover_code === RolloverCode.G ||
      item.rollover_code === RolloverCode.S ||
      item.rollover_code === RolloverCode.X) &&
    item.box1_gross_distribution > 0 &&
    item.no_distribution_received !== true &&
    item.exclude_4972 !== true &&
    item.exclude_8606_roth !== true;
}

export function requiresIraDistributionStatement(item: R1099Item): boolean {
  const rollover = item.ira_rollover;
  return rollover !== undefined && isIraRollover(item) &&
    (rollover.destination === "qualified_plan" ||
      rollover.completed_on.startsWith("2026-"));
}

export function iraDistributionExplanation(
  items: readonly R1099Item[],
): string | undefined {
  assertIraRolloverEvidence(items);
  const rows = items.flatMap((item, index) => {
    if (!requiresIraDistributionStatement(item)) return [];
    const rollover = item.ira_rollover;
    if (!rollover) {
      throw new Error("IRA rollover statement lost source details");
    }
    const rolled = item.rollover_code === RolloverCode.X
      ? item.partial_rollover_amount ?? 0
      : item.box1_gross_distribution;
    const destination = rollover.destination === "qualified_plan"
      ? `${rollover.destination_name} qualified plan`
      : rollover.destination_name
      ? `${rollover.destination_name} IRA`
      : "another IRA";
    const owner = item.ts === "S" ? "Spouse" : "Taxpayer";
    const opening = item.box7_distribution_code === DistributionCode.CodeG
      ? `${owner}'s IRA custodian paid ${
        Math.round(item.box1_gross_distribution)
      } directly to ${destination} on ${rollover.distributed_on}; ${
        Math.round(rolled)
      } was received by the destination on ${rollover.completed_on}.`
      : `${owner} received ${
        Math.round(item.box1_gross_distribution)
      } from an IRA on ${rollover.distributed_on}; ${
        Math.round(rolled)
      } was rolled into ${destination} on ${rollover.completed_on}.`;
    return [
      `Distribution ${index + 1}: ${opening}`,
    ];
  });
  if (rows.length === 0) return undefined;
  const explanation = rows.join(" ");
  if (explanation.length > 9000) {
    throw new Error(
      "IRA distribution statement exceeds the MeF explanation limit",
    );
  }
  return explanation;
}

export function assertIraRolloverEvidence(items: readonly R1099Item[]): void {
  for (const item of items) validateIraRolloverEvidence(item);
  for (const owner of ["T", "S"] as const) {
    const dates = items.filter((item) =>
      (item.ts ?? "T") === owner &&
      item.ira_rollover?.destination === "ira" && isIraRollover(item)
    ).map((item) => item.ira_rollover!.distributed_on).sort();
    for (let index = 1; index < dates.length; index++) {
      if (withinOneYear(dates[index - 1], dates[index])) {
        throw new Error(
          "IRA-to-IRA rollover exceeds one rollover per owner in 12 months",
        );
      }
    }
  }
}

function withinOneYear(prior: string, current: string): boolean {
  const anniversary = new Date(`${prior}T00:00:00Z`);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
  return Date.parse(current) < anniversary.getTime();
}

function validateIraRolloverEvidence(item: R1099Item): void {
  const iraRolloverCode = item.rollover_code === RolloverCode.G ||
    item.rollover_code === RolloverCode.S ||
    item.rollover_code === RolloverCode.X ||
    item.box7_distribution_code === DistributionCode.CodeG;
  if (
    item.box7_ira_simple_indicator === true && iraRolloverCode &&
    item.no_distribution_received !== true && item.ira_rollover === undefined
  ) {
    throw new Error(
      "IRA rollover needs destination and distribution/completion dates",
    );
  }
  if (item.ira_rollover !== undefined) {
    if (!isIraRollover(item)) {
      throw new Error(
        "IRA rollover evidence needs an active IRA distribution and rollover code",
      );
    }
    if (
      (item.prior_ira_basis ?? 0) > 0 || item.qcd_full === true ||
      (item.qcd_partial_amount ?? 0) > 0
    ) {
      throw new Error(
        "IRA rollover cannot share Form 8606 basis or QCD treatment",
      );
    }
    const { destination, distributed_on, completed_on } = item.ira_rollover;
    const rollover = item.ira_rollover;
    if (
      rollover.source_ira_type !== "traditional" &&
      rollover.source_ira_type !== "traditional_sep"
    ) {
      throw new Error(
        "IRA rollover source must be a reviewed traditional or SEP IRA",
      );
    }
    if (
      item.box7_distribution_code === DistributionCode.CodeS ||
      item.box7_distribution_code === DistributionCode.CodeJ ||
      item.box7_distribution_code === DistributionCode.CodeQ ||
      item.box7_distribution_code === DistributionCode.CodeT
    ) {
      throw new Error(
        "IRA rollover source conflicts with the payer distribution code",
      );
    }
    if (destination === "ira") {
      if (
        rollover.destination_ira_type !== "traditional" &&
        rollover.destination_ira_type !== "traditional_sep"
      ) {
        throw new Error(
          "IRA rollover destination must be a reviewed traditional or SEP IRA",
        );
      }
      if (item.box7_distribution_code === DistributionCode.CodeG) {
        throw new Error(
          "IRA-to-IRA transfer cannot use payer code G rollover reporting",
        );
      }
      const prior = rollover.last_ira_to_ira_rollover_on;
      if (
        prior &&
        (prior >= distributed_on || withinOneYear(prior, distributed_on))
      ) {
        throw new Error(
          "IRA-to-IRA rollover exceeds one rollover per owner in 12 months",
        );
      }
    } else if (rollover.destination_ira_type !== undefined) {
      throw new Error("Qualified-plan destination cannot be an IRA account");
    }
    const elapsedDays =
      (Date.parse(completed_on) - Date.parse(distributed_on)) /
      86_400_000;
    if (!distributed_on.startsWith("2025-") || elapsedDays < 0) {
      throw new Error(
        "IRA rollover needs a 2025 distribution completed after payment",
      );
    }
    if (
      elapsedDays > 60 &&
      !(destination === "qualified_plan" &&
        item.box7_distribution_code === DistributionCode.CodeG)
    ) {
      throw new Error("IRA rollover needs completion within 60 days");
    }
    if (
      destination === "qualified_plan" &&
      !item.ira_rollover.destination_name
    ) {
      throw new Error(
        "IRA rollover to a qualified plan needs its destination name",
      );
    }
    if (
      !completed_on.startsWith("2025-") &&
      !completed_on.startsWith("2026-")
    ) {
      throw new Error("IRA rollover completion must be in 2025 or 2026");
    }
    if (
      item.rollover_code === RolloverCode.X &&
      ((item.partial_rollover_amount ?? 0) <= 0 ||
        (item.partial_rollover_amount ?? 0) >= item.box1_gross_distribution)
    ) {
      throw new Error(
        "Partial IRA rollover needs an amount between zero and gross distribution",
      );
    }
  }
}

// Cross-field validation for a single item
function validateItem(item: R1099Item): void {
  validateIraRolloverEvidence(item);
  if (
    item.form8915f_treatment !== undefined &&
    (
      !item.source_document_reference || !item.account_number ||
      !item.box13_date_of_payment ||
      item.box2a_taxable_amount !== item.box1_gross_distribution ||
      !["2", "7"].includes(item.box7_distribution_code) ||
      item.exclude_4972 === true || item.exclude_8606_roth === true ||
      item.rollover_code !== undefined || (item.pso_premium ?? 0) > 0 ||
      item.simplified_method_flag === true ||
      (item.prior_ira_basis ?? 0) > 0 ||
      item.box11_first_year_roth !== undefined ||
      item.qcd_full === true || (item.qcd_partial_amount ?? 0) > 0 ||
      item.disability_as_wages === true ||
      item.no_distribution_received === true
    )
  ) {
    throw new Error(
      "Form 1099-R Form 8915-F treatment needs a fully taxable retirement distribution",
    );
  }
  if (item.exclude_4972 === true && item.no_distribution_received === true) {
    throw new Error(
      "Form 4972 election conflicts with Form 1099-R no_distribution_received",
    );
  }
  if (
    item.no_distribution_received !== true &&
    EARLY_DIST_CODES.has(item.box7_distribution_code) &&
    item.ts === undefined
  ) {
    throw new Error("Form 1099-R early distribution needs its Form 5329 owner");
  }
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
    (item) =>
      item.disability_flag === true && item.disability_as_wages === true,
  );
}

// Whether another form owns the gross distribution or the code identifies a
// non-reportable exchange. A direct rollover still belongs on line 4a or 5a;
// its taxable amount is separately determined for line 4b or 5b.
function isExcludedFromGross(item: R1099Item): boolean {
  if (item.exclude_4972 === true) return true;
  if (item.exclude_8606_roth === true) return true;
  if (ZERO_TAXABLE_CODES.has(item.box7_distribution_code)) return true;
  return false;
}

// Whether this IRA item's taxable amount is delegated to Form 8606 Part I.
// When prior_ira_basis is set, box2a is suppressed from line4b and form8606 computes
// the correct taxable amount after applying the nondeductible basis ratio.
function routedThrough8606PartI(item: R1099Item): boolean {
  return item.box7_ira_simple_indicator === true &&
    (item.prior_ira_basis ?? 0) > 0;
}

// Form 8606 Part I payload for a traditional IRA distribution carrying that basis.
// prior_ira_basis is the total nondeductible basis carried into this year (line 2).
// year_end_ira_value is the FMV of remaining traditional IRAs on 12/31 (line 6; 0 if fully distributed).
function form8606PartIInput(item: R1099Item): Form8606Input {
  return {
    nondeductible_contributions: 0,
    prior_basis: item.prior_ira_basis!,
    traditional_distributions: item.box1_gross_distribution,
    year_end_ira_value: item.year_end_ira_value ?? 0,
  };
}

// Build f1040 output for IRA distributions
function iraF1040Fields(
  items: R1099Items,
  qcdAnnualLimit: number,
  psoExclusionLimit: number,
): Record<string, number> {
  const active = iraItems(activeItems(items));
  // Direct rollovers remain in gross distributions even when line 4b is zero.
  const reportableItems = active.filter((item) => !isExcludedFromGross(item));
  const gross = reportableItems.reduce(
    (sum, item) => sum + item.box1_gross_distribution,
    0,
  );
  // Items routed through Form 8606 Part I are excluded here — form8606 emits line4b for them.
  const nonBasisItems = active.filter((item) => !routedThrough8606PartI(item));
  const taxable = nonBasisItems.reduce(
    (sum, item) =>
      sum + effectiveTaxableAmount(item, qcdAnnualLimit, psoExclusionLimit),
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
  const active = pensionItems(activeItems(items)).filter((item) =>
    !disWagesSet.has(item)
  );
  // Direct rollovers remain in gross distributions even when line 5b is zero.
  const reportableItems = active.filter((item) => !isExcludedFromGross(item));
  const gross = reportableItems.reduce(
    (sum, item) => sum + item.box1_gross_distribution,
    0,
  );
  const taxable = active.reduce(
    (sum, item) =>
      sum + effectiveTaxableAmount(item, qcdAnnualLimit, psoExclusionLimit),
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
    (sum, item) =>
      sum + effectiveTaxableAmount(item, qcdAnnualLimit, psoExclusionLimit),
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
    // Form 5329 line 1 takes the early distribution "includible in income". With
    // nondeductible basis that is the Form 8606 line 15c taxable amount, not box 2a.
    const taxable = routedThrough8606PartI(item)
      ? taxableTraditionalDistribution(form8606PartIInput(item))
      : item.box2a_taxable_amount ?? item.box1_gross_distribution;
    return output(form5329, {
      owner_entries: [{
        owner: item.ts!,
        ...(item.box7_distribution_code === "S"
          ? { simple_ira_early_distribution: taxable }
          : { early_distribution: taxable }),
        distribution_code: item.box7_distribution_code as string,
      }],
    });
  });
}

// Code 5 means a prohibited transaction, not a lump-sum election. Code A
// signals possible eligibility but does not make the election for the filer.
// Only the explicit Form 4972 choice routes the distribution here.
function form4972Outputs(items: R1099Items): NodeOutput[] {
  const lumpItems = activeItems(items).filter(
    (item) => item.exclude_4972 === true,
  );
  if (lumpItems.length > 1) {
    throw new Error(
      "Form 4972 needs plan-participant identity and separate forms for multiple elected Form 1099-R distributions",
    );
  }
  return lumpItems.map((item) => {
    if (item.box9a_pct_total === 0) {
      throw new Error("Form 4972 box 9a recipient share must be positive");
    }
    if (item.box2a_taxable_amount === undefined) {
      throw new Error(
        "Form 4972 election requires the taxable amount from Form 1099-R box 2a or a separately calculated taxable amount",
      );
    }
    return output(form4972, {
      lump_sum_amount: item.box2a_taxable_amount,
      ...(item.box9a_pct_total !== undefined && item.box9a_pct_total < 100
        ? { recipient_share_pct: item.box9a_pct_total }
        : {}),
      ...(item.ts !== undefined ? { recipient: item.ts } : {}),
      ...(item.box3_capital_gain !== undefined
        ? { capital_gain_amount: item.box3_capital_gain }
        : {}),
      ...(item.box6_nua !== undefined ? { box6_nua: item.box6_nua } : {}),
      ...(item.box8_other !== undefined
        ? { annuity_actuarial_value: item.box8_other }
        : {}),
      ...(item.box8_pct_total !== undefined
        ? { annuity_share_pct: item.box8_pct_total }
        : {}),
    });
  });
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
        roth_conversion: item.box2a_taxable_amount ??
          item.box1_gross_distribution,
      }));
    } else if (routedThrough8606PartI(item)) {
      // Traditional IRA with nondeductible basis: Form 8606 Part I computes the taxable amount.
      outputs.push(output(form8606, form8606PartIInput(item)));
    }
  }
  return outputs;
}

class F1099rNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099r";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    agi_aggregator,
    form5329,
    form4972,
    form8606,
  ]);

  compute(ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const parsed = inputSchema.parse(input);
    const { f1099rs: r1099s } = parsed;
    if (
      ctx.taxYear !== 2025 &&
      r1099s.some((item) => item.form8915f_treatment !== undefined)
    ) {
      throw new Error("Form 8915-F source treatment is limited to TY2025");
    }

    // Cross-field validation
    for (const item of r1099s) {
      validateItem(item);
    }
    assertIraRolloverEvidence(r1099s);

    const outputs: NodeOutput[] = [];

    // IRA f1040 fields
    const iraFields = iraF1040Fields(
      r1099s,
      cfg.qcdAnnualLimit,
      cfg.psoExclusionLimit,
    );
    // Pension f1040 fields
    const pensionFields = pensionF1040Fields(
      r1099s,
      cfg.qcdAnnualLimit,
      cfg.psoExclusionLimit,
    );
    // Disability-as-wages fields
    const disWagesFields = disabilityWagesF1040Fields(
      r1099s,
      cfg.qcdAnnualLimit,
      cfg.psoExclusionLimit,
    );
    // Withholding fields
    const withholdingFields = withholdingF1040Fields(r1099s);

    // Merge all f1040 fields into one output
    const f1040Fields: Partial<z.infer<typeof f1040["inputSchema"]>> = {
      ...iraFields,
      ...pensionFields,
      ...disWagesFields,
      ...withholdingFields,
    };
    if (r1099s.some(isPensionDirectRollover)) {
      f1040Fields.line5c_pension_rollover = true;
    }
    if (r1099s.some(isIraRollover)) {
      f1040Fields.line4c_ira_rollover = true;
    }
    if (Object.keys(f1040Fields).length > 0) {
      outputs.push(
        this.outputNodes.output(
          f1040,
          f1040Fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>,
        ),
      );
    }

    // Route IRA/pension taxable amounts to AGI aggregator.
    // Only emit line4b_ira_taxable when > 0 to avoid accumulation conflicts with form8606,
    // which emits its own line4b_ira_taxable to agi_aggregator for items with prior_ira_basis.
    // Also route disability-as-wages (line1a_wages) so AGI is computed correctly.
    const agiFields: Partial<z.infer<typeof agi_aggregator["inputSchema"]>> =
      {};
    if ((iraFields.line4b_ira_taxable ?? 0) > 0) {
      agiFields.line4b_ira_taxable = iraFields.line4b_ira_taxable;
    }
    if (pensionFields.line5b_pension_taxable !== undefined) {
      agiFields.line5b_pension_taxable = pensionFields.line5b_pension_taxable;
    }
    if ((disWagesFields.line1a_wages ?? 0) > 0) {
      agiFields.line1a_wages = disWagesFields.line1a_wages;
    }
    if (Object.keys(agiFields).length > 0) {
      outputs.push(
        this.outputNodes.output(
          agi_aggregator,
          agiFields as AtLeastOne<
            z.infer<typeof agi_aggregator["inputSchema"]>
          >,
        ),
      );
    }

    // Secondary form outputs
    outputs.push(...form5329Outputs(r1099s));
    outputs.push(...form4972Outputs(r1099s));
    outputs.push(...form8606Outputs(r1099s));

    return { outputs };
  }
}

export const f1099r = new F1099rNode();
