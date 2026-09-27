import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

// The Form 8889 node emits the completed 2025 form lines. Serialize those
// lines rather than reinterpreting raw HSA contributions in the MeF layer.
// Order is the sequence in IRS8889.xsd (TY2025 v5.4).
export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["print_line2_taxpayer_contributions", "HSAContributionAmt"],
  ["print_line3_limit", "HSALimitedAnnualDeductibleAmt"],
  ["print_line4_archer", "TotalArcherMSAContributionAmt"],
  ["print_line5", "HSALimitedDeductibleAllwdAmt"],
  ["print_line6", "HSAFamilyDeductibleAmt"],
  ["print_line7_catchup", "HSAAddnlContributionAmt"],
  ["print_line8", "HSALimitedGrossContributionAmt"],
  ["print_line9_employer", "HSAEmployerContributionAmt"],
  ["print_line10", "HSAQualifiedFundingDistriAmt"],
  ["print_line11", "TotalHSAContributionAmt"],
  ["print_line12", "HSALimitedContributionAmt"],
  ["print_line13_deduction", "TotalHSADeductionAmt"],
  ["print_line14a_distributions", "TotalHSADistributionAmt"],
  ["print_line14b_excluded_distributions", "HSADistributionRolloverAmt"],
  ["print_line14c", "HSANetDistributionAmt"],
  ["print_line15_qualified", "UnreimbQualMedAndDentalExpAmt"],
  ["print_line16_taxable", "TaxableHSADistributionAmt"],
  ["print_line17b_penalty", "HSADistriAddnlPercentTaxAmt"],
  ["print_line18", "HDHPCoverageFailPartialYrAmt"],
  ["print_line19", "HDHPCoverageFailFundDistriAmt"],
  ["print_line20", "HDHPCoverageIncomeAmt"],
  ["print_line21", "HDHPCoverageAddnlTaxAmt"],
];

type Input = Record<string, unknown>;

const LINE_KEYS = new Set([
  "print_line1_coverage",
  "print_line17a_exception",
  ...FIELD_MAP.map(([key]) => key),
]);

const RAW_HSA_KEYS = [
  "taxpayer_hsa_contributions",
  "employer_hsa_contributions",
  "employer_excess_treatment",
  "hsa_december_31_value",
  "post_year_personal_excess_withdrawal",
  "qualified_hsa_funding_distribution",
  "hsa_distributions",
  "hsa_excluded_distributions",
  "qualified_medical_expenses",
  "testing_period_failure",
];

function amount(fields: Input, key: string, tag: string): string {
  const value = fields[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Form 8889 ${key} must be a nonnegative amount`);
  }
  return element(tag, value);
}

function buildIRS8889(fields: Input, context?: MefBuildContext): string {
  const hasLines = Object.keys(fields).some((key) => LINE_KEYS.has(key));
  if (!hasLines) {
    if (RAW_HSA_KEYS.some((key) => fields[key] !== undefined)) {
      throw new Error("Form 8889 MeF requires computed print_line fields");
    }
    return "";
  }

  const ssn = context?.filer?.primarySSN.replace(/\D/g, "");
  if (!ssn || !/^\d{9}$/.test(ssn)) {
    throw new Error("Form 8889 MeF requires the HSA beneficiary SSN");
  }
  const coverage = fields.print_line1_coverage;
  if (
    coverage !== undefined && coverage !== null &&
    coverage !== "self_only" && coverage !== "family"
  ) {
    throw new Error("Form 8889 line 1 needs self-only or family coverage");
  }
  const exception = fields.print_line17a_exception;
  if (exception !== undefined && typeof exception !== "boolean") {
    throw new Error("Form 8889 line 17a must be a boolean");
  }

  const beforeException = FIELD_MAP.slice(0, 17);
  const afterException = FIELD_MAP.slice(17);
  return elements("IRS8889", [
    element("PersonNm", context?.filer?.fullName),
    element("RecipientSSN", ssn),
    coverage === "self_only" ? element("HDHPSelfOnlyCoverageInd", "X") : "",
    coverage === "family" ? element("HDHPFamilyCoverageInd", "X") : "",
    ...beforeException.map(([key, tag]) => amount(fields, key, tag)),
    exception === true ? element("HSADistriAddnlPercentTaxExcInd", "X") : "",
    ...afterException.map(([key, tag]) => amount(fields, key, tag)),
  ]);
}

export const form8889: MefFormDescriptor<"form8889", Input> = {
  pendingKey: "form8889",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8889--2025.pdf",
  build: buildIRS8889,
};
