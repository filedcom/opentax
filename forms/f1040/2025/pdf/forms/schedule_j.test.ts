import { assertEquals, assertThrows } from "@std/assert";
import { ALL_PDF_FORMS } from "./index.ts";
import { scheduleJPdf } from "./schedule_j.ts";

const calculated = Object.fromEntries(
  scheduleJPdf.fields.map(({ domainKey }, index) => [domainKey, index + 1]),
);
const pending = {
  f1040: { line15_taxable_income: 1, line16_income_tax: 25 },
};

Deno.test("2025 Schedule J PDF maps every numbered line to its IRS widget", () => {
  assertEquals(scheduleJPdf.fields.length, 25);
  assertEquals(scheduleJPdf.fields[0].pdfField, "topmostSubform[0].Page1[0].f1_3[0]");
  assertEquals(scheduleJPdf.fields[3].pdfField, "topmostSubform[0].Page1[0].f1_6[0]");
  assertEquals(scheduleJPdf.fields[18].pdfField, "topmostSubform[0].Page1[0].f1_21[0]");
  assertEquals(scheduleJPdf.fields[19].pdfField, "topmostSubform[0].Page2[0].f2_1[0]");
  assertEquals(scheduleJPdf.fields[24].pdfField, "topmostSubform[0].Page2[0].f2_6[0]");
  assertEquals(scheduleJPdf.presenceKey, "line23");
  assertEquals(ALL_PDF_FORMS.filter(({ pendingKey }) => pendingKey === "schedule_j"), [scheduleJPdf]);
});

Deno.test("2025 Schedule J PDF only projects the complete calculated lines", () => {
  const sourceOnly = {
    elected_farm_income: 9_000,
    prior_year_taxable_income_py1: 40_000,
    schedule_j_tax: 4_000,
  };
  assertEquals(scheduleJPdf.projectFields?.(sourceOnly, {}), {});
  assertEquals(
    scheduleJPdf.projectFields?.({ ...sourceOnly, ...calculated }, pending),
    calculated,
  );
  assertThrows(
    () => scheduleJPdf.projectFields?.({ line23: 4_000 }, pending),
    Error,
    "calculated line1",
  );
  assertThrows(
    () => scheduleJPdf.projectFields?.({ ...calculated, line2b: Number.NaN }, pending),
    Error,
    "calculated line2b",
  );
  assertThrows(
    () => scheduleJPdf.projectFields?.(calculated, {
      f1040: { ...pending.f1040, line16_income_tax: 26 },
    }),
    Error,
    "match finalized Form 1040",
  );
});
