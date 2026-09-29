import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import {
  type AtLeastOne,
  TaxNode,
} from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { standard_deduction } from "../../intermediate/worksheets/standard_deduction/index.ts";
import { eitc } from "../../intermediate/forms/eitc/index.ts";
import { f8812 } from "../f8812/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { form8959 } from "../../intermediate/forms/form8959/index.ts";
import {
  form8880,
  jointDistributionReviewSchema,
} from "../../intermediate/forms/form8880/index.ts";
import { form8919 } from "../../intermediate/forms/form8919/index.ts";
import { form4137 } from "../../intermediate/forms/form4137/index.ts";
import { form8960 } from "../../intermediate/forms/form8960/index.ts";
import {
  below100FplStatusSchema,
  form8962,
  mfsPtcStatusSchema,
} from "../../intermediate/forms/form8962/index.ts";
import { form8582 } from "../../intermediate/forms/form8582/index.ts";
import {
  form461,
  form461ScopeReviewSchema,
} from "../../intermediate/forms/form461/index.ts";
import { form8995 } from "../../intermediate/forms/form8995/index.ts";
import { scheduleA } from "../schedule_a/index.ts";
import { FilingStatus } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { schedule1a } from "../../intermediate/forms/schedule1a/index.ts";

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum DependentRelationship {
  Son = "son",
  Daughter = "daughter",
  StepChild = "stepchild",
  FosterChild = "foster",
  Sibling = "sibling",
  StepSibling = "stepsibling",
  HalfSibling = "halfsibling",
  Grandchild = "grandchild",
  Grandparent = "grandparent",
  Parent = "parent",
  StepParent = "stepparent",
  ParentInLaw = "parent_in_law",
  ChildInLaw = "child_in_law",
  SiblingInLaw = "sibling_in_law",
  SiblingParent = "sibling_parent", // aunt / uncle
  ChildSibling = "child_sibling", // niece / nephew
  Other = "other",
}

export enum IRSDependentRelationshipCode {
  Son = "SON",
  Daughter = "DAUGHTER",
  StepChild = "STEPCHILD",
  FosterChild = "FOSTER CHILD",
  Brother = "BROTHER",
  Sister = "SISTER",
  StepBrother = "STEPBROTHER",
  StepSister = "STEPSISTER",
  HalfBrother = "HALF BROTHER",
  HalfSister = "HALF SISTER",
  Grandchild = "GRANDCHILD",
  Niece = "NIECE",
  Nephew = "NEPHEW",
  Parent = "PARENT",
  Grandparent = "GRANDPARENT",
  Aunt = "AUNT",
  Uncle = "UNCLE",
  Other = "OTHER",
  None = "NONE",
}

export enum DependentCreditCategory {
  ChildTaxCredit = "ctc",
  OtherDependentCredit = "odc",
  None = "none",
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const dependentSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  name_control: z.string().regex(/^[A-Z][A-Z\- ]{0,3}$/).optional(),
  middle_initial: z.string().max(1).optional(),
  ssn: z.string().optional(),
  itin: z.string().optional(),
  atin: z.string().optional(), // Adoption TIN — disqualifies CTC
  ssn_valid_for_employment: z.boolean().optional(),
  ssn_issued_before_due_date: z.boolean().optional(),
  tin_issued_by_due_date: z.boolean().optional(),
  dob: z.string(), // ISO date YYYY-MM-DD
  relationship: z.nativeEnum(DependentRelationship),
  irs_relationship_code: z.nativeEnum(IRSDependentRelationshipCode).optional(),
  months_in_home: z.number().int().min(0).max(12),
  lived_in_us_over_half_year: z.boolean().optional(),
  us_citizen_national_or_resident: z.boolean().optional(),
  provided_over_half_own_support: z.boolean().optional(),
  filed_joint_return_except_refund_only: z.boolean().optional(),
  qualifying_child_for_ctc: z.boolean().optional(),
  disabled: z.boolean().optional(),
  full_time_student: z.boolean().optional(), // Under 24 full-time student = qualifying child
  gross_income: z.number().nonnegative().optional(), // For qualifying relative test
  // Form 8962 Worksheet 1-2. A dependent's MAGI counts only when a return is
  // required because income meets the filing threshold, not for refund-only returns.
  ptc_tax_return: z.discriminatedUnion("filing", [
    z.object({ filing: z.literal("not_required") }),
    z.object({ filing: z.literal("form8814") }),
    z.object({
      filing: z.literal("required"),
      filed_form1040: z.object({
        source_document_id: z.string().min(1),
        taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
        tax_year: z.literal(2025),
        filing_status: z.literal("single"),
        blind: z.boolean(),
        line1z_wages: z.literal(0),
        line2a_tax_exempt_interest: z.number().nonnegative(),
        line2b_taxable_interest: z.number().positive(),
        line3b_dividends: z.literal(0),
        line4b_ira: z.literal(0),
        line5b_pensions: z.literal(0),
        line6b_social_security: z.literal(0),
        line7a_capital_gain: z.literal(0),
        line8_additional_income: z.literal(0),
        line10_adjustments: z.literal(0),
        line11b_agi: z.number().positive(),
      }).strict(),
      interest_forms1099: z.array(
        z.object({
          source_document_id: z.string().min(1),
          recipient_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
          box1_taxable_interest: z.number().nonnegative(),
          box8_tax_exempt_interest: z.number().nonnegative(),
        }).strict(),
      ).min(1),
    }).strict(),
  ]).optional(),
  taxpayer_provided_over_half_support: z.boolean().optional(),
  dependent_on_another_return: z.boolean().optional(), // Disqualifies dependent entirely
  child_care_months: z.number().int().min(0).max(12).optional(), // For Form 2441
  education_credit_eligible: z.boolean().optional(), // For Form 8863
  ip_pin: z.string().length(6).optional(), // Dependent's IP PIN
});

