import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

interface MonthlyRow {
  month_code: string;
  premium?: number;
  slcsp?: number;
  contribution?: number;
  max_assistance?: number;
  allowed_credit?: number;
  aptc: number;
}

interface SharedPolicyAllocation {
  basis:
    | "mfs_exception"
    | "mfs_no_exception"
    | "divorce_agreed"
    | "divorce_no_agreement"
    | "other_agreed"
    | "other_no_agreement"
    | "no_aptc";
  policy_number: string;
  other_taxpayer_ssn: string;
  start_month: number;
  end_month: number;
  premium_pct?: number;
  slcsp_pct?: number;
  aptc_pct?: number;
}

export interface Fields {
  qsehra_ind?: boolean | null;
  mfs_exception_ind?: boolean | null;
  household_size?: number | null;
  taxpayer_modified_agi?: number | null;
  dependents_modified_agi?: number | null;
  household_income?: number | null;
  federal_poverty_line?: number | null;
  fpl_region?: "contiguous" | "alaska" | "hawaii" | null;
  federal_poverty_pct?: number | null;
  applicable_figure?: number | null;
  annual_premium?: number | null;
  annual_slcsp?: number | null;
  annual_applicable_contribution?: number | null;
  monthly_applicable_contribution?: number | null;
  annual_max_ptc?: number | null;
  annual_ptc_allowed?: number | null;
  annual_aptc?: number | null;
  monthly_ptc_rows?: readonly MonthlyRow[] | null;
  shared_policy_allocations?: readonly SharedPolicyAllocation[] | null;
  total_premium_tax_credit?: number | null;
  total_advance_ptc?: number | null;
  net_premium_tax_credit?: number | null;
  excess_advance_payment?: number | null;
  repayment_limitation?: number | null;
  excess_advance_premium?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["mfs_exception_ind", "MarriedFilingSeparatelyExcInd"],
  ["household_size", "TotalExemptionsCnt"],
  ["taxpayer_modified_agi", "ModifiedAGIAmt"],
  ["dependents_modified_agi", "TotalDependentsModifiedAGIAmt"],
  ["household_income", "HouseholdIncomeAmt"],
  ["federal_poverty_line", "PovertyLevelAmt"],
  ["federal_poverty_pct", "FederalPovertyLevelPct"],
  ["applicable_figure", "ApplicableFigureRt"],
  ["annual_applicable_contribution", "AnnualContributionAmt"],
  ["monthly_applicable_contribution", "MonthlyContriHealthCareCvrAmt"],
  ["total_premium_tax_credit", "TotalPremiumTaxCreditAmt"],
  ["total_advance_ptc", "TotalAdvancedPTCAmt"],
  ["net_premium_tax_credit", "ReconciledPremiumTaxCreditAmt"],
  ["excess_advance_payment", "ExcessAdvncPaymentAmt"],
  ["repayment_limitation", "AdditionalTaxLimitationAmt"],
  ["excess_advance_premium", "PremiumTaxCreditTaxLiabAmt"],
];

function numberElement(tag: string, value: unknown): string {
  return typeof value === "number" ? element(tag, value) : "";
}

function monthlyXml(rows: readonly MonthlyRow[]): string[] {
  return rows.filter((row) =>
    (row.premium ?? 0) > 0 || (row.slcsp ?? 0) > 0 || row.aptc > 0
  )
    .map((row) =>
      elements("MonthlyPTCCalculationGrp", [
        element("MonthCd", row.month_code),
        numberElement("MonthlyPremiumAmt", row.premium),
        numberElement("MonthlyPremiumSLCSPAmt", row.slcsp),
        numberElement("MonthlyContributionAmt", row.contribution),
        numberElement("MonthlyMaxPremiumAssistanceAmt", row.max_assistance),
        numberElement("MonthlyPremiumTaxCreditAllwAmt", row.allowed_credit),
        element("MonthlyAdvancedPTCAmt", row.aptc),
      ])
    );
}

