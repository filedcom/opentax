import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { standard_deduction } from "../../intermediate/standard_deduction/index.ts";
import { FilingStatus } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

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
  Parent = "parent",
  StepParent = "stepparent",
  SiblingParent = "sibling_parent", // aunt / uncle
  ChildSibling = "child_sibling",   // niece / nephew
  Other = "other",
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const dependentSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  middle_initial: z.string().max(1).optional(),
  ssn: z.string().optional(),
  itin: z.string().optional(),
  atin: z.string().optional(),                    // Adoption TIN — disqualifies CTC
  dob: z.string(),                                 // ISO date YYYY-MM-DD
  relationship: z.nativeEnum(DependentRelationship),
  months_in_home: z.number().int().min(0).max(12),
  qualifying_child_for_ctc: z.boolean().optional(),
  disabled: z.boolean().optional(),
  full_time_student: z.boolean().optional(),       // Under 24 full-time student = qualifying child
  gross_income: z.number().nonnegative().optional(), // For qualifying relative test
  taxpayer_provided_over_half_support: z.boolean().optional(),
  dependent_on_another_return: z.boolean().optional(), // Disqualifies dependent entirely
  child_care_months: z.number().int().min(0).max(12).optional(), // For Form 2441
  education_credit_eligible: z.boolean().optional(), // For Form 8863
  ip_pin: z.string().length(6).optional(),         // Dependent's IP PIN
});

export const inputSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  // Taxpayer identity
  taxpayer_first_name: z.string().optional(),
  taxpayer_last_name: z.string().optional(),
  taxpayer_middle_initial: z.string().max(1).optional(),
  taxpayer_suffix: z.string().optional(),
  taxpayer_ssn: z.string().optional(),
  taxpayer_dob: z.string().optional(),
  taxpayer_blind: z.boolean().optional(),
  taxpayer_age_65_or_older: z.boolean().optional(),
  taxpayer_occupation: z.string().optional(),
  taxpayer_daytime_phone: z.string().optional(),
  taxpayer_email: z.string().optional(),
  taxpayer_deceased: z.boolean().optional(),
  taxpayer_death_date: z.string().optional(),       // ISO date YYYY-MM-DD
  taxpayer_ip_pin: z.string().length(6).optional(), // 6-digit IP PIN from IRS
  taxpayer_prior_year_agi: z.number().optional(),
  // Spouse identity (MFJ / MFS)
  spouse_first_name: z.string().optional(),
  spouse_last_name: z.string().optional(),
  spouse_middle_initial: z.string().max(1).optional(),
  spouse_suffix: z.string().optional(),
  spouse_ssn: z.string().optional(),
  spouse_dob: z.string().optional(),
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
  address_line2: z.string().optional(),             // Apt/unit number
  address_in_care_of: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  address_foreign_country: z.string().optional(),
  address_foreign_province_state: z.string().optional(),
  address_foreign_postal_code: z.string().optional(),
  // 1040 top-of-form fields
  digital_assets: z.boolean().optional(),           // Line 1: digital assets question
  presidential_campaign_fund_taxpayer: z.boolean().optional(),
  presidential_campaign_fund_spouse: z.boolean().optional(),
  // Filing/return metadata
  extension_filed: z.boolean().optional(),
  taxpayer_signature_pin: z.string().length(5).optional(),
  spouse_signature_pin: z.string().length(5).optional(),
  // MFS-specific
  mfs_spouse_itemizing: z.boolean().optional(),     // MFS: spouse is itemizing
  mfs_spouse_lived_with_taxpayer: z.boolean().optional(),
  // HOH-specific
  hoh_qualifying_person_name: z.string().optional(),
  hoh_qualifying_person_relationship: z.string().optional(),
  hoh_paid_more_than_half_home_costs: z.boolean().optional(),
  // QSS-specific
  qss_spouse_death_year: z.number().int().optional(),
  qss_qualifying_child_ssn: z.string().optional(),
  // Dependents
  dependents: z.array(dependentSchema).optional(),
});

// ─── Type aliases ─────────────────────────────────────────────────────────────

type GeneralInput = z.infer<typeof inputSchema>;
type DependentItem = z.infer<typeof dependentSchema>;

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

// IRS CTC SSN test: must have SSN (ITIN or ATIN disqualifies CTC).
function passesSSNTest(dep: DependentItem): boolean {
  return Boolean(dep.ssn) && !dep.itin && !dep.atin;
}

// IRS CTC age test: under 17 at end of tax year, OR permanently/totally disabled.
// Full-time student extends qualifying child status for ODC but NOT for CTC.
function passesAgeTest(dep: DependentItem): boolean {
  if (dep.disabled === true) return true;
  return ageAtYearEnd(dep.dob) < 17;
}

// IRS CTC residency test: lived with taxpayer MORE than 6 months.
function passesResidencyTest(dep: DependentItem): boolean {
  return dep.months_in_home > 6;
}

// IRS CTC relationship test: qualifying child relationship only.
function passesRelationshipTest(dep: DependentItem): boolean {
  return CTC_QUALIFYING_RELATIONSHIPS.has(dep.relationship);
}

