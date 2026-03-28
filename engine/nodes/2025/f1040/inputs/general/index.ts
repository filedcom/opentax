import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { FilingStatus } from "../../types.ts";

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

const dependentSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  ssn: z.string().optional(),
  itin: z.string().optional(),
  dob: z.string(), // ISO date YYYY-MM-DD
  relationship: z.nativeEnum(DependentRelationship),
  months_in_home: z.number().int().min(0).max(12),
  qualifying_child_for_ctc: z.boolean().optional(),
  disabled: z.boolean().optional(),
});

export const inputSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  // Taxpayer identity
  taxpayer_first_name: z.string().optional(),
  taxpayer_last_name: z.string().optional(),
  taxpayer_ssn: z.string().optional(),
  taxpayer_dob: z.string().optional(),
  taxpayer_blind: z.boolean().optional(),
  taxpayer_age_65_or_older: z.boolean().optional(),
  // Spouse identity (MFJ / MFS)
  spouse_first_name: z.string().optional(),
  spouse_last_name: z.string().optional(),
  spouse_ssn: z.string().optional(),
  spouse_dob: z.string().optional(),
  spouse_blind: z.boolean().optional(),
  spouse_age_65_or_older: z.boolean().optional(),
  // Mailing address
  address_line1: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
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

// IRS CTC age test: under 17 at end of tax year, OR permanently/totally disabled.
function passesAgeTest(dep: DependentItem): boolean {
  if (dep.disabled === true) return true;
  return ageAtYearEnd(dep.dob) < 17;
}

// IRS CTC residency test: lived with taxpayer MORE than 6 months.
function passesResidencyTest(dep: DependentItem): boolean {
  return dep.months_in_home > 6;
}

// IRS CTC SSN test: must have SSN (ITIN disqualifies CTC).
function passesSSNTest(dep: DependentItem): boolean {
  return Boolean(dep.ssn) && !dep.itin;
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

// Count dependents in each category.
function dependentCounts(deps: DependentItem[]): {
  qualifying_child_tax_credit_count: number;
  other_dependent_count: number;
  dependent_count: number;
} {
  let ctcCount = 0;
  let odcCount = 0;
  for (const dep of deps) {
    if (isQualifyingChildForCTC(dep)) {
      ctcCount += 1;
    } else {
      odcCount += 1;
    }
  }
  return {
    qualifying_child_tax_credit_count: ctcCount,
    other_dependent_count: odcCount,
    dependent_count: deps.length,
  };
}

// Build the f1040 input object with only defined (non-undefined) fields.
function buildF1040Input(input: GeneralInput): Record<string, unknown> {
  const deps = input.dependents ?? [];
  const counts = dependentCounts(deps);

  const fields: Record<string, unknown> = {
    filing_status: input.filing_status,
    dependent_count: counts.dependent_count,
    qualifying_child_tax_credit_count: counts.qualifying_child_tax_credit_count,
    other_dependent_count: counts.other_dependent_count,
  };

  // Personal info pass-throughs — only include if present
  if (input.taxpayer_first_name !== undefined) fields.taxpayer_first_name = input.taxpayer_first_name;
  if (input.taxpayer_last_name !== undefined) fields.taxpayer_last_name = input.taxpayer_last_name;
  if (input.taxpayer_ssn !== undefined) fields.taxpayer_ssn = input.taxpayer_ssn;
  if (input.taxpayer_dob !== undefined) fields.taxpayer_dob = input.taxpayer_dob;
  if (input.taxpayer_blind !== undefined) fields.taxpayer_blind = input.taxpayer_blind;
  if (input.taxpayer_age_65_or_older !== undefined) fields.taxpayer_age_65_or_older = input.taxpayer_age_65_or_older;

  // Spouse info pass-throughs
  if (input.spouse_first_name !== undefined) fields.spouse_first_name = input.spouse_first_name;
  if (input.spouse_last_name !== undefined) fields.spouse_last_name = input.spouse_last_name;
  if (input.spouse_ssn !== undefined) fields.spouse_ssn = input.spouse_ssn;
  if (input.spouse_dob !== undefined) fields.spouse_dob = input.spouse_dob;
  if (input.spouse_blind !== undefined) fields.spouse_blind = input.spouse_blind;
  if (input.spouse_age_65_or_older !== undefined) fields.spouse_age_65_or_older = input.spouse_age_65_or_older;

  // Address pass-throughs
  if (input.address_line1 !== undefined) fields.address_line1 = input.address_line1;
  if (input.address_city !== undefined) fields.address_city = input.address_city;
  if (input.address_state !== undefined) fields.address_state = input.address_state;
  if (input.address_zip !== undefined) fields.address_zip = input.address_zip;

  return fields;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class GeneralNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "general";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(input: GeneralInput): NodeResult {
    const parsed = inputSchema.parse(input);
    const f1040Input = buildF1040Input(parsed);

    const outputs: NodeOutput[] = [
      { nodeType: f1040.nodeType, input: f1040Input },
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const general = new GeneralNode();
