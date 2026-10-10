import { assertEquals, assertThrows } from "@std/assert";
import {
  assertCurrentProductionAllocationSource,
  currentProductionAllocationSchema,
  reconcileCurrentProductionAllocation,
} from "./production-allocation.ts";

const first = {
  facility_description: "Reviewed geothermal source",
  facility_us_address: {
    line1: "1 Plant Road",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
  facility_latitude: 39.123456,
  facility_longitude: -75.123456,
  energy_type: "GEOTHERMAL",
  facility_placed_in_service_date: "2024-01-01",
  production_period_start_date: "2025-01-01",
  production_period_end_date: "2025-12-31",
  form3800_line: "4e" as "1f" | "4e",
  credit_amount: 3000,
  applied_credit: 700,
};
const second = {
  ...first,
  facility_latitude: 39.223456,
  form3800_line: "1f" as const,
  credit_amount: 2000,
  applied_credit: 500,
};
const review = {
  tax_year: 2025,
  return_primary_ssn: "111223333",
  review_reference: "Synthetic current facility review",
  complete_current_production_inventory_confirmed: true,
  facilities: [second, first],
};
const sources = [first, second].map((
  { applied_credit: _applied, ...source },
) => ({
  ...source,
  transfer_out_amount: 0,
  subject_to_passive_activity_limit: false,
}));
const filing = {
  primarySSN: "111-22-3333",
  appliedByLine: { "1f": 500, "4e": 700 },
};
Deno.test("Form 3800 production review keys reordered facilities and reconciles each credit class", () => {
  assertEquals(reconcileCurrentProductionAllocation(review, sources, filing), [
    700,
    500,
  ]);
  assertEquals(
    reconcileCurrentProductionAllocation(
      review,
      [...sources].reverse(),
      filing,
    ),
    [500, 700],
  );
  assertCurrentProductionAllocationSource(review, structuredClone(review));
});
Deno.test("Form 3800 production review rejects source, inventory, filer and class-use drift", () => {
  const badSource = [
    { credit_amount: 3001 },
    { transfer_out_amount: 1 },
    { subject_to_passive_activity_limit: true },
    { facility_description: "Other plant" },
    { facility_latitude: 40 },
    { facility_longitude: -76 },
    {
      facility_us_address: {
        ...first.facility_us_address,
        line1: "Other address",
      },
    },
    { energy_type: "WIND" },
    { facility_placed_in_service_date: "2023-01-01" },
    { production_period_start_date: "2025-01-02" },
    { production_period_end_date: "2025-12-30" },
    { form3800_line: "1f" as const },
  ];
  for (const changed of badSource) {
    assertThrows(() =>
      reconcileCurrentProductionAllocation(review, [{
        ...sources[0],
        ...changed,
      }, sources[1]], filing)
    );
  }
  for (const records of [[], [sources[0]], [sources[0], sources[0]]]) {
    assertThrows(() =>
      reconcileCurrentProductionAllocation(review, records, filing)
    );
  }
  assertThrows(() =>
    reconcileCurrentProductionAllocation(
      { ...review, facilities: [first, first] },
      sources,
      filing,
    )
  );
  assertThrows(() =>
    reconcileCurrentProductionAllocation(
      { ...review, facilities: [{ ...second, applied_credit: 2001 }, first] },
      sources,
      filing,
    )
  );
  assertThrows(() =>
    reconcileCurrentProductionAllocation(review, sources, {
      ...filing,
      primarySSN: "999887777",
    })
  );
  assertThrows(() =>
    reconcileCurrentProductionAllocation(review, sources, {
      ...filing,
      appliedByLine: { "1f": 700, "4e": 500 },
    })
  );
  assertThrows(() =>
    reconcileCurrentProductionAllocation(review, sources, {
      ...filing,
      appliedByLine: { "1f": 501, "4e": 700 },
    })
  );
  assertThrows(() =>
    assertCurrentProductionAllocationSource(undefined, review)
  );
  assertThrows(() =>
    assertCurrentProductionAllocationSource(review, undefined)
  );
  assertThrows(() =>
    assertCurrentProductionAllocationSource(review, {
      ...review,
      review_reference: "Other review",
    })
  );
});
Deno.test("Form 3800 production allocation schema rejects unreviewed and imprecise records", () => {
  for (
    const changed of [
      { tax_year: 2024 },
      { complete_current_production_inventory_confirmed: false },
      { review_reference: " " },
      { return_primary_ssn: "" },
      { extra: true },
    ]
  ) {
    assertThrows(() =>
      currentProductionAllocationSchema.parse({ ...review, ...changed })
    );
  }
  for (
    const changed of [
      { applied_credit: -1 },
      { applied_credit: 0.001 },
      { applied_credit: 0.5 },
      { applied_credit: Infinity },
      { facility_latitude: 39.1234567 },
      { facility_longitude: 181 },
      { extra: true },
    ]
  ) {
    assertThrows(() =>
      currentProductionAllocationSchema.parse({
        ...review,
        facilities: [{ ...first, ...changed }, second],
      })
    );
  }
});
