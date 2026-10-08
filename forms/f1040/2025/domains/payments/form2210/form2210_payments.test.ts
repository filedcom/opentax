import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm2210Payments,
  compareForm2210WithholdingMethods,
  type Form2210PaymentInput,
} from "./form2210_payments.ts";

const reviewed = {
  source_reference: "Reviewed payment account transaction record",
  reviewer: "Payment workpaper reviewer",
  reviewed_on: "2026-04-16",
};
function source(
  entries: Array<[string, number]> = [],
): Form2210PaymentInput {
  return {
    tax_year: 2025,
    taxpayer_ssn: "111223333",
    required_annual_payment_dollars: 16000,
    required_payment_workpaper_reference: "Staged Part I line 9 workpaper",
    equal_installments: true,
    withholding_method: "equal_due_dates",
    withholding: { amount_dollars: 0, ...reviewed },
    early_filing_payment_exception: false,
    disaster_relief: false,
    waiver_requested: false,
    payments: entries.map(([paid_on, amount_cents], index) => ({
      payment_id: `payment-${index}`,
      taxpayer_ssn: "111223333",
      tax_year: 2025,
      kind: "estimated_tax",
      paid_on,
      amount_cents,
      ...reviewed,
    })),
  };
}

Deno.test("2210 dated payments reproduce IRS Example 3 installment carry and split principal days", () => {
  const r = calculateForm2210Payments(source([
    ["2025-04-30", 200000],
    ["2025-06-15", 300000],
    ["2025-09-15", 400000],
    ["2026-01-15", 400000],
  ]));
  assertEquals(r.columns.map((c) => c.line11), [0, 500000, 400000, 400000]);
  assertEquals(r.columns.map((c) => c.line14), [0, 400000, 300000, 300000]);
  assertEquals(r.columns.map((c) => c.line15), [0, 100000, 100000, 100000]);
  assertEquals(r.columns.map((c) => c.line17), [
    400000,
    300000,
    300000,
    300000,
  ]);
  assertEquals(r.columns.map((c) => c.line18), [0, 0, 0, 0]);
  const first = r.segments.filter((s) => s.installment === 0);
  assertEquals(first.map((s) => [s.amount_cents, s.days]), [[200000, 15], [
    200000,
    61,
  ]]);
  // Independently: (2,000*15 + 2,000*61 + 3,000*92 +
  // 3,000*122 + 3,000*90) dollars-days * 7% / 365.
  assertEquals(r.computed_penalty_cents, 20405);
  assertEquals(r.unpaid_installments_cents, [0, 0, 0, 300000]);
});

Deno.test("2210 unpaid balances retain the IRS 76/92/92/105 day boundaries", () => {
  const r = calculateForm2210Payments(source());
  assertEquals(
    r.segments.filter((s) => s.installment === 0).map((s) => s.days),
    [76, 92, 92, 105],
  );
  assertEquals(
    r.segments.filter((s) => s.installment === 1).map((s) => s.days),
    [15, 92, 92, 105],
  );
  assertEquals(
    r.segments.filter((s) => s.installment === 2).map((s) => s.days),
    [15, 92, 105],
  );
  assertEquals(
    r.segments.filter((s) => s.installment === 3).map((s) => s.days),
    [90],
  );
  assertEquals(r.computed_penalty_cents, 74488);
  assertEquals(r.filingReady, false);
  assertEquals(r.paymentAuthenticityVerified, false);
  assertEquals(r.requiredAnnualPaymentReconciled, false);
});

Deno.test("2210 timely June Monday payments retain the actual date with zero penalty", () => {
  const r = calculateForm2210Payments(source([
    ["2025-04-15", 400000],
    ["2025-06-16", 400000],
    ["2025-09-15", 400000],
    ["2026-01-15", 400000],
  ]));
  assertEquals(r.computed_penalty_cents, 0);
  assertEquals(r.columns.map((c) => c.line17), [0, 0, 0, 0]);
  assertEquals(r.payments[1].paid_on, "2025-06-16");
  assertEquals(r.payments[1].line11_period_on, "2025-06-15");
});

Deno.test("2210 June Monday relief does not backdate payment of the April installment", () => {
  const r = calculateForm2210Payments(source([["2025-06-16", 800000]]));
  assertEquals(
    r.segments.filter((s) => s.installment === 0).map((s) => s.days),
    [62],
  );
  assertEquals(r.segments.filter((s) => s.installment === 1), []);
  assertEquals(r.columns.map((c) => c.line11), [0, 800000, 0, 0]);
  assertEquals(r.columns.map((c) => c.line17), [400000, 0, 400000, 400000]);
});

