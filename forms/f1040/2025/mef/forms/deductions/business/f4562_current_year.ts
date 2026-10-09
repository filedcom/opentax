import {
  calculateCurrentYearInventory,
  filedCurrentYearSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form4562/current-year.ts";
import { reconcileInventorySources } from "./f4562_bonus.ts";

export function reconcileCurrentYearInventory(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
  const filed = filedCurrentYearSchema.parse(raw);
  const retained = filedCurrentYearSchema.parse(pending.form4562);
  const expected = calculateCurrentYearInventory(
    retained.current_year_inventory,
  );
  reconcileInventorySources(
    retained.current_year_inventory,
    pending,
    expected.current_year_activities,
  );
  if (JSON.stringify(filed) !== JSON.stringify(expected)) {
    throw new Error(
      "Form 4562 current-year rows differ from retained source inventory",
    );
  }
  return expected;
}
