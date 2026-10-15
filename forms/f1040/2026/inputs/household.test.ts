import { FilingStatus } from "../../nodes/types.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { calculateHousehold2026 } from "./household-source.ts";
import {
  householdEmployee2026,
  householdFixture2026,
  householdFutaFixture2026,
  householdParentFixture2026,
} from "./household.fixture.ts";
const source = (f = householdFixture2026()) => ({
  filing_status: f.general.filing_status,
  taxpayer_ssn: f.general.taxpayer_ssn,
  ...f.household_employment,
});
export function householdGraph2026(f: Record<string, unknown>) {
  const r = execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    f,
    { taxYear: 2026, formType: "f1040" },
  );
  assertEquals(r.diagnostics, []);
  return r.pending;
}
Deno.test("Household dated quarters derive FICA-only wages and employer tax without changing earned income", () => {
  const f = householdFixture2026(),
    r = calculateHousehold2026(source(f)),
    p = householdGraph2026(f);
  assertEquals(r.quarterDollars[2026], [975, 975, 975, 975]);
  assertEquals(r.lines.line2, 484);
  assertEquals(r.lines.line4, 113);
  assertEquals(r.total_tax, 597);
  assertEquals(r.answers, {
    a: true,
    b: undefined,
    c: undefined,
    line9: false,
  });
  assertEquals(p.f1040.line11b_agi, 48100);
  assertEquals(p.f1040.line1z_total_wages, 48100);
  assertEquals(p.schedule2.line17a_household_employment_tax, 597);
  assertEquals(p.f1040.line23_other_taxes, 597);
});
Deno.test("Household parent care exception yields the ATS tax amounts with explicit synthetic exclusion facts", () => {
  const r = calculateHousehold2026(source(householdParentFixture2026()));
  assertEquals(r.lines.line2, 508);
  assertEquals(r.lines.line4, 119);
  assertEquals(r.total_tax, 627);
  assertEquals(r.answers.line9, false);
  assertEquals(r.lines.line26, undefined);
  const f = householdFixture2026(4100);
  assertThrows(
    () => calculateHousehold2026(source(f)),
    Error,
    "state unemployment",
  );
});
Deno.test("Household Section A caps FUTA by worker and preserves zero experience rates", () => {
  const f = householdFutaFixture2026(), r = calculateHousehold2026(source(f));
  assertEquals(r.lines.line15, 7000);
  assertEquals(r.lines.line16, 42);
  assertEquals(r.lines.line25, 1224);
  assertEquals(r.total_tax, 1266);
  assertEquals(householdGraph2026(f).f1040.line23_other_taxes, 1266);
  f.household_employment.claim.state_unemployment!.experience_rate = 0;
  f.household_employment.claim.state_unemployment!.assessed_contributions = 0;
  f.household_employment.claim.state_unemployment!.payments = [];
  assertEquals(calculateHousehold2026(source(f)).lines.line16, 42);
});
Deno.test("Household prior-year quarter establishes current FUTA-only liability below FICA threshold", () => {
  const f = householdFutaFixture2026(2000),
    e = f.household_employment.claim.employees[0];
  e.payments.push({
    record_reference: "prior",
    paid_date: "2025-06-01",
    gross_cash_wages: 1000,
    federal_income_tax_withheld: 0,
    work_state: "MA",
  });
  const r = calculateHousehold2026(source(f));
  assertEquals(r.answers, { a: false, b: false, c: true, line9: undefined });
  assertEquals(r.lines.line1, undefined);
  assertEquals(r.lines.line25, 0);
  assertEquals(r.total_tax, 12);
});
Deno.test("Household W-4 withholding is employer liability, including excluded family payroll", () => {
  const f = householdFixture2026(2000),
    e = f.household_employment.claim.employees[0];
  e.relationship = "child";
  e.birth_date = "2010-02-01";
  e.w4_agreement_reference = "w4";
  e.payments[0].federal_income_tax_withheld = 123.6;
  e.w2!.box2_withheld = 123.6;
  const r = calculateHousehold2026(source(f));
  assertEquals(r.answers, { a: false, b: true, c: undefined, line9: false });
  assertEquals(r.lines.line1, undefined);
  assertEquals(r.lines.line7, 124);
  assertEquals(r.total_tax, 124);
  const p = householdGraph2026(f);
  assertEquals(p.f1040.line23_other_taxes, 124);
  assertEquals(p.f1040.line25a_w2_withheld, 30000);
});
Deno.test("Household thresholds use cents before filed rounding and cap each worker independently", () => {
  const f = householdFixture2026(2999.96);
  assertEquals(calculateHousehold2026(source(f)).file_schedule_h, false);
  const r = calculateHousehold2026(source(householdFixture2026(3000)));
  assertEquals(r.total_tax, 459);
  const large = householdFutaFixture2026(210000),
    e = householdEmployee2026(190000);
  e.employee_tin = "333445555";
  e.record_reference = "second";
  e.w2!.record_reference = "second-w2";
  e.w2!.employee_tin = e.employee_tin;
  e.payments.forEach((p) => p.record_reference += "-second");
  large.household_employment.claim.employees.push(e);
  const st = large.household_employment.claim.state_unemployment!;
  st.assessed_contributions = 600;
  st.payments[0].amount = 600;
  const capped = calculateHousehold2026(source(large));
  assertEquals(capped.lines.line1, 369000);
  assertEquals(capped.lines.line3, 400000);
  assertEquals(capped.lines.line5, 10000);
  assertEquals(capped.lines.line6, 90);
  assertEquals(capped.lines.line15, 14000);
});
Deno.test("Household unrelated student minors remain FUTA workers but do not owe FICA", () => {
  const f = householdFutaFixture2026(),
    e = f.household_employment.claim.employees[0];
  e.birth_date = "2009-04-01";
  e.minor_review = {
    record_reference: "school",
    student: true,
    household_work_principal_occupation: false,
  };
  e.w2!.box3_ss_wages = 0;
  e.w2!.box5_medicare_wages = 0;
  const r = calculateHousehold2026(source(f));
  assertEquals(r.lines.line25, 0);
  assertEquals(r.total_tax, 42);
  e.minor_review.student = false;
  e.minor_review.household_work_principal_occupation = true;
  e.w2!.box3_ss_wages = 8000;
  e.w2!.box5_medicare_wages = 8000;
  assertEquals(calculateHousehold2026(source(f)).total_tax, 1266);
});
Deno.test("Household source rejects duplicate payments, unmatched W-2s, withholding and incomplete state evidence", () => {
  for (
    const mutate of [
      (f: ReturnType<typeof householdFutaFixture2026>) =>
        f.household_employment.claim.employees[0].payments.push(
          f.household_employment.claim.employees[0].payments[0],
        ),
      (f: ReturnType<typeof householdFutaFixture2026>) =>
        f.household_employment.claim.employees[0].w2!.box3_ss_wages = 1,
      (f: ReturnType<typeof householdFutaFixture2026>) =>
        f.household_employment.claim.employees[0].payments[0]
          .federal_income_tax_withheld = 100,
      (f: ReturnType<typeof householdFutaFixture2026>) =>
        f.household_employment.claim.state_unemployment!.payments[0].paid_date =
          "2027-04-16",
      (f: ReturnType<typeof householdFutaFixture2026>) =>
        f.household_employment.claim.state_unemployment!.state = "CA",
      (f: ReturnType<typeof householdFutaFixture2026>) =>
        f.household_employment.claim.state_unemployment!
          .assessed_contributions = 1,
    ]
  ) {
    const f = householdFutaFixture2026();
    mutate(f);
    assertThrows(() => calculateHousehold2026(source(f)));
  }
});
Deno.test("Household ownership and child age-transition cases require source reconciliation", () => {
  const raw = source();
  raw.claim.employer_tin = "555667777";
  assertThrows(() => calculateHousehold2026(raw), Error, "owner");
  const f = householdFixture2026(),
    e = f.household_employment.claim.employees[0];
  e.relationship = "child";
  e.birth_date = "2005-07-01";
  assertThrows(() => calculateHousehold2026(source(f)), Error, "turning 21");
  assert(
    calculateHousehold2026(source(householdParentFixture2026()))
      .file_schedule_h,
  );
});
Deno.test("Household spouse employers and excluded parents retain ownership without phantom FUTA", () => {
  const f = householdFixture2026(), raw = source(f);
  Object.assign(raw, { spouse_ssn: "555667777" });
  raw.claim.employer_tin = "555667777";
  raw.filing_status = FilingStatus.MFJ;
  assertEquals(calculateHousehold2026(raw).total_tax, 597);
  const e = raw.claim.employees[0];
  e.relationship = "parent";
  e.parent_review = {
    kind: "no_child_in_home",
    record_reference: "no-child",
    no_child_in_employers_home_all_service_periods: true,
  };
  e.w2!.box3_ss_wages = 0;
  e.w2!.box5_medicare_wages = 0;
  assertEquals(calculateHousehold2026(raw).file_schedule_h, false);
});
Deno.test("Household no-current-payroll and small cash payments do not create required attachments", () => {
  const f = householdFixture2026(2000),
    e = f.household_employment.claim.employees[0];
  delete e.w2;
  e.payments.forEach((p) => p.paid_date = p.paid_date.replace("2026", "2025"));
  e.payments[0].gross_cash_wages = 1000;
  const r = calculateHousehold2026(source(f));
  assertEquals(r.file_schedule_h, false);
  assertEquals(r.total_tax, 0);
});
Deno.test("Household state wages and contribution timing are independently reconciled", () => {
  const mixed = householdFutaFixture2026();
  mixed.household_employment.claim.employees[0].payments[1].work_state = "NY";
  assertThrows(() => calculateHousehold2026(source(mixed)), Error, "Multiple");
  const short = householdFutaFixture2026();
  short.household_employment.claim.state_unemployment!.payments[0].amount -=
    .01;
  assertThrows(
    () => calculateHousehold2026(source(short)),
    Error,
    "all assessed",
  );
  const mismatch = source(householdParentFixture2026());
  mismatch.filing_status = FilingStatus.MFJ;
  Object.assign(mismatch, { spouse_ssn: "555667777" });
  assertThrows(
    () => calculateHousehold2026(mismatch),
    Error,
    "circumstance conflicts",
  );
});

Deno.test("Household spouse exclusion rejects contradictory unmarried filer facts", () => {
  const f = householdFixture2026(),
    e = f.household_employment.claim.employees[0];
  e.relationship = "spouse";
  e.w2!.box3_ss_wages = 0;
  e.w2!.box5_medicare_wages = 0;
  assertThrows(
    () => calculateHousehold2026(source(f)),
    Error,
    "married filing status",
  );
});
