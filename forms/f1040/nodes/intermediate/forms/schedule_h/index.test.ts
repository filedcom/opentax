import { assertEquals, assertThrows } from "@std/assert";
import { schedule_h } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return schedule_h.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

const studentMinorFuta = {
  employer_ein: "123456789",
  cash_wages_over_2025_limit: false,
  cash_wages_over_quarter_limit: true,
  ss_wages: 0,
  medicare_wages: 0,
  federal_income_tax_withheld: 0,
  federal_unemployment: {
    paid_only_one_state: true,
    all_contributions_paid_on_time: true,
    all_futa_wages_state_taxable: true,
    state: "OH",
    contributions_paid: 40,
    taxable_wages: 4_000,
    all_household_employees_included: true,
    prior_year_quarter_threshold_met: false,
    employee_wages: [{
      employee_id: "student-worker",
      payroll_source_reference: "2025-student-payroll",
      relationship: "unrelated",
      age_18_or_older_for_fica: false,
      student_minor_fica_exclusion: {
        birth_date: "2008-05-10",
        birth_date_source_reference: "student-age-record",
        student_enrollment_source_reference: "2025-school-enrollment",
        student_during_2025_verified: true,
      },
      ordinary_cash_only: true,
      annual_cash_wages: 4_000,
      quarterly_cash_wages: [1_000, 1_000, 1_000, 1_000],
    }],
  },
};

const nonstudentMinorFuta = {
  ...studentMinorFuta,
  cash_wages_over_2025_limit: true,
  ss_wages: 4_000,
  medicare_wages: 4_000,
  federal_unemployment: {
    ...studentMinorFuta.federal_unemployment,
    employee_wages: [{
      employee_id: "working-minor",
      payroll_source_reference: "2025-working-minor-payroll",
      relationship: "unrelated",
      age_18_or_older_for_fica: false,
      nonstudent_minor_fica_inclusion: {
        birth_date: "2008-05-10",
        birth_date_source_reference: "working-minor-age-record",
        education_status_source_reference: "2025-nonenrollment-record",
        principal_occupation_source_reference: "2025-household-work-record",
        not_a_student_during_2025_verified: true,
        household_services_principal_occupation_verified: true,
      },
      ordinary_cash_only: true,
      annual_cash_wages: 4_000,
      quarterly_cash_wages: [1_000, 1_000, 1_000, 1_000],
      w2: {
        source_reference: "2025-working-minor-w2",
        box2_federal_income_tax_withheld: 0,
        box3_social_security_wages: 4_000,
        box5_medicare_wages: 4_000,
      },
    }],
  },
};

Deno.test("Schedule H unrelated nonstudent minor's principal household work owes FICA and FUTA", () => {
  assertEquals(
    findOutput(compute(nonstudentMinorFuta), "schedule2")?.fields
      .line9_household_employment,
    636,
  );
  assertThrows(
    () =>
      compute({
        ...nonstudentMinorFuta,
        federal_unemployment: {
          ...nonstudentMinorFuta.federal_unemployment,
          employee_wages: [{
            ...nonstudentMinorFuta.federal_unemployment.employee_wages[0],
            nonstudent_minor_fica_inclusion: {
              ...nonstudentMinorFuta.federal_unemployment.employee_wages[0]
                .nonstudent_minor_fica_inclusion,
              principal_occupation_source_reference:
                "2025-working-minor-payroll",
            },
          }],
        },
      }),
    Error,
    "distinct age, education, occupation, and payroll",
  );
  assertThrows(
    () =>
      compute({
        ...nonstudentMinorFuta,
        cash_wages_over_2025_limit: false,
      }),
    Error,
    "line A differs",
  );
});

Deno.test("Schedule H unrelated student minor owes FUTA without FICA", () => {
  assertEquals(
    findOutput(compute(studentMinorFuta), "schedule2")?.fields
      .line9_household_employment,
    24,
  );
  assertThrows(
    () =>
      compute({
        ...studentMinorFuta,
        cash_wages_over_2025_limit: true,
      }),
    Error,
    "line A differs",
  );
  assertThrows(
    () =>
      compute({
        ...studentMinorFuta,
        federal_unemployment: {
          ...studentMinorFuta.federal_unemployment,
          employee_wages: [{
            ...studentMinorFuta.federal_unemployment.employee_wages[0],
            student_minor_fica_exclusion: {
              ...studentMinorFuta.federal_unemployment.employee_wages[0]
                .student_minor_fica_exclusion,
              birth_date: "2007-01-01",
            },
          }],
        },
      }),
    Error,
    "proving under 18",
  );
});

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero wages → no tax", () => {
  const result = compute({ ss_wages: 0, medicare_wages: 0 });
  assertEquals(result.outputs.length, 0);
});