export const dependentFilingSchema = dependentSchema.extend({
  credit_category: z.nativeEnum(DependentCreditCategory),
});
export type DependentFiling = z.infer<typeof dependentFilingSchema>;

export const inputSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  qbi_no_prior_loss_or_suspended_loss_confirmed: z.literal(true).optional(),
  qbi_not_patron_of_specified_cooperative_confirmed: z.literal(true)
    .optional(),
  form461_scope_review: form461ScopeReviewSchema.optional(),
  // Required for the Form 3800 line 13 limit when filing separately.
  spouse_has_business_credit: z.boolean().optional(),
  // Taxpayer identity
  taxpayer_first_name: z.string().optional(),
  taxpayer_last_name: z.string().optional(),
  taxpayer_middle_initial: z.string().max(1).optional(),
  taxpayer_suffix: z.string().optional(),
  taxpayer_ssn: z.string().optional(),
  taxpayer_ssn_valid_for_employment: z.boolean().optional(),
  taxpayer_ssn_issued_before_due_date: z.boolean().optional(),
  taxpayer_tin_issued_by_due_date: z.boolean().optional(),
  taxpayer_dob: z.string().optional(),
  taxpayer_form8880_student_five_months: z.boolean().optional(),
  taxpayer_form8880_claimed_as_dependent: z.boolean().optional(),
  taxpayer_blind: z.boolean().optional(),
  taxpayer_age_65_or_older: z.boolean().optional(),
  taxpayer_can_be_claimed_as_dependent: z.boolean().optional(),
  dependent_earned_income: z.number().nonnegative().optional(),
  taxpayer_occupation: z.string().optional(),
  taxpayer_daytime_phone: z.string().optional(),
  taxpayer_email: z.string().optional(),
  taxpayer_deceased: z.boolean().optional(),
  taxpayer_death_date: z.string().optional(), // ISO date YYYY-MM-DD
  taxpayer_ip_pin: z.string().length(6).optional(), // 6-digit IP PIN from IRS
  taxpayer_prior_year_agi: z.number().optional(),
  // Spouse identity (MFJ / MFS)
  spouse_first_name: z.string().optional(),
  spouse_last_name: z.string().optional(),
  spouse_middle_initial: z.string().max(1).optional(),
  spouse_suffix: z.string().optional(),
  spouse_ssn: z.string().optional(),
  spouse_ssn_valid_for_employment: z.boolean().optional(),
  spouse_ssn_issued_before_due_date: z.boolean().optional(),
  spouse_tin_issued_by_due_date: z.boolean().optional(),
  spouse_dob: z.string().optional(),
  spouse_form8880_student_five_months: z.boolean().optional(),
  spouse_form8880_claimed_as_dependent: z.boolean().optional(),
  form8880_joint_distribution_review: jointDistributionReviewSchema.optional(),
  form8880_joint_2025_distribution_review: z.never().optional(),
  form8880_joint_prior_year_distribution_review: z.never().optional(),
  spouse_blind: z.boolean().optional(),
  spouse_age_65_or_older: z.boolean().optional(),
  spouse_occupation: z.string().optional(),
  spouse_daytime_phone: z.string().optional(),
  spouse_email: z.string().optional(),
  spouse_deceased: z.boolean().optional(),
  spouse_death_date: z.string().optional(),
  spouse_ip_pin: z.string().length(6).optional(),
  spouse_prior_year_agi: z.number().optional(),
  // Mailing address
  address_line1: z.string().optional(),
  address_line2: z.string().optional(), // Apt/unit number
  address_in_care_of: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  // Distinct 2025 residence states for the Form 8962 poverty table.
  ptc_residence_states_2025: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1)
    .optional(),
  // January through December residence. Required with a multi-state list so
  // a policy switch can be tied to the taxpayer's actual state each month.
  ptc_residence_months_2025: z.array(z.string().regex(/^[A-Z]{2}$/)).length(12)
    .optional(),
  address_zip: z.string().optional(),
  address_foreign_country: z.string().optional(),
  address_foreign_province_state: z.string().optional(),
  address_foreign_postal_code: z.string().optional(),
  // 1040 top-of-form fields
  digital_assets: z.boolean().optional(), // Line 1: digital assets question
  presidential_campaign_fund_taxpayer: z.boolean().optional(),
  presidential_campaign_fund_spouse: z.boolean().optional(),
  // Filing/return metadata
  extension_filed: z.boolean().optional(),
  taxpayer_signature_pin: z.string().length(5).optional(),
  taxpayer_signature_date: z.string().date().optional(),
  spouse_signature_pin: z.string().length(5).optional(),
  spouse_signature_date: z.string().date().optional(),
  // MFS-specific
  mfs_spouse_itemizing: z.boolean().optional(), // MFS: spouse is itemizing
  mfs_spouse_lived_with_taxpayer: z.boolean().optional(),
  ptc_below_100_fpl_status: below100FplStatusSchema.optional(),
  ptc_mfs_status: mfsPtcStatusSchema.optional(),
  // HOH-specific
  hoh_qualifying_person_name: z.string().optional(),
  hoh_qualifying_person_relationship: z.string().optional(),
  hoh_paid_more_than_half_home_costs: z.boolean().optional(),
  // QSS-specific
  qss_spouse_death_year: z.number().int().optional(),
  qss_qualifying_child_ssn: z.string().optional(),
  // Refund direct deposit
  bank_routing_number: z.string().length(9).optional(),
  bank_account_number: z.string().min(4).max(17).optional(),
  bank_account_type: z.enum(["checking", "savings"]).optional(),
  // Dependents
  dependents: z.array(dependentSchema).optional(),
});

