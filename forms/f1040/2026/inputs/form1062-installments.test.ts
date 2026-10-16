import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm1062Installments2026,
  type Form1062InstallmentSource2026,
} from "./form1062-installments.ts";
import { form1062TaxFixture2026 } from "./form1062-tax.fixture.ts";
import { landGraphFixture2026 } from "./land-graph.fixture.ts";

function fixture(graph?: Record<string, unknown>) {
  const { input: tax } = form1062TaxFixture2026(graph);
  const records: Form1062InstallmentSource2026 = {
    tax_year: 2026,
    record_reference: "synthetic-installment-ledger",
    election_reference: tax.election.record_reference,
    taxpayer_tin: "123456789",
    as_of: "2027-03-01",
    filing: { kind: "planned", on: "2027-04-15" },
    review: {
      record_reference: "synthetic-deadline-and-payment-review",
      domestic_calendar_year_individual: true,
      no_special_deadline_relief_or_state_holiday_adjustment: true,
      no_death_revocation_deficiency_or_addition_to_tax: true,
      payment_and_event_records_complete_through_as_of: true,
    },
    payments: [],
  };
  return { tax, records };
}
function payment(
  installment: number,
  amount_cents: number,
  effective_on = "2027-04-15",
) {
  return {
    record_reference: `synthetic-payment-${installment}`,
    account_record_reference: "synthetic-tax-account-record",
    effective_on,
    amount_cents,
    allocations: [{ installment, amount_cents }],
  };
}

Deno.test("2026 Form 1062 retains four equal installments and holiday-adjusted ordinary dates", () => {
  const { tax, records } = fixture();
  const before = structuredClone({ tax, records });
  const r = calculateForm1062Installments2026(tax, records);
  assertEquals(
    r.installments.map((
      i,
    ) => [i.return_tax_year, i.ordinary_due_on, i.amount_cents]),
    [
      [2026, "2027-04-15", 84200],
      [2027, "2028-04-18", 84200],
      [2028, "2029-04-17", 84200],
      [2029, "2030-04-15", 84200],
    ],
  );
  assertEquals(r.total_liability_cents, 336800);
  assertEquals(r.remaining_liability_cents, 336800);
  assertEquals(r.installments.map((i) => i.status), Array(4).fill("scheduled"));
  assertEquals(r.election.status, "planned_timely");
  assertEquals(r.rounding_reconciliation_required, false);
  assertEquals(r.filing_ready, false);
  assertEquals({ tax, records }, before);
});

Deno.test("2026 Form 1062 filing extension does not extend the first installment", () => {
  const { tax, records } = fixture();
  records.as_of = "2027-10-15";
  records.filing = {
    kind: "filed",
    on: "2027-10-15",
    record_reference: "return-receipt",
  };
  records.extension = {
    record_reference: "extension-receipt",
    requested_on: "2027-04-15",
    valid_six_month_filing_extension: true,
  };
  const unpaid = calculateForm1062Installments2026(tax, records);
  assertEquals(unpaid.election.status, "reported_timely");
  assertEquals(unpaid.installments[0].ordinary_due_on, "2027-04-15");
  assertEquals(unpaid.installments[0].status, "overdue_review_required");
  assertEquals(unpaid.payment_or_acceleration_review_required, true);
  records.payments = [payment(1, 84200)];
  const paid = calculateForm1062Installments2026(tax, records);
  assertEquals(paid.installments[0].status, "paid_timely");
  assertEquals(paid.remaining_liability_cents, 252600);
  assertEquals(paid.payment_or_acceleration_review_required, false);
  records.filing.on = records.as_of = "2027-10-16";
  assertEquals(
    calculateForm1062Installments2026(tax, records).election.status,
    "late_review_required",
  );
  delete records.extension;
  records.filing.on = "2027-04-16";
  assertEquals(
    calculateForm1062Installments2026(tax, records).election.status,
    "late_review_required",
  );
});

Deno.test("2026 Form 1062 never erases a late-payment review when the balance is later paid", () => {
  const { tax, records } = fixture();
  records.as_of = "2027-04-15";
  records.payments = [payment(1, 40000)];
  let r = calculateForm1062Installments2026(tax, records);
  assertEquals(r.installments[0].status, "due_today");
  records.as_of = "2027-04-16";
  records.filing = {
    kind: "filed",
    on: "2027-04-15",
    record_reference: "return-receipt",
  };
  records.payments.push({
    ...payment(1, 44200, "2027-04-16"),
    record_reference: "late-payment",
  });
  r = calculateForm1062Installments2026(tax, records);
  assertEquals(r.installments[0].remaining_cents, 0);
  assertEquals(r.installments[0].paid_by_due_date_cents, 40000);
  assertEquals(r.installments[0].status, "paid_late_review_required");
  assertEquals(r.payment_or_acceleration_review_required, true);
});

