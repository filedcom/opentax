import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import type { z } from "zod";
import { TS } from "../../types.ts";
import {
  DistributionCode,
  f1099r,
  iraDistributionExplanation,
  type itemSchema,
  RolloverCode,
  SelfCertificationReason,
} from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Item = z.infer<typeof itemSchema>;

function minimalIraItem(overrides: Partial<Item> = {}): Item {
  return {
    payer_name: "Test Payer",
    payer_ein: "12-3456789",
    box1_gross_distribution: 10000,
    box7_distribution_code: DistributionCode.Code7,
    box7_ira_simple_indicator: true,
    ts: TS.T,
    ...overrides,
  };
}

function priorBasisDistributionEvidence(yearEndValue: number) {
  return {
    prior_form8606: {
      tax_year: 2024 as const,
      source_document_reference: "2024 filed Form 8606",
      owner_ssn: "111223333",
      filed_line14_basis: 20_000,
    },
    year_end_statement: {
      as_of: "2025-12-31" as const,
      source_document_reference: "2025 all-IRA statement",
      owner_ssn: "111223333",
      all_traditional_ira_balances_included_confirmed: true as const,
      total_fair_market_value: yearEndValue,
    },
    form1099r_source_document_reference: "2025 issued Form 1099-R",
    no_current_nondeductible_contribution_confirmed: true as const,
    no_other_traditional_ira_distribution_or_conversion_confirmed:
      true as const,
    no_rollover_repayment_qcd_hsa_or_disaster_amount_confirmed: true as const,
  };
}

function minimalPensionItem(overrides: Partial<Item> = {}): Item {
  return {
    payer_name: "Test Pension",
    payer_ein: "98-7654321",
    source_document_reference: "default-pension-source",
    box1_gross_distribution: 10000,
    box7_distribution_code: DistributionCode.Code7,
    box7_ira_simple_indicator: false,
    ts: TS.T,
    ...overrides,
  };
}

function firstForm4972Source(
  result: ReturnType<typeof compute>,
): Record<string, unknown> | undefined {
  return (result.outputs.find((o) => o.nodeType === "form4972")?.fields
    .source_forms as Record<string, unknown>[] | undefined)?.[0];
}

function compute(items: Item[]) {
  return f1099r.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099rs: items,
  });
}

function findF1040(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "f1040");
}

function f1040Input(result: ReturnType<typeof compute>) {
  return (findF1040(result)?.fields ?? {}) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1. Input schema validation
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: missing required field (payer_name) throws", () => {
  assertThrows(() =>
    compute([{
      payer_ein: "12-3456789",
      box1_gross_distribution: 5000,
      box7_distribution_code: DistributionCode.Code7,
      box7_ira_simple_indicator: true,
    } as Item])
  );
});

Deno.test("f1099r.compute: empty items array throws", () => {
  assertThrows(() => compute([]));
});

Deno.test("f1099r.compute: zero box1_gross_distribution emits IRA lines with 0 taxable", () => {
  const result = compute([minimalIraItem({ box1_gross_distribution: 0 })]);
  // IRA item with 0 gross: active.length > 0 so line4b emitted, but no line4a (gross=0)
  const input = f1040Input(result);
  assertEquals(input.line4b_ira_taxable, 0);
  assertEquals(input.line4a_ira_gross, undefined);
});

Deno.test("f1099r.compute: zero box2a_taxable_amount emits zero line4b", () => {
  const result = compute([minimalIraItem({ box2a_taxable_amount: 0 })]);
  const input = f1040Input(result);
  assertEquals(input.line4b_ira_taxable, 0);
});

// ---------------------------------------------------------------------------
// 2. Per-box routing (IRA vs pension, plus basic positive/zero cases)
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: IRA distribution routes to f1040 lines 4a/4b", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 10000,
    box2a_taxable_amount: 10000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 10000);
  assertEquals(input.line4b_ira_taxable, 10000);
});

Deno.test("f1099r.compute: pension distribution routes to f1040 lines 5a/5b", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 24000,
    box2a_taxable_amount: 20000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 24000);
  assertEquals(input.line5b_pension_taxable, 20000);
});

Deno.test("f1099r.compute: an exact identified 1099-R copy cannot double income or withholding", () => {
  const copy = minimalPensionItem({
    recipient_ssn: "111223333",
    account_number: "PENSION-1",
    box4_federal_withheld: 500,
  });
  assertThrows(
    () => compute([copy, { ...copy, simplified_method_flag: true }]),
    Error,
    "repeats the same payer, recipient, account, and issued source copy",
  );
  const iraCopy = minimalIraItem({
    recipient_ssn: "111223333",
    source_document_reference: "2025 IRA 1099-R",
    account_number: "IRA-1",
    box4_federal_withheld: 200,
  });
  assertThrows(
    () => compute([iraCopy, iraCopy]),
    Error,
    "repeats the same payer, recipient, account, and issued source copy",
  );
});

Deno.test("f1099r.compute: separate identified 1099-R accounts retain both amounts", () => {
  const first = minimalPensionItem({
    recipient_ssn: "111223333",
    account_number: "PENSION-1",
    box2a_taxable_amount: 1_000,
    box4_federal_withheld: 100,
  });
  const result = compute([first, {
    ...first,
    account_number: "PENSION-2",
  }]);
  const fields = f1040Input(result);
  assertEquals(fields.line5b_pension_taxable, 2_000);
  assertEquals(fields.line25b_withheld_1099, 200);
});

Deno.test("f1099r.compute: positive TY2025 code P cannot enter ordinary retirement lines", () => {
  for (
    const item of [
      minimalPensionItem({
        box7_distribution_code: DistributionCode.CodeP,
        box2a_taxable_amount: 1_000,
      }),
      minimalIraItem({
        box7_distribution_code: DistributionCode.CodeP,
        box2a_taxable_amount: 1_000,
      }),
      minimalPensionItem({
        box7_distribution_code: DistributionCode.Code1,
        box7_code2: DistributionCode.CodeP,
        box2a_taxable_amount: 1_000,
      }),
    ]
  ) {
    assertThrows(
      () => compute([item]),
      Error,
      "code P Form 1099-R needs prior-year correction and receipt-date review",
    );
  }
});

Deno.test("f1099r.compute: IRA routing uses gross as taxable when box2a absent", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 5000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 5000);
  assertEquals(input.line4b_ira_taxable, 5000);
});

Deno.test("f1099r.compute: pension routing uses gross as taxable when box2a absent", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 18000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 18000);
  assertEquals(input.line5b_pension_taxable, 18000);
});

Deno.test("f1099r.compute: omitted box7_ira_simple_indicator defaults to pension routing", () => {
  const result = compute([{
    payer_name: "State Pension",
    payer_ein: "99-1234567",
    box1_gross_distribution: 30000,
    box7_distribution_code: DistributionCode.Code7,
  }]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 30000);
  assertEquals(input.line5b_pension_taxable, 30000);
});

Deno.test("f1099r.compute: box4_federal_withheld > 0 routes to f1040 line25b", () => {
  const result = compute([minimalIraItem({ box4_federal_withheld: 2000 })]);
  const input = f1040Input(result);
  assertEquals(input.line25b_withheld_1099, 2000);
});

Deno.test("f1099r.compute: no box4 does not emit line25b", () => {
  const result = compute([minimalPensionItem()]);
  const withholding = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" &&
      (o.fields as Record<string, unknown>).line25b_withheld_1099 !== undefined,
  );
  assertEquals(withholding, undefined);
});

Deno.test("f1099r.compute: distribution code 1 routes to form5329 with exact amounts", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 15000,
    box2a_taxable_amount: 15000,
    box7_distribution_code: DistributionCode.Code1,
  })]);
  const form5329Out = result.outputs.find((o) => o.nodeType === "form5329");
  const f5329Fields =
    (form5329Out!.fields.owner_entries as Array<Record<string, unknown>>)[0]!;
  assertEquals(f5329Fields.early_distribution, 15000);
  assertEquals(f5329Fields.distribution_code, "1");
  // Code 1 still routes to income lines (IRA taxable = 15000)
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 15000);
  assertEquals(input.line4b_ira_taxable, 15000);
});

Deno.test("f1099r.compute: early distribution without an owner fails closed", () => {
  assertThrows(
    () =>
      compute([minimalIraItem({
        box7_distribution_code: DistributionCode.Code1,
        ts: undefined,
      })]),
    Error,
    "Form 5329 owner",
  );
});