Deno.test("2210 prepaid excess and equal withholding carry to future installments without double use", () => {
  const i = source([["2025-04-15", 1200000]]);
  i.withholding.amount_dollars = 4000;
  const r = calculateForm2210Payments(i);
  assertEquals(r.columns.map((c) => c.line18), [900000, 600000, 300000, 0]);
  assertEquals(r.columns.map((c) => c.line12), [0, 900000, 600000, 300000]);
  assertEquals(r.computed_penalty_cents, 0);
  assertEquals(r.unapplied_payments_cents, 0);
  assertEquals(r.unpaid_installments_cents, [0, 0, 0, 0]);
});

Deno.test("2210 post-January settlement caps penalty at actual payment and preserves exact cents", () => {
  const i = source([["2026-02-01", 1600001]]);
  i.payments[0].kind = "return_balance";
  const r = calculateForm2210Payments(i);
  assertEquals(r.columns.map((c) => c.line11), [0, 0, 0, 0]);
  assertEquals(r.unpaid_installments_cents, [0, 0, 0, 0]);
  assertEquals(r.unapplied_payments_cents, 1);
  assertEquals(r.segments.every((s) => s.paid_on === "2026-02-01"), true);
});

Deno.test("2210 rejects foreign duplicate invalid-date and unsupported source methods", () => {
  const changes: Array<(i: any) => void> = [
    (i) => i.payments[0].taxpayer_ssn = "444556666",
    (i) => i.payments.push(structuredClone(i.payments[0])),
    (i) => i.payments[0].paid_on = "2025-02-29",
    (i) => i.payments[0].paid_on = "2026-04-16",
    (i) => i.payments[0].paid_on = "2024-12-31",
    (i) => i.payments[0].amount_cents = 0,
    (i) => i.payments[0].amount_cents = 1.5,
    (i) => i.payments[0].tax_year = 2024,
    (i) => i.payments[0].source_reference = "",
    (i) => i.payments[0].reviewed_on = "2026-02-30",
    (i) => i.payments[0].reviewed_on = "2025-04-14",
    (i) => i.payments[0].payment_id = "equal-withholding:0",
    (i) => i.withholding_method = "unknown_method",
    (i) => i.equal_installments = false,
    (i) => i.early_filing_payment_exception = true,
    (i) => i.disaster_relief = true,
    (i) => i.waiver_requested = true,
    (i) => i.required_annual_payment_dollars = 100.25,
    (i) => i.payments[0].kind = "prior_year_overpayment",
    (i) => i.payments[0].unexpected_override = 1,
  ];
  for (const change of changes) {
    const i = source([["2025-04-15", 100000]]);
    change(i);
    assertThrows(() => calculateForm2210Payments(i));
  }
});

function actualWithholding(paid_on: string) {
  const i = source();
  i.required_annual_payment_dollars = 5000;
  i.withholding.amount_dollars = 2000;
  i.withholding_method = "actual_dates";
  i.payments.push({
    payment_id: "issued-payroll-withholding",
    taxpayer_ssn: "111223333",
    tax_year: 2025,
    kind: "withholding",
    paid_on,
    amount_cents: 200000,
    ...reviewed,
  });
  return i;
}

Deno.test("2210 early actual withholding is compared to the same equal annual credit", () => {
  const r = compareForm2210WithholdingMethods(actualWithholding("2025-01-02"));
  assertEquals(r.actual.computed_penalty_cents, 10155);
  assertEquals(r.equal.computed_penalty_cents, 13966);
  assertEquals(r.box_d_reduces_penalty, true);
  assertEquals(r.actual.columns.map((c) => c.line11), [200000, 0, 0, 0]);
  assertEquals(r.equal.columns.map((c) => c.line11), [
    50000,
    50000,
    50000,
    50000,
  ]);
  assertEquals(r.actual.payments[0].kind, "withholding");
  assertEquals(r.equal.payments, []);
  assertEquals(r.filingReady, false);
});

Deno.test("2210 late withholding cannot be represented as a beneficial box D election", () => {
  const r = compareForm2210WithholdingMethods(actualWithholding("2025-12-31"));
  assertEquals(r.box_d_reduces_penalty, false);
  assertEquals(
    r.actual.computed_penalty_cents > r.equal.computed_penalty_cents,
    true,
  );
});

Deno.test("2210 actual withholding rejects missing total foreign year and double-counted credits", () => {
  for (
    const change of [
      (i: Form2210PaymentInput) => i.payments[0].amount_cents -= 1,
      (i: Form2210PaymentInput) => i.payments[0].paid_on = "2026-01-01",
      (i: Form2210PaymentInput) => i.withholding_method = "equal_due_dates",
      (i: Form2210PaymentInput) => i.payments = [],
    ]
  ) {
    const i = actualWithholding("2025-01-02");
    change(i);
    assertThrows(() => calculateForm2210Payments(i));
  }
});

