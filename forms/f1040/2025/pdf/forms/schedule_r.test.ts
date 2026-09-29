import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { schedule3Pdf } from "./schedule3.ts";
import { scheduleRPdf } from "./schedule_r.ts";

const source = {
  filing_status: FilingStatus.Single,
  taxpayer_age_65_or_older: true,
  age_65_source_reference: "Taxpayer date of birth on ID",
  agi: 7_000,
  nontaxable_ssa: 0,
};
const pending = {
  schedule_r: source,
  f1040: {
    filing_status: "single",
    line11_agi: 7_000,
    line18_total_tax_before_credits: 900,
    line20_nonrefundable_credits: 750,
  },
  schedule3: { line6d_elderly_disabled_credit: 750 },
};

Deno.test("Schedule R PDF maps the sourced single age-65 credit to 2025 widgets", () => {
  const fields = scheduleRPdf.projectFields?.(source, pending) ?? {};
  assertEquals(fields.box1, "yes");
  assertEquals(fields.line10, 5_000);
  assertEquals(fields.line12, 5_000);
  assertEquals(fields.line13c, 0);
  assertEquals(fields.line14, 7_000);
  assertEquals(fields.line15, 7_500);
  assertEquals(fields.line22, 750);
  assertEquals(
    scheduleRPdf.fields.find((field) => field.domainKey === "box1")?.pdfField,
    "topmostSubform[0].Page1[0].c1_1[0]",
  );
  assertEquals(
    scheduleRPdf.fields.find((field) => field.domainKey === "line22")?.pdfField,
    "topmostSubform[0].Page2[0].f2_15[0]",
  );
  assertEquals(
    schedule3Pdf.projectFields?.(pending.schedule3, pending),
    pending.schedule3,
  );
});

Deno.test("Schedule R PDF rejects a credit that differs from the finalized return", () => {
  assertThrows(
    () =>
      scheduleRPdf.projectFields?.(source, {
        ...pending,
        schedule3: { line6d_elderly_disabled_credit: 700 },
      }),
    Error,
    "credit and tax limit",
  );
  assertEquals(scheduleRPdf.projectFields?.({}, pending), {});
});