function buildIRS8962(fields: Input): string {
  const monthlyRows = fields.monthly_ptc_rows;
  const allocations = fields.shared_policy_allocations ?? [];
  const hasSource = Array.isArray(monthlyRows) ||
    typeof fields.annual_premium === "number" ||
    typeof fields.annual_slcsp === "number" ||
    typeof fields.annual_aptc === "number";
  if (!hasSource) return "";
  if (
    typeof fields.household_size !== "number" ||
    typeof fields.taxpayer_modified_agi !== "number" ||
    typeof fields.household_income !== "number" ||
    typeof fields.federal_poverty_line !== "number" ||
    typeof fields.federal_poverty_pct !== "number" ||
    typeof fields.total_premium_tax_credit !== "number" ||
    typeof fields.total_advance_ptc !== "number" ||
    !fields.fpl_region
  ) {
    throw new Error(
      "Form 8962 MeF requires the completed 2025 calculation, not source premiums alone",
    );
  }
  if (
    allocations.length > 4 ||
    (allocations.length > 0 && !Array.isArray(monthlyRows))
  ) {
    throw new Error(
      "Form 8962 shared policies need at most four allocations and monthly rows",
    );
  }
  if (
    fields.household_income !== Math.max(
      0,
      fields.taxpayer_modified_agi + (fields.dependents_modified_agi ?? 0),
    )
  ) {
    throw new Error(
      "Form 8962 household income must reconcile to taxpayer and dependent modified AGI",
    );
  }

  const location = fields.fpl_region === "alaska"
    ? "A"
    : fields.fpl_region === "hawaii"
    ? "B"
    : "C";
  const annualGroup = Array.isArray(monthlyRows) ? [] : [
    elements("AnnualPTCCalculationGrp", [
      numberElement("AnnualPremiumAmt", fields.annual_premium),
      numberElement("AnnualPremiumSLCSPAmt", fields.annual_slcsp),
      numberElement(
        "AnnualContributionAmt",
        fields.annual_applicable_contribution,
      ),
      numberElement("AnnualMaxPremiumAssistanceAmt", fields.annual_max_ptc),
      numberElement("AnnualPremiumTaxCreditAllwAmt", fields.annual_ptc_allowed),
      numberElement("AnnualAdvancedPTCAmt", fields.annual_aptc),
    ]),
  ];
  return elements("IRS8962", [
    element("QSEHRAInd", fields.qsehra_ind === true ? "true" : "false"),
    fields.mfs_exception_ind === true
      ? element("MarriedFilingSeparatelyExcInd", "X")
      : "",
    element("TotalExemptionsCnt", fields.household_size),
    element("ModifiedAGIAmt", fields.taxpayer_modified_agi),
    numberElement(
      "TotalDependentsModifiedAGIAmt",
      fields.dependents_modified_agi,
    ),
    element("HouseholdIncomeAmt", fields.household_income),
    element("PovertyLevelAmt", fields.federal_poverty_line),
    element("FederalPovertyTableLocCd", location),
    element("FederalPovertyLevelPct", fields.federal_poverty_pct),
    fields.federal_poverty_pct === 401
      ? element("FederalPovertyLevelPct401Ind", "true")
      : "",
    typeof fields.applicable_figure === "number"
      ? element("ApplicableFigureRt", fields.applicable_figure.toFixed(4))
      : "",
    numberElement(
      "AnnualContributionAmt",
      fields.annual_applicable_contribution,
    ),
    numberElement(
      "MonthlyContriHealthCareCvrAmt",
      fields.monthly_applicable_contribution,
    ),
    allocations.length > 0
      ? element("SharePolicyMarriedAltCalcInd", "true")
      : "",
    element(
      "FullYrCoverage1095AInd",
      Array.isArray(monthlyRows) ? "false" : "true",
    ),
    ...(Array.isArray(monthlyRows) ? monthlyXml(monthlyRows) : annualGroup),
    element("TotalPremiumTaxCreditAmt", fields.total_premium_tax_credit),
    element("TotalAdvancedPTCAmt", fields.total_advance_ptc),
    numberElement(
      "ReconciledPremiumTaxCreditAmt",
      fields.net_premium_tax_credit,
    ),
    numberElement("ExcessAdvncPaymentAmt", fields.excess_advance_payment),
    numberElement("AdditionalTaxLimitationAmt", fields.repayment_limitation),
    numberElement("PremiumTaxCreditTaxLiabAmt", fields.excess_advance_premium),
    ...allocations.map((row) =>
      elements("SharedPolicyAllocationGrp", [
        element("PolicyNum", row.policy_number),
        element("SSN", row.other_taxpayer_ssn),
        element("StartMonthNumberCd", String(row.start_month).padStart(2, "0")),
        element("EndMonthNumberCd", String(row.end_month).padStart(2, "0")),
        typeof row.premium_pct === "number"
          ? element("MonthlyPremiumPct", row.premium_pct.toFixed(2))
          : "",
        typeof row.slcsp_pct === "number"
          ? element("MonthlyPremiumSLCSPPct", row.slcsp_pct.toFixed(2))
          : "",
        typeof row.aptc_pct === "number"
          ? element("MonthlyAdvancedPTCPct", row.aptc_pct.toFixed(2))
          : "",
      ])
    ),
    allocations.length > 0
      ? element("SharedPolicyAllocationInfoInd", "true")
      : "",
  ]);
}

export const form8962: MefFormDescriptor<"form8962", Input> = {
  pendingKey: "form8962",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8962.pdf",
  build(fields) {
    return buildIRS8962(fields);
  },
};