// ─── Type aliases ─────────────────────────────────────────────────────────────

type GeneralInput = z.infer<typeof inputSchema>;
type DependentItem = z.infer<typeof dependentSchema>;

export function ptcDependentsModifiedAgi(dependents: DependentItem[]): number {
  return dependents.reduce((total, dep) => {
    const taxReturn = dep.ptc_tax_return;
    if (!taxReturn || taxReturn.filing !== "required") return total;
    const filed = taxReturn.filed_form1040;
    const taxableInterest = taxReturn.interest_forms1099.reduce(
      (sum, source) => sum + source.box1_taxable_interest,
      0,
    );
    const exemptInterest = taxReturn.interest_forms1099.reduce(
      (sum, source) => sum + source.box8_tax_exempt_interest,
      0,
    );
    if (
      filed.line2a_tax_exempt_interest !== exemptInterest ||
      filed.line2b_taxable_interest !== taxableInterest ||
      filed.line11b_agi !== taxableInterest
    ) {
      throw new Error(
        "Form 8962 dependent filed Form 1040 interest and AGI must reconcile to Forms 1099-INT",
      );
    }
    const birth = /^\d{4}-\d{2}-\d{2}$/.test(dep.dob)
      ? new Date(`${dep.dob}T00:00:00Z`)
      : new Date(Number.NaN);
    if (
      Number.isNaN(birth.getTime()) ||
      birth.toISOString().slice(0, 10) !== dep.dob
    ) {
      throw new Error("Form 8962 dependent needs a valid birth date");
    }
    const age65 = birth.getTime() < Date.UTC(1961, 0, 2);
    const unearnedThreshold = 1_350 +
      (age65 ? 2_000 : 0) + (filed.blind ? 2_000 : 0);
    if (taxableInterest <= unearnedThreshold) {
      throw new Error(
        "Form 8962 dependent 1099-INT income does not establish the 2025 filing requirement",
      );
    }
    return total + filed.line11b_agi + exemptInterest;
  }, 0);
}
export type FilerCreditFacts = Pick<
  GeneralInput,
  | "filing_status"
  | "taxpayer_ssn"
  | "taxpayer_ssn_valid_for_employment"
  | "taxpayer_ssn_issued_before_due_date"
  | "taxpayer_tin_issued_by_due_date"
  | "spouse_ssn"
  | "spouse_ssn_valid_for_employment"
  | "spouse_ssn_issued_before_due_date"
  | "spouse_tin_issued_by_due_date"
>;

export interface FilerCreditEligibility {
  taxpayerValidSsn: boolean;
  spouseValidSsn: boolean;
  ctc: boolean;
  odc: boolean;
  eitc: boolean;
}

