import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { TS } from "../../types.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { scheduleC as schedule_c } from "../schedule_c/index.ts";
import { schedule_f } from "../../intermediate/forms/schedule_f/index.ts";
import { f3800 } from "../f3800/index.ts";
import {
  coverageTierSchema,
  coveredDependentSchema,
  employeeTaxYearPremium,
  enrollmentMonthCount,
  enrollmentPeriodSchema,
  shopReviewSchema,
  verifyForm8941ShopReview,
} from "./shop_evidence.ts";

import {
  arrangementWorksheet,
  cents,
  monthlyArrangementSchema,
  premiumMoney,
} from "./arrangements.ts";

import { multiplePlanFields, multiplePlanWorksheet } from "./multiple_plans.ts";

const amount = z.number().int().finite().nonnegative();
const employeeSchema = z.object({
  employee_ssn: z.string().regex(/^\d{9}$/),
  employee_reference: z.string().trim().min(1),
  hours_of_service: z.number().int().min(1).max(2080),
  social_security_medicare_wages: z.number().int().positive(),
  employer_premium_paid: z.number().int().positive(),
  irs_2025_rating_area_average_premium: z.number().int().positive(),
  rating_area_county: z.string().trim().min(1),
  rating_area_state: z.string().regex(/^[A-Z]{2}$/),
  enrollment_and_payroll_record_reference: z.string().trim().min(1),
}).strict();

const sourceSchema = z.object({
  owner_name: z.string().trim().min(1).max(35),
  owner_ssn: z.string().regex(/^\d{9}$/),
  proprietor_recipient: z.nativeEnum(TS),
  schedule_c_business_reference: z.string().trim().min(1),
  employment_ein: z.string().regex(/^\d{9}$/),
  payroll_ledger_reference: z.string().trim().min(1),
  shop_marketplace_identifier: z.string().trim().min(1).max(100),
  shop_plan_reference: z.string().trim().min(1),
  all_nonexcluded_employees_enrolled_verified: z.literal(true),
  excluded_owner_family_seasonal_and_nonbusiness_workers_none_verified: z
    .literal(true),
  no_other_trades_or_common_control_verified: z.literal(true),
  no_state_premium_subsidy_or_credit_verified: z.literal(true),
  no_pre_2024_positive_form8941_claim_or_predecessor_verified: z.literal(true),
  credit_period_first_year: z.union([z.literal(2024), z.literal(2025)]),
  first_year_filed_form8941: z.object({
    filed_2024_return_reference: z.string().trim().min(1),
    shop_line_a_yes_verified: z.literal(true),
    positive_line12_credit: z.number().int().positive(),
  }).strict().optional(),
  other_schedule_c_employee_benefits: amount,
  shop_review: shopReviewSchema,
}).strict();

const legacySourceSchema = sourceSchema.extend({
  uniform_employer_contribution_basis_points: z.number().int().min(5000).max(
    10000,
  ),
});

const multiplePlanSourceSchema = sourceSchema.omit({
  all_nonexcluded_employees_enrolled_verified: true,
  excluded_owner_family_seasonal_and_nonbusiness_workers_none_verified: true,
  shop_review: true,
}).extend({
  ...multiplePlanFields,
  excluded_owner_family_seasonal_and_nonbusiness_workers_none_verified: z
    .boolean(),
}).strict();
const farmPlanSourceSchema = multiplePlanSourceSchema.omit({
  schedule_c_business_reference: true,
  other_schedule_c_employee_benefits: true,
}).extend({
  schedule_f_farm_id: z.string().trim().min(1),
  other_schedule_f_employee_benefits: amount,
  cash_schedule_f_shop_employer_confirmed: z.literal(true),
  farm_ownership_source_reference: z.string().trim().min(1),
  farming_activity_source_reference: z.string().trim().min(1),
  farm_issued_receipt_references: z.tuple([
    z.string().trim().min(1),
    z.string().trim().min(1),
  ]),
}).strict();

