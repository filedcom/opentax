import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import {
  assertElectedSectionAReconciled,
  assertElectedSectionBReconciled,
} from "./f8283_election.ts";
import { inputSchema as form8283InputSchema } from "../../../nodes/inputs/f8283/index.ts";
import { reconcileForm8283Carryover } from "./f8283_carryover.ts";

export interface Fields {
  line_1_medical?: number | null;
  agi?: number | null;
  // IRC §164(b)(5) election: either income tax or sales tax — mutually exclusive.
  // Both fields map to the same IRS XSD element (StateAndLocalTaxAmt).
  line_5a_state_income_tax?: number | null;
  line_5a_sales_tax?: number | null;
  line_5b_real_estate_tax?: number | null;
  line_5c_personal_property_tax?: number | null;
  line_6_other_taxes?: number | null;
  line_8a_mortgage_interest_1098?: number | null;
  line_8b_mortgage_interest_no_1098?: number | null;
  line_8c_points_no_1098?: number | null;
  form8396_interest_credit_reduction?: number | null;
  form8396_interest_reporting_line?: "8a" | "8b" | null;
  line_9_investment_interest?: number | null;
  line_11_cash_contributions?: number | null;
  line_12_noncash_contributions?: number | null;
  line_13_contribution_carryover?: number | null;
  charitable_limits_finalized?: boolean;
  capital_gain_election_finalized?: boolean;
  line_15_casualty_theft_loss?: number | null;
  line_16_other_deductions?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Tag names verified against IRS1040ScheduleA.xsd §2025v3.0.
// - agi → TaxReturnAGIAmt (AGIAmt is not a valid element in this form's XSD)
// - line_5a_state_income_tax / line_5a_sales_tax → both map to StateAndLocalTaxAmt
//   (IRC §164(b)(5) election; mutually exclusive so only one will be nonzero;
//   combined in buildIRS1040ScheduleA before emission)
// - line_8a_mortgage_interest_1098 → RptHomeMortgIntAndPointsAmt
//   (MortgageInterestPd1098Amt is not in the 2025v3.0 XSD)
// - line_8b_mortgage_interest_no_1098 → Form1098HomeMortgIntNotRptAmt
//   (wraps a complex type — scalar emission may fail strict validation,
//   but xmllint accepts it for non-strict content models)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line_1_medical", "MedicalAndDentalExpensesAmt"],
  ["agi", "TaxReturnAGIAmt"],
  // line_5a_state_income_tax and line_5a_sales_tax are combined below — not in FIELD_MAP
  ["line_5b_real_estate_tax", "RealEstateTaxesAmt"],
  ["line_5c_personal_property_tax", "PersonalPropertyTaxesAmt"],
  ["line_6_other_taxes", "OtherTaxesAmt"],
  ["line_8a_mortgage_interest_1098", "RptHomeMortgIntAndPointsAmt"],
  ["line_8b_mortgage_interest_no_1098", "Form1098HomeMortgIntNotRptAmt"],
  ["line_8c_points_no_1098", "Form1098PointsNotReportedAmt"],
  ["line_9_investment_interest", "InvestmentInterestAmt"],
  ["line_11_cash_contributions", "GiftsByCashOrCheckAmt"],
  ["line_12_noncash_contributions", "OtherThanByCashOrCheckAmt"],
  ["line_13_contribution_carryover", "CarryoverFromPriorYearAmt"],
  ["line_15_casualty_theft_loss", "CasualtyAndTheftLossesAmt"],
  ["line_16_other_deductions", "OtherMiscellaneousDedAmt"],
];