export function filerCreditEligibility(
  facts: FilerCreditFacts,
): FilerCreditEligibility {
  const taxpayerTimelyTin = Boolean(facts.taxpayer_ssn) &&
    facts.taxpayer_tin_issued_by_due_date === true;
  const spouseTimelyTin = Boolean(facts.spouse_ssn) &&
    facts.spouse_tin_issued_by_due_date === true;
  const taxpayerEitcSsn = taxpayerTimelyTin &&
    facts.taxpayer_ssn_valid_for_employment === true;
  const spouseEitcSsn = spouseTimelyTin &&
    facts.spouse_ssn_valid_for_employment === true;
  const taxpayerCtcSsn = taxpayerEitcSsn &&
    facts.taxpayer_ssn_issued_before_due_date === true;
  const spouseCtcSsn = spouseEitcSsn &&
    facts.spouse_ssn_issued_before_due_date === true;
  const joint = facts.filing_status === FilingStatus.MFJ;
  return {
    taxpayerValidSsn: taxpayerCtcSsn,
    spouseValidSsn: spouseCtcSsn,
    ctc: joint
      ? (taxpayerCtcSsn && spouseTimelyTin) ||
        (spouseCtcSsn && taxpayerTimelyTin)
      : taxpayerCtcSsn,
    odc: taxpayerTimelyTin && (!joint || spouseTimelyTin),
    eitc: taxpayerEitcSsn && (!joint || spouseEitcSsn),
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Tax year-end reference date for age calculations
const TAX_YEAR_END = new Date("2025-12-31");

// Relationships that qualify for the qualifying-child test (CTC relationship test)
// IRS Pub 501: child, stepchild, foster child, sibling (or step/half), grandchild,
// or descendant of any of those.
const CTC_QUALIFYING_RELATIONSHIPS = new Set<DependentRelationship>([
  DependentRelationship.Son,
  DependentRelationship.Daughter,
  DependentRelationship.StepChild,
  DependentRelationship.FosterChild,
  DependentRelationship.Sibling,
  DependentRelationship.StepSibling,
  DependentRelationship.HalfSibling,
  DependentRelationship.Grandchild,
  DependentRelationship.ChildSibling, // niece/nephew = child of sibling
]);

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Age at December 31, 2025 (tax year end).
// Returns integer age in completed years.
function ageAtYearEnd(dob: string): number {
  const birth = new Date(dob);
  const yearDiff = TAX_YEAR_END.getFullYear() - birth.getFullYear();
  const birthdayThisYear = new Date(
    TAX_YEAR_END.getFullYear(),
    birth.getMonth(),
    birth.getDate(),
  );
  // Subtract 1 if birthday hasn't occurred yet by year-end
  return TAX_YEAR_END < birthdayThisYear ? yearDiff - 1 : yearDiff;
}

// For federal tax purposes, a person reaches age 65 on the day before their
// 65th birthday. For TY2025, this matches the Schedule 1-A instruction to use
// a birth date before January 2, 1961.
function isAge65ByEndOfTaxYear(
  dob: string | undefined,
  taxYear: number,
): boolean | undefined {
  if (dob === undefined) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (match === null) return undefined;
  const birthDate = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  const cutoff = Date.UTC(taxYear - 64, 0, 2);
  return birthDate < cutoff;
}

// For TY2025, CTC requires an employment-valid SSN issued before the return
// due date. An ITIN or ATIN cannot satisfy that test.
function passesSSNTest(dep: DependentItem): boolean {
  return Boolean(dep.ssn) && !dep.itin && !dep.atin &&
    dep.ssn_valid_for_employment === true &&
    dep.ssn_issued_before_due_date === true &&
    dep.tin_issued_by_due_date === true;
}

// IRS CTC age test: under 17 at end of tax year. Disability can extend
// qualifying-child status for ODC, but not the CTC age limit.
function passesAgeTest(dep: DependentItem): boolean {
  return ageAtYearEnd(dep.dob) < 17;
}

// IRS CTC residency test: lived with taxpayer MORE than 6 months.
function passesResidencyTest(dep: DependentItem): boolean {
  return dep.months_in_home > 6;
}

function passesJointReturnTest(dep: DependentItem): boolean {
  return dep.filed_joint_return_except_refund_only === false;
}

function passesQualifyingChildSupportTest(dep: DependentItem): boolean {
  return dep.provided_over_half_own_support === false;
}

// IRS CTC relationship test: qualifying child relationship only.
function passesRelationshipTest(dep: DependentItem): boolean {
  return CTC_QUALIFYING_RELATIONSHIPS.has(dep.relationship);
}

// Determine whether a dependent qualifies for the Child Tax Credit.
// A true override can account for a special residency exception; it cannot
// waive the SSN, age, or relationship requirements.
function isQualifyingChildForCTC(dep: DependentItem): boolean {
  if (dep.qualifying_child_for_ctc === false) return false;
  return (
    passesSSNTest(dep) &&
    passesAgeTest(dep) &&
    passesRelationshipTest(dep) &&
    passesJointReturnTest(dep) &&
    passesQualifyingChildSupportTest(dep) &&
    (passesResidencyTest(dep) || dep.qualifying_child_for_ctc === true)
  );
}

// ODC requires a dependent TIN issued by the return due date.
function hasTin(dep: DependentItem): boolean {
  return (Boolean(dep.ssn) || Boolean(dep.itin) || Boolean(dep.atin)) &&
    dep.tin_issued_by_due_date === true;
}

// IRS ODC qualifying-child test: passes relationship, residency, AND the broader
// qualifying-child age test (under 19, full-time student under 24, or disabled).
// This matches the EITC age test — broader than CTC (< 17) but narrower than hasTin alone.
// IRC §152(c): a qualifying child who is too old for CTC but under 19 (or student < 24)
// still qualifies as a "qualifying child" and therefore qualifies for ODC.
function isQualifyingChildForODC(dep: DependentItem): boolean {
  return (
    passesResidencyTest(dep) &&
    passesRelationshipTest(dep) &&
    passesEitcAgeTest(dep) &&
    passesJointReturnTest(dep) &&
    passesQualifyingChildSupportTest(dep)
  );
}

// The ordinary qualifying-relative path requires confirmed support and gross
// income facts. Exceptional cases such as multiple-support agreements need
// separate facts and cannot be inferred from an unanswered question.
function isQualifyingRelativeForODC(dep: DependentItem): boolean {
  if (!hasTin(dep)) return false;
  if (!passesJointReturnTest(dep)) return false;
  // Family relationships listed in Pub. 501 do not require co-residency.
  // "Other" represents an unrelated household member. Family relationships
  // such as grandparents and in-laws have their own input values.
  if (
    dep.relationship === DependentRelationship.Other &&
    dep.months_in_home !== 12
  ) {
    return false;
  }
  if (dep.taxpayer_provided_over_half_support !== true) return false;
  // The 2025 gross-income limit is $5,200. Zero is a valid explicit answer.
  return dep.gross_income !== undefined && dep.gross_income < 5200;
}

export function dependentCreditCategory(
  dep: DependentItem,
  filer: FilerCreditEligibility,
): DependentCreditCategory {
  if (
    dep.us_citizen_national_or_resident !== true ||
    dep.provided_over_half_own_support === true
  ) {
    return DependentCreditCategory.None;
  }
  if (filer.ctc && isQualifyingChildForCTC(dep)) {
    return DependentCreditCategory.ChildTaxCredit;
  }
  if (
    filer.odc && (
      (isQualifyingChildForODC(dep) && hasTin(dep)) ||
      isQualifyingRelativeForODC(dep)
    )
  ) {
    return DependentCreditCategory.OtherDependentCredit;
  }
  return DependentCreditCategory.None;
}

// Count dependents in each category, excluding those claimed on another return.
function dependentCounts(
  deps: DependentItem[],
  filer: FilerCreditEligibility,
): {
  qualifying_child_tax_credit_count: number;
  other_dependent_count: number;
  dependent_count: number;
} {
  const claimable = deps.filter((d) => d.dependent_on_another_return !== true);
  let ctcCount = 0;
  let odcCount = 0;
  for (const dep of claimable) {
    const category = dependentCreditCategory(dep, filer);
    if (category === DependentCreditCategory.ChildTaxCredit) {
      ctcCount += 1;
    } else if (category === DependentCreditCategory.OtherDependentCredit) {
      odcCount += 1;
    }
  }
  return {
    qualifying_child_tax_credit_count: ctcCount,
    other_dependent_count: odcCount,
    dependent_count: claimable.length,
  };
}

// EITC age test: under 19 at year-end, OR full-time student under 24, OR permanently disabled.
// IRC §32(c)(3)(A); broader than CTC age test (< 17).
function passesEitcAgeTest(dep: DependentItem): boolean {
  if (dep.disabled === true) return true;
  const age = ageAtYearEnd(dep.dob);
  if (age < 19) return true;
  if (dep.full_time_student === true && age < 24) return true;
  return false;
}

// EITC uses its own child test: qualifying age and relationship, U.S. residency,
// SSN, and no disqualifying joint return. It does not use the dependency support
// test, and a noncustodial parent's CTC release does not confer EITC eligibility.
function isEitcQualifyingChild(
  dep: DependentItem,
): dep is DependentItem & { ssn: string } {
  return (
    passesResidencyTest(dep) &&
    dep.lived_in_us_over_half_year === true &&
    dep.ssn !== undefined && dep.ssn.length > 0 &&
    dep.ssn_valid_for_employment === true &&
    dep.tin_issued_by_due_date === true &&
    passesJointReturnTest(dep) &&
    passesRelationshipTest(dep) &&
    passesEitcAgeTest(dep)
  );
}

function eitcQualifyingChildren(
  deps: DependentItem[],
): Array<DependentItem & { ssn: string }> {
  return deps.filter((dep) => dep.dependent_on_another_return !== true)
    .filter(isEitcQualifyingChild);
}

// Optional field helper — adds key/value to obj only if value is not undefined.
function addIfDefined(
  obj: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (value !== undefined) {
    obj[key] = value;
  }
}

// Build the f1040 input object with only defined (non-undefined) fields.
// Always includes at least filing_status.
function buildF1040Input(input: GeneralInput): Record<string, unknown> {
  const deps = input.dependents ?? [];
  const filer = filerCreditEligibility(input);
  const counts = dependentCounts(deps, filer);

  const fields: Record<string, unknown> = {
    filing_status: input.filing_status,
    dependent_count: counts.dependent_count,
    qualifying_child_tax_credit_count: counts.qualifying_child_tax_credit_count,
    other_dependent_count: counts.other_dependent_count,
  };
  addIfDefined(
    fields,
    "spouse_has_business_credit",
    input.spouse_has_business_credit,
  );
  if (counts.dependent_count > 0) {
    fields.dependent_details = deps
      .filter((dep) => dep.dependent_on_another_return !== true)
      .map((dep) => ({
        ...dep,
        credit_category: dependentCreditCategory(dep, filer),
      }));
  }

  // Taxpayer personal info pass-throughs
  addIfDefined(fields, "taxpayer_first_name", input.taxpayer_first_name);
  addIfDefined(
    fields,
    "taxpayer_middle_initial",
    input.taxpayer_middle_initial,
  );
  addIfDefined(fields, "taxpayer_last_name", input.taxpayer_last_name);
  addIfDefined(fields, "taxpayer_ssn", input.taxpayer_ssn);
  addIfDefined(
    fields,
    "taxpayer_ssn_valid_for_employment",
    input.taxpayer_ssn_valid_for_employment,
  );
  addIfDefined(
    fields,
    "taxpayer_ssn_issued_before_due_date",
    input.taxpayer_ssn_issued_before_due_date,
  );
  addIfDefined(
    fields,
    "taxpayer_tin_issued_by_due_date",
    input.taxpayer_tin_issued_by_due_date,
  );
  addIfDefined(fields, "taxpayer_dob", input.taxpayer_dob);
  addIfDefined(fields, "taxpayer_blind", input.taxpayer_blind);
  addIfDefined(
    fields,
    "taxpayer_age_65_or_older",
    input.taxpayer_age_65_or_older,
  );
  addIfDefined(fields, "taxpayer_occupation", input.taxpayer_occupation);
  addIfDefined(fields, "taxpayer_deceased", input.taxpayer_deceased);
  addIfDefined(fields, "taxpayer_death_date", input.taxpayer_death_date);
  addIfDefined(fields, "taxpayer_ip_pin", input.taxpayer_ip_pin);

  // Spouse info pass-throughs
  addIfDefined(fields, "spouse_first_name", input.spouse_first_name);
  addIfDefined(fields, "spouse_last_name", input.spouse_last_name);
  addIfDefined(fields, "spouse_ssn", input.spouse_ssn);
  addIfDefined(
    fields,
    "spouse_ssn_valid_for_employment",
    input.spouse_ssn_valid_for_employment,
  );
  addIfDefined(
    fields,
    "spouse_ssn_issued_before_due_date",
    input.spouse_ssn_issued_before_due_date,
  );
  addIfDefined(
    fields,
    "spouse_tin_issued_by_due_date",
    input.spouse_tin_issued_by_due_date,
  );
  addIfDefined(fields, "spouse_dob", input.spouse_dob);
  addIfDefined(fields, "spouse_blind", input.spouse_blind);
  addIfDefined(fields, "spouse_age_65_or_older", input.spouse_age_65_or_older);
  addIfDefined(fields, "spouse_occupation", input.spouse_occupation);
  addIfDefined(fields, "spouse_deceased", input.spouse_deceased);
  addIfDefined(fields, "spouse_death_date", input.spouse_death_date);
  addIfDefined(fields, "spouse_ip_pin", input.spouse_ip_pin);

  // Address pass-throughs
  addIfDefined(fields, "address_line1", input.address_line1);
  addIfDefined(fields, "address_line2", input.address_line2);
  addIfDefined(fields, "address_city", input.address_city);
  addIfDefined(fields, "address_state", input.address_state);
  addIfDefined(fields, "address_zip", input.address_zip);
  addIfDefined(
    fields,
    "address_foreign_country",
    input.address_foreign_country,
  );
  addIfDefined(
    fields,
    "address_foreign_province_state",
    input.address_foreign_province_state,
  );
  addIfDefined(
    fields,
    "address_foreign_postal_code",
    input.address_foreign_postal_code,
  );

  // 1040 top-of-form fields
  addIfDefined(fields, "digital_assets", input.digital_assets);
  addIfDefined(
    fields,
    "presidential_campaign_fund_taxpayer",
    input.presidential_campaign_fund_taxpayer,
  );
  addIfDefined(
    fields,
    "presidential_campaign_fund_spouse",
    input.presidential_campaign_fund_spouse,
  );

  // Filing/return metadata
  addIfDefined(fields, "extension_filed", input.extension_filed);
  addIfDefined(fields, "mfs_spouse_itemizing", input.mfs_spouse_itemizing);
  addIfDefined(
    fields,
    "mfs_spouse_lived_with_taxpayer",
    input.mfs_spouse_lived_with_taxpayer,
  );
  addIfDefined(
    fields,
    "taxpayer_can_be_claimed_as_dependent",
    input.taxpayer_can_be_claimed_as_dependent,
  );
  addIfDefined(
    fields,
    "hoh_paid_more_than_half_home_costs",
    input.hoh_paid_more_than_half_home_costs,
  );
  addIfDefined(fields, "qss_spouse_death_year", input.qss_spouse_death_year);

  // Signature PINs
  addIfDefined(fields, "taxpayer_signature_pin", input.taxpayer_signature_pin);
  addIfDefined(
    fields,
    "taxpayer_signature_date",
    input.taxpayer_signature_date,
  );
  addIfDefined(fields, "spouse_signature_pin", input.spouse_signature_pin);
  addIfDefined(fields, "spouse_signature_date", input.spouse_signature_date);

  // Refund direct deposit
  addIfDefined(fields, "bank_routing_number", input.bank_routing_number);
  addIfDefined(fields, "bank_account_number", input.bank_account_number);
  addIfDefined(fields, "bank_account_type", input.bank_account_type);

  return fields;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class GeneralNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "general";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    standard_deduction,
    eitc,
    f8812,
    agi_aggregator,
    form4137,
    form8919,
    form8959,
    form8880,
    form8960,
    form8962,
    form8995,
    form8582,
    form461,
    scheduleA,
    schedule1a,
  ]);

  compute(ctx: NodeContext, input: GeneralInput): NodeResult {
    const parsed = inputSchema.parse(input);
    if (
      parsed.taxpayer_can_be_claimed_as_dependent === true &&
      parsed.dependent_earned_income === undefined
    ) {
      throw new Error(
        "Dependent standard deduction needs earned income from the return sources",
      );
    }
    if (
      parsed.taxpayer_can_be_claimed_as_dependent !== true &&
      parsed.dependent_earned_income !== undefined
    ) {
      throw new Error(
        "Dependent earned income requires the can-be-claimed-as-dependent answer",
      );
    }
    const taxpayerAge65 = parsed.taxpayer_age_65_or_older ??
      isAge65ByEndOfTaxYear(parsed.taxpayer_dob, ctx.taxYear);
    const spouseAge65 = parsed.spouse_age_65_or_older ??
      isAge65ByEndOfTaxYear(parsed.spouse_dob, ctx.taxYear);
    const effectiveInput: GeneralInput = {
      ...parsed,
      ...(taxpayerAge65 !== undefined &&
        { taxpayer_age_65_or_older: taxpayerAge65 }),
      ...(spouseAge65 !== undefined && { spouse_age_65_or_older: spouseAge65 }),
    };
    const f1040Input = buildF1040Input(effectiveInput);

    const sdInput: Record<string, unknown> = {
      filing_status: parsed.filing_status,
    };
    if (taxpayerAge65 !== undefined) {
      sdInput["taxpayer_age_65_or_older"] = taxpayerAge65;
    }
    if (parsed.taxpayer_blind !== undefined) {
      sdInput["taxpayer_blind"] = parsed.taxpayer_blind;
    }
    if (spouseAge65 !== undefined) {
      sdInput["spouse_age_65_or_older"] = spouseAge65;
    }
    if (parsed.spouse_blind !== undefined) {
      sdInput["spouse_blind"] = parsed.spouse_blind;
    }
    if (parsed.mfs_spouse_itemizing !== undefined) {
      sdInput["mfs_spouse_itemizing"] = parsed.mfs_spouse_itemizing;
    }
    if (parsed.taxpayer_can_be_claimed_as_dependent === true) {
      sdInput["taxpayer_can_be_claimed_as_dependent"] = true;
      sdInput["dependent_earned_income"] = parsed.dependent_earned_income;
    }

    const deps = parsed.dependents ?? [];
    const claimedDeps = deps.filter((dep) =>
      dep.dependent_on_another_return !== true
    );
    const dependentIncomeComplete = claimedDeps.every((dep) =>
      dep.ptc_tax_return !== undefined
    );
    const dependentsModifiedAgi = ptcDependentsModifiedAgi(claimedDeps);
    const eitcChildren = eitcQualifyingChildren(deps);
    const filer = filerCreditEligibility(parsed);
    const counts = dependentCounts(deps, filer);

    const outputs: NodeOutput[] = [
      this.outputNodes.output(
        f1040,
        f1040Input as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>,
      ),
      this.outputNodes.output(
        standard_deduction,
        sdInput as AtLeastOne<
          z.infer<typeof standard_deduction["inputSchema"]>
        >,
      ),
      this.outputNodes.output(eitc, {
        filing_status: parsed.filing_status,
        filer_has_valid_ssns: filer.eitc,
        qualifying_children: Math.min(eitcChildren.length, 3),
        qualifying_child_details: eitcChildren.slice(0, 3).map((dep) => ({
          first_name: dep.first_name,
          last_name: dep.last_name,
          name_control: dep.name_control,
          ssn: dep.ssn,
          ssn_valid_for_employment: dep.ssn_valid_for_employment,
          tin_issued_by_due_date: dep.tin_issued_by_due_date,
          dob: dep.dob,
          irs_relationship_code: dep.irs_relationship_code,
          months_in_home: dep.months_in_home,
          full_time_student: dep.full_time_student,
          disabled: dep.disabled,
          ip_pin: dep.ip_pin,
        })),
      }),
      // Pass filing_status to agi_aggregator for SSA taxability worksheet thresholds
      this.outputNodes.output(agi_aggregator, {
        filing_status: parsed.filing_status,
        ...(parsed.mfs_spouse_lived_with_taxpayer !== undefined && {
          mfs_lived_with_spouse: parsed.mfs_spouse_lived_with_taxpayer,
        }),
      }),
      // Pass filing_status to form8959 so Additional Medicare Tax threshold is known
      this.outputNodes.output(form8959, {
        filing_status: parsed.filing_status,
        ...(parsed.taxpayer_ssn && { taxpayer_ssn: parsed.taxpayer_ssn }),
        ...(parsed.spouse_ssn && { spouse_ssn: parsed.spouse_ssn }),
      }),
      this.outputNodes.output(form8880, {
        filing_status: parsed.filing_status,
        ...(parsed.taxpayer_ssn && { taxpayer_ssn: parsed.taxpayer_ssn }),
        ...(parsed.spouse_ssn && { spouse_ssn: parsed.spouse_ssn }),
        ...(parsed.taxpayer_dob && { taxpayer_dob: parsed.taxpayer_dob }),
        ...(parsed.spouse_dob && { spouse_dob: parsed.spouse_dob }),
        ...(parsed.taxpayer_form8880_student_five_months !== undefined && {
          taxpayer_student_five_months:
            parsed.taxpayer_form8880_student_five_months,
        }),
        ...(parsed.spouse_form8880_student_five_months !== undefined && {
          spouse_student_five_months:
            parsed.spouse_form8880_student_five_months,
        }),
        ...(parsed.taxpayer_form8880_claimed_as_dependent !== undefined && {
          taxpayer_claimed_as_dependent:
            parsed.taxpayer_form8880_claimed_as_dependent,
        }),
        ...(parsed.spouse_form8880_claimed_as_dependent !== undefined && {
          spouse_claimed_as_dependent:
            parsed.spouse_form8880_claimed_as_dependent,
        }),
        ...(parsed.form8880_joint_distribution_review && {
          joint_distribution_review: parsed.form8880_joint_distribution_review,
        }),
      }),
      // Pass filing_status to form8960 so NIIT MAGI threshold is known
      this.outputNodes.output(form8960, {
        filing_status: parsed.filing_status,
      }),
      this.outputNodes.output(form8962, {
        filing_status: parsed.filing_status,
        below_100_fpl_status: parsed.ptc_below_100_fpl_status,
        mfs_ptc_status: parsed.ptc_mfs_status,
        household_size: 1 +
          (parsed.filing_status === FilingStatus.MFJ ? 1 : 0) +
          claimedDeps.length,
        dependents_modified_agi: dependentsModifiedAgi,
        form8814_expected_ssns: claimedDeps
          .filter((dep) => dep.ptc_tax_return?.filing === "form8814")
          .map((dep) => dep.ssn?.replaceAll("-", "") ?? ""),
        dependent_income_complete: dependentIncomeComplete,
        fpl_region: parsed.ptc_residence_states_2025?.includes("AK") ||
            parsed.ptc_residence_months_2025?.includes("AK") ||
            parsed.address_state === "AK"
          ? "alaska"
          : parsed.ptc_residence_states_2025?.includes("HI") ||
              parsed.ptc_residence_months_2025?.includes("HI") ||
              parsed.address_state === "HI"
          ? "hawaii"
          : "contiguous",
      }),
      // MFS special allowance requires proof the spouses lived apart all year.
      this.outputNodes.output(form8582, {
        filing_status: parsed.filing_status,
        ...(parsed.filing_status === "mfs" &&
            parsed.mfs_spouse_lived_with_taxpayer !== undefined
          ? {
            mfs_lived_apart_all_year:
              parsed.mfs_spouse_lived_with_taxpayer === false,
          }
          : {}),
      }),
      this.outputNodes.output(form461, {
        filing_status: parsed.filing_status,
        scope_review: parsed.form461_scope_review,
      }),
      // Pass filing_status to schedule_a for OBBBA SALT phase-out threshold
      this.outputNodes.output(scheduleA, {
        filing_status: parsed.filing_status,
      }),
      this.outputNodes.output(schedule1a, {
        filing_status: parsed.filing_status,
        taxpayer_ssn: parsed.taxpayer_ssn,
        spouse_ssn: parsed.spouse_ssn,
        taxpayer_has_valid_ssn: filer.taxpayerValidSsn,
        spouse_has_valid_ssn: filer.spouseValidSsn,
        ...(taxpayerAge65 !== undefined &&
          { taxpayer_age_65_or_older: taxpayerAge65 }),
        ...(spouseAge65 !== undefined &&
          { spouse_age_65_or_older: spouseAge65 }),
      }),
      // Pass filing_status and age/blindness flags to form8995 so the income limit uses
      // the same standard deduction amount as the standard_deduction worksheet.
      this.outputNodes.output(form8995, {
        filing_status: parsed.filing_status,
        ...(parsed.taxpayer_ssn !== undefined && {
          taxpayer_ssn: parsed.taxpayer_ssn,
        }),
        ...(parsed.qbi_no_prior_loss_or_suspended_loss_confirmed === true && {
          qbi_no_prior_loss_or_suspended_loss_confirmed: true,
        }),
        ...(parsed.qbi_not_patron_of_specified_cooperative_confirmed ===
            true && {
          qbi_not_patron_of_specified_cooperative_confirmed: true,
        }),
        ...(parsed.taxpayer_age_65_or_older !== undefined &&
          { taxpayer_age_65_or_older: parsed.taxpayer_age_65_or_older }),
        ...(parsed.taxpayer_blind !== undefined &&
          { taxpayer_blind: parsed.taxpayer_blind }),
        ...(parsed.spouse_age_65_or_older !== undefined &&
          { spouse_age_65_or_older: parsed.spouse_age_65_or_older }),
        ...(parsed.spouse_blind !== undefined &&
          { spouse_blind: parsed.spouse_blind }),
      } as AtLeastOne<z.infer<typeof form8995["inputSchema"]>>),
    ];

    if (parsed.taxpayer_ssn !== undefined) {
      outputs.push(this.outputNodes.output(form4137, {
        taxpayer_ssn: parsed.taxpayer_ssn,
        ...(parsed.spouse_ssn !== undefined && {
          spouse_ssn: parsed.spouse_ssn,
        }),
      }));
      outputs.push(this.outputNodes.output(form8919, {
        taxpayer_ssn: parsed.taxpayer_ssn,
        ...(parsed.spouse_ssn !== undefined && {
          spouse_ssn: parsed.spouse_ssn,
        }),
      }));
    } else if (parsed.spouse_ssn !== undefined) {
      outputs.push(this.outputNodes.output(form4137, {
        spouse_ssn: parsed.spouse_ssn,
      }));
      outputs.push(this.outputNodes.output(form8919, {
        spouse_ssn: parsed.spouse_ssn,
      }));
    }

    // Send zero counts too, so an explicit Schedule 8812 cannot claim children
    // who are absent from the Form 1040 dependent rows.
    outputs.push(this.outputNodes.output(f8812, {
      auto_qualifying_children: counts.qualifying_child_tax_credit_count,
      auto_other_dependents: counts.other_dependent_count,
      auto_filing_status: parsed.filing_status,
    }));

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const general = new GeneralNode();
