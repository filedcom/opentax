import { assertEquals } from "@std/assert";
import { calculateForm8994, f8994, inputSchema } from "./index.ts";
import { form8994DirectEmployer } from "./fixture.ts";

Deno.test("Form 8994 direct employer computes reviewed 75% and 100% leave rates", () => {
  const lines = calculateForm8994(form8994DirectEmployer);
  assertEquals(lines.employeeCredits.map((row) => row.applicable_rate), [
    0.1875,
    0.25,
  ]);
  assertEquals(lines.employeeCredits.map((row) => row.credit), [450, 800]);
  assertEquals([lines.line1, lines.line2, lines.line3], [1_250, 0, 1_250]);
  assertEquals(
    f8994.compute({ taxYear: 2025, formType: "f1040" }, form8994DirectEmployer)
      .outputs,
    [],
  );
});

Deno.test("Form 8994 rejects unsupported or tampered policy and payroll facts", () => {
  const [employee] = form8994DirectEmployer.employees;
  for (
    const candidate of [
      { ...form8994DirectEmployer, employees: [] },
      { ...form8994DirectEmployer, full_time_annual_leave_weeks: 1 },
      { ...form8994DirectEmployer, policy_effective_date: "2025-05-01" },
      { ...form8994DirectEmployer, no_pass_through_credit_confirmed: false },
      {
        ...form8994DirectEmployer,
        employees: [{ ...employee, prior_2024_compensation: 93_001 }],
      },
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
