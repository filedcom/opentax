import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1099int } from "../../../../../nodes/inputs/f1099int/index.ts";
import { f1099oid } from "../../../../../nodes/inputs/f1099oid/index.ts";
import { k1Partnership } from "../../../../../nodes/inputs/k1_partnership/index.ts";
import { calculateForm4952 } from "../../../../../nodes/intermediate/forms/form4952/index.ts";
import { form4952Pdf } from "../../../../pdf/forms/investments/f4952.ts";
import { form4952 } from "./f4952.ts";
import { testFiler } from "../../../execution/test-filer.ts";
import { normalizeAllPending } from "../../../../domains/execution/pending.ts";

const filer = testFiler();
const build: typeof form4952.build = (fields, context) =>
  form4952.build(fields, { ...context, filer });

const payer = {
  payer_name: "Investment Bank",
  box1: 500,
  investment_property_for_form4952: true,
};
const partnership = {
  partnership_name: "Portfolio Partnership",
  partnership_ein: "123456789",
  source_document_reference: "filed-2025-k1-portfolio",
  recipient_tin: "123456789",
  box13_code_h_investment_interest: 300,
};
const inputs = {
  source_1099_interest: 500,
  source_k1_investment_interest: 300,
  amt_refigure: {
    prior_year_disallowed_interest: 0,
    interest_on_private_activity_bonds: 0,
    other_gross_income_adjustment: 0,
    qualified_dividends_adjustment: 0,
    net_disposition_gain_adjustment: 0,
    net_capital_gain_adjustment: 0,
    investment_expenses_adjustment: 0,
  },
};
const fields = { ...inputs, ...calculateForm4952(inputs) };
const pending = {
  f1099int: { f1099ints: [payer] },
  k1_partnership: { k1_partnerships: [partnership] },
  schedule_a: { line_9_investment_interest: 300 },
  standard_deduction: { itemized_deductions: 20_000 },
  income_tax_calculation: { taking_standard_deduction: false },
  f1040: {
    line2b_taxable_interest: 500,
    line12e_itemized_deductions: 20_000,
  },
};

Deno.test("Form 4952 limits sourced K-1 code H expense against 1099-INT income", () => {
  const fromInterest = f1099int.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.f1099int,
  );
  const fromPartnership = k1Partnership.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.k1_partnership,
  );
  assertEquals(
    fromInterest.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.source_1099_interest,
    500,
  );
  assertEquals(
    fromPartnership.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.source_k1_investment_interest,
    300,
  );
  assertStringIncludes(
    build(fields, { pending }),
    "<InvestmentInterestExpDeductAmt>300</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(form4952Pdf.projectFields?.(fields, pending), fields);
});

Deno.test("Form 4952 limits K-1 code H expense against plain box 3 Treasury interest", () => {
  const treasury = {
    ...payer,
    box1: 0,
    box3: 500,
  };
  const treasuryPending = {
    ...pending,
    f1099int: { f1099ints: [treasury] },
  };
  const source = f1099int.compute(
    { taxYear: 2025, formType: "f1040" },
    treasuryPending.f1099int,
  );
  assertEquals(
    source.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.source_1099_interest,
    500,
  );
  assertStringIncludes(
    build(fields, { pending: treasuryPending }),
    "<InvestmentPropGrossIncomeAmt>500</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(fields, treasuryPending),
    fields,
  );
  const adjustedPending = {
    ...treasuryPending,
    f1099int: { f1099ints: [{ ...treasury, box12: 1 }] },
  };
  assertThrows(
    () => build(fields, { pending: adjustedPending }),
    Error,
    "unadjusted domestic 1099-INT box 1/3",
  );
  assertThrows(
    () => form4952Pdf.projectFields?.(fields, adjustedPending),
    Error,
    "unadjusted domestic 1099-INT box 1/3",
  );
});

