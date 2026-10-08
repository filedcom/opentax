import { assertEquals } from "@std/assert";
import { irs1040Pdf } from "./f1040.ts";

Deno.test("2025 Form 1040 PDF prints the reviewed MFS lived-apart mark on line 6d", () => {
  const entry = irs1040Pdf.fields.find((field) =>
    field.domainKey === "print_mfs_lived_apart_entire_year"
  );
  assertEquals(entry?.kind, "checkbox");
  assertEquals(
    entry?.pdfField,
    "topmostSubform[0].Page1[0].c1_42[0]",
  );

  const livedApart = irs1040Pdf.projectFields?.({
    filing_status: "mfs",
    mfs_spouse_lived_with_taxpayer: false,
    line6b_ss_taxable: 1_200,
  }, {});
  assertEquals(livedApart?.print_mfs_lived_apart_entire_year, true);

  const livedTogether = irs1040Pdf.projectFields?.({
    filing_status: "mfs",
    mfs_spouse_lived_with_taxpayer: true,
    line6b_ss_taxable: 1_200,
  }, {});
  assertEquals(livedTogether?.print_mfs_lived_apart_entire_year, false);

  const joint = irs1040Pdf.projectFields?.({
    filing_status: "mfj",
    mfs_spouse_lived_with_taxpayer: false,
    line6b_ss_taxable: 1_200,
  }, {});
  assertEquals(joint?.print_mfs_lived_apart_entire_year, false);
});