Deno.test("f1099r.compute: code 1 IRA with basis sends the Form 8606 taxable amount to form5329", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 20000,
    box2a_taxable_amount: 20000,
    box7_distribution_code: DistributionCode.Code1,
    prior_ira_basis: 20000,
    year_end_ira_value: 60000,
    source_document_reference: "2025 issued Form 1099-R",
    form8606_distribution_evidence: priorBasisDistributionEvidence(60_000),
  })]);
  // Form 8606 Part I: basis 20,000 over (60,000 + 20,000) is a 0.25 nontaxable ratio,
  // so line 15c taxable = 20,000 - 5,000 = 15,000. Form 5329 line 1 takes the amount
  // "includible in income", which is that 15,000, not the 20,000 gross.
  const form5329Out = result.outputs.find((o) => o.nodeType === "form5329");
  const f5329Fields =
    (form5329Out!.fields.owner_entries as Array<Record<string, unknown>>)[0]!;
  assertEquals(f5329Fields.early_distribution, 15000);
  assertEquals(f5329Fields.distribution_code, "1");
});

Deno.test("f1099r.compute: code 1 IRA fully covered by basis sends 0 to form5329", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 20000,
    box2a_taxable_amount: 20000,
    box7_distribution_code: DistributionCode.Code1,
    prior_ira_basis: 20000,
    year_end_ira_value: 0,
    source_document_reference: "2025 issued Form 1099-R",
    form8606_distribution_evidence: priorBasisDistributionEvidence(0),
  })]);
  // Basis covers the whole distribution, so Form 8606 line 15c is 0 and nothing is
  // includible in income for the 10% additional tax.
  const form5329Out = result.outputs.find((o) => o.nodeType === "form5329");
  const f5329Fields =
    (form5329Out!.fields.owner_entries as Array<Record<string, unknown>>)[0]!;
  assertEquals(f5329Fields.early_distribution, 0);
});

Deno.test("f1099r.compute: distribution code 2 does not route to form5329 automatically", () => {
  const result = compute([
    minimalIraItem({ box7_distribution_code: DistributionCode.Code2 }),
  ]);
  const form5329 = result.outputs.find((o) => o.nodeType === "form5329");
  assertEquals(form5329, undefined);
});

Deno.test("f1099r.compute: linked code 1 disaster distribution bypasses Form 5329", () => {
  const result = compute([minimalIraItem({
    account_number: "123",
    source_document_reference: "issued 2025 1099-R account 123",
    box13_date_of_payment: "2025-06-01",
    box1_gross_distribution: 20_000,
    box2a_taxable_amount: 20_000,
    box7_distribution_code: DistributionCode.Code1,
    form8915f_treatment: "three_years",
  })]);
  assertEquals(f1040Input(result).line4a_ira_gross, 20_000);
  assertEquals(f1040Input(result).line4b_ira_taxable, 6_667);
  assertEquals(
    result.outputs.some((item) => item.nodeType === "form5329"),
    false,
  );
});

Deno.test("f1099r.compute: distribution code 7 does not route to form5329", () => {
  const result = compute([
    minimalPensionItem({ box7_distribution_code: DistributionCode.Code7 }),
  ]);
  const form5329 = result.outputs.find((o) => o.nodeType === "form5329");
  assertEquals(form5329, undefined);
});

Deno.test("f1099r.compute: code 5 does not elect Form 4972", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 100000,
    box7_distribution_code: DistributionCode.Code5,
  })]);
  const form4972Out = result.outputs.find((o) => o.nodeType === "form4972");
  assertEquals(form4972Out, undefined);
});

Deno.test("f1099r.compute: code A is eligibility information, not an election", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 100000,
    box7_distribution_code: DistributionCode.CodeA,
  })]);
  assertEquals(
    result.outputs.find((o) => o.nodeType === "form4972"),
    undefined,
  );
});

Deno.test("f1099r.compute: explicit Form 4972 choice carries boxes 2a, 3, and 6", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 100_000,
    box2a_taxable_amount: 80_000,
    box3_capital_gain: 10_000,
    box6_nua: 4_000,
    box7_distribution_code: DistributionCode.CodeA,
    exclude_4972: true,
    ts: TS.T,
  })]);
  const form4972Out = result.outputs.find((o) => o.nodeType === "form4972");
  const fields = firstForm4972Source(result)!;
  assertEquals(fields.lump_sum_amount, 80_000);
  assertEquals(fields.capital_gain_amount, 10_000);
  assertEquals(fields.box6_nua, 4_000);
  assertEquals(fields.recipient, TS.T);
});

Deno.test("f1099r.compute: Form 4972 retains a partial box 9a share", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 20_000,
    box2a_taxable_amount: 20_000,
    box9a_pct_total: 50,
    exclude_4972: true,
    ts: TS.T,
  })]);
  const form4972Out = result.outputs.find((o) => o.nodeType === "form4972");
  assertEquals(firstForm4972Source(result)?.recipient_share_pct, 50);
});

Deno.test("f1099r.compute: Form 4972 retains the separate box 8 percentage", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 20_000,
    box2a_taxable_amount: 20_000,
    box8_other: 2_000,
    box8_pct_total: 25,
    box9a_pct_total: 50,
    exclude_4972: true,
    ts: TS.T,
  })]);
  const fields = firstForm4972Source(result);
  assertEquals(fields?.annuity_actuarial_value, 2_000);
  assertEquals(fields?.annuity_share_pct, 25);
  assertEquals(fields?.recipient_share_pct, 50);
});

Deno.test("f1099r.compute: Form 4972 accepts an explicit full distribution share", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 100_000,
    box2a_taxable_amount: 80_000,
    box9a_pct_total: 100,
    exclude_4972: true,
    ts: TS.T,
  })]);
  const form4972Out = result.outputs.find((o) => o.nodeType === "form4972");
  assertEquals(firstForm4972Source(result)?.lump_sum_amount, 80_000);
});

Deno.test("f1099r.compute: multiple elected Form 4972 distributions need participant identity", () => {
  const elected = minimalPensionItem({
    box1_gross_distribution: 80_000,
    box2a_taxable_amount: 80_000,
    exclude_4972: true,
    ts: TS.T,
  });
  for (const secondRecipient of [TS.T, TS.S]) {
    assertThrows(
      () =>
        compute([elected, {
          ...elected,
          payer_name: "Second Plan",
          payer_ein: "11-2233445",
          ts: secondRecipient,
        }]),
      Error,
      secondRecipient === TS.S
        ? "spouse pair needs distinct fully identified participants"
        : "multi-distribution election needs one fully identified participant",
    );
  }
});

Deno.test("f1099r.compute: two same-plan full-share 4972 sources aggregate", () => {
  const form4972_plan = {
    participant_name: "Ada Taxpayer",
    participant_ssn: "123456789",
    plan_reference: "Plan-2025-A",
    full_balance_statement_reference: "Administrator final-balance statement",
    all_qualified_distributions_included: true as const,
  };
  const first = minimalPensionItem({
    box1_gross_distribution: 30_000,
    box2a_taxable_amount: 30_000,
    box9a_pct_total: 100,
    exclude_4972: true,
    source_document_reference: "1099-R-A",
    form4972_plan,
  });
  const second = {
    ...first,
    box1_gross_distribution: 40_000,
    box2a_taxable_amount: 40_000,
    source_document_reference: "1099-R-B",
  };
  const fields = firstForm4972Source(compute([first, second]));
  assertEquals(fields?.lump_sum_amount, 70_000);
  assertEquals(fields?.multiple_1099r, {
    ...form4972_plan,
    source_document_references: ["1099-R-A", "1099-R-B"],
  });
  assertThrows(
    () =>
      compute([first, {
        ...second,
        form4972_plan: {
          ...form4972_plan,
          participant_ssn: "987654321",
        },
      }]),
    Error,
    "multi-distribution election needs one fully identified participant",
  );
  assertThrows(
    () => compute([first, { ...second, ts: TS.S }]),
    Error,
    "spouse pair needs distinct fully identified participants",
  );
  assertThrows(
    () =>
      compute([first, { ...second, source_document_reference: "1099-R-A" }]),
    Error,
    "distinct full-share source copies",
  );
});

