import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { schedule8812Pdf } from "./schedule_8812.ts";

const fields = {
  f8812s: [{
    qualifying_children_count: 1,
    other_dependents_count: 1,
    agi: 50_000,
    filing_status: FilingStatus.Single,
    income_tax_liability: 1_000,
    earned_income: 10_000,
  }],
  credit_limit_worksheet: {
    schedule3_line1: 0,
    schedule3_line2: 0,
    schedule3_line3: 0,
    schedule3_line4: 0,
    schedule3_line5b: 0,
    schedule3_line6d: 0,
    schedule3_line6f: 0,
    schedule3_line6l: 0,
    schedule3_line6m: 0,
    worksheet_b_applies: false,
  },
  line18a_earned_income: 10_000,
};

const form1040 = {
  filing_status: FilingStatus.Single,
  line11_agi: 50_000,
  line18_total_tax_before_credits: 1_000,
  line19_child_tax_credit: 1_000,
  line28_actc: 1_125,
};

Deno.test("2025 Schedule 8812 PDF maps both worksheet pages from calculated lines", () => {
  const fieldMap = new Map(schedule8812Pdf.fields.map((entry) => [
    entry.domainKey,
    entry.pdfField,
  ]));
  assertEquals(fieldMap.get("line1"), "topmostSubform[0].Page1[0].f1_3[0]");
  assertEquals(
    fieldMap.get("line6"),
    "topmostSubform[0].Page1[0].Line6ReadOrder[0].f1_11[0]",
  );
  assertEquals(fieldMap.get("line14"), "topmostSubform[0].Page1[0].f1_19[0]");
  assertEquals(fieldMap.get("line16a"), "topmostSubform[0].Page2[0].f2_2[0]");
  assertEquals(fieldMap.get("line18b"), "topmostSubform[0].Page2[0].f2_7[0]");
  assertEquals(fieldMap.get("line27"), "topmostSubform[0].Page2[0].f2_16[0]");
  assertEquals(fieldMap.has("line15"), false);
  assertEquals(
    schedule8812Pdf.filerFields?.map((entry) => entry.domainKey),
    ["fullName", "primarySSN"],
  );

  const printed = schedule8812Pdf.projectFields?.(fields, { f1040: form1040 });
  assertEquals(printed?.line4, 1);
  assertEquals(printed?.line6, 1);
  assertEquals(printed?.line12_answer, "yes");
  assertEquals(printed?.line14, 1_000);
  assertEquals(printed?.line16a, 1_700);
  assertEquals(printed?.line16b_child_count, 1);
  assertEquals(printed?.line19_answer, "yes");
  assertEquals(printed?.line16b_ge_5100, "no");
  assertEquals(printed?.line27, 1_125);
});

Deno.test("2025 Schedule 8812 PDF rejects conflicting finalized return", () => {
  assertThrows(
    () =>
      schedule8812Pdf.projectFields?.(fields, {
        f1040: { ...form1040, line19_child_tax_credit: 999 },
      }),
    Error,
    "does not reconcile to Form 1040",
  );
  assertThrows(
    () =>
      schedule8812Pdf.projectFields?.(fields, {
        f1040: { ...form1040, filing_status: FilingStatus.MFJ },
      }),
    Error,
    "does not reconcile to Form 1040",
  );
});