const commonControlMemberSchema = multiplePlanSourceSchema.extend({
  no_other_trades_or_common_control_verified: z.literal(false),
});
const mixedFarmControlMemberSchema = farmPlanSourceSchema.extend({
  no_other_trades_or_common_control_verified: z.literal(false),
});
const groupReference = z.string().trim().min(1);
const controlRecordSchema = z.object({
  business_reference: groupReference,
  proprietor_ssn: sourceSchema.shape.owner_ssn,
  ownership_percentage: z.literal(100),
  ownership_from_date: z.literal("2025-01-01"),
  ownership_through_date: z.literal("2025-12-31"),
  management_role: z.literal("sole_proprietor_manager"),
  ownership_record_reference: groupReference,
  management_record_reference: groupReference,
}).strict();
const commonControlSchema = z.object({
  qualifying_arrangement: z.literal("same_proprietor_common_control"),
  owner_name: sourceSchema.shape.owner_name,
  owner_ssn: sourceSchema.shape.owner_ssn,
  proprietor_recipient: z.literal(TS.T),
  schedule_c_business_reference: groupReference,
  employment_ein: sourceSchema.shape.employment_ein,
  shop_marketplace_identifier: sourceSchema.shape.shop_marketplace_identifier,
  shop_plan_reference: groupReference,
  group_review: z.object({
    tax_year: z.literal(2025),
    common_owner_100_percent_verified: z.literal(true),
    both_businesses_under_common_management_verified: z.literal(true)
      .optional(),
    all_businesses_under_common_management_verified: z.literal(true)
      .optional(),
    all_controlled_trades_and_workers_identified_verified: z.literal(true),
    all_group_members_follow_same_shop_contribution_schedule_verified: z
      .literal(
        true,
      ),
    ownership_record_reference: groupReference,
    management_record_reference: groupReference,
    complete_group_roster_record_reference: groupReference,
    group_contribution_schedule_record_reference: groupReference,
  }).strict(),
  member_control_records: z.array(controlRecordSchema).min(2).max(12),
  group_members: z.array(commonControlMemberSchema).min(2).max(12),
}).strict();
const mixedCommonControlSchema = commonControlSchema.extend({
  qualifying_arrangement: z.literal("same_proprietor_mixed_c_f_common_control"),
  group_members: z.tuple([
    commonControlMemberSchema,
    mixedFarmControlMemberSchema,
  ]),
});
export type FarmShopSource =
  | z.infer<typeof farmPlanSourceSchema>
  | z.infer<typeof mixedFarmControlMemberSchema>;

const independentSpouseMemberSchema = multiplePlanSourceSchema.extend({
  no_other_trades_or_common_control_verified: z.literal(false),
});
const spouseExceptionRecordSchema = z.object({
  business_reference: groupReference,
  proprietor_ssn: sourceSchema.shape.owner_ssn,
  other_spouse_ssn: sourceSchema.shape.owner_ssn,
  proprietor_ownership_percentage: z.literal(100),
  other_spouse_direct_ownership_percentage: z.literal(0),
  ownership_from_date: z.literal("2025-01-01"),
  ownership_through_date: z.literal("2025-12-31"),
  ownership_record_reference: groupReference,
  other_spouse_never_director_fiduciary_employee_or_manager_verified: z.literal(
    true,
  ),
  other_spouse_role_and_payroll_record_reference: groupReference,
  gross_income_record_reference: groupReference,
  ordinary_business_gross_income: amount,
  royalties: amount,
  rents: amount,
  dividends: amount,
  interest: amount,
  annuities: amount,
  passive_income_record_reference: groupReference,
  no_disposal_restriction_favoring_spouse_or_under21_children_verified: z
    .literal(true),
  interest_disposal_record_reference: groupReference,
}).strict();
const independentSpouseSchema = z.object({
  qualifying_arrangement: z.literal("independent_mfj_spouse_proprietors"),
  owner_name: sourceSchema.shape.owner_name,
  owner_ssn: sourceSchema.shape.owner_ssn,
  proprietor_recipient: z.literal(TS.T),
  schedule_c_business_reference: groupReference,
  shop_plan_reference: groupReference,
  all_filer_controlled_businesses_identified_confirmed: z.literal(true),
  complete_business_census_record_reference: groupReference,
  spouse_exception_records: z.tuple([
    spouseExceptionRecordSchema,
    spouseExceptionRecordSchema,
  ]),
  independent_members: z.tuple([
    independentSpouseMemberSchema,
    independentSpouseMemberSchema,
  ]),
}).strict();