// Determine whether a dependent qualifies for the Child Tax Credit.
// If the qualifying_child_for_ctc override is set, it takes full precedence.
// Otherwise apply all four IRS tests.
function isQualifyingChildForCTC(dep: DependentItem): boolean {
  if (dep.qualifying_child_for_ctc !== undefined) {
    return dep.qualifying_child_for_ctc;
  }
  return (
    passesSSNTest(dep) &&
    passesAgeTest(dep) &&
    passesResidencyTest(dep) &&
    passesRelationshipTest(dep)
  );
}

// Count dependents in each category, excluding those claimed on another return.
function dependentCounts(deps: DependentItem[]): {
  qualifying_child_tax_credit_count: number;
  other_dependent_count: number;
  dependent_count: number;
} {
  const claimable = deps.filter((d) => d.dependent_on_another_return !== true);
  let ctcCount = 0;
  let odcCount = 0;
  for (const dep of claimable) {
    if (isQualifyingChildForCTC(dep)) {
      ctcCount += 1;
    } else {
      odcCount += 1;
    }
  }
  return {
    qualifying_child_tax_credit_count: ctcCount,
    other_dependent_count: odcCount,
    dependent_count: claimable.length,
  };
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
  const counts = dependentCounts(deps);

  const fields: Record<string, unknown> = {
    filing_status: input.filing_status,
    dependent_count: counts.dependent_count,
    qualifying_child_tax_credit_count: counts.qualifying_child_tax_credit_count,
    other_dependent_count: counts.other_dependent_count,
  };

  // Taxpayer personal info pass-throughs
  addIfDefined(fields, "taxpayer_first_name", input.taxpayer_first_name);
  addIfDefined(fields, "taxpayer_last_name", input.taxpayer_last_name);
  addIfDefined(fields, "taxpayer_ssn", input.taxpayer_ssn);
  addIfDefined(fields, "taxpayer_dob", input.taxpayer_dob);
  addIfDefined(fields, "taxpayer_blind", input.taxpayer_blind);
  addIfDefined(fields, "taxpayer_age_65_or_older", input.taxpayer_age_65_or_older);
  addIfDefined(fields, "taxpayer_occupation", input.taxpayer_occupation);
  addIfDefined(fields, "taxpayer_deceased", input.taxpayer_deceased);
  addIfDefined(fields, "taxpayer_death_date", input.taxpayer_death_date);
  addIfDefined(fields, "taxpayer_ip_pin", input.taxpayer_ip_pin);

  // Spouse info pass-throughs
  addIfDefined(fields, "spouse_first_name", input.spouse_first_name);
  addIfDefined(fields, "spouse_last_name", input.spouse_last_name);
  addIfDefined(fields, "spouse_ssn", input.spouse_ssn);
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
  addIfDefined(fields, "address_foreign_country", input.address_foreign_country);
  addIfDefined(fields, "address_foreign_province_state", input.address_foreign_province_state);
  addIfDefined(fields, "address_foreign_postal_code", input.address_foreign_postal_code);

  // 1040 top-of-form fields
  addIfDefined(fields, "digital_assets", input.digital_assets);
  addIfDefined(fields, "presidential_campaign_fund_taxpayer", input.presidential_campaign_fund_taxpayer);
  addIfDefined(fields, "presidential_campaign_fund_spouse", input.presidential_campaign_fund_spouse);

  // Filing/return metadata
  addIfDefined(fields, "extension_filed", input.extension_filed);
  addIfDefined(fields, "mfs_spouse_itemizing", input.mfs_spouse_itemizing);
  addIfDefined(fields, "hoh_paid_more_than_half_home_costs", input.hoh_paid_more_than_half_home_costs);
  addIfDefined(fields, "qss_spouse_death_year", input.qss_spouse_death_year);

  return fields;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class GeneralNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "general";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, standard_deduction]);

  compute(_ctx: NodeContext, input: GeneralInput): NodeResult {
    const parsed = inputSchema.parse(input);
    const f1040Input = buildF1040Input(parsed);

    const sdInput: Record<string, unknown> = {
      filing_status: parsed.filing_status,
    };
    if (parsed.taxpayer_age_65_or_older !== undefined) sdInput["taxpayer_age_65_or_older"] = parsed.taxpayer_age_65_or_older;
    if (parsed.taxpayer_blind !== undefined) sdInput["taxpayer_blind"] = parsed.taxpayer_blind;
    if (parsed.spouse_age_65_or_older !== undefined) sdInput["spouse_age_65_or_older"] = parsed.spouse_age_65_or_older;
    if (parsed.spouse_blind !== undefined) sdInput["spouse_blind"] = parsed.spouse_blind;
    if (parsed.mfs_spouse_itemizing !== undefined) sdInput["mfs_spouse_itemizing"] = parsed.mfs_spouse_itemizing;

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, f1040Input as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>),
      this.outputNodes.output(standard_deduction, sdInput as AtLeastOne<z.infer<typeof standard_deduction["inputSchema"]>>),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const general = new GeneralNode();
