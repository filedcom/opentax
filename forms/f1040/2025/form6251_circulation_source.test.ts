import { assertThrows } from "@std/assert";
import { assertForm6251CirculationSource } from "./form6251_circulation_source.ts";

const item = {
  expenditure_type: "circulation",
  amortization_period_start: "2025-01-01",
  original_amount: 30_000,
  remaining_unamortized: 20_000,
  regular_tax_deduction: 8_000,
  amt_deduction: 10_000,
  regular_three_year_writeoff_elected: false,
  circulation_reviewed_workpaper_reference: "circulation-2025",
  circulation_no_unamortized_property_loss: true,
};

Deno.test("Form 6251 line 2o replays reviewed §59(e) deductions at export", () => {
  const fields = { line2o_circulation_costs: -2_000 };
  assertForm6251CirculationSource(fields, { f59e: { f59es: [item] } });
  for (
    const altered of [
      { ...item, amt_deduction: 9_000 },
      { ...item, circulation_reviewed_workpaper_reference: undefined },
      { ...item, regular_three_year_writeoff_elected: true },
    ]
  ) {
    assertThrows(
      () =>
        assertForm6251CirculationSource(fields, {
          f59e: { f59es: [altered] },
        }),
      Error,
      "matching retained, reviewed circulation-cost deductions",
    );
  }
  assertThrows(
    () => assertForm6251CirculationSource(fields, undefined),
    Error,
    "matching retained, reviewed circulation-cost deductions",
  );
  assertThrows(
    () => assertForm6251CirculationSource({}, { f59e: { f59es: [item] } }),
    Error,
    "matching retained, reviewed circulation-cost deductions",
  );
});