/** Full-year compatibility and explicitly sourced whole-month enrollment. */
export const inputSchema = z.union([
  legacySourceSchema.extend({
    full_year_employee_only_coverage_verified: z.literal(true),
    employees: z.array(
      employeeSchema.extend({
        full_year_employee_only_shop_premium: z.number().int().positive(),
      }).strict(),
    ).min(1).max(24),
  }).strict(),
  legacySourceSchema.extend({
    employee_only_calendar_month_coverage_verified: z.literal(true),
    all_enrollment_invoice_payment_records_identified_confirmed: z.literal(
      true,
    ),
    employees: z.array(
      employeeSchema.extend({
        enrollment_period: enrollmentPeriodSchema,
        tax_year_employee_only_shop_premium: z.number().int().positive(),
      }).strict(),
    ).min(1).max(24),
  }).strict(),
  legacySourceSchema.extend({
    identified_shop_tier_calendar_month_coverage_confirmed: z.literal(true),
    qualified_shop_health_plan_confirmed: z.literal(true),
    qualified_shop_plan_source_reference: z.string().trim().min(1),
    no_wellness_or_state_law_contribution_adjustment_confirmed: z.literal(true),
    qualifying_arrangement: z.literal("uniform_percentage_each_tier"),
    insurer_billing_method: z.literal("composite_tier_rate"),
    no_salary_reduction_or_tobacco_surcharge_in_employer_premiums_confirmed: z
      .literal(true),
    all_enrollment_invoice_payment_records_identified_confirmed: z.literal(
      true,
    ),
    employees: z.array(
      employeeSchema.extend({
        enrollment_period: enrollmentPeriodSchema,
        tax_year_shop_premium: z.number().int().positive(),
        coverage_tier: coverageTierSchema,
        covered_dependents_all_enrolled_for_employee_period_confirmed: z
          .literal(true),
        covered_dependents: z.array(coveredDependentSchema).max(10),
      }).strict(),
    ).min(1).max(24),
  }).strict(),
  sourceSchema.extend({
    identified_shop_tier_calendar_month_coverage_confirmed: z.literal(true),
    qualified_shop_health_plan_confirmed: z.literal(true),
    qualified_shop_plan_source_reference: z.string().trim().min(1),
    no_wellness_or_state_law_contribution_adjustment_confirmed: z.literal(true),
    qualifying_arrangement: z.literal("monthly_owned_composite_or_list_rules"),
    all_plan_eligible_employees_identified_confirmed: z.literal(true),
    all_identified_employees_plan_eligible_every_policy_month_confirmed: z
      .literal(true),
    proprietor_and_excluded_workers_not_plan_eligible_confirmed: z.literal(
      true,
    ),
    no_salary_reduction_or_tobacco_surcharge_in_employer_premiums_confirmed: z
      .literal(true),
    all_enrollment_invoice_payment_records_identified_confirmed: z.literal(
      true,
    ),
    monthly_arrangements: z.array(monthlyArrangementSchema).min(1).max(12),
    employees: z.array(
      employeeSchema.extend({
        employer_premium_paid: premiumMoney,
        enrollment_period: enrollmentPeriodSchema,
        tax_year_shop_premium: premiumMoney.refine((n) => n > 0),
        coverage_tier: coverageTierSchema,
        covered_dependents_all_enrolled_for_employee_period_confirmed: z
          .literal(true),
        covered_dependents: z.array(coveredDependentSchema).max(10),
      }).strict(),
    ).min(1).max(24),
  }).strict(),
  multiplePlanSourceSchema,
  farmPlanSourceSchema,
  commonControlSchema,
  mixedCommonControlSchema,
  independentSpouseSchema,
]);

export type F8941Input = z.infer<typeof inputSchema>;

