import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  calculateEstimatedPayments2026,
  estimatedPaymentClaim2026Schema,
} from "./estimated-payments.ts";
import {
  estimatedPaymentClaim2026,
  estimatedPaymentGraph2026,
} from "./estimated-payments.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { form1062ExtensionReceipt2026 } from "./form1062-graph.fixture.ts";

function source() {
  return {
    ...estimatedPaymentClaim2026(),
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "400-00-1037",
  };
}

Deno.test("2026 payment records and posted 2025 credit reach settlement and refund allocation once", async () => {
  const input = estimatedPaymentGraph2026();
  const result = await executeDraftSources2026(input);
  assertEquals(result.diagnostics, []);
  const f = result.pending.f1040;
  assertEquals([
    f.line26_estimated_payments,
    f.line33_total_payments,
    f.line35a_refund,
  ], [1801, 12069, 8186]);
  const workpaper = result.pending.estimated_payments
    .calculation_2026 as ReturnType<typeof calculateEstimatedPayments2026>;
  assertEquals(workpaper.source_total, 1800.98);
  assertEquals(workpaper.source_input.claim, input.estimated_payments.claim);
  const { estimated_payments: _, ...without } = input;
  const baseline = await executeDraftSources2026(without);
  for (
    const key of [
      "line11b_agi",
      "line15_taxable_income",
      "line16_income_tax",
      "line24c_total_tax",
      "line25d_total_withholding",
      "line31_other_payments",
    ]
  ) assertEquals(f[key], baseline.pending.f1040[key]);
  assertEquals(
    result.pending.capital_loss_carryover,
    baseline.pending.capital_loss_carryover,
  );
});

Deno.test("2026 estimated payments retain multiple and late receipt dates without asserting penalty relief", () => {
  const input = source();
  input.claim.prior_year_credits = [];
  input.claim.payments[1].quarter = "q4";
  input.claim.payments[1].payment_date = "2027-03-01";
  assertEquals(
    calculateEstimatedPayments2026(input).line26_estimated_payments,
    1501,
  );
  input.claim.payments[1].payment_date = "2027-04-16";
  assertThrows(
    () => calculateEstimatedPayments2026(input),
    Error,
    "reviewed period",
  );
  input.claim.payments[1].payment_date = "2025-12-31";
  assertThrows(
    () => calculateEstimatedPayments2026(input),
    Error,
    "reviewed period",
  );
  input.claim.payments[1].payment_date = "2026-02-30";
  assertThrows(() => calculateEstimatedPayments2026(input));
});

Deno.test("2026 payment ownership, duplicate records, year and calculated overrides are rejected", async () => {
  const change = (edit: (s: ReturnType<typeof source>) => void) => {
    const s = source();
    edit(s);
    assertThrows(() => calculateEstimatedPayments2026(s));
  };
  change((s) => s.claim.payments[0].payer_tin = "999887777");
  change((s) =>
    s.claim.payments[1].payment_record_reference =
      s.claim.payments[0].payment_record_reference
  );
  change((s) =>
    s.claim.payments[1].transaction_reference =
      s.claim.payments[0].transaction_reference
  );
  change((s) => s.claim.payments[0].amount = .001);
  change((s) => s.claim.payments[0].amount = 1e20);
  assertThrows(() =>
    estimatedPaymentClaim2026Schema.parse({
      claim: { ...source().claim, line26_estimated_payments: 1801 },
    })
  );
  assertThrows(() =>
    estimatedPaymentClaim2026Schema.parse({
      claim: {
        ...source().claim,
        payments: [{ ...source().claim.payments[0], tax_year: 2025 }],
      },
    })
  );
  const input = estimatedPaymentGraph2026();
  await assertRejects(() =>
    executeDraftSources2026({
      ...input,
      f1040: { line26_estimated_payments: 1801 },
    })
  );
});

Deno.test("2026 prior-year credits require matching accepted return, posted account amount and unique owners", () => {
  const change = (edit: (s: ReturnType<typeof source>) => void) => {
    const s = source();
    edit(s);
    assertThrows(() => calculateEstimatedPayments2026(s));
  };
  change((s) => s.claim.prior_year_credits[0].account_credit.amount = 301);
  change((s) =>
    s.claim.prior_year_credits[0].account_credit.originating_return_reference =
      "another-return"
  );
  change((s) =>
    s.claim.prior_year_credits[0].prior_return.line35a_refund = 201
  );
  change((s) =>
    s.claim.prior_year_credits[0].account_credit.account_tin = "999887777"
  );
  change((s) =>
    s.claim.prior_year_credits[0].account_credit.effective_date = "2027-04-16"
  );
  change((s) =>
    s.claim.prior_year_credits[0].prior_return.filing_status = FilingStatus.MFJ
  );
  change((s) =>
    s.claim.prior_year_credits.push(
      structuredClone(s.claim.prior_year_credits[0]),
    )
  );
  change((s) => {
    const c = structuredClone(s.claim.prior_year_credits[0]);
    c.prior_return.record_reference = "other-reference";
    c.account_credit.originating_return_reference = "other-reference";
    c.prior_return.acceptance_reference = "other-ack";
    c.account_credit.transaction_reference = "other-transaction";
    s.claim.prior_year_credits.push(c);
  });
  const s = source();
  s.claim.payments = [];
  s.claim.prior_year_credits[0].prior_return.line38_underpayment_penalty = 20;
  s.claim.prior_year_credits[0].prior_return.line34_overpayment = 520;
  assertEquals(
    calculateEstimatedPayments2026(s).line26_estimated_payments,
    300,
  );
});

