import { z } from "zod";
import type { FilerIdentity } from "../mef/header.ts";
import { TS } from "../nodes/types.ts";
import {
  CoverageType,
  form8889,
  inputSchema,
} from "../nodes/intermediate/forms/form8889/index.ts";

/** Recompute the one-owner code-2 excess return before native or PDF export. */
export function reconcileCode2Form8889(
  forms: readonly Readonly<Record<string, unknown>>[],
  allPending: Readonly<Record<string, unknown>> | undefined,
  filer: FilerIdentity | undefined,
): void {
  const pending8889 = allPending?.form8889;
  if (
    !pending8889 || typeof pending8889 !== "object" ||
    Array.isArray(pending8889)
  ) return;
  const { forms: _printed, ...sourceFields } = pending8889 as Record<
    string,
    unknown
  >;
  const rawExcluded = sourceFields.hsa_excluded_distributions;
  const rawTimely = rawExcluded && typeof rawExcluded === "object" &&
    !Array.isArray(rawExcluded) &&
    "timely_excess_withdrawal" in rawExcluded;
  const rawCode2 = Array.isArray(sourceFields.form1099_sa_distributions) &&
    sourceFields.form1099_sa_distributions.some((row) =>
      row && typeof row === "object" &&
      row.box3_distribution_code === "2"
    );
  if (!rawTimely && !rawCode2) return;
  const source = inputSchema.parse(sourceFields);
  const timely = source.hsa_excluded_distributions?.timely_excess_withdrawal;
  const code2 = source.form1099_sa_distributions?.some((row) =>
    row.box3_distribution_code === "2"
  );
  if (!timely && !code2) return;
  const filed = forms[0];
  if (
    forms.length !== 1 || !filed || filed.owner !== "primary" ||
    source.spouse_hsa !== undefined ||
    source.beneficiary_identity.owner !== TS.T ||
    source.beneficiary_identity.ssn.replaceAll("-", "") !==
      filed.beneficiary_ssn ||
    source.beneficiary_identity.name !== filed.beneficiary_name ||
    source.beneficiary_identity.ssn.replaceAll("-", "") !==
      filer?.primarySSN.replaceAll("-", "")
  ) {
    throw new Error(
      "Form 8889 code-2 route needs one matching primary HSA owner",
    );
  }
  const outputs = form8889.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const computed = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as readonly Record<string, unknown>[] | undefined;
  const expected = computed?.[0];
  if (
    computed?.length !== 1 || !expected ||
    Object.keys(expected).sort().join("|") !==
      Object.keys(filed).sort().join("|") ||
    Object.keys(expected).some((key) => expected[key] !== filed[key])
  ) {
    throw new Error(
      "Form 8889 code-2 printed lines differ from source calculation",
    );
  }
  const schedule1 = z.object({
    line13_hsa_deduction: z.number().optional(),
    line8f_hsa_income: z.number().optional(),
    line8z_hsa_excess_earnings: z.number().optional(),
    line10_total_additional_income: z.number(),
    line26_total_adjustments: z.number(),
  }).passthrough().parse(allPending?.schedule1);
  const schedule2 = z.object({
    line17c_hsa_penalty: z.number().optional(),
    line17d_hsa_eligibility_tax: z.number().optional(),
  }).passthrough().parse(allPending?.schedule2 ?? {});
  const return1040 = z.object({
    line8_additional_income: z.number().optional(),
    line10_adjustments: z.number(),
  }).passthrough().parse(allPending?.f1040);
  if (
    (schedule1.line13_hsa_deduction ?? 0) !==
      (filed.print_line13_deduction ?? 0) ||
    (schedule1.line8f_hsa_income ?? 0) !==
      (filed.print_line16_taxable ?? 0) ||
    schedule1.line8z_hsa_excess_earnings !==
      timely?.included_earnings ||
    (schedule2.line17c_hsa_penalty ?? 0) !== 0 ||
    (schedule2.line17d_hsa_eligibility_tax ?? 0) !== 0 ||
    schedule1.line10_total_additional_income !==
      (return1040.line8_additional_income ?? 0) ||
    schedule1.line26_total_adjustments !== return1040.line10_adjustments
  ) {
    throw new Error(
      "Form 8889 code-2 amounts differ from Schedule 1, Schedule 2, or Form 1040",
    );
  }
}

