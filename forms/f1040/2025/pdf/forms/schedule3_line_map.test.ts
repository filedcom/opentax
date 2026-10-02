import { assertEquals, assertThrows } from "@std/assert";
import { schedule3Pdf } from "./schedule3.ts";

Deno.test("2025 Schedule 3 PDF maps DC, bond, and fuel credits to printed lines", () => {
  const fields = new Map(
    schedule3Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    fields.get("line6h_dc_homebuyer_credit"),
    "topmostSubform[0].Page1[0].f1_16[0]",
  );
  assertEquals(
    fields.get("line6k_tax_credit_bonds"),
    "topmostSubform[0].Page1[0].f1_19[0]",
  );
  assertEquals(
    fields.get("line12_fuel_tax_credit"),
    "topmostSubform[0].Page1[0].f1_29[0]",
  );
  assertEquals(
    fields.get("line14_total"),
    "topmostSubform[0].Page1[0].f1_36[0]",
  );
});

Deno.test("Schedule 3 PDF line 13a requires matching Form 2439 box 2 sources", () => {
  const fields = {
    line13a_total: 2_250,
    line14_total: 2_250,
    line15_total: 2_250,
  };
  assertThrows(
    () => schedule3Pdf.projectFields?.(fields, {}),
    Error,
    "sourced Form 2439",
  );
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(fields, {
        f2439: { f2439s: [{ box1a: 10_000, box2: 2_249 }] },
      }),
    Error,
    "sourced Form 2439",
  );
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.({}, {
        f2439: { f2439s: [{ box1a: 10_000, box2: 2_250 }] },
      }),
    Error,
    "sourced Form 2439",
  );
  assertEquals(
    schedule3Pdf.projectFields?.(fields, {
      f2439: {
        f2439s: [{ box1a: 10_000, box2: 1_500 }, { box1a: 5_000, box2: 750 }],
      },
    })?.line13a_total,
    2_250,
  );
});
