import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { itemSchema } from "../../../../../inputs/income/business/schedule_c/model.ts";
import { FilingStatus } from "../../../../../types.ts";
import { reviewedLossSeAllocations } from "./loss-se.ts";
const item = (reference: string, gross: number, share: number) =>
  itemSchema.parse({
    business_reference: reference,
    line_a_principal_business: "Repairs",
    line_b_business_code: "811490",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_1_gross_receipts: gross,
    qbi_loss_se_tax_allocation_review: {
      deduction_amount: share,
      allocation_method: "owner_gross_income_proportion_with_cent_residual",
      all_owner_businesses_included_confirmed: true,
      no_other_qbi_adjustments_confirmed: true,
      workpaper_reference: "Synthetic allocation ledger",
      reviewed_by: "Synthetic reviewer",
      reviewed_on: "2026-02-01",
    },
  });
test("Loss SE cent residual follows stable references across source order", () => {
  const rows = [item("b", 1, .33), item("a", 1, .34), item("c", 1, .33)];
  assertEquals(
    reviewedLossSeAllocations(rows, FilingStatus.Single, { deduction: 1 }, 2025),
    [.33, .34, .33],
  );
  assertEquals(
    reviewedLossSeAllocations(
      [rows[1], rows[2], rows[0]],
      FilingStatus.Single,
      { deduction: 1 },
      2025,
    ),
    [.34, .33, .33],
  );
});
test("Loss SE zero gross gets no share and positive deduction requires gross income", () => {
  assertEquals(
    reviewedLossSeAllocations(
      [item("a", 0, 0), item("b", 10, 1)],
      FilingStatus.Single,
      { deduction: 1 },
      2025,
    ),
    [0, 1],
  );
  assertThrows(
    () =>
      reviewedLossSeAllocations([item("a", 0, 0)], FilingStatus.Single, {
        deduction: 1,
      }, 2025),
    Error,
    "gross income basis",
  );
  assertThrows(
    () =>
      reviewedLossSeAllocations([item("a", 1.001, 1)], FilingStatus.Single, {
        deduction: 1,
      }, 2025),
    Error,
    "exact cents",
  );
});
test("Loss SE excludes exempt trades and unreconciled owner sources", () => {
  for (const field of ["statutory_employee", "paper_route", "exempt_notary"]) {
    const row = item("a", 10, 1);
    Reflect.set(row, field, true);
    assertThrows(
      () =>
        reviewedLossSeAllocations([row], FilingStatus.Single, { deduction: 1 }, 2025),
      Error,
      "reviewed gross-income SE allocations",
    );
  }
  assertThrows(
    () =>
      reviewedLossSeAllocations([item("a", 10, 1)], FilingStatus.MFJ, {
        deduction: 1,
      }, 2025),
    Error,
    "actual filing status",
  );
});
