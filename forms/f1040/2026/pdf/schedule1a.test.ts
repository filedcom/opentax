import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildSchedule1APdfBytes2026 } from "./schedule1a.ts";
import { syntheticSchedule1A2026 } from "./schedule1a.fixture.ts";
import { calculateSchedule1A2026 } from "../nodes/schedule1a.ts";
const filer = { name: "Ada Q Rivera", ssn: "111223333" };
Deno.test("2026 Schedule 1-A prints three draft pages and all three continuation types", async () => {
  const source = syntheticSchedule1A2026();
  const amount = calculateSchedule1A2026(source).lines.line44;
  assertEquals(amount, 27_700);
  const bytes = await buildSchedule1APdfBytes2026(source, {
    line13a_schedule1a: amount,
  }, filer);
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 6);
  assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
  for (const p of pdf.getPages()) {
    assertEquals(p.node.has(PDFName.of("Annots")), false);
  }
});
Deno.test("2026 Schedule 1-A PDF retains sources and continuations after full phaseout", async () => {
  const source = { ...syntheticSchedule1A2026(), magi: 600_000 };
  assertEquals(calculateSchedule1A2026(source).lines.line44, 0);
  const bytes = await buildSchedule1APdfBytes2026(source, {
    line13a_schedule1a: 0,
  }, filer);
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 6);
});
Deno.test("2026 Schedule 1-A PDF rejects a stale total or mismatched filer", async () => {
  await assertRejects(
    () =>
      buildSchedule1APdfBytes2026(syntheticSchedule1A2026(), {
        line13a_schedule1a: 27_701,
      }, filer),
    Error,
    "disagrees",
  );
  await assertRejects(
    () =>
      buildSchedule1APdfBytes2026(syntheticSchedule1A2026(), {
        line13a_schedule1a: 27_700,
      }, { ...filer, ssn: "999887777" }),
    Error,
    "identity",
  );
});
