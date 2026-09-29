import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1099int } from "../../../nodes/inputs/f1099int/index.ts";
import { f1099oid } from "../../../nodes/inputs/f1099oid/index.ts";
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
const inputs = {
  investment_interest_expense: 300,
  source_1099_interest: 500,
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
  schedule_a: { line_9_investment_interest: 300 },
  standard_deduction: { itemized_deductions: 20_000 },
  income_tax_calculation: { taking_standard_deduction: false },
  f1040: {
    line2b_taxable_interest: 500,
    line12e_itemized_deductions: 20_000,
  },
};

Deno.test("Form 4952 sources one 1099-INT box 1 payer through MeF and PDF", () => {
  const source = f1099int.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099ints: [interest],
  });
  assertEquals(
    source.outputs.find((entry) =>
      entry.nodeType === "form4952" &&
      entry.fields.source_1099_interest === 500
    )?.fields.source_1099_interest,
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

Deno.test("Form 4952 sources taxable 1099-INT box 3 interest", () => {
  const treasury = {
    payer_name: "Treasury Interest Payer",
    box3: 500,
    investment_property_for_form4952: true,
  };
  const source = f1099int.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099ints: [treasury],
  });
  assertEquals(
    source.outputs.find((entry) =>
      entry.nodeType === "form4952" &&
      entry.fields.source_1099_interest === 500
    )?.fields.source_1099_interest,
    500,
  );
  const box3Pending = {
    ...pending,
    f1099int: { f1099ints: [treasury] },
  };
  assertStringIncludes(
    form4952.build(fields, { pending: box3Pending }),
    "<InvestmentPropGrossIncomeAmt>500</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(form4952Pdf.projectFields?.(fields, box3Pending), fields);

  for (
    const changed of [
      { ...treasury, box2: 10 },
      { ...treasury, box12: 10 },
      { ...treasury, investment_property_for_form4952: false },
    ]
  ) {
    assertThrows(
      () =>
        form4952.build(fields, {
          pending: { ...box3Pending, f1099int: { f1099ints: [changed] } },
        }),
      Error,
      "unadjusted box 1 or box 3 investment payers",
    );
  }
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...box3Pending,
        f1040: { ...pending.f1040, line2b_taxable_interest: 400 },
      }),
    Error,
    "differs from finalized Schedule A and Form 1040",
  );
});

Deno.test("Form 4952 reconciles mixed box 1, box 3, and OID payers", () => {
  const treasury = {
    payer_name: "Treasury Interest Payer",
    box3: 250,
    investment_property_for_form4952: true,
  };
  const oid = {
    payer_name: "Investment Bond Issuer",
    box1_oid: 125,
    investment_property_for_form4952: true,
  };
  const mixedInputs = {
    ...inputs,
    source_1099_interest: [500, 250, 125],
  };
  const mixedFields = { ...mixedInputs, ...calculateForm4952(mixedInputs) };
  const mixedPending = {
    ...pending,
    f1099int: { f1099ints: [interest, treasury] },
    f1099oid: { f1099oids: [oid] },
    f1040: { ...pending.f1040, line2b_taxable_interest: 875 },
  };
  assertStringIncludes(
    form4952.build(mixedFields, { pending: mixedPending }),
    "<InvestmentPropGrossIncomeAmt>875</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(mixedFields, mixedPending),
    mixedFields,
  );
  assertThrows(
    () =>
      form4952.build(
        { ...mixedFields, source_1099_interest: [500, 275, 100] },
        { pending: mixedPending },
      ),
    Error,
    "unadjusted box 1 or box 3 investment payers",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(mixedFields, {
        ...mixedPending,
        f1099int: {
          f1099ints: [interest, { ...treasury, box12: 10 }],
        },
      }),
    Error,
    "unadjusted box 1 or box 3 investment payers",
  );
});

