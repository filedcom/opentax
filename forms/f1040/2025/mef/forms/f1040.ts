import { element, elements } from "../../../mef/xml.ts";
import {
  DependentCreditCategory,
  dependentCreditCategory,
  type DependentFiling,
  dependentFilingSchema,
  DependentRelationship,
  filerCreditEligibility,
  IRSDependentRelationshipCode,
} from "../../../nodes/inputs/general/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { inputSchema as w2gInputSchema } from "../../../nodes/inputs/w2g/index.ts";
import {
  inputSchema as f1099rInputSchema,
  isPensionDirectRollover,
} from "../../../nodes/inputs/f1099r/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  filing_status?: string;
  taxpayer_ssn?: string;
  taxpayer_ssn_valid_for_employment?: boolean;
  taxpayer_ssn_issued_before_due_date?: boolean;
  taxpayer_tin_issued_by_due_date?: boolean;
  spouse_ssn?: string;
  spouse_ssn_valid_for_employment?: boolean;
  spouse_ssn_issued_before_due_date?: boolean;
  spouse_tin_issued_by_due_date?: boolean;
  digital_assets?: boolean;
  dependent_details?: readonly DependentFiling[];
  dependent_count?: number;
  qualifying_child_tax_credit_count?: number;
  other_dependent_count?: number;
  line1a_wages?: number | null;
  line1b_household_wages?: number | null;
  line1c_unreported_tips?: number | null;
  line1d_medicaid_waiver?: number | null;
  line1e_taxable_dep_care?: number | null;
  line1f_taxable_adoption_benefits?: number | null;
  line1g_wages_8919?: number | null;
  line1h_other_earned?: number | null;
  line1i_combat_pay?: number | null;
  line1z_total_wages?: number | null;
  line2a_tax_exempt?: number | null;
  line2b_taxable_interest?: number | null;
  line3a_qualified_dividends?: number | null;
  line3b_ordinary_dividends?: number | null;
  line4a_ira_gross?: number | null;
  line4b_ira_taxable?: number | null;
  line5a_pension_gross?: number | null;
  line5b_pension_taxable?: number | null;
  line5c_pension_rollover?: boolean;
  line6a_ss_gross?: number | null;
  line6b_ss_taxable?: number | null;
  mfs_spouse_lived_with_taxpayer?: boolean;
  line7_capital_gain?: number | null;
  line7a_cap_gain_distrib?: number | null;
  line8_additional_income?: number | null;
  line9_total_income?: number | null;
  line10_adjustments?: number | null;
  line11_agi?: number | null;
  mfs_spouse_itemizing?: boolean;
  taxpayer_can_be_claimed_as_dependent?: boolean;
  taxpayer_age_65_or_older?: boolean;
  taxpayer_blind?: boolean;
  spouse_age_65_or_older?: boolean;
  spouse_blind?: boolean;
  line12c_deduction_total?: number | null;
  line13_qbi_deduction?: number | null;
  line13b_additional_deductions?: number | null;
  line14_deductions_qbi_total?: number | null;
  line15_taxable_income?: number | null;
  line16_income_tax?: number | null;
  form8814_tax?: number | null;
  form4972_tax?: number | null;
  form8978_tax?: number | null;
  form8621_tax?: number | null;
  line17_additional_taxes?: number | null;
  line18_total_tax_before_credits?: number | null;
  line19_child_tax_credit?: number | null;
  line20_nonrefundable_credits?: number | null;
  form8912_source_lines?: {
    line1: number;
    line2: number;
    line3: number;
    line4: number;
  } | null;
  line21_credits_total?: number | null;
  line22_tax_after_credits?: number | null;
  line23_other_taxes?: number | null;
  line24_total_tax?: number | null;
  line25a_w2_withheld?: number | null;
  line25b_withheld_1099?: number | null;
  line25c_total?: number | null;
  line25d_total_withholding?: number | null;
  line26_estimated_tax?: number | null;
  line27_eitc?: number | null;
  line28_actc?: number | null;
  line29_refundable_aoc?: number | null;
  line30_refundable_adoption?: number | null;
  line31_additional_payments?: number | null;
  line32_refundable_credits_total?: number | null;
  line33_total_payments?: number | null;
  line34_overpayment?: number | null;
  line35a_refund?: number | null;
  line37_amount_owed?: number | null;
  line38_underpayment_penalty?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Tag names verified against IRS1040.xsd (2025v3.0).