Deno.test("f1099r.compute: two same-plan box 3 gains combine for one Form 4972", () => {
  const form4972_plan = {
    participant_name: "Ada Taxpayer",
    participant_ssn: "123456789",
    plan_reference: "Plan-2025-A",
    full_balance_statement_reference: "Administrator final-balance statement",
    all_qualified_distributions_included: true as const,
  };
  const first = minimalPensionItem({
    box1_gross_distribution: 30_000,
    box2a_taxable_amount: 30_000,
    box3_capital_gain: 5_000,
    box9a_pct_total: 100,
    exclude_4972: true,
    source_document_reference: "1099-R-capital-A",
    form4972_plan,
  });
  const second = {
    ...first,
    box1_gross_distribution: 40_000,
    box2a_taxable_amount: 40_000,
    box3_capital_gain: 7_000,
    source_document_reference: "1099-R-capital-B",
  };
  const fields = firstForm4972Source(compute([first, second]));
  assertEquals(fields?.lump_sum_amount, 70_000);
  assertEquals(fields?.capital_gain_amount, 12_000);
});

Deno.test("f1099r.compute: an elected Form 4972 source cannot also deny receipt", () => {
  assertThrows(
    () =>
      compute([minimalPensionItem({
        box2a_taxable_amount: 80_000,
        exclude_4972: true,
        no_distribution_received: true,
      })]),
    Error,
    "election conflicts with Form 1099-R no_distribution_received",
  );
});

Deno.test("f1099r.compute: distribution code 7 does not route to form4972", () => {
  const result = compute([
    minimalPensionItem({ box7_distribution_code: DistributionCode.Code7 }),
  ]);
  const form4972 = result.outputs.find((o) => o.nodeType === "form4972");
  assertEquals(form4972, undefined);
});

Deno.test("f1099r.compute: Roth exclusion cannot suppress income without Part III sources", () => {
  assertThrows(
    () =>
      compute([minimalIraItem({
        box1_gross_distribution: 10000,
        box7_distribution_code: DistributionCode.CodeJ,
        exclude_8606_roth: true,
      })]),
    Error,
    "needs one owner code J Form 1099-R",
  );
});

Deno.test("f1099r.compute: rollover_code C routes to form8606 with taxable amount", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 10000,
    rollover_code: RolloverCode.C,
  })]);
  const form8606Out = result.outputs.find((o) => o.nodeType === "form8606");
  const f8606Fields = form8606Out!.fields as Record<string, unknown>;
  assertEquals(f8606Fields.roth_conversion, 10000);
});

Deno.test("f1099r.compute: disability_flag + disability_as_wages routes to f1040 line1a with exact amount", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 10000,
    box7_distribution_code: DistributionCode.Code3,
    disability_flag: true,
    disability_as_wages: true,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line1a_wages, 10000);
  // Disability-as-wages items must NOT appear on pension lines
  assertEquals(input.line5a_pension_gross, undefined);
});

Deno.test("f1099r.compute: no_distribution_received suppresses all income outputs", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 50000,
    box2a_taxable_amount: 50000,
    box4_federal_withheld: 10000,
    no_distribution_received: true,
  })]);
  const incomeOutput = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" &&
      ((o.fields as Record<string, unknown>).line4a_ira_gross !== undefined ||
        (o.fields as Record<string, unknown>).line4b_ira_taxable !== undefined),
  );
  assertEquals(incomeOutput, undefined);
});

Deno.test("f1099r.compute: box6_nua does not produce schedule_d output at distribution", () => {
  const baseResult = compute([minimalPensionItem({
    box1_gross_distribution: 50000,
    box2a_taxable_amount: 20000,
  })]);
  const nuaResult = compute([minimalPensionItem({
    box1_gross_distribution: 50000,
    box2a_taxable_amount: 20000,
    box6_nua: 15000,
  })]);
  assertEquals(
    nuaResult.outputs.find((o) => o.nodeType === "schedule_d"),
    undefined,
  );
  assertEquals(baseResult.outputs.length, nuaResult.outputs.length);
});

// ---------------------------------------------------------------------------
// 3. Aggregation
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: multiple IRA items aggregate line4a correctly", () => {
  const result = compute([
    minimalIraItem({
      box1_gross_distribution: 5000,
      box2a_taxable_amount: 4000,
    }),
    minimalIraItem({
      box1_gross_distribution: 7000,
      box2a_taxable_amount: 6500,
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 12000);
});

Deno.test("f1099r.compute: multiple IRA items aggregate line4b correctly", () => {
  const result = compute([
    minimalIraItem({
      box1_gross_distribution: 5000,
      box2a_taxable_amount: 3000,
    }),
    minimalIraItem({
      box1_gross_distribution: 7000,
      box2a_taxable_amount: 4000,
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4b_ira_taxable, 7000);
});

Deno.test("f1099r.compute: multiple pension items aggregate line5a correctly", () => {
  const result = compute([
    minimalPensionItem({
      box1_gross_distribution: 6000,
      box2a_taxable_amount: 5000,
    }),
    minimalPensionItem({
      box1_gross_distribution: 9000,
      box2a_taxable_amount: 8000,
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 15000);
});

Deno.test("f1099r.compute: multiple pension items aggregate line5b correctly", () => {
  const result = compute([
    minimalPensionItem({
      box1_gross_distribution: 6000,
      box2a_taxable_amount: 5000,
    }),
    minimalPensionItem({
      box1_gross_distribution: 9000,
      box2a_taxable_amount: 6000,
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 11000);
});

Deno.test("f1099r.compute: multiple items aggregate box4_federal_withheld to single line25b", () => {
  const result = compute([
    minimalIraItem({ box4_federal_withheld: 1000 }),
    minimalPensionItem({ box4_federal_withheld: 1500 }),
  ]);
  const withholdingOutputs = result.outputs.filter(
    (o) =>
      o.nodeType === "f1040" &&
      (o.fields as Record<string, unknown>).line25b_withheld_1099 !== undefined,
  );
  const total = withholdingOutputs.reduce(
    (sum, o) =>
      sum +
      ((o.fields as Record<string, unknown>).line25b_withheld_1099 as number),
    0,
  );
  assertEquals(total, 2500);
});

Deno.test("f1099r.compute: mixed IRA and pension items do not cross-contaminate lines", () => {
  const result = compute([
    minimalIraItem({
      box1_gross_distribution: 5000,
      box2a_taxable_amount: 5000,
    }),
    minimalPensionItem({
      box1_gross_distribution: 6000,
      box2a_taxable_amount: 6000,
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 5000);
  assertEquals(input.line5a_pension_gross, 6000);
});

// ---------------------------------------------------------------------------
// 4. Thresholds
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: QCD partial amount below $108,000 reduces line4b", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 60000,
    box2a_taxable_amount: 60000,
    qcd_partial_amount: 50000,
  })]);
  const input = f1040Input(result);
  // line4a remains full gross; line4b is reduced by QCD amount
  assertEquals(input.line4a_ira_gross, 60000);
  assertEquals(input.line4b_ira_taxable, 10000);
});

Deno.test("f1099r.compute: QCD at exactly $108,000 limit is accepted and zeroes line4b", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 108000,
    box2a_taxable_amount: 108000,
    qcd_partial_amount: 108000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 108000);
  assertEquals(input.line4b_ira_taxable, 0);
});

Deno.test("f1099r.compute: QCD full flag caps exclusion at $108,000 when gross exceeds limit", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 200000,
    box2a_taxable_amount: 200000,
    qcd_full: true,
  })]);
  const input = f1040Input(result);
  // line4b should not go negative; max exclusion is 108000
  assertEquals(input.line4a_ira_gross, 200000);
  assertEquals(input.line4b_ira_taxable, 92000); // 200000 - 108000
});

Deno.test("f1099r.compute: PSO premium below $3,000 reduces line5b", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 30000,
    box2a_taxable_amount: 30000,
    pso_premium: 1500,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 28500);
});

Deno.test("f1099r.compute: PSO premium at exactly $3,000 applies full exclusion", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 30000,
    box2a_taxable_amount: 30000,
    pso_premium: 3000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 27000);
});

Deno.test("f1099r.compute: PSO premium above $3,000 is capped at $3,000 exclusion", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 30000,
    box2a_taxable_amount: 30000,
    pso_premium: 4000,
  })]);
  const input = f1040Input(result);
  // Only $3,000 may be excluded; not $4,000
  assertEquals(input.line5b_pension_taxable, 27000);
});

// Simplified Method Table 1 — the node uses age_at_annuity_start to look up
// expected_months; the test verifies line5b is reduced by cost_in_contract / months
// × payments_in_year. Since we cannot observe internal expected_months directly,
// we verify via a known arithmetic outcome.
// age ≤55 → 360 months. Monthly exclusion = 12000 / 360 = 33.33/mo × 12 = $400/yr.
Deno.test("f1099r.compute: Simplified Method Table1 age ≤55 uses 360 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    age_at_annuity_start: 55,
  })]);
  const input = f1040Input(result);
  // 12000 / 360 * 12 = 400 excludable; taxable = 12000 - 400 = 11600
  assertEquals(input.line5b_pension_taxable, 11600);
});

