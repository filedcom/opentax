import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { assertElectedSectionAReconciled } from "../../mef/forms/f8283_election.ts";
import { inputSchema as form8283InputSchema } from "../../../nodes/inputs/f8283/index.ts";
import { reconcileForm8283Carryover } from "../../mef/forms/f8283_carryover.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA,
} from "../../../nodes/inputs/schedule_a/index.ts";

// IRS Schedule A (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-prior/f1040sa--2025.pdf
//
// The official AcroForm includes name and SSN as f1_1/f1_2. Subsequent
// numbers follow physical widget order, including unnumbered subtotal fields.

const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "filer_name",
    pdfField: "form1[0].Page1[0].f1_1[0]",
  },
  {
    kind: "text",
    domainKey: "filer_ssn",
    pdfField: "form1[0].Page1[0].f1_2[0]",
  },
  // ── Medical and Dental Expenses ──────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line_1_medical",
    pdfField: "form1[0].Page1[0].f1_3[0]",
  },
  {
    kind: "text",
    domainKey: "agi",
    pdfField: "form1[0].Page1[0].Line2_ReadOrder[0].f1_4[0]",
  },
  {
    kind: "text",
    domainKey: "line_3_medical_floor",
    pdfField: "form1[0].Page1[0].f1_5[0]",
  },
  {
    kind: "text",
    domainKey: "line_4_medical_deduction",
    pdfField: "form1[0].Page1[0].f1_6[0]",
  },

  // ── Taxes You Paid ───────────────────────────────────────────────────────────
  // IRC §164(b)(5) election: state income tax or sales tax — mutually exclusive.
  // Both map to the same PDF field (line 5a). Only one will be nonzero at runtime.
  {
    kind: "text",
    domainKey: "line_5a_state_income_tax",
    pdfField: "form1[0].Page1[0].f1_7[0]",
  },
  {
    kind: "text",
    domainKey: "line_5a_sales_tax",
    pdfField: "form1[0].Page1[0].f1_7[0]",
  },
  {
    kind: "text",
    domainKey: "line_5b_real_estate_tax",
    pdfField: "form1[0].Page1[0].f1_8[0]",
  },
  {
    kind: "text",
    domainKey: "line_5c_personal_property_tax",
    pdfField: "form1[0].Page1[0].f1_9[0]",
  },
  {
    kind: "text",
    domainKey: "line_5d_salt_before_cap",
    pdfField: "form1[0].Page1[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "line_5e_salt_deduction",
    pdfField: "form1[0].Page1[0].f1_11[0]",
  },
  {
    kind: "text",
    domainKey: "line_6_other_taxes",
    pdfField: "form1[0].Page1[0].f1_13[0]",
  },
  {
    kind: "text",
    domainKey: "line_7_taxes",
    pdfField: "form1[0].Page1[0].f1_14[0]",
  },

  // ── Interest You Paid ────────────────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line_8a_mortgage_interest_1098",
    pdfField: "form1[0].Page1[0].f1_15[0]",
  },
  {
    kind: "text",
    domainKey: "line_8b_mortgage_interest_no_1098",
    pdfField: "form1[0].Page1[0].f1_17[0]",
  },
  {
    kind: "text",
    domainKey: "line_8c_points_no_1098",
    pdfField: "form1[0].Page1[0].f1_18[0]",
  },
  {
    kind: "text",
    domainKey: "line_9_investment_interest",
    pdfField: "form1[0].Page1[0].f1_21[0]",
  },
  {
    kind: "text",
    domainKey: "line_10_interest",
    pdfField: "form1[0].Page1[0].f1_22[0]",
  },

  // ── Gifts to Charity ─────────────────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line_11_cash_contributions",
    pdfField: "form1[0].Page1[0].f1_23[0]",
  },
  {
    kind: "text",
    domainKey: "line_12_noncash_contributions",
    pdfField: "form1[0].Page1[0].f1_24[0]",
  },
  {
    kind: "text",
    domainKey: "line_13_contribution_carryover",
    pdfField: "form1[0].Page1[0].f1_25[0]",
  },
  {
    kind: "text",
    domainKey: "line_14_charity",
    pdfField: "form1[0].Page1[0].f1_26[0]",
  },

  // ── Casualty and Theft Losses ────────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line_15_casualty_theft_loss",
    pdfField: "form1[0].Page1[0].f1_27[0]",
  },

  // ── Other Itemized Deductions ────────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line_16_other_deductions",
    pdfField: "form1[0].Page1[0].f1_29[0]",
  },
  {
    kind: "text",
    domainKey: "line_17_itemized",
    pdfField: "form1[0].Page1[0].f1_30[0]",
  },
];

