import { assertEquals, assertThrows } from "@std/assert";
import { f9465 } from "./index.ts";

const request = {
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

function compute(input: Record<string, unknown>) {
  return f9465.compute(
    { taxYear: 2025, formType: "f1040" },
    input as Parameters<typeof f9465.compute>[1],
  );
}

Deno.test("Form 9465 bounded attached request has no tax or payment outputs", () => {
  assertEquals(compute(request).outputs, []);
});

Deno.test("Form 9465 rejects legacy partial and unsupported filing modes", () => {
  for (
    const input of [
      {},
      { amount_owed: 7_200, monthly_payment: 100, payment_day: 15 },
      { ...request, filing_mode: "standalone" },
      { ...request, payment_method: "direct_debit" },
    ]
  ) {
    assertThrows(() => compute(input));
  }
});

Deno.test("Form 9465 rejects unsourced and inconsistent attached terms", () => {
  for (
    const input of [
      { ...request, final_1040_line37_amount_owed: 0 },
      { ...request, final_1040_line37_amount_owed: 25_001 },
      { ...request, proposed_monthly_payment: 99 },
      { ...request, payment_due_day: 29 },
      {
        ...request,
        reviewed_source: {
          ...request.reviewed_source,
          address_unchanged_since_last_return_confirmed: false,
        },
      },
      {
        ...request,
        reviewed_source: {
          ...request.reviewed_source,
          no_bankruptcy_or_offer_in_compromise_confirmed: false,
        },
      },
    ]
  ) {
    assertThrows(() => compute(input));
  }
});
