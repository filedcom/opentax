import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildSchedule3APdfBytes2026 } from "./schedule3a.ts";

const filer = { name: "Ada Q Rivera", ssn: "111223333" };
const schedule = {
  line1a_refundable_credits: 1_000,
  line1b_other_payments: 0,
  line2_eligible_refundable_credits: 1_000,
  line3_total_tax: 500,
  line4_schedule2_line20: 100,
  line5_tax_offset: 400,
  line6_federal_public_benefit: 600,
  line7_wants_benefit: false,
};

Deno.test("TY2026 Schedule 3-A renders one static printed page", async () => {
  const bytes = await buildSchedule3APdfBytes2026(schedule, filer);
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 1);
  assertEquals(pdf.getPage(0).node.lookup(PDFName.of("Annots")), undefined);
});

Deno.test("TY2026 Schedule 3-A PDF requires reconciled lines and elections", async () => {
  await assertRejects(
    () =>
      buildSchedule3APdfBytes2026({
        ...schedule,
        line6_federal_public_benefit: 601,
      }, filer),
    Error,
    "do not reconcile",
  );
  await assertRejects(
    () =>
      buildSchedule3APdfBytes2026({
        ...schedule,
        line7_wants_benefit: undefined,
      }, filer),
    Error,
    "line 7 answer",
  );
  await assertRejects(
    () =>
      buildSchedule3APdfBytes2026({
        ...schedule,
        line8_eligible: true,
        line8_disallowed_benefit: 0,
      }, filer),
    Error,
    "line 8 requires a line 7 yes",
  );
});
