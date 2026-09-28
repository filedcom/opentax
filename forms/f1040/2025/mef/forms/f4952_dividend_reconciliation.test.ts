import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1099div } from "../../../nodes/inputs/f1099div/index.ts";
import {
  calculateForm4952,
  form4952 as form4952Node,
} from "../../../nodes/intermediate/forms/form4952/index.ts";
import { form4952Pdf } from "../../pdf/forms/f4952.ts";
import { form4952 } from "./f4952.ts";

const dividend = {
  payerName: "Investment Fund",
  isNominee: false,
  box11: false,
  box1a: 500,
  investment_property_for_form4952: true,
};
const inputs = {
  investment_interest_expense: 300,
  source_1099_dividends: 500,
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
  f1099div: { f1099divs: [dividend] },
  schedule_a: { line_9_investment_interest: 300 },
  standard_deduction: { itemized_deductions: 20_000 },
  income_tax_calculation: { taking_standard_deduction: false },
  f1040: {
    line3b_ordinary_dividends: 500,
    line12e_itemized_deductions: 20_000,
  },
};

Deno.test("Form 4952 sources a single investment-property ordinary dividend through MeF and PDF", () => {
  assertEquals(form4952Pdf.pageIndices?.({}), [0]);
  assertEquals(
    form4952Pdf.filerFields?.map((entry) => entry.domainKey),
    ["nameLine1", "primarySSN"],
  );
  const source = f1099div.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099divs: [dividend],
  });
  assertEquals(
    source.outputs.find((entry) =>
      entry.nodeType === "form4952" &&
      entry.fields.source_1099_dividends === 500
    )?.fields.source_1099_dividends,
    500,
  );
  assertEquals(
    source.outputs.find((entry) =>
      entry.nodeType === "f1040" &&
      entry.fields.line3b_ordinary_dividends === 500
    )?.fields.line3b_ordinary_dividends,
    500,
  );
  const calculated = form4952Node.compute(
    { taxYear: 2025, formType: "f1040" },
    inputs,
  );
  assertEquals(
    calculated.outputs.find((entry) => entry.nodeType === "schedule_a")
      ?.fields.line_9_investment_interest,
    300,
  );
  assertEquals(
    calculated.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.line4a,
    500,
  );
  const xml = form4952.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<InvestmentPropGrossIncomeAmt>500</InvestmentPropGrossIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<InvestmentInterestExpDeductAmt>300</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(form4952Pdf.projectFields?.(fields, pending), fields);
});

Deno.test("Form 4952 reconciles qualified 1099-DIV income without a line 4g election", () => {
  const qualifiedDividend = { ...dividend, box1b: 100 };
  const qualifiedInputs = {
    ...inputs,
    source_1099_qualified_dividends: 100,
  };
  const qualifiedFields = {
    ...qualifiedInputs,
    ...calculateForm4952(qualifiedInputs),
  };
  const qualifiedPending = {
    ...pending,
    f1099div: { f1099divs: [qualifiedDividend] },
    f1040: {
      ...pending.f1040,
      line3a_qualified_dividends: 100,
    },
  };
  const source = f1099div.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099divs: [qualifiedDividend],
  });
  assertEquals(
    source.outputs.find((entry) => entry.nodeType === "form4952")?.fields
      .source_1099_qualified_dividends,
    100,
  );
  assertEquals(qualifiedFields.line4a, 500);
  assertEquals(qualifiedFields.line4b, 100);
  assertEquals(qualifiedFields.line4h, 400);
  const xml = form4952.build(qualifiedFields, { pending: qualifiedPending });
  assertStringIncludes(
    xml,
    "<InvestmentPropQualDividendsAmt>100</InvestmentPropQualDividendsAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(qualifiedFields, qualifiedPending),
    qualifiedFields,
  );
  assertThrows(
    () =>
      form4952.build(qualifiedFields, {
        pending: {
          ...qualifiedPending,
          f1040: { ...qualifiedPending.f1040, line3a_qualified_dividends: 90 },
        },
      }),
    Error,
    "differs from finalized Schedule A and Form 1040",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(qualifiedFields, {
        ...qualifiedPending,
        f1099div: { f1099divs: [{ ...qualifiedDividend, box1b: 600 }] },
      }),
    Error,
    "supports only 1099-DIV box 1a/1b investment payers",
  );
  const electedInputs = {
    ...qualifiedInputs,
    investment_income_election: 50,
  };
  assertThrows(
    () =>
      form4952.build(
        { ...electedInputs, ...calculateForm4952(electedInputs) },
        { pending: qualifiedPending },
      ),
    Error,
    "supports only 1099-DIV box 1a/1b investment payers",
  );
});

