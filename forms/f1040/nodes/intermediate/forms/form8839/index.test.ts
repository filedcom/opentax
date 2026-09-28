import { assertEquals, assertThrows } from "@std/assert";
import {
  finalizedReturnCreditContextSchema,
  form8839,
  inputSchema,
  prepareForm8839Credit,
  settleForm8839Credit,
} from "./index.ts";
import { FilingStatus } from "../../../types.ts";

const nodeContext = { taxYear: 2025, formType: "f1040" } as const;

function domesticChild(amount: number) {
  return {
    first_name: "Ada",
    last_name: "Taxpayer",
    birth_year: 2020,
    ssn: "111223334",
    final_decree: {
      source_document_id: "decree-1",
      finalization_date: "2025-07-15",
      issuing_jurisdiction: "TX",
      child_origin: "US" as const,
    },
    expenses: amount === 0 ? [] : [{
      source_document_id: "invoice-1",
      paid_date: "2025-03-12",
      category: "attorney_fee" as const,
      payee: "Adoption Counsel",
      amount,
      reimbursed_amount: 0,
    }],
  };
}

function finalizedContext(overrides: Record<string, unknown> = {}) {
  return finalizedReturnCreditContextSchema.parse({
    form1040_line11b_agi: 200_000,
    form1040_line18_tax_before_credits: 20_000,
    magi_additions: {
      puerto_rico_excluded_income: 0,
      form2555_line45: 0,
      form2555_line50: 0,
      form4563_line15: 0,
    },
    child_credit_priority: { basis: "form1040_line19", amount: 2_000 },
    schedule3_priority: {
      line1: 1_000,
      line2: 0,
      line3: 0,
      line4: 0,
      line5b: 0,
      line6d: 0,
      line6f: 0,
      line6g: 0,
      line6l: 0,
      line6m: 0,
    },
    ...overrides,
  });
}

Deno.test("Form 8839: inactive input emits no credit", () => {
  assertEquals(form8839.compute(nodeContext, {}).outputs, []);
});

Deno.test("Form 8839: active typed child remains fail-closed before return credit", () => {
  assertThrows(
    () =>
      form8839.compute(nodeContext, {
        children: [domesticChild(15_000)],
        filing_status: FilingStatus.Single,
      }),
    Error,
    "source-verified adoption eligibility",
  );
});

Deno.test("Form 8839: employer benefits remain fail-closed", () => {
  assertThrows(
    () => form8839.compute(nodeContext, { adoption_benefits: 5_000 }),
    Error,
    "source-verified adoption eligibility",
  );
  assertThrows(
    () =>
      settleForm8839Credit(
        prepareForm8839Credit({ adoption_benefits: 5_000 }),
        finalizedContext(),
      ),
    Error,
    "Part III employer-benefit exclusion",
  );
});

Deno.test("Form 8839: source stage derives receipt amount before final return exists", () => {
  const prepared = prepareForm8839Credit({ children: [domesticChild(15_000)] });
  assertEquals(prepared.perChild[0]?.line3, 0);
  assertEquals(prepared.perChild[0]?.line5, 15_000);
  assertEquals(prepared.perChild[0]?.line6, 15_000);
  const settled = settleForm8839Credit(prepared, finalizedContext());
  assertEquals(settled.magi, 200_000);
  assertEquals(settled.line11c, 5_000);
  assertEquals(settled.line13, 5_000);
  assertEquals(settled.line14, 10_000);
  assertEquals(settled.creditLimitWorksheet.line2, 20_000);
  assertEquals(settled.creditLimitWorksheet.line3, 3_000);
  assertEquals(settled.line17, 10_000);
  assertEquals(settled.line18, 10_000);
});

Deno.test("Form 8839: negative finalized AGI leaves the credit unphased", () => {
  const settled = settleForm8839Credit(
    prepareForm8839Credit({ children: [domesticChild(15_000)] }),
    finalizedContext({ form1040_line11b_agi: -2_000 }),
  );
  assertEquals(settled.magi, -2_000);
  assertEquals(settled.fraction, 0);
  assertEquals(settled.line13, 5_000);
  assertEquals(settled.line14, 10_000);
});

Deno.test("Form 8839: refundable line 13 survives zero nonrefundable capacity", () => {
  const settled = settleForm8839Credit(
    prepareForm8839Credit({ children: [domesticChild(15_000)] }),
    finalizedContext({ form1040_line18_tax_before_credits: 1_000 }),
  );
  assertEquals(settled.creditLimitWorksheet.line3, 3_000);
  assertEquals(settled.creditLimitWorksheet.line4, 0);
  assertEquals(settled.line13, 5_000);
  assertEquals(settled.line17, 0);
  assertEquals(settled.line18, 0);
});

Deno.test("Form 8839: TY2025 MAGI phaseout boundaries reconcile both credit portions", () => {
  const prepared = prepareForm8839Credit({ children: [domesticChild(15_000)] });
  const cases = [
    { agi: 259_190, fraction: 0, line13: 5_000, line14: 10_000 },
    { agi: 279_190, fraction: 0.5, line13: 5_000, line14: 2_500 },
    { agi: 299_190, fraction: 1, line13: 0, line14: 0 },
  ];
  for (const expected of cases) {
    const settled = settleForm8839Credit(
      prepared,
      finalizedContext({ form1040_line11b_agi: expected.agi }),
    );
    assertEquals(settled.fraction, expected.fraction);
    assertEquals(settled.line13, expected.line13);
    assertEquals(settled.line14, expected.line14);
  }
});

