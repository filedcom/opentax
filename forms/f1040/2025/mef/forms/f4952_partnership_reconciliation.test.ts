import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { k1Partnership } from "../../../nodes/inputs/k1_partnership/index.ts";
import { TSJ } from "../../../nodes/types.ts";
import {
  calculateForm4952,
  form4952 as form4952Node,
} from "../../../nodes/intermediate/forms/form4952/index.ts";
import { form4952Pdf } from "../../pdf/forms/f4952.ts";
import { form4952 } from "./f4952.ts";

const partnership = {
  partnership_name: "Portfolio Partnership",
  partnership_ein: "123456789",
  source_document_reference: "filed-2025-k1-portfolio",
  investment_property_for_form4952: true,
  box5_interest: 500,
  box13_code_h_investment_interest: 300,
};
const amtRefigure = {
  prior_year_disallowed_interest: 0,
  interest_on_private_activity_bonds: 0,
  other_gross_income_adjustment: 0,
  qualified_dividends_adjustment: 0,
  net_disposition_gain_adjustment: 0,
  net_capital_gain_adjustment: 0,
  investment_expenses_adjustment: 0,
};
const inputs = {
  source_k1_interest: 500,
  source_k1_investment_interest: 300,
  amt_refigure: amtRefigure,
};
const fields = { ...inputs, ...calculateForm4952(inputs) };
const pending = {
  k1_partnership: { k1_partnerships: [partnership] },
  schedule_a: { line_9_investment_interest: 300 },
  standard_deduction: { itemized_deductions: 20_000 },
  income_tax_calculation: { taking_standard_deduction: false },
  f1040: {
    line2b_taxable_interest: 500,
    line12e_itemized_deductions: 20_000,
  },
};

Deno.test("Form 4952 reconciles one K-1's box 5 interest and box 13 code H investment interest", () => {
  const source = k1Partnership.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.k1_partnership,
  );
  assertEquals(
    source.outputs.filter((entry) => entry.nodeType === "form4952").map(
      (entry) => entry.fields,
    ),
    [
      { source_k1_interest: 500 },
      { source_k1_investment_interest: 300 },
    ],
  );
  assertEquals(
    form4952Node.compute(
      { taxYear: 2025, formType: "f1040" },
      inputs,
    ).outputs.find((entry) => entry.nodeType === "schedule_a")?.fields
      .line_9_investment_interest,
    300,
  );
  assertStringIncludes(
    form4952.build(fields, { pending }),
    "<InvestmentInterestExpDeductAmt>300</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(form4952Pdf.projectFields?.(fields, pending), fields);
});

Deno.test("Form 4952 K-1 path rejects unlinked or extra partnership facts", () => {
  assertThrows(
    () => form4952.build(fields),
    Error,
    "needs its K-1",
  );
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: {
          ...pending,
          k1_partnership: {
            k1_partnerships: [{ ...partnership, box16_foreign_tax: 20 }],
          },
        },
      }),
    Error,
    "supports only sourced box 5 and box 13 code H",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.({
        ...fields,
        source_k1_interest: [400, 100],
      }, pending),
    Error,
    "supports only sourced box 5 and box 13 code H",
  );
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line2b_taxable_interest: 400 },
        },
      }),
    Error,
    "differs from finalized Schedule A and Form 1040",
  );
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: {
          ...pending,
          income_tax_calculation: { taking_standard_deduction: true },
        },
      }),
    Error,
    "needs the calculated itemization choice",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...pending,
        f1040: { ...pending.f1040, line12a_standard_deduction: 15_750 },
      }),
    Error,
    "differs from selected Schedule A total",
  );
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: {
          ...pending,
          standard_deduction: { itemized_deductions: 19_000 },
        },
      }),
    Error,
    "differs from selected Schedule A total",
  );
});

