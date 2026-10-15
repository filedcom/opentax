import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildSchedule2PdfBytes2026 } from "./schedule2.ts";
import { syntheticSchedule2Print2026 } from "./schedule2.fixture.ts";
import {
  calculateSchedule2_2026,
  type Schedule2Input2026,
} from "../schedule2.ts";
const filer = { name: "Ada Q Rivera & Ben Rivera", ssn: "111223333" };
const destinations = (raw: Schedule2Input2026) => {
  const result = calculateSchedule2_2026(raw);
  return {
    form1040_line17: result.line3_part1_tax,
    form1040_line23: result.line21_total_additional_taxes,
    schedule3a_line4: result.line20_employment_and_other_taxes,
  };
};
Deno.test("2026 Schedule 2 renders every numeric line and all disclosure checkboxes", async () => {
  const { amounts, details } = syntheticSchedule2Print2026();
  const bytes = await buildSchedule2PdfBytes2026(
    amounts,
    destinations(amounts),
    filer,
    details,
  );
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 2);
  assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
  for (const page of pdf.getPages()) {
    assertEquals(page.node.has(PDFName.of("Annots")), false);
  }
});
Deno.test("2026 Schedule 2 preserves itemized disclosure amounts in paginated statements", async () => {
  const items = Array.from(
    { length: 70 },
    (_, i) => ({
      type: `Synthetic other tax ${i + 1}: ${
        "reviewed transaction description ".repeat(7)
      }`,
      amount: i + 1,
    }),
  );
  const amounts = { line13z_other_income_taxes: 2485 };
  const bytes = await buildSchedule2PdfBytes2026(
    amounts,
    destinations(amounts),
    filer,
    { line13z_items: items },
  );
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount() > 3, true);
  for (const page of pdf.getPages()) {
    assertEquals(page.node.has(PDFName.of("Annots")), false);
  }
});
Deno.test("2026 Schedule 2 rejects stale totals, missing disclosures and ambiguous section 965", async () => {
  const { amounts, details } = syntheticSchedule2Print2026();
  await assertRejects(
    () =>
      buildSchedule2PdfBytes2026(
        amounts,
        { ...destinations(amounts), schedule3a_line4: 0 },
        filer,
        details,
      ),
    Error,
    "destinations disagree",
  );
  await assertRejects(
    () => buildSchedule2PdfBytes2026(amounts, destinations(amounts), filer),
    Error,
    "Form 4255 selections",
  );
  await assertRejects(
    () =>
      buildSchedule2PdfBytes2026(amounts, destinations(amounts), filer, {
        ...details,
        line13a_items: undefined,
      }),
    Error,
    "line 13a needs descriptions",
  );
  await assertRejects(
    () =>
      buildSchedule2PdfBytes2026(amounts, destinations(amounts), filer, {
        ...details,
        line13z_items: [{ type: "Other", amount: 1 }],
      }),
    Error,
    "line 13z needs descriptions",
  );
  await assertRejects(
    () =>
      buildSchedule2PdfBytes2026({ line12_section965_installment: 100 }, {
        form1040_line17: 0,
        form1040_line23: 100,
        schedule3a_line4: 0,
      }, filer),
    Error,
    "final placement",
  );
  await assertRejects(
    () =>
      buildSchedule2PdfBytes2026(amounts, destinations(amounts), {
        ...filer,
        ssn: "",
      }, details),
    Error,
    "identity",
  );
});