// age 56–60 → 310 months. 12000/310*12 = 464.516...; taxable = 12000 - 464.516... = 11535.484...
Deno.test("f1099r.compute: Simplified Method Table1 age 56–60 uses 310 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    age_at_annuity_start: 60,
  })]);
  const input = f1040Input(result);
  // 12000 - (12000/310*12) = 12000 - 464.5161... = 11535.4838...
  assertEquals(input.line5b_pension_taxable, 12000 - (12000 / 310 * 12));
});

// age 61–65 → 260 months. 12000/260*12 = 553.846...; taxable = 11446.153...
Deno.test("f1099r.compute: Simplified Method Table1 age 61–65 uses 260 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    age_at_annuity_start: 65,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 12000 - (12000 / 260 * 12));
});

// age 66–70 → 210 months. 12000/210*12 = 685.714...; taxable = 11314.285...
Deno.test("f1099r.compute: Simplified Method Table1 age 66–70 uses 210 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    age_at_annuity_start: 70,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 12000 - (12000 / 210 * 12));
});

// age ≥71 → 160 months. 12000/160*12 = 900; taxable = 11100
Deno.test("f1099r.compute: Simplified Method Table1 age ≥71 uses 160 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    age_at_annuity_start: 71,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 11100);
});

// Table 2 — joint annuity. combined ≤110 → 410 months. 12000/410*12 = 351.219...
Deno.test("f1099r.compute: Simplified Method Table2 combined ages ≤110 uses 410 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    joint_annuity: true,
    combined_ages_at_start: 110,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 12000 - (12000 / 410 * 12));
});

// combined 111–120 → 360 months. Same arithmetic as Table1 age ≤55.
Deno.test("f1099r.compute: Simplified Method Table2 combined ages 111–120 uses 360 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    joint_annuity: true,
    combined_ages_at_start: 115,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 11600);
});

// combined 121–130 → 310 months.
Deno.test("f1099r.compute: Simplified Method Table2 combined ages 121–130 uses 310 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    joint_annuity: true,
    combined_ages_at_start: 125,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 12000 - (12000 / 310 * 12));
});

// combined 131–140 → 260 months.
Deno.test("f1099r.compute: Simplified Method Table2 combined ages 131–140 uses 260 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    joint_annuity: true,
    combined_ages_at_start: 135,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 12000 - (12000 / 260 * 12));
});

// combined ≥141 → 210 months.
Deno.test("f1099r.compute: Simplified Method Table2 combined ages ≥141 uses 210 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    joint_annuity: true,
    combined_ages_at_start: 141,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 12000 - (12000 / 210 * 12));
});

// ---------------------------------------------------------------------------
// 5. Hard validation rules
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: box3_capital_gain exceeding box2a_taxable throws", () => {
  assertThrows(() =>
    compute([minimalPensionItem({
      box2a_taxable_amount: 8000,
      box3_capital_gain: 10000,
    })])
  );
});

Deno.test("f1099r.compute: box3_capital_gain equal to box2a_taxable is valid and routes correctly", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 5000,
    box2a_taxable_amount: 5000,
    box3_capital_gain: 5000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 5000);
});

Deno.test("f1099r.compute: box9a_pct_total above 100 throws", () => {
  assertThrows(() => compute([minimalIraItem({ box9a_pct_total: 101 })]));
});

Deno.test("f1099r.compute: box9a_pct_total at 100 is valid and does not affect income routing", () => {
  const result = compute([
    minimalIraItem({ box1_gross_distribution: 10000, box9a_pct_total: 100 }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 10000);
});

Deno.test("f1099r.compute: negative box9a_pct_total throws", () => {
  assertThrows(() => compute([minimalIraItem({ box9a_pct_total: -1 })]));
});

Deno.test("f1099r.compute: distribution code 1 uses gross when box2a absent for form5329", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 7000,
    box7_distribution_code: DistributionCode.Code1,
  })]);
  const form5329 = result.outputs.find((o) => o.nodeType === "form5329");
  const input =
    (form5329!.fields.owner_entries as Array<Record<string, unknown>>)[0]!;
  assertEquals(input.early_distribution, 7000);
});