Deno.test("Form 4952 reconciles K-1 code H against plain 1099-OID box 1, alone or with 1099-INT", () => {
  const oidPayer = {
    payer_name: "Taxable OID Bond",
    box1_oid: 500,
    investment_property_for_form4952: true,
  };
  const oidPending = {
    ...pending,
    f1099int: undefined,
    f1099oid: { f1099oids: [oidPayer] },
  };
  const oidSource = f1099oid.compute(
    { taxYear: 2025, formType: "f1040" },
    oidPending.f1099oid,
  );
  assertEquals(
    oidSource.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.source_1099_interest,
    500,
  );
  assertStringIncludes(
    build(fields, { pending: oidPending }),
    "<InvestmentInterestExpDeductAmt>300</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(fields, normalizeAllPending(oidPending)),
    fields,
  );
  const mixedInputs = {
    ...inputs,
    source_1099_interest: [500, 250],
  };
  const mixedFields = { ...mixedInputs, ...calculateForm4952(mixedInputs) };
  const mixedPending = {
    ...pending,
    f1099oid: { f1099oids: [{ ...oidPayer, box1_oid: 250 }] },
    f1040: { ...pending.f1040, line2b_taxable_interest: 750 },
  };
  assertStringIncludes(
    build(mixedFields, { pending: mixedPending }),
    "<InvestmentPropGrossIncomeAmt>750</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(mixedFields, mixedPending),
    mixedFields,
  );
  for (
    const changed of [
      { ...oidPayer, box6_acquisition_premium: 1 },
      { ...oidPayer, investment_property_for_form4952: false },
    ]
  ) {
    const altered = { ...oidPending, f1099oid: { f1099oids: [changed] } };
    assertThrows(
      () => build(fields, { pending: altered }),
      Error,
      "supports only identified code H K-1 expenses",
    );
    assertThrows(
      () => form4952Pdf.projectFields?.(fields, normalizeAllPending(altered)),
      Error,
      "supports only identified code H K-1 expenses",
    );
  }
  assertThrows(
    () => build(fields, { pending: { ...oidPending, f1099oid: undefined } }),
    Error,
    "needs its sources",
  );
  assertThrows(
    () =>
      build(fields, {
        pending: {
          ...oidPending,
          f1040: { ...pending.f1040, line2b_taxable_interest: 499 },
        },
      }),
    Error,
    "differs from finalized Schedule A and Form 1040",
  );
});

Deno.test("Form 4952 mixed K-1/1099-INT route rejects conflicting source facts", () => {
  assertThrows(
    () =>
      build(fields, {
        pending: { ...pending, form_1116: { foreign_tax_paid: 50 } },
      }),
    Error,
    "needs source-backed investment-interest allocation",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...pending,
        form_1116: { foreign_tax_paid: 50 },
      }),
    Error,
    "needs source-backed investment-interest allocation",
  );
  assertThrows(
    () => build(fields),
    Error,
    "needs its issued partnership K-1 recipients",
  );
  assertThrows(
    () =>
      build(fields, {
        pending: {
          ...pending,
          f1099int: { f1099ints: [{ ...payer, box6: 10 }] },
        },
      }),
    Error,
    "supports only identified code H K-1 expenses",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...pending,
        k1_partnership: {
          k1_partnerships: [{ ...partnership, box5_interest: 20 }],
        },
      }),
    Error,
    "supports only identified code H K-1 expenses",
  );
  assertThrows(
    () =>
      build({ ...fields, source_k1_investment_interest: 250 }, {
        pending,
      }),
    Error,
    "supports only identified code H K-1 expenses",
  );
});

Deno.test("Form 4952 mixed route matches several K-1 and 1099-INT amounts without relying on source order", () => {
  const secondPayer = {
    ...payer,
    payer_name: "Second Investment Bank",
    box1: 250,
  };
  const secondPartnership = {
    ...partnership,
    partnership_name: "Second Partnership",
    partnership_ein: "987654321",
    source_document_reference: "filed-2025-k1-second",
    box13_code_h_investment_interest: 150,
  };
  const multiInputs = {
    ...inputs,
    source_1099_interest: [250, 500],
    source_k1_investment_interest: [150, 300],
  };
  const multiFields = { ...multiInputs, ...calculateForm4952(multiInputs) };
  const multiPending = {
    ...pending,
    f1099int: { f1099ints: [payer, secondPayer] },
    k1_partnership: { k1_partnerships: [partnership, secondPartnership] },
    schedule_a: { line_9_investment_interest: 450 },
    f1040: { ...pending.f1040, line2b_taxable_interest: 750 },
  };
  assertStringIncludes(
    build(multiFields, { pending: multiPending }),
    "<InvestmentInterestExpDeductAmt>450</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(multiFields, multiPending),
    multiFields,
  );
  assertThrows(
    () =>
      build({
        ...multiFields,
        source_k1_investment_interest: [200, 250],
      }, { pending: multiPending }),
    Error,
    "supports only identified code H K-1 expenses",
  );
});
