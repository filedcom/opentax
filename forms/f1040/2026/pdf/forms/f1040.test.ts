import { assertEquals, assertThrows } from "@std/assert";
import { irs1040Pdf2026 } from "./f1040.ts";

const fieldInventory = new URL(
  "../../../../../docs/ty2026/pdf-fields-f1040.csv",
  import.meta.url,
);

Deno.test("TY2026 Form 1040 PDF fields exist in the pinned draft", async () => {
  const rows = (await Deno.readTextFile(fieldInventory)).trim().split("\n");
  const names = new Set(rows.slice(1).map((row) => row.split(",")[0]));
  for (const field of irs1040Pdf2026.fields) {
    assertEquals(names.has(field.pdfField), true, field.pdfField);
  }
  assertEquals(irs1040Pdf2026.pageIndices?.({}), [1, 2]);
});

Deno.test("TY2026 PDF maps revised tax, credit, and payment lines", () => {
  const fields = new Map(irs1040Pdf2026.fields.map((field) => [
    field.domainKey,
    field.pdfField,
  ]));
  const page2 = "topmostSubform[0].Page2[0].";
  assertEquals(fields.get("line12f_nonitemizer_charity"), `${page2}f2_03[0]`);
  assertEquals(fields.get("line13a_schedule1a"), `${page2}f2_04[0]`);
  assertEquals(fields.get("line24a_total_tax"), `${page2}f2_17[0]`);
  assertEquals(fields.get("line24b_form1062"), `${page2}f2_18[0]`);
  assertEquals(fields.get("line24c_total_tax"), `${page2}f2_19[0]`);
  assertEquals(
    fields.get("line32c_net_refundable_credits"),
    `${page2}f2_33[0]`,
  );
  assertEquals(fields.get("line38_underpayment_penalty"), `${page2}f2_41[0]`);
});

Deno.test("TY2026 PDF requires the new filer answers", () => {
  const project = irs1040Pdf2026.projectFields!;
  assertThrows(
    () => project({ filing_status: "single" }, {}),
    Error,
    "digital-assets",
  );
  assertThrows(
    () =>
      project({
        filing_status: "single",
        digital_assets: false,
      }, {}),
    Error,
    "taxpayer work-authorization",
  );
  assertThrows(
    () =>
      project({
        filing_status: "mfj",
        digital_assets: false,
        taxpayer_citizen_national_or_work_authorized: true,
      }, {}),
    Error,
    "spouse work-authorization",
  );
  assertThrows(
    () =>
      project({
        filing_status: "single",
        digital_assets: false,
        taxpayer_citizen_national_or_work_authorized: true,
        spouse_citizen_national_or_work_authorized: true,
      }, {}),
    Error,
    "requires a joint return",
  );
  assertEquals(
    project({
      filing_status: "single",
      digital_assets: false,
      taxpayer_citizen_national_or_work_authorized: true,
      taxpayer_first_name: "Ada",
      taxpayer_middle_initial: "Q",
    }, {}).taxpayer_first_name_with_initial,
    "Ada Q",
  );
});
