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
import { form4972Elections } from "../../intermediate/forms/form4972/elections.ts";
import {
  distributionEvidenceSchema,
  form8606,
  IraOwner,
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

  const currentYear = item.form8915f_treatment === "three_years"
    ? Math.round(taxable / 3)
    : taxable;
  return currentYear - (item.form8915f_repayment_amount ?? 0);
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

export enum SelfCertificationReason {
  FinancialInstitutionError = "financial_institution_error",
  UncashedMisplacedCheck = "uncashed_misplaced_check",
  MistakenAccount = "mistaken_account",
  SeverelyDamagedResidence = "severely_damaged_residence",
  FamilyDeath = "family_death",
  SeriousIllness = "serious_illness",
  Incarceration = "incarceration",
  ForeignCountryRestriction = "foreign_country_restriction",
  PostalError = "postal_error",
  ReturnedLevy = "returned_levy",
  DelayedPlanInformation = "delayed_plan_information",
  StateUnclaimedProperty = "state_unclaimed_property",
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
  form4972_plan: z.object({
    participant_name: z.string().trim().min(1),
    participant_ssn: z.string().regex(/^\d{9}$/),
    plan_reference: z.string().trim().min(1),
    full_balance_statement_reference: z.string().trim().min(1),
    all_qualified_distributions_included: z.literal(true),
  }).strict().optional(),
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
    // Publication 590-A automatic waiver: the institution timely received
    // funds and instructions, but its error alone delayed the deposit.
    automatic_late_waiver: z.object({
      institution_received_on: z.string().date(),
      deposit_instructions_on: z.string().date(),
      institution_error_only: z.literal(true),
      not_inherited_ira_confirmed: z.literal(true),
      not_required_minimum_distribution_confirmed: z.literal(true),
      rollover_eligibility_review_reference: z.string().trim().min(1),
      institution_receipt_reference: z.string().trim().min(1),
      deposit_instructions_reference: z.string().trim().min(1),
      institution_error_reference: z.string().trim().min(1),
      deposit_confirmation_reference: z.string().trim().min(1),
      qualified_plan_acceptance_reference: z.string().trim().min(1).optional(),
    }).strict().optional(),
    // Revenue Procedure 2020-46 written certification to the receiving IRA
    // trustee or plan administrator. The 30-day safe harbor is checked below.
    self_certified_late_waiver: z.object({
      reason: z.nativeEnum(SelfCertificationReason),
      reason_prevented_timely_rollover: z.literal(true),
      reason_resolved_on: z.string().date(),
      reason_evidence_reference: z.string().trim().min(1),
      no_prior_irs_waiver_denial_confirmed: z.literal(true),
      prior_denial_review_reference: z.string().trim().min(1),
      certification_signed_on: z.string().date(),
      certification_delivered_on: z.string().date(),
      signed_certification_reference: z.string().trim().min(1),
      contribution_confirmation_reference: z.string().trim().min(1),
      not_inherited_ira_confirmed: z.literal(true),
      not_required_minimum_distribution_confirmed: z.literal(true),
      rollover_eligibility_review_reference: z.string().trim().min(1),
      qualified_plan_acceptance_reference: z.string().trim().min(1).optional(),
    }).strict().optional(),
    // A favorable IRS private letter ruling grants only the 60-day waiver;
    // the distribution still has to qualify for rollover on other grounds.
    irs_private_letter_waiver: z.object({
      ruling_number: z.string().trim().min(1),
      issued_on: z.string().date(),
      ruling_rollover_deadline_on: z.string().date(),
      favorable_60_day_waiver_confirmed: z.literal(true),
      issued_ruling_reference: z.string().trim().min(1),
      owner_distribution_match_review_reference: z.string().trim().min(1),
      deposit_confirmation_reference: z.string().trim().min(1),
      not_inherited_ira_confirmed: z.literal(true),
      not_required_minimum_distribution_confirmed: z.literal(true),
      rollover_eligibility_review_reference: z.string().trim().min(1),
      qualified_plan_acceptance_reference: z.string().trim().min(1).optional(),
    }).strict().optional(),
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
  form8915f_repayment_amount: z.number().int().positive().optional(),

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
  form8606_distribution_evidence: distributionEvidenceSchema.optional(),

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
      rollover.completed_on.startsWith("2026-") ||
      rollover.automatic_late_waiver !== undefined ||
      rollover.self_certified_late_waiver !== undefined ||
      rollover.irs_private_letter_waiver !== undefined);
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
    const waiver = rollover.automatic_late_waiver;
    const waiverText = waiver
      ? ` The automatic 60-day waiver applies: the institution received the funds on ${waiver.institution_received_on} and deposit instructions on ${waiver.deposit_instructions_on}; institution error alone delayed deposit until ${rollover.completed_on}. The source was reviewed as neither inherited nor an RMD.`
      : "";
    const certification = rollover.self_certified_late_waiver;
    const certificationText = certification
      ? ` Rev. Proc. 2020-46 self-certification: ${
        certification.reason.replaceAll("_", " ")
      } prevented a timely rollover until ${certification.reason_resolved_on}; certification was signed on ${certification.certification_signed_on} and delivered to the receiving institution on ${certification.certification_delivered_on}. No prior IRS waiver denial was found.`
      : "";
    const ruling = rollover.irs_private_letter_waiver;
    const rulingText = ruling
      ? ` IRS private letter ruling ${ruling.ruling_number}, issued ${ruling.issued_on}, grants a 60-day waiver for this owner and distribution with a deposit deadline of ${ruling.ruling_rollover_deadline_on}.`
      : "";
    return [
      `Distribution ${
        index + 1
      }: ${opening}${waiverText}${certificationText}${rulingText}`,
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

function automaticWaiverDeadline(distributedOn: string): number {
  const deadline = new Date(`${distributedOn}T00:00:00Z`);
  deadline.setUTCFullYear(deadline.getUTCFullYear() + 1);
  return deadline.getTime();
}

function validateLateWaiver(item: R1099Item): void {
  const rollover = item.ira_rollover!;
  const waiver = rollover.automatic_late_waiver;
  const certification = rollover.self_certified_late_waiver;
  const ruling = rollover.irs_private_letter_waiver;
  const distributed = Date.parse(rollover.distributed_on);
  const completed = Date.parse(rollover.completed_on);
  const elapsedDays = (completed - distributed) / 86_400_000;
  const directPlanRollover = rollover.destination === "qualified_plan" &&
    item.box7_distribution_code === DistributionCode.CodeG;
  if ([waiver, certification, ruling].filter(Boolean).length > 1) {
    throw new Error("IRA late rollover cannot claim two waiver methods");
  }
  if (ruling) {
    validatePrivateLetterWaiver(item);
    return;
  }
  if (certification) {
    validateSelfCertifiedLateWaiver(item);
    return;
  }
  if (!waiver) {
    if (elapsedDays > 60 && !directPlanRollover) {
      throw new Error("IRA rollover needs completion within 60 days");
    }
    return;
  }
  if (elapsedDays <= 60 || directPlanRollover) {
    throw new Error(
      "IRA automatic late waiver needs an actual late 60-day rollover",
    );
  }
  if (!item.source_document_reference || !item.account_number) {
    throw new Error(
      "IRA automatic late waiver needs its issued Form 1099-R reference and account",
    );
  }
  if (
    rollover.destination === "qualified_plan" &&
    !waiver.qualified_plan_acceptance_reference
  ) {
    throw new Error(
      "IRA automatic late waiver to a qualified plan needs plan acceptance evidence",
    );
  }
  if (
    rollover.destination === "ira" &&
    waiver.qualified_plan_acceptance_reference
  ) {
    throw new Error(
      "IRA automatic late waiver cannot claim plan acceptance for an IRA destination",
    );
  }
  for (
    const date of [
      waiver.institution_received_on,
      waiver.deposit_instructions_on,
    ]
  ) {
    const elapsed = (Date.parse(date) - distributed) / 86_400_000;
    if (elapsed < 0 || elapsed > 60 || Date.parse(date) > completed) {
      throw new Error(
        "IRA automatic late waiver needs institution receipt and instructions within 60 days",
      );
    }
  }
  if (completed > automaticWaiverDeadline(rollover.distributed_on)) {
    throw new Error("IRA automatic late waiver needs deposit within one year");
  }
}

function validateSelfCertifiedLateWaiver(item: R1099Item): void {
  const rollover = item.ira_rollover!;
  const certification = rollover.self_certified_late_waiver!;
  const distributed = Date.parse(rollover.distributed_on);
  const completed = Date.parse(rollover.completed_on);
  const resolved = Date.parse(certification.reason_resolved_on);
  const deadline = distributed + 60 * 86_400_000;
  if (
    completed <= deadline ||
    (rollover.destination === "qualified_plan" &&
      item.box7_distribution_code === DistributionCode.CodeG)
  ) {
    throw new Error(
      "IRA self-certification needs an actual late 60-day rollover",
    );
  }
  if (!item.source_document_reference || !item.account_number) {
    throw new Error(
      "IRA self-certification needs its issued Form 1099-R reference and account",
    );
  }
  if (
    rollover.destination === "qualified_plan" &&
    !certification.qualified_plan_acceptance_reference
  ) {
    throw new Error(
      "IRA self-certification to a qualified plan needs plan acceptance evidence",
    );
  }
  if (
    rollover.destination === "ira" &&
    certification.qualified_plan_acceptance_reference
  ) {
    throw new Error(
      "IRA self-certification cannot claim plan acceptance for an IRA destination",
    );
  }
  if (
    resolved <= deadline || resolved > completed ||
    completed - resolved > 30 * 86_400_000
  ) {
    throw new Error(
      "IRA self-certification needs contribution within 30 days after the reason ended",
    );
  }
  const signed = Date.parse(certification.certification_signed_on);
  const delivered = Date.parse(certification.certification_delivered_on);
  if (
    signed < distributed || signed > delivered ||
    delivered < resolved || delivered > completed
  ) {
    throw new Error(
      "IRA self-certification must be signed and delivered before the late contribution",
    );
  }
}

function validatePrivateLetterWaiver(item: R1099Item): void {
  const rollover = item.ira_rollover!;
  const ruling = rollover.irs_private_letter_waiver!;
  const distributed = Date.parse(rollover.distributed_on);
  const completed = Date.parse(rollover.completed_on);
  if (
    completed <= distributed + 60 * 86_400_000 ||
    (rollover.destination === "qualified_plan" &&
      item.box7_distribution_code === DistributionCode.CodeG)
  ) {
    throw new Error(
      "IRA private letter waiver needs an actual late 60-day rollover",
    );
  }
  if (!item.source_document_reference || !item.account_number) {
    throw new Error(
      "IRA private letter waiver needs its issued Form 1099-R reference and account",
    );
  }
  if (
    Date.parse(ruling.issued_on) < distributed ||
    Date.parse(ruling.ruling_rollover_deadline_on) <
      Date.parse(ruling.issued_on) ||
    completed > Date.parse(ruling.ruling_rollover_deadline_on)
  ) {
    throw new Error(
      "IRA private letter waiver needs deposit within the ruling deadline",
    );
  }
  if (
    rollover.destination === "qualified_plan" &&
    !ruling.qualified_plan_acceptance_reference
  ) {
    throw new Error(
      "IRA private letter waiver to a qualified plan needs plan acceptance evidence",
    );
  }
  if (
    rollover.destination === "ira" &&
    ruling.qualified_plan_acceptance_reference
  ) {
    throw new Error(
      "IRA private letter waiver cannot claim plan acceptance for an IRA destination",
    );
  }
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
    validateLateWaiver(item);
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
    item.form8915f_repayment_amount !== undefined &&
    (item.form8915f_treatment === undefined ||
      item.form8915f_repayment_amount >
        (item.form8915f_treatment === "three_years"
          ? Math.round(item.box1_gross_distribution / 3)
          : item.box1_gross_distribution))
  ) {
    throw new Error(
      "Form 1099-R Form 8915-F repayment needs a linked current-year amount",
    );
  }
  if (
    item.form8915f_treatment !== undefined &&
    (
      !item.source_document_reference || !item.account_number ||
      !item.box13_date_of_payment ||
      item.box2a_taxable_amount !== item.box1_gross_distribution ||
      !["1", "2", "7"].includes(item.box7_distribution_code) ||
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
function form8606PartIInput(item: R1099Item) {
  const evidence = item.form8606_distribution_evidence;
  if (
    !evidence || (item.ts !== "T" && item.ts !== "S") ||
    !item.source_document_reference ||
    evidence.form1099r_source_document_reference !==
      item.source_document_reference ||
    evidence.prior_form8606.filed_line14_basis !== item.prior_ira_basis ||
    evidence.prior_form8606.owner_ssn !==
      evidence.year_end_statement.owner_ssn ||
    evidence.year_end_statement.total_fair_market_value !==
      (item.year_end_ira_value ?? 0) ||
    new Set([
        evidence.form1099r_source_document_reference,
        evidence.prior_form8606.source_document_reference,
        evidence.year_end_statement.source_document_reference,
      ]).size !== 3
  ) {
    throw new Error(
      "Form 8606 prior-basis distribution needs matching 1099-R, filed prior Form 8606, and year-end IRA statement sources",
    );
  }
  return {
    ...(evidence.no_current_nondeductible_contribution_confirmed
      ? { nondeductible_contributions: 0 }
      : {}),
    prior_basis: item.prior_ira_basis!,
    traditional_distributions: item.box1_gross_distribution,
    year_end_ira_value: item.year_end_ira_value ?? 0,
    distribution_evidence: evidence,
    filing_details: {
      owner: item.ts === "S" ? IraOwner.Spouse : IraOwner.Taxpayer,
      prior_basis_documented_from_2024_form8606: true,
      no_ira_distributions_or_conversions_confirmed: false,
    },
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

// Form 5329 outputs: code 1 ordinarily routes early distributions here.
// A reviewed, source-matched Form 8915-F qualified disaster distribution is
// exempt and the exporter requires its actual Form 8915-F document.
function form5329Outputs(items: R1099Items): NodeOutput[] {
  const earlyItems = activeItems(items).filter(
    (item) =>
      EARLY_DIST_CODES.has(item.box7_distribution_code) &&
      item.form8915f_treatment === undefined,
  );
  return earlyItems.map((item) => {
    if (
      item.form8606_distribution_evidence
        ?.no_current_nondeductible_contribution_confirmed === false
    ) {
      throw new Error(
        "Form 5329 early IRA distribution with a current-year Form 8606 contribution needs a finalized contribution basis join",
      );
    }
    // Form 5329 line 1 takes the early distribution "includible in income". With
    // nondeductible basis that is the Form 8606 line 15c taxable amount, not box 2a.
    const taxable = routedThrough8606PartI(item)
      ? taxableTraditionalDistribution({
        ...form8606PartIInput(item),
        nondeductible_contributions: 0,
      })
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
  if (lumpItems.length === 3 || lumpItems.length === 4) {
    const taxpayer = lumpItems.filter((item) => item.ts === "T");
    const spouse = lumpItems.filter((item) => item.ts === "S");
    const groups = [taxpayer, spouse];
    const pair = groups.find((group) => group.length === 2);
    const refs = lumpItems.map((item) => item.source_document_reference);
    const sourceValid = lumpItems.every((item) =>
      !!item.source_document_reference && !!item.form4972_plan &&
      item.form4972_plan.all_qualified_distributions_included === true &&
      item.box9a_pct_total === 100 &&
      typeof item.box2a_taxable_amount === "number" &&
      item.box2a_taxable_amount > 0 &&
      (item.box3_capital_gain ?? 0) >= 0 &&
      (item.box3_capital_gain ?? 0) <= item.box2a_taxable_amount &&
      (item.box6_nua ?? 0) === 0 && (item.box8_other ?? 0) === 0 &&
      item.box8_pct_total === undefined
    );
    const samePlan = groups.every((group) =>
      group[0] && group.every((item) =>
        item.form4972_plan?.participant_name ===
          group[0].form4972_plan?.participant_name &&
        item.form4972_plan?.participant_ssn ===
          group[0].form4972_plan?.participant_ssn &&
        item.form4972_plan?.plan_reference ===
          group[0].form4972_plan?.plan_reference &&
        item.form4972_plan?.full_balance_statement_reference ===
          group[0].form4972_plan?.full_balance_statement_reference &&
        item.payer_ein === group[0].payer_ein &&
        item.payer_name === group[0].payer_name
      ) && group[0].payer_ein.trim().length > 0 &&
      group[0].payer_name.trim().length > 0
    );
    if (
      !pair || groups.some((group) => group.length < 1 || group.length > 2) ||
      !sourceValid || !samePlan ||
      new Set(refs).size !== lumpItems.length ||
      taxpayer[0]?.form4972_plan?.participant_ssn ===
        spouse[0]?.form4972_plan?.participant_ssn ||
      taxpayer[0]?.form4972_plan?.plan_reference ===
        spouse[0]?.form4972_plan?.plan_reference ||
      items.some((item) =>
        item.exclude_4972 !== true &&
        groups.some((group) =>
          group[0]?.form4972_plan?.plan_reference ===
            item.form4972_plan?.plan_reference
        )
      )
    ) {
      throw new Error(
        "Form 4972 joint multi-source election needs one or two complete same-plan copies per spouse and distinct full-share plans",
      );
    }
    const sourceForms = groups.map((group) => {
      const plan = group[0].form4972_plan!;
      const source_document_references = group.map((item) =>
        item.source_document_reference!
      );
      return {
        source_document_references,
        form4972_plan: plan,
        recipient: group[0].ts,
        lump_sum_amount: group.reduce(
          (sum, item) => sum + item.box2a_taxable_amount!,
          0,
        ),
        capital_gain_amount: group.reduce(
          (sum, item) => sum + (item.box3_capital_gain ?? 0),
          0,
        ),
        ...(group.length === 2
          ? {
            multiple_1099r: {
              ...plan,
              source_document_references: [
                source_document_references[0],
                source_document_references[1],
              ],
            },
          }
          : {}),
      };
    });
    return [output(form4972Elections, { source_forms: sourceForms })];
  }
  if (lumpItems.length === 2 && lumpItems[0].ts !== lumpItems[1].ts) {
    if (
      !lumpItems[0].source_document_reference ||
      !lumpItems[1].source_document_reference ||
      lumpItems[0].source_document_reference ===
        lumpItems[1].source_document_reference ||
      !lumpItems[0].form4972_plan || !lumpItems[1].form4972_plan ||
      lumpItems[0].form4972_plan.participant_ssn ===
        lumpItems[1].form4972_plan.participant_ssn ||
      lumpItems[0].form4972_plan.plan_reference ===
        lumpItems[1].form4972_plan.plan_reference
    ) {
      throw new Error(
        "Form 4972 spouse pair needs distinct fully identified participants, plans, and source copies",
      );
    }
    const sourceForms = lumpItems.map((item) => {
      if (
        !item.source_document_reference || !item.form4972_plan ||
        item.ts === undefined || item.box2a_taxable_amount === undefined ||
        item.box2a_taxable_amount <= 0 ||
        item.box9a_pct_total !== undefined && item.box9a_pct_total !== 100
      ) {
        throw new Error(
          "Form 4972 spouse pair needs identified full-share plan and source copies",
        );
      }
      return {
        source_document_references: [item.source_document_reference],
        form4972_plan: item.form4972_plan,
        recipient: item.ts,
        lump_sum_amount: item.box2a_taxable_amount,
        capital_gain_amount: item.box3_capital_gain ?? 0,
        box6_nua: item.box6_nua ?? 0,
        annuity_actuarial_value: item.box8_other ?? 0,
      };
    });
    return [output(form4972Elections, { source_forms: sourceForms })];
  }
  if (lumpItems.length > 1) {
    const [first, second] = lumpItems;
    const plan = first?.form4972_plan;
    if (
      lumpItems.length !== 2 || !first || !second || !plan ||
      !first.source_document_reference || !second.source_document_reference ||
      first.source_document_reference === second.source_document_reference ||
      second.form4972_plan?.participant_name !== plan.participant_name ||
      second.form4972_plan?.participant_ssn !== plan.participant_ssn ||
      second.form4972_plan?.plan_reference !== plan.plan_reference ||
      second.form4972_plan?.full_balance_statement_reference !==
        plan.full_balance_statement_reference ||
      second.form4972_plan?.all_qualified_distributions_included !== true ||
      first.ts === undefined || second.ts !== first.ts ||
      first.ts !== "T" || first.payer_ein !== second.payer_ein ||
      first.payer_name !== second.payer_name ||
      first.payer_ein.trim().length === 0 ||
      first.payer_name.trim().length === 0 ||
      items.some((item) =>
        item.exclude_4972 !== true &&
        item.form4972_plan?.plan_reference === plan.plan_reference
      ) ||
      lumpItems.some((item) =>
        item.box9a_pct_total !== 100 ||
        item.box2a_taxable_amount === undefined ||
        item.box2a_taxable_amount <= 0 ||
        (item.box6_nua ?? 0) !== 0 ||
        (item.box8_other ?? 0) !== 0 ||
        item.box8_pct_total !== undefined
      )
    ) {
      throw new Error(
        "Form 4972 two-distribution election needs one fully identified participant, plan, recipient and distinct full-share source copies",
      );
    }
    return [output(form4972Elections, {
      source_forms: [{
        source_document_references: [
          first.source_document_reference,
          second.source_document_reference,
        ],
        form4972_plan: plan,
        recipient: first.ts,
        lump_sum_amount: first.box2a_taxable_amount! +
          second.box2a_taxable_amount!,
        ...((first.box3_capital_gain ?? 0) +
              (second.box3_capital_gain ?? 0) > 0
          ? {
            capital_gain_amount: (first.box3_capital_gain ?? 0) +
              (second.box3_capital_gain ?? 0),
          }
          : {}),
        multiple_1099r: {
          ...plan,
          source_document_references: [
            first.source_document_reference,
            second.source_document_reference,
          ],
        },
      }],
    })];
  }
  const sourceForms = lumpItems.map((item) => {
    if (item.box9a_pct_total === 0) {
      throw new Error("Form 4972 box 9a recipient share must be positive");
    }
    if (item.box2a_taxable_amount === undefined) {
      throw new Error(
        "Form 4972 election requires the taxable amount from Form 1099-R box 2a or a separately calculated taxable amount",
      );
    }
    if (!item.source_document_reference) {
      throw new Error(
        "Form 4972 elected Form 1099-R needs a source-document reference",
      );
    }
    return {
      source_document_references: [item.source_document_reference],
      ...(item.form4972_plan ? { form4972_plan: item.form4972_plan } : {}),
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
    };
  });
  return sourceForms.length > 0
    ? [output(form4972Elections, { source_forms: sourceForms })]
    : [];
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
    form4972Elections,
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
