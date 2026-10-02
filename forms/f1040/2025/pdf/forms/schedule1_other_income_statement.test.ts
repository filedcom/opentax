import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import { appendSchedule1OtherIncomeStatement } from "./schedule1_other_income_statement.ts";

const filer = {
  nameLine1: "ALEX EXAMPLE",
  primarySSN: "111223333",
} as FilerIdentity;

const source = {
  line8z_form8814: 200,
  line8z_hsa_excess_earnings: 100,
  line8z_taxable_grants: 300,
  f1099g_taxable_grant_sources: [{
    payer_name: "State Grant Agency",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    source_document_reference: "issued-grant-1",
    amount: 300,
  }],
};

Deno.test("Schedule 1 PDF appends a source-reconciled line 8z continuation", async () => {
  const document = await PDFDocument.create();
  await appendSchedule1OtherIncomeStatement(
    document,
    { line8z_other: 600, line8z_description: "SEE STATEMENT" },
    filer,
    source,
  );
  assertEquals(document.getPageCount(), 1);
  assertEquals((await document.save()).length > 0, true);
});

Deno.test("Schedule 1 PDF carries one very long income type across pages", async () => {
  const document = await PDFDocument.create();
  await appendSchedule1OtherIncomeStatement(
    document,
    { line8z_other: 20, line8z_description: "SEE STATEMENT" },
    filer,
    {
      f1099m_box3_other_income_sources: [{
        description: Array(900).fill("sourced").join(" "),
        amount: 20,
        payer_name: "Synthetic Payer",
        payer_tin: "123456789",
        recipient_tin: "111223333",
      }],
    },
  );
  assertEquals(document.getPageCount() > 1, true);
  assertEquals((await document.save()).length > 0, true);
});

Deno.test("Schedule 1 PDF refuses a line 8z continuation with changed amount, label, or source", async () => {
  for (
    const [printed, raw] of [
      [{ line8z_other: 599, line8z_description: "SEE STATEMENT" }, source],
      [{ line8z_other: 600, line8z_description: "Taxable grants" }, source],
      [{ line8z_other: 600, line8z_description: "SEE STATEMENT" }, undefined],
    ] as const
  ) {
    const document = await PDFDocument.create();
    await assertRejects(
      () =>
        appendSchedule1OtherIncomeStatement(
          document,
          printed,
          filer,
          raw,
        ),
    );
  }
});