// Sequence order here MUST match the XSD element sequence.
// Key corrections from original:
//   line1e_taxable_dep_care → TaxableBenefitsAmt (was TaxableDependentCareExpnsesAmt)
//   line4a_ira_gross → IRADistributionsAmt (was TotalIRADistributionsAmt)
//   line4b_ira_taxable → TaxableIRAAmt (was TaxableIRADistributionsAmt)
//   line5a_pension_gross → PensionsAnnuitiesAmt (was TotalPensionsAndAnnuitiesAmt)
//   line5b_pension_taxable → TotalTaxablePensionsAmt (was TaxablePensionsAndAnnuitiesAmt)
//   line17_additional_taxes → AdditionalTaxAmt (was OtherTaxAmt, which is inside OtherTaxAmtGrp)
//   line25a_w2_withheld → FormW2WithheldTaxAmt (WithholdingTaxAmt is line 25d)
//   line25b_withheld_1099 → Form1099WithheldTaxAmt (was Form1099WithholdingAmt)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line1a_wages", "WagesAmt"],
  ["line1b_household_wages", "HouseholdEmployeeWagesAmt"],
  ["line1c_unreported_tips", "TipIncomeAmt"],
  ["line1d_medicaid_waiver", "MedicaidWaiverPymtNotRptW2Amt"],
  ["line1e_taxable_dep_care", "TaxableBenefitsAmt"],
  ["line1f_taxable_adoption_benefits", "TaxableBenefitsForm8839Amt"],
  ["line1g_wages_8919", "TotalWagesWithNoWithholdingAmt"],
  ["line1h_other_earned", "OtherEarnedIncomeAmt"],
  ["line1i_combat_pay", "NontxCombatPayElectionAmt"],
  ["line1z_total_wages", "WagesSalariesAndTipsAmt"],
  ["line2a_tax_exempt", "TaxExemptInterestAmt"],
  ["line2b_taxable_interest", "TaxableInterestAmt"],
  ["line3a_qualified_dividends", "QualifiedDividendsAmt"],
  ["line3b_ordinary_dividends", "OrdinaryDividendsAmt"],
  ["line4a_ira_gross", "IRADistributionsAmt"],
  ["line4b_ira_taxable", "TaxableIRAAmt"],
  ["line5a_pension_gross", "PensionsAnnuitiesAmt"],
  ["line5b_pension_taxable", "TotalTaxablePensionsAmt"],
  ["line6a_ss_gross", "SocSecBnftAmt"],
  ["line6b_ss_taxable", "TaxableSocSecAmt"],
  ["line7_capital_gain", "CapitalGainLossAmt"],
  ["line7a_cap_gain_distrib", "CapitalGainLossAmt"],
  ["line8_additional_income", "TotalAdditionalIncomeAmt"],
  ["line9_total_income", "TotalIncomeAmt"],
  ["line10_adjustments", "TotalAdjustmentsAmt"],
  ["line11_agi", "AdjustedGrossIncomeAmt"],
  ["line12c_deduction_total", "TotalItemizedOrStandardDedAmt"],
  ["line13_qbi_deduction", "QualifiedBusinessIncomeDedAmt"],
  ["line13b_additional_deductions", "TotalAdditionalDeductionsAmt"],
  ["line14_deductions_qbi_total", "TotalDeductionsAmt"],
  ["line15_taxable_income", "TaxableIncomeAmt"],
  ["line16_income_tax", "TaxAmt"],
  ["line17_additional_taxes", "AdditionalTaxAmt"],
  ["line18_total_tax_before_credits", "TotalTaxBeforeCrAndOthTaxesAmt"],
  ["line19_child_tax_credit", "CTCODCAmt"],
  ["line20_nonrefundable_credits", "TotalNonrefundableCreditsAmt"],
  ["line21_credits_total", "TotalCreditsAmt"],
  ["line22_tax_after_credits", "TaxLessCreditsAmt"],
  ["line23_other_taxes", "TotalOtherTaxesAmt"],
  ["line24_total_tax", "TotalTaxAmt"],
  ["line25a_w2_withheld", "FormW2WithheldTaxAmt"],
  ["line25b_withheld_1099", "Form1099WithheldTaxAmt"],
  ["line25c_total", "TaxWithheldOtherAmt"],
  ["line25d_total_withholding", "WithholdingTaxAmt"],
  ["line26_estimated_tax", "EstimatedTaxPaymentsAmt"],
  ["line27_eitc", "EarnedIncomeCreditAmt"],
  ["line28_actc", "AdditionalChildTaxCreditAmt"],
  ["line29_refundable_aoc", "RefundableAmerOppCreditAmt"],
  ["line30_refundable_adoption", "RefundableAdoptionCreditAmt"],
  ["line31_additional_payments", "TotalOtherPaymentsRfdblCrAmt"],
  ["line32_refundable_credits_total", "RefundableCreditsAmt"],
  ["line33_total_payments", "TotalPaymentsAmt"],
  ["line34_overpayment", "OverpaidAmt"],
  ["line35a_refund", "RefundAmt"],
  ["line37_amount_owed", "OwedAmt"],
  ["line38_underpayment_penalty", "EsPenaltyAmt"],
];

