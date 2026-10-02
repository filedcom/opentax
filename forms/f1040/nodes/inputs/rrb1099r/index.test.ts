import { assertEquals, assertThrows } from "@std/assert";
import { rrb1099r } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";

function source(overrides: Record<string, unknown> = {}) {
  return {
    payer_name: "Railroad Retirement Board",
    recipient_tin: "111223333",
    ...overrides,
  };
}

function compute(items: ReturnType<typeof source>[]) {
  return rrb1099r.compute(
    { taxYear: 2025, formType: "f1040" },
    { rrb1099rs: items },
  );
}

Deno.test("RRB-1099-R fully taxable pension reaches Form 1040 and AGI", () => {
  const result = compute([source({
    box4_contributory_amount_paid: 4_000,
    box5_vested_dual_benefit: 500,
    box6_supplemental_annuity: 1_000,
    box7_total_gross_paid: 5_500,
    box9_federal_withheld: 550,
  })]);
  assertEquals(fieldsOf(result.outputs, f1040), {
    line5a_pension_gross: 5_500,
    line5b_pension_taxable: 5_500,
    line25b_withheld_1099: 550,
  });
  assertEquals(fieldsOf(result.outputs, agi_aggregator), {
    line5b_pension_taxable: 5_500,
  });
});

Deno.test("RRB-1099-R adds distinct pension statements", () => {
  const result = compute([
    source({ box5_vested_dual_benefit: 500, box7_total_gross_paid: 500 }),
    source({ box6_supplemental_annuity: 700, box7_total_gross_paid: 700 }),
  ]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line5a_pension_gross, 1_200);
  assertEquals(
    fieldsOf(result.outputs, agi_aggregator)?.line5b_pension_taxable,
    1_200,
  );
});

Deno.test("RRB-1099-R box 7 must replay boxes 4, 5, and 6", () => {
  assertThrows(
    () =>
      compute([source({
        box4_contributory_amount_paid: 4_000,
        box5_vested_dual_benefit: 500,
        box7_total_gross_paid: 5_000,
      })]),
    Error,
    "RRB-1099-R box 7 must equal boxes 4, 5, and 6",
  );
});

Deno.test("RRB-1099-R cost basis and prior-year repayments need review", () => {
  assertThrows(
    () =>
      compute([source({
        box3_employee_contributions: 1_000,
        box4_contributory_amount_paid: 4_000,
        box7_total_gross_paid: 4_000,
      })]),
    Error,
    "needs reviewed cost recovery",
  );
  assertThrows(
    () => compute([source({ box8_prior_year_repayments: 1_000 })]),
    Error,
    "prior-year repayments need deduction or credit review",
  );
});

Deno.test("RRB-1099-R cannot accept RRB-1099 SSEB boxes", () => {
  assertThrows(
    () => compute([source({ box3_sseb_gross: 5_000 })]),
    Error,
    "Unrecognized key",
  );
  assertThrows(
    () => compute([source({ box5_sseb_net: 5_000 })]),
    Error,
    "Unrecognized key",
  );
  assertThrows(
    () => compute([source({ box7_sseb_withheld: 500 })]),
    Error,
    "Unrecognized key",
  );
});

Deno.test("RRB-1099-R cannot accept old mislabeled pension boxes", () => {
  assertThrows(
    () => compute([source({ box8_tier2_gross: 5_000 })]),
    Error,
    "Unrecognized key",
  );
  assertThrows(
    () => compute([source({ box9_tier2_taxable: 5_000 })]),
    Error,
    "Unrecognized key",
  );
  assertThrows(
    () => compute([source({ box10_tier2_withheld: 500 })]),
    Error,
    "Unrecognized key",
  );
});

Deno.test("RRB-1099-R withholding uses box 9, even with no current pension", () => {
  const result = compute([source({ box9_federal_withheld: 50 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25b_withheld_1099, 50);
  assertEquals(fieldsOf(result.outputs, agi_aggregator), undefined);
});

Deno.test("RRB-1099-R empty amounts have no tax output", () => {
  assertEquals(compute([source()]).outputs, []);
});

Deno.test("RRB-1099-R positive pension needs box 2 recipient identity", () => {
  assertThrows(
    () =>
      compute([source({
        recipient_tin: undefined,
        box5_vested_dual_benefit: 500,
        box7_total_gross_paid: 500,
      })]),
    Error,
    "needs box 2 recipient TIN",
  );
});
