import { assertEquals, assertThrows } from "@std/assert";
import { f1099g } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";

function minimalItem(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return { farm_id: "farm-1", ...overrides };
}

function identifiedFarmItem(overrides: Record<string, unknown> = {}) {
  return minimalItem({
    payer_name: "USDA Farm Service Agency",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    source_document_reference: "issued-farm-1099g-1",
    ...(typeof overrides.box_7_agriculture === "number" &&
        overrides.box_7_agriculture > 0
      ? {
        box_7_payment_kind: "agricultural_program",
        box_7_review_reference: "reviewed USDA payment classification",
      }
      : {}),
    ...overrides,
  });
}

function identifiedFarmSource(
  kind: string,
  amount: number,
  reference = "issued-farm-1099g-1",
) {
  return {
    farm_id: "farm-1",
    kind,
    amount,
    payer_name: "USDA Farm Service Agency",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    source_document_reference: reference,
  };
}

function reviewedNonbusinessGrant(amount: number) {
  return minimalItem({
    box_6_taxable_grants: amount,
    box_6_schedule1_nonbusiness_reviewed: true,
    payer_name: "State Grant Agency",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    source_document_reference: "issued-grant-1099g-1",
  });
}

function rtaaItem(amount: number, reference = "issued-rtaa-1099g-1") {
  return minimalItem({
    box_5_rtaa: amount,
    payer_name: "State RTAA Agency",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    source_document_reference: reference,
  });
}

function reviewedRefund(
  refund: number,
  taxable: number,
  overrides: Record<string, unknown> = {},
) {
  return minimalItem({
    box_2_state_refund: refund,
    box_2_prior_year_itemized: taxable > 0,
    box_2_taxable_recovery_verified_amount: taxable,
    box_2_recovery_workpaper_reference: "reviewed-2024-state-refund-workpaper",
    ...overrides,
  });
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f1099g.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099gs: items,
  });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

Deno.test("1099-G repeated identified account cannot double income or withholding after a changed copy", () => {
  const issued = minimalItem({
    payer_name: "State Agency",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    account_number: "BEN-1",
    source_document_reference: "issued-1099g-copy-1",
    box_1_unemployment: 500,
    box_4_federal_withheld: 20,
  });
  assertThrows(
    () =>
      compute([issued, {
        ...issued,
        source_document_reference: "corrected-1099g-copy-2",
        box_1_unemployment: 600,
      }]),
    Error,
    "repeats the same identified payer, recipient, and account",
  );
  const distinct = compute([
    issued,
    {
      ...issued,
      account_number: "BEN-2",
      source_document_reference: "separate-1099g-copy-2",
    },
  ]);
  assertEquals(fieldsOf(distinct.outputs, schedule1)?.line7_unemployment, 1000);
  assertEquals(fieldsOf(distinct.outputs, f1040)?.line25b_withheld_1099, 40);
});

Deno.test("1099-G repeated issued reference without an account cannot double RTAA income", () => {
  const issued = rtaaItem(500);
  assertThrows(
    () => compute([issued, { ...issued, box_5_rtaa: 600 }]),
    Error,
    "repeats the same issued-copy source reference",
  );
  compute([issued, rtaaItem(600, "separate-issued-rtaa-copy")]);
});

Deno.test("1099-G cannot reuse one issued-copy reference across payers", () => {
  const issued = rtaaItem(500);
  assertThrows(
    () =>
      compute([issued, {
        ...issued,
        payer_name: "Second State Agency",
        payer_tin: "987654321",
      }]),
    Error,
    "repeats the same issued-copy source reference",
  );
  compute([issued, {
    ...issued,
    payer_name: "Second State Agency",
    payer_tin: "987654321",
    source_document_reference: "separate-issued-rtaa-copy",
  }]);
});

Deno.test("1099-G repeated issued reference rejects with no payer TIN or account", () => {
  const issued = minimalItem({
    payer_name: "State Agency",
    payer_tin: undefined,
    recipient_tin: "111223333",
    account_number: undefined,
    source_document_reference: "issued-unemployment-copy",
    box_1_unemployment: 500,
  });
  assertThrows(
    () => compute([issued, { ...issued, box_1_unemployment: 600 }]),
    Error,
    "repeats the same issued-copy source reference",
  );
  const distinct = compute([
    issued,
    { ...issued, source_document_reference: "second-unemployment-copy" },
  ]);
  assertEquals(fieldsOf(distinct.outputs, schedule1)?.line7_unemployment, 1000);
});