function buildIRS1040ScheduleA(
  fields: Input,
  context?: MefBuildContext,
): string {
  const returnFields = context?.pending?.f1040 as
    | Record<string, unknown>
    | undefined;
  if (
    returnFields?.line12a_standard_deduction !== undefined &&
    returnFields.line12e_itemized_deductions === undefined
  ) {
    return "";
  }
  // A section 170(d) noncash carryover needs Form 8283 in the carryover year.
  // The 2025 instructions also require a completed copy from the previous
  // year, plus any appraisal that had to accompany that earlier return. The
  // amount-only ledger has neither those artifacts nor their gift/donee facts.
  const sourceScheduleA = context?.pending?.schedule_a as
    | Record<string, unknown>
    | undefined;
  const hasPriorCapitalGainProperty = [
    fields.capital_gain_property_carryovers,
    sourceScheduleA?.capital_gain_property_carryovers,
  ].some((value) => Array.isArray(value) && value.length > 0);
  if (hasPriorCapitalGainProperty) {
    const rawForm8283 = context?.pending?.f8283;
    if (rawForm8283 === undefined) {
      throw new Error(
        "Schedule A capital-gain property carryover needs a carryover-year Form 8283, the completed previous-year Form 8283 copy, any previously required appraisal, and original gift/donee facts; the current amount-only ledger cannot file it",
      );
    }
    reconcileForm8283Carryover(
      form8283InputSchema.parse(rawForm8283),
      context ?? {},
      fields,
    );
  }
  if (fields.capital_gain_election_finalized === true &&
    !hasPriorCapitalGainProperty) {
    const form8283 = context?.pending?.f8283 as
      | {
        section_b_items?: readonly {
          capital_gain_reduction_election_confirmed?: true;
        }[];
      }
      | undefined;
    if (
      form8283?.section_b_items?.some((item) =>
        item.capital_gain_reduction_election_confirmed === true
      )
    ) {
      assertElectedSectionBReconciled(context, fields);
    } else {
      assertElectedSectionAReconciled(context, fields);
    }
  }
  if (
    ((fields.line_11_cash_contributions ?? 0) > 0 ||
      (fields.line_12_noncash_contributions ?? 0) > 0 ||
      (fields.line_13_contribution_carryover ?? 0) > 0) &&
    fields.charitable_limits_finalized !== true
  ) {
    throw new Error(
      "Schedule A charitable lines require categorized-source AGI-limit finalization",
    );
  }
  const reduction = fields.form8396_interest_credit_reduction ?? 0;
  const gross8a = fields.line_8a_mortgage_interest_1098 ?? 0;
  const gross8b = fields.line_8b_mortgage_interest_no_1098 ?? 0;
  const reportingLine = fields.form8396_interest_reporting_line;
  if (reduction > 0) {
    const form8396 = context?.pending?.form8396 as
      | Record<string, unknown>
      | undefined;
    if (
      form8396?.line3 !== reduction ||
      form8396.interest_reporting_line !== reportingLine ||
      (reportingLine !== "8a" && reportingLine !== "8b") ||
      reduction > (reportingLine === "8a" ? gross8a : gross8b)
    ) {
      throw new Error(
        "Schedule A mortgage-interest reduction differs from Form 8396 line 3 or deductible interest",
      );
    }
  }
  const net8a = gross8a - (reportingLine === "8a" ? reduction : 0);
  const net8b = gross8b - (reportingLine === "8b" ? reduction : 0);
  // Combine the mutually exclusive line 5a fields into a single XSD element.
  // Only one will be nonzero (enforced by schedule_a inputSchema superRefine).
  const line5a = (fields.line_5a_state_income_tax ?? 0) +
    (fields.line_5a_sales_tax ?? 0);
  const hasDeduction =
    FIELD_MAP.some(([key]) =>
      key !== "agi" && typeof fields[key] === "number" && fields[key] !== 0
    ) || line5a !== 0;
  if (!hasDeduction) return "";

  // Elements must follow the XSD sequence order defined in IRS1040ScheduleA.xsd:
  //   MedicalAndDentalExpensesAmt → TaxReturnAGIAmt → ... → StateAndLocalTaxAmt → RealEstateTaxesAmt → ...
  // TaxReturnAGIAmt (AGI, line 2) must appear before StateAndLocalTaxAmt (line 5a).
  const mapField = ([key, tag]: readonly [keyof Fields, string]): string => {
    const value = fields[key];
    return typeof value === "number" ? element(tag, value) : "";
  };

  const children = [
    mapField(["line_1_medical", "MedicalAndDentalExpensesAmt"]),
    mapField(["agi", "TaxReturnAGIAmt"]),
    ...(line5a > 0 ? [element("StateAndLocalTaxAmt", line5a)] : []),
    mapField(["line_5b_real_estate_tax", "RealEstateTaxesAmt"]),
    mapField(["line_5c_personal_property_tax", "PersonalPropertyTaxesAmt"]),
    mapField(["line_6_other_taxes", "OtherTaxesAmt"]),
    fields.line_8a_mortgage_interest_1098 !== undefined
      ? element("RptHomeMortgIntAndPointsAmt", net8a)
      : "",
    fields.line_8b_mortgage_interest_no_1098 !== undefined
      ? element("Form1098HomeMortgIntNotRptAmt", net8b)
      : "",
    mapField(["line_8c_points_no_1098", "Form1098PointsNotReportedAmt"]),
    mapField(["line_9_investment_interest", "InvestmentInterestAmt"]),
    mapField(["line_11_cash_contributions", "GiftsByCashOrCheckAmt"]),
    mapField(["line_12_noncash_contributions", "OtherThanByCashOrCheckAmt"]),
    mapField(["line_13_contribution_carryover", "CarryoverFromPriorYearAmt"]),
    mapField(["line_15_casualty_theft_loss", "CasualtyAndTheftLossesAmt"]),
    mapField(["line_16_other_deductions", "OtherMiscellaneousDedAmt"]),
  ];
  return elements("IRS1040ScheduleA", children);
}

export const scheduleA: MefFormDescriptor<"schedule_a", Input> = {
  pendingKey: "schedule_a",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sa.pdf",
  build(fields, context) {
    return buildIRS1040ScheduleA(fields, context);
  },
};