/** Recalculate the one-spouse HSA and reconcile its filed return amounts. */
export function reconcileSpouseOnlyForm8889(
  forms: readonly Readonly<Record<string, unknown>>[],
  allPending: Readonly<Record<string, unknown>> | undefined,
  filer: FilerIdentity | undefined,
): void {
  if (forms.length !== 1 || forms[0]?.owner !== "spouse") return;
  const spouse = filer?.spouse;
  const filed = forms[0];
  if (
    !spouse || filed.beneficiary_ssn !== spouse.ssn.replaceAll("-", "") ||
    typeof filed.beneficiary_name !== "string" ||
    filed.beneficiary_name.trim().toUpperCase() !==
      `${spouse.firstName} ${spouse.lastName}`.toUpperCase()
  ) {
    throw new Error(
      "Form 8889 spouse-only beneficiary differs from filer identity",
    );
  }
  const pending8889 = allPending?.form8889;
  if (!pending8889 || typeof pending8889 !== "object") {
    throw new Error(
      "Form 8889 spouse-only filing needs its owner-attributed source",
    );
  }
  const { forms: _computedForms, ...sourceFields } = pending8889 as Record<
    string,
    unknown
  >;
  const source = inputSchema.parse(sourceFields);
  if (
    source.spouse_hsa !== undefined ||
    source.beneficiary_identity.owner !== TS.S ||
    source.beneficiary_identity.ssn.replaceAll("-", "") !==
      filed.beneficiary_ssn ||
    source.beneficiary_identity.name !== filed.beneficiary_name
  ) {
    throw new Error("Form 8889 spouse-only source owner or identity differs");
  }
  const outputs = form8889.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const computed = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as readonly Record<string, unknown>[] | undefined;
  const expected = computed?.[0];
  if (
    computed?.length !== 1 || !expected ||
    Object.keys(expected).sort().join("|") !==
      Object.keys(filed).sort().join("|") ||
    Object.keys(expected).some((key) => expected[key] !== filed[key])
  ) {
    throw new Error(
      "Form 8889 spouse-only printed lines differ from source calculation",
    );
  }
  const schedule1 = z.object({
    line13_hsa_deduction: z.number().optional(),
    line8f_hsa_income: z.number().optional(),
    line26_total_adjustments: z.number(),
  }).passthrough().parse(allPending?.schedule1);
  const schedule2 = z.object({
    line17c_hsa_penalty: z.number().optional(),
    line17d_hsa_eligibility_tax: z.number().optional(),
  }).passthrough().parse(allPending?.schedule2 ?? {});
  const form1040 = z.object({
    line10_adjustments: z.number(),
  }).passthrough().parse(allPending?.f1040);
  const line = (key: string): number => {
    const value = filed[key];
    if (value === undefined) return 0;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Form 8889 spouse-only ${key} must be numeric`);
    }
    return value;
  };
  if (
    (schedule1.line13_hsa_deduction ?? 0) !==
      line("print_line13_deduction") ||
    (schedule1.line8f_hsa_income ?? 0) !==
      line("print_line16_taxable") + line("print_line20") ||
    (schedule2.line17c_hsa_penalty ?? 0) !==
      line("print_line17b_penalty") ||
    (schedule2.line17d_hsa_eligibility_tax ?? 0) !==
      line("print_line21") ||
    schedule1.line26_total_adjustments !== form1040.line10_adjustments
  ) {
    throw new Error(
      "Form 8889 spouse-only amounts differ from Schedule 1, Schedule 2, or Form 1040",
    );
  }
  const expectedExcess = outputs.find((row) => row.nodeType === "form5329")
    ?.fields.owner_entries;
  if (expectedExcess !== undefined || allPending?.form5329 !== undefined) {
    const entries = z.object({
      owner_entries: z.array(
        z.object({
          owner: z.nativeEnum(TS),
          hsa_part_vii: z.unknown().optional(),
        }).passthrough(),
      ),
    }).passthrough().parse(allPending?.form5329).owner_entries;
    const spouseExcess = entries.filter((entry) =>
      entry.owner === TS.S && entry.hsa_part_vii !== undefined
    );
    if (JSON.stringify(spouseExcess) !== JSON.stringify(expectedExcess ?? [])) {
      throw new Error(
        "Form 8889 spouse-only excess differs from owner Form 5329",
      );
    }
  }
}

/** Recompute bounded two-HSA coverage and owner-specific prior-year recapture. */
export function reconcilePairedForm8889(
  forms: readonly Readonly<Record<string, unknown>>[],
  allPending: Readonly<Record<string, unknown>> | undefined,
  filer: FilerIdentity | undefined,
): void {
  if (forms.length !== 2) return;
  const primaryForm = forms[0];
  const spouseForm = forms[1];
  const spouse = filer?.spouse;
  if (
    !filer || !spouse || !primaryForm || !spouseForm ||
    primaryForm.owner !== "primary" || spouseForm.owner !== "spouse" ||
    primaryForm.beneficiary_ssn !== filer.primarySSN.replaceAll("-", "") ||
    spouseForm.beneficiary_ssn !== spouse.ssn.replaceAll("-", "") ||
    (filer.fullName !== undefined &&
      primaryForm.beneficiary_name !== filer.fullName) ||
    spouseForm.beneficiary_name !==
      `${spouse.firstName} ${spouse.lastName}`
  ) {
    throw new Error(
      "Form 8889 paired owners differ from filer identity",
    );
  }
  const pending8889 = allPending?.form8889;
  if (!pending8889 || typeof pending8889 !== "object") {
    throw new Error(
      "Form 8889 paired filing needs both owner sources",
    );
  }
  const { forms: _computedForms, ...sourceFields } = pending8889 as Record<
    string,
    unknown
  >;
  const source = inputSchema.parse(sourceFields);
  if (
    !source.spouse_hsa ||
    source.beneficiary_identity.owner !== TS.T ||
    source.spouse_hsa.beneficiary_identity.owner !== TS.S ||
    source.beneficiary_identity.ssn.replaceAll("-", "") !==
      primaryForm.beneficiary_ssn ||
    source.spouse_hsa.beneficiary_identity.ssn.replaceAll("-", "") !==
      spouseForm.beneficiary_ssn ||
    source.beneficiary_identity.name !== primaryForm.beneficiary_name ||
    source.spouse_hsa.beneficiary_identity.name !== spouseForm.beneficiary_name
  ) {
    throw new Error("Form 8889 paired owner sources differ");
  }
  const fullYearCoverage = (value: unknown, coverage: string): boolean =>
    Array.isArray(value) && value.length === 12 &&
    value.every((month) => month === coverage);
  const selfOnly = [source, source.spouse_hsa].every((owner) =>
    owner.eligible_hdhp_coverage_by_month?.length === 12 &&
    owner.eligible_hdhp_coverage_by_month.includes(CoverageType.SelfOnly) &&
    owner.eligible_hdhp_coverage_by_month.every((month) =>
      month === "self_only" || month === null
    ) &&
    owner.married_at_year_end === true &&
    owner.spouse_has_separate_hsa === true &&
    owner.last_month_rule_elected === false &&
    owner.medicare_enrollment === undefined &&
    (owner.archer_msa_distributions ?? 0) === 0 &&
    owner.allocated_family_limit === undefined &&
    owner.family_allocation_source_reference === undefined
  );
  const family =
    [source, source.spouse_hsa].every((owner) =>
      fullYearCoverage(owner.eligible_hdhp_coverage_by_month, "family") &&
      owner.allocated_family_limit !== undefined &&
      owner.family_allocation_source_reference !== undefined
    ) && source.family_allocation_source_reference ===
      source.spouse_hsa.family_allocation_source_reference &&
    (source.allocated_family_limit ?? 0) +
          (source.spouse_hsa.allocated_family_limit ?? 0) === 8_550;
  const primaryCoverage = source.eligible_hdhp_coverage_by_month;
  const spouseCoverage = source.spouse_hsa.eligible_hdhp_coverage_by_month;
  const bothEligibleAllYear = primaryCoverage?.length === 12 &&
    spouseCoverage?.length === 12 &&
    [primaryCoverage, spouseCoverage].every((coverage) =>
      coverage?.every((month) => month === "family" || month === "self_only")
    );
  const deemedFamilyMonths = bothEligibleAllYear
    ? primaryCoverage!.filter((month, index) =>
      month === "family" || spouseCoverage![index] === "family"
    ).length
    : 0;
  const deemed = deemedFamilyMonths > 0 && bothEligibleAllYear &&
    [source, source.spouse_hsa].every((owner) =>
      owner.married_at_year_end === true &&
      owner.spouse_has_separate_hsa === true &&
      owner.last_month_rule_elected === false &&
      (owner.archer_msa_distributions ?? 0) === 0 &&
      owner.allocated_family_limit !== undefined &&
      owner.family_allocation_source_reference !== undefined
    ) &&
    source.family_allocation_source_reference ===
      source.spouse_hsa.family_allocation_source_reference &&
    (source.allocated_family_limit ?? 0) +
          (source.spouse_hsa.allocated_family_limit ?? 0) ===
      Math.round(8_550 * deemedFamilyMonths / 12);
  const owners = [source, source.spouse_hsa];
  const medicareOwner = owners.find((owner) => owner.medicare_enrollment);
  const continuingOwner = owners.find((owner) => owner !== medicareOwner);
  const firstIneligible = medicareOwner?.medicare_enrollment
    ?.first_ineligible_month;
  const medicareMixedMonths = firstIneligible !== undefined &&
    owners.filter((owner) => owner.medicare_enrollment).length === 1 &&
    medicareOwner?.eligible_hdhp_coverage_by_month?.every((month, index) =>
        index < firstIneligible - 1 ? month === "family" : month === null
      ) === true &&
    fullYearCoverage(
      continuingOwner?.eligible_hdhp_coverage_by_month,
      "family",
    ) &&
    owners.every((owner) =>
      owner.married_at_year_end === true &&
      owner.spouse_has_separate_hsa === true &&
      owner.last_month_rule_elected === false &&
      owner.allocated_family_limit !== undefined &&
      !!owner.family_allocation_source_reference &&
      (owner.archer_msa_distributions ?? 0) === 0
    ) &&
    source.family_allocation_source_reference ===
      source.spouse_hsa.family_allocation_source_reference &&
    (source.allocated_family_limit ?? 0) +
          (source.spouse_hsa.allocated_family_limit ?? 0) ===
      Math.round(8_550 * (firstIneligible - 1) / 12);
  const otherCoverageOwner = owners.find((owner) =>
    owner.other_disqualifying_coverage
  );
  const otherCoverageContinuingOwner = owners.find((owner) =>
    owner !== otherCoverageOwner
  );
  const otherCoverageMonth = otherCoverageOwner
    ?.other_disqualifying_coverage?.first_ineligible_month;
  const otherCoverageMixedMonths = otherCoverageMonth !== undefined &&
    owners.filter((owner) => owner.other_disqualifying_coverage).length === 1 &&
    owners.every((owner) => owner.medicare_enrollment === undefined) &&
    otherCoverageOwner?.eligible_hdhp_coverage_by_month?.every(
        (month, index) =>
          index < otherCoverageMonth - 1 ? month === "family" : month === null,
      ) === true &&
    fullYearCoverage(
      otherCoverageContinuingOwner?.eligible_hdhp_coverage_by_month,
      "family",
    ) &&
    owners.every((owner) =>
      owner.married_at_year_end === true &&
      owner.spouse_has_separate_hsa === true &&
      owner.last_month_rule_elected === false &&
      owner.allocated_family_limit !== undefined &&
      !!owner.family_allocation_source_reference &&
      (owner.archer_msa_distributions ?? 0) === 0 &&
      owner.testing_period_failure === undefined
    ) &&
    source.family_allocation_source_reference ===
      source.spouse_hsa.family_allocation_source_reference &&
    (source.allocated_family_limit ?? 0) +
          (source.spouse_hsa.allocated_family_limit ?? 0) ===
      Math.round(8_550 * (otherCoverageMonth - 1) / 12);
  const pairedPriorRecapture =
    source.prior_year_paired_family_allocation !== undefined;
  if (
    !selfOnly && !family && !deemed && !medicareMixedMonths &&
    !otherCoverageMixedMonths &&
    !pairedPriorRecapture
  ) {
    throw new Error(
      "Form 8889 paired export needs sourced self-only, family, one-spouse ineligibility, or prior-year recapture facts",
    );
  }
  const normalizedOwnerSsns = owners.map((owner) =>
    owner.beneficiary_identity.ssn.replaceAll("-", "")
  );
  const employerOnly = source.w2_code_w_entries?.length === 2 &&
    normalizedOwnerSsns.every((ssn) =>
      source.w2_code_w_entries?.filter((entry) =>
        entry.employee_ssn.replaceAll("-", "") === ssn && entry.amount > 0
      ).length === 1
    ) &&
    owners.every((owner) =>
      (owner.taxpayer_hsa_contributions ?? 0) === 0 &&
      owner.employer_hsa_contributions === undefined &&
      owner.employer_contribution_years?.made_in_2025_for_2024_in_w2 === 0 &&
      owner.employer_contribution_years?.made_in_2026_for_2025 === 0 &&
      (owner.hsa_distributions ?? 0) === 0 &&
      owner.qualified_hsa_funding_distributions === undefined &&
      owner.prior_year_hsa_excess === undefined &&
      owner.testing_period_failure === undefined &&
      owner.employer_excess_treatment === undefined &&
      owner.post_year_personal_excess_withdrawal === undefined &&
      owner.hsa_excluded_distributions === undefined &&
      (owner.archer_msa_distributions ?? 0) === 0 &&
      owner.qualified_medical_expenses === undefined &&
      owner.exception_qualified_taxable_amount === undefined
    );
  const distributionReferences = owners.flatMap((owner) =>
    owner.form1099_sa_distributions?.map((item) => item.source_reference) ?? []
  );
  const expenseReferences = owners.flatMap((owner) =>
    owner.qualified_medical_expense_evidence?.map((item) =>
      item.source_reference
    ) ?? []
  );
  const datedDistributionReferences = owners.flatMap((owner) => [
    ...(owner.age_65_exception_evidence?.distributions.map((item) =>
      item.source_reference
    ) ?? []),
    ...(owner.disability_exception_evidence?.distributions.map((item) =>
      item.source_reference
    ) ?? []),
  ]);
  if (
    new Set(distributionReferences).size !== distributionReferences.length ||
    new Set(expenseReferences).size !== expenseReferences.length ||
    new Set(datedDistributionReferences).size !==
      datedDistributionReferences.length
  ) {
    throw new Error(
      "Form 8889 paired owners cannot reuse a Form 1099-SA, qualified medical expense, or dated distribution reference",
    );
  }
  if (
    !employerOnly &&
    (source.w2_code_w_entries?.length ||
      owners.some((owner) =>
        !owner || (owner.taxpayer_hsa_contributions ?? 0) <= 0 ||
        (owner.employer_hsa_contributions ?? 0) > 0 ||
        (owner.employer_contribution_years?.made_in_2025_for_2024_in_w2 ?? 0) >
          0 ||
        (owner.employer_contribution_years?.made_in_2026_for_2025 ?? 0) > 0 ||
        ((owner.hsa_distributions ?? 0) > 0 &&
          !owner.form1099_sa_distributions?.length) ||
        ((owner.qualified_medical_expenses ?? 0) > 0 &&
          !owner.qualified_medical_expense_evidence?.length) ||
        owner.qualified_hsa_funding_distributions !== undefined ||
        owner.prior_year_hsa_excess !== undefined ||
        (owner.testing_period_failure !== undefined && !pairedPriorRecapture) ||
        owner.employer_excess_treatment !== undefined ||
        owner.post_year_personal_excess_withdrawal !== undefined ||
        owner.hsa_excluded_distributions !== undefined
      ))
  ) {
    throw new Error(
      "Form 8889 paired PDF/MeF route needs sourced normal distributions and qualified expenses without other HSA events",
    );
  }
  const outputs = form8889.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const computed = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as readonly Record<string, unknown>[] | undefined;
  if (
    computed?.length !== 2 ||
    computed.some((expected, index) => {
      const filed = forms[index];
      return !filed ||
        Object.keys(expected).sort().join("|") !==
          Object.keys(filed).sort().join("|") ||
        Object.keys(expected).some((key) => expected[key] !== filed[key]);
    })
  ) {
    throw new Error(
      "Form 8889 paired printed lines differ from owner source calculation",
    );
  }
  const expectedExcess = outputs.filter((row) => row.nodeType === "form5329")
    .flatMap((row) => row.fields.owner_entries as readonly unknown[]);
  if (expectedExcess.length > 0) {
    throw new Error(
      "Form 8889 paired excess needs owner Form 5329 export reconciliation",
    );
  }
  const schedule1 = z.object({
    line13_hsa_deduction: z.number().optional(),
    line8f_hsa_income: z.number().optional(),
    line8z_hsa_excess_earnings: z.number().optional(),
    line8z_hsa_excess_employer: z.number().optional(),
    line26_total_adjustments: z.number().optional(),
  }).passthrough().parse(allPending?.schedule1 ?? {});
  const schedule2 = z.object({
    line17c_hsa_penalty: z.number().optional(),
    line17d_hsa_eligibility_tax: z.number().optional(),
  }).passthrough().parse(allPending?.schedule2 ?? {});
  const form1040 = z.object({
    line10_adjustments: z.number().optional(),
  }).passthrough().parse(allPending?.f1040);
  const sum = (key: string): number =>
    forms.reduce((total, form) => {
      const value = form[key];
      return total + (typeof value === "number" ? value : 0);
    }, 0);
  if (
    (schedule1.line13_hsa_deduction ?? 0) !== sum("print_line13_deduction") ||
    (schedule1.line8f_hsa_income ?? 0) !==
      sum("print_line16_taxable") + sum("print_line20") ||
    (schedule1.line8z_hsa_excess_earnings ?? 0) !== 0 ||
    (schedule1.line8z_hsa_excess_employer ?? 0) !== 0 ||
    (schedule1.line26_total_adjustments ?? 0) !==
      (form1040.line10_adjustments ?? 0) ||
    (schedule2.line17c_hsa_penalty ?? 0) !== sum("print_line17b_penalty") ||
    (schedule2.line17d_hsa_eligibility_tax ?? 0) !== sum("print_line21")
  ) {
    throw new Error(
      "Form 8889 paired owner totals differ from the filed return",
    );
  }
}