Deno.test("2210 chronological allocation agrees with an independent daily principal oracle", () => {
  let seed = 22102025;
  const next = () => (seed = (seed * 1664525 + 1013904223) >>> 0);
  const start = Date.parse("2025-01-01T00:00:00Z") / 86400000;
  const end = Date.parse("2026-04-15T00:00:00Z") / 86400000;
  const due = ["2025-04-15", "2025-06-15", "2025-09-15", "2026-01-15"];
  for (let trial = 0; trial < 100; trial++) {
    const entries: Array<[string, number]> = Array.from({ length: 12 }, () => {
      const d = start + next() % (end - start + 1);
      return [
        new Date(d * 86400000).toISOString().slice(0, 10),
        1 + next() % 300000,
      ];
    });
    const i = source(entries);
    i.required_annual_payment_dollars = 1 + next() % 30000;
    i.withholding.amount_dollars = next() % 10000;
    const debt = [0, 0, 0, 0];
    let cash = 0, principalDays = 0n;
    for (let d = start; d <= end; d++) {
      const today = new Date(d * 86400000).toISOString().slice(0, 10);
      // A paid balance accrues through the payment date, never its due date.
      principalDays += BigInt(debt.reduce((a, b) => a + b, 0));
      const column = due.indexOf(today);
      if (column >= 0) {
        debt[column] += i.required_annual_payment_dollars * 25;
        cash += i.withholding.amount_dollars * 25;
      }
      for (const [actual, amount] of entries) {
        if (today === actual) cash += amount;
      }
      for (let c = 0; c < 4; c++) {
        const applied = Math.min(cash, debt[c]);
        // June 16 covers June's due-date grace, never April's late days.
        if (today === "2025-06-16" && c === 1) principalDays -= BigInt(applied);
        cash -= applied;
        debt[c] -= applied;
      }
    }
    const r = calculateForm2210Payments(i);
    assertEquals(
      r.penalty_cents_numerator,
      (principalDays * 7n).toString(),
      `trial ${trial}`,
    );
    assertEquals(
      r.unpaid_installments_cents.reduce((a, b) => a + b, 0),
      debt.reduce((a, b) => a + b, 0),
    );
    assertEquals(r.unapplied_payments_cents, cash);
    assertEquals(
      calculateForm2210Payments({ ...i, payments: [...i.payments].reverse() }),
      r,
    );
  }
});

Deno.test("2210 actual withholding dates and cent splits agree with an independent daily oracle", () => {
  const due = ["2025-04-15", "2025-06-15", "2025-09-15", "2026-01-15"];
  const start = Date.parse("2025-01-01T00:00:00Z") / 86400000;
  const end = Date.parse("2026-04-15T00:00:00Z") / 86400000;
  let seed = 2210;
  const next = () => (seed = (seed * 1664525 + 1013904223) >>> 0);
  for (let trial = 0; trial < 100; trial++) {
    const i = actualWithholding("2025-01-02");
    const first = 1 + next() % 199999;
    const dates = [next() % 365, next() % 365].map((offset) =>
      new Date((start + offset) * 86400000).toISOString().slice(0, 10)
    );
    i.payments = [first, 200000 - first].map((amount_cents, index) => ({
      ...i.payments[0],
      payment_id: `withheld-${index}`,
      amount_cents,
      paid_on: dates[index],
    }));
    const debts = [0, 0, 0, 0];
    let cash = 0, principalDays = 0n;
    for (let d = start; d <= end; d++) {
      const today = new Date(d * 86400000).toISOString().slice(0, 10);
      principalDays += BigInt(debts.reduce((a, b) => a + b, 0));
      const c = due.indexOf(today);
      if (c >= 0) debts[c] += 125000;
      cash += i.payments.filter((p) => p.paid_on === today).reduce(
        (t, p) => t + p.amount_cents,
        0,
      );
      for (let col = 0; col < 4; col++) {
        const applied = Math.min(cash, debts[col]);
        if (today === "2025-06-16" && col === 1) {
          principalDays -= BigInt(applied);
        }
        cash -= applied;
        debts[col] -= applied;
      }
    }
    const r = calculateForm2210Payments(i);
    assertEquals(r.penalty_cents_numerator, (principalDays * 7n).toString());
    assertEquals(r.unpaid_installments_cents, debts);
    assertEquals(r.unapplied_payments_cents, cash);
  }
});