/**
 * Resolve a pending-dict value to a number.
 *
 * Upstream nodes and assembleReturn() both write to the same keys, causing
 * scalars to be promoted to arrays by the executor's mergePending logic
 * (e.g. line1a_wages becomes [75000, 75000] after two scalar writes).
 * Take the last entry of any array — assembleReturn() is the final writer and
 * its value is the authoritative computed result.
 */
function resolveNumber(value: unknown): number | undefined {
  if (Array.isArray(value)) {
    const last = value[value.length - 1];
    return typeof last === "number" ? last : undefined;
  }
  return typeof value === "number" ? value : undefined;
}

// Maps FilingStatus enum values to IRS IndividualReturnFilingStatusCd codes.
// XSD enumerates "1" through "5": single, MFJ, MFS, HOH, QSS.
const FILING_STATUS_CODE: Record<string, string> = {
  single: "1",
  mfj: "2",
  mfs: "3",
  hoh: "4",
  qss: "5",
};

const RELATIONSHIP_CODES: Record<
  DependentRelationship,
  readonly IRSDependentRelationshipCode[]
> = {
  [DependentRelationship.Son]: [IRSDependentRelationshipCode.Son],
  [DependentRelationship.Daughter]: [IRSDependentRelationshipCode.Daughter],
  [DependentRelationship.StepChild]: [IRSDependentRelationshipCode.StepChild],
  [DependentRelationship.FosterChild]: [
    IRSDependentRelationshipCode.FosterChild,
  ],
  [DependentRelationship.Sibling]: [
    IRSDependentRelationshipCode.Brother,
    IRSDependentRelationshipCode.Sister,
  ],
  [DependentRelationship.StepSibling]: [
    IRSDependentRelationshipCode.StepBrother,
    IRSDependentRelationshipCode.StepSister,
  ],
  [DependentRelationship.HalfSibling]: [
    IRSDependentRelationshipCode.HalfBrother,
    IRSDependentRelationshipCode.HalfSister,
  ],
  [DependentRelationship.Grandchild]: [IRSDependentRelationshipCode.Grandchild],
  [DependentRelationship.Grandparent]: [
    IRSDependentRelationshipCode.Grandparent,
  ],
  [DependentRelationship.Parent]: [IRSDependentRelationshipCode.Parent],
  [DependentRelationship.StepParent]: [
    IRSDependentRelationshipCode.Parent,
    IRSDependentRelationshipCode.Other,
  ],
  [DependentRelationship.ParentInLaw]: [IRSDependentRelationshipCode.Other],
  [DependentRelationship.ChildInLaw]: [IRSDependentRelationshipCode.Other],
  [DependentRelationship.SiblingInLaw]: [IRSDependentRelationshipCode.Other],
  [DependentRelationship.SiblingParent]: [
    IRSDependentRelationshipCode.Aunt,
    IRSDependentRelationshipCode.Uncle,
  ],
  [DependentRelationship.ChildSibling]: [
    IRSDependentRelationshipCode.Niece,
    IRSDependentRelationshipCode.Nephew,
  ],
  [DependentRelationship.Other]: [
    IRSDependentRelationshipCode.Other,
    IRSDependentRelationshipCode.None,
  ],
};

