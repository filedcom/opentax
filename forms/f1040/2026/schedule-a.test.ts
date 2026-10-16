import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import { calculateScheduleA2026 } from "./schedule-a.ts";
import { calculateItemizedExpenseSources2026 } from "./inputs/itemized-expense-source.ts";
import { syntheticCashGift2026 } from "./inputs/cash-charity.fixture.ts";
import {
  itemizedClaim2026,
  syntheticMedical2026,
  syntheticPropertyTax2026,
  syntheticSalesTax2026,
  syntheticScheduleA2026,
} from "./schedule-a.fixture.ts";
import { claimInputSchema, schedule_a_2026 } from "./nodes/schedule-a.ts";
const ctx = { formType: "f1040", taxYear: 2026 } as const;
const w2 = {
  source_document_reference: "w2",
  employee_ssn: "111223333",
  employer_ein: "123456789",
  box17_state_withheld: 8_000,
  box19_local_withheld: 1_000,
  mandatory_state_contributions: [{ description: "State SDI", amount: 500 }],
};
Deno.test("2026 itemized receipts reconcile medical costs, W-2 taxes and charity floor", () => {
  const r = calculateScheduleA2026({
    ...syntheticScheduleA2026(),
    medical_payments: [syntheticMedical2026()],
    tax_payments: [syntheticPropertyTax2026()],
    w2_tax_sources: [w2],
    cash_gifts: [{ ...syntheticCashGift2026, amount_paid: 10_100 }],
  });
  assertEquals([r.lines.line1, r.lines.line3, r.lines.line4], [
    16_500,
    7_500,
    9_000,
  ]);
  assertEquals([r.lines.line5a, r.lines.line5b, r.lines.line5e], [
    9_500,
    29_250,
    38_750,
  ]);
  assertEquals([r.lines.line11, r.lines.line13, r.charity.floor_not_carried], [
    10_000,
    9_500,
    500,
  ]);
  assertEquals(r.beforeOverallLimit, 57_250);
  assertEquals(r.charity.carryforward_candidate, { cash60: 0, cash30: 0 });
});
Deno.test("2026 SALT applies full reduction before MFS division and retains minimum", () => {
  for (
    const [status, agi, limit] of [
      [FilingStatus.Single, 505_000, 40_400],
      [FilingStatus.Single, 515_000, 37_400],
      [FilingStatus.Single, 700_000, 10_000],
      [FilingStatus.MFS, 252_500, 20_200],
      [FilingStatus.MFS, 262_500, 18_700],
      [FilingStatus.MFS, 400_000, 5_000],
      [FilingStatus.MFS, 252_505, 20_199],
    ] as const
  ) {
    const r = calculateScheduleA2026({
      ...syntheticScheduleA2026(),
      filing_status: status,
      agi,
      tax_payments: [{ ...syntheticPropertyTax2026(), amount_paid: 100_000 }],
    });
    assertEquals(r.saltLimit, limit);
    assertEquals(r.lines.line5e, limit);
  }
});
Deno.test("2026 SALT sources all exclusion lines and reconciles rounded AGI exclusion", () => {
  const source = syntheticScheduleA2026();
  const addback = (amount: number) => ({
    amount,
    source_reference: "exclusion-source",
  });
  const raw = {
    ...source,
    agi: 500_000,
    salt_zero_exclusions_review: undefined,
    salt_addbacks: {
      section933: addback(2_000),
      form2555_line45: addback(5_000.49),
      form2555_line50: addback(2_000),
      form4563_line15: addback(1_000),
    },
    form2555_line45_from_agi: 5_000,
  };
  const r = calculateScheduleA2026(raw);
  assertEquals([r.saltMagi, r.saltLimit], [510_000, 38_900]);
  assertThrows(
    () => calculateScheduleA2026({ ...raw, form2555_line45_from_agi: 0 }),
    Error,
    "disagrees",
  );
  assertThrows(
    () =>
      calculateScheduleA2026({
        ...source,
        salt_zero_exclusions_review: undefined,
      }),
    Error,
    "either",
  );
  assertThrows(
    () =>
      calculateScheduleA2026({
        ...raw,
        salt_zero_exclusions_review: source.salt_zero_exclusions_review,
      }),
    Error,
    "either",
  );
});
Deno.test("2026 cash categories apply percentage limits then ordered floor and retain carry candidates", () => {
  const gift60 = { ...syntheticCashGift2026, amount_paid: 20_100 };
  const gift30 = {
    ...syntheticCashGift2026,
    contribution_id: "gift30",
    recipient_class: "other_qualified" as const,
    amount_paid: 40_100,
  };
  const classification = {
    contribution_id: "gift30",
    category: "cash30" as const,
    classification_record_reference: "recipient-review",
  };
  const r = calculateScheduleA2026({
    ...syntheticScheduleA2026(),
    cash_gifts: [gift60, gift30],
    cash_gift_classifications: [classification],
  });
  assertEquals([
    r.charity.allowed60,
    r.charity.allowed30,
    r.charity.floor30,
    r.charity.floor60,
  ], [20_000, 30_000, 500, 0]);
  assertEquals(r.lines.line13, 49_500);
  assertEquals(r.charity.carryforward_candidate, { cash60: 0, cash30: 10_500 });
  const high = calculateScheduleA2026({
    ...syntheticScheduleA2026(),
    cash_gifts: [{ ...gift60, amount_paid: 70_100 }],
  });
  assertEquals([
    high.lines.line11,
    high.lines.line13,
    high.charity.carryforward_candidate.cash60,
  ], [60_000, 59_500, 10_500]);
  assertThrows(
    () =>
      calculateScheduleA2026({
        ...syntheticScheduleA2026(),
        cash_gifts: [gift30],
      }),
    Error,
    "classification",
  );
});
Deno.test("2026 DAF acknowledgment, excluded gifts and zero AGI preserve eligibility", () => {
  const gift = {
    ...syntheticCashGift2026,
    recipient_class: "donor_advised_fund" as const,
  };
  const classification = {
    contribution_id: gift.contribution_id,
    category: "cash60" as const,
    classification_record_reference: "charity-type",
  };
  assertThrows(
    () =>
      calculateScheduleA2026({
        ...syntheticScheduleA2026(),
        cash_gifts: [gift],
        cash_gift_classifications: [classification],
      }),
    Error,
    "exclusive-control",
  );
  const r = calculateScheduleA2026({
    ...syntheticScheduleA2026(),
    agi: -100,
    medical_payments: [syntheticMedical2026()],
    cash_gifts: [{
      ...syntheticCashGift2026,
      from_ira_qualified_charitable_distribution: true,
    }],
  });
  assertEquals([r.lines.line3, r.lines.line4, r.lines.line13], [0, 16_500, 0]);
});
Deno.test("2026 receipts prevent duplicate claims, wrong owners and excessive reimbursements", () => {
  const medical = syntheticMedical2026();
  const base = {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    tax_election: "income" as const,
  };
  assertThrows(
    () =>
      calculateItemizedExpenseSources2026({
        ...base,
        medical_payments: [medical, medical],
      }),
    Error,
    "Duplicate",
  );
  assertThrows(
    () =>
      calculateItemizedExpenseSources2026({
        ...base,
        medical_payments: [{ ...medical, payer_ssn: "999887777" }],
      }),
    Error,
    "not a filer",
  );
  assertThrows(
    () =>
      calculateItemizedExpenseSources2026({
        ...base,
        medical_payments: [{ ...medical, reimbursed_amount: 25_000 }],
      }),
    Error,
    "exceed payment",
  );
  assertThrows(
    () =>
      calculateItemizedExpenseSources2026({
        ...base,
        w2_tax_sources: [w2, w2],
      }),
    Error,
    "Duplicate",
  );
  assertThrows(
    () =>
      calculateItemizedExpenseSources2026({
        ...base,
        w2_tax_sources: [w2],
        medical_payments: [{ ...medical, source_document_reference: "w2" }],
      }),
    Error,
    "Duplicate",
  );
  assertThrows(() =>
    calculateItemizedExpenseSources2026({
      ...base,
      medical_payments: [{ ...medical, payment_date: "2025-12-31" }],
    })
  );
});
Deno.test("2026 actual sales election caps vehicle tax before current general-tax refunds", () => {
  const base = {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    tax_election: "actual_sales" as const,
    tax_payments: [syntheticSalesTax2026()],
    w2_tax_sources: [w2],
  };
  assertEquals(
    calculateItemizedExpenseSources2026(base).selectedStateOrSales,
    1_500,
  );
  assertEquals(
    calculateItemizedExpenseSources2026({ ...base, tax_election: "income" })
      .selectedStateOrSales,
    9_500,
  );
  assertThrows(
    () =>
      calculateItemizedExpenseSources2026({
        ...base,
        filing_status: FilingStatus.MFS,
      }),
    Error,
    "spouse",
  );
  assertThrows(
    () =>
      calculateItemizedExpenseSources2026({
        ...base,
        filing_status: FilingStatus.MFS,
        spouse_sales_tax_method: "tables",
      }),
    Error,
    "spouse",
  );
  assertEquals(
    calculateItemizedExpenseSources2026({
      ...base,
      filing_status: FilingStatus.MFS,
      spouse_sales_tax_method: "actual",
    }).selectedStateOrSales,
    1_500,
  );
  assertThrows(
    () =>
      calculateItemizedExpenseSources2026({
        ...base,
        tax_payments: [{
          ...syntheticSalesTax2026(),
          purchase_kind: "ordinary",
        }],
      }),
    Error,
    "stated rate",
  );
  assertThrows(
    () =>
      calculateItemizedExpenseSources2026({
        ...base,
        tax_payments: [{ ...syntheticSalesTax2026(), amount_paid: 1_000 }],
      }),
    Error,
    "reconcile",
  );
});
Deno.test("2026 Schedule A public input accepts receipts, rejects computed totals and requires inventory", () => {
  assertEquals(claimInputSchema.safeParse(itemizedClaim2026).success, true);
  for (
    const key of [
      "agi",
      "salt_addbacks",
      "itemized_before_overall_limit",
      "w2_tax_sources",
      "cash_gifts",
    ]
  ) {
    assertEquals(
      claimInputSchema.safeParse({ ...itemizedClaim2026, [key]: 0 }).success,
      false,
    );
  }
  const raw = {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    agi: 100_000,
  };
  assertEquals(schedule_a_2026.compute(ctx, raw), { outputs: [] });
  assertThrows(
    () => schedule_a_2026.compute(ctx, { ...raw, w2_tax_sources: [w2] }),
    Error,
    "inventory",
  );
  assertThrows(
    () =>
      schedule_a_2026.compute({ ...ctx, taxYear: 2025 }, {
        ...raw,
        ...itemizedClaim2026,
      }),
    Error,
    "2026",
  );
});

