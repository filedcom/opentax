import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1099oid } from "../../../nodes/inputs/f1099oid/index.ts";
import { f1099int } from "../../../nodes/inputs/f1099int/index.ts";
import {
  calculateForm4952,
} from "../../../nodes/intermediate/forms/form4952/index.ts";
import { form4952Pdf } from "../../pdf/forms/f4952.ts";
import { form4952 } from "./f4952.ts";

const oid = {
  payer_name: "Investment Bond Issuer",
  box1_oid: 250,
  investment_property_for_form4952: true,
};
const dividend = {
  payerName: "Investment Fund",
  isNominee: false,
  box11: false,
  box1a: 400,
  investment_property_for_form4952: true,
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
  investment_interest_expense: 300,
  source_1099_interest: 250,
  source_1099_dividends: 400,
  amt_refigure: amtRefigure,
};
const fields = { ...inputs, ...calculateForm4952(inputs) };
const pending = {
  f1099oid: { f1099oids: [oid] },
  f1099div: { f1099divs: [dividend] },
  schedule_a: { line_9_investment_interest: 300 },
  standard_deduction: { itemized_deductions: 20_000 },
  income_tax_calculation: { taking_standard_deduction: false },
  f1040: {
    line2b_taxable_interest: 250,
    line3b_ordinary_dividends: 400,
    line12e_itemized_deductions: 20_000,
  },
};

Deno.test("Form 4952 reconciles plain 1099-OID with ordinary 1099-DIV", () => {
  const source = f1099oid.compute(
    { taxYear: 2025, formType: "f1040" },
    { f1099oids: [oid] },
  );
  assertEquals(
    source.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.source_1099_interest,
    250,
  );
  assertStringIncludes(
    form4952.build(fields, { pending }),
    "<InvestmentPropGrossIncomeAmt>650</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(form4952Pdf.projectFields?.(fields, pending), fields);
});

Deno.test("Form 4952 reconciles 1099-INT, 1099-OID, and 1099-DIV together", () => {
  const mixedInputs = {
    ...inputs,
    source_1099_interest: [500, 250],
  };
  const mixedFields = { ...mixedInputs, ...calculateForm4952(mixedInputs) };
  const mixedPending = {
    ...pending,
    f1099int: {
      f1099ints: [{
        payer_name: "Investment Bank",
        box1: 500,
        investment_property_for_form4952: true,
      }],
    },
    f1040: { ...pending.f1040, line2b_taxable_interest: 750 },
  };
  assertStringIncludes(
    form4952.build(mixedFields, { pending: mixedPending }),
    "<InvestmentPropGrossIncomeAmt>1150</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(mixedFields, mixedPending),
    mixedFields,
  );
});

Deno.test("Form 4952 reconciles Treasury box 3, plain OID box 1, and ordinary dividends", () => {
  const treasury = {
    payer_name: "U.S. Treasury",
    box3: 500,
    investment_property_for_form4952: true,
  };
  const treasuryOutput = f1099int.compute(
    { taxYear: 2025, formType: "f1040" },
    { f1099ints: [treasury] },
  );
  assertEquals(
    treasuryOutput.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.source_1099_interest,
    500,
  );
  const oidOutput = f1099oid.compute(
    { taxYear: 2025, formType: "f1040" },
    { f1099oids: [oid] },
  );
  assertEquals(
    oidOutput.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.source_1099_interest,
    250,
  );
  const mixedInputs = {
    ...inputs,
    source_1099_interest: [500, 250],
  };
  const mixedFields = { ...mixedInputs, ...calculateForm4952(mixedInputs) };
  const mixedPending = {
    ...pending,
    f1099int: { f1099ints: [treasury] },
    f1040: { ...pending.f1040, line2b_taxable_interest: 750 },
  };
  assertEquals(mixedFields.line4a, 1_150);
  assertEquals(mixedFields.line8, 300);
  assertStringIncludes(
    form4952.build(mixedFields, { pending: mixedPending }),
    "<InvestmentPropGrossIncomeAmt>1150</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(mixedFields, mixedPending),
    mixedFields,
  );
  assertThrows(
    () =>
      form4952.build(mixedFields, {
        pending: {
          ...mixedPending,
          f1099int: { f1099ints: [{ ...treasury, box12: 10 }] },
        },
      }),
    Error,
    "supports only unadjusted box 1 or box 3",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(mixedFields, {
        ...mixedPending,
        f1040: { ...mixedPending.f1040, line2b_taxable_interest: 500 },
      }),
    Error,
    "differs from finalized Schedule A and Form 1040",
  );
  assertThrows(
    () =>
      form4952.build(mixedFields, {
        pending: {
          ...mixedPending,
          f1099oid: { f1099oids: [{ ...oid, box1_oid: 200 }] },
        },
      }),
    Error,
    "supports only unadjusted box 1 or box 3",
  );
});

Deno.test("Form 4952 OID/dividend route rejects adjusted and mismatched sources", () => {
  for (
    const changed of [
      { ...oid, box6_acquisition_premium: 25, box6_applies_to: "taxable_oid" },
      { ...oid, box11_tax_exempt_oid: 25, box11_pab_oid: 0 },
      { ...oid, investment_property_for_form4952: false },
    ]
  ) {
    assertThrows(
      () =>
        form4952.build(fields, {
          pending: { ...pending, f1099oid: { f1099oids: [changed] } },
        }),
      Error,
      "supports only unadjusted",
    );
  }
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...pending,
        f1040: { ...pending.f1040, line2b_taxable_interest: 249 },
      }),
    Error,
    "differs from finalized Schedule A and Form 1040",
  );
  assertThrows(
    () =>
      form4952.build({ ...fields, source_1099_interest: 251 }, {
        pending,
      }),
    Error,
    "supports only unadjusted",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...pending,
        f1099oid: { f1099oids: [{ ...oid, box1_oid: -1 }] },
      }),
    Error,
    "needs 1099 interest and dividend sources",
  );
});