export interface Form8941Lines {
  readonly line1: number;
  readonly line2: number;
  readonly line3: number;
  readonly line4: number;
  readonly line5: number;
  readonly line6: number;
  readonly line7: number;
  readonly line8: number;
  readonly line9: number;
  readonly line10: 0;
  readonly line11: number;
  readonly line12: number;
  readonly line13: number;
  readonly line14: number;
  readonly line15: 0;
  readonly line16: number;
}

function finishForm8941Lines(
  line1: number,
  line2: number,
  line3: number,
  line4: number,
  line5: number,
  line13: number,
  line14: number,
): Form8941Lines {
  if (line2 >= 25 || line3 >= 67_000) {
    throw new Error("Form 8941 FTE or wage ceiling bars the direct credit");
  }
  const line6 = Math.min(line4, line5);
  const line7 = Math.round(line6 * 0.5);
  const line8 = line2 <= 10
    ? line7
    : Math.max(0, Math.round(line7 * (1 - (line2 - 10) / 15)));
  const line9 = line3 <= 33_000 ? line8 : Math.max(
    0,
    Math.round(line8 - line7 * ((line3 - 33_300) / 33_300)),
  );
  const line10 = 0 as const;
  const line11 = line4;
  const line12 = Math.min(line9, line11);
  if (line12 <= 0) {
    throw new Error("Form 8941 direct source has no positive allowed credit");
  }
  const line15 = 0 as const;
  return {
    line1,
    line2,
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13,
    line14,
    line15,
    line16: line12,
  };
}

type CommonControlSource =
  | z.infer<typeof commonControlSchema>
  | z.infer<typeof mixedCommonControlSchema>;
function groupMemberReference(
  member: CommonControlSource["group_members"][number],
): string {
  return "schedule_f_farm_id" in member
    ? member.schedule_f_farm_id
    : member.schedule_c_business_reference;
}

