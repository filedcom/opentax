import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/types.ts";
import { assertAttachmentCoverage } from "../../../domains/execution/attachment-coverage.ts";
import { form461Pdf } from "./f461.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "Case Taxpayer",
  nameControl: "TAXP",
  address: { line1: "1 Main St", city: "Salem", state: "OR", zip: "97301" },
  filingStatus: FilingStatus.Single,
};
const filed = {
  line2_business_income_loss: -200_000,
  line3_capital_gain_loss: 0 as const,
  line4_other_gain_loss: 0 as const,
  line5_rental_income_loss: 0 as const,
  line6_net_farm_profit_loss: -200_000,
  line8_other_income_gain_loss: 0 as const,
  line9_total_income_loss: -400_000,
  line10_nonbusiness_income_gain: 0 as const,
  line11_nonbusiness_deduction_loss: 0 as const,
  line12_nonbusiness_total: 0 as const,
  line13_adjustment: 0 as const,
  line14_adjusted_total: -400_000,
  line15_threshold: 313_000 as const,
  line16_excess_business_loss: -87_000,
};
const pending = {
  form461: filed,
  general: {
    form461_scope_review: {
      only_schedule_c_and_f_business_items: true,
      other_part_i_lines_zero: true,
      part_ii_adjustments_zero: true,
      post_at_risk_and_passive_limits_confirmed: true,
      line2_schedule_c_amount: -200_000,
      line6_schedule_f_amount: -200_000,
      source_document_refs: ["signed Schedule C and F workpaper"],
    },
  },
  f1040: { filing_status: "single" },
  schedule1: {
    line3_schedule_c: -200_000,
    line6_schedule_f: -200_000,
    line8p_excess_business_loss: 87_000,
  },
};

Deno.test("Form 461 PDF maps the canonical 2025 header and all active line widgets", () => {
  assertAttachmentCoverage(pending, "pdf");
  assertEquals(form461Pdf.instances?.(filed, filer, pending), [filed]);
  const mapped = Object.fromEntries(
    form461Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    mapped.line2_business_income_loss,
    "topmostSubform[0].Page1[0].f1_4[0]",
  );
  assertEquals(
    mapped.line6_net_farm_profit_loss,
    "topmostSubform[0].Page1[0].f1_8[0]",
  );
  assertEquals(
    mapped.line8_other_income_gain_loss,
    "topmostSubform[0].Page1[0].f1_10[0]",
  );
  assertEquals(
    mapped.line16_excess_business_loss,
    "topmostSubform[0].Page1[0].f1_18[0]",
  );
  assertEquals(form461Pdf.fields.length, 14);
  assertEquals(form461Pdf.filerFields?.length, 2);
  assertEquals(form461Pdf.pageIndices?.(filed), [0]);
});

Deno.test("Form 461 PDF omits context-only pending fields", () => {
  assertEquals(
    form461Pdf.instances?.({ filing_status: "single" }, filer, pending),
    [],
  );
});

Deno.test("Form 461 PDF refuses a filed-return mismatch or missing identity", () => {
  assertThrows(
    () =>
      form461Pdf.instances?.(filed, filer, {
        ...pending,
        schedule1: { ...pending.schedule1, line3_schedule_c: -199_999 },
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () => form461Pdf.instances?.(filed, undefined, pending),
    Error,
    "needs filer name",
  );
});

Deno.test("Form 461 PDF refuses a missing or altered signed C/F source review", () => {
  assertThrows(() =>
    form461Pdf.instances?.(filed, filer, { ...pending, general: {} })
  );
  assertThrows(() =>
    form461Pdf.instances?.(filed, filer, {
      ...pending,
      general: {
        form461_scope_review: {
          ...pending.general.form461_scope_review,
          line2_schedule_c_amount: -199_999,
        },
      },
    })
  );
});
