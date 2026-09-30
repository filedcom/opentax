import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { appendSchedule1ATipsWorksheet } from "./schedule1a_tips_worksheet.ts";

Deno.test("Schedule 1-A employer tips worksheet paginates and reconciles", async () => {
  const rows = Array.from({ length: 6 }, (_, index) => ({
    employee_ssn: "111223333",
    employer_ein: String(123456780 + index),
    employer_name: `Restaurant ${index + 1}`,
    amount: 1_000,
    box5_medicare_wages: 10_000,
    occupation_code: "102",
  }));
  const fields = {
    pdf_tip_sources: rows,
    line4a_w2_tips: 0,
    line4b_zero_form4137: 0,
    line4c_employee_tips: 6_000,
    line6_total_tips: 6_000,
    line7_capped_tips: 6_000,
  };
  const filer = {
    nameLine1: "Alex Example",
    primarySSN: "111223333",
  } as never;
  const document = await PDFDocument.create();
  await appendSchedule1ATipsWorksheet(document, fields, filer);
  assertEquals(document.getPageCount(), 2);
  await assertRejects(async () =>
    await appendSchedule1ATipsWorksheet(
      await PDFDocument.create(),
      { ...fields, line4c_employee_tips: 5_999 },
      filer,
    )
  );
});