function commonControlWorksheet(source: CommonControlSource) {
  const first = source.group_members[0];
  const members = source.group_members;
  if (
    source.member_control_records.length !== members.length ||
    (members.length === 2
      ? source.group_review.both_businesses_under_common_management_verified !==
          true &&
        source.group_review.all_businesses_under_common_management_verified !==
          true
      : source.group_review.all_businesses_under_common_management_verified !==
        true)
  ) {
    throw new Error(
      "Form 8941 common-control complete management inventory differs",
    );
  }
  if (
    source.schedule_c_business_reference !==
      first.schedule_c_business_reference ||
    source.employment_ein !== first.employment_ein ||
    source.shop_marketplace_identifier !== first.shop_marketplace_identifier ||
    source.shop_plan_reference !== first.shop_plan_reference ||
    new Set(members.map(groupMemberReference))
        .size !== members.length ||
    new Set(members.map((member) => member.employment_ein)).size !==
      members.length
  ) {
    throw new Error(
      "Form 8941 common-control member or filing identity differs",
    );
  }
  const references = new Set<string>();
  const addReference = (value: string) => {
    if (references.has(value)) {
      throw new Error("Form 8941 common-control source reference is reused");
    }
    references.add(value);
  };
  for (
    const reference of [
      source.group_review.ownership_record_reference,
      source.group_review.management_record_reference,
      source.group_review.complete_group_roster_record_reference,
      source.group_review.group_contribution_schedule_record_reference,
    ]
  ) addReference(reference);
  const policyPattern = (member: typeof members[number]) => {
    const plans = member.offered_qhps.map((plan) => plan.shop_plan_reference);
    return member.monthly_plan_arrangements.map((policy) => ({
      plan: plans.indexOf(policy.shop_plan_reference),
      month: policy.month,
      billing_method: policy.billing_method,
      contribution_application: policy.contribution_application,
      family_coverage_offered: policy.family_coverage_offered,
      employee_only_rule: policy.employee_only_rule,
      family_rule: policy.family_rule,
    })).sort((a, b) => a.plan - b.plan || a.month - b.month);
  };
  if (
    members.some((member) =>
      JSON.stringify(policyPattern(first)) !==
        JSON.stringify(policyPattern(member))
    )
  ) {
    throw new Error(
      "Form 8941 common-control group contribution schedule differs",
    );
  }
  source.member_control_records.forEach((record, index) => {
    if (
      record.business_reference !== groupMemberReference(members[index]) ||
      record.proprietor_ssn !== source.owner_ssn
    ) {
      throw new Error("Form 8941 common-control ownership record differs");
    }
    addReference(record.ownership_record_reference);
    addReference(record.management_record_reference);
  });
  const people = new Map<string, {
    hours: number;
    wages: number;
    premium: number;
    enrolled: boolean;
    seasonal: boolean;
    dates: Set<string>;
  }>();
  const excludedPeople = new Set<string>();
  let adjustedAveragePremium = 0;
  const memberPremiums: number[] = [];
  const memberPaidCents: number[] = [];
  for (const member of members) {
    if (
      member.owner_name !== source.owner_name ||
      member.owner_ssn !== source.owner_ssn ||
      member.proprietor_recipient !== source.proprietor_recipient ||
      member.no_state_premium_subsidy_or_credit_verified !== true ||
      member.credit_period_first_year !== first.credit_period_first_year ||
      JSON.stringify(member.first_year_filed_form8941) !==
        JSON.stringify(first.first_year_filed_form8941)
    ) {
      throw new Error(
        "Form 8941 common-control owner or credit period differs",
      );
    }
    // The complete owned QHP, quote, payroll and dated payment contract is
    // checked for each member before its rows enter the one employer worksheet.
    const worksheet = multiplePlanWorksheet(member);
    adjustedAveragePremium += worksheet.rows.reduce(
      (sum, row) => sum + row.adjusted_average_premium,
      0,
    );
    const paidCents = member.employees.reduce(
      (sum, employee) => sum + cents(employee.employer_premium_paid),
      0,
    );
    memberPaidCents.push(paidCents);
    memberPremiums.push(Math.round(paidCents / 100));
    const memberReferences = new Set<string>();
    const collect = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (
          typeof child === "string" &&
          /_reference$/.test(key) &&
          key !== "filed_2024_return_reference"
        ) memberReferences.add(child);
        else if (typeof child === "object") {
          if (Array.isArray(child)) child.forEach(collect);
          else collect(child);
        }
      }
    };
    collect(member);
    memberReferences.forEach(addReference);
    for (const worker of member.excluded_workers ?? []) {
      excludedPeople.add(worker.employee_ssn);
    }
    const enrolled = new Set(worksheet.enrolledEmployeeReferences);
    for (const employee of member.employees) {
      const previous = people.get(employee.employee_ssn);
      const seasonal = employee.seasonal_service !== undefined;
      if (
        previous && previous.premium > 0 &&
        employee.employer_premium_paid > 0
      ) {
        throw new Error(
          "Form 8941 common-control repeated worker has paid coverage in multiple members",
        );
      }
      if (previous && previous.seasonal !== seasonal) {
        throw new Error(
          "Form 8941 common-control repeated worker seasonal status differs",
        );
      }
      const person = previous ?? {
        hours: 0,
        wages: 0,
        premium: 0,
        enrolled: false,
        seasonal,
        dates: new Set<string>(),
      };
      person.hours += employee.hours_of_service;
      person.wages += employee.social_security_medicare_wages;
      person.premium += employee.employer_premium_paid;
      person.enrolled ||= enrolled.has(employee.employee_reference);
      for (const date of employee.seasonal_service?.service_dates ?? []) {
        person.dates.add(date);
      }
      people.set(employee.employee_ssn, person);
    }
  }
  if ([...excludedPeople].some((ssn) => people.has(ssn))) {
    throw new Error(
      "Form 8941 common-control excluded owner or family worker appears as credited employee",
    );
  }
  let totalHours = 0;
  let totalWages = 0;
  let enrolledHours = 0;
  let enrolledCount = 0;
  for (const person of people.values()) {
    const credited = person.seasonal && person.dates.size <= 120
      ? 0
      : Math.min(2080, person.hours);
    totalHours += credited;
    if (credited > 0) totalWages += person.wages;
    if (person.enrolled) {
      enrolledCount++;
      enrolledHours += credited;
    }
  }
  const line2 = Math.max(1, Math.floor(totalHours / 2080));
  const lines = finishForm8941Lines(
    people.size,
    line2,
    Math.floor(totalWages / line2 / 1000) * 1000,
    Math.round(
      memberPaidCents.reduce((sum, premium) => sum + premium, 0) / 100,
    ),
    Math.round(adjustedAveragePremium),
    enrolledCount,
    Math.max(1, Math.floor(enrolledHours / 2080)),
  );
  const totalPaidCents = memberPaidCents.reduce(
    (sum, premium) => sum + premium,
    0,
  );
  const exactShares = memberPaidCents.map((premium) =>
    lines.line16 * premium / totalPaidCents
  );
  const shares = exactShares.map(Math.floor);
  let remaining = lines.line16 - shares.reduce((sum, share) => sum + share, 0);
  const residualOrder = exactShares.map((share, index) => ({
    index,
    remainder: share - shares[index],
  })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const row of residualOrder) {
    if (remaining-- <= 0) break;
    shares[row.index]++;
  }
  return {
    lines,
    shares,
    memberPremiums,
  };
}

