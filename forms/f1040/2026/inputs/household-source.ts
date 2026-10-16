import { household2026 as cfg } from "../../nodes/config/2026-household.ts";
import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { wages2026 } from "../../nodes/config/2026-wages.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import {
  computeHouseholdPartI,
  computeHouseholdSectionA,
} from "../../nodes/intermediate/forms/taxes/household-employment/schedule_h/index.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().max(1e9).refine(
  (n) => Math.abs(n * 100 - Math.round(n * 100)) < .0001,
  "Use dollars and cents",
);
const date = z.string().date();
const state = z.enum(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA PR RI SC SD TN TX UT VT VA WA WV WI WY VI"
    .split(" ") as [string, ...string[]],
);
const parentReview = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("no_child_in_home"),
    record_reference: ref,
    no_child_in_employers_home_all_service_periods: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("care_exception"),
    record_reference: ref,
    child_tin: tin,
    child_birth_date: date,
    child_lived_in_employers_home_all_year: z.literal(true),
    employer_circumstance: z.enum([
      "divorced_not_remarried",
      "widowed_not_remarried",
      "spouse_incapable",
    ]),
    circumstance_record_reference: ref,
    qualifying_circumstance_applies_all_year: z.literal(true),
    spouse_incapable_at_least_four_continuous_weeks_in_each_quarter: z
      .boolean(),
    adult_child_incapable_at_least_four_continuous_weeks_in_each_quarter: z
      .boolean(),
  }).strict(),
]);
export const householdEmployee2026Schema = z.object({
  employee_tin: tin,
  name: ref,
  record_reference: ref,
  birth_date: date,
  relationship: z.enum(["unrelated", "child", "spouse", "parent"]),
  relationship_record_reference: ref,
  household_work_under_employers_control: z.literal(true),
  ordinary_cash_wages_only: z.literal(true),
  no_employer_paid_employee_tax_or_state_disability: z.literal(true),
  relationship_unchanged_during_service_years: z.literal(true),
  minor_review: z.object({
    record_reference: ref,
    student: z.boolean(),
    household_work_principal_occupation: z.boolean(),
  }).strict().optional(),
  parent_review: parentReview.optional(),
  payments: z.array(
    z.object({
      record_reference: ref,
      paid_date: date,
      gross_cash_wages: money,
      federal_income_tax_withheld: money,
      work_state: state,
    }).strict(),
  ).min(1),
  w4_agreement_reference: ref.optional(),
  w2: z.object({
    record_reference: ref,
    tax_year: z.literal(2026),
    employer_ein: tin,
    employee_tin: tin,
    box1_wages: money,
    box2_withheld: money,
    box3_ss_wages: money,
    box5_medicare_wages: money,
  }).strict().optional(),
}).strict();
export const householdClaim2026Schema = z.object({
  claim: z.object({
    record_reference: ref,
    employer_tin: tin,
    employer_ein: tin,
    all_2025_and_2026_household_workers_and_payments_included: z.literal(true),
    no_payroll_reported_by_agent_or_on_business_employment_returns: z.literal(
      true,
    ),
    employees: z.array(householdEmployee2026Schema).min(1).max(100),
    state_unemployment: z.object({
      record_reference: ref,
      tax_year: z.literal(2026),
      state,
      all_futa_wages_subject_to_this_states_tax: z.literal(true),
      no_other_state_taxable_workers_or_wages: z.literal(true),
      wage_base: money,
      experience_rate: z.number().finite().min(0).max(1),
      rate_notice_reference: ref,
      rate_applies_all_year: z.literal(true),
      assessment_reference: ref,
      assessed_contributions: money,
      payments: z.array(
        z.object({ record_reference: ref, paid_date: date, amount: money })
          .strict(),
      ),
      all_assessments_and_payments_included: z.literal(true),
    }).strict().optional(),
  }).strict(),
}).strict();
export const householdSource2026Schema = investmentOwner2026.extend(
  householdClaim2026Schema.shape,
).strict();
export type HouseholdSource2026 = z.input<typeof householdSource2026Schema>;
const cents = (n: number) => Math.round(n * 100);
const sum = (ns: number[]) => ns.reduce((n, v) => n + cents(v), 0) / 100;
export function calculateHousehold2026(raw: HouseholdSource2026) {
  const input = householdSource2026Schema.parse(raw), claim = input.claim;
  const owners = [
    input.taxpayer_ssn,
    ...(input.filing_status === FilingStatus.MFJ && input.spouse_ssn
      ? [input.spouse_ssn]
      : []),
  ];
  if (!owners.includes(claim.employer_tin)) {
    throw new Error("Household employer must be a return owner");
  }
  const unique = (values: string[], label: string) => {
    if (new Set(values).size !== values.length) {
      throw new Error(`Household ${label} must be distinct`);
    }
  };
  unique(claim.employees.map((e) => e.employee_tin), "employees");
  unique(
    claim.employees.flatMap((e) => e.payments.map((p) => p.record_reference)),
    "payments",
  );
  unique(
    claim.employees.flatMap(
      (e) => [e.record_reference, ...(e.w2 ? [e.w2.record_reference] : [])],
    ),
    "payroll and W-2 sources",
  );
  const quarters = { 2025: [0, 0, 0, 0], 2026: [0, 0, 0, 0] };
  const rows = claim.employees.map((e) => {
    if (e.employee_tin === claim.employer_tin || e.birth_date > "2025-12-31") {
      throw new Error("Household employee identity or birth date is invalid");
    }
    if (
      e.relationship === "spouse" &&
      ![FilingStatus.MFJ, FilingStatus.MFS, FilingStatus.HOH].includes(
        input.filing_status,
      )
    ) {
      throw new Error(
        "Spouse payroll needs a consistent married filing status or dated relationship review",
      );
    }
    if (owners.includes(e.employee_tin) && e.relationship !== "spouse") {
      throw new Error("Joint household employee must be the employer's spouse");
    }
    if (
      e.relationship === "spouse" && input.filing_status === FilingStatus.MFJ &&
      !owners.includes(e.employee_tin)
    ) throw new Error("Household spouse must match joint return identity");
    if ((e.relationship === "parent") !== Boolean(e.parent_review)) {
      throw new Error("Parent payroll needs its applicable family review");
    }
    let ficaEligible = e.relationship !== "spouse",
      futaEligible = e.relationship !== "spouse" && e.relationship !== "parent";
    const current = e.payments.filter((p) => p.paid_date.startsWith("2026-"));
    for (const p of e.payments) {
      const year = Number(p.paid_date.slice(0, 4));
      if (
        year !== 2025 && year !== 2026 || p.paid_date < e.birth_date ||
        p.federal_income_tax_withheld > p.gross_cash_wages
      ) {
        throw new Error(
          "Household payment year, date or withholding is invalid",
        );
      }
      if (e.relationship === "child") {
        const before = `${year - 21}-01-01`, after = `${year - 21}-12-31`;
        if (e.birth_date > before && e.birth_date <= after) {
          throw new Error(
            "Child turning 21 needs a dated service-period allocation",
          );
        }
      }
      const eligible = e.relationship === "unrelated" ||
        e.relationship === "child" && e.birth_date <= `${year - 21}-01-01`;
      if (eligible) {
        quarters[year][Math.floor((Number(p.paid_date.slice(5, 7)) - 1) / 3)] +=
          cents(p.gross_cash_wages);
      }
    }
    if (e.relationship === "child") {
      ficaEligible = futaEligible = e.birth_date <= "2005-01-01";
    }
    if (e.relationship === "parent") {
      const p = e.parent_review!;
      ficaEligible = p.kind === "care_exception";
      if (p.kind === "care_exception") {
        const allowedStatuses = p.employer_circumstance === "spouse_incapable"
          ? [FilingStatus.MFJ, FilingStatus.MFS]
          : p.employer_circumstance === "widowed_not_remarried"
          ? [FilingStatus.Single, FilingStatus.HOH, FilingStatus.QSS]
          : [FilingStatus.Single, FilingStatus.HOH];
        if (!allowedStatuses.includes(input.filing_status)) {
          throw new Error(
            "Parent payroll circumstance conflicts with employer filing status",
          );
        }
        if (
          p.child_tin === claim.employer_tin ||
          p.child_tin === e.employee_tin || p.child_birth_date > "2026-01-01" ||
          (p.child_birth_date <= "2009-01-01" &&
            !p.adult_child_incapable_at_least_four_continuous_weeks_in_each_quarter) ||
          (p.employer_circumstance === "spouse_incapable" &&
            !p.spouse_incapable_at_least_four_continuous_weeks_in_each_quarter)
        ) {
          throw new Error(
            "Parent FICA exception needs qualifying child and employer circumstances throughout services",
          );
        }
      }
    }
    if (e.relationship === "unrelated" && e.birth_date > "2008-01-01") {
      if (!e.minor_review) {
        throw new Error(
          "Minor household employee needs education and occupation review",
        );
      }
      ficaEligible = !e.minor_review.student &&
        e.minor_review.household_work_principal_occupation;
    } else if (e.minor_review) {
      throw new Error(
        "Minor review must belong to an unrelated worker under 18 during 2026",
      );
    }
    const cash = sum(current.map((p) => p.gross_cash_wages)),
      withheld = sum(current.map((p) => p.federal_income_tax_withheld));
    const medicare = ficaEligible && cash >= cfg.ficaCashThreshold ? cash : 0,
      ss = Math.min(medicare, wages2026.ssWageBase),
      additional = Math.max(0, medicare - cfg.additionalMedicareThreshold);
    if (withheld > 0 && !e.w4_agreement_reference) {
      throw new Error("Household federal withholding needs a W-4 agreement");
    }
    if ((medicare > 0 || withheld > 0) && !e.w2) {
      throw new Error("Household taxable payroll needs its issued W-2");
    }
    if (
      e.w2 &&
      (e.w2.employer_ein !== claim.employer_ein ||
        e.w2.employee_tin !== e.employee_tin || e.w2.box1_wages !== cash ||
        e.w2.box2_withheld !== withheld || e.w2.box3_ss_wages !== ss ||
        e.w2.box5_medicare_wages !== medicare)
    ) {
      throw new Error(
        "Household W-2 must reconcile employee, employer and payroll wages",
      );
    }
    return {
      employee: e,
      cash,
      withheld,
      ss,
      medicare,
      additional,
      futa_wages: futaEligible ? Math.min(cfg.futaWageBase, cash) : 0,
    };
  });
  const quarterDollars = {
    2025: quarters[2025].map((n) => n / 100),
    2026: quarters[2026].map((n) => n / 100),
  };
  const futa = rows.some((r) => r.cash > 0) &&
      Object.values(quarters).flat().some((n) =>
        n >= cents(cfg.futaQuarterThreshold)
      ),
    a = rows.some((r) => r.medicare > 0),
    b = rows.some((r) => r.withheld > 0);
  const taxableFuta = sum(rows.map((r) => r.futa_wages));
  const stateReview = claim.state_unemployment;
  if (!futa && stateReview) {
    throw new Error(
      "State unemployment review needs federal quarterly liability",
    );
  }
  let contributions = 0;
  if (futa) {
    if (!stateReview) {
      throw new Error(
        "Household quarterly wages require state unemployment review",
      );
    }
    if (cfg.unresolvedCreditReductionStates.includes(stateReview.state)) {
      throw new Error(
        "2026 credit-reduction rates remain placeholders; Schedule H Section B needs final authority",
      );
    }
    if (stateReview.wage_base < cfg.futaWageBase) {
      throw new Error("State wage base below FUTA cap requires Section B");
    }
    if (
      rows.some((r) =>
        r.employee.payments.some((p) =>
          p.paid_date.startsWith("2026-") && p.gross_cash_wages > 0 &&
          p.work_state !== stateReview.state
        )
      )
    ) throw new Error("Multiple household employment states require Section B");
    const stateWages = sum(
      rows.map((r) =>
        r.futa_wages > 0 ? Math.min(r.cash, stateReview.wage_base) : 0
      ),
    );
    const expected =
      Math.round(stateWages * stateReview.experience_rate * 100) / 100;
    if (cents(expected) !== cents(stateReview.assessed_contributions)) {
      throw new Error(
        "State unemployment assessment must reconcile wage base and annual rate",
      );
    }
    unique(
      stateReview.payments.map((p) => p.record_reference),
      "state contributions",
    );
    if (
      stateReview.payments.some((p) =>
        p.paid_date < "2026-01-01" || p.paid_date > cfg.stateContributionDueDate
      )
    ) throw new Error("Late state contributions require Section B");
    contributions = sum(stateReview.payments.map((p) => p.amount));
    if (cents(contributions) !== cents(expected)) {
      throw new Error(
        "Section A requires all assessed state contributions paid on time",
      );
    }
  }
  const wages = {
    ss_wages: sum(rows.map((r) => r.ss)),
    medicare_wages: sum(rows.map((r) => r.medicare)),
    additional_medicare_wages: sum(rows.map((r) => r.additional)),
    federal_income_tax_withheld: sum(rows.map((r) => r.withheld)),
  };
  const partI = computeHouseholdPartI(wages),
    futaTax = futa ? computeHouseholdSectionA(taxableFuta) : 0;
  const lines: Record<string, number> = {};
  if (a) {
    Object.assign(lines, {
      line1: roundWholeDollars(wages.ss_wages),
      line2: partI.socialSecurityTax,
      line3: roundWholeDollars(wages.medicare_wages),
      line4: partI.medicareTax,
      line5: roundWholeDollars(wages.additional_medicare_wages),
      line6: partI.additionalMedicareTax,
    });
  }
  if (a || b) {
    Object.assign(lines, {
      line7: roundWholeDollars(wages.federal_income_tax_withheld),
      line8: partI.ficaAndWithholding,
    });
  }
  if (futa) {
    Object.assign(lines, {
      line14: roundWholeDollars(contributions),
      line15: roundWholeDollars(taxableFuta),
      line16: futaTax,
      line25: a || b ? partI.ficaAndWithholding : 0,
      line26: partI.ficaAndWithholding + futaTax,
    });
  }
  return {
    source_input: input,
    rows,
    quarterDollars,
    wages,
    partI,
    futaTax,
    lines,
    answers: {
      a,
      b: !a ? b : undefined,
      c: !a && !b ? futa : undefined,
      line9: a || b ? futa : undefined,
    },
    file_schedule_h: a || b || futa,
    total_tax: partI.ficaAndWithholding + futaTax,
  };
}