function dependentXml(fields: Input, context?: MefBuildContext): string[] {
  const details = dependentFilingSchema.array().max(100).parse(
    fields.dependent_details ?? [],
  );
  if (
    fields.dependent_count !== undefined &&
    fields.dependent_count !== details.length
  ) {
    throw new Error(
      "Form 1040 dependent count does not match the dependent rows",
    );
  }
  const creditCounts = {
    ctc:
      details.filter((dep) =>
        dep.credit_category === DependentCreditCategory.ChildTaxCredit
      ).length,
    odc:
      details.filter((dep) =>
        dep.credit_category === DependentCreditCategory.OtherDependentCredit
      ).length,
  };
  if (
    (fields.qualifying_child_tax_credit_count !== undefined &&
      fields.qualifying_child_tax_credit_count !== creditCounts.ctc) ||
    (fields.other_dependent_count !== undefined &&
      fields.other_dependent_count !== creditCounts.odc)
  ) {
    throw new Error(
      "Form 1040 dependent credits do not match the dependent rows",
    );
  }
  if (details.length === 0) return [];

  if (
    !Object.values(FilingStatus).includes(fields.filing_status as FilingStatus)
  ) {
    throw new Error("Form 1040 dependent rows need a filing status");
  }
  const filer = filerCreditEligibility({
    filing_status: fields.filing_status as FilingStatus,
    taxpayer_ssn: fields.taxpayer_ssn,
    taxpayer_ssn_valid_for_employment: fields.taxpayer_ssn_valid_for_employment,
    taxpayer_ssn_issued_before_due_date:
      fields.taxpayer_ssn_issued_before_due_date,
    taxpayer_tin_issued_by_due_date: fields.taxpayer_tin_issued_by_due_date,
    spouse_ssn: fields.spouse_ssn,
    spouse_ssn_valid_for_employment: fields.spouse_ssn_valid_for_employment,
    spouse_ssn_issued_before_due_date: fields.spouse_ssn_issued_before_due_date,
    spouse_tin_issued_by_due_date: fields.spouse_tin_issued_by_due_date,
  });

  const seenIds = new Set<string>();
  const rows = details.map((dep, index) => {
    const label = `Form 1040 dependent ${index + 1}`;
    if (dep.dependent_on_another_return === true) {
      throw new Error(`${label} cannot be claimed on this return`);
    }
    if (
      dep.credit_category !== DependentCreditCategory.None &&
      dep.us_citizen_national_or_resident !== true
    ) {
      throw new Error(
        `${label} needs confirmed U.S. citizenship, nationality, or resident-alien status for the claimed credit`,
      );
    }
    if (dep.filed_joint_return_except_refund_only !== false) {
      throw new Error(
        `${label} needs a confirmed answer to the dependent joint-return test`,
      );
    }
    if (
      dep.provided_over_half_own_support === true ||
      (dep.provided_over_half_own_support !== false &&
        dep.taxpayer_provided_over_half_support !== true)
    ) {
      throw new Error(
        `${label} needs a confirmed qualifying-child or qualifying-relative support basis`,
      );
    }
    if (dep.credit_category !== dependentCreditCategory(dep, filer)) {
      throw new Error(
        `${label} credit category does not match the dependent facts`,
      );
    }
    const irsName = /^([A-Za-z-] ?)*[A-Za-z-]$/;
    if (
      dep.first_name.length > 20 || dep.last_name.length > 20 ||
      !irsName.test(dep.first_name) || !irsName.test(dep.last_name) ||
      !dep.name_control
    ) {
      throw new Error(`${label} needs a name and IRS name control`);
    }
    if (
      !dep.irs_relationship_code ||
      !RELATIONSHIP_CODES[dep.relationship].includes(dep.irs_relationship_code)
    ) {
      throw new Error(`${label} needs a matching IRS relationship code`);
    }
    const tin = dep.ssn ?? dep.itin ?? dep.atin;
    const normalizedTin = tin?.replaceAll("-", "");
    if (!normalizedTin || !/^\d{9}$/.test(normalizedTin)) {
      throw new Error(`${label} needs a nine-digit SSN, ITIN, or ATIN`);
    }
    if (
      seenIds.has(normalizedTin) ||
      normalizedTin === context?.filer?.primarySSN.replaceAll("-", "") ||
      normalizedTin === context?.filer?.spouse?.ssn.replaceAll("-", "")
    ) {
      throw new Error(`${label} has a duplicate taxpayer identifier`);
    }
    seenIds.add(normalizedTin);
    if (
      dep.credit_category === DependentCreditCategory.ChildTaxCredit &&
      (!dep.ssn || dep.itin || dep.atin)
    ) {
      throw new Error(`${label} needs an SSN for the child tax credit`);
    }
    return elements("DependentDetail", [
      element("DependentFirstNm", dep.first_name),
      element("DependentLastNm", dep.last_name),
      element("DependentNameControlTxt", dep.name_control),
      element("IdentityProtectionPIN", dep.ip_pin),
      element("DependentSSN", normalizedTin),
      element("DependentRelationshipCd", dep.irs_relationship_code),
      dep.months_in_home > 6
        ? element("YesLiveWithChildOverHalfYrInd", "X")
        : "",
      dep.lived_in_us_over_half_year === true
        ? element("YesLiveWithChldUSOvrHalfYrInd", "X")
        : "",
      dep.full_time_student === true
        ? element("ChildIsAStudentUnder24Ind", "X")
        : "",
      dep.disabled === true ? element("ChildPermanentlyDisabledInd", "X") : "",
      dep.credit_category === DependentCreditCategory.ChildTaxCredit
        ? element("EligibleForChildTaxCreditInd", "X")
        : dep.credit_category === DependentCreditCategory.OtherDependentCredit
        ? element("EligibleForODCInd", "X")
        : "",
    ]);
  });
  const livedWithYou = details.filter((dep) => dep.months_in_home > 6).length;
  return [
    ...rows,
    details.length > 4 ? element("MoreDependentsInd", "X") : "",
    element("ChldWhoLivedWithYouCnt", livedWithYou),
    element("OtherDependentsListedCnt", details.length - livedWithYou),
  ];
}

