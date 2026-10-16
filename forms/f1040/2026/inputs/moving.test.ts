import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateMovingSources2026,
  movingClaim2026Schema,
} from "./moving-source.ts";
import {
  syntheticForeignStorage2026,
  syntheticMoving2026,
} from "./moving.fixture.ts";
import { moving_expenses_2026 } from "./moving-expenses.ts";
import { w2_2026 } from "./w2.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 moving miles use the dated rates before per-line rounding", () => {
  const r = calculateMovingSources2026(syntheticMoving2026());
  assertEquals(r.moves[0].lines, {
    line1: 2000,
    line2: 44,
    line3: 2044,
    line4: 1000,
    line5: 1044,
  });
  assertEquals(r.moves[0].expenses.slice(1).map((e) => e.eligible_amount), [
    20.5,
    23.5,
  ]);
  assertEquals([r.schedule1Line14, r.f1040Line1h, r.schedule1StorageFees], [
    1044,
    0,
    false,
  ]);
});
Deno.test("2026 multiple moves keep deduction and excess reimbursement separate", () => {
  const raw = syntheticMoving2026();
  const other = structuredClone(raw.moves[0]);
  other.move_id = "second";
  other.order_or_assignment_group_reference = "second-order";
  other.eligibility = {
    kind: "intelligence",
    member_ssn: "111223333",
    agency_name: "Example qualifying agency",
    employee_or_new_appointee: true,
    not_armed_forces_member: true,
    agency_qualifies_under_50usc3003: true,
    agency_qualification_record: "agency-record",
    assignment_requires_relocation: true,
    assignment_reference: "assignment",
  };
  other.expenses.forEach((e) => {
    e.expense_id += "-second";
    e.source_document_reference += "-second";
  });
  other.reimbursements[0] = {
    ...other.reimbursements[0],
    reimbursement_id: "second",
    source_line_reference: "2",
    expense_ids: ["goods-second"],
    amount: 3000,
  };
  raw.moves.push(other);
  raw.w2_moving_sources_2026![0].box12_p = 4000;
  const r = calculateMovingSources2026(raw);
  assertEquals([r.schedule1Line14, r.f1040Line1h], [1044, 956]);
  assertEquals(r.moves.map((m) => m.file_form3903), [true, true]);
});
Deno.test("2026 moving W-2 wages are not subtracted again and code P must reconcile", () => {
  const raw = syntheticMoving2026();
  raw.moves[0].reimbursements[0].reporting = "w2_box1";
  raw.w2_moving_sources_2026![0].box12_p = 0;
  assertEquals(calculateMovingSources2026(raw).schedule1Line14, 2044);
  raw.w2_moving_sources_2026![0].box12_p = 1000;
  assertThrows(() => calculateMovingSources2026(raw), Error, "code P");
  raw.moves[0].reimbursements[0].reporting = "w2_box12_p";
  raw.w2_moving_sources_2026![0].employee_ssn = "999887777";
  assertThrows(() => calculateMovingSources2026(raw), Error, "return filer");
});
Deno.test("2026 services and special allowances are excluded once, separately from code P", () => {
  const raw = syntheticMoving2026();
  const m = raw.moves[0];
  m.expenses.push({
    ...m.expenses[0],
    expense_id: "government-service",
    source_document_reference: "government-service",
    amount_paid: 500,
    paid_by: "government_in_kind",
  });
  m.reimbursements.push({
    ...m.reimbursements[0],
    reimbursement_id: "dislocation",
    source_line_reference: "2",
    kind: "dislocation_allowance",
    reporting: "excluded_special_allowance",
    amount: 500,
    w2_document_reference: undefined,
    expense_ids: [],
    expense_allocations: [{ expense_id: "goods", amount: 100 }],
  });
  const r = calculateMovingSources2026(raw);
  assertEquals(r.moves[0].lines, {
    line1: 1900,
    line2: 44,
    line3: 1944,
    line4: 1000,
    line5: 944,
  });
});
Deno.test("2026 domestic storage uses one consecutive 30-day window", () => {
  const raw = syntheticMoving2026();
  const m = raw.moves[0];
  m.goods_delivered_on = "2026-08-01";
  m.domestic_storage_window = {
    starts_on: "2026-07-01",
    ends_on: "2026-07-30",
  };
  m.expenses.push({
    ...m.expenses[0],
    expense_id: "storage",
    source_document_reference: "storage",
    category: "storage",
    amount_paid: 300,
    storage_period: { ...m.domestic_storage_window },
  });
  assertEquals(calculateMovingSources2026(raw).schedule1Line14, 1344);
  m.domestic_storage_window.ends_on = "2026-07-31";
  assertThrows(() => calculateMovingSources2026(raw), Error, "30-day");
  m.domestic_storage_window.ends_on = "2026-07-30";
  m.expenses.at(-1)!.storage_period!.ends_on = "2026-07-31";
  assertThrows(
    () => calculateMovingSources2026(raw),
    Error,
    "qualifying period",
  );
});
Deno.test("2026 prior-year foreign storage reaches Schedule 1 without Form 3903", () => {
  const raw = syntheticForeignStorage2026();
  const r = calculateMovingSources2026(raw);
  assertEquals([
    r.schedule1Line14,
    r.schedule1StorageFees,
    r.moves[0].file_form3903,
  ], [2000, true, false]);
  raw.moves[0].reimbursements[0].reporting = "w2_box12_p";
  assertThrows(() => calculateMovingSources2026(raw), Error, "storage-only");
});
Deno.test("2026 military last-post move checks the discharge anniversary or JTR extension", () => {
  const raw = syntheticMoving2026();
  raw.moves[0].eligibility = {
    kind: "military",
    member_ssn: "111223333",
    active_duty_at_order: true,
    military_order_reference: "last-post",
    permanent_change_of_station: "last_post",
    last_post_review: {
      active_duty_ended_on: "2025-06-30",
      destination_home_or_nearer_us_point: true,
    },
  };
  calculateMovingSources2026(raw);
  raw.moves[0].eligibility.last_post_review!.active_duty_ended_on =
    "2025-06-29";
  assertThrows(
    () => calculateMovingSources2026(raw),
    Error,
    "authorized period",
  );
  raw.moves[0].eligibility.last_post_review!.jtr_extension = {
    allowed_through: "2026-07-31",
    authorization_reference: "jtr-extension",
  };
  calculateMovingSources2026(raw);
});
Deno.test("2026 special spouse/dependent moves need a preceding qualifying event", () => {
  const raw = syntheticMoving2026();
  raw.moves[0].eligibility = {
    kind: "spouse_or_dependent_special_move",
    member_reference: "member",
    member_category: "armed_forces",
    qualifying_membership_record: "membership",
    relationship: "spouse",
    relationship_record: "marriage",
    event: "died",
    event_on: "2026-06-01",
    event_record: "event-record",
    destination: "claimant_home_of_record",
    destination_record: "home-record",
  };
  assertEquals(calculateMovingSources2026(raw).schedule1Line14, 1044);
  raw.moves[0].eligibility.event_on = "2026-07-01";
  assertThrows(() => calculateMovingSources2026(raw), Error, "precedes");
});
Deno.test("2026 actual vehicle expenses cannot also claim mileage or a second household trip", () => {
  const raw = syntheticMoving2026();
  const m = raw.moves[0];
  m.trips[0].vehicles[0].method = "actual_gas_oil";
  assertThrows(() => calculateMovingSources2026(raw), Error, "Vehicle method");
  m.expenses.slice(1).forEach((e) => {
    e.category = "gas_oil";
    e.miles = undefined;
    e.amount_paid = 30;
  });
  assertEquals(calculateMovingSources2026(raw).moves[0].lines.line2, 60);
  m.trips.push({ ...m.trips[0], trip_id: "return-trip", vehicles: [] });
  assertThrows(() => calculateMovingSources2026(raw), Error, "one moving trip");
});
Deno.test("2026 moving rejects duplicates, unsupported exclusions and missing source facts", () => {
  const changes: Array<(r: ReturnType<typeof syntheticMoving2026>) => void> = [
    (r) => {
      r.moves[0].expenses.push({
        ...r.moves[0].expenses[0],
        expense_id: "copy",
      });
    },
    (r) => {
      r.moves.push(structuredClone(r.moves[0]));
    },
    (r) => {
      r.moves[0].claimant_ssn = "999887777";
    },
    (r) => {
      r.moves[0].expenses[0].current_payment_refund = 3000;
    },
    (r) => {
      r.moves[0].expenses[1].travel_on = "2026-07-02";
    },
    (r) => {
      r.moves[0].expenses[0].paid_on = "2025-12-31";
    },
    (r) => {
      r.moves[0].reimbursements[0].expense_ids = ["missing"];
    },
    (r) => {
      r.filing_status = FilingStatus.MFS;
    },
  ];
  for (const change of changes) {
    const raw = syntheticMoving2026();
    change(raw);
    assertThrows(() => calculateMovingSources2026(raw));
  }
  assertEquals(
    movingClaim2026Schema.safeParse(syntheticMoving2026()).success,
    false,
  );
  assertThrows(() =>
    calculateMovingSources2026(
      { ...syntheticMoving2026(), no_form2555_exclusion: false } as never,
    )
  );
});
Deno.test("2026 moving node routes AGI, Schedule 1, wages and source provenance", () => {
  const ctx = { taxYear: 2026, formType: "f1040" };
  const raw = syntheticMoving2026();
  const out = moving_expenses_2026.compute(ctx, raw).outputs;
  assertEquals(out.find((r) => r.nodeType === "agi_aggregator")!.fields, {
    moving_sources_2026: calculateMovingSources2026(raw).source_input,
    line14_moving_expenses: 1044,
    line1h_other_earned: 0,
  });
  assertEquals(
    moving_expenses_2026.compute(ctx, {
      filing_status: FilingStatus.Single,
      taxpayer_ssn: "111223333",
    }).outputs,
    [],
  );
  assertThrows(
    () => moving_expenses_2026.compute({ ...ctx, taxYear: 2025 }, raw),
    Error,
    "2026",
  );
  const w2 = w2_2026.compute(ctx, {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    w2s: [{
      tax_year: 2026,
      employer_ein: "12-3456789",
      employer_name: "Example government employer",
      employee_ssn: "111223333",
      source_document_reference: "issued-w2-1",
      box1_wages: 150001,
      box2_fed_withheld: 30000,
      box12_entries: [{ code: Box12Code.P, amount: 1000 }],
    }],
  }).outputs.find((r) => r.nodeType === "f3903")!;
  assertEquals(w2.fields.w2_moving_sources_2026, raw.w2_moving_sources_2026);
  assertThrows(
    () =>
      moving_expenses_2026.compute(ctx, {
        filing_status: FilingStatus.Single,
        taxpayer_ssn: "111223333",
        w2_moving_sources_2026: raw.w2_moving_sources_2026,
      }),
    Error,
    "ledger",
  );
  assertEquals(w2_2026.outputNodeTypes.includes("f3903"), true);
});