Deno.test("Form 4952 matches one 1099-INT payer containing both boxes 1 and 3", () => {
  const payer = {
    payer_name: "Investment Bond Payer",
    box1: 200,
    box3: 300,
    investment_property_for_form4952: true,
  };
  const source = f1099int.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099ints: [payer],
  });
  assertEquals(
    source.outputs.find((entry) =>
      entry.nodeType === "form4952" &&
      entry.fields.source_1099_interest === 500
    )?.fields.source_1099_interest,
    500,
  );
  const payerPending = {
    ...pending,
    f1099int: { f1099ints: [payer] },
  };
  assertStringIncludes(
    form4952.build(fields, { pending: payerPending }),
    "<InvestmentPropGrossIncomeAmt>500</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(form4952Pdf.projectFields?.(fields, payerPending), fields);
});

Deno.test("Form 4952 sources plain taxable 1099-OID box 1 through MeF and PDF", () => {
  const oid = {
    payer_name: "Investment Bond Issuer",
    box1_oid: 500,
    investment_property_for_form4952: true,
  };
  const source = f1099oid.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099oids: [oid],
  });
  assertEquals(
    source.outputs.find((entry) =>
      entry.nodeType === "form4952" &&
      entry.fields.source_1099_interest === 500
    )?.fields.source_1099_interest,
    500,
  );
  const oidPending = {
    ...Object.fromEntries(
      Object.entries(pending).filter(([key]) => key !== "f1099int"),
    ),
    f1099oid: { f1099oids: [oid] },
  };
  const xml = form4952.build(fields, { pending: oidPending });
  assertStringIncludes(
    xml,
    "<InvestmentPropGrossIncomeAmt>500</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(form4952Pdf.projectFields?.(fields, oidPending), fields);
});

Deno.test("Form 4952 OID route rejects adjusted and tax-exempt sources", () => {
  const oid = {
    payer_name: "Investment Bond Issuer",
    box1_oid: 500,
    investment_property_for_form4952: true,
  };
  const oidPending = {
    ...Object.fromEntries(
      Object.entries(pending).filter(([key]) => key !== "f1099int"),
    ),
    f1099oid: { f1099oids: [oid] },
  };
  for (
    const adjustment of [
      { box6_acquisition_premium: 20, box6_applies_to: "taxable_oid" },
      { box8_oid_treasury: 20 },
      { box11_tax_exempt_oid: 20, box11_pab_oid: 0 },
      { nominee_oid: 20 },
      { box9_investment_expenses: 20 },
    ]
  ) {
    assertThrows(
      () =>
        form4952.build(fields, {
          pending: {
            ...oidPending,
            f1099oid: { f1099oids: [{ ...oid, ...adjustment }] },
          },
        }),
      Error,
      "supports only unadjusted box 1 or box 3 investment payers",
    );
  }
});

Deno.test("Form 4952 combines plain 1099-INT and 1099-OID investment interest", () => {
  const oid = {
    payer_name: "Investment Bond Issuer",
    box1_oid: 250,
    investment_property_for_form4952: true,
  };
  const mixedInputs = { ...inputs, source_1099_interest: [500, 250] };
  const mixedFields = { ...mixedInputs, ...calculateForm4952(mixedInputs) };
  const mixedPending = {
    ...pending,
    f1099oid: { f1099oids: [oid] },
    f1040: { ...pending.f1040, line2b_taxable_interest: 750 },
  };
  assertStringIncludes(
    form4952.build(mixedFields, { pending: mixedPending }),
    "<InvestmentPropGrossIncomeAmt>750</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(mixedFields, mixedPending),
    mixedFields,
  );
  assertThrows(
    () =>
      form4952.build(
        { ...mixedFields, source_1099_interest: [600, 150] },
        { pending: mixedPending },
      ),
    Error,
    "supports only unadjusted box 1 or box 3 investment payers",
  );
  assertThrows(
    () =>
      form4952.build(mixedFields, {
        pending: {
          ...mixedPending,
          f1099oid: {
            f1099oids: [{
              ...oid,
              box6_acquisition_premium: 10,
              box6_applies_to: "taxable_oid",
            }],
          },
        },
      }),
    Error,
    "supports only unadjusted box 1 or box 3 investment payers",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(mixedFields, {
        ...mixedPending,
        f1099int: {
          f1099ints: [{
            ...interest,
            box6: 10,
            foreign_source_interest_usd: 500,
          }],
        },
      }),
    Error,
    "does not reconcile foreign-source interest or foreign tax",
  );
});