// ─── Explicit taxable wage lines ────────────────────────────────────────────

Deno.test("total payroll alone cannot determine each employee's FICA wages", () => {
  assertThrows(
    () => compute({ total_cash_wages: 2_000 }),
    Error,
    "Unrecognized key",
  );
});

Deno.test("2,800 of already-taxable wages produces the form-line tax", () => {
  // Employer SS: $2,800 × 6.2% = $173.60
  // Employer Medicare: $2,800 × 1.45% = $40.60
  // Employee SS: $2,800 × 6.2% = $173.60
  // Employee Medicare: $2,800 × 1.45% = $40.60
  // Total FICA: $428.40 → rounded to $428
  const result = compute({ ss_wages: 2_800, medicare_wages: 2_800 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 428);
});

Deno.test("10,000 of already-taxable wages produces the full combined tax", () => {
  // Full FICA: 15.3% × $10,000 = $1,530.
  const result = compute({ ss_wages: 10_000, medicare_wages: 10_000 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 1_530);
});

// ─── FICA Tax Computation ─────────────────────────────────────────────────────

Deno.test("ambiguous aggregate FICA wages require both taxable wage lines", () => {
  assertThrows(
    () => compute({ fica_wages: 10_000 }),
    Error,
    "Unrecognized key",
  );
});

Deno.test("explicit ss_wages and medicare_wages — computed separately", () => {
  // SS wages $10,000, Medicare wages $10,000
  // Same as above: $1,530
  const result = compute({
    ss_wages: 10_000,
    medicare_wages: 10_000,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 1_530);
});

Deno.test("aggregate taxable SS wages from multiple employees are not capped again", () => {
  // Each employee's wage base has already been applied to the line 1 input.
  // Medicare employer+employee: $200,000 × 2.9% = $5,800
  // Total: $24,800 + $5,800 = $30,600.
  const result = compute({
    ss_wages: 200_000,
    medicare_wages: 200_000,
  });
  const s2 = findOutput(result, "schedule2");
  const tax = s2?.fields.line9_household_employment as number;
  assertEquals(tax, 30_600);
});

Deno.test("Additional Medicare Tax applies only to sourced per-employee excess wages", () => {
  const result = compute({
    ss_wages: 176_100,
    medicare_wages: 220_000,
    additional_medicare_wages: 20_000,
  });
  assertEquals(
    findOutput(result, "schedule2")?.fields.line9_household_employment,
    28_396,
  );
  const noExcess = compute({
    ss_wages: 352_200,
    medicare_wages: 400_000,
    additional_medicare_wages: 0,
  });
  assertEquals(
    findOutput(noExcess, "schedule2")?.fields.line9_household_employment,
    55_273,
  );
  assertThrows(
    () =>
      compute({
        ss_wages: 176_100,
        medicare_wages: 220_000,
        additional_medicare_wages: 220_001,
      }),
    Error,
    "sufficient Medicare wage amount",
  );
});

// ─── Federal Income Tax Withheld ─────────────────────────────────────────────

Deno.test("federal income tax withheld adds to total", () => {
  // $10,000 FICA wages → $1,530 FICA + $1,000 federal withheld = $2,530
  const result = compute({
    ss_wages: 10_000,
    medicare_wages: 10_000,
    federal_income_tax_withheld: 1_000,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 2_530);
});

Deno.test("one-worker FICA-only payroll reaches Schedule 2 without FUTA", () => {
  const source = {
    cash_wages_over_2025_limit: true,
    cash_wages_over_quarter_limit: false,
    ss_wages: 3_100,
    medicare_wages: 3_100,
    fica_only_payroll: {
      all_household_employees_included: true,
      prior_year_payroll_source_reference: "2024-synthetic-payroll-review",
      prior_year_quarter_cash_wages: [0, 0, 0, 0],
      employee_wages: [{
        employee_id: "synthetic-worker-1",
        payroll_source_reference: "2025-synthetic-payroll-review",
        relationship: "unrelated",
        age_18_or_older_for_fica: true,
        ordinary_cash_only: true,
        annual_cash_wages: 3_100,
        quarterly_cash_wages: [775, 775, 775, 775],
        w2: {
          source_reference: "2025-synthetic-household-w2",
          box2_federal_income_tax_withheld: 0,
          box3_social_security_wages: 3_100,
          box5_medicare_wages: 3_100,
        },
      }],
    },
  };
  assertEquals(
    findOutput(compute(source), "schedule2")?.fields.line9_household_employment,
    474,
  );
  assertThrows(
    () =>
      compute({
        ...source,
        fica_only_payroll: {
          ...source.fica_only_payroll,
          employee_wages: [{
            ...source.fica_only_payroll.employee_wages[0],
            quarterly_cash_wages: [1_000, 700, 700, 700],
          }],
        },
      }),
    Error,
    "below the FUTA quarter threshold",
  );
});

// ─── FUTA ─────────────────────────────────────────────────────────────────────

Deno.test("single-state Section A FUTA is 0.6% of taxable wages", () => {
  // $10,000 FICA wages plus $7,000 taxable FUTA wages.
  const result = compute({
    ss_wages: 10_000,
    medicare_wages: 10_000,
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: true,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      state: "OH",
      contributions_paid: 100,
      taxable_wages: 7_000,
      all_household_employees_included: true,
      prior_year_quarter_threshold_met: false,
      employee_wages: [{
        employee_id: "worker-1",
        payroll_source_reference: "2025-household-payroll-1",
        relationship: "unrelated",
        annual_cash_wages: 10_000,
        age_18_or_older_for_fica: true,
        ordinary_cash_only: true,
        quarterly_cash_wages: [10_000, 0, 0, 0],
        w2: {
          source_reference: "2025-w2-worker",
          box2_federal_income_tax_withheld: 0,
          box3_social_security_wages: 10_000,
          box5_medicare_wages: 10_000,
        },
      }],
    },
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 1_572);
});

Deno.test("Section B FUTA routes the credit-reduced tax to Schedule 2", () => {
  const result = compute({
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: false,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      taxable_futa_wages: 7_000,
      all_household_employees_included: true,
      prior_year_quarter_threshold_met: false,
      employee_wages: [2_500, 2_500, 2_000].map((annual_cash_wages, index) => ({
        employee_id: `worker-${index + 1}`,
        payroll_source_reference: `2025-household-payroll-${index + 1}`,
        relationship: "unrelated" as const,
        annual_cash_wages,
        age_18_or_older_for_fica: true as const,
        ordinary_cash_only: true as const,
        quarterly_cash_wages: [annual_cash_wages, 0, 0, 0] as [
          number,
          number,
          number,
          number,
        ],
      })),
      state_rows: [{
        state: "CA",
        taxable_state_wages: 7_000,
        experience_rate: 0.05,
        rate_period_from: "2025-01-01",
        rate_period_to: "2025-12-31",
        contributions_paid_by_due_date: 350,
      }],
      credit_reduction_wages: [{ state: "CA", taxable_futa_wages: 7_000 }],
    },
  });
  assertEquals(
    findOutput(result, "schedule2")?.fields.line9_household_employment,
    126,
  );
});

// ─── Explicit Withholding Amounts ────────────────────────────────────────────

Deno.test("employee withholding fields cannot override Schedule H tax", () => {
  assertThrows(
    () =>
      compute({
        ss_wages: 10_000,
        medicare_wages: 10_000,
        employee_ss_withheld: 500,
        employee_medicare_withheld: 100,
      }),
    Error,
    "employee_ss_withheld",
  );
});

// ─── Combined Scenario ────────────────────────────────────────────────────────

Deno.test("combined: FICA + federal withholding + Section A FUTA", () => {
  // FICA wages $20,000:
  // Employer+Employee SS: $20,000 × 12.4% = $2,480
  // Employer+Employee Medicare: $20,000 × 2.9% = $580
  // Federal withheld: $2,000
  // FUTA: $7,000 × 0.6% = $42
  // Total: $2,480 + $580 + $2,000 + $42 = $5,102
  const result = compute({
    ss_wages: 20_000,
    medicare_wages: 20_000,
    federal_income_tax_withheld: 2_000,
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: true,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      state: "OH",
      contributions_paid: 100,
      taxable_wages: 7_000,
      all_household_employees_included: true,
      prior_year_quarter_threshold_met: false,
      employee_wages: [{
        employee_id: "worker-1",
        payroll_source_reference: "2025-household-payroll-1",
        relationship: "unrelated",
        annual_cash_wages: 20_000,
        age_18_or_older_for_fica: true,
        ordinary_cash_only: true,
        quarterly_cash_wages: [20_000, 0, 0, 0],
        w2: {
          source_reference: "2025-w2-worker",
          box2_federal_income_tax_withheld: 2_000,
          box3_social_security_wages: 20_000,
          box5_medicare_wages: 20_000,
        },
      }],
    },
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 5_102);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule2 line9_household_employment", () => {
  // $5,000 FICA wages → 15.3% = $765
  const result = compute({ ss_wages: 5_000, medicare_wages: 5_000 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 765);
});

Deno.test("FUTA payroll applies the $7,000 cap separately to each sourced employee", () => {
  const unemployment = {
    paid_only_one_state: true,
    all_contributions_paid_on_time: true,
    all_futa_wages_state_taxable: true,
    state: "OH",
    contributions_paid: 100,
    taxable_wages: 10_000,
    all_household_employees_included: true,
    prior_year_quarter_threshold_met: false,
    employee_wages: [
      {
        employee_id: "worker-1",
        payroll_source_reference: "payroll-1",
        relationship: "unrelated",
        annual_cash_wages: 9_000,
        age_18_or_older_for_fica: true,
        ordinary_cash_only: true,
        quarterly_cash_wages: [9_000, 0, 0, 0],
        w2: {
          source_reference: "2025-w2-worker",
          box2_federal_income_tax_withheld: 0,
          box3_social_security_wages: 9_000,
          box5_medicare_wages: 9_000,
        },
      },
      {
        employee_id: "worker-2",
        payroll_source_reference: "payroll-2",
        relationship: "unrelated",
        annual_cash_wages: 3_000,
        age_18_or_older_for_fica: true,
        ordinary_cash_only: true,
        quarterly_cash_wages: [3_000, 0, 0, 0],
        w2: {
          source_reference: "2025-w2-worker-2",
          box2_federal_income_tax_withheld: 0,
          box3_social_security_wages: 3_000,
          box5_medicare_wages: 3_000,
        },
      },
    ],
  };
  assertEquals(
    findOutput(
      compute({
        ss_wages: 12_000,
        medicare_wages: 12_000,
        cash_wages_over_quarter_limit: true,
        federal_unemployment: unemployment,
      }),
      "schedule2",
    )?.fields.line9_household_employment,
    1_896,
  );
  assertThrows(
    () =>
      compute({
        ss_wages: 12_000,
        medicare_wages: 12_000,
        cash_wages_over_quarter_limit: true,
        federal_unemployment: { ...unemployment, taxable_wages: 12_000 },
      }),
    Error,
    "differ from per-employee payroll",
  );
  assertThrows(
    () =>
      compute({
        ss_wages: 12_000,
        medicare_wages: 12_000,
        cash_wages_over_quarter_limit: true,
        federal_unemployment: {
          ...unemployment,
          employee_wages: [
            unemployment.employee_wages[0],
            unemployment.employee_wages[0],
          ],
        },
      }),
    Error,
    "payroll IDs must be unique",
  );
  assertThrows(
    () =>
      compute({
        ss_wages: 12_000,
        medicare_wages: 12_000,
        cash_wages_over_quarter_limit: true,
        federal_unemployment: {
          ...unemployment,
          employee_wages: [{
            ...unemployment.employee_wages[0],
            quarterly_cash_wages: [8_000, 0, 0, 0],
          }, unemployment.employee_wages[1]],
        },
      }),
    Error,
    "quarterly cash wages differ",
  );
  assertThrows(
    () =>
      compute({
        ss_wages: 12_000,
        medicare_wages: 12_000,
        cash_wages_over_quarter_limit: true,
        federal_unemployment: {
          ...unemployment,
          employee_wages: [{
            ...unemployment.employee_wages[0],
            w2: {
              ...unemployment.employee_wages[0].w2,
              box3_social_security_wages: 8_000,
            },
          }, unemployment.employee_wages[1]],
        },
      }),
    Error,
    "Form W-2 FICA wages differ",
  );
});

Deno.test("FUTA quarter test accepts a documented prior-year threshold only when current quarters are below $1,000", () => {
  const federal_unemployment = {
    paid_only_one_state: true,
    all_contributions_paid_on_time: true,
    all_futa_wages_state_taxable: true,
    state: "OH",
    zero_experience_rate: true,
    taxable_wages: 900,
    all_household_employees_included: true,
    prior_year_quarter_threshold_met: false,
    employee_wages: [{
      employee_id: "worker-1",
      payroll_source_reference: "payroll-2025-1",
      relationship: "unrelated",
      age_18_or_older_for_fica: true,
      ordinary_cash_only: true,
      annual_cash_wages: 900,
      quarterly_cash_wages: [225, 225, 225, 225],
    }],
  };
  assertThrows(
    () =>
      compute({ cash_wages_over_quarter_limit: true, federal_unemployment }),
    Error,
    "$1,000 current- or prior-year quarter",
  );
  assertEquals(
    findOutput(
      compute({
        cash_wages_over_quarter_limit: true,
        federal_unemployment: {
          ...federal_unemployment,
          prior_year_quarter_threshold_met: true,
          prior_year_quarter_source_reference: "payroll-2024-q4",
        },
      }),
      "schedule2",
    )?.fields.line9_household_employment,
    5,
  );
});
