import { isDeepStrictEqual } from "node:util";
import { assertEmployerPostyearOwnerSources } from "./form8889_employer_postyear_source.ts";
import {
  CoverageType,
  form8889,
  inputSchema,
} from "../../../../nodes/intermediate/forms/form8889/index.ts";
import { TS } from "../../../../nodes/types.ts";
import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";

/** HSA excess income cannot survive deletion of its supporting owner copy. */
export function assertHsaExcessRequiredCopy(
  pending: Readonly<Record<string, unknown>>,
): void {
  const s1 = pending.schedule1 as Record<string, unknown> | undefined;
  const hsa = pending.form8889 as Record<string, unknown> | undefined;
  if (
    (Number(s1?.line8z_hsa_excess_employer ?? 0) > 0 ||
      Number(s1?.line8z_hsa_excess_earnings ?? 0) > 0 ||
      hsa?.retained_employer_postyear_evidence !== undefined) &&
    (!Array.isArray(hsa?.forms) || hsa.forms.length === 0)
  ) {
    throw new Error(
      "HSA excess income requires its source-reconciled beneficiary Form 8889",
    );
  }
}

/** Source replay for a sole HSA beneficiary's timely 2026 excess payment. */
export function reconcileSolePostyearForm8889(
  forms: readonly Readonly<Record<string, unknown>>[],
  pending: Readonly<Record<string, unknown>> | undefined,
  filer: FilerIdentity | undefined,
): void {
  const { forms: _printed, ...sourceFields } =
    (pending?.form8889 ?? {}) as Record<string, unknown>;
  const source = inputSchema.parse(sourceFields);
  const withdrawal = source.employer_excess_treatment?.timely_withdrawal;
  const filed = forms[0];
  const spouseOwner = source.beneficiary_identity.owner === TS.S;
  const ssn = spouseOwner ? filer?.spouse?.ssn : filer?.primarySSN;
  const name = spouseOwner
    ? [
      filer?.spouse?.firstName,
      filer?.spouse?.middleInitial,
      filer?.spouse?.lastName,
    ].filter(Boolean).join(" ")
    : filer?.fullName;
  if (
    !filer || !filed || forms.length !== 1 || !ssn || !name ||
    (spouseOwner && filer.filingStatus !== FilingStatus.MarriedFilingJointly) ||
    filed.owner !== (spouseOwner ? "spouse" : "primary") ||
    filed.beneficiary_ssn !== ssn.replace(/\D/g, "") ||
    filed.beneficiary_name !== name ||
    source.beneficiary_identity.ssn.replace(/\D/g, "") !==
      filed.beneficiary_ssn ||
    source.beneficiary_identity.name !== name ||
    source.spouse_hsa !== undefined ||
    source.spouse_has_separate_hsa !== false ||
    source.eligible_hdhp_coverage_by_month?.length !== 12 ||
    source.eligible_hdhp_coverage_by_month?.some((m) =>
      m !== CoverageType.SelfOnly
    ) ||
    source.age_55_or_older !== false ||
    source.last_month_rule_elected !== false ||
    source.medicare_enrollment !== undefined ||
    source.other_disqualifying_coverage !== undefined ||
    source.employer_hsa_contributions !== undefined ||
    source.employer_contribution_years?.made_in_2025_for_2024_in_w2 !== 0 ||
    source.employer_contribution_years?.made_in_2026_for_2025 !== 0 ||
    (source.taxpayer_hsa_contributions ?? 0) !== 0 ||
    source.qualified_hsa_funding_distributions !== undefined ||
    source.hsa_excluded_distributions !== undefined ||
    source.post_year_personal_excess_withdrawal !== undefined ||
    source.prior_year_hsa_excess !== undefined ||
    source.testing_period_failure !== undefined ||
    source.form1099_sa_distributions !== undefined ||
    (source.hsa_distributions ?? 0) !== 0 ||
    source.qualified_medical_expenses !== undefined ||
    (source.archer_msa_distributions ?? 0) !== 0 ||
    source.retained_employer_return_evidence !== undefined ||
    source.retained_employer_code2_evidence !== undefined ||
    source.employer_excess_treatment?.amount_included_in_w2_box1 !== 0 ||
    !withdrawal || withdrawal.withdrawal_tax_year !== 2026
  ) {
    throw new Error(
      "Sole postyear HSA payment requires one actual identified owner and sourced full-year self-only coverage",
    );
  }
  const outputs =
    form8889.compute({ taxYear: 2025, formType: "f1040" }, source).outputs;
  const expected = outputs.find((r) => r.nodeType === "form8889")?.fields.forms;
  if (
    !isDeepStrictEqual(expected, forms) ||
    outputs.some((r) => r.nodeType === "form5329")
  ) {
    throw new Error(
      "Sole postyear HSA printed copy/excise differs from source replay",
    );
  }
  const wages = assertEmployerPostyearOwnerSources(
    source,
    pending,
    filed,
    withdrawal,
  );
  const s1 = pending?.schedule1 as Record<string, unknown> | undefined;
  const s2 = pending?.schedule2 as Record<string, unknown> | undefined;
  const f = pending?.f1040 as Record<string, unknown> | undefined;
  const expectedS1 = outputs.filter((r) => r.nodeType === "schedule1");
  if (
    !s1 || !f ||
    expectedS1.some((r) =>
      Object.entries(r.fields).some(([k, v]) => (s1[k] ?? 0) !== v)
    ) ||
    s1.line8z_hsa_excess_employer !== withdrawal.principal ||
    (s1.line8z_hsa_excess_earnings ?? 0) !== 0 ||
    (s1.line13_hsa_deduction ?? 0) !== 0 ||
    (s2?.line17c_hsa_penalty ?? 0) !== 0 ||
    (s2?.line17d_hsa_eligibility_tax ?? 0) !== 0 ||
    (s2?.line8_form5329_tax ?? 0) !== 0 || pending?.form5329 !== undefined ||
    f.line1a_wages !== wages ||
    f.line8_additional_income !== s1.line10_total_additional_income ||
    f.line10_adjustments !== s1.line26_total_adjustments
  ) {
    throw new Error(
      "Sole postyear HSA payment differs from Schedule 1/2 and Form 1040",
    );
  }
}
