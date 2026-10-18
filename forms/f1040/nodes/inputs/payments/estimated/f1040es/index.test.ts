import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { estimatedPaymentTotal, f1040es } from "./index.ts";
import {
  agreedJointPayment,
  agreedMfsJointPayment,
} from "./agreed-payment.fixture.ts";
import { fieldsOf } from "../../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../../outputs/general/return-assembly/f1040/index.ts";

function compute(input: Record<string, unknown>) {
  return f1040es.compute(
    { taxYear: 2025, formType: "f1040" },
    input as Parameters<typeof f1040es.compute>[1],
  );
}

function estimatedTax(result: ReturnType<typeof compute>) {
  return fieldsOf(result.outputs, f1040)?.line26_estimated_tax;
}

test("signed 2025 joint payment allocation routes only the taxpayer share", () => {
  assertEquals(estimatedPaymentTotal(agreedJointPayment, 2025), 300);
  assertEquals(estimatedTax(compute(agreedJointPayment)), 300);
  assertThrows(
    () => estimatedPaymentTotal({ ...agreedJointPayment, payment_q1: 301 }, 2025),
    Error,
    "agreed allocation must equal",
  );
  assertThrows(
    () =>
      estimatedPaymentTotal({
        ...agreedJointPayment,
        applied_from_prior_year: 1,
      }, 2025),
    Error,
    "cannot include a prior-year applied payment",
  );
  assertThrows(
    () =>
      estimatedPaymentTotal({
        ...agreedJointPayment,
        payment_q1_date: "2025-04-16",
      }, 2025),
    Error,
    "joint payment date",
  );
  assertEquals(
    f1040es.inputSchema.safeParse({
      ...agreedJointPayment,
      joint_estimated_payment_allocation: {
        ...agreedJointPayment.joint_estimated_payment_allocation,
        allocation_method: "proportional_tax",
      },
    }).success,
    false,
  );
  assertEquals(
    f1040es.inputSchema.safeParse({
      ...agreedJointPayment,
      joint_estimated_payment_allocation: {
        ...agreedJointPayment.joint_estimated_payment_allocation,
        not_remarried_in_tax_year_verified: false,
      },
    }).success,
    false,
  );
  assertEquals(
    f1040es.inputSchema.safeParse({
      ...agreedJointPayment,
      joint_estimated_payment_allocation: {
        ...agreedJointPayment.joint_estimated_payment_allocation,
        no_name_change_since_payment_verified: false,
      },
    }).success,
    false,
  );
});

test("signed joint allocations bind retained agreement PDF bytes", () => {
  for (const source of [agreedJointPayment, agreedMfsJointPayment]) {
    assertEquals(estimatedPaymentTotal(source, 2025), 300);
    assertThrows(
      () =>
        estimatedPaymentTotal({
          ...source,
          joint_estimated_payment_allocation: {
            ...source.joint_estimated_payment_allocation,
            signed_agreement_pdf_sha256: "0".repeat(64),
          },
        }, 2025),
      Error,
      "PDF differs from its retained digest",
    );
    assertThrows(
      () =>
        estimatedPaymentTotal({
          ...source,
          joint_estimated_payment_allocation: {
            ...source.joint_estimated_payment_allocation,
            signed_agreement_pdf_base64: "JVBERi0xLjQKJSVFT0YK",
          },
        }, 2025),
      Error,
      "PDF differs from its retained digest",
    );
  }
});

// =============================================================================
// Schema Validation
// =============================================================================

test("f1040es.inputSchema: rejects negative quarterly payments", () => {
  assertEquals(
    f1040es.inputSchema.safeParse({ payment_q1: -1 }).success,
    false,
  );
  assertEquals(
    f1040es.inputSchema.safeParse({ payment_q3: -0.01 }).success,
    false,
  );
});

// =============================================================================
// No Output When No Payments
// =============================================================================

test("f1040es.compute: no payments — no output", () => {
  assertEquals(compute({}).outputs, []);
});

test("f1040es.compute: all quarters zero — no output", () => {
  assertEquals(
    compute({ payment_q1: 0, payment_q2: 0, payment_q3: 0, payment_q4: 0 })
      .outputs,
    [],
  );
});

// =============================================================================
// Hard Validation
// =============================================================================

test("f1040es.compute: throws on negative payment", () => {
  assertThrows(() => compute({ payment_q1: -1 }), Error);
});

// =============================================================================
// Each Quarter Routes Independently to f1040 Line 26
// =============================================================================

test("f1040es.compute: q1 only → f1040 line26", () => {
  assertEquals(estimatedTax(compute({ payment_q1: 2000 })), 2000);
});

test("f1040es.compute: q2 only → f1040 line26", () => {
  assertEquals(estimatedTax(compute({ payment_q2: 1500 })), 1500);
});

test("f1040es.compute: q3 only → f1040 line26", () => {
  assertEquals(estimatedTax(compute({ payment_q3: 3000 })), 3000);
});

test("f1040es.compute: q4 only → f1040 line26", () => {
  assertEquals(estimatedTax(compute({ payment_q4: 500 })), 500);
});

// =============================================================================
// Quarterly Aggregation
// =============================================================================

test("f1040es.compute: all 4 quarters summed into single f1040 line26 output", () => {
  const result = compute({
    payment_q1: 1000,
    payment_q2: 1000,
    payment_q3: 1000,
    payment_q4: 1000,
  });
  assertEquals(estimatedTax(result), 4000);
  assertEquals(result.outputs.length, 1);
});

test("f1040es.compute: partial quarters (q1 + q3) summed correctly", () => {
  assertEquals(
    estimatedTax(compute({ payment_q1: 2500, payment_q3: 2500 })),
    5000,
  );
});

test("f1040es.compute: unequal quarterly payments aggregated correctly", () => {
  // Taxpayer made larger Q1 and Q2 payments, skipped Q3 and Q4
  assertEquals(
    estimatedTax(compute({ payment_q1: 3000, payment_q2: 4500 })),
    7500,
  );
});

// =============================================================================
// Smoke Test
// =============================================================================

test("f1040es.compute: smoke — full year payments aggregate to line26", () => {
  const result = compute({
    payment_q1: 3000,
    payment_q2: 3000,
    payment_q3: 3000,
    payment_q4: 3000,
  });
  assertEquals(estimatedTax(result), 12000);
  assertEquals(result.outputs.length, 1);
});

// Pub. 505, Divorced taxpayers: joint estimated payments made in the year of
// the divorce are divided by agreement on each separate return for that year.
test("a divorced joint-payment allocation names a divorce in the return year", () => {
  const allocation = agreedJointPayment.joint_estimated_payment_allocation;
  const in2026 = {
    ...agreedJointPayment,
    joint_estimated_payment_allocation: {
      ...allocation,
      divorce_date: "2026-08-01",
      payments: [{
        ...allocation.payments[0],
        tax_year: 2026,
        payment_date: "2026-04-15",
      }],
    },
  };
  assertEquals(estimatedPaymentTotal(in2026, 2026), 300);
  assertThrows(
    () =>
      estimatedPaymentTotal({
        ...in2026,
        joint_estimated_payment_allocation: {
          ...in2026.joint_estimated_payment_allocation,
          divorce_date: "2025-08-01",
        },
      }, 2026),
    Error,
    "needs a 2026 divorce",
  );
});