// ---------------------------------------------------------------------------
// 6. Warning-only rules (must NOT throw, and must not affect income routing)
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: altered_or_handwritten does not affect income routing", () => {
  const result = compute([
    minimalIraItem({
      box1_gross_distribution: 10000,
      altered_or_handwritten: true,
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 10000);
  assertEquals(input.line4b_ira_taxable, 10000);
});

Deno.test("f1099r.compute: box2b_not_determined does not affect income routing", () => {
  const result = compute([
    minimalIraItem({
      box1_gross_distribution: 10000,
      box2b_not_determined: true,
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 10000);
  assertEquals(input.line4b_ira_taxable, 10000);
});

Deno.test("f1099r.compute: box2b_total_dist does not affect pension routing", () => {
  const result = compute([
    minimalPensionItem({
      box1_gross_distribution: 10000,
      box2b_total_dist: true,
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 10000);
  assertEquals(input.line5b_pension_taxable, 10000);
});

Deno.test("f1099r.compute: box12_fatca does not affect income routing", () => {
  const result = compute([
    minimalIraItem({ box1_gross_distribution: 10000, box12_fatca: true }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 10000);
});

Deno.test("f1099r.compute: code J without exclude_8606_roth routes to IRA income lines", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 8000,
    box7_distribution_code: DistributionCode.CodeJ,
    box2a_taxable_amount: 5000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 8000);
  assertEquals(input.line4b_ira_taxable, 5000);
});

Deno.test("f1099r.compute: disability_flag alone routes to pension lines (not wages)", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 10000,
    box7_distribution_code: DistributionCode.Code3,
    disability_flag: true,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 10000);
  assertEquals(input.line1a_wages, undefined);
});

// ---------------------------------------------------------------------------
// 7. Informational fields (do not change income amounts)
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: box13_date_of_payment does not affect income routing", () => {
  const result = compute([
    minimalIraItem({
      box1_gross_distribution: 10000,
      box13_date_of_payment: "2025-06-15",
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 10000);
  assertEquals(input.line4b_ira_taxable, 10000);
});

Deno.test("f1099r.compute: account_number does not affect income routing", () => {
  const result = compute([
    minimalIraItem({
      box1_gross_distribution: 10000,
      account_number: "ACC-123456",
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 10000);
});

Deno.test("f1099r.compute: box15_payer_state does not affect pension routing", () => {
  const result = compute([
    minimalPensionItem({
      box1_gross_distribution: 10000,
      box15_payer_state: "CA",
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 10000);
});

Deno.test("f1099r.compute: box18_locality_name does not affect pension routing", () => {
  const result = compute([
    minimalPensionItem({
      box1_gross_distribution: 10000,
      box18_locality_name: "City of Springfield",
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 10000);
});

Deno.test("f1099r.compute: box9b_total_employee_contributions without simplified_method does not affect taxable", () => {
  const result = compute([
    minimalPensionItem({
      box1_gross_distribution: 10000,
      box9b_total_employee_contributions: 5000,
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 10000);
});

// ---------------------------------------------------------------------------
// 8. Edge cases
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: code G IRA payment to plan reports gross and zero taxable", () => {
  const item = minimalIraItem({
    box1_gross_distribution: 5000,
    box2a_taxable_amount: 0,
    box7_distribution_code: DistributionCode.CodeG,
    rollover_code: RolloverCode.G,
    ira_rollover: {
      source_ira_type: "traditional",
      destination: "qualified_plan",
      destination_name: "Example 401(k)",
      qualified_plan_acceptance_reference: "plan-acceptance-direct-1",
      distributed_on: "2025-06-01",
      completed_on: "2025-06-02",
      last_ira_to_ira_rollover_on: null,
    },
  });
  const result = compute([item]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 5000);
  assertEquals(input.line4b_ira_taxable, 0);
  assertEquals(input.line4c_ira_rollover, true);
  assertStringIncludes(
    iraDistributionExplanation([item]) ?? "",
    "IRA custodian paid 5000 directly to Example 401(k) qualified plan",
  );
  assertEquals(
    f1040Input(compute([{
      ...item,
      ira_rollover: {
        ...item.ira_rollover!,
        completed_on: "2025-09-01",
      },
    }])).line4c_ira_rollover,
    true,
  );
});

Deno.test("f1099r.compute: code G without box 2a stays a non-taxable direct rollover", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 20_300,
    box7_distribution_code: DistributionCode.CodeG,
    direct_rollover_confirmed: true,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 20_300);
  assertEquals(input.line5b_pension_taxable, 0);
  assertEquals(input.line5c_pension_rollover, true);
});

Deno.test("f1099r.compute: taxable pension code G checks line 5c without changing box 2a income", () => {
  const input = f1040Input(compute([minimalPensionItem({
    box1_gross_distribution: 20_300,
    box2a_taxable_amount: 10_300,
    box7_distribution_code: DistributionCode.CodeG,
    direct_rollover_confirmed: true,
  })]));
  assertEquals(input.line5a_pension_gross, 20_300);
  assertEquals(input.line5b_pension_taxable, 10_300);
  assertEquals(input.line5c_pension_rollover, true);
});

Deno.test("f1099r.compute: IRA code G and pension code 7 do not check pension rollover", () => {
  const ira = f1040Input(compute([minimalIraItem({
    box7_distribution_code: DistributionCode.CodeG,
    direct_rollover_confirmed: true,
    rollover_code: RolloverCode.G,
    ira_rollover: {
      source_ira_type: "traditional",
      destination: "qualified_plan",
      destination_name: "Example 401(k)",
      qualified_plan_acceptance_reference: "plan-acceptance-direct-2",
      distributed_on: "2025-06-01",
      completed_on: "2025-06-02",
      last_ira_to_ira_rollover_on: null,
    },
  })]));
  const pension = f1040Input(compute([minimalPensionItem()]));
  const unconfirmed = f1040Input(compute([minimalPensionItem({
    box7_distribution_code: DistributionCode.CodeG,
    box2a_taxable_amount: 10_000,
  })]));
  assertEquals(ira.line5c_pension_rollover, undefined);
  assertEquals(ira.line4c_ira_rollover, true);
  assertEquals(pension.line5c_pension_rollover, undefined);
  assertEquals(unconfirmed.line5c_pension_rollover, undefined);
});

Deno.test("f1099r.compute: code S rollover produces zero taxable", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 8000,
    box2a_taxable_amount: 8000,
    box7_distribution_code: DistributionCode.Code7,
    rollover_code: RolloverCode.S,
    ira_rollover: {
      source_ira_type: "traditional",
      destination: "ira",
      destination_ira_type: "traditional",
      distributed_on: "2025-06-01",
      completed_on: "2025-06-02",
      last_ira_to_ira_rollover_on: null,
    },
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 8000);
  assertEquals(input.line4b_ira_taxable, 0);
  assertEquals(input.line4c_ira_rollover, true);
});

Deno.test("f1099r.compute: death-coded IRA distribution cannot claim an unreviewed rollover", () => {
  const rollover = {
    source_ira_type: "traditional" as const,
    destination: "ira" as const,
    destination_ira_type: "traditional" as const,
    distributed_on: "2025-06-01",
    completed_on: "2025-06-02",
    last_ira_to_ira_rollover_on: null,
  };
  for (
    const deathCode of [
      { box7_distribution_code: DistributionCode.Code4 },
      { box7_code2: DistributionCode.Code4 },
    ]
  ) {
    assertThrows(
      () =>
        compute([minimalIraItem({
          ...deathCode,
          rollover_code: RolloverCode.S,
          ira_rollover: rollover,
        })]),
      Error,
      "Death-coded IRA distribution needs beneficiary and RMD eligibility evidence",
    );
  }
  assertEquals(
    f1040Input(compute([minimalIraItem({
      box7_distribution_code: DistributionCode.Code4,
    })])).line4c_ira_rollover,
    undefined,
  );
});

Deno.test("f1099r.compute: IRA rollover needs dated destination evidence", () => {
  const item = minimalIraItem({ rollover_code: RolloverCode.S });
  assertThrows(() => compute([item]), Error, "needs destination");
  assertThrows(
    () =>
      compute([minimalIraItem({
        box7_distribution_code: DistributionCode.CodeG,
        direct_rollover_confirmed: true,
      })]),
    Error,
    "needs destination",
  );
  assertThrows(
    () =>
      compute([{
        ...item,
        ira_rollover: {
          source_ira_type: "traditional",
          destination: "qualified_plan",
          distributed_on: "2025-12-01",
          completed_on: "2025-12-15",
          last_ira_to_ira_rollover_on: null,
        },
      }]),
    Error,
    "needs its destination name",
  );
  const nextYear = {
    ...item,
    ira_rollover: {
      source_ira_type: "traditional" as const,
      destination: "ira" as const,
      destination_ira_type: "traditional" as const,
      distributed_on: "2025-12-01",
      completed_on: "2026-01-15",
      last_ira_to_ira_rollover_on: null,
    },
  };
  assertEquals(f1040Input(compute([nextYear])).line4c_ira_rollover, true);
  assertEquals(
    iraDistributionExplanation([nextYear]),
    "Distribution 1: Taxpayer received 10000 from an IRA on 2025-12-01; 10000 was rolled into another IRA on 2026-01-15.",
  );
  const qualified = {
    ...item,
    ira_rollover: {
      source_ira_type: "traditional" as const,
      destination: "qualified_plan" as const,
      destination_name: "Example 401(k)",
      qualified_plan_acceptance_reference: "plan-acceptance-timely-1",
      distributed_on: "2025-12-01",
      completed_on: "2025-12-15",
      last_ira_to_ira_rollover_on: null,
    },
  };
  assertEquals(f1040Input(compute([qualified])).line4c_ira_rollover, true);
  assertThrows(
    () =>
      compute([{
        ...qualified,
        ira_rollover: {
          ...qualified.ira_rollover,
          qualified_plan_acceptance_reference: undefined,
        },
      }]),
    Error,
    "needs plan acceptance evidence",
  );
  assertThrows(
    () =>
      compute([{
        ...nextYear,
        ira_rollover: {
          ...nextYear.ira_rollover,
          qualified_plan_acceptance_reference: "wrong-destination",
        },
      }]),
    Error,
    "cannot claim plan acceptance evidence",
  );
  assertThrows(
    () =>
      compute([{
        ...qualified,
        ira_rollover: {
          ...qualified.ira_rollover,
          completed_on: "2026-02-15",
        },
      }]),
    Error,
    "completion within 60 days",
  );
  assertEquals(
    iraDistributionExplanation([qualified]),
    "Distribution 1: Taxpayer received 10000 from an IRA on 2025-12-01; 10000 was rolled into Example 401(k) qualified plan on 2025-12-15.",
  );
  assertStringIncludes(
    iraDistributionExplanation([nextYear, { ...qualified, ts: TS.S }]) ?? "",
    "Distribution 2: Spouse received 10000 from an IRA",
  );
});

Deno.test("f1099r.compute: institution-error automatic waiver retains late IRA rollover", () => {
  const item = minimalIraItem({
    account_number: "IRA-2025-1",
    source_document_reference: "issued-1099r-2025-1",
    rollover_code: RolloverCode.S,
    ira_rollover: {
      source_ira_type: "traditional",
      destination: "ira",
      destination_ira_type: "traditional",
      distributed_on: "2025-06-01",
      completed_on: "2025-09-15",
      last_ira_to_ira_rollover_on: null,
      automatic_late_waiver: {
        institution_received_on: "2025-06-20",
        deposit_instructions_on: "2025-06-20",
        institution_error_only: true,
        not_inherited_ira_confirmed: true,
        not_required_minimum_distribution_confirmed: true,
        rollover_eligibility_review_reference: "eligibility-review-1",
        institution_receipt_reference: "custodian-receipt-1",
        deposit_instructions_reference: "instructions-1",
        institution_error_reference: "custodian-error-1",
        deposit_confirmation_reference: "deposit-1",
      },
    },
  });
  const input = f1040Input(compute([item]));
  assertEquals(input.line4a_ira_gross, 10_000);
  assertEquals(input.line4b_ira_taxable, 0);
  assertEquals(input.line4c_ira_rollover, true);
  assertStringIncludes(
    iraDistributionExplanation([item]) ?? "",
    "automatic 60-day waiver applies",
  );
  assertEquals(
    iraDistributionExplanation([item])?.includes("custodian-error-1"),
    false,
  );

  const planItem = {
    ...item,
    ira_rollover: {
      ...item.ira_rollover!,
      destination: "qualified_plan" as const,
      destination_ira_type: undefined,
      destination_name: "Example 401(k)",
      qualified_plan_acceptance_reference: "plan-acceptance-1",
    },
  };
  assertEquals(f1040Input(compute([planItem])).line4c_ira_rollover, true);
  assertEquals(
    iraDistributionExplanation([planItem])?.includes("plan-acceptance-1"),
    false,
  );
  assertThrows(
    () =>
      compute([{
        ...planItem,
        ira_rollover: {
          ...planItem.ira_rollover,
          qualified_plan_acceptance_reference: undefined,
        },
      }]),
    Error,
    "needs plan acceptance evidence",
  );

  const waiver = item.ira_rollover!.automatic_late_waiver!;
  const invalid = [
    { ...item, source_document_reference: undefined },
    {
      ...item,
      ira_rollover: {
        ...item.ira_rollover!,
        automatic_late_waiver: {
          ...waiver,
          institution_received_on: "2025-08-01",
        },
      },
    },
    {
      ...item,
      ira_rollover: {
        ...item.ira_rollover!,
        automatic_late_waiver: {
          ...waiver,
          deposit_instructions_on: "2025-08-01",
        },
      },
    },
    {
      ...item,
      ira_rollover: { ...item.ira_rollover!, completed_on: "2026-07-01" },
    },
    {
      ...item,
      ira_rollover: { ...item.ira_rollover!, completed_on: "2025-06-25" },
    },
    {
      ...item,
      ira_rollover: { ...item.ira_rollover!, automatic_late_waiver: undefined },
    },
  ];
  for (const bad of invalid) {
    assertThrows(() => compute([bad]), Error);
  }
  for (
    const key of [
      "not_inherited_ira_confirmed",
      "not_required_minimum_distribution_confirmed",
    ] as const
  ) {
    assertEquals(
      f1099r.inputSchema.safeParse({
        f1099rs: [{
          ...item,
          ira_rollover: {
            ...item.ira_rollover!,
            automatic_late_waiver: { ...waiver, [key]: undefined },
          },
        }],
      }).success,
      false,
    );
  }
});

Deno.test("f1099r.compute: Pub. 590-A frozen deposit extends the IRA rollover deadline", () => {
  const item = minimalIraItem({
    account_number: "IRA-FROZEN-2025",
    source_document_reference: "issued-1099r-frozen",
    rollover_code: RolloverCode.S,
    ira_rollover: {
      source_ira_type: "traditional",
      destination: "ira",
      destination_ira_type: "traditional",
      distributed_on: "2025-06-01",
      completed_on: "2025-09-30",
      last_ira_to_ira_rollover_on: null,
      frozen_deposit_extension: {
        frozen_on: "2025-06-20",
        unfrozen_on: "2025-08-20",
        cause: "institution_bankrupt_or_insolvent",
        funds_inaccessible_confirmed: true,
        qualifying_insolvency_evidence_reference: "insolvency-order-1",
        frozen_funds_record_reference: "freeze-record-1",
        release_record_reference: "release-record-1",
        deposit_confirmation_reference: "deposit-record-1",
        not_inherited_ira_confirmed: true,
        not_required_minimum_distribution_confirmed: true,
        rollover_eligibility_review_reference: "eligibility-review-1",
      },
    },
  });
  const input = f1040Input(compute([item]));
  assertEquals(input.line4a_ira_gross, 10_000);
  assertEquals(input.line4b_ira_taxable, 0);
  assertEquals(input.line4c_ira_rollover, true);
  const statement = iraDistributionExplanation([item]) ?? "";
  assertStringIncludes(statement, "frozen-deposit extension");
  assertStringIncludes(statement, "extended rollover deadline was 2025-09-30");
  assertEquals(statement.includes("insolvency-order-1"), false);

  const rollover = item.ira_rollover!;
  const frozen = rollover.frozen_deposit_extension!;
  const tenDayFloor = {
    ...item,
    ira_rollover: {
      ...rollover,
      completed_on: "2025-08-11",
      frozen_deposit_extension: {
        ...frozen,
        frozen_on: "2025-07-30",
        unfrozen_on: "2025-08-01",
        cause: "state_insolvency_withdrawal_restriction" as const,
      },
    },
  };
  assertStringIncludes(
    iraDistributionExplanation([tenDayFloor]) ?? "",
    "extended rollover deadline was 2025-08-11",
  );
  const planItem = {
    ...item,
    ira_rollover: {
      ...rollover,
      destination: "qualified_plan" as const,
      destination_ira_type: undefined,
      destination_name: "Example 401(k)",
      qualified_plan_acceptance_reference: "plan-acceptance-1",
    },
  };
  assertEquals(f1040Input(compute([planItem])).line4c_ira_rollover, true);

  for (
    const bad of [
      { ...item, source_document_reference: undefined },
      { ...item, account_number: undefined },
      { ...item, ira_rollover: { ...rollover, completed_on: "2025-10-01" } },
      {
        ...tenDayFloor,
        ira_rollover: {
          ...tenDayFloor.ira_rollover,
          completed_on: "2025-08-12",
        },
      },
      { ...item, ira_rollover: { ...rollover, completed_on: "2025-06-25" } },
      { ...item, ira_rollover: { ...rollover, completed_on: "2025-08-10" } },
      {
        ...item,
        ira_rollover: {
          ...rollover,
          frozen_deposit_extension: { ...frozen, frozen_on: "2025-08-01" },
        },
      },
      {
        ...item,
        ira_rollover: {
          ...rollover,
          frozen_deposit_extension: { ...frozen, frozen_on: "2025-05-31" },
        },
      },
      {
        ...item,
        ira_rollover: {
          ...rollover,
          frozen_deposit_extension: { ...frozen, unfrozen_on: "2025-06-20" },
        },
      },
      {
        ...planItem,
        ira_rollover: {
          ...planItem.ira_rollover,
          qualified_plan_acceptance_reference: undefined,
        },
      },
      {
        ...item,
        ira_rollover: {
          ...rollover,
          qualified_plan_acceptance_reference: "wrong-plan",
        },
      },
      {
        ...item,
        ira_rollover: { ...rollover, frozen_deposit_extension: undefined },
      },
    ]
  ) {
    assertThrows(() => compute([bad]), Error);
  }
  for (
    const key of [
      "funds_inaccessible_confirmed",
      "not_inherited_ira_confirmed",
      "not_required_minimum_distribution_confirmed",
      "qualifying_insolvency_evidence_reference",
    ] as const
  ) {
    assertEquals(
      f1099r.inputSchema.safeParse({
        f1099rs: [{
          ...item,
          ira_rollover: {
            ...rollover,
            frozen_deposit_extension: { ...frozen, [key]: undefined },
          },
        }],
      }).success,
      false,
    );
  }
  assertEquals(
    f1099r.inputSchema.safeParse({
      f1099rs: [{
        ...item,
        ira_rollover: {
          ...rollover,
          frozen_deposit_extension: { ...frozen, cause: "temporary-bank-hold" },
        },
      }],
    }).success,
    false,
  );
  assertThrows(
    () =>
      compute([{
        ...item,
        ira_rollover: {
          ...rollover,
          automatic_late_waiver: {
            institution_received_on: "2025-06-20",
            deposit_instructions_on: "2025-06-20",
            institution_error_only: true,
            not_inherited_ira_confirmed: true,
            not_required_minimum_distribution_confirmed: true,
            rollover_eligibility_review_reference: "eligibility-review-2",
            institution_receipt_reference: "receipt-2",
            deposit_instructions_reference: "instructions-2",
            institution_error_reference: "error-2",
            deposit_confirmation_reference: "deposit-2",
          },
        },
      }]),
    Error,
    "multiple extension or waiver methods",
  );
});

Deno.test("f1099r.compute: signed self-certification keeps a late rollover within the 30-day safe harbor", () => {
  const item = minimalIraItem({
    account_number: "IRA-2025-2",
    source_document_reference: "issued-1099r-2025-2",
    rollover_code: RolloverCode.S,
    ira_rollover: {
      source_ira_type: "traditional",
      destination: "ira",
      destination_ira_type: "traditional",
      distributed_on: "2025-05-01",
      completed_on: "2025-09-10",
      last_ira_to_ira_rollover_on: null,
      self_certified_late_waiver: {
        reason: SelfCertificationReason.SeriousIllness,
        reason_prevented_timely_rollover: true,
        reason_resolved_on: "2025-08-20",
        reason_evidence_reference: "medical-review-1",
        no_prior_irs_waiver_denial_confirmed: true,
        prior_denial_review_reference: "irs-history-review-1",
        certification_signed_on: "2025-09-01",
        certification_delivered_on: "2025-09-02",
        signed_certification_reference: "signed-letter-1",
        contribution_confirmation_reference: "deposit-2",
        not_inherited_ira_confirmed: true,
        not_required_minimum_distribution_confirmed: true,
        rollover_eligibility_review_reference: "eligibility-review-2",
      },
    },
  });
  const input = f1040Input(compute([item]));
  assertEquals(input.line4a_ira_gross, 10_000);
  assertEquals(input.line4b_ira_taxable, 0);
  assertEquals(input.line4c_ira_rollover, true);
  assertStringIncludes(
    iraDistributionExplanation([item]) ?? "",
    "Rev. Proc. 2020-46 self-certification",
  );
  assertEquals(
    iraDistributionExplanation([item])?.includes("signed-letter-1"),
    false,
  );
  const rollover = item.ira_rollover!;
  const certification = rollover.self_certified_late_waiver!;
  for (
    const bad of [
      { ...item, source_document_reference: undefined },
      { ...item, ira_rollover: { ...rollover, completed_on: "2025-09-20" } },
      { ...item, ira_rollover: { ...rollover, completed_on: "2025-05-20" } },
      {
        ...item,
        ira_rollover: {
          ...rollover,
          self_certified_late_waiver: {
            ...certification,
            certification_delivered_on: "2025-09-11",
          },
        },
      },
      {
        ...item,
        ira_rollover: {
          ...rollover,
          self_certified_late_waiver: {
            ...certification,
            reason_resolved_on: "2025-06-01",
          },
        },
      },
      {
        ...item,
        ira_rollover: { ...rollover, self_certified_late_waiver: undefined },
      },
    ]
  ) {
    assertThrows(() => compute([bad]), Error);
  }
  const automatic = minimalIraItem({
    account_number: "IRA-AUTO",
    source_document_reference: "issued-1099r-auto",
    rollover_code: RolloverCode.S,
    ira_rollover: {
      ...rollover,
      automatic_late_waiver: {
        institution_received_on: "2025-05-20",
        deposit_instructions_on: "2025-05-20",
        institution_error_only: true,
        not_inherited_ira_confirmed: true,
        not_required_minimum_distribution_confirmed: true,
        rollover_eligibility_review_reference: "eligibility-review-3",
        institution_receipt_reference: "receipt-3",
        deposit_instructions_reference: "instructions-3",
        institution_error_reference: "error-3",
        deposit_confirmation_reference: "deposit-3",
      },
    },
  });
  assertThrows(
    () => compute([automatic]),
    Error,
    "cannot claim two waiver methods",
  );
});

Deno.test("f1099r.compute: favorable IRS ruling links a late distribution and deposit", () => {
  const item = minimalIraItem({
    account_number: "IRA-2025-PLR",
    source_document_reference: "issued-1099r-2025-plr",
    rollover_code: RolloverCode.S,
    ira_rollover: {
      source_ira_type: "traditional",
      destination: "ira",
      destination_ira_type: "traditional",
      distributed_on: "2025-05-01",
      completed_on: "2025-09-10",
      last_ira_to_ira_rollover_on: null,
      irs_private_letter_waiver: {
        ruling_number: "PLR-2025-EXAMPLE",
        issued_on: "2025-08-01",
        ruling_rollover_deadline_on: "2025-10-01",
        favorable_60_day_waiver_confirmed: true,
        issued_ruling_reference: "issued-ruling-1",
        owner_distribution_match_review_reference: "ruling-source-match-1",
        deposit_confirmation_reference: "deposit-confirmation-1",
        not_inherited_ira_confirmed: true,
        not_required_minimum_distribution_confirmed: true,
        rollover_eligibility_review_reference: "rollover-eligibility-1",
      },
    },
  });
  const input = f1040Input(compute([item]));
  assertEquals(input.line4a_ira_gross, 10_000);
  assertEquals(input.line4b_ira_taxable, 0);
  assertEquals(input.line4c_ira_rollover, true);
  assertStringIncludes(
    iraDistributionExplanation([item]) ?? "",
    "private letter ruling PLR-2025-EXAMPLE",
  );
  const rollover = item.ira_rollover!;
  const ruling = rollover.irs_private_letter_waiver!;
  for (
    const bad of [
      { ...item, source_document_reference: undefined },
      { ...item, ira_rollover: { ...rollover, completed_on: "2025-05-15" } },
      { ...item, ira_rollover: { ...rollover, completed_on: "2025-10-02" } },
      {
        ...item,
        ira_rollover: {
          ...rollover,
          irs_private_letter_waiver: { ...ruling, issued_on: "2025-04-01" },
        },
      },
    ]
  ) {
    assertThrows(() => compute([bad]), Error);
  }
  assertEquals(
    f1099r.inputSchema.safeParse({
      f1099rs: [{
        ...item,
        ira_rollover: {
          ...rollover,
          irs_private_letter_waiver: {
            ...ruling,
            favorable_60_day_waiver_confirmed: undefined,
          },
        },
      }],
    }).success,
    false,
  );
});

Deno.test("f1099r.compute: IRA rollover requires account type and prior-history review", () => {
  const item = minimalIraItem({
    rollover_code: RolloverCode.S,
    ira_rollover: {
      source_ira_type: "traditional",
      destination: "ira",
      destination_ira_type: "traditional",
      distributed_on: "2025-06-01",
      completed_on: "2025-06-02",
      last_ira_to_ira_rollover_on: null,
    },
  });
  assertEquals(f1040Input(compute([item])).line4c_ira_rollover, true);
  assertEquals(
    f1099r.inputSchema.safeParse({
      f1099rs: [{
        ...item,
        ira_rollover: { ...item.ira_rollover, source_ira_type: undefined },
      }],
    }).success,
    false,
  );
  assertEquals(
    f1099r.inputSchema.safeParse({
      f1099rs: [{
        ...item,
        ira_rollover: {
          ...item.ira_rollover,
          last_ira_to_ira_rollover_on: undefined,
        },
      }],
    }).success,
    false,
  );
  for (
    const source_ira_type of [
      "traditional_simple",
      "roth",
      "roth_sep",
      "roth_simple",
    ] as const
  ) {
    assertThrows(
      () =>
        compute([{
          ...item,
          ira_rollover: { ...item.ira_rollover!, source_ira_type },
        }]),
      Error,
      "source must be a reviewed traditional or SEP IRA",
    );
  }
  assertThrows(
    () =>
      compute([{
        ...item,
        ira_rollover: {
          ...item.ira_rollover!,
          destination_ira_type: "roth",
        },
      }]),
    Error,
    "destination must be a reviewed traditional or SEP IRA",
  );
  assertThrows(
    () =>
      compute([{
        ...item,
        box7_distribution_code: DistributionCode.CodeG,
        rollover_code: RolloverCode.G,
      }]),
    Error,
    "cannot use payer code G",
  );
  for (const code of [DistributionCode.CodeS, DistributionCode.CodeJ]) {
    assertThrows(
      () => compute([{ ...item, box7_distribution_code: code }]),
      Error,
      "conflicts with the payer distribution code",
    );
  }
});

Deno.test("f1099r.compute: IRA-to-IRA rollovers obey each owner's 12-month limit", () => {
  const item = minimalIraItem({
    rollover_code: RolloverCode.S,
    ira_rollover: {
      source_ira_type: "traditional_sep",
      destination: "ira",
      destination_ira_type: "traditional",
      distributed_on: "2025-06-01",
      completed_on: "2025-06-02",
      last_ira_to_ira_rollover_on: "2024-06-01",
    },
  });
  assertEquals(f1040Input(compute([item])).line4c_ira_rollover, true);
  assertThrows(
    () =>
      compute([{
        ...item,
        ira_rollover: {
          ...item.ira_rollover!,
          last_ira_to_ira_rollover_on: "2024-06-02",
        },
      }]),
    Error,
    "one rollover per owner in 12 months",
  );
  const second = {
    ...item,
    ira_rollover: {
      ...item.ira_rollover!,
      distributed_on: "2025-11-01",
      completed_on: "2025-11-02",
      last_ira_to_ira_rollover_on: null,
    },
  };
  assertThrows(
    () => compute([item, second]),
    Error,
    "one rollover per owner in 12 months",
  );
  assertEquals(
    f1040Input(compute([item, { ...second, ts: TS.S }]))
      .line4c_ira_rollover,
    true,
  );
  assertEquals(
    f1040Input(compute([item, {
      ...second,
      ira_rollover: {
        ...second.ira_rollover,
        destination: "qualified_plan",
        destination_ira_type: undefined,
        destination_name: "Example 401(k)",
        qualified_plan_acceptance_reference: "plan-acceptance-mixed-1",
      },
    }])).line4c_ira_rollover,
    true,
  );
});

Deno.test("f1099r.compute: partial IRA rollover marks line 4c and taxes the remainder", () => {
  const input = f1040Input(compute([minimalIraItem({
    box1_gross_distribution: 10_000,
    box2a_taxable_amount: 10_000,
    rollover_code: RolloverCode.X,
    partial_rollover_amount: 6_000,
    ira_rollover: {
      source_ira_type: "traditional",
      destination: "ira",
      destination_ira_type: "traditional",
      distributed_on: "2025-09-01",
      completed_on: "2025-09-30",
      last_ira_to_ira_rollover_on: null,
    },
  })]));
  assertEquals(input.line4a_ira_gross, 10_000);
  assertEquals(input.line4b_ira_taxable, 4_000);
  assertEquals(input.line4c_ira_rollover, true);
});

Deno.test("f1099r.compute: code S taxable SIMPLE IRA distribution reaches the 25% Form 5329 line", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 8_000,
    box2a_taxable_amount: 8_000,
    box7_distribution_code: DistributionCode.CodeS,
  })]);
  const fields = (result.outputs.find((o) => o.nodeType === "form5329")
    ?.fields.owner_entries as Array<Record<string, unknown>> | undefined)?.[0];
  assertEquals(fields?.simple_ira_early_distribution, 8_000);
  assertEquals(fields?.early_distribution, undefined);
});

Deno.test("f1099r.compute: code Q qualified Roth produces zero taxable", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 20000,
    box2a_taxable_amount: 0,
    box7_distribution_code: DistributionCode.CodeQ,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4b_ira_taxable, 0);
});

Deno.test("f1099r.compute: code T qualified Roth produces zero taxable", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 20000,
    box2a_taxable_amount: 0,
    box7_distribution_code: DistributionCode.CodeT,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4b_ira_taxable, 0);
});

Deno.test("f1099r.compute: code N recharacterization produces no income routing", () => {
  const result = compute([minimalIraItem({
    box7_distribution_code: DistributionCode.CodeN,
    box2a_taxable_amount: 0,
  })]);
  const input = f1040Input(result);
  const taxable = (input.line4b_ira_taxable ?? 0) as number;
  assertEquals(taxable, 0);
});

Deno.test("f1099r.compute: code R recharacterization prior year produces no income", () => {
  const result = compute([minimalIraItem({
    box7_distribution_code: DistributionCode.CodeR,
    box2a_taxable_amount: 0,
  })]);
  const input = f1040Input(result);
  const taxable = (input.line4b_ira_taxable ?? 0) as number;
  assertEquals(taxable, 0);
});

Deno.test("f1099r.compute: code 6 section 1035 exchange produces zero taxable", () => {
  const result = compute([minimalPensionItem({
    box7_distribution_code: DistributionCode.Code6,
    box2a_taxable_amount: 0,
  })]);
  const input = f1040Input(result);
  const taxable = (input.line5b_pension_taxable ?? 0) as number;
  assertEquals(taxable, 0);
});

Deno.test("f1099r.compute: code W long-term care produces no income", () => {
  const result = compute([minimalPensionItem({
    box7_distribution_code: DistributionCode.CodeW,
    box2a_taxable_amount: 0,
  })]);
  const input = f1040Input(result);
  const taxable = (input.line5b_pension_taxable ?? 0) as number;
  assertEquals(taxable, 0);
});

Deno.test("f1099r.compute: code Y (TY2025 QCD code) routes normally — taxable amount flows to line4b", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 10000,
    box7_distribution_code: DistributionCode.CodeY,
    box7_code2: DistributionCode.Code7,
    box2a_taxable_amount: 0,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 10000);
  assertEquals(input.line4b_ira_taxable, 0);
});

Deno.test("f1099r.compute: code B designated Roth routes to pension lines not IRA lines", () => {
  // 401k Roth (box7_ira_simple_indicator = false, code B)
  const result = compute([{
    payer_name: "401k Provider",
    payer_ein: "55-1234567",
    box1_gross_distribution: 15000,
    box2a_taxable_amount: 5000,
    box7_distribution_code: DistributionCode.CodeB,
    box7_ira_simple_indicator: false,
  }]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 15000);
  // IRA lines should not be populated
  assertEquals(input.line4a_ira_gross, undefined);
});

Deno.test("f1099r.compute: qcd_full with IRA item reduces line4b not line5b", () => {
  const result = compute([
    minimalIraItem({
      box1_gross_distribution: 20000,
      box2a_taxable_amount: 20000,
      qcd_full: true,
    }),
    minimalPensionItem({
      box1_gross_distribution: 10000,
      box2a_taxable_amount: 10000,
    }),
  ]);
  const input = f1040Input(result);
  // IRA taxable is reduced by QCD (capped at 20000, within 108000 limit)
  assertEquals(input.line4b_ira_taxable, 0);
  // Pension taxable is untouched
  assertEquals(input.line5b_pension_taxable, 10000);
});

Deno.test("f1099r.compute: mixed IRA and pension items aggregate independently", () => {
  const result = compute([
    minimalIraItem({
      box1_gross_distribution: 5000,
      box2a_taxable_amount: 5000,
    }),
    minimalIraItem({
      box1_gross_distribution: 3000,
      box2a_taxable_amount: 3000,
    }),
    minimalPensionItem({
      box1_gross_distribution: 6000,
      box2a_taxable_amount: 6000,
    }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 8000);
  assertEquals(input.line5a_pension_gross, 6000);
});

Deno.test("f1099r.compute: no_distribution_received true retains no income even with large amounts", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 100000,
    box2a_taxable_amount: 90000,
    box4_federal_withheld: 20000,
    no_distribution_received: true,
  })]);
  // None of the income lines or withholding should appear
  const incomeOutput = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" &&
      ((o.fields as Record<string, unknown>).line5a_pension_gross !==
          undefined ||
        (o.fields as Record<string, unknown>).line25b_withheld_1099 !==
          undefined),
  );
  assertEquals(incomeOutput, undefined);
});