Deno.test("2026 joint return combines separate payer records and prior credits but does not absorb a former spouse", () => {
  const input = {
    ...source(),
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "400001038",
  };
  input.claim.payments[1].payer_tin = input.spouse_ssn;
  const other = structuredClone(input.claim.prior_year_credits[0]);
  other.prior_return.primary_tin = input.spouse_ssn;
  other.account_credit.account_tin = input.spouse_ssn;
  other.prior_return.record_reference = "spouse-2025-return";
  other.prior_return.acceptance_reference = "spouse-ack";
  other.account_credit.originating_return_reference =
    other.prior_return.record_reference;
  other.account_credit.transaction_reference = "spouse-credit";
  input.claim.prior_year_credits.push(other);
  assertEquals(
    calculateEstimatedPayments2026(input).line26_estimated_payments,
    2101,
  );
  input.claim.prior_year_credits.splice(1);
  input.claim.prior_year_credits[0].prior_return.filing_status =
    FilingStatus.MFJ;
  input.claim.prior_year_credits[0].prior_return.spouse_tin = input.spouse_ssn;
  assertEquals(
    calculateEstimatedPayments2026(input).line26_estimated_payments,
    1801,
  );
  input.claim.prior_year_credits[0].prior_return.spouse_tin = "999887777";
  assertThrows(
    () => calculateEstimatedPayments2026(input),
    Error,
    "same joint filers",
  );
});

Deno.test("2026 signed joint allocations preserve agreement bytes and derive former-spouse presentation", async () => {
  for (const kind of ["divorced", "mfs"] as const) {
    const input = estimatedPaymentGraph2026(kind);
    const result = await executeDraftSources2026(input);
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.f1040.line26_estimated_payments, 300);
    assertEquals(
      result.pending.f1040.line26_former_spouse_ssn,
      kind === "divorced" ? "400001038" : undefined,
    );
    const claim = input.estimated_payments.claim;
    const review = claim.joint_allocation!;
    const source = {
      claim,
      filing_status: kind === "divorced"
        ? FilingStatus.Single
        : FilingStatus.MFS,
      taxpayer_ssn: "400001037",
      ...(kind === "mfs" ? { spouse_ssn: "400001038" } : {}),
    };
    const retained = calculateEstimatedPayments2026(source);
    assertEquals(
      retained.source_input.claim!.joint_allocation!
        .signed_agreement_pdf_base64,
      review.signed_agreement_pdf_base64,
    );
    review.signed_agreement_pdf_sha256 = "0".repeat(64);
    assertThrows(
      () => calculateEstimatedPayments2026(source),
      Error,
      "PDF differs",
    );
  }
});

Deno.test("2026 joint allocation can combine later individual payments but rejects conflicting shares and identities", () => {
  const base = estimatedPaymentGraph2026("divorced");
  const input = { ...source(), claim: base.estimated_payments.claim };
  const review = input.claim.joint_allocation!;
  input.claim.as_of = "2026-07-31";
  assertThrows(
    () => calculateEstimatedPayments2026(input),
    Error,
    "Divorce event",
  );
  input.claim.as_of = "2027-04-15";
  input.claim.payments = source().claim.payments;
  assertEquals(
    calculateEstimatedPayments2026(input).line26_estimated_payments,
    1801,
  );
  review.payments[0].taxpayer_allocated_amount = 301;
  assertThrows(
    () => calculateEstimatedPayments2026(input),
    Error,
    "agreed allocation",
  );
  review.payments[0].taxpayer_allocated_amount = 300;
  review.payments[0].payment_date = "2026-09-01";
  assertThrows(
    () => calculateEstimatedPayments2026(input),
    Error,
    "precede divorce",
  );
  review.payments[0].payment_date = "2026-04-15";
  input.claim.payments[0].transaction_reference =
    review.payments[0].transaction_reference;
  assertThrows(() => calculateEstimatedPayments2026(input), Error, "distinct");
});

Deno.test("2026 estimated and extension payment sources cannot double count a receipt", async () => {
  const input = estimatedPaymentGraph2026();
  const extension = form1062ExtensionReceipt2026();
  extension.claim.payments[0].evidence.primary_ssn = "400001037";
  const result = await executeDraftSources2026({
    ...input,
    extension_payments: extension,
  });
  assertEquals(result.diagnostics, []);
  assertEquals([
    result.pending.f1040.line26_estimated_payments,
    result.pending.f1040.line31_other_payments,
  ], [1801, 1000]);
  extension.claim.payments[0].evidence.payment_confirmation_reference =
    input.estimated_payments.claim.payments[0].payment_record_reference;
  const conflict = await executeDraftSources2026({
    ...input,
    extension_payments: extension,
  });
  assertEquals(
    conflict.diagnostics.some((d) => d.nodeType === "estimated_payments"),
    true,
  );
});
