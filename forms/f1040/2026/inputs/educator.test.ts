import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateEducatorSources2026,
  educatorClaim2026Schema,
} from "./educator-source.ts";
import { syntheticEducator2026 } from "./educator.fixture.ts";
import { educator_expenses_2026 } from "./educator-expenses.ts";
import { calculateScheduleA2026 } from "../schedule-a.ts";
import { syntheticScheduleA2026 } from "../schedule-a.fixture.ts";

Deno.test("2026 educator receipts split after refunds, personal use and reimbursements", () => {
  const r = calculateEducatorSources2026(syntheticEducator2026());
  assertEquals([r.schedule1Line11, r.scheduleALine17k], [350, 450]);
  assertEquals(
    r.expenses[0].schedule1_allocation + r.expenses[0].schedule_a_allocation +
      r.expenses[0].excluded_amount,
    1200,
  );
});

Deno.test("2026 educator hours must qualify within one school year", () => {
  const raw = syntheticEducator2026();
  const y = raw.educators[0].school_years[0];
  y.assignments[0].hours_worked = 899;
  assertEquals(calculateEducatorSources2026(raw).scheduleALine17k, 0);
  const other = structuredClone(y.assignments[0]);
  other.assignment_id = "second-school";
  other.hours_worked = 1;
  y.assignments.push(other);
  assertEquals(calculateEducatorSources2026(raw).schedule1Line11, 350);
  y.assignments.pop();
  const next = structuredClone(y);
  next.school_year_id = "2026-2027";
  next.starts_on = "2026-08-01";
  next.ends_on = "2027-07-31";
  next.assignments[0].assignment_id = "fall-job";
  next.assignments[0].hours_worked = 1;
  next.assignments[0].service_starts_on = "2026-08-01";
  next.assignments[0].service_ends_on = "2026-12-31";
  raw.educators[0].school_years.push(next);
  assertEquals(calculateEducatorSources2026(raw).schedule1Line11, 0);
});

Deno.test("2026 early-childhood educators use the enacted facility and funding tests", () => {
  const raw = syntheticEducator2026();
  const a = raw.educators[0].school_years[0].assignments[0];
  a.school = {
    type: "early_childhood",
    nonresident_children_under_six_served: 3,
    publicly_funded_or_receives_fee_payment_or_grant: true,
    enrollment_and_funding_record: "childcare-enrollment",
  };
  assertEquals(calculateEducatorSources2026(raw).schedule1Line11, 350);
  a.school.nonresident_children_under_six_served = 2;
  assertEquals(calculateEducatorSources2026(raw).schedule1Line11, 0);
  a.school.nonresident_children_under_six_served = 3;
  a.school.publicly_funded_or_receives_fee_payment_or_grant = false;
  assertEquals(calculateEducatorSources2026(raw).scheduleALine17k, 0);
});

Deno.test("2026 coach and instructional activity extensions belong to Schedule A", () => {
  const raw = syntheticEducator2026();
  const a = raw.educators[0].school_years[0].assignments[0];
  a.role = "interscholastic_coach";
  let r = calculateEducatorSources2026(raw);
  assertEquals([r.schedule1Line11, r.scheduleALine17k], [0, 800]);
  a.role = "teacher";
  raw.expenses[0].use = "other_instructional_activity";
  r = calculateEducatorSources2026(raw);
  assertEquals([r.schedule1Line11, r.scheduleALine17k], [0, 800]);
  raw.expenses[0].use = "classroom";
  raw.expenses[0].health_or_physical_education = true;
  r = calculateEducatorSources2026(raw);
  assertEquals([r.schedule1Line11, r.scheduleALine17k], [0, 800]);
  raw.expenses[0].athletic_supply = true;
  assertEquals(calculateEducatorSources2026(raw).schedule1Line11, 350);
});

Deno.test("2026 educator caps are per spouse and apply once across school years", () => {
  const raw = syntheticEducator2026();
  raw.filing_status = FilingStatus.MFJ;
  raw.spouse_ssn = "222334444";
  const spouse = structuredClone(raw.educators[0]);
  spouse.educator_ssn = raw.spouse_ssn;
  spouse.school_years[0].assignments[0].assignment_id = "spouse-job";
  raw.educators.push(spouse);
  const cost = structuredClone(raw.expenses[0]);
  cost.educator_ssn = raw.spouse_ssn;
  cost.assignment_id = "spouse-job";
  cost.expense_id = "spouse-supplies";
  cost.source_document_reference = "spouse-receipt";
  cost.amount_paid = 500;
  raw.expenses.push(cost);
  const r = calculateEducatorSources2026(raw);
  assertEquals([r.schedule1Line11, r.scheduleALine17k], [450, 450]);
  cost.amount_paid = 1200;
  assertEquals(calculateEducatorSources2026(raw).schedule1Line11, 700);
  cost.amount_paid = 649.6;
  raw.expenses[0].amount_paid = 649.6;
  assertEquals(calculateEducatorSources2026(raw).schedule1Line11, 499);
  raw.filing_status = FilingStatus.MFS;
  raw.mfs_payment_review = {
    record_reference: "separate-payment-record",
    noncommunity_property: true,
    expenses_paid_solely_by_filer: true,
  };
  assertThrows(() => calculateEducatorSources2026(raw), Error, "return filer");
});