Deno.test("Form 4952 reconciles several distinct partnership K-1s by source amounts", () => {
  const second = {
    ...partnership,
    partnership_name: "Second Portfolio Partnership",
    partnership_ein: "987654321",
    source_document_reference: "filed-2025-k1-second",
    box5_interest: 250,
    box13_code_h_investment_interest: 150,
  };
  const multiInputs = {
    ...inputs,
    source_k1_interest: [500, 250],
    source_k1_investment_interest: [300, 150],
  };
  const multiFields = { ...multiInputs, ...calculateForm4952(multiInputs) };
  const multiPending = {
    ...pending,
    k1_partnership: { k1_partnerships: [partnership, second] },
    schedule_a: { line_9_investment_interest: 450 },
    f1040: {
      ...pending.f1040,
      line2b_taxable_interest: 750,
    },
  };
  assertStringIncludes(
    form4952.build(multiFields, { pending: multiPending }),
    "<InvestmentInterestExpDeductAmt>450</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(multiFields, multiPending),
    multiFields,
  );
  assertThrows(
    () =>
      form4952.build(multiFields, {
        pending: {
          ...multiPending,
          k1_partnership: {
            k1_partnerships: [partnership, {
              ...second,
              partnership_ein: partnership.partnership_ein,
            }],
          },
        },
      }),
    Error,
    "supports only sourced box 5 and box 13 code H",
  );
  assertThrows(
    () =>
      form4952.build(multiFields, {
        pending: {
          ...multiPending,
          k1_partnership: {
            k1_partnerships: [partnership, {
              ...second,
              source_document_reference: partnership.source_document_reference,
            }],
          },
        },
      }),
    Error,
    "supports only sourced box 5 and box 13 code H",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.({
        ...multiFields,
        source_k1_interest: [600, 150],
      }, multiPending),
    Error,
    "supports only sourced box 5 and box 13 code H",
  );
});

Deno.test("Form 4952 calculates K-1 code B line 5 but blocks unverified XML and PDF export", () => {
  const withCodeB = {
    ...partnership,
    box7_royalties: 600,
    box7_royalty_reporting: {
      tsj: TSJ.T,
      property_description: "Partnership mineral royalty",
      portfolio_nonpassive: true as const,
      form_1099_payments_made: false as const,
    },
    box13_code_i_royalty_deduction: {
      reported_amount: 350,
      allowed_amount: 350,
      statement_reference: "2025 code I statement",
      expense_kind: "depreciation" as const,
      basis_workpaper_reference: "2025 basis review",
      at_risk_workpaper_reference: "2025 at-risk review",
    },
    box20_code_b_investment_expenses: {
      reported_amount: 350,
      allowed_deduction_amount: 350,
      allowed_deduction_kind: "depreciation" as const,
      nonpassive_investment_property: true as const,
      issuer_crosswalk: {
        issuer_supplement_reference: "2025 K-1 investment supplement",
        issuer_reported_amount: 350,
        same_expense_as_box13_code_i_confirmed: true as const,
        box13_code_i_statement_reference: "2025 code I statement",
        royalty_property_description: "Partnership mineral royalty",
      },
    },
  };
  const codeBInputs = {
    ...inputs,
    investment_interest_expense_excludes_royalty_attributable_interest:
      true as const,
    source_k1_royalties: 600,
    source_k1_allowed_investment_expenses: 350,
  };
  const codeBFields = { ...codeBInputs, ...calculateForm4952(codeBInputs) };
  const codeBPending = {
    ...pending,
    k1_partnership: { k1_partnerships: [withCodeB] },
    schedule_a: { line_9_investment_interest: 300 },
  };
  const source = k1Partnership.compute(
    { taxYear: 2025, formType: "f1040" },
    codeBPending.k1_partnership,
  );
  assertEquals(
    source.outputs.find((entry) =>
      entry.nodeType === "form4952" &&
      entry.fields.source_k1_allowed_investment_expenses === 350
    )?.fields.source_k1_allowed_investment_expenses,
    350,
  );
  assertEquals(codeBFields.line5, 350);
  assertEquals(codeBFields.line8, 300);
  assertThrows(
    () => form4952.build(codeBFields, { pending: codeBPending }),
    Error,
    "needs a source-linked deduction on the filed return",
  );
  assertThrows(
    () => form4952Pdf.projectFields?.(codeBFields, codeBPending),
    Error,
    "needs a source-linked deduction on the filed return",
  );
  assertThrows(
    () =>
      form4952.build(
        { ...codeBFields, source_k1_allowed_investment_expenses: 300 },
        { pending: codeBPending },
      ),
    Error,
    "needs a source-linked deduction on the filed return",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(codeBFields, {
        ...codeBPending,
        k1_partnership: {
          k1_partnerships: [{
            ...withCodeB,
            box20_code_b_investment_expenses: {
              ...withCodeB.box20_code_b_investment_expenses,
              allowed_deduction_amount: 300,
            },
          }],
        },
      }),
    Error,
    "needs its K-1",
  );
  assertThrows(
    () =>
      form4952.build({ ...codeBFields, line5: 400 }, {
        pending: codeBPending,
      }),
    Error,
    "needs a source-linked deduction on the filed return",
  );
});
