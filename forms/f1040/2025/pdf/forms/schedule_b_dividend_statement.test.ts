import { assertEquals } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../mef/types.ts";
import { appendScheduleBDividendStatement } from "./schedule_b_dividend_statement.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" as const },
};

Deno.test("Schedule B adds a continuation page after 15 dividend payers", async () => {
  const document = await PDFDocument.create();
  document.addPage([612, 792]);
  await appendScheduleBDividendStatement(document, {
    dividend_rows: Array.from({ length: 16 }, (_, index) => ({
      payerName: `Fund ${index + 1}`,
      amount: 100,
    })),
    print_line6_total: 1_600,
  }, filer);
  assertEquals(document.getPageCount(), 2);
});

Deno.test("Schedule B does not add a page for exactly 15 dividend payers", async () => {
  const document = await PDFDocument.create();
  document.addPage([612, 792]);
  await appendScheduleBDividendStatement(document, {
    dividend_rows: Array.from({ length: 15 }, (_, index) => ({
      payerName: `Fund ${index + 1}`,
      amount: 100,
    })),
    print_line6_total: 1_500,
  }, filer);
  assertEquals(document.getPageCount(), 1);
});
