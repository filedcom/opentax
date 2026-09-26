import { assertEquals } from "@std/assert";
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
});
