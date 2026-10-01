import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema } from "../../../nodes/inputs/f4255/index.ts";
import { form4255 } from "./f4255.ts";

export const form4255Row = {
  source_document_reference: "2024 Form 3800 and recapture workpaper",
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

Deno.test("Form 4255 stages a source-bound positive row but closes native export", () => {
  assertEquals(inputSchema.safeParse({ rows: [form4255Row] }).success, true);
  assertThrows(
    () => form4255.build({ rows: [form4255Row] }),
    Error,
    "authenticated prior-credit and IRS determination source bytes",
  );
});

Deno.test("Form 4255 rejects EP notice or prior-return changes before native export", () => {
  assertThrows(
    () =>
      form4255.build({
        rows: [{
          ...form4255Row,
          excessive_payment_notice: {
            ...form4255Row.excessive_payment_notice,
            net_epe_portion: 299,
          },
        }],
      }),
    Error,
  );
  assertEquals(
    inputSchema.safeParse({
      rows: [{
        ...form4255Row,
        prior_credit_evidence: {
          ...form4255Row.prior_credit_evidence,
          prior_credit_claimed: 9_999,
        },
      }],
    }).success,
    false,
  );
});
