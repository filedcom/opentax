import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildForm3903PdfBytes2026 } from "./form3903.ts";
import {
  syntheticForeignStorage2026,
  syntheticMoving2026,
} from "../inputs/moving.fixture.ts";
import { calculateMovingSources2026 } from "../inputs/moving-source.ts";
const filer = { name: "Ada Q Rivera", ssn: "111223333" };
const destinations = {
  schedule1_line14: 1044,
  schedule1_storage_fees: false,
  f1040_line1h_moving_component: 0,
};
Deno.test("2026 Form 3903 prints separate static pages for deduction and taxable excess moves", async () => {
  const raw = syntheticMoving2026();
  const second = structuredClone(raw.moves[0]);
  second.move_id = "second";
  second.order_or_assignment_group_reference = "second-order";
  second.expenses.forEach((e) => {
    e.expense_id += "-second";
    e.source_document_reference += "-second";
  });
  second.reimbursements[0] = {
    ...second.reimbursements[0],
    reimbursement_id: "second",
    source_line_reference: "2",
    expense_ids: ["goods-second"],
    amount: 3000,
  };
  raw.moves.push(second);
  raw.w2_moving_sources_2026![0].box12_p = 4000;
  const bytes = await buildForm3903PdfBytes2026(raw, {
    ...destinations,
    f1040_line1h_moving_component: 956,
  }, filer);
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 2);
  assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
  for (const page of pdf.getPages()) {
    assertEquals(page.node.has(PDFName.of("Annots")), false);
  }
});
Deno.test("2026 Form 3903 excludes storage-only claims from its page count", async () => {
  const raw = syntheticMoving2026();
  const storage = syntheticForeignStorage2026().moves[0];
  storage.move_id = "storage";
  storage.order_or_assignment_group_reference = "prior-year";
  storage.expenses[0].expense_id = "storage-cost";
  storage.expenses[0].source_document_reference = "storage-receipt";
  storage.reimbursements[0] = {
    ...storage.reimbursements[0],
    reimbursement_id: "storage-reimbursement",
    source_line_reference: "storage",
    expense_ids: ["storage-cost"],
  };
  raw.moves.push(storage);
  const r = calculateMovingSources2026(raw);
  const bytes = await buildForm3903PdfBytes2026(raw, {
    ...destinations,
    schedule1_line14: r.schedule1Line14,
    schedule1_storage_fees: true,
  }, filer);
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 1);
  await assertRejects(
    () =>
      buildForm3903PdfBytes2026(syntheticForeignStorage2026(), {
        ...destinations,
        schedule1_line14: 2000,
        schedule1_storage_fees: true,
      }, filer),
    Error,
    "do not file",
  );
});
Deno.test("2026 Form 3903 rejects stale totals and a mismatched filer", async () => {
  await assertRejects(
    () =>
      buildForm3903PdfBytes2026(syntheticMoving2026(), {
        ...destinations,
        schedule1_line14: 2044,
      }, filer),
    Error,
    "destinations disagree",
  );
  await assertRejects(
    () =>
      buildForm3903PdfBytes2026(syntheticMoving2026(), destinations, {
        ...filer,
        ssn: "999887777",
      }),
    Error,
    "identity",
  );
});