Deno.test("Form 4952 matches every plain 1099-OID payer before export", () => {
  const oidPayers = [
    {
      payer_name: "First Bond Issuer",
      box1_oid: 500,
      investment_property_for_form4952: true,
    },
    {
      payer_name: "Second Bond Issuer",
      box1_oid: 250,
      investment_property_for_form4952: true,
    },
  ];
  const multiInputs = { ...inputs, source_1099_interest: [500, 250] };
  const multiFields = { ...multiInputs, ...calculateForm4952(multiInputs) };
  const oidPending = {
    ...Object.fromEntries(
      Object.entries(pending).filter(([key]) => key !== "f1099int"),
    ),
    f1099oid: { f1099oids: oidPayers },
    f1040: { ...pending.f1040, line2b_taxable_interest: 750 },
  };
  assertStringIncludes(
    form4952.build(multiFields, { pending: oidPending }),
    "<InvestmentPropGrossIncomeAmt>750</InvestmentPropGrossIncomeAmt>",
  );
  assertThrows(
    () =>
      form4952.build(
        { ...multiFields, source_1099_interest: [600, 150] },
        { pending: oidPending },
      ),
    Error,
    "supports only unadjusted box 1 or box 3 investment payers",
  );
});

Deno.test("Form 4952 interest route rejects foreign-tax and adjusted-interest branches", () => {
  assertStringIncludes(
    form4952.build(fields, {
      pending: {
        ...pending,
        form_1116: { worldwide_gross_income: 500 },
      },
    }),
    "<InvestmentInterestExpDeductAmt>300</InvestmentInterestExpDeductAmt>",
  );
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: { ...pending, form_1116: { foreign_tax_paid: 50 } },
      }),
    Error,
    "needs source-backed investment-interest allocation",
  );
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: {
          ...pending,
          f1099int: {
            f1099ints: [{
              ...interest,
              box6: 50,
              foreign_source_interest_usd: 500,
              foreign_tax_irs_country_code: "CA",
            }],
          },
        },
      }),
    Error,
    "does not reconcile foreign-source interest or foreign tax",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(fields, {
        ...pending,
        f1099int: { f1099ints: [{ ...interest, box5: 20 }] },
      }),
    Error,
    "supports only unadjusted box 1 or box 3 investment payers",
  );
});

Deno.test("Form 4952 reconciles multiple ordinary investment-interest payers", () => {
  const sources = [interest, {
    ...interest,
    payer_name: "Second Bank",
    box1: 250,
  }];
  const multiInputs = { ...inputs, source_1099_interest: [500, 250] };
  const multiFields = { ...multiInputs, ...calculateForm4952(multiInputs) };
  const multiPending = {
    ...pending,
    f1099int: { f1099ints: sources },
    f1040: { ...pending.f1040, line2b_taxable_interest: 750 },
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
        source_1099_interest: [600, 150],
      }, { pending: multiPending }),
    Error,
    "supports only unadjusted box 1 or box 3 investment payers",
  );
  assertThrows(
    () =>
      form4952.build(multiFields, {
        pending: {
          ...multiPending,
          f1099int: { f1099ints: [interest, { ...sources[1], box5: 10 }] },
        },
      }),
    Error,
    "supports only unadjusted box 1 or box 3 investment payers",
  );
});

Deno.test("Form 4952 interest route rejects absent, conflicting, and mixed source facts", () => {
  assertThrows(
    () => form4952.build(fields),
    Error,
    "needs its 1099-INT or 1099-OID, completed Form 4952",
  );
  assertThrows(
    () =>
      form4952.build(fields, {
        pending: {
          ...pending,
          f1040: {
            line2b_taxable_interest: 400,
            line12e_itemized_deductions: 20_000,
          },
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
  assertThrows(
    () =>
      form4952.build({ ...fields, source_1099_dividends: 100 }, {
        pending,
      }),
    Error,
    "combined path needs 1099 interest and dividend sources",
  );
});