export function commonControlForm8941Shares(raw: unknown) {
  const source = z.union([commonControlSchema, mixedCommonControlSchema]).parse(
    raw,
  );
  return commonControlWorksheet(source);
}

export function independentSpouseForm8941(raw: unknown) {
  const source = independentSpouseSchema.parse(raw);
  const [first, second] = source.independent_members;
  if (
    first.proprietor_recipient !== TS.T ||
    second.proprietor_recipient !== TS.S ||
    source.owner_ssn !== first.owner_ssn ||
    source.owner_name !== first.owner_name ||
    source.schedule_c_business_reference !==
      first.schedule_c_business_reference ||
    source.shop_plan_reference !== first.shop_plan_reference ||
    first.owner_ssn === second.owner_ssn ||
    first.schedule_c_business_reference ===
      second.schedule_c_business_reference ||
    first.employment_ein === second.employment_ein
  ) throw new Error("Form 8941 independent spouse member identity differs");
  const references = new Set<string>();
  const people = new Set<string>();
  const collect = (value: unknown): void => {
    const local = new Set<string>();
    const visit = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (
          typeof child === "string" && /_reference$/.test(key) &&
          key !== "filed_2024_return_reference" &&
          key !== "business_reference" && key !== "shop_plan_reference" &&
          key !== "employee_reference"
        ) {
          local.add(child);
        } else if (typeof child === "object") {
          if (Array.isArray(child)) child.forEach(visit);
          else visit(child);
        }
      }
    };
    visit(value);
    for (const ref of local) {
      if (references.has(ref)) {
        throw new Error("Form 8941 independent spouse source reference reused");
      }
      references.add(ref);
    }
  };
  const lines = source.independent_members.map((member, index) => {
    const record = source.spouse_exception_records[index];
    const other = source.independent_members[1 - index];
    const passive = record.royalties + record.rents + record.dividends +
      record.interest + record.annuities;
    if (
      record.business_reference !== member.schedule_c_business_reference ||
      record.proprietor_ssn !== member.owner_ssn ||
      record.other_spouse_ssn !== other.owner_ssn ||
      member.employees.some((employee) =>
        employee.employee_ssn === other.owner_ssn
      ) ||
      (member.excluded_workers ?? []).some((worker) =>
        worker.employee_ssn === other.owner_ssn
      ) ||
      record.ordinary_business_gross_income + passive <= 0 ||
      passive * 2 > record.ordinary_business_gross_income + passive
    ) {
      throw new Error(
        "Form 8941 independent spouse ownership or employment exception differs",
      );
    }
    for (
      const worker of [...member.employees, ...(member.excluded_workers ?? [])]
    ) {
      if (people.has(worker.employee_ssn)) {
        throw new Error(
          "Form 8941 independent spouse worker repeated across employers",
        );
      }
      people.add(worker.employee_ssn);
    }
    collect(record);
    collect(member);
    return calculateSingleEmployerForm8941(member);
  }) as [Form8941Lines, Form8941Lines];
  return { source, lines, totalCredit: lines[0].line16 + lines[1].line16 };
}

type SingleEmployerSource =
  | Exclude<
    F8941Input,
    { group_members: unknown } | { independent_members: unknown }
  >
  | z.infer<typeof independentSpouseMemberSchema>;

