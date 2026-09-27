import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildForm4137PdfBytes2026 } from "./f4137.ts";

const f1040 = {
  taxpayer_first_name: "Ada",
  taxpayer_last_name: "Rivera",
  taxpayer_ssn: "111223333",
  spouse_first_name: "Bo",
  spouse_last_name: "Rivera",
  spouse_ssn: "444556666",
  line1c_unreported_tips: 2_000,
};
const schedule2 = { line16a_form4137_tip_tax: 153 };
const fields = {
  taxpayer_ssn: "111223333",
  spouse_ssn: "444556666",
  forms: [{
    recipient: "taxpayer",
    employers: [{
      name: "CAFE",
      ein: "12-3456789",
      tips_received: 5_000,
      tips_reported: 3_000,
    }],
    ss_wages_from_w2: 70_000,
  }],
  w2_tip_sources: [{
    employee_ssn: "111223333",
    allocated_tips: 1_000,
    ss_wages_and_tips: 70_000,
  }],
};

Deno.test("TY2026 Form 4137 PDF fills the taxpayer form", async () => {
  const pdf = await PDFDocument.load(
    await buildForm4137PdfBytes2026(fields, f1040, schedule2),
  );
  assertEquals(pdf.getPageCount(), 1);
  await assertRejects(
    () =>
      buildForm4137PdfBytes2026(
        fields,
        { ...f1040, line1c_unreported_tips: 1_999 },
        schedule2,
      ),
    Error,
    "disagrees with Form 1040 or Schedule 2",
  );
});

Deno.test("TY2026 Form 4137 PDF continues employer rows beyond five", async () => {
  const employers = Array.from({ length: 6 }, (_, index) => ({
    name: `Employer ${index + 1}`,
    ein: `12-345678${index}`,
    tips_received: 1_000,
    tips_reported: 900,
  }));
  const pdf = await PDFDocument.load(
    await buildForm4137PdfBytes2026(
      {
        taxpayer_ssn: "111223333",
        forms: [{
          recipient: "taxpayer",
          employers,
          ss_wages_from_w2: 70_000,
        }],
      },
      { ...f1040, line1c_unreported_tips: 600 },
      { line16a_form4137_tip_tax: 46 },
    ),
  );
  assertEquals(pdf.getPageCount(), 2);
});
