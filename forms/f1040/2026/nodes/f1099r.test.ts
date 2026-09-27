import { assertEquals, assertThrows } from "@std/assert";
import { f1099r_2026, f1099rItem2026Schema } from "./f1099r.ts";

const base = {
  payer_name: "IRA Custodian",
  payer_ein: "123456789",
  recipient: "taxpayer" as const,
  box1_gross_distribution: 5_000,
  box2a_taxable_amount: 5_000,
  box7a_codes: ["7"],
  box7b_ira_sep_simple: true,
};
const context = { taxYear: 2026, formType: "f1040" };

Deno.test("TY2026 Form 1099-R accepts its renamed normal distribution boxes", () => {
  const result = f1099r_2026.compute(context, { statements: [base] });
  assertEquals(
    result.outputs.find((output) => output.nodeType === "agi_aggregator")
      ?.fields,
    {
      line4b_ira_taxable: 5_000,
    },
  );
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f1040")?.fields
      .line4a_ira_gross,
    5_000,
  );
  assertEquals(
    f1099rItem2026Schema.safeParse({
      ...base,
      box7_distribution_code: "7",
    }).success,
    false,
  );
});

Deno.test("TY2026 Form 1099-R rejects unaudited distribution branches", () => {
  for (
    const statement of [
      { ...base, box7a_codes: ["Y", "7"] },
      { ...base, box7c_trump_account: true },
      { ...base, box7d_earnings_on_excess_contributions: 100 },
      { ...base, box2a_taxable_amount: 4_000 },
      { ...base, box8b_pct_annuity_contract: 50 },
    ]
  ) {
    assertThrows(
      () => f1099r_2026.compute(context, { statements: [statement] }),
      Error,
      "distribution needs its code, basis, or special-account calculation route",
    );
  }
});

Deno.test("TY2026 code G keeps pension rollover gross and taxable amounts separate", () => {
  const taxFree = f1099r_2026.compute(context, {
    statements: [{
      ...base,
      box1_gross_distribution: 20_000,
      box2a_taxable_amount: 0,
      box7a_codes: ["G"],
      box7b_ira_sep_simple: false,
    }],
  });
  assertEquals(
    taxFree.outputs.some((output) => output.nodeType === "agi_aggregator"),
    false,
  );
  assertEquals(
    taxFree.outputs.find((output) => output.nodeType === "f1040")?.fields
      .line5b_pension_taxable,
    0,
  );
  const result = f1099r_2026.compute(context, {
    statements: [
      {
        ...base,
        payer_name: "Pension Plan",
        box1_gross_distribution: 20_000,
        box2a_taxable_amount: 0,
        box7a_codes: ["G"],
        box7b_ira_sep_simple: false,
      },
      {
        ...base,
        payer_name: "Roth Rollover Plan",
        box1_gross_distribution: 10_000,
        box2a_taxable_amount: 7_000,
        box5_employee_contributions_or_insurance_premiums: 3_000,
        box7a_codes: ["G"],
        box7b_ira_sep_simple: false,
      },
    ],
  });
  assertEquals(
    result.outputs.find((output) => output.nodeType === "agi_aggregator")
      ?.fields.line5b_pension_taxable,
    7_000,
  );
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")
    ?.fields;
  assertEquals(f1040?.line5a_pension_gross, 30_000);
  assertEquals(f1040?.line5b_pension_taxable, 7_000);
  assertEquals(f1040?.line5c_rollover, true);
  for (
    const statement of [
      { ...base, box7a_codes: ["G"], box2a_taxable_amount: 0 },
      {
        ...base,
        box7a_codes: ["G"],
        box7b_ira_sep_simple: false,
        box2a_taxable_amount: 6_000,
      },
    ]
  ) {
    assertThrows(
      () => f1099r_2026.compute(context, { statements: [statement] }),
      Error,
      "distribution needs its code, basis, or special-account calculation route",
    );
  }
});

Deno.test("TY2026 code 1 reports full early-distribution tax on Schedule 2", () => {
  const result = f1099r_2026.compute(context, {
    statements: [{
      ...base,
      box7a_codes: ["1"],
      early_distribution_tax_facts: {
        full_amount_subject_to_additional_tax: true,
        simple_ira_in_first_two_years: false,
      },
    }],
  });
  assertEquals(
    result.outputs.find((output) => output.nodeType === "schedule2")?.fields,
    {
      line5_form5329_early_tax: 500,
    },
  );
  assertEquals(
    result.outputs.some((output) => output.nodeType === "form5329"),
    false,
  );
  assertThrows(
    () =>
      f1099r_2026.compute(context, {
        statements: [
          {
            ...base,
            box7a_codes: ["1"],
            early_distribution_tax_facts: {
              full_amount_subject_to_additional_tax: true,
              simple_ira_in_first_two_years: false,
            },
          },
          base,
        ],
      }),
    Error,
    "mixed codes need Form 5329 review",
  );
  assertThrows(
    () =>
      f1099r_2026.compute(context, {
        statements: [{
          ...base,
          box7a_codes: ["1"],
        }],
      }),
    Error,
    "needs full-tax and SIMPLE-period facts",
  );
  const simple = f1099r_2026.compute(context, {
    statements: [{
      ...base,
      box7a_codes: ["1"],
      early_distribution_tax_facts: {
        full_amount_subject_to_additional_tax: true,
        simple_ira_in_first_two_years: true,
      },
    }],
  });
  assertEquals(
    simple.outputs.find((output) => output.nodeType === "form5329")?.fields,
    {
      recipient: "taxpayer",
      regular_early_distribution: 0,
      early_simple_ira_distribution: 5_000,
    },
  );
  const mixed = f1099r_2026.compute(context, {
    statements: [
      base,
      {
        ...base,
        box7a_codes: ["1"],
        early_distribution_tax_facts: {
          full_amount_subject_to_additional_tax: true,
          simple_ira_in_first_two_years: true,
        },
      },
    ],
  });
  assertEquals(
    mixed.outputs.find((output) => output.nodeType === "form5329")?.fields
      .early_simple_ira_distribution,
    5_000,
  );
  assertEquals(
    mixed.outputs.find((output) => output.nodeType === "agi_aggregator")
      ?.fields.line4b_ira_taxable,
    10_000,
  );
  assertThrows(
    () =>
      f1099r_2026.compute(context, {
        statements: [
          {
            ...base,
            box7a_codes: ["1"],
            early_distribution_tax_facts: {
              full_amount_subject_to_additional_tax: true,
              simple_ira_in_first_two_years: true,
            },
          },
          {
            ...base,
            recipient: "spouse",
            box7a_codes: ["1"],
            early_distribution_tax_facts: {
              full_amount_subject_to_additional_tax: true,
              simple_ira_in_first_two_years: false,
            },
          },
        ],
      }),
    Error,
    "separate taxpayer and spouse Form 5329 paths",
  );
});