/** TY2025 Form 8941 lines 1–16 and Worksheets 1–7 for one employer. */
function calculateSingleEmployerForm8941(
  source: SingleEmployerSource,
): Form8941Lines {
  const multi = "monthly_plan_arrangements" in source
    ? multiplePlanWorksheet(source)
    : undefined;
  if (!("monthly_plan_arrangements" in source)) {
    verifyForm8941ShopReview(source);
  }
  if (
    (source.credit_period_first_year === 2024) !==
      Boolean(source.first_year_filed_form8941)
  ) {
    throw new Error(
      "Form 8941 credit-period history needs its first filed year",
    );
  }
  const references = new Set<string>();
  const enrollmentRecords = new Set<string>();
  const contribution =
    "monthly_arrangements" in source || "monthly_plan_arrangements" in source
      ? undefined
      : source.uniform_employer_contribution_basis_points / 10000;
  const ratingArea = source.employees[0];
  for (const employee of source.employees) {
    if (
      references.has(employee.employee_reference) ||
      enrollmentRecords.has(employee.enrollment_and_payroll_record_reference)
    ) {
      throw new Error("Form 8941 employee payroll reference is duplicated");
    }
    references.add(employee.employee_reference);
    enrollmentRecords.add(employee.enrollment_and_payroll_record_reference);
    if (
      employee.rating_area_county !== ratingArea.rating_area_county ||
      employee.rating_area_state !== ratingArea.rating_area_state
    ) {
      throw new Error("Form 8941 bounded SHOP plan needs one rating area");
    }
    if (
      contribution !== undefined && employee.employer_premium_paid !==
        Math.round(employeeTaxYearPremium(employee) * contribution)
    ) {
      throw new Error(
        "Form 8941 employee premium differs from uniform SHOP contribution",
      );
    }
  }
  const creditedHours = (employee: typeof source.employees[number]) =>
    "seasonal_service" in employee && employee.seasonal_service &&
      employee.seasonal_service.service_dates.length <= 120
      ? 0
      : employee.hours_of_service;
  const totalHours = source.employees.reduce(
    (sum, employee) => sum + creditedHours(employee),
    0,
  );
  const totalWages = source.employees.reduce(
    (sum, employee) =>
      sum +
      (creditedHours(employee) === 0
        ? 0
        : employee.social_security_medicare_wages),
    0,
  );
  const line1 = source.employees.length;
  const line2 = Math.max(1, Math.floor(totalHours / 2080));
  const line3 = Math.floor(totalWages / line2 / 1000) * 1000;
  const line4 = Math.round(
    source.employees.reduce(
      (sum, employee) => sum + cents(employee.employer_premium_paid),
      0,
    ) / 100,
  );
  // Worksheet4(c): prorate the annual table premium only for enrolled periods.
  // Preserve the fractional row amounts and round their sum for the filed line.
  const line5 = "monthly_plan_arrangements" in source
    ? Math.round(
      multi!.rows.reduce((sum, row) => sum + row.adjusted_average_premium, 0),
    )
    : "monthly_arrangements" in source
    ? Math.round(
      arrangementWorksheet(source).reduce(
        (sum, row) => sum + row.adjusted_average_premium,
        0,
      ),
    )
    : Math.round(
      source.employees.reduce(
        (sum, employee) =>
          sum + employee.irs_2025_rating_area_average_premium *
            source.uniform_employer_contribution_basis_points *
            enrollmentMonthCount(employee),
        0,
      ) / 120000,
    );
  const enrolled = multi
    ? source.employees.filter((e) =>
      multi.enrolledEmployeeReferences.includes(e.employee_reference)
    )
    : source.employees;
  const line13 = enrolled.length;
  const line14 = Math.max(
    1,
    Math.floor(enrolled.reduce((sum, e) => sum + creditedHours(e), 0) / 2080),
  );
  return finishForm8941Lines(
    line1,
    line2,
    line3,
    line4,
    line5,
    line13,
    line14,
  );
}