Deno.test("2026 Form 1062 preserves cents instead of multiplying rounded line 15 by four", () => {
  const { tax, records } = fixture(landGraphFixture2026(45010, [], 40000));
  const r = calculateForm1062Installments2026(tax, records);
  assertEquals(r.tax.lines.line14, 3369);
  assertEquals(r.installments.map((i) => i.amount_cents), [
    84225,
    84225,
    84225,
    84225,
  ]);
  assertEquals(r.printed_first_installment_dollars, 842);
  assertEquals(r.printed_first_installment_difference_cents, -25);
  assertEquals(r.rounding_reconciliation_required, true);
  assertEquals(
    r.installments.reduce((sum, i) => sum + i.amount_cents, 0),
    336900,
  );
});

Deno.test("2026 Form 1062 reconciles a source payment allocated across installments", () => {
  const { tax, records } = fixture();
  records.as_of = "2027-04-15";
  records.payments = [{
    ...payment(1, 168400),
    allocations: [{ installment: 1, amount_cents: 84200 }, {
      installment: 2,
      amount_cents: 84200,
    }],
  }];
  const r = calculateForm1062Installments2026(tax, records);
  assertEquals(r.installments.map((i) => i.status), [
    "paid_timely",
    "paid_timely",
    "scheduled",
    "scheduled",
  ]);
  assertEquals(r.remaining_liability_cents, 168400);
  assertEquals(
    r.installments[1].payment_evidence[0].payment_reference,
    "synthetic-payment-1",
  );
  records.payments[0].allocations[0].amount_cents--;
  assertThrows(
    () => calculateForm1062Installments2026(tax, records),
    Error,
    "does not reconcile",
  );
});

Deno.test("2026 Form 1062 holds missing, duplicate, future and overallocated payment evidence", () => {
  const { tax, records } = fixture();
  records.as_of = "2027-04-15";
  const invalid = (
    patch: Partial<Form1062InstallmentSource2026>,
    message: string,
  ) =>
    assertThrows(
      () => calculateForm1062Installments2026(tax, { ...records, ...patch }),
      Error,
      message,
    );
  invalid({ election_reference: "another-election" }, "another election");
  invalid({ taxpayer_tin: "987654321" }, "another election");
  invalid({ spouse_tin: "987654321" }, "another election");
  invalid({ payments: [payment(1, 84200), payment(1, 84200)] }, "Duplicate");
  invalid(
    { payments: [payment(1, 84200, "2027-04-16")] },
    "outside the reviewed period",
  );
  invalid({ payments: [payment(1, 84201)] }, "excess payment");
  invalid({
    payments: [{ ...payment(1, 84200), account_record_reference: "" }],
  }, "String must contain");
  invalid({
    payments: [{
      ...payment(1, 84200),
      allocations: [{ installment: 1, amount_cents: 42100 }, {
        installment: 1,
        amount_cents: 42100,
      }],
    }],
  }, "Duplicate");
  invalid(
    { payments: [{ ...payment(1, 84200), amount_cents: 84200.1 }] },
    "Expected integer",
  );
  invalid(
    { payments: [{ ...payment(1, 84200), effective_on: "2027-02-30" }] },
    "Invalid date",
  );
});

Deno.test("2026 Form 1062 requires chronological filing and timely extension evidence", () => {
  const { tax, records } = fixture();
  assertThrows(
    () =>
      calculateForm1062Installments2026(tax, {
        ...records,
        as_of: "2026-12-31",
      }),
    Error,
    "completed 2026",
  );
  assertThrows(
    () =>
      calculateForm1062Installments2026(tax, {
        ...records,
        as_of: "2027-04-16",
      }),
    Error,
    "workpaper date",
  );
  assertThrows(
    () =>
      calculateForm1062Installments2026(tax, {
        ...records,
        filing: {
          kind: "filed",
          on: "2027-04-15",
          record_reference: "receipt",
        },
      }),
    Error,
    "workpaper date",
  );
  records.extension = {
    record_reference: "extension",
    requested_on: "2027-04-16",
    valid_six_month_filing_extension: true,
  };
  records.as_of = records.filing.on = "2027-10-15";
  assertThrows(
    () => calculateForm1062Installments2026(tax, records),
    Error,
    "timely filing extension",
  );
});

Deno.test("2026 Form 1062 holds unsupported lifecycle facts and zero-liability elections", () => {
  const { tax, records } = fixture();
  assertThrows(() =>
    calculateForm1062Installments2026(tax, {
      ...records,
      review: {
        ...records.review,
        no_death_revocation_deficiency_or_addition_to_tax: false as true,
      },
    })
  );
  assertThrows(() =>
    calculateForm1062Installments2026(tax, {
      ...records,
      review: {
        ...records.review,
        no_special_deadline_relief_or_state_holiday_adjustment: false as true,
      },
    })
  );
  assertThrows(() =>
    calculateForm1062Installments2026(tax, {
      ...records,
      review: {
        ...records.review,
        payment_and_event_records_complete_through_as_of: false as true,
      },
    })
  );
  const zero = fixture(landGraphFixture2026(100, [], 0));
  assertThrows(
    () => calculateForm1062Installments2026(zero.tax, zero.records),
    Error,
    "positive",
  );
  // Internal callers cannot smuggle a calculated tax or installment override.
  assertThrows(() =>
    calculateForm1062Installments2026(
      tax,
      { ...records, amount: 1 } as Form1062InstallmentSource2026,
    )
  );
});