Deno.test("2026 unspent or fully refunded moving reimbursements remain taxable", () => {
  const raw = syntheticMoving2026();
  raw.moves[0].expenses = [];
  raw.moves[0].reimbursements[0].expense_ids = [];
  assertEquals(calculateMovingSources2026(raw).f1040Line1h, 1000);
  const refunded = syntheticMoving2026();
  refunded.moves[0].expenses = [refunded.moves[0].expenses[0]];
  refunded.moves[0].expenses[0].current_payment_refund = 2000;
  assertEquals(calculateMovingSources2026(refunded).f1040Line1h, 1000);
});
Deno.test("2026 storage-only claims aggregate cents before rounding the Schedule 1 line", () => {
  const raw = syntheticForeignStorage2026();
  raw.moves[0].expenses[0].amount_paid = 1000.4;
  raw.moves[0].reimbursements = [];
  const second = structuredClone(raw.moves[0]);
  second.move_id = "second";
  second.order_or_assignment_group_reference = "second-order";
  second.expenses[0].expense_id = "second-storage";
  second.expenses[0].source_document_reference = "second-storage";
  raw.moves.push(second);
  assertEquals(calculateMovingSources2026(raw).schedule1Line14, 2001);
});

Deno.test("2026 prior foreign storage preserves the last-post leap-day deadline", () => {
  const raw = syntheticForeignStorage2026();
  raw.moves[0].moved_on = "2025-03-01";
  raw.moves[0].eligibility = {
    kind: "military",
    member_ssn: "111223333",
    active_duty_at_order: true,
    military_order_reference: "last-post",
    permanent_change_of_station: "last_post",
    last_post_review: {
      active_duty_ended_on: "2024-02-29",
      destination_home_or_nearer_us_point: true,
    },
  };
  assertThrows(
    () => calculateMovingSources2026(raw),
    Error,
    "authorized period",
  );
});