export function calculateForm8941(raw: unknown): Form8941Lines {
  const source = inputSchema.parse(raw);
  if ("group_members" in source) return commonControlWorksheet(source).lines;
  if ("independent_members" in source) {
    throw new Error("Independent spouse proprietors require two Forms 8941");
  }
  return calculateSingleEmployerForm8941(source);
}

class F8941Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8941";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f3800,
    schedule_c,
    schedule_f,
    f1040,
  ]);

  compute(_ctx: NodeContext, rawInput: F8941Input): NodeResult {
    if ("schedule_f_farm_id" in rawInput) {
      const lines = calculateForm8941(rawInput);
      return {
        outputs: [
          output(f3800, {
            f8941_direct_employer_credit: {
              credit_amount: lines.line16,
              schedule_f_farm_id: rawInput.schedule_f_farm_id,
              shop_plan_reference: rawInput.shop_plan_reference,
              shop_plan_references: rawInput.offered_qhps.map((p) =>
                p.shop_plan_reference
              ),
              subject_to_passive_activity_limit: false,
            },
          }),
          output(f1040, { form8941_determined_credit: lines.line16 }),
          output(schedule_f, {
            form8941_premium_reductions: [{
              farm_id: rawInput.schedule_f_farm_id,
              credit_amount: lines.line16,
            }],
          }),
        ],
      };
    }
    if ("independent_members" in rawInput) {
      const joint = independentSpouseForm8941(rawInput);
      return {
        outputs: [
          output(f3800, {
            f8941_direct_employer_credit: {
              credit_amount: joint.totalCredit,
              schedule_c_business_reference:
                rawInput.schedule_c_business_reference,
              shop_plan_reference: rawInput.shop_plan_reference,
              independent_spouse_business_references: [
                rawInput.independent_members[0].schedule_c_business_reference,
                rawInput.independent_members[1].schedule_c_business_reference,
              ],
              independent_spouse_credits: [
                joint.lines[0].line16,
                joint.lines[1].line16,
              ],
              subject_to_passive_activity_limit: false,
            },
          }),
          output(f1040, { form8941_determined_credit: joint.totalCredit }),
          output(schedule_c, {
            form8941_premium_reductions: rawInput.independent_members.map((
              member,
              index,
            ) => ({
              business_reference: member.schedule_c_business_reference,
              credit_amount: joint.lines[index].line16,
            })),
          }),
        ],
      };
    }
    const lines = calculateForm8941(rawInput);
    return {
      outputs: [
        output(f3800, {
          f8941_direct_employer_credit: {
            credit_amount: lines.line16,
            schedule_c_business_reference:
              rawInput.schedule_c_business_reference,
            shop_plan_reference: rawInput.shop_plan_reference,
            ...("group_members" in rawInput
              ? {
                group_business_references: rawInput.group_members.map((
                  member,
                ) => groupMemberReference(member)),
              }
              : {}),
            ...("offered_qhps" in rawInput
              ? {
                shop_plan_references: rawInput.offered_qhps.map((p) =>
                  p.shop_plan_reference
                ),
              }
              : {}),
            subject_to_passive_activity_limit: false,
          },
        }),
        output(f1040, { form8941_determined_credit: lines.line16 }),
        output(schedule_c, {
          form8941_premium_reductions: "group_members" in rawInput
            ? rawInput.group_members.flatMap((member, index) =>
              "schedule_c_business_reference" in member
                ? [{
                  business_reference: member.schedule_c_business_reference,
                  credit_amount:
                    commonControlForm8941Shares(rawInput).shares[index],
                }]
                : []
            )
            : [{
              business_reference: rawInput.schedule_c_business_reference,
              credit_amount: lines.line16,
            }],
        }),
        ...("group_members" in rawInput &&
            rawInput.group_members.some((member) =>
              "schedule_f_farm_id" in member
            )
          ? [output(schedule_f, {
            form8941_premium_reductions: rawInput.group_members.flatMap((
              member,
              index,
            ) =>
              "schedule_f_farm_id" in member
                ? [{
                  farm_id: member.schedule_f_farm_id,
                  credit_amount:
                    commonControlForm8941Shares(rawInput).shares[index],
                }]
                : []
            ),
          })]
          : []),
      ],
    };
  }
}

export const f8941 = new F8941Node();
