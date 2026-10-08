import { assertEquals, assertThrows } from "@std/assert";
import { schedule3Pdf } from "../../general/return-assembly/schedule3.ts";

const form8911Source = {
  cost: 1_000,
  business_use_pct: 0,
  property_description: "Home charging station",
  property_us_address: {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  construction_began: "2025-01-01",
  placed_in_service: "2025-06-01",
  eligible_census_tract: true,
  census_tract_geoid: "48021000100",
  main_home_property: true,
  regular_tax_before_credits: 300,
  tentative_minimum_tax: 0,
};

Deno.test("Schedule 3 PDF cannot print a positive elderly credit without Schedule R", () => {
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(
        { line6d_elderly_disabled_credit: 100 },
        {},
      ),
    Error,
    "needs a filed Schedule R",
  );
  const fields = { line6d_elderly_disabled_credit: 0 };
  assertEquals(schedule3Pdf.projectFields?.(fields, {}), fields);
});

Deno.test("Schedule 3 PDF maps Form 8911 personal-use credit to 2025 line 6j", () => {
  const entry = schedule3Pdf.fields.find((field) =>
    field.domainKey === "line6j_alt_fuel_vehicle_refueling"
  );
  assertEquals(entry?.pdfField, "topmostSubform[0].Page1[0].f1_18[0]");
  assertEquals(entry?.kind, "text");
  const fields = { line6j_alt_fuel_vehicle_refueling: 300 };
  assertEquals(
    schedule3Pdf.projectFields?.(fields, { f8911: form8911Source }),
    fields,
  );
});

Deno.test("Schedule 3 PDF line 6j rejects a bare Form 8911 credit", () => {
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(
        { line6j_alt_fuel_vehicle_refueling: 300 },
        {},
      ),
    Error,
    "Form 8911",
  );
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(
        { line6j_alt_fuel_vehicle_refueling: 299 },
        { f8911: form8911Source },
      ),
    Error,
    "differs from the sourced Form 8911",
  );
  assertThrows(
    () => schedule3Pdf.projectFields?.({}, { f8911: form8911Source }),
    Error,
    "differs from the sourced Form 8911",
  );
});