Deno.test("1099-G positive copies need account or issued-copy identity", () => {
  const unidentified = minimalItem({
    payer_name: "State Agency",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    box_1_unemployment: 500,
  });
  const identified = {
    ...unidentified,
    account_number: "BEN-1",
    box_1_unemployment: 600,
  };
  const message =
    "1099-G has multiple positive payer copies without account or issued source reference";
  assertThrows(
    () => compute([unidentified, { ...unidentified }]),
    Error,
    message,
  );
  assertThrows(() => compute([unidentified, identified]), Error, message);
  assertThrows(() => compute([identified, unidentified]), Error, message);
  const distinct = compute([
    identified,
    { ...identified, account_number: "BEN-2" },
  ]);
  assertEquals(fieldsOf(distinct.outputs, schedule1)?.line7_unemployment, 1200);
});

Deno.test("1099-G keeps one payer identity when only one copy has its TIN", () => {
  const withTin = minimalItem({
    payer_name: "State Agency",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    box_1_unemployment: 500,
  });
  const withoutTin = minimalItem({
    payer_name: " state   AGENCY ",
    recipient_tin: "111223333",
    box_1_unemployment: 600,
  });
  const ambiguous =
    "1099-G has multiple positive payer copies without account or issued source reference";
  assertThrows(() => compute([withTin, withoutTin]), Error, ambiguous);
  assertThrows(() => compute([withoutTin, withTin]), Error, ambiguous);
  assertThrows(
    () =>
      compute([
        { ...withTin, account_number: "BEN-1" },
        { ...withoutTin, account_number: "BEN-1" },
      ]),
    Error,
    "repeats the same identified payer, recipient, and account",
  );
  assertEquals(
    fieldsOf(
      compute([
        { ...withTin, account_number: "BEN-1" },
        { ...withoutTin, account_number: "BEN-2" },
      ]).outputs,
      schedule1,
    )?.line7_unemployment,
    1100,
  );
});

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f1099g.inputSchema: negative box_1_unemployment fails validation", () => {
  const parsed = f1099g.inputSchema.safeParse({
    f1099gs: [{ box_1_unemployment: -1 }],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Per-Box Routing
// =============================================================================

Deno.test("f1099g.compute: box_1_unemployment routes to schedule1 line7_unemployment", () => {
  const result = compute([minimalItem({ box_1_unemployment: 8000 })]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 8000);
});

Deno.test("f1099g.compute: box_1_unemployment zero produces no schedule1 unemployment output", () => {
  const result = compute([minimalItem({ box_1_unemployment: 0 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line7_unemployment !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_1_repaid reduces unemployment on schedule1 line7", () => {
  const result = compute([
    minimalItem({ box_1_unemployment: 8000, box_1_repaid: 2000 }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 6000);
});

Deno.test("f1099g.compute: box_2_state_refund taxable when prior year itemized routes to schedule1 line1", () => {
  const result = compute([
    reviewedRefund(300, 300),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line1_state_refund, 300);
  assertEquals(fieldsOf(result.outputs, form6251)?.line2b_tax_refund, 300);
});

Deno.test("f1099g.compute: box_2_state_refund not taxable when not itemized — no line1 output", () => {
  const result = compute([
    reviewedRefund(300, 0),
  ]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line1_state_refund !== undefined,
  );
  assertEquals(out, undefined);
  assertEquals(fieldsOf(result.outputs, form6251), undefined);
});

Deno.test("f1099g.compute: partial taxable state refund uses reviewed amount on Schedule 1, AGI, and AMT", () => {
  const result = compute([reviewedRefund(500, 180)]);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line1_state_refund, 180);
  assertEquals(
    (findOutput(result, "agi_aggregator")!.fields as Record<string, unknown>)
      .line1_state_refund,
    180,
  );
  assertEquals(fieldsOf(result.outputs, form6251)!.line2b_tax_refund, 180);
});

Deno.test("f1099g.compute: state refund above box 2 or inconsistent with no itemization is rejected", () => {
  assertThrows(() => compute([reviewedRefund(500, 501)]), Error);
  assertThrows(
    () =>
      compute([reviewedRefund(500, 100, { box_2_prior_year_itemized: false })]),
    Error,
  );
});

Deno.test("f1099g.compute: positive state refund without workpaper reference is rejected", () => {
  assertThrows(
    () =>
      compute([
        reviewedRefund(500, 100, {
          box_2_recovery_workpaper_reference: undefined,
        }),
      ]),
    Error,
  );
});

Deno.test("f1099g.compute: box_2_state_refund zero with itemized — no line1 output", () => {
  const result = compute([
    reviewedRefund(0, 0, { box_2_prior_year_itemized: true }),
  ]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line1_state_refund !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_4_federal_withheld routes to f1040 line25b_withheld_1099", () => {
  const result = compute([minimalItem({ box_4_federal_withheld: 400 })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line25b_withheld_1099, 400);
});

Deno.test("f1099g.compute: box_4_federal_withheld zero — no f1040 withholding output", () => {
  const result = compute([minimalItem({ box_4_federal_withheld: 0 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" &&
      (o.fields as Record<string, unknown>).line25b_withheld_1099 !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_5_rtaa routes to schedule1 line8z_rtaa", () => {
  const result = compute([rtaaItem(1500)]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8z_rtaa, 1500);
  assertEquals(input.f1099g_rtaa_sources?.[0]?.amount, 1500);
  assertEquals(input.f1099g_rtaa_sources?.[0]?.payer_tin, "123456789");
});

Deno.test("f1099g.compute: box_5_rtaa zero — no schedule1 rtaa output", () => {
  const result = compute([minimalItem({ box_5_rtaa: 0 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line8z_rtaa !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_6_taxable_grants routes to schedule1 line8z_taxable_grants", () => {
  const result = compute([reviewedNonbusinessGrant(2000)]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8z_taxable_grants, 2000);
});

Deno.test("f1099g.compute: unclassified box 6 grant cannot silently become line 8z income", () => {
  assertThrows(
    () => compute([minimalItem({ box_6_taxable_grants: 2_000 })]),
    Error,
    "reviewed nonbusiness Schedule 1 classification",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        box_6_taxable_grants: 2_000,
        box_6_schedule1_nonbusiness_reviewed: false,
      })]),
    Error,
    "reviewed nonbusiness Schedule 1 classification",
  );
});

Deno.test("f1099g.compute: box_7_agriculture retains its farm source", () => {
  const result = compute([identifiedFarmItem({ box_7_agriculture: 3500 })]);
  const out = findOutput(result, "schedule_f");
  assertEquals(out?.fields.farm_sources, [
    identifiedFarmSource("1099g_agriculture", 3500),
  ]);
});

Deno.test("1099-G positive farm payments reject missing issued payer or recipient identity", () => {
  for (
    const field of [
      "payer_name",
      "payer_tin",
      "recipient_tin",
      "source_document_reference",
    ]
  ) {
    const source = identifiedFarmItem({ box_7_agriculture: 3500 });
    delete source[field];
    assertThrows(
      () => compute([source]),
      Error,
      "Form 1099-G farm payments need farm, payer, recipient, and issued-copy identity",
    );
  }
});

Deno.test("1099-G box 7 requires reviewed payment character", () => {
  const source = identifiedFarmItem({ box_7_agriculture: 3500 });
  delete source.box_7_payment_kind;
  assertThrows(
    () => compute([source]),
    Error,
    "Form 1099-G box 7 needs reviewed agricultural-program or current-year-taxable crop-disaster classification",
  );
});

Deno.test("f1099g.compute: box_7_agriculture zero — no schedule_f output", () => {
  const result = compute([minimalItem({ box_7_agriculture: 0 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_f" &&
      (o.fields as Record<string, unknown>).farm_sources !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_9_market_gain retains its farm source", () => {
  const result = compute([identifiedFarmItem({ box_9_market_gain: 600 })]);
  const out = findOutput(result, "schedule_f");
  assertEquals(out?.fields.farm_sources, [
    identifiedFarmSource("1099g_ccc_market_gain", 600),
  ]);
});

Deno.test("f1099g.compute: box_9_market_gain zero — no schedule_f ccc output", () => {
  const result = compute([minimalItem({ box_9_market_gain: 0 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_f" &&
      (o.fields as Record<string, unknown>).farm_sources !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: empty item produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Aggregation — multiple 1099-G items
// =============================================================================

Deno.test("f1099g.compute: multiple items — box_1_unemployment summed across all items", () => {
  const result = compute([
    minimalItem({
      box_1_unemployment: 5000,
      source_document_reference: "issued-unemployment-copy-1",
    }),
    minimalItem({
      box_1_unemployment: 3000,
      source_document_reference: "issued-unemployment-copy-2",
    }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 8000);
});

Deno.test("f1099g.compute: multiple items — box_1_repaid subtracted from total across all items", () => {
  const result = compute([
    minimalItem({
      box_1_unemployment: 6000,
      box_1_repaid: 1000,
      source_document_reference: "issued-unemployment-copy-1",
    }),
    minimalItem({
      box_1_unemployment: 4000,
      box_1_repaid: 500,
      source_document_reference: "issued-unemployment-copy-2",
    }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 8500); // 10000 - 1500
});

Deno.test("f1099g.compute: multiple items — box_4_federal_withheld summed to f1040 line25b", () => {
  const result = compute([
    minimalItem({
      box_4_federal_withheld: 300,
      source_document_reference: "issued-withholding-copy-1",
    }),
    minimalItem({
      box_4_federal_withheld: 200,
      source_document_reference: "issued-withholding-copy-2",
    }),
  ]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line25b_withheld_1099, 500);
});

Deno.test("f1099g.compute: multiple items — box_5_rtaa summed on schedule1 line8z_rtaa", () => {
  const result = compute([
    rtaaItem(1000, "issued-rtaa-1099g-1"),
    rtaaItem(2000, "issued-rtaa-1099g-2"),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8z_rtaa, 3000);
});

Deno.test("f1099g.compute: multiple items — box_2_state_refund summed when both itemized", () => {
  const result = compute([
    reviewedRefund(100, 100, {
      source_document_reference: "issued-refund-copy-1",
    }),
    reviewedRefund(200, 200, {
      source_document_reference: "issued-refund-copy-2",
    }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line1_state_refund, 300);
});

Deno.test("f1099g.compute: multiple agricultural payments retain separate source records", () => {
  const result = compute([
    identifiedFarmItem({ box_7_agriculture: 1000 }),
    identifiedFarmItem({
      box_7_agriculture: 2500,
      source_document_reference: "issued-farm-1099g-2",
    }),
  ]);
  const out = findOutput(result, "schedule_f");
  assertEquals(out?.fields.farm_sources, [
    identifiedFarmSource("1099g_agriculture", 1000),
    identifiedFarmSource("1099g_agriculture", 2500, "issued-farm-1099g-2"),
  ]);
});

Deno.test("f1099g.compute: mixed items — unemployment and state refund both routed correctly", () => {
  const result = compute([
    minimalItem({
      box_1_unemployment: 6000,
      source_document_reference: "issued-unemployment-copy",
    }),
    reviewedRefund(400, 400, {
      source_document_reference: "issued-refund-copy",
    }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 6000);
  assertEquals(input.line1_state_refund, 400);
});

// =============================================================================
// 4. Issuer reporting thresholds do not limit recipient income
// =============================================================================

// Box 1 unemployment — the $10 payer threshold is not an income exclusion.
Deno.test("f1099g.compute: box_1_unemployment $9 routes to Schedule 1 and AGI", () => {
  const result = compute([minimalItem({ box_1_unemployment: 9 })]);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line7_unemployment, 9);
  assertEquals(
    (findOutput(result, "agi_aggregator")!.fields as Record<string, unknown>)
      .line7_unemployment,
    9,
  );
});

Deno.test("f1099g.compute: box_1_unemployment $10 (at threshold) — routes to schedule1", () => {
  const result = compute([minimalItem({ box_1_unemployment: 10 })]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 10);
});

Deno.test("f1099g.compute: box_1_unemployment $11 (above threshold) — routes to schedule1", () => {
  const result = compute([minimalItem({ box_1_unemployment: 11 })]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 11);
});

// Box 2 state refund — this fixture designates the prior-year refund taxable.
Deno.test("f1099g.compute: taxable $9 state refund routes to Schedule 1, AGI, and AMT reversal", () => {
  const result = compute([
    reviewedRefund(9, 9),
  ]);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line1_state_refund, 9);
  assertEquals(
    (findOutput(result, "agi_aggregator")!.fields as Record<string, unknown>)
      .line1_state_refund,
    9,
  );
  assertEquals(fieldsOf(result.outputs, form6251)!.line2b_tax_refund, 9);
});

Deno.test("f1099g.compute: box_2_state_refund $10 (at threshold) with itemized — routes to schedule1", () => {
  const result = compute([
    reviewedRefund(10, 10),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line1_state_refund, 10);
});

// Box 5 RTAA — the $600 payer threshold is not an income exclusion.
Deno.test("f1099g.compute: box_5_rtaa $599 routes to Schedule 1 and AGI", () => {
  const result = compute([rtaaItem(599)]);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8z_rtaa, 599);
  assertEquals(
    (findOutput(result, "agi_aggregator")!.fields as Record<string, unknown>)
      .line8z_rtaa,
    599,
  );
});

Deno.test("f1099g.compute: box_5_rtaa $600 (at threshold) — routes to schedule1", () => {
  const result = compute([rtaaItem(600)]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8z_rtaa, 600);
});

Deno.test("f1099g.compute: box_5_rtaa $601 (above threshold) — routes to schedule1", () => {
  const result = compute([rtaaItem(601)]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8z_rtaa, 601);
});

// Box 6 taxable grants — the $600 payer threshold is not an income exclusion.
Deno.test("f1099g.compute: taxable $599 grant routes to Schedule 1 and AGI", () => {
  const result = compute([reviewedNonbusinessGrant(599)]);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8z_taxable_grants, 599);
  assertEquals(
    (findOutput(result, "agi_aggregator")!.fields as Record<string, unknown>)
      .line8z_taxable_grants,
    599,
  );
});

Deno.test("f1099g.compute: box_6_taxable_grants $600 (at threshold) — routes to schedule1", () => {
  const result = compute([reviewedNonbusinessGrant(600)]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8z_taxable_grants, 600);
});

// Repayment netting
Deno.test("f1099g.compute: box_1_repaid $3000 — net $7000 flows to line 7", () => {
  const result = compute([
    minimalItem({ box_1_unemployment: 10000, box_1_repaid: 3000 }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 7000);
});

Deno.test("f1099g.compute: box_1_repaid $3001 — net $6999 on line7", () => {
  const result = compute([
    minimalItem({ box_1_unemployment: 10000, box_1_repaid: 3001 }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 6999);
});

// =============================================================================
// 5. Hard Validation Rules — throws
// =============================================================================

Deno.test("f1099g.compute: throws on negative box_1_unemployment", () => {
  assertThrows(() => compute([minimalItem({ box_1_unemployment: -1 })]), Error);
});

// =============================================================================
// 6. Warning-Only Rules — must NOT throw
// =============================================================================

Deno.test("f1099g.compute: box_1_railroad=true does not throw and routes unemployment to schedule1", () => {
  const result = compute([
    minimalItem({ box_1_unemployment: 5000, box_1_railroad: true }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 5000);
});

// =============================================================================
// 7. Informational Fields — must NOT produce tax outputs
// =============================================================================

Deno.test("f1099g.compute: state-only fields (box_10a, box_10b, box_11) produce no federal outputs", () => {
  const result = compute([minimalItem({
    box_10a_state: "CA",
    box_10b_state_id: "123-456-789",
    box_11_state_withheld: 500,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f1099g.compute: box_8_trade_or_business and administrative fields produce no outputs", () => {
  const result = compute([minimalItem({
    box_8_trade_or_business: true,
    box_3_tax_year: 2024,
    payer_name: "State UI",
    payer_tin: "12-3456789",
    account_number: "ACC-001",
  })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 8. Edge Cases
// =============================================================================

Deno.test("f1099g.compute: fully repaid current-year unemployment emits zero line 7 for the repayment annotation", () => {
  const result = compute([
    minimalItem({ box_1_unemployment: 5000, box_1_repaid: 5000 }),
  ]);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line7_unemployment, 0);
});

Deno.test("f1099g.compute: same-year repayment above retained benefits rejects", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({ box_1_unemployment: 2000, box_1_repaid: 3000 }),
      ]),
    Error,
    "same-year unemployment repayment exceeds retained current-year benefits",
  );
});

Deno.test("f1099g.compute: positive state refund without tax-benefit workpaper fails closed", () => {
  assertThrows(
    () => compute([minimalItem({ box_2_state_refund: 300 })]),
    Error,
    "reviewed taxable recovery",
  );
});

Deno.test("f1099g.compute: mixed reviewed taxable and nontaxable refunds — only taxable recovery included", () => {
  const result = compute([
    reviewedRefund(200, 200, {
      source_document_reference: "issued-refund-copy-1",
    }),
    reviewedRefund(500, 0, {
      source_document_reference: "issued-refund-copy-2",
    }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line1_state_refund, 200);
});

Deno.test("f1099g.compute: empty g99s array produces no outputs", () => {
  const result = f1099g.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099gs: [],
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 9. Smoke Test — all major boxes populated
// =============================================================================

Deno.test("f1099g.compute: smoke test — all major boxes populated produces correct outputs", () => {
  const result = compute([
    minimalItem({
      box_1_unemployment: 12000,
      box_1_repaid: 1000,
      box_1_railroad: false,
      box_2_state_refund: 500,
      box_2_prior_year_itemized: true,
      box_2_taxable_recovery_verified_amount: 500,
      box_2_recovery_workpaper_reference:
        "reviewed-2024-state-refund-workpaper",
      box_3_tax_year: 2024,
      box_4_federal_withheld: 800,
      box_5_rtaa: 1200,
      box_6_taxable_grants: 750,
      box_6_schedule1_nonbusiness_reviewed: true,
      box_7_agriculture: 4000,
      box_7_payment_kind: "agricultural_program",
      box_7_review_reference: "reviewed USDA payment classification",
      box_8_trade_or_business: false,
      box_9_market_gain: 300,
      box_10a_state: "TX",
      box_10b_state_id: "TX-123",
      box_11_state_withheld: 250,
      payer_name: "Texas Workforce Commission",
      payer_tin: "74-6000001",
      recipient_tin: "111223333",
      source_document_reference: "issued-2025-1099g-all-boxes",
      account_number: "TX-2025-001",
    }),
  ]);

  // Schedule 1: unemployment net (12000 - 1000 = 11000)
  const s1 = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1.line7_unemployment, 11000);
  // Schedule 1: state refund taxable (itemized)
  assertEquals(s1.line1_state_refund, 500);
  // Schedule 1: RTAA payments
  assertEquals(s1.line8z_rtaa, 1200);
  // Schedule 1: taxable grants
  assertEquals(s1.line8z_taxable_grants, 750);

  // Form 1040: federal withholding
  const f = fieldsOf(result.outputs, f1040)!;
  assertEquals(f.line25b_withheld_1099, 800);

  // Schedule F: agriculture payments and CCC market gain
  const schedF = findOutput(result, "schedule_f");
  assertEquals(schedF?.fields.farm_sources, [
    {
      farm_id: "farm-1",
      kind: "1099g_agriculture",
      amount: 4000,
      payer_name: "Texas Workforce Commission",
      payer_tin: "746000001",
      recipient_tin: "111223333",
      source_document_reference: "issued-2025-1099g-all-boxes",
    },
    {
      farm_id: "farm-1",
      kind: "1099g_ccc_market_gain",
      amount: 300,
      payer_name: "Texas Workforce Commission",
      payer_tin: "746000001",
      recipient_tin: "111223333",
      source_document_reference: "issued-2025-1099g-all-boxes",
    },
  ]);
});
