import { assertEquals } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import { appendScheduleEPartIStatement } from "./schedule_e_part_i_statement.ts";

Deno.test("Schedule E property detail attachment paginates long source descriptions", async () => {
  const pdf = await PDFDocument.create();
  const rows = Array.from({ length: 30 }, (_, index) => ({
    copy: Math.floor(index / 3) + 1,
    column: ["A", "B", "C"][index % 3],
    property: `Property ${index + 1}`,
    address: `${index + 1} Main Street, Austin, TX 78701`,
    line: "19",
    description: `Reviewed maintenance payment ${index + 1} ` +
      "with documented activity details ".repeat(6),
    amount: index + 1,
  }));
  await appendScheduleEPartIStatement(pdf, rows, {
    primarySSN: "111223333",
    nameLine1: "Alex Example",
    nameControl: "EXAM",
    address: {
      line1: "1 Example Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    filingStatus: FilingStatus.Single,
  });
  assertEquals(pdf.getPageCount() > 1, true);
  const loaded = await PDFDocument.load(await pdf.save());
  assertEquals(loaded.getPageCount(), pdf.getPageCount());
});