function buildIRS1040(fields: Input, context?: MefBuildContext): string {
  const rollover = fields.line5c_pension_rollover === true;
  if (fields.line5c_pension_rollover !== undefined &&
      typeof fields.line5c_pension_rollover !== "boolean") {
    throw new Error("Form 1040 line 5c rollover must be a boolean");
  }
  const f1099rSource = context?.pending?.f1099r;
  if (rollover || f1099rSource !== undefined) {
    const parsed = f1099rInputSchema.safeParse(f1099rSource);
    if (!parsed.success) {
      throw new Error("Form 1040 line 5c needs valid Form 1099-R source facts");
    }
    if (rollover !== parsed.data.f1099rs.some(isPensionDirectRollover)) {
      throw new Error(
        "Form 1040 line 5c rollover does not match the payer-reported Form 1099-R code G",
      );
    }
  }
  if (context?.pending?.w2g !== undefined) {
    const source = w2gInputSchema.safeParse(context.pending.w2g);
    if (!source.success) {
      throw new Error(
        "Form 1040 W-2G withholding needs valid payer-issued source facts",
      );
    }
    const withheld = source.data.w2gs.filter((item) =>
      (item.box4_federal_withheld ?? 0) > 0
    );
    if (withheld.length > 0) {
      const withheldTotal = withheld.reduce(
        (sum, item) => sum + (item.box4_federal_withheld ?? 0),
        0,
      );
      if ((fields.line25c_total ?? 0) < withheldTotal) {
        throw new Error(
          "Form 1040 line 25c is less than sourced W-2G federal withholding",
        );
      }
      const ids = context.documentIdsByPendingKey?.w2g;
      if (
        context.documentIdsByPendingKey &&
        (!ids || ids.length !== withheld.length || ids.some((id) =>
          !id.trim()
        ) ||
          new Set(ids).size !== ids.length)
      ) {
        throw new Error(
          "Form 1040 W-2G withholding needs each linked payer-issued W-2G document",
        );
      }
    }
  }
  if ((resolveNumber(fields.line13b_additional_deductions) ?? 0) > 0) {
    const schedule = context?.pending?.schedule1a;
    if (
      !schedule || typeof schedule !== "object" ||
      Array.isArray(schedule) ||
      !("senior_zero_exclusions_review" in schedule) ||
      !schedule.senior_zero_exclusions_review ||
      (context?.documentIdsByPendingKey &&
        context.documentIdsByPendingKey.schedule1a?.length !== 1)
    ) {
      throw new Error(
        "Form 1040 line 13b needs an attached senior-only Schedule 1-A",
      );
    }
  }
  if ((fields.form8912_source_lines?.line4 ?? 0) > 0) {
    const bond = context?.pending?.f8912;
    const allowed = bond && typeof bond === "object" &&
        "allowed_credit" in bond
      ? bond.allowed_credit
      : undefined;
    if (
      typeof allowed !== "number" || !Number.isFinite(allowed) || allowed < 0
    ) {
      throw new Error(
        "Form 1040 bond credit needs finalized Form 8912 Part II",
      );
    }
    if (
      context?.documentIdsByPendingKey &&
      context.documentIdsByPendingKey.f8912?.length !== 1
    ) {
      throw new Error("Form 1040 bond credit needs one attached Form 8912");
    }
  }
  // IndividualReturnFilingStatusCd is required by IRS1040.xsd §230 and must
  // precede all income/deduction fields in the XSD sequence.
  const statusRaw = fields["filing_status"];
  if (
    statusRaw !== undefined &&
    (typeof statusRaw !== "string" ||
      FILING_STATUS_CODE[statusRaw] === undefined)
  ) {
    throw new Error("Form 1040 MeF needs a valid filing status");
  }
  const fieldStatusCode = statusRaw === undefined
    ? undefined
    : FILING_STATUS_CODE[statusRaw];
  const filerStatusCode = context?.filer?.filingStatus.toString();
  if (
    fieldStatusCode !== undefined && filerStatusCode !== undefined &&
    fieldStatusCode !== filerStatusCode
  ) {
    throw new Error("Form 1040 filing status differs from the return header");
  }
  const statusCode = fieldStatusCode ?? filerStatusCode ?? "1";

  const digitalAssets = fields["digital_assets"];
  if (digitalAssets !== undefined && typeof digitalAssets !== "boolean") {
    throw new Error("Form 1040 digital-asset answer must be Yes or No");
  }

  // VirtualCurAcquiredDurTYInd is required by IRS1040.xsd §338 (BooleanType).
  // Preserve the answer supplied on the general input rather than overwriting Yes.
  const requiredPrefix = [
    element("IndividualReturnFilingStatusCd", statusCode),
    element(
      "VirtualCurAcquiredDurTYInd",
      digitalAssets === true ? "true" : "false",
    ),
    ...dependentXml(fields, context),
  ];

  const capitalGain = resolveNumber(fields.line7_capital_gain);
  const directDistribution = resolveNumber(fields.line7a_cap_gain_distrib);
  if (capitalGain !== undefined && (directDistribution ?? 0) > 0) {
    throw new Error(
      "Form 1040 line 7a cannot contain both a Schedule D gain and direct capital-gain distributions",
    );
  }

  const incomeChildren = FIELD_MAP.map(([key, tag]) => {
    const value = resolveNumber(fields[key]);
    if (key === "line6b_ss_taxable") {
      return (value === undefined ? "" : element(tag, value)) +
        (statusCode === "3" &&
            fields.mfs_spouse_lived_with_taxpayer === false
          ? element("MFSLiveApartEntireYrInd", "X")
          : "");
    }
    if (value === undefined) return "";
    if (key === "line7a_cap_gain_distrib") {
      return value > 0
        ? element(tag, value) + element("CapitalDistributionInd", "X")
        : "";
    }
    if (key === "line1h_other_earned") {
      const scheduleId = context?.documentIdsByPendingKey
        ?.wages_not_shown_schedule?.[0];
      return element(
        tag,
        value,
        scheduleId
          ? {
            referenceDocumentId: scheduleId,
            referenceDocumentName:
              "NonW2DisabilityPaymentStatement WagesNotShownSchedule",
          }
          : undefined,
      );
    }
    if (key === "line27_eitc" && value > 0) {
      const scheduleId = context?.documentIdsByPendingKey?.eitc?.[0];
      return element(
        tag,
        value,
        scheduleId
          ? {
            referenceDocumentId: scheduleId,
            referenceDocumentName: "IRS1040ScheduleEIC",
          }
          : undefined,
      );
    }
    return element(tag, value);
  });
  if (rollover) {
    const pensionIndex = FIELD_MAP.findIndex(([key]) =>
      key === "line5b_pension_taxable"
    );
    incomeChildren.splice(
      pensionIndex + 1,
      0,
      element("PensionsAnnuitiesRolloverInd", "X"),
    );
  }
  if (typeof fields.form8814_tax === "number" && fields.form8814_tax > 0) {
    const formIds = context?.documentIdsByPendingKey?.form8814 ?? [];
    if (context?.documentIdsByPendingKey && formIds.length === 0) {
      throw new Error(
        "Form 1040 child-election tax needs an attached Form 8814",
      );
    }
    if ((resolveNumber(fields.line16_income_tax) ?? 0) < fields.form8814_tax) {
      throw new Error("Form 1040 line 16 omits Form 8814 child-election tax");
    }
    const taxIndex = FIELD_MAP.findIndex(([key]) =>
      key === "line16_income_tax"
    );
    incomeChildren.splice(
      taxIndex + 1,
      0,
      element("Form8814Ind", "X", {
        childInterestAndDividendTaxAmt: String(fields.form8814_tax),
        ...(formIds.length > 0
          ? {
            referenceDocumentId: formIds.join(" "),
            referenceDocumentName: "IRS8814",
          }
          : {}),
      }),
    );
  }
  const form4972Tax = resolveNumber(fields.form4972_tax);
  if (form4972Tax !== undefined && form4972Tax > 0) {
    const formIds = context?.documentIdsByPendingKey?.form4972 ?? [];
    if (context?.documentIdsByPendingKey && formIds.length === 0) {
      throw new Error("Form 1040 line 16 needs an attached Form 4972");
    }
    if ((resolveNumber(fields.line16_income_tax) ?? 0) < form4972Tax) {
      throw new Error("Form 1040 line 16 omits Form 4972 tax");
    }
    const taxIndex = FIELD_MAP.findIndex(([key]) =>
      key === "line16_income_tax"
    );
    incomeChildren.splice(
      taxIndex + 1 + (fields.form8814_tax ? 1 : 0),
      0,
      element(
        "Form4972Ind",
        "X",
        formIds.length > 0
          ? {
            referenceDocumentId: formIds.join(" "),
            referenceDocumentName: "IRS4972",
          }
          : undefined,
      ),
    );
  }
  const form8978Tax = resolveNumber(fields.form8978_tax);
  const form8621Tax = resolveNumber(fields.form8621_tax);
  const otherTaxGroups: string[] = [];
  if (form8978Tax !== undefined && form8978Tax > 0) {
    const formIds = context?.documentIdsByPendingKey?.f8978 ?? [];
    if (context?.documentIdsByPendingKey && formIds.length === 0) {
      throw new Error("Form 1040 line 16 needs an attached Form 8978");
    }
    if ((resolveNumber(fields.line16_income_tax) ?? 0) < form8978Tax) {
      throw new Error("Form 1040 line 16 omits Form 8978 tax");
    }
    otherTaxGroups.push(elements("OtherTaxAmtGrp", [
      element("OtherTaxAmtCd", "FORM 8978"),
      element("OtherTaxAmt", form8978Tax),
    ]));
  }
  if (form8621Tax !== undefined && form8621Tax > 0) {
    const formIds = context?.documentIdsByPendingKey?.form8621 ?? [];
    if (context?.documentIdsByPendingKey && formIds.length === 0) {
      throw new Error("Form 1040 line 16 needs an attached Form 8621");
    }
    if ((resolveNumber(fields.line16_income_tax) ?? 0) < form8621Tax) {
      throw new Error("Form 1040 line 16 omits Form 8621 tax");
    }
    otherTaxGroups.push(elements("OtherTaxAmtGrp", [
      element("OtherTaxAmtCd", "1291TAX"),
      element("OtherTaxAmt", form8621Tax),
    ]));
  }
  if (otherTaxGroups.length > 0) {
    const taxIndex = FIELD_MAP.findIndex(([key]) =>
      key === "line16_income_tax"
    );
    const offset = (fields.form8814_tax ? 1 : 0) + (form4972Tax ? 1 : 0);
    incomeChildren.splice(
      taxIndex + 1 + offset,
      0,
      element("OtherTaxAmtInd", "X"),
      ...otherTaxGroups,
    );
  }

  function checked(
    key:
      | "mfs_spouse_itemizing"
      | "taxpayer_can_be_claimed_as_dependent"
      | "taxpayer_age_65_or_older"
      | "taxpayer_blind"
      | "spouse_age_65_or_older"
      | "spouse_blind",
  ): boolean {
    const value = fields[key];
    if (value !== undefined && typeof value !== "boolean") {
      throw new Error(`Form 1040 ${key} must be a Yes or No answer`);
    }
    return value === true;
  }
  const mustItemize = checked("mfs_spouse_itemizing");
  if (mustItemize && statusCode !== "3") {
    throw new Error("Form 1040 spouse-itemizes box requires MFS filing status");
  }
  const ageBoxes = [
    ["taxpayer_age_65_or_older", "Primary65OrOlderInd"],
    ["taxpayer_blind", "PrimaryBlindInd"],
    ["spouse_age_65_or_older", "Spouse65OrOlderInd"],
    ["spouse_blind", "SpouseBlindInd"],
  ] as const;
  const checkedAgeBoxes = ageBoxes.filter(([key]) => checked(key));
  const deductionIndicators = [
    checked("taxpayer_can_be_claimed_as_dependent")
      ? element("PrimaryClaimAsDependentInd", "X")
      : "",
    mustItemize ? element("MustItemizeInd", "X") : "",
    ...ageBoxes.map(([key, tag]) => checked(key) ? element(tag, "X") : ""),
    checkedAgeBoxes.length > 0
      ? element("TotalBoxesCheckedCnt", checkedAgeBoxes.length)
      : "",
  ];
  const deductionMapIndex = FIELD_MAP.findIndex(([key]) =>
    key === "line12c_deduction_total"
  );
  const deductionTags = FIELD_MAP.slice(deductionMapIndex).map(([, tag]) =>
    tag
  );
  const firstDeductionOrTax = incomeChildren.findIndex((xml) =>
    deductionTags.some((tag) => xml.startsWith(`<${tag}>`))
  );
  incomeChildren.splice(
    firstDeductionOrTax < 0 ? incomeChildren.length : firstDeductionOrTax,
    0,
    ...deductionIndicators,
  );

  // RefundProductCd is REQUIRED by IRS1040.xsd §1894 (minOccurs defaults to 1).
  // "NO FINANCIAL PRODUCT" indicates the filer is not using a refund anticipation
  // loan or refund transfer product — the correct value for direct refunds.
  const requiredSuffix = [
    element("RefundProductCd", "NO FINANCIAL PRODUCT"),
  ];

  const allChildren = [...requiredPrefix, ...incomeChildren, ...requiredSuffix];
  return elements("IRS1040", allChildren);
}

export const irs1040: MefFormDescriptor<"f1040", Input> = {
  pendingKey: "f1040",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
  build(fields, context) {
    return buildIRS1040(fields, context);
  },
};