Deno.test("Form 8839: MAGI adds Puerto Rico, Form 2555 and Form 4563 amounts", () => {
  const settled = settleForm8839Credit(
    prepareForm8839Credit({ children: [domesticChild(15_000)] }),
    finalizedContext({
      form1040_line11b_agi: 250_000,
      magi_additions: {
        puerto_rico_excluded_income: 2_000,
        form2555_line45: 3_000,
        form2555_line50: 4_000,
        form4563_line15: 1_000,
      },
    }),
  );
  assertEquals(settled.magi, 260_000);
  assertEquals(settled.fraction, 0.02);
});

Deno.test("Form 8839: prescribed other credits consume capacity, not adoption itself", () => {
  const settled = settleForm8839Credit(
    prepareForm8839Credit({ children: [domesticChild(15_000)] }),
    finalizedContext({
      form1040_line18_tax_before_credits: 11_000,
      child_credit_priority: {
        basis: "schedule8812_worksheet_b_line14",
        amount: 2_000,
      },
      schedule3_priority: {
        line1: 1_000,
        line2: 0,
        line3: 0,
        line4: 0,
        line5b: 500,
        line6d: 0,
        line6f: 0,
        line6g: 0,
        line6l: 0,
        line6m: 500,
      },
    }),
  );
  assertEquals(settled.creditLimitWorksheet.line3, 4_000);
  assertEquals(settled.creditLimitWorksheet.line4, 7_000);
  assertEquals(settled.line17, 7_000);
  assertEquals(settled.line18, 7_000);
});

Deno.test("Form 8839: receipt ledger nets documented reimbursement", () => {
  const child = domesticChild(15_000);
  const prepared = prepareForm8839Credit({
    children: [{
      ...child,
      expenses: [{
        ...child.expenses[0]!,
        reimbursed_amount: 4_000,
        reimbursement_source_document_id: "w2-plan-payment-1",
      }],
    }],
  });
  assertEquals(prepared.perChild[0]?.line5, 11_000);
  const settled = settleForm8839Credit(prepared, finalizedContext());
  assertEquals(settled.line14, 6_000);
});

Deno.test("Form 8839: expense and prior-return guards reject impossible source", () => {
  const child = domesticChild(1_000);
  assertThrows(
    () =>
      prepareForm8839Credit({
        children: [{
          ...child,
          expenses: [{
            ...child.expenses[0]!,
            reimbursed_amount: 1_001,
            reimbursement_source_document_id: "employer-1",
          }],
        }],
      }),
    Error,
    "reimbursement exceeds expense",
  );
  assertThrows(
    () =>
      prepareForm8839Credit({
        children: [{
          ...child,
          expenses: [{ ...child.expenses[0]!, paid_date: "2023-12-31" }],
        }],
      }),
    Error,
    "2024/2025 payment dates",
  );
  assertThrows(
    () =>
      prepareForm8839Credit({
        children: [{
          ...domesticChild(0),
          prior_filed_form8839: {
            source_document_id: "filed-8839-2024",
            line3: 0,
            line6: 17_281,
          },
        }],
      }),
    Error,
    "prior-year credit cannot exceed",
  );
});

Deno.test("Form 8839: special-needs source-stage amount uses remaining maximum", () => {
  const prepared = prepareForm8839Credit({
    children: [{
      ...domesticChild(0),
      special_needs_determination: {
        source_document_id: "state-determination-1",
        agency_name: "Texas Child Welfare",
        determination_date: "2025-06-01",
      },
      prior_filed_form8839: {
        source_document_id: "filed-8839-2024",
        line3: 2_000,
        line6: 3_000,
      },
    }],
  });
  assertEquals(prepared.perChild[0]?.line3, 5_000);
  assertEquals(prepared.perChild[0]?.line5, 12_280);
});

Deno.test("Form 8839: old asserted child and direct MAGI/limit fields reject", () => {
  assertThrows(() =>
    inputSchema.parse({
      children: [{ qualified_expenses: 15_000, special_needs: false }],
    })
  );
  assertEquals(inputSchema.safeParse({ magi: 200_000 }).success, false);
  assertEquals(
    inputSchema.safeParse({ credit_limit_worksheet_line5: 10_000 })
      .success,
    false,
  );
});

Deno.test("Form 8839: settlement needs each finalized return component", () => {
  assertThrows(() =>
    finalizedReturnCreditContextSchema.parse({
      form1040_line11b_agi: 200_000,
      form1040_line18_tax_before_credits: 20_000,
    })
  );
});

Deno.test("Form 8839: settlement does not infer absent territory MAGI additions as zero", () => {
  const prepared = prepareForm8839Credit({
    children: [domesticChild(15_000)],
  });
  for (
    const missing of [
      "puerto_rico_excluded_income",
      "form4563_line15",
    ] as const
  ) {
    const base = finalizedContext();
    const additions = { ...base.magi_additions };
    delete (additions as Partial<typeof additions>)[missing];
    assertThrows(() =>
      settleForm8839Credit(prepared, {
        ...base,
        magi_additions: additions,
      })
    );
  }
});