export const scheduleAPdf: PdfFormDescriptor = {
  pendingKey: "schedule_a",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sa--2025.pdf",
  fields,
  instances(input, filer, all) {
    if (!(Number(all?.f1040?.line12e_itemized_deductions ?? 0) > 0)) {
      return [];
    }
    const hasPriorCarryover = [
      input.capital_gain_property_carryovers,
      all?.schedule_a?.capital_gain_property_carryovers,
    ].some((value) => Array.isArray(value) && value.length > 0);
    if (hasPriorCarryover) {
      reconcileForm8283Carryover(
        form8283InputSchema.parse(all?.f8283),
        { pending: all, filer },
        input,
      );
    }
    const {
      line_11_cash_contributions: _cash,
      line_12_noncash_contributions: _noncash,
      line_13_contribution_carryover: _carryover,
      charitable_limits_finalized: _limits,
      capital_gain_election_finalized: _election,
      ...source
    } = input;
    const parsed = scheduleAInputSchema.parse(source);
    const recomputed = scheduleA.compute(
      { taxYear: 2025, formType: "f1040" },
      parsed,
    );
    const standard = recomputed.outputs.find((output) =>
      output.nodeType === "standard_deduction"
    )?.fields;
    if (
      !standard || standard.itemized_deductions !==
        all?.f1040?.line12e_itemized_deductions
    ) {
      throw new Error(
        "Schedule A PDF source differs from Form 1040 itemized deductions",
      );
    }
    const amount = (key: string) => Number(input[key] ?? 0);
    const saltBeforeCap = amount("line_5a_state_income_tax") +
      amount("line_5a_sales_tax") + amount("line_5b_real_estate_tax") +
      amount("line_5c_personal_property_tax");
    const taxes = Number(standard.itemized_taxes);
    const salt = taxes - amount("line_6_other_taxes");
    const interest = Math.max(
      0,
      amount("line_8a_mortgage_interest_1098") +
        amount("line_8b_mortgage_interest_no_1098") -
        amount("form8396_interest_credit_reduction"),
    ) + amount("line_8c_points_no_1098") +
      amount("line_9_investment_interest");
    const charity = amount("line_11_cash_contributions") +
      amount("line_12_noncash_contributions") +
      amount("line_13_contribution_carryover");
    return [{
      ...input,
      filer_name: filer?.nameLine1,
      filer_ssn: filer?.primarySSN?.replace(/\D/g, ""),
      line_3_medical_floor: amount("line_1_medical") > 0
        ? Math.max(0, amount("agi")) * 0.075
        : undefined,
      line_4_medical_deduction: Math.max(
        0,
        amount("line_1_medical") - Math.max(0, amount("agi")) * 0.075,
      ),
      line_5d_salt_before_cap: saltBeforeCap,
      line_5e_salt_deduction: salt,
      line_7_taxes: taxes,
      line_10_interest: interest,
      line_14_charity: charity,
      line_17_itemized: standard.itemized_deductions,
    }];
  },
  // Schedule A is filed only when the return actually itemizes (1040 line 12
  // carries an itemized amount) — not merely because AGI was deposited here.
  includeWhen: (input, all) => {
    const itemizes = (((all?.["f1040"]?.["line12e_itemized_deductions"]) as
      | number
      | undefined) ?? 0) > 0;
    if (!itemizes) return false;
    const hasPriorCarryover = [
      input["capital_gain_property_carryovers"],
      all?.schedule_a?.capital_gain_property_carryovers,
    ].some((value) => Array.isArray(value) && value.length > 0);
    if (
      input["capital_gain_election_finalized"] === true &&
      !hasPriorCarryover
    ) {
      assertElectedSectionAReconciled({ pending: all }, input);
    }
    const amount = (key: string) => Number(input[key] ?? 0);
    if (
      (amount("line_11_cash_contributions") > 0 ||
        amount("line_12_noncash_contributions") > 0 ||
        amount("line_13_contribution_carryover") > 0) &&
      input["charitable_limits_finalized"] !== true
    ) {
      throw new Error(
        "Schedule A PDF charitable lines require categorized-source AGI-limit finalization",
      );
    }
    return true;
  },
};
