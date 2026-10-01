import { assertEquals } from "@std/assert";
import { calculateForm4255Routes, f4255 } from "./index.ts";

const row = {
  source_document_reference: "2024 Form 3800 and Form 4255 recapture workpaper",
  credit_line: "2a" as const,
  prior_credit_evidence: {
    tax_year: 2024,
    original_form: "8933" as const,
    filed_return_reference: "accepted-2024-form8933",
    filed_return_sha256: "a".repeat(64),
    prior_credit_claimed: 10_000,
    gross_epe: 8_000,
    gross_epe_applied_regular_tax: 3_000,
    non_epe_applied_regular_tax: 1_000,
  },
  excessive_payment_notice: {
    determination_tax_year: 2025 as const,
    notice_reference: "irs-2025-ep-determination",
    notice_sha256: "b".repeat(64),
    determined_excessive_payment: 300,
    net_epe_portion: 300,
    reasonable_cause_accepted: false,
  },
  prior_credit_claimed: 10_000,
  gross_epe: 8_000,
  gross_epe_applied_regular_tax: 3_000,
  non_epe_applied_regular_tax: 1_000,
  recaptured_total: 2_000,
  recaptured_carryover: 500,
  recaptured_non_epe_applied: 0 as const,
  recaptured_gross_epe_applied: 0 as const,
  recaptured_net_epe: 1_500,
  excessive_payment_net_epe: 300,
  excessive_payment_other: 0 as const,
  excessive_payment_20_percent: 60,
};

Deno.test("Form 4255 row 2a routes only its net EPE and EP amounts to Part I", () => {
  const input = { rows: [row] };
  assertEquals(calculateForm4255Routes(input), {
    line1d: 1_500,
    line1e_1d: 0,
    line1e_2a: 300,
    line1f_1d: 0,
    line1f_2a: 60,
    line19: 0,
  });
  const output = f4255.compute({ taxYear: 2025, formType: "f1040" }, input);
  assertEquals(output.outputs[0]?.fields, {
    line1d_form4255_net_epe: 1_500,
    line1e_form4255_excessive_payment: 300,
    line1f_form4255_20_percent_ep: 60,
  });
});

Deno.test("Form 4255 row 1d sends net EPE to Schedule 2 line 19, not line 1d", () => {
  const input = {
    rows: [{
      ...row,
      credit_line: "1d" as const,
      prior_credit_evidence: {
        ...row.prior_credit_evidence,
        original_form: "3468_part_iv" as const,
      },
    }],
  };
  const output = f4255.compute({ taxYear: 2025, formType: "f1040" }, input);
  assertEquals(output.outputs[0]?.fields, {
    line1e_form4255_excessive_payment: 300,
    line1f_form4255_20_percent_ep: 60,
    line19_form4255_net_epe: 1_500,
  });
});

Deno.test("Form 4255 stages an EP-only IRS determination without inventing Part II recapture", () => {
  const epOnly = {
    ...row,
    recaptured_total: 0,
    recaptured_carryover: 0,
    recaptured_net_epe: 0,
  };
  assertEquals(calculateForm4255Routes({ rows: [epOnly] }), {
    line1d: 0,
    line1e_1d: 0,
    line1e_2a: 300,
    line1f_1d: 0,
    line1f_2a: 60,
    line19: 0,
  });
  assertEquals(
    f4255.compute(
      { taxYear: 2025, formType: "f1040" },
      { rows: [epOnly] },
    ).outputs[0]?.fields,
    {
      line1e_form4255_excessive_payment: 300,
      line1f_form4255_20_percent_ep: 60,
    },
  );
});

Deno.test("Form 4255 rejects ambiguous original-credit shortcut and inconsistent columns", () => {
  assertEquals(
    f4255.inputSchema.safeParse({
      properties: [{
        original_credit_amount: 5_000,
        year_of_recapture: 2,
      }],
    }).success,
    false,
  );
  assertEquals(
    f4255.inputSchema.safeParse({
      rows: [{
        ...row,
        recaptured_net_epe: 5_001,
      }],
    }).success,
    false,
  );
  assertEquals(
    f4255.inputSchema.safeParse({
      rows: [{
        ...row,
        recaptured_total: 1_999,
      }],
    }).success,
    false,
  );
  assertEquals(
    f4255.inputSchema.safeParse({
      rows: [{
        ...row,
        prior_credit_evidence: {
          ...row.prior_credit_evidence,
          gross_epe: 7_999,
        },
      }],
    }).success,
    false,
  );
  assertEquals(
    f4255.inputSchema.safeParse({
      rows: [{
        ...row,
        excessive_payment_notice: {
          ...row.excessive_payment_notice,
          determined_excessive_payment: 299,
        },
      }],
    }).success,
    false,
  );
  assertEquals(
    f4255.inputSchema.safeParse({
      rows: [{ ...row, excessive_payment_notice: undefined }],
    }).success,
    false,
  );
});