Deno.test("Form 4952 dividend route rejects missing or conflicting source and return facts", () => {
  const unsourced = { ...fields, source_1099_dividends: undefined };
  assertThrows(
    () => form4952.build(unsourced, { pending }),
    Error,
    "needs a source-reconciled investment-income route",
  );
  assertThrows(
    () => form4952Pdf.projectFields?.(unsourced, pending),
    Error,
    "needs a source-reconciled investment-income route",
  );
  assertThrows(
    () => form4952.build(fields),
    Error,
    "needs its 1099-DIV, completed Form 4952, Schedule A line 9",
  );
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: {
          ...pending,
          f1099div: { f1099divs: [{ ...dividend, box1a: 400 }] },
        },
      }),
    Error,
    "supports only 1099-DIV box 1a/1b investment payers",
  );
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: {
          ...pending,
          schedule_a: { line_9_investment_interest: 200 },
        },
      }),
    Error,
    "differs from finalized Schedule A and Form 1040",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...pending,
        f1040: {
          line3b_ordinary_dividends: 400,
          line12e_itemized_deductions: 20_000,
        },
      }),
    Error,
    "differs from finalized Schedule A and Form 1040",
  );
  assertThrows(
    () => form4952Pdf.projectFields?.({ ...fields, line8: 400 }, pending),
    Error,
    "numbered lines differ",
  );
});

Deno.test("Form 4952 dividend route rejects unmatched qualified dividends and payer totals", () => {
  const extraK1 = {
    ...inputs,
    source_k1_interest: 50,
  };
  assertThrows(
    () =>
      form4952.build({ ...extraK1, ...calculateForm4952(extraK1) }, {
        pending,
      }),
    Error,
    "supports only 1099-DIV box 1a/1b investment payers",
  );
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: {
          ...pending,
          f1099div: { f1099divs: [{ ...dividend, box1b: 100 }] },
        },
      }),
    Error,
    "supports only 1099-DIV box 1a/1b investment payers",
  );
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: {
          ...pending,
          f1099div: { f1099divs: [dividend, dividend] },
        },
      }),
    Error,
    "supports only 1099-DIV box 1a/1b investment payers",
  );
});

Deno.test("Form 4952 reconciles multiple ordinary investment-dividend payers", () => {
  const sources = [
    dividend,
    { ...dividend, payerName: "Second Fund", box1a: 250 },
  ];
  const multiInputs = { ...inputs, source_1099_dividends: [500, 250] };
  const multiFields = { ...multiInputs, ...calculateForm4952(multiInputs) };
  const multiPending = {
    ...pending,
    f1099div: { f1099divs: sources },
    f1040: { ...pending.f1040, line3b_ordinary_dividends: 750 },
  };
  const xml = form4952.build(multiFields, { pending: multiPending });
  assertStringIncludes(
    xml,
    "<InvestmentPropGrossIncomeAmt>750</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(multiFields, multiPending),
    multiFields,
  );
  assertThrows(
    () =>
      form4952.build({
        ...multiFields,
        source_1099_dividends: [600, 150],
      }, { pending: multiPending }),
    Error,
    "supports only 1099-DIV box 1a/1b investment payers",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(multiFields, {
        ...multiPending,
        f1099div: {
          f1099divs: [dividend, { ...sources[1], box5: 10 }],
        },
      }),
    Error,
    "supports only 1099-DIV box 1a/1b investment payers",
  );
  assertThrows(
    () =>
      form4952.build(multiFields, {
        pending: {
          ...multiPending,
          f1099div: {
            f1099divs: [dividend, { ...sources[1], box7: 15 }],
          },
        },
      }),
    Error,
    "does not reconcile foreign-source dividends or foreign tax",
  );
});

Deno.test("Form 4952 dividend route rejects unreconciled foreign-tax allocation in MeF and PDF", () => {
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: {
          ...pending,
          f1099div: {
            f1099divs: [{
              ...dividend,
              box7: 50,
              foreign_source_dividends_usd: 500,
              foreign_tax_irs_country_code: "CA",
            }],
          },
        },
      }),
    Error,
    "does not reconcile foreign-source dividends or foreign tax",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...pending,
        f1099div: {
          f1099divs: [{ ...dividend, foreign_source_dividends_usd: 500 }],
        },
      }),
    Error,
    "does not reconcile foreign-source dividends or foreign tax",
  );
});
