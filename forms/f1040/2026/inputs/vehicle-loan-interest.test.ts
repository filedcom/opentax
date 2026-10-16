import { assertAlmostEquals, assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateVehicleInterestSources2026 as calculate,
  type VehicleLoan2026,
} from "./vehicle-loan-source.ts";
import { syntheticVehicleLoan2026 as fixture } from "./vehicle-loan.fixture.ts";
import { vehicle_loan_interest_2026 } from "./vehicle-loan-interest.ts";
import { calculateSchedule1A2026 } from "../nodes/schedule1a.ts";
import {
  scopeReview2026,
  zeroExclusions2026,
} from "../nodes/schedule1a.fixture.ts";
const owner = { filing_status: FilingStatus.Single, taxpayer_ssn: "111223333" };
function schedule(
  loans: VehicleLoan2026[],
  magi: number,
  status = FilingStatus.Single,
) {
  const owners = {
    ...owner,
    filing_status: status,
    ...(status === FilingStatus.MFJ ? { spouse_ssn: "222334444" } : {}),
  };
  return calculateSchedule1A2026({
    ...owners,
    taxpayer_has_valid_ssn: false,
    taxpayer_age_65_or_older: false,
    spouse_has_valid_ssn: false,
    spouse_age_65_or_older: false,
    magi,
    source_scope_review: {
      ...scopeReview2026,
      has_vehicle_loan_interest: true,
    },
    part1_zero_exclusions_review: zeroExclusions2026,
    vehicle_interest_2026: calculate(loans, owners).map((s) => s.row),
  });
}
Deno.test("2026 vehicle loan reconciles source interest and permits a loan originated in 2025", () => {
  const result = calculate([fixture()], owner)[0];
  assertEquals(result.row.schedule1a_interest, 4_200);
  assertEquals(result.excluded_reasons, []);
  assertEquals(result.statements[0].document_id, "1098-vli");
});
Deno.test("2026 vehicle interest has no $600 recipient deduction floor", () => {
  const loan = fixture();
  const s = loan.original.statements[0];
  s.source_kind = "lender_payment_record";
  s.gross_interest_paid = 400;
  s.box1_interest = undefined;
  s.box4_outstanding_principal = undefined;
  s.payments[0].amount = 400;
  assertEquals(calculate([loan], owner)[0].row.schedule1a_interest, 400);
});
Deno.test("2026 negative equity down payment offsets excluded debt before pro rata interest", () => {
  const loan = fixture();
  const o = loan.original;
  const s = o.statements[0];
  o.negative_equity = 6_000;
  o.down_payment_or_other_consideration = 4_000;
  o.total_principal = 42_000;
  s.box1_interest = 4_000;
  // The lender already allocates box 1: do not apply the ratio twice.
  assertEquals(calculate([loan], owner)[0].row.schedule1a_interest, 4_000);
  s.box1_interest = 4_200;
  assertThrows(
    () => calculate([loan], owner),
    Error,
    "qualifying debt allocation",
  );
});
Deno.test("2026 extra refinance principal is excluded and interest is allocated pro rata", () => {
  const loan = fixture();
  const initial = loan.original.statements[0];
  initial.period_end = "2026-06-30";
  initial.gross_interest_paid = 2_000;
  initial.box1_interest = 2_000;
  initial.payments[0].amount = 2_000;
  const refinanced = structuredClone(initial);
  Object.assign(refinanced, {
    document_id: "refinance-statement",
    period_start: "2026-07-01",
    period_end: "2026-12-31",
    reported_origination_date: "2026-07-01",
    account_number: "new-account",
    gross_interest_paid: 3_000,
    box1_interest: 2_400,
    box4_outstanding_principal: 32_000,
  });
  refinanced.payments[0].amount = 3_000;
  loan.refinancings = [{
    financing_id: "new-loan",
    date: "2026-07-01",
    lender_name: "Synthetic Lender",
    lender_ein: "123456789",
    account_number: "new-account",
    total_principal: 40_000,
    prior_loan_outstanding_principal: 32_000,
    principal_and_refinance_record: "refinance-closing",
    first_lien_on_same_vehicle: true,
    related_party_lender: false,
    same_obligors: true,
    statements: [refinanced],
  }];
  assertEquals(calculate([loan], owner)[0].row.schedule1a_interest, 4_400);
  loan.refinancings[0].prior_loan_outstanding_principal = 41_000;
  assertThrows(() => calculate([loan], owner), Error, "outstanding balance");
});
Deno.test("2026 lender acquisition does not create a new loan or duplicate annual interest", () => {
  const loan = fixture();
  const first = loan.original.statements[0];
  first.period_end = "2026-06-30";
  first.box1_interest = 2_100;
  first.gross_interest_paid = 2_100;
  first.payments[0].amount = 2_100;
  const second = structuredClone(first);
  Object.assign(second, {
    document_id: "servicer-two",
    lender_ein: "987654321",
    account_number: "servicer-two-account",
    period_start: "2026-07-01",
    period_end: "2026-12-31",
    lender_acquisition_date: "2026-07-01",
    lender_transfer_reference: "servicing-transfer",
    box4_outstanding_principal: 30_000,
  });
  loan.original.statements.push(second);
  assertEquals(calculate([loan], owner)[0].row.schedule1a_interest, 4_200);
  second.reported_origination_date = "2026-07-01";
  assertThrows(() => calculate([loan], owner), Error, "origination");
});
Deno.test("2026 corrected vehicle statements replace matching originals and retain evidence", () => {
  const loan = fixture();
  const correction = structuredClone(loan.original.statements[0]);
  correction.document_id = "corrected";
  correction.replaces_document_id = "1098-vli";
  correction.box1_interest = 4_000;
  correction.gross_interest_paid = 4_000;
  correction.payments[0].amount = 4_000;
  loan.original.statements.push(correction);
  const result = calculate([loan], owner)[0];
  assertEquals(result.row.schedule1a_interest, 4_000);
  assertEquals(result.source.original.statements.length, 2);
  assertEquals(result.statements.length, 1);
  correction.account_number = "wrong-account";
  assertThrows(
    () => calculate([loan], owner),
    Error,
    "matching lender/account",
  );
});
Deno.test("2026 duplicate vehicle loans, overlapping statements and correction cycles fail", () => {
  const loan = fixture();
  assertThrows(
    () => calculate([loan, { ...loan, loan_id: "copy" }], owner),
    Error,
    "Duplicate original",
  );
  const duplicate = structuredClone(loan.original.statements[0]);
  duplicate.document_id = "duplicate";
  loan.original.statements.push(duplicate);
  assertThrows(() => calculate([loan], owner), Error, "servicing dates");
  duplicate.replaces_document_id = "1098-vli";
  loan.original.statements[0].replaces_document_id = "duplicate";
  assertThrows(() => calculate([loan], owner), Error, "cycle");
});
Deno.test("2026 co-borrower and third-party payments belong to the actual return owner", () => {
  const loan = fixture();
  loan.original.borrower_ssns.push("222334444");
  const s = loan.original.statements[0];
  s.payments[0].amount = 3_000;
  s.payments.push({
    ...s.payments[0],
    credited_to_borrower_ssn: "222334444",
    amount: 1_200,
  });
  assertEquals(calculate([loan], owner)[0].row.schedule1a_interest, 3_000);
  assertEquals(
    calculate([loan], {
      ...owner,
      filing_status: FilingStatus.MFJ,
      spouse_ssn: "222334444",
    })[0].row.schedule1a_interest,
    4_200,
  );
  s.payments[0].payor = "third_party_gift";
  assertThrows(() => calculate([loan], owner), Error, "gift");
  s.payments[0].third_party_gift_reference = "gift-payment-evidence";
  assertEquals(calculate([loan], owner)[0].row.schedule1a_interest, 3_000);
});
Deno.test("2026 vehicle exclusions derive zero from source facts", () => {
  const mutations: ((l: VehicleLoan2026) => void)[] = [
    (l) => {
      l.original.first_lien = false;
    },
    (l) => {
      l.original.related_party_lender = true;
    },
    (l) => {
      l.original_use_begins_with_borrower = false;
      l.original.statements[0].box6_original_use = false;
    },
    (l) => {
      l.final_assembly_in_us = false;
      l.original.statements[0].box7_us_final_assembly = false;
    },
    (l) => {
      l.gross_vehicle_weight_rating = 14_000;
    },
    (l) => {
      l.expected_personal_use_at_origination_percent = 50;
    },
    (l) => {
      l.lease_financing = true;
    },
    (l) => {
      l.salvage_title = true;
    },
    (l) => {
      l.vehicle_type = "other";
    },
    (l) => {
      l.fleet_sale = true;
    },
    (l) => {
      l.obligor_change = "other";
    },
  ];
  for (const change of mutations) {
    const loan = fixture();
    const s = loan.original.statements[0];
    s.source_kind = "lender_payment_record";
    s.box1_interest = undefined;
    s.box4_outstanding_principal = undefined;
    change(loan);
    const result = calculate([loan], owner)[0];
    assertEquals(result.row.schedule1a_interest, 0);
    assertEquals(result.excluded_reasons.length, 1);
  }
});
Deno.test("2026 vehicle business deduction is subtracted only after the activity limitation", () => {
  const loan = fixture();
  loan.has_business_interest_allocation = true;
  assertThrows(() => calculate([loan], owner), Error, "activity deductions");
  const business = {
    loan_id: loan.loan_id,
    borrower_ssn: owner.taxpayer_ssn,
    activity_id: "business-1",
    source_form: "schedule_c" as const,
    deducted_amount: 1_000,
    limitation_result_reference: "8990-and-schedule-c",
  };
  const result = calculate([loan], owner, [business])[0];
  assertEquals(result.row.schedule1a_interest, 3_200);
  assertEquals(result.row.business_interest_deducted, 1_000);
  assertThrows(
    () => calculate([loan], owner, [{ ...business, deducted_amount: 4_201 }]),
    Error,
    "exceed",
  );
});
Deno.test("2026 prior-year box 5 recovery cannot be silently netted against box 1", () => {
  const loan = fixture();
  loan.original.statements[0].box5_prior_year_interest_refund = 200;
  assertThrows(() => calculate([loan], owner), Error, "do not subtract box 5");
});
Deno.test("2026 vehicle cap and fractional-$1,000 phaseout differ from the tip phaseout", () => {
  for (
    const [magi, expected] of [
      [100_000, 4_200],
      [100_001, 4_000],
      [101_000, 4_000],
      [101_001, 3_800],
      [150_001, 0],
    ]
  ) {
    assertEquals(schedule([fixture()], magi).lines.line36, expected);
  }
  assertEquals(
    schedule([fixture()], 200_000, FilingStatus.MFJ).lines.line36,
    4_200,
  );
  // Unlike the tip/senior deductions, the statute permits MFS vehicle interest.
  assertEquals(
    schedule([fixture()], 90_000, FilingStatus.MFS).lines.line36,
    4_200,
  );
  const loans = [fixture(), fixture(), fixture()];
  for (const [i, l] of loans.entries()) {
    l.loan_id += i;
    l.original.account_number += i;
    l.original.statements[0].account_number = l.original.account_number;
    l.original.statements[0].document_id += i;
    l.vin = l.vin.slice(0, -1) + i;
    l.original.statements[0].reported_vin = l.vin;
  }
  const result = schedule(loans, 90_000);
  assertEquals(result.vehicle_rows.length, 3);
  assertEquals(result.lines.line29, 12_600);
  assertEquals(result.lines.line36, 10_000);
  assertEquals(result.lines.line44, 10_000);
});
Deno.test("2026 vehicle source node preserves unrounded evidence and context", () => {
  const loan = fixture();
  loan.original.statements[0].box1_interest = 4_200.45;
  loan.original.statements[0].gross_interest_paid = 4_200.45;
  loan.original.statements[0].payments[0].amount = 4_200.45;
  const result = vehicle_loan_interest_2026.compute({
    formType: "f1040",
    taxYear: 2026,
  }, { ...owner, vehicle_loans: [loan] });
  const rows = result.outputs.find((o) => o.nodeType === "schedule1a")!.fields
    .vehicle_interest_2026 as { schedule1a_interest: number }[];
  assertAlmostEquals(rows[0].schedule1a_interest, 4_200.45);
  assertThrows(
    () =>
      vehicle_loan_interest_2026.compute({ formType: "f1040", taxYear: 2025 }, {
        ...owner,
        vehicle_loans: [loan],
      }),
    Error,
    "f1040:2026",
  );
});

Deno.test("2026 vehicle form groups distinct debt records by VIN only after source reconciliation", () => {
  const first = fixture(), second = fixture();
  second.loan_id = "second-debt";
  second.original.account_number = "second-account";
  second.original.statements[0].account_number = "second-account";
  second.original.statements[0].document_id = "second-statement";
  const result = schedule([first, second], 90_000);
  assertEquals(result.vehicle_rows.length, 1);
  assertEquals(result.lines.line29, 8_400);
});
Deno.test("2026 vehicle source requires year, source boxes and itemized debt reconciliation", () => {
  const loan = fixture();
  loan.original.total_principal = 40_001;
  assertThrows(
    () => calculate([loan], owner),
    Error,
    "financing does not reconcile",
  );
  const incomplete = fixture();
  incomplete.original.statements[0].box1_interest = undefined;
  assertThrows(
    () => calculate([incomplete], owner),
    Error,
    "requires its interest",
  );
  const noSource = fixture();
  noSource.original.statements = [];
  assertThrows(() => calculate([noSource], owner), Error, "interest evidence");
});
