import { assertEquals } from "@std/assert";
import { form8615Pdf } from "./f8615.ts";
import { irs1040Pdf } from "./f1040.ts";

Deno.test("2025 Form 8615 PDF maps parent identity and all numbered lines", () => {
  const byKey = new Map(
    form8615Pdf.fields.filter((field) => field.kind === "text").map((
      field,
    ) => [field.domainKey, field.pdfField]),
  );
  assertEquals(byKey.get("parent_name"), "topmostSubform[0].Page1[0].f1_3[0]");
  assertEquals(byKey.get("parent_ssn"), "topmostSubform[0].Page1[0].f1_4[0]");
  assertEquals(
    byKey.get("line1_child_unearned_income"),
    "topmostSubform[0].Page1[0].f1_5[0]",
  );
  assertEquals(
    byKey.get("line18_child_tax"),
    "topmostSubform[0].Page1[0].f1_23[0]",
  );
  assertEquals(
    form8615Pdf.fields.filter((field) =>
      field.kind === "text" && field.domainKey.startsWith("line")
    ).length,
    19,
  );
});

Deno.test("2025 Form 1040 PDF checks the primary dependent box", () => {
  assertEquals(
    irs1040Pdf.fields.find((field) =>
      field.domainKey === "taxpayer_can_be_claimed_as_dependent"
    )?.pdfField,
    "topmostSubform[0].Page2[0].c2_1[0]",
  );
});
