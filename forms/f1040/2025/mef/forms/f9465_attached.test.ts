import { assertStringIncludes, assertThrows } from "@std/assert";
import { inputSchema } from "../../../nodes/inputs/f9465/index.ts";
import { testFiler } from "../test-filer.ts";
import { buildAttachedForm9465 } from "./f9465_attached.ts";
import { assertAttachmentCoverage } from "../../attachment-coverage.ts";

const source = {
  filing_mode: "attached_2025_1040",
  tax_year: 2025,
  reviewed_source: {
    reviewed_by: "Reviewer One",
    reviewed_on: "2026-04-01",
    final_form1040_reference: "reviewed-final-2025-1040",
    irs_account_review_reference: "reviewed-irs-account-2026-04-01",
    no_other_tax_period_balance_confirmed: true,
    no_payment_with_request_confirmed: true,
    cannot_pay_in_full_within_180_days_confirmed: true,
    no_existing_installment_agreement_confirmed: true,
    no_default_in_last_12_months_confirmed: true,
    no_bankruptcy_or_offer_in_compromise_confirmed: true,
    address_unchanged_since_last_return_confirmed: true,
    taxpayer_authorized_attached_request_confirmed: true,
  },
  final_1040_line37_amount_owed: 7_200,
  proposed_monthly_payment: 100,
  payment_due_day: 15,
  payment_method: "manual_monthly_payment",
};

const filer = {
  ...testFiler(),
  firstName: "Taylor",
  lastName: "Test",
  nameLine1: "TAYLOR TEST",
  nameControl: "TEST",
};
const pending = {
  f9465: source,
  f1040: { line37_amount_owed: 7_200 },
};

Deno.test("Form 9465 staged native route joins one attached 1040 balance and minimum payment", () => {
  const xml = buildAttachedForm9465(source, { filer, pending });
  assertStringIncludes(
    xml,
    "<F9465TaxReturnTypeCd>FORM 1040</F9465TaxReturnTypeCd>",
  );
  assertStringIncludes(xml, "<IATaxYrDt>2025</IATaxYrDt>");
  assertStringIncludes(xml, "<TaxDueAmt>7200</TaxDueAmt>");
  assertStringIncludes(xml, "<TotalBalanceDueAmt>7200</TotalBalanceDueAmt>");
  assertStringIncludes(
    xml,
    "<CalculatedMonthlyPymtAmt>100</CalculatedMonthlyPymtAmt>",
  );
  assertStringIncludes(xml, "<PaymentDueAmt>100</PaymentDueAmt>");
  assertStringIncludes(xml, "<PaymentDueDayNum>15</PaymentDueDayNum>");
});

Deno.test("Form 9465 rejects legacy partial input, wrong mode, outside bound, and short payment", () => {
  for (
    const raw of [
      { amount_owed: 7_200, monthly_payment: 100, payment_day: 15 },
      { ...source, filing_mode: "irs_online" },
      { ...source, final_1040_line37_amount_owed: 25_001 },
      { ...source, proposed_monthly_payment: 99 },
      { ...source, payment_due_day: 29 },
      { ...source, direct_debit: true },
    ]
  ) {
    assertThrows(() => inputSchema.parse(raw));
  }
});

Deno.test("Form 9465 staged native route rejects changed return, identity, and pending source", () => {
  assertThrows(() =>
    buildAttachedForm9465(source, {
      filer,
      pending: { ...pending, f1040: { line37_amount_owed: 7_199 } },
    })
  );
  assertThrows(() =>
    buildAttachedForm9465(source, {
      filer: testFiler(),
      pending,
    })
  );
  assertThrows(() =>
    buildAttachedForm9465(source, {
      filer,
      pending: { ...pending, f9465: { ...source, payment_due_day: 14 } },
    })
  );
});

Deno.test("Form 9465 remains blocked from export until native and PDF routes are registered", () => {
  for (const kind of ["mef", "pdf"] as const) {
    assertThrows(
      () => assertAttachmentCoverage(pending, kind),
      Error,
      "Form 9465 requires a native filing document",
    );
  }
});