// ---------------------------------------------------------------------------
// 9. Smoke test
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: smoke test — IRA + pension + withholding + QCD + PSO + code 1", () => {
  // IRA item: $50,000 gross, $45,000 taxable, $9,000 withheld, $10,000 QCD
  // Pension item: $30,000 gross, $28,000 taxable, $5,600 withheld, $2,000 PSO
  // Early dist IRA item: $15,000 gross (code 1 → form5329)
  const result = compute([
    minimalIraItem({
      payer_ein: "01-1111111",
      box1_gross_distribution: 50000,
      box2a_taxable_amount: 45000,
      box4_federal_withheld: 9000,
      qcd_partial_amount: 10000,
    }),
    minimalPensionItem({
      payer_ein: "02-2222222",
      box1_gross_distribution: 30000,
      box2a_taxable_amount: 28000,
      box4_federal_withheld: 5600,
      pso_premium: 2000,
    }),
    minimalIraItem({
      payer_ein: "03-3333333",
      box1_gross_distribution: 15000,
      box2a_taxable_amount: 15000,
      box7_distribution_code: DistributionCode.Code1,
    }),
  ]);

  const input = f1040Input(result);
  const form5329 = result.outputs.find((o) => o.nodeType === "form5329");

  // IRA gross = 50000 + 15000 = 65000
  assertEquals(input.line4a_ira_gross, 65000);
  // IRA taxable = (45000 - 10000 QCD) + 15000 = 50000
  assertEquals(input.line4b_ira_taxable, 50000);

  // Pension gross = 30000
  assertEquals(input.line5a_pension_gross, 30000);
  // Pension taxable = 28000 - 2000 PSO = 26000
  assertEquals(input.line5b_pension_taxable, 26000);

  // Total withholding = 9000 + 5600 = 14600 (early dist item has no withholding)
  assertEquals(input.line25b_withheld_1099, 14600);

  // form5329 early distribution = 15000
  const f5329Fields =
    (form5329!.fields.owner_entries as Array<Record<string, unknown>>)[0]!;
  assertEquals(f5329Fields.early_distribution, 15000);
});
