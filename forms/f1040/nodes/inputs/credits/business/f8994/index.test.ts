import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import {
  assertForm8994ReturnYear,
  calculateForm8994,
  f8994,
  inputSchema,
} from "./index.ts";
import { form8994DirectEmployer } from "./fixture.ts";

test("Form 8994 direct employer computes reviewed 75% and 100% leave rates", () => {
  const lines = calculateForm8994(form8994DirectEmployer);
  assertEquals(lines.employeeCredits.map((row) => row.applicable_rate), [
    0.1875,
    0.25,
  ]);
  assertEquals(lines.employeeCredits.map((row) => row.credit), [450, 800]);
  assertEquals([lines.line1, lines.line2, lines.line3], [1_250, 0, 1_250]);
  assertEquals(
    f8994.compute({ taxYear: 2025, formType: "f1040" }, form8994DirectEmployer)
      .outputs[0].fields.f8994_direct_employer_credit,
    {
      credit_amount: 1_250,
      schedule_c_business_reference: "boise-design-2025",
      schedule_c_wage_ledger_reference: "2025-boise-design-payroll",
      subject_to_passive_activity_limit: false,
    },
  );
});

test("Form 8994 rejects unsupported or tampered policy and payroll facts", () => {
  const [employee] = form8994DirectEmployer.employees;
  for (
    const candidate of [
      { ...form8994DirectEmployer, reviewed_evidence: undefined },
      { ...form8994DirectEmployer, employees: [] },
      { ...form8994DirectEmployer, full_time_annual_leave_weeks: 1 },
      { ...form8994DirectEmployer, policy_effective_date: "2025-05-01" },
      { ...form8994DirectEmployer, no_pass_through_credit_confirmed: false },
      {
        ...form8994DirectEmployer,
        employees: [{ ...employee, leave_weeks: 13 }],
      },
      {
        ...form8994DirectEmployer,
        employees: [{
          ...employee,
          employer_paid_qualifying_leave_wages: 2_500,
        }],
      },
      {
        ...form8994DirectEmployer,
        employees: [{
          ...employee,
          no_other_general_business_credit_wage_overlap_confirmed: false,
        }],
      },
      { ...form8994DirectEmployer, employees: [employee, employee] },
    ]
  ) {
    assertEquals(inputSchema.safeParse(candidate).success, false);
  }
});

// Instructions for Form 8994 (Rev. December 2024), Compensation Limit Per
// Year: $93,000 for 2025 and $96,000 for 2026. IRC §45S(d)(1) as amended by
// P.L. 119-21 §70304(a)(4): customarily at least 20 hours a week after 2025.
test("Form 8994 applies the return year's qualifying-employee rules", () => {
  const [employee] = form8994DirectEmployer.employees;
  const in2026 = {
    ...employee,
    leave_start_date: "2026-04-01",
    leave_end_date: "2026-04-14",
  };
  const compute = (
    taxYear: number,
    employees: typeof form8994DirectEmployer.employees,
  ) =>
    f8994.compute({ taxYear, formType: "f1040" }, {
      ...form8994DirectEmployer,
      employees,
    });
  assertThrows(
    () => compute(2025, [{ ...employee, prior_year_compensation: 93_001 }]),
    Error,
    "exceeds $93000",
  );
  assertThrows(
    () => compute(2025, [in2026]),
    Error,
    "only leave taken in 2025",
  );
  assertEquals(
    compute(2026, [{ ...in2026, prior_year_compensation: 96_000 }])
      .outputs[0].fields.f8994_direct_employer_credit,
    {
      credit_amount: 450,
      schedule_c_business_reference: "boise-design-2025",
      schedule_c_wage_ledger_reference: "2025-boise-design-payroll",
      subject_to_passive_activity_limit: false,
    },
  );
  assertThrows(
    () => compute(2026, [{ ...in2026, prior_year_compensation: 96_001 }]),
    Error,
    "exceeds $96000",
  );
  const partTime = {
    ...form8994DirectEmployer,
    employees: [{ ...in2026, usual_weekly_hours: 15 }],
  };
  assertThrows(
    () => assertForm8994ReturnYear(partTime, 2026),
    Error,
    "at least 20 hours a week",
  );
  assertForm8994ReturnYear(
    {
      ...partTime,
      employees: [{ ...employee, usual_weekly_hours: 15 }],
    },
    2025,
  );
});
