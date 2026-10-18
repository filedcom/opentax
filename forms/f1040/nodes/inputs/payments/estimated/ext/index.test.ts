import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { ext, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../../../intermediate/aggregation/general/return-assembly/schedule3/index.ts";

function compute(input: Record<string, unknown>) {
  return ext.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

function schedule3Fields(result: ReturnType<typeof compute>) {
  return fieldsOf(result.outputs, schedule3);
}

function paymentEvidence(amount: number) {
  return {
    tax_year: 2025,
    primary_ssn: "123456789",
    payment_date: "2026-04-15",
    amount,
    payment_confirmation_reference: `payment-${amount}`,
    extension_request_reference: "accepted-extension-request",
    extension_request_accepted_confirmed: true,
  };
}

// ---------------------------------------------------------------------------
// Input Schema Validation
// ---------------------------------------------------------------------------

test("ext.inputSchema: rejects negative line_4_total_tax", () => {
  assertThrows(
    () => compute({ produce_4868: "X", line_4_total_tax: -1 }),
    Error,
  );
});

test("ext.inputSchema: rejects negative line_7_amount_paying", () => {
  assertThrows(
    () => compute({ produce_4868: "X", line_7_amount_paying: -100 }),
    Error,
  );
});

test("ext.compute: positive payment requires matching reviewed evidence", () => {
  assertThrows(
    () => compute({ produce_4868: "X", line_7_amount_paying: 1500 }),
    Error,
    "matching reviewed 2025 payment evidence",
  );
  assertThrows(
    () =>
      compute({
        produce_4868: "X",
        line_7_amount_paying: 1500,
        payment_evidence: paymentEvidence(1499),
      }),
    Error,
    "matching reviewed 2025 payment evidence",
  );
});

// ---------------------------------------------------------------------------
// produce_4868 is a print flag: a payment made with an extension is a
// payment either way (2025 Schedule 3, line 10; Form 4868 line 7).
// ---------------------------------------------------------------------------

test("ext.compute: produce_4868 absent — payment still reaches schedule3", () => {
  const result = compute({
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
    line_7_amount_paying: 1500,
    payment_evidence: paymentEvidence(1500),
  });
  assertEquals(schedule3Fields(result)?.line10_amount_paid_extension, 1500);
});

test("ext.compute: produce_4868 not 'X' — payment still needs its evidence", () => {
  assertThrows(
    () => compute({ produce_4868: "", line_7_amount_paying: 1500 }),
    Error,
    "matching reviewed 2025 payment evidence",
  );
});

// ---------------------------------------------------------------------------
// Payment Routing: line_7_amount_paying → schedule3 line10
// ---------------------------------------------------------------------------

test("ext.compute: payment > 0 routes to schedule3 line10_amount_paid_extension", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
    line_7_amount_paying: 1500,
    payment_evidence: paymentEvidence(1500),
  });
  assertEquals(schedule3Fields(result)?.line10_amount_paid_extension, 1500);
});

test("ext.compute: zero payment — no schedule3 output", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
    line_7_amount_paying: 0,
  });
  assertEquals(schedule3Fields(result), undefined);
});

test("ext.compute: absent payment — no schedule3 output", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
  });
  assertEquals(schedule3Fields(result), undefined);
});

test("ext.compute: overpayment (line_7 > balance) routes full amount — no cap enforced", () => {
  // Balance = 10000 - 2000 = 8000; paying 15000 is valid (creates refund)
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 2000,
    line_7_amount_paying: 15000,
    payment_evidence: paymentEvidence(15000),
  });
  assertEquals(schedule3Fields(result)?.line10_amount_paid_extension, 15000);
});

test("ext.compute: payments exceed tax (refund expected) — extension still valid, no schedule3 if no line_7", () => {
  // line_5 > line_4 → balance_due = 0; extension still files; no schedule3 without line_7
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 5000,
    line_5_total_payments: 8000,
  });
  assertEquals(schedule3Fields(result), undefined);
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// Informational Fields — must NOT affect tax routing
// ---------------------------------------------------------------------------

test("ext.compute: amount_on_1040v does NOT affect schedule3 — uses line_7 value", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
    line_7_amount_paying: 500,
    payment_evidence: paymentEvidence(500),
    amount_on_1040v: 999,
  });
  // schedule3 must use line_7 (500), not the 1040-V override (999)
  assertEquals(schedule3Fields(result)?.line10_amount_paid_extension, 500);
});

test("ext.compute: informational flags do not add outputs", () => {
  const baseCount = compute({
    produce_4868: "X",
    line_7_amount_paying: 500,
    payment_evidence: paymentEvidence(500),
  }).outputs.length;

  const withFlags = compute({
    produce_4868: "X",
    line_7_amount_paying: 500,
    payment_evidence: paymentEvidence(500),
    line_8_out_of_country: true,
    line_9_1040nr_no_wages: true,
    extension_previously_filed: true,
    produce_1040v: true,
  }).outputs.length;

  assertEquals(withFlags, baseCount);
});

// ---------------------------------------------------------------------------
// Exactly one schedule3 output emitted
// ---------------------------------------------------------------------------

test("ext.compute: emits exactly one schedule3 output when payment present", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
    line_7_amount_paying: 1500,
    payment_evidence: paymentEvidence(1500),
  });
  assertEquals(
    result.outputs.filter((o) => o.nodeType === "schedule3").length,
    1,
  );
  assertEquals(result.outputs.length, 1);
});

// ---------------------------------------------------------------------------
// Smoke test
// ---------------------------------------------------------------------------

test("ext.compute: smoke — all fields populated, schedule3 gets line_7 amount", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 25000,
    line_5_total_payments: 18000,
    line_7_amount_paying: 5000,
    payment_evidence: paymentEvidence(5000),
    line_8_out_of_country: true,
    line_9_1040nr_no_wages: false,
    extension_previously_filed: false,
    produce_1040v: true,
    amount_on_1040v: 5000,
  });
  assertEquals(schedule3Fields(result)?.line10_amount_paid_extension, 5000);
  assertEquals(result.outputs.length, 1);
});
