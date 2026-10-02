import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { extractFilerIdentity } from "../mef/filer.ts";
import { FilingStatus } from "../nodes/types.ts";
import { f1040_2025 } from "./index.ts";
import { assertExtensionPaymentSource } from "./extension-payment-reconciliation.ts";
import { normalizeAllPending } from "./pending.ts";

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  digital_assets: false,
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const payment = {
  tax_year: 2025,
  primary_ssn: "111-22-3333",
  payment_date: "2026-04-15",
  amount: 1_500,
  payment_confirmation_reference: "IRS-payment-confirmation-001",
  extension_request_reference: "accepted-2025-extension-001",
  extension_request_accepted_confirmed: true,
};

function returnWithPayment() {
  const result = f1040_2025.executeReturn({
    general,
    ext: {
      produce_4868: "X",
      line_7_amount_paying: 1_500,
      payment_evidence: payment,
    },
  });
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(general);
  return { pending, filer };
}

Deno.test("reviewed extension payment reaches Schedule 3, Form 1040, and native XML", () => {
  const { pending, filer } = returnWithPayment();
  assertEquals(pending.schedule3.line10_amount_paid_extension, 1_500);
  assertEquals(pending.schedule3.line15_total, 1_500);
  assertEquals(pending.f1040.line31_additional_payments, 1_500);
  assertEquals(pending.f1040.line32_refundable_credits_total, 1_500);
  assertEquals(pending.f1040.line33_total_payments, 1_500);
  assertExtensionPaymentSource(pending, filer);
  const xml = f1040_2025.buildMefXml(pending, filer);
  assertStringIncludes(
    xml,
    "<RequestForExtensionAmt>1500</RequestForExtensionAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOtherPaymentsRfdblCrAmt>1500</TotalOtherPaymentsRfdblCrAmt>",
  );
});

Deno.test("extension payment rejects missing or changed evidence and final return amounts", () => {
  const { pending, filer } = returnWithPayment();
  const changed = (parts: Record<string, unknown>) => ({
    ...pending,
    ...parts,
  });
  for (
    const source of [
      undefined,
      { ...pending.ext, payment_evidence: undefined },
      { ...pending.ext, payment_evidence: { ...payment, tax_year: 2024 } },
      {
        ...pending.ext,
        payment_evidence: { ...payment, primary_ssn: "999-99-9999" },
      },
      { ...pending.ext, payment_evidence: { ...payment, amount: 1_499 } },
      {
        ...pending.ext,
        payment_evidence: { ...payment, payment_date: "2026-04-16" },
      },
    ]
  ) {
    assertThrows(
      () => f1040_2025.buildMefXml(changed({ ext: source }), filer),
      Error,
    );
  }
  for (
    const altered of [
      changed({
        schedule3: {
          ...pending.schedule3,
          line10_amount_paid_extension: 1_499,
        },
      }),
      changed({ schedule3: { ...pending.schedule3, line15_total: 1_499 } }),
      changed({
        f1040: { ...pending.f1040, line31_additional_payments: 1_499 },
      }),
      changed({
        f1040: { ...pending.f1040, line32_refundable_credits_total: 1_499 },
      }),
      changed({ f1040: { ...pending.f1040, line33_total_payments: 1_499 } }),
    ]
  ) {
    assertThrows(() => assertExtensionPaymentSource(altered, filer), Error);
  }
});

Deno.test("PDF export rejects an extension payment with a changed owner before rendering", async () => {
  const { pending, filer } = returnWithPayment();
  const changed = {
    ...pending,
    ext: {
      ...pending.ext,
      payment_evidence: { ...payment, primary_ssn: "999-99-9999" },
    },
  };
  await assertRejects(
    () => f1040_2025.buildPdfBytes(changed, filer),
    Error,
    "source, owner, year, and line 10 must reconcile",
  );
});
