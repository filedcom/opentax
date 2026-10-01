import type { FilerIdentity } from "../mef/header.ts";
import { FilingStatus } from "../mef/header.ts";
import {
  form8889,
  inputSchema,
} from "../nodes/intermediate/forms/form8889/index.ts";

/** Recompute one primary owner's personal contribution and partly medical HSA distribution. */
export function reconcilePrimaryMixedMedicalForm8889(
  forms: readonly Readonly<Record<string, unknown>>[],
  allPending: Readonly<Record<string, unknown>> | undefined,
  filer: FilerIdentity | undefined,
): void {
  const filed = forms[0];
  const pending = allPending?.form8889;
  const raw = pending && typeof pending === "object" && !Array.isArray(pending)
    ? pending as Record<string, unknown>
    : undefined;
  const source = raw
    ? inputSchema.safeParse(Object.fromEntries(
      Object.entries(raw).filter(([key]) => key !== "forms"),
    ))
    : undefined;
  const sourceMixed = source?.success === true &&
    (source.data.taxpayer_hsa_contributions ?? 0) > 0 &&
    (source.data.qualified_medical_expenses ?? 0) > 0 &&
    (source.data.hsa_distributions ?? 0) >
      (source.data.qualified_medical_expenses ?? 0);
  if (forms.length !== 1 || !filed || filed.owner !== "primary") {
    if (sourceMixed) {
      throw new Error(
        "Form 8889 mixed medical distribution needs one matching primary-owner form",
      );
    }
    return;
  }
  const positivePrint = (key: string) => {
    const value = filed[key];
    return typeof value === "number" && value > 0;
  };
  const printedMixed = positivePrint("print_line13_deduction") &&
    positivePrint("print_line15_qualified") &&
    positivePrint("print_line16_taxable") &&
    filed.print_line17a_exception !== true &&
    [
      "print_line4_archer",
      "print_line9_employer",
      "print_line10",
      "print_line14b_excluded_distributions",
      "print_line18",
      "print_line19",
      "print_line20",
      "print_line21",
    ].every((key) => !positivePrint(key));
  if (!sourceMixed && !printedMixed) return;
  if (!source?.success) {
    throw new Error("Form 8889 mixed medical distribution needs owner source");
  }
  const item = source.data;
  const [distribution] = item.form1099_sa_distributions ?? [];
  const [medical] = item.qualified_medical_expense_evidence ?? [];
  const coverage = item.eligible_hdhp_coverage_by_month;
  if (
    !filer || filer.filingStatus !== FilingStatus.Single ||
    item.beneficiary_identity.owner !== "T" ||
    item.beneficiary_identity.ssn.replaceAll("-", "") !==
      filer.primarySSN.replaceAll("-", "") ||
    item.beneficiary_identity.name !== filer.fullName ||
    filed.beneficiary_ssn !== filer.primarySSN.replaceAll("-", "") ||
    filed.beneficiary_name !== filer.fullName ||
    !coverage || coverage.some((month) => month !== "self_only") ||
    item.age_55_or_older === true || item.last_month_rule_elected === true ||
    item.spouse_hsa !== undefined || item.medicare_enrollment !== undefined ||
    item.other_disqualifying_coverage !== undefined ||
    (item.taxpayer_hsa_contributions ?? 0) <= 0 ||
    item.employer_hsa_contributions !== undefined ||
    item.employer_contribution_years !== undefined ||
    item.employer_excess_treatment !== undefined ||
    item.prior_year_hsa_excess !== undefined ||
    item.post_year_personal_excess_withdrawal !== undefined ||
    item.qualified_hsa_funding_distributions !== undefined ||
    item.hsa_excluded_distributions !== undefined ||
    item.testing_period_failure !== undefined ||
    (item.archer_msa_distributions ?? 0) !== 0 ||
    item.age_65_exception_evidence !== undefined ||
    item.disability_exception_evidence !== undefined ||
    item.exception_qualified_taxable_amount !== 0 ||
    item.form1099_sa_distributions?.length !== 1 ||
    !distribution || distribution.box3_distribution_code !== "1" ||
    distribution.box1_gross_distribution !== item.hsa_distributions ||
    item.qualified_medical_expense_evidence?.length !== 1 ||
    !medical || medical.amount !== item.qualified_medical_expenses ||
    (item.hsa_distributions ?? 0) <= medical.amount
  ) {
    throw new Error(
      "Form 8889 mixed medical distribution needs one sourced self-only primary HSA and reviewed expense",
    );
  }
  const outputs = form8889.compute(
    { taxYear: 2025, formType: "f1040" },
    item,
  ).outputs;
  const expected = (outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as readonly Record<string, unknown>[] | undefined)?.[0];
  if (
    !expected ||
    Object.keys(expected).sort().join("|") !==
      Object.keys(filed).sort().join("|") ||
    Object.keys(expected).some((key) => expected[key] !== filed[key])
  ) {
    throw new Error(
      "Form 8889 mixed medical printed lines differ from owner calculation",
    );
  }
  const schedule1 = allPending?.schedule1 as
    | Record<string, unknown>
    | undefined;
  const schedule2 = allPending?.schedule2 as
    | Record<string, unknown>
    | undefined;
  const return1040 = allPending?.f1040 as Record<string, unknown> | undefined;
  const deduction = expected.print_line13_deduction;
  const taxable = expected.print_line16_taxable;
  const penalty = expected.print_line17b_penalty;
  if (
    typeof deduction !== "number" || typeof taxable !== "number" ||
    typeof penalty !== "number" ||
    schedule1?.line13_hsa_deduction !== deduction ||
    schedule1?.line8f_hsa_income !== taxable ||
    schedule1?.line10_total_additional_income !== taxable ||
    schedule1?.line26_total_adjustments !== deduction ||
    schedule2?.line17c_hsa_penalty !== penalty ||
    return1040?.line8_additional_income !== taxable ||
    return1040?.line10_adjustments !== deduction ||
    return1040?.line23_other_taxes !== penalty
  ) {
    throw new Error(
      "Form 8889 mixed medical distribution differs from Schedule 1, Schedule 2, or Form 1040",
    );
  }
}
