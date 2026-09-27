import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { form6251 } from "../../nodes/intermediate/forms/form6251/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { f1040_2026_node } from "../nodes/f1040.ts";
import { buildForm6251PdfBytes2026 } from "./f6251.ts";
import { irsForm6251Pdf2026 } from "./forms/f6251.ts";

const context = { taxYear: 2026, formType: "f1040" };
const filer = { name: "Ada Rivera", ssn: "111223333" };

function amtReturn() {
  const f1040 = f1040_2026_node.compute(context, {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Rivera",
    taxpayer_ssn: "111223333",
    digital_assets: false,
    taxpayer_citizen_national_or_work_authorized: true,
    line9_total_income: 100_000,
    deduction_method: "standard",
    standard_deduction: 16_100,
    line16_income_tax: 13_170,
    line17_additional_taxes: 68_712,
  }).outputs.find((entry) => entry.nodeType === "f1040")!.fields;
  const filed = form6251.compute(context, {
    filing_status: FilingStatus.Single,
    regular_tax_income: 83_900,
    regular_taxable_income: 83_900,
    regular_tax: 13_170,
    line2a_taxes_paid: 16_100,
    iso_adjustment: 300_000,
    taking_standard_deduction: true,
  }).outputs.find((entry) => entry.nodeType === "form6251")!.fields;
  return { f1040, filed };
}

Deno.test("TY2026 Form 6251 PDF fields exist in its pinned draft", async () => {
  const inventory = new URL(
    "../../../../docs/ty2026/pdf-fields-f6251.csv",
    import.meta.url,
  );
  const rows = (await Deno.readTextFile(inventory)).trim().split("\n");
  const names = new Set(rows.slice(1).map((row) => row.split(",")[0]));
  for (const entry of irsForm6251Pdf2026.fields) {
    assertEquals(names.has(entry.pdfField), true, entry.pdfField);
  }
  assertEquals(irsForm6251Pdf2026.pageIndices?.({}), [1, 2]);
});

Deno.test("TY2026 Form 6251 PDF fills the filed two-page AMT form", async () => {
  const { f1040, filed } = amtReturn();
  assertEquals(filed.line11_amt, 68_712);
  const bytes = await buildForm6251PdfBytes2026(filed, f1040, filer);
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 2);
  assertEquals(pdf.getForm().getFields().length, 0);
});

Deno.test("TY2026 Form 6251 PDF rejects tax and line mismatches", async () => {
  const { f1040, filed } = amtReturn();
  await assertRejects(
    () => buildForm6251PdfBytes2026({ ...filed, amti: 399_000 }, f1040, filer),
    Error,
    "do not reconcile",
  );
  await assertRejects(
    () =>
      buildForm6251PdfBytes2026(
        filed,
        { ...f1040, line16_income_tax: 12_000 },
        filer,
      ),
    Error,
    "line 10 disagrees",
  );
});
