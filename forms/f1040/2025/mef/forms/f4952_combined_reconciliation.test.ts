import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1099int } from "../../../nodes/inputs/f1099int/index.ts";
import { f1099div } from "../../../nodes/inputs/f1099div/index.ts";
import {
  calculateForm4952,
  form4952 as form4952Node,
} from "../../../nodes/intermediate/forms/form4952/index.ts";
import { form4952Pdf } from "../../pdf/forms/f4952.ts";
import { form4952 } from "./f4952.ts";

const interest = {
  payer_name: "Investment Bank",
  box1: 500,
  investment_property_for_form4952: true,
};
const dividend = {
  payerName: "Investment Fund",
  isNominee: false,
  box11: false,
  box1a: 400,
  investment_property_for_form4952: true,
};
const inputs = {
  investment_interest_expense: 300,
  source_1099_interest: 500,
  source_1099_dividends: 400,
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
  f1099int: { f1099ints: [interest] },
  f1099div: { f1099divs: [dividend] },
  schedule_a: { line_9_investment_interest: 300 },
  standard_deduction: { itemized_deductions: 20_000 },
  income_tax_calculation: { taking_standard_deduction: false },
  f1040: {
    line2b_taxable_interest: 500,
    line3b_ordinary_dividends: 400,
    line12e_itemized_deductions: 20_000,
  },
};

Deno.test("Form 4952 reconciles one investment 1099-INT and one 1099-DIV through MeF and PDF", () => {
  const intOutput = f1099int.compute(
    { taxYear: 2025, formType: "f1040" },
    { f1099ints: [interest] },
  );
  const divOutput = f1099div.compute(
    { taxYear: 2025, formType: "f1040" },
    { f1099divs: [dividend] },
  );
  assertEquals(
    intOutput.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.source_1099_interest,
    500,
  );
  assertEquals(
    divOutput.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.source_1099_dividends,
    400,
  );
  const calculated = form4952Node.compute(
    { taxYear: 2025, formType: "f1040" },
    inputs,
  );
  assertEquals(
    calculated.outputs.find((entry) => entry.nodeType === "form4952")
      ?.fields.line4a,
    900,
  );
  assertEquals(
    calculated.outputs.find((entry) => entry.nodeType === "schedule_a")
      ?.fields.line_9_investment_interest,
    300,
  );
  const xml = form4952.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<InvestmentPropGrossIncomeAmt>900</InvestmentPropGrossIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<InvestmentInterestExpDeductAmt>300</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(form4952Pdf.projectFields?.(fields, pending), fields);
});

Deno.test("Form 4952 reconciles domestic Treasury box 3 with ordinary dividends", () => {
  for (
    const treasury of [
      { ...interest, box1: 0, box3: 500 },
      { ...interest, box1: 200, box3: 300 },
    ]
  ) {
    const intOutput = f1099int.compute(
      { taxYear: 2025, formType: "f1040" },
      { f1099ints: [treasury] },
    );
    assertEquals(
      intOutput.outputs.find((entry) => entry.nodeType === "form4952")
        ?.fields.source_1099_interest,
      500,
    );
    const treasuryPending = {
      ...pending,
      f1099int: { f1099ints: [treasury] },
    };
    assertStringIncludes(
      form4952.build(fields, { pending: treasuryPending }),
      "<InvestmentPropGrossIncomeAmt>900</InvestmentPropGrossIncomeAmt>",
    );
    assertEquals(
      form4952Pdf.projectFields?.(fields, treasuryPending),
      fields,
    );
    assertThrows(
      () =>
        form4952.build(fields, {
          pending: {
            ...treasuryPending,
            f1099int: {
              f1099ints: [{ ...treasury, box12: 10 }],
            },
          },
        }),
      Error,
      "supports only unadjusted box 1 or box 3",
    );
    assertThrows(
      () =>
        form4952Pdf.projectFields?.(fields, {
          ...treasuryPending,
          f1040: {
            ...pending.f1040,
            line2b_taxable_interest: 499,
          },
        }),
      Error,
      "differs from finalized Schedule A and Form 1040",
    );
    assertThrows(
      () =>
        form4952.build(fields, {
          pending: {
            ...treasuryPending,
            f1099oid: {
              f1099oids: [{
                payer_name: "OID issuer",
                box1_oid: 250,
                investment_property_for_form4952: true,
              }],
            },
          },
        }),
      Error,
      "supports only unadjusted box 1 or box 3",
    );
  }
});