Deno.test("2026 educator annual cap does not restart with a new school year", () => {
  const raw = syntheticEducator2026();
  const year = structuredClone(raw.educators[0].school_years[0]);
  year.school_year_id = "2026-2027";
  year.starts_on = "2026-08-01";
  year.ends_on = "2027-07-31";
  year.assignments[0].assignment_id = "fall-job";
  year.assignments[0].service_starts_on = "2026-08-01";
  year.assignments[0].service_ends_on = "2027-06-30";
  raw.educators[0].school_years.push(year);
  const expense = structuredClone(raw.expenses[0]);
  expense.expense_id = "fall-supplies";
  expense.assignment_id = "fall-job";
  expense.source_document_reference = "fall-receipt";
  expense.paid_on = "2026-09-01";
  raw.expenses.push(expense);
  const r = calculateEducatorSources2026(raw);
  assertEquals([r.schedule1Line11, r.scheduleALine17k], [350, 1250]);
  raw.expenses.reverse();
  raw.educators[0].school_years.reverse();
  assertEquals(calculateEducatorSources2026(raw).expenses, r.expenses);
});

Deno.test("2026 educator and coach hours distinguish the adjustment from itemization", () => {
  const raw = syntheticEducator2026();
  const a = raw.educators[0].school_years[0].assignments[0];
  a.hours_worked = 800;
  raw.educators[0].school_years[0].assignments.push({
    ...a,
    assignment_id: "coach-job",
    role: "interscholastic_coach",
    hours_worked: 100,
  });
  const r = calculateEducatorSources2026(raw);
  assertEquals([r.schedule1Line11, r.scheduleALine17k], [0, 800]);
  raw.educators[0].school_years[0].assignments.forEach((a) =>
    a.service_ends_on = "2025-12-31"
  );
  assertEquals(calculateEducatorSources2026(raw).scheduleALine17k, 0);
});

Deno.test("2026 professional development reduces expenses used for education credits", () => {
  const raw = syntheticEducator2026();
  const e = raw.expenses[0];
  e.category = "professional_development";
  e.professional_development_review = {
    course_and_curriculum_record: "course",
    related_to_curriculum_or_students: true,
    does_not_meet_minimum_qualifications_or_qualify_for_new_trade: true,
  };
  e.benefit_allocations.push({
    kind: "education_credit",
    amount: 600,
    source_reference: "education-credit-allocation",
  });
  const r = calculateEducatorSources2026(raw);
  assertEquals([r.schedule1Line11, r.scheduleALine17k], [200, 0]);
  e.professional_development_review.related_to_curriculum_or_students = false;
  assertEquals(calculateEducatorSources2026(raw).schedule1Line11, 0);
});

Deno.test("2026 educator source validation rejects missing eligibility and duplicated receipts", () => {
  const mutations: Array<
    (r: ReturnType<typeof syntheticEducator2026>) => void
  > = [
    (r) => {
      r.expenses.push({ ...r.expenses[0], expense_id: "other-id" });
    },
    (r) => {
      r.educators.push(structuredClone(r.educators[0]));
    },
    (r) => {
      r.expenses[0].educator_ssn = "222334444";
    },
    (r) => {
      r.expenses[0].assignment_id = "missing";
    },
    (r) => {
      r.expenses[0].paid_on = "2025-12-31";
    },
    (r) => {
      r.expenses[0].current_payment_refund = 1201;
    },
    (r) => {
      r.educators[0].school_years[0].assignments[0].hours_worked = NaN;
    },
    (r) => {
      r.educators[0].school_years[0].assignments[0].service_ends_on =
        "2027-07-31";
    },
    (r) => {
      r.expenses[0].category = "professional_development";
    },
  ];
  for (const change of mutations) {
    const raw = syntheticEducator2026();
    change(raw);
    assertThrows(() => calculateEducatorSources2026(raw));
  }
  const raw = syntheticEducator2026();
  assertEquals(educatorClaim2026Schema.safeParse(raw).success, false);
  assertThrows(() =>
    calculateEducatorSources2026(
      {
        ...raw,
        educators: [{
          ...raw.educators[0],
          no_section135_529_530_exclusions: false,
        }],
      } as never,
    )
  );
});

Deno.test("2026 Schedule A educator source reconciles the Schedule 1 deduction", () => {
  const raw = syntheticScheduleA2026();
  raw.educator_source_2026 = syntheticEducator2026();
  raw.educator_adjustment_from_agi = 350;
  raw.source_scope_review.no_casualty_or_other_itemized_deductions = undefined;
  raw.source_scope_review.has_educator_expense_sources = true;
  raw.source_scope_review.no_casualty_or_other_itemized_except_educator = true;
  assertEquals(calculateScheduleA2026(raw).lines.line17k, 450);
  assertEquals(calculateScheduleA2026(raw).beforeOverallLimit, 450);
  raw.educator_adjustment_from_agi = 300;
  assertThrows(() => calculateScheduleA2026(raw), Error, "disagrees with AGI");
});

Deno.test("2026 educator source node keeps the year and owner boundary", () => {
  const ctx = { taxYear: 2026, formType: "f1040" };
  assertEquals(
    educator_expenses_2026.compute(ctx, {
      filing_status: FilingStatus.Single,
      taxpayer_ssn: "111223333",
    }),
    { outputs: [] },
  );
  assertThrows(
    () =>
      educator_expenses_2026.compute(
        { ...ctx, taxYear: 2025 },
        syntheticEducator2026(),
      ),
    Error,
    "2026",
  );
  const r = educator_expenses_2026.compute(ctx, syntheticEducator2026());
  assertEquals(
    r.outputs.find((o) => o.nodeType === "agi_aggregator")?.fields
      .line11_educator_expenses,
    350,
  );
});
