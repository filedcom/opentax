import { assertEquals, assertThrows } from "@std/assert";
import { testFiler } from "../../mef/test-filer.ts";
import { form9465AttachedPdf } from "./f9465_attached.ts";

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
  final_1040_line37_amount_owed: 7_201,
  proposed_monthly_payment: 101,
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
  f1040: { line37_amount_owed: 7_201 },
};

Deno.test("Form 9465 staged PDF maps page-one balance, terms, and return identity", () => {
  assertEquals(form9465AttachedPdf.pageIndices?.(source), [0]);
  const projected = form9465AttachedPdf.instances?.(source, filer, pending);
  assertEquals(projected, [{
    return_type: "Form 1040",
    tax_year: "2025",
    first_name_and_initial: "Taylor",
    last_name: "Test",
    ssn: "123456789",
    street: "123 Main St",
    apartment: undefined,
    city_state_zip: "Austin, TX 78701",
    line5_tax_due: 7_201,
    line7_total_balance: 7_201,
    line9_amount_owed: 7_201,
    line10_minimum_monthly: 101,
    line11a_proposed_monthly: 101,
    line12_due_day: 15,
  }]);
  assertEquals(form9465AttachedPdf.fields.length, 14);
  assertEquals(
    form9465AttachedPdf.fields.map((field) => field.pdfField),
    [1, 2, 3, 4, 5, 9, 10, 11, 22, 24, 26, 27, 28, 30].map(
      (number) => `topmostSubform[0].Page1[0].f1_${number}[0]`,
    ),
  );
});

Deno.test("Form 9465 staged PDF rejects return mismatch and foreign address", () => {
  assertThrows(() =>
    form9465AttachedPdf.instances?.(source, filer, {
      ...pending,
      f1040: { line37_amount_owed: 7_200 },
    })
  );
  assertThrows(() =>
    form9465AttachedPdf.instances?.(source, {
      ...filer,
      address: { ...filer.address, foreignCountry: "SE" },
    }, pending)
  );
});