Deno.test("Form 4952 combined interest and dividend route excludes qualified box 1b without a line 4g election", () => {
  const qualifiedDividend = { ...dividend, box1b: 100 };
  const source = f1099div.compute(
    { taxYear: 2025, formType: "f1040" },
    { f1099divs: [qualifiedDividend] },
  );
  assertEquals(
    source.outputs.find((entry) =>
      entry.nodeType === "form4952" &&
      entry.fields.source_1099_dividends === 400
    )?.fields.source_1099_qualified_dividends,
    100,
  );
  const qualifiedInputs = {
    ...inputs,
    investment_interest_expense: 900,
    source_1099_qualified_dividends: 100,
  };
  const qualifiedFields = {
    ...qualifiedInputs,
    ...calculateForm4952(qualifiedInputs),
  };
  const qualifiedPending = {
    ...pending,
    f1099div: { f1099divs: [qualifiedDividend] },
    schedule_a: { line_9_investment_interest: 800 },
    f1040: {
      ...pending.f1040,
      line3a_qualified_dividends: 100,
    },
  };
  assertEquals(qualifiedFields.line4a, 900);
  assertEquals(qualifiedFields.line4b, 100);
  assertEquals(qualifiedFields.line4h, 800);
  assertEquals(qualifiedFields.line8, 800);
  assertStringIncludes(
    form4952.build(qualifiedFields, { pending: qualifiedPending }),
    "<InvestmentPropQualDividendsAmt>100</InvestmentPropQualDividendsAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(qualifiedFields, qualifiedPending),
    qualifiedFields,
  );
  assertThrows(
    () =>
      form4952.build({
        ...qualifiedFields,
        source_1099_qualified_dividends: 90,
      }, { pending: qualifiedPending }),
    Error,
    "supports only unadjusted box 1 or box 3 interest",
  );
  assertThrows(
    () =>
      form4952.build(qualifiedFields, {
        pending: {
          ...qualifiedPending,
          f1040: {
            ...qualifiedPending.f1040,
            line3a_qualified_dividends: 90,
          },
        },
      }),
    Error,
    "differs from finalized Schedule A and Form 1040",
  );
});

Deno.test("Form 4952 combined route rejects missing and conflicting finalized sources", () => {
  assertThrows(
    () => form4952.build(fields),
    Error,
    "combined path needs 1099 interest and dividend sources",
  );
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: { ...pending, f1099div: { f1099divs: [] } },
      }),
    Error,
    "supports only unadjusted box 1 or box 3 interest",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...pending,
        f1040: { ...pending.f1040, line3b_ordinary_dividends: 350 },
      }),
    Error,
    "differs from finalized Schedule A and Form 1040",
  );
  assertThrows(
    () => form4952Pdf.projectFields?.({ ...fields, line8: 200 }, pending),
    Error,
    "combined numbered lines differ",
  );
});

Deno.test("Form 4952 combined route rejects foreign, qualified, and extra-payer branches", () => {
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: {
          ...pending,
          f1099int: {
            f1099ints: [{ ...interest, foreign_source_interest_usd: 500 }],
          },
        },
      }),
    Error,
    "does not reconcile foreign-source income or foreign tax",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...pending,
        f1099div: { f1099divs: [{ ...dividend, box7: 25 }] },
      }),
    Error,
    "does not reconcile foreign-source income or foreign tax",
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
    "supports only unadjusted box 1 or box 3 interest",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...pending,
        f1099int: { f1099ints: [interest, interest] },
      }),
    Error,
    "supports only unadjusted box 1 or box 3 interest",
  );
});

Deno.test("Form 4952 sums several identified interest and dividend payers through MeF and PDF", () => {
  const interestSources = [
    interest,
    { ...interest, payer_name: "Second Bank", box1: 250 },
  ];
  const dividendSources = [
    dividend,
    { ...dividend, payerName: "Second Fund", box1a: 300 },
  ];
  assertEquals(
    f1099int.compute(
      { taxYear: 2025, formType: "f1040" },
      { f1099ints: interestSources },
    ).outputs.filter((entry) => entry.nodeType === "form4952").map(
      (entry) => entry.fields.source_1099_interest,
    ),
    [500, 250],
  );
  assertEquals(
    f1099div.compute(
      { taxYear: 2025, formType: "f1040" },
      { f1099divs: dividendSources },
    ).outputs.filter((entry) => entry.nodeType === "form4952").map(
      (entry) => entry.fields.source_1099_dividends,
    ),
    [400, 300],
  );
  const multiInputs = {
    ...inputs,
    source_1099_interest: [500, 250],
    source_1099_dividends: [400, 300],
  };
  const multiFields = { ...multiInputs, ...calculateForm4952(multiInputs) };
  const multiPending = {
    ...pending,
    f1099int: { f1099ints: interestSources },
    f1099div: { f1099divs: dividendSources },
    f1040: {
      ...pending.f1040,
      line2b_taxable_interest: 750,
      line3b_ordinary_dividends: 700,
    },
  };
  const xml = form4952.build(multiFields, { pending: multiPending });
  assertStringIncludes(
    xml,
    "<InvestmentPropGrossIncomeAmt>1450</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(multiFields, multiPending),
    multiFields,
  );
  assertEquals(
    form4952Pdf.projectFields?.({
      ...multiFields,
      source_1099_interest: [250, 500],
      source_1099_dividends: [300, 400],
    }, multiPending)?.line4a,
    multiFields.line4a,
  );
  assertThrows(
    () =>
      form4952.build({
        ...multiFields,
        source_1099_interest: [600, 150],
      }, { pending: multiPending }),
    Error,
    "supports only unadjusted box 1 or box 3 interest",
  );
  assertThrows(
    () =>
      form4952.build(multiFields, {
        pending: {
          ...multiPending,
          f1099int: {
            f1099ints: [
              interest,
              { ...interest, payer_name: "Second Bank", box1: 250, box6: 20 },
            ],
          },
        },
      }),
    Error,
    "does not reconcile foreign-source income or foreign tax",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(multiFields, {
        ...multiPending,
        f1099div: { f1099divs: [dividend] },
      }),
    Error,
    "supports only unadjusted box 1 or box 3 interest",
  );
});
