import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../nodes/types.ts";
import { f8812_2026 } from "../nodes/f8812.ts";
import { buildSchedule8812PdfBytes2026 } from "./schedule_8812.ts";

Deno.test("TY2026 Schedule 8812 PDF prints refundable and nonrefundable credits", async () => {
  const result = f8812_2026.compute({ taxYear: 2026, formType: "f1040" }, {
    auto_qualifying_children: 1,
    auto_filing_status: FilingStatus.Single,
    auto_agi: 50_000,
    auto_income_tax_liability: 1_000,
    auto_schedule2_line3: 1_000,
    line18a_earned_income: 10_000,
    credit_limit_worksheet_2026: {
      schedule3_line1: 0,
      schedule3_line2: 0,
      schedule3_line3: 0,
      schedule3_line4: 0,
      schedule3_line6d: 0,
      schedule3_line6f: 0,
      schedule3_line6l: 0,
      schedule3_line6m: 0,
      worksheet_b_applies: false,
    },
  });
  const schedule =
    result.outputs.find((output) => output.nodeType === "f8812")!.fields;
  const f1040 = {
    line11b_agi: 50_000,
    line18_total_tax_before_credits: 2_000,
    qualifying_child_tax_credit_count: 1,
    other_dependent_count: 0,
    line19_child_tax_credit: 2_000,
    line28_actc: 200,
  };
  const bytes = await buildSchedule8812PdfBytes2026(schedule, f1040, {
    name: "Ada Rivera",
    ssn: "111223333",
  });
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 2);
  await assertRejects(
    () =>
      buildSchedule8812PdfBytes2026(schedule, {
        ...f1040,
        line28_actc: 201,
      }, { name: "Ada Rivera", ssn: "111223333" }),
    Error,
    "disagrees with Form 1040",
  );
});
