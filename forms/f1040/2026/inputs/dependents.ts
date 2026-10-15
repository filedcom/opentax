import { z } from "zod";
import {
  DependentCreditCategory,
  dependentSchema,
  type DependentYearRules,
} from "../../nodes/inputs/general/filing/general/index.ts";
import {
  residency2026Schema,
  reviewedResidence2026,
  validDate2026,
} from "./dependent-residency.ts";

const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
export const dependent2026Schema = dependentSchema.omit({
  eic_birth_residency_review: true,
  eic_dated_residency_review: true,
  eic_death_residency_review: true,
  ptc_tax_return: true,
  custodial_eitc_release_review: true,
  qualifying_child_for_ctc: true,
}).extend({
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().min(1),
  ssn: tin.optional(),
  itin: tin.optional(),
  atin: tin.optional(),
  dob: z.string().date(),
  death_date: z.string().date().optional(),
  claim_as_dependent: z.boolean().default(true),
  student_full_time_months: z.number().int().min(0).max(12).optional(),
  gross_income: z.number().finite().nonnegative().optional(),
  residency_2026_review: residency2026Schema.optional(),
  // Source-backed Form 8332 handling and PTC household reviews need their own
  // 2026 nodes; an unreviewed CTC override cannot bypass the residency test.
}).strict();
export const dependentFiling2026Schema = dependent2026Schema.extend({
  credit_category: z.nativeEnum(DependentCreditCategory),
});
export type Dependent2026 = z.infer<typeof dependent2026Schema>;

export function dependentRules2026(
  taxpayerDob: string,
  spouseDob?: string,
): DependentYearRules {
  const ownerBirths = [
    validDate2026(taxpayerDob, "Taxpayer birth date"),
    ...(spouseDob ? [validDate2026(spouseDob, "Spouse birth date")] : []),
  ];
  return {
    taxYear: 2026,
    // Rev. Proc. 2025-32 §4.23.
    qualifyingRelativeGrossIncomeLimit: 5_300,
    qualifyingChildAgeAllowed(dep) {
      return dep.disabled === true ||
        ownerBirths.some((birth) =>
          validDate2026(dep.dob, "Dependent birth date") > birth
        );
    },
    livedWithFilerOverHalfYear(dep) {
      return reviewedResidence2026(dep as Dependent2026)?.overHalfWithFiler ??
        dep.months_in_home > 6;
    },
    assertEicResidence(dep, qualifyingIdentity, otherwiseQualified) {
      const child = dep as Dependent2026;
      const reviewed = reviewedResidence2026(child);
      if (
        qualifyingIdentity &&
        (dep.dob.startsWith("2026-") || child.death_date) &&
        dep.months_in_home <= 6 && !reviewed
      ) {
        throw new Error(
          "2026 birth/death EIC eligibility needs reviewed lifetime residence",
        );
      }
      if (
        otherwiseQualified &&
        (dep.months_lived_with_you_in_us === undefined ||
          (!reviewed && dep.months_lived_with_you_in_us <= 6) ||
          (reviewed && !reviewed.overHalfInUs))
      ) {
        throw new Error(
          "EIC child needs more than half-year U.S. home evidence and matching actual months",
        );
      }
    },
  };
}

export function validateDependents2026(
  children: Dependent2026[],
  ownerTins: readonly string[],
) {
  const seen = new Set(ownerTins.map((tin) => tin.replaceAll("-", "")));
  for (const child of children) {
    reviewedResidence2026(child);
    if (
      child.full_time_student === true &&
      (child.student_full_time_months ?? 0) < 5
    ) {
      throw new Error(
        "Full-time student status needs at least five months of attendance",
      );
    }
    if (
      child.claim_as_dependent && child.dependent_on_another_return !== true
    ) {
      for (
        const key of [
          "us_citizen_national_or_resident",
          "provided_over_half_own_support",
          "filed_joint_return_except_refund_only",
          "tin_issued_by_due_date",
        ] as const
      ) {
        if (child[key] === undefined) {
          throw new Error(`Claimed dependent needs an explicit ${key} answer`);
        }
      }
      if (
        child.ssn &&
        (child.ssn_valid_for_employment === undefined ||
          child.ssn_issued_before_due_date === undefined)
      ) {
        throw new Error(
          "Dependent SSN needs employment-validity and issuance answers",
        );
      }
    }
    const tins = [child.ssn, child.itin, child.atin].filter((
      value,
    ): value is string => value !== undefined);
    if (tins.length !== 1) {
      throw new Error("Dependent needs exactly one SSN, ITIN or ATIN");
    }
    const value = tins[0].replaceAll("-", "");
    if (seen.has(value)) {
      throw new Error(
        "Dependent TIN must be distinct from filers and other dependents",
      );
    }
    seen.add(value);
  }
}
