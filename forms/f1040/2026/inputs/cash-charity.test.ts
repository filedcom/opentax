import { assertEquals, assertThrows } from "@std/assert";
import { cash_charity_2026, cashGift2026Schema } from "./cash-charity.ts";
import { syntheticCashGift2026 as gift } from "./cash-charity.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
const ctx = { taxYear: 2026, formType: "f1040" };
const base = {
  filing_status: FilingStatus.Single,
  taxpayer_ssn: gift.donor_ssn,
  cash_gifts: [gift],
};
function amount(input: Parameters<typeof cash_charity_2026.compute>[1]) {
  return cash_charity_2026.compute(ctx, input).outputs.find((row) =>
    row.nodeType === "standard_deduction"
  )?.fields.nonitemizer_cash_contributions;
}
Deno.test("2026 cash gift owner subtracts benefits, preserves receipts and defers the filing-status cap", () => {
  assertEquals(amount(base), 500);
  const large = { ...gift, amount_paid: 2_000.25, goods_or_services_value: 0 };
  assertEquals(
    amount({
      ...base,
      cash_gifts: [large, {
        ...large,
        contribution_id: "two",
        amount_paid: 100.25,
      }],
    }),
    2_100.5,
  );
  const outputs = cash_charity_2026.compute(ctx, base).outputs;
  const retained = outputs.find((row) => row.nodeType === "schedule_a")!.fields
    .cash_gift_sources_2026 as Record<string, unknown>[];
  assertEquals(
    retained[0].payment_record_reference,
    gift.payment_record_reference,
  );
  assertEquals(retained[0].charitable_amount, 500);
  assertEquals(
    cash_charity_2026.compute(ctx, { ...base, cash_gifts: [] }).outputs,
    [],
  );
});
Deno.test("2026 nonitemizer charity excludes DAF, supporting organizations, other charities and QCD", () => {
  for (
    const recipient_class of [
      "donor_advised_fund",
      "supporting_organization",
      "other_qualified",
      "not_qualified",
    ] as const
  ) {
    assertEquals(
      amount({ ...base, cash_gifts: [{ ...gift, recipient_class }] }),
      0,
    );
  }
  assertEquals(
    amount({
      ...base,
      cash_gifts: [{
        ...gift,
        from_ira_qualified_charitable_distribution: true,
      }],
    }),
    0,
  );
  assertThrows(
    () =>
      amount({
        ...base,
        cash_gifts: [{
          ...gift,
          state_local_credit_or_reimbursement_amount: 50,
        }],
      }),
    Error,
    "deduction-reduction review",
  );
});
Deno.test("2026 cash gifts require current-year owned, unique and substantiated source records", () => {
  assertThrows(
    () => amount({ ...base, cash_gifts: [gift, gift] }),
    Error,
    "Duplicate",
  );
  assertThrows(
    () =>
      amount({ ...base, cash_gifts: [{ ...gift, donor_ssn: "333445555" }] }),
    Error,
    "donor",
  );
  assertEquals(
    amount({
      ...base,
      filing_status: FilingStatus.MFJ,
      spouse_ssn: "333445555",
      cash_gifts: [{ ...gift, donor_ssn: "333445555" }],
    }),
    500,
  );
  assertThrows(
    () =>
      amount({
        ...base,
        filing_status: FilingStatus.MFS,
        spouse_ssn: "333445555",
        cash_gifts: [{ ...gift, donor_ssn: "333445555" }],
      }),
    Error,
    "donor",
  );
  assertThrows(
    () =>
      amount({ ...base, cash_gifts: [{ ...gift, acknowledgment: undefined }] }),
    Error,
    "acknowledgment",
  );
  assertEquals(
    amount({
      ...base,
      cash_gifts: [{
        ...gift,
        amount_paid: 249.99,
        goods_or_services_value: 0,
        acknowledgment: undefined,
      }],
    }),
    249.99,
  );
  assertThrows(
    () =>
      cashGift2026Schema.parse({ ...gift, contribution_date: "2025-12-31" }),
    Error,
    "2026",
  );
  assertThrows(
    () =>
      cashGift2026Schema.parse({ ...gift, contribution_date: "2026-02-30" }),
    Error,
  );
  assertThrows(
    () => cashGift2026Schema.parse({ ...gift, payment_method: "noncash" }),
    Error,
  );
  assertThrows(
    () =>
      amount({
        ...base,
        cash_gifts: [{ ...gift, goods_or_services_value: 601 }],
      }),
    Error,
    "exceeds",
  );
});

Deno.test("2026 repeated cash-gift input routes actual records through the shared start node", async () => {
  const { inputNodes } = await import("../inputs.ts");
  const { buildStartNode } = await import("../../start.ts");
  const result = buildStartNode(inputNodes).compute(ctx, {
    cash_gifts: [gift],
  });
  assertEquals(result.outputs, [{
    nodeType: "cash_charity",
    fields: { cash_gifts: [gift] },
  }]);
});
