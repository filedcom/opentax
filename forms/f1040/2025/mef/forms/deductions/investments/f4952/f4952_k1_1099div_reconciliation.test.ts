import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1099div } from "../../../../../../nodes/inputs/income/investments/f1099div/index.ts";
import { f1099oid } from "../../../../../../nodes/inputs/income/investments/f1099oid/index.ts";
import { k1Partnership } from "../../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import { calculateForm4952 } from "../../../../../../nodes/intermediate/forms/deductions/investments/form4952/index.ts";
import { form4952Pdf } from "../../../../../pdf/forms/deductions/investments/f4952.ts";
import { form4952 } from "./f4952.ts";
import { testFiler } from "../../../../execution/test-filer.ts";

const filer = testFiler();
const build: typeof form4952.build = (fields, context) =>
  form4952.build(fields, { ...context, filer });

const payer = {
  payerName: "Investment Fund",
  isNominee: false,
  box11: false,
  box1a: 500,
  box1b: 100,
  investment_property_for_form4952: true,
};
const partnership = {
  partnership_name: "Portfolio Partnership",
  partnership_ein: "123456789",
  source_document_reference: "filed-2025-k1-code-h",
  recipient_tin: "123456789",
  box13_code_h_investment_interest: 300,
};
const inputs = {
  source_1099_dividends: 500,
  source_1099_qualified_dividends: 100,
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
  f1099div: { f1099divs: [payer] },
  k1_partnership: { k1_partnerships: [partnership] },
  schedule_a: { line_9_investment_interest: 300 },
  standard_deduction: { itemized_deductions: 20_000 },
  income_tax_calculation: { taking_standard_deduction: false },
  f1040: {
    line3a_qualified_dividends: 100,
    line3b_ordinary_dividends: 500,
    line12e_itemized_deductions: 20_000,
  },
};

Deno.test("Form 4952 limits K-1 code H expense using 1099-DIV ordinary less qualified dividends", () => {
  const fromDividend = f1099div.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.f1099div,
  );
  const fromPartnership = k1Partnership.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.k1_partnership,
  );
  assertEquals(
    fromDividend.outputs.find((entry) =>
      entry.nodeType === "form4952" &&
      entry.fields.source_1099_dividends === 500
    )?.fields.source_1099_qualified_dividends,
    100,
  );
  assertEquals(
    fromPartnership.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.source_k1_investment_interest,
    300,
  );
  assertEquals(fields.line4b, 100);
  assertEquals(fields.line8, 300);
  assertStringIncludes(
    build(fields, { pending }),
    "<InvestmentInterestExpDeductAmt>300</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(form4952Pdf.projectFields?.(fields, pending), fields);
});

Deno.test("Form 4952 combines K-1 code H, taxable OID, and ordinary less qualified dividends", () => {
  const oidPayer = {
    payer_name: "Taxable OID Bond",
    box1_oid: 200,
    investment_property_for_form4952: true,
  };
  const mixedInputs = { ...inputs, source_1099_interest: 200 };
  const mixedFields = { ...mixedInputs, ...calculateForm4952(mixedInputs) };
  const mixedPending = {
    ...pending,
    f1099oid: { f1099oids: [oidPayer] },
    f1040: { ...pending.f1040, line2b_taxable_interest: 200 },
  };
  const fromOid = f1099oid.compute(
    { taxYear: 2025, formType: "f1040" },
    mixedPending.f1099oid,
  );
  assertEquals(
    fromOid.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.source_1099_interest,
    200,
  );
  assertEquals(mixedFields.line4a, 700);
  assertEquals(mixedFields.line4b, 100);
  assertEquals(mixedFields.line8, 300);
  assertStringIncludes(
    build(mixedFields, { pending: mixedPending }),
    "<InvestmentPropGrossIncomeAmt>700</InvestmentPropGrossIncomeAmt>",
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
    const altered = { ...mixedPending, f1099oid: { f1099oids: [changed] } };
    assertThrows(
      () => build(mixedFields, { pending: altered }),
      Error,
      "supports only identified code H K-1 expenses",
    );
    assertThrows(
      () => form4952Pdf.projectFields?.(mixedFields, altered),
      Error,
      "supports only identified code H K-1 expenses",
    );
  }
  assertThrows(
    () =>
      build(mixedFields, {
        pending: {
          ...mixedPending,
          f1040: { ...mixedPending.f1040, line2b_taxable_interest: 199 },
        },
      }),
    Error,
    "differ from finalized Schedule A and Form 1040",
  );
  assertThrows(
    () =>
      build(mixedFields, {
        pending: { ...mixedPending, f1099int: { f1099ints: [] } },
      }),
    Error,
    "supports only identified code H K-1 expenses",
  );
});

Deno.test("Form 4952 mixed K-1/1099-DIV route rejects unsupported and conflicting facts", () => {
  assertThrows(
    () => build(fields),
    Error,
    "needs its issued partnership K-1 recipients",
  );
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
        f1099div: { f1099divs: [{ ...payer, box7: 10 }] },
      }),
    Error,
    "supports only identified code H K-1 expenses",
  );
  assertThrows(
    () =>
      build(fields, {
        pending: {
          ...pending,
          k1_partnership: {
            k1_partnerships: [{ ...partnership, box5_interest: 20 }],
          },
        },
      }),
    Error,
    "supports only identified code H K-1 expenses",
  );
  assertThrows(
    () =>
      build({ ...fields, source_1099_qualified_dividends: 90 }, {
        pending,
      }),
    Error,
    "supports only identified code H K-1 expenses",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...pending,
        f1040: { ...pending.f1040, line3a_qualified_dividends: 90 },
      }),
    Error,
    "differ from finalized Schedule A and Form 1040",
  );
});

Deno.test("Form 4952 mixed K-1/1099-DIV route matches multiple sources without payer order", () => {
  const secondPayer = {
    ...payer,
    payerName: "Second Investment Fund",
    box1a: 250,
    box1b: 50,
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
    source_1099_dividends: [250, 500],
    source_1099_qualified_dividends: [50, 100],
    source_k1_investment_interest: [150, 300],
  };
  const multiFields = { ...multiInputs, ...calculateForm4952(multiInputs) };
  const multiPending = {
    ...pending,
    f1099div: { f1099divs: [payer, secondPayer] },
    k1_partnership: { k1_partnerships: [partnership, secondPartnership] },
    schedule_a: { line_9_investment_interest: 450 },
    f1040: {
      ...pending.f1040,
      line3a_qualified_dividends: 150,
      line3b_ordinary_dividends: 750,
    },
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
