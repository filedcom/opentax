import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { appendSchedule1ATipsWorksheet } from "./schedule1a_tips_worksheet.ts";

Deno.test("Schedule 1-A employer tips worksheet paginates and reconciles", async () => {
  const rows = Array.from({ length: 6 }, (_, index) => ({
    employee_ssn: "111223333",
    employer_ein: String(123456780 + index),
    employer_name: `Restaurant ${index + 1}`,
    amount: 1_000,
    w2_amount: 1_000,
    form4137_amount: 0,
    occupation_code: "102",
  }));
  const fields = {
    pdf_tip_sources: rows,
    line4a_w2_tips: 0,
    line4b_form4137_tips: 0,
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

Deno.test("Schedule 1-A employer worksheet prints greater W-2 or Form 4137 amount", async () => {
  const document = await PDFDocument.create();
  await appendSchedule1ATipsWorksheet(document, {
    pdf_tip_sources: [
      {
        employee_ssn: "111223333",
        employer_ein: "123456789",
        employer_name: "First Restaurant",
        occupation_code: "102",
        w2_amount: 5_000,
        form4137_amount: 6_500,
        amount: 6_500,
      },
      {
        employee_ssn: "111223333",
        employer_ein: "987654321",
        employer_name: "Second Restaurant",
        occupation_code: "103",
        w2_amount: 2_000,
        form4137_amount: 0,
        amount: 2_000,
      },
    ],
    line4a_w2_tips: 0,
    line4b_form4137_tips: 0,
    line4c_employee_tips: 8_500,
    line6_total_tips: 8_500,
    line7_capped_tips: 8_500,
  }, {
    nameLine1: "Alex Example",
    primarySSN: "111223333",
  } as never);
  assertEquals(document.getPageCount(), 1);
});