Deno.test("2026 mixed cash gifts use amended ten-percent cash coordination", () => {
  const r = calculateScheduleA2026({
    ...syntheticScheduleA2026(),
    cash_gifts: [
      { ...syntheticCashGift2026, amount_paid: 40_100 },
      {
        ...syntheticCashGift2026,
        contribution_id: "other",
        recipient_class: "other_qualified",
        amount_paid: 30_100,
      },
    ],
    cash_gift_classifications: [{
      contribution_id: "other",
      category: "cash30",
      classification_record_reference: "private-foundation-review",
    }],
  });
  assertEquals([r.charity.allowed60, r.charity.allowed30, r.lines.line13], [
    40_000,
    20_000,
    59_500,
  ]);
  assertEquals(r.charity.carryforward_candidate, { cash60: 0, cash30: 10_500 });
});

Deno.test("2026 tax receipts separate income payments from value-based property charges", () => {
  const common = {
    payment_reference: "income-tax",
    source_document_reference: "state-return",
    payer_ssn: "111223333",
    payment_date: "2026-04-15",
    amount_paid: 2_000,
    qualification_record_reference: "tax-inventory",
    not_deducted_elsewhere: true as const,
  };
  const r = calculateScheduleA2026({
    ...syntheticScheduleA2026(),
    tax_payments: [
      {
        ...common,
        kind: "state_local_income",
        authority: "Example State",
        payment_type: "return_payment",
        tax_only_no_penalty_or_interest: true,
        not_withheld_on_information_return: true,
        not_allocable_to_excluded_income: true,
      },
      {
        ...common,
        payment_reference: "car-registration",
        amount_paid: 700,
        kind: "personal_property",
        authority: "Example State",
        property_reference: "family-car",
        non_value_based_charges: 100,
        current_payment_refund: 50,
        imposed_annually_on_value: true,
        personal_use_only: true,
      },
    ],
    w2_tax_sources: [w2],
  });
  assertEquals([r.lines.line5a, r.lines.line5c, r.lines.line5e], [
    11_500,
    550,
    12_050,
  ]);
});
Deno.test("2026 Schedule A requires explicit review of unsupported positive categories", () => {
  const raw = syntheticScheduleA2026();
  assertThrows(() =>
    calculateScheduleA2026({ ...raw, source_scope_review: undefined } as never)
  );
  assertThrows(() =>
    calculateScheduleA2026(
      {
        ...raw,
        source_scope_review: {
          ...raw.source_scope_review,
          no_noncash_gifts_or_prior_charitable_carryovers: false,
        },
      } as never,
    )
  );
  const joint = {
    ...raw,
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "444556666",
    medical_payments: [{ ...syntheticMedical2026(), payer_ssn: "444556666" }],
  };
  assertEquals(calculateScheduleA2026(joint).lines.line4, 9_000);
  assertThrows(
    () => calculateScheduleA2026({ ...joint, filing_status: FilingStatus.MFS }),
    Error,
    "not a filer",
  );
});
