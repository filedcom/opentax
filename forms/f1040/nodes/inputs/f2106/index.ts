import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { scheduleA } from "../schedule_a/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";

export enum EmployeeType {
  RESERVIST = "RESERVIST",
  PERFORMING_ARTIST = "PERFORMING_ARTIST",
  FEE_BASIS_OFFICIAL = "FEE_BASIS_OFFICIAL",
  DISABLED_IMPAIRMENT = "DISABLED_IMPAIRMENT",
}

export enum VehicleMethod {
  NONE = "NONE",
  STANDARD_MILEAGE = "STANDARD_MILEAGE",
  ACTUAL_EXPENSE = "ACTUAL_EXPENSE",
}

const amount = z.number().int().nonnegative();
const miles = z.number().int().nonnegative();
const sourceReference = z.string().trim().min(1);
const vehicleDate = z.string().regex(/^20\d\d-\d\d-\d\d$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value && value <= "2025-12-31";
}, "Form 2106 needs a valid vehicle service date no later than 2025");

const jobSchema = z.object({
  tax_year: z.literal(2025),
  owner: z.enum(["taxpayer", "spouse"]),
  employee_name: z.string().trim().min(1),
  employee_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  occupation: z.string().trim().min(1),
  employer_name: z.string().trim().min(1),
  employer_ein: z.string().regex(/^\d{2}-?\d{7}$/),
  employment_record_reference: sourceReference,
}).strict();

const feeBasisQualificationSchema = z.object({
  kind: z.literal(EmployeeType.FEE_BASIS_OFFICIAL),
  state_or_local_government_employer: z.literal(true),
  compensated_on_fee_basis: z.literal(true),
  qualifying_service_reference: sourceReference,
}).strict();

const impairmentQualificationSchema = z.object({
  kind: z.literal(EmployeeType.DISABLED_IMPAIRMENT),
  physical_or_mental_disability: z.literal(true),
  costs_enable_work_at_place_of_employment: z.literal(true),
  impairment_work_expense_reference: sourceReference,
}).strict();

const performingArtistEmployerSchema = z.object({
  employer_ein: z.string().regex(/^\d{2}-?\d{7}$/),
  wages: amount.min(200),
  w2_reference: sourceReference,
}).strict();

const performingArtistQualificationSchema = z.object({
  kind: z.literal(EmployeeType.PERFORMING_ARTIST),
  employers: z.tuple([
    performingArtistEmployerSchema,
    performingArtistEmployerSchema,
  ]),
  performing_arts_gross_income: amount,
  adjusted_gross_income_before_artist_deduction: amount,
  filing_status: z.enum([
    "single",
    "married_filing_jointly",
    "married_filing_separately",
    "head_of_household",
    "qualifying_surviving_spouse",
  ]),
  married_at_year_end: z.boolean(),
  lived_apart_from_spouse_all_year: z.boolean(),
}).strict();

const reservistQualificationSchema = z.object({
  kind: z.literal(EmployeeType.RESERVIST),
  reserve_component_reference: sourceReference,
  travel_more_than_100_miles_from_home: z.literal(true),
  federal_per_diem_limit_workpaper_reference: sourceReference,
}).strict();

const qualificationSchema = z.discriminatedUnion("kind", [
  feeBasisQualificationSchema,
  impairmentQualificationSchema,
  performingArtistQualificationSchema,
  reservistQualificationSchema,
]);

const noVehicleSchema = z.object({ method: z.literal(VehicleMethod.NONE) })
  .strict();

const standardMileageEligibilitySchema = z.discriminatedUnion("ownership", [
  z.object({
    ownership: z.literal("owned"),
    used_standard_mileage_first_business_year: z.literal(true),
    method_history_reference: sourceReference,
  }).strict(),
  z.object({
    ownership: z.literal("leased"),
    used_standard_mileage_entire_lease: z.literal(true),
    method_history_reference: sourceReference,
  }).strict(),
]);

const standardMileageVehicleSchema = z.object({
  method: z.literal(VehicleMethod.STANDARD_MILEAGE),
  placed_in_service_date: vehicleDate,
  total_miles: miles.positive(),
  business_miles: miles,
  average_daily_roundtrip_commuting_miles: miles,
  commuting_miles: miles,
  available_for_personal_use_off_duty: z.boolean(),
  other_personal_vehicle_available: z.boolean(),
  written_mileage_evidence_reference: sourceReference,
  no_personal_to_business_conversion_during_year_confirmed: z.literal(true),
  standard_mileage_eligibility: standardMileageEligibilitySchema,
}).strict();

const actualExpenseVehicleSchema = z.object({
  method: z.literal(VehicleMethod.ACTUAL_EXPENSE),
  placed_in_service_date: vehicleDate,
  total_miles: miles.positive(),
  business_miles: miles,
  average_daily_roundtrip_commuting_miles: miles,
  commuting_miles: miles,
  available_for_personal_use_off_duty: z.boolean(),
  other_personal_vehicle_available: z.boolean(),
  written_mileage_evidence_reference: sourceReference,
  operating_costs_line23: amount,
  rentals_line24a: amount,
  inclusion_amount_line24b: amount,
  employer_vehicle_value_line25: amount,
  depreciation_line28: amount,
  depreciation_workpaper_reference: sourceReference,
}).strict();

const vehicleSchema = z.discriminatedUnion("method", [
  noVehicleSchema,
  standardMileageVehicleSchema,
  actualExpenseVehicleSchema,
]);

const expenseSchema = z.object({
  line2_parking_tolls_local_transportation: amount,
  line3_overnight_travel_excluding_meals: amount,
  line4_other_business_expenses: amount,
  line5_meals: amount,
  standard_50_percent_meal_limit_confirmed: z.literal(true),
  expense_records_reference: sourceReference,
  job_business_purpose: z.string().trim().min(1),
}).strict();

const reimbursementSchema = z.object({
  line7_column_a_nonmeals: amount,
  line7_column_b_meals: amount,
  employer_reimbursement_record_reference: sourceReference,
  excluded_from_w2_box1_confirmed: z.literal(true),
}).strict();

export const itemSchema = z.object({
  job: jobSchema,
  qualification: qualificationSchema,
  vehicle: vehicleSchema,
  expenses: expenseSchema,
  reimbursements: reimbursementSchema,
}).strict().superRefine((item, context) => {
  if (item.qualification.kind === EmployeeType.PERFORMING_ARTIST) {
    const qualification = item.qualification;
    if (
      qualification.employers[0].employer_ein ===
        qualification.employers[1].employer_ein ||
      qualification.performing_arts_gross_income <
        qualification.employers[0].wages + qualification.employers[1].wages ||
      !qualification.employers.some((employer) =>
        employer.employer_ein === item.job.employer_ein
      ) ||
      ((qualification.filing_status === "married_filing_jointly" ||
        qualification.filing_status === "married_filing_separately") &&
        !qualification.married_at_year_end)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Form 2106 performing-artist job and employer facts conflict",
      });
    }
  }
  if (
    item.vehicle.method !== VehicleMethod.NONE &&
    item.vehicle.business_miles + item.vehicle.commuting_miles >
      item.vehicle.total_miles
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 2106 business and commuting miles exceed total miles",
    });
  }
  if (
    item.vehicle.method === VehicleMethod.ACTUAL_EXPENSE &&
    item.vehicle.inclusion_amount_line24b > item.vehicle.rentals_line24a
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 2106 line 24b exceeds line 24a",
    });
  }
  if (
    item.qualification.kind === EmployeeType.DISABLED_IMPAIRMENT &&
    (item.vehicle.method !== VehicleMethod.NONE ||
      item.expenses.line2_parking_tolls_local_transportation > 0 ||
      item.expenses.line3_overnight_travel_excluding_meals > 0 ||
      item.expenses.line5_meals > 0 ||
      item.reimbursements.line7_column_b_meals > 0)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Staged impairment branch accepts only sourced Form 2106 line 4 workplace expenses",
    });
  }
});

export const inputSchema = z.object({ f2106s: z.array(itemSchema).min(1) })
  .strict().superRefine((input, context) => {
    const references = input.f2106s.map((item) =>
      item.job.employment_record_reference
    );
    if (new Set(references).size !== references.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Form 2106 needs a distinct employment record for each job",
      });
    }
    for (const owner of ["taxpayer", "spouse"] as const) {
      const ssns = new Set(
        input.f2106s.filter((item) => item.job.owner === owner).map((item) =>
          item.job.employee_ssn
        ),
      );
      if (ssns.size > 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Form 2106 ${owner} jobs disagree on SSN`,
        });
      }
    }
  });

type F2106Item = z.infer<typeof itemSchema>;
type F2106Input = z.infer<typeof inputSchema>;

const standardMileageLinesSchema = z.object({
  line11_placed_in_service_date: vehicleDate,
  line12_total_miles: miles,
  line13_business_miles: miles,
  line14_business_use_percent: z.number().finite().min(0).max(100),
  line15_average_daily_commuting_miles: miles,
  line16_commuting_miles: miles,
  line17_other_personal_miles: miles,
  line18_available_off_duty: z.boolean(),
  line19_other_vehicle_available: z.boolean(),
  line20_evidence: z.literal(true),
  line21_written_evidence: z.literal(true),
  line22_standard_mileage_deduction: amount,
}).strict();

export const form2106LinesSchema = z.object({
  line1_vehicle: amount,
  line2_transportation: amount,
  line3_travel: amount,
  line4_other: amount,
  line5_meals: amount,
  line6_column_a: amount,
  line6_column_b: amount,
  line7_column_a: amount,
  line7_column_b: amount,
  line8_column_a: amount,
  line8_column_b: amount,
  line9_column_a: amount,
  line9_column_b: amount,
  line10_deduction: amount,
  excess_nonmeal_reimbursement_to_1040_line1a: amount,
  vehicle_part_ii: standardMileageLinesSchema.nullable(),
}).strict();

export type Form2106Lines = z.infer<typeof form2106LinesSchema>;

function vehicleExpense(vehicle: F2106Item["vehicle"]): number {
  if (vehicle.method === VehicleMethod.NONE) return 0;
  if (vehicle.method === VehicleMethod.STANDARD_MILEAGE) {
    return Math.round(vehicle.business_miles * 0.70);
  }
  throw new Error(
    "Form 2106 actual vehicle expenses need a sourced depreciation and business-use calculation",
  );
}

function standardMileageLines(
  vehicle: F2106Item["vehicle"],
): z.infer<typeof standardMileageLinesSchema> | null {
  if (vehicle.method !== VehicleMethod.STANDARD_MILEAGE) return null;
  return standardMileageLinesSchema.parse({
    line11_placed_in_service_date: vehicle.placed_in_service_date,
    line12_total_miles: vehicle.total_miles,
    line13_business_miles: vehicle.business_miles,
    line14_business_use_percent:
      Math.round(vehicle.business_miles / vehicle.total_miles * 10_000) / 100,
    line15_average_daily_commuting_miles:
      vehicle.average_daily_roundtrip_commuting_miles,
    line16_commuting_miles: vehicle.commuting_miles,
    line17_other_personal_miles: vehicle.total_miles - vehicle.business_miles -
      vehicle.commuting_miles,
    line18_available_off_duty: vehicle.available_for_personal_use_off_duty,
    line19_other_vehicle_available: vehicle.other_personal_vehicle_available,
    line20_evidence: true,
    line21_written_evidence: true,
    line22_standard_mileage_deduction: Math.round(
      vehicle.business_miles * 0.70,
    ),
  });
}

function assertQualifiedCategory(item: F2106Item): void {
  const qualification = item.qualification;
  if (qualification.kind === EmployeeType.RESERVIST) {
    throw new Error(
      "Form 2106 reservist deduction needs trip-level per-diem and eligible-travel allocation",
    );
  }
  if (qualification.kind === EmployeeType.PERFORMING_ARTIST) {
    throw new Error(
      "Form 2106 performing-artist deduction needs owner-wide employer, gross-income, expense, AGI, and marital reconciliation",
    );
  }
}

export function calculateForm2106Lines(raw: unknown): Form2106Lines {
  const item = itemSchema.parse(raw);
  assertQualifiedCategory(item);
  const line1 = vehicleExpense(item.vehicle);
  const line2 = item.expenses.line2_parking_tolls_local_transportation;
  const line3 = item.expenses.line3_overnight_travel_excluding_meals;
  const line4 = item.expenses.line4_other_business_expenses;
  const line5 = item.expenses.line5_meals;
  const line6A = line1 + line2 + line3 + line4;
  const line6B = line5;
  const line7A = item.reimbursements.line7_column_a_nonmeals;
  const line7B = item.reimbursements.line7_column_b_meals;
  const line8A = Math.max(0, line6A - line7A);
  const line8B = Math.max(0, line6B - line7B);
  const line9A = line8A;
  const line9B = Math.round(line8B * 0.5);
  const line10 = line9A + line9B;
  return form2106LinesSchema.parse({
    line1_vehicle: line1,
    line2_transportation: line2,
    line3_travel: line3,
    line4_other: line4,
    line5_meals: line5,
    line6_column_a: line6A,
    line6_column_b: line6B,
    line7_column_a: line7A,
    line7_column_b: line7B,
    line8_column_a: line8A,
    line8_column_b: line8B,
    line9_column_a: line9A,
    line9_column_b: line9B,
    line10_deduction: line10,
    excess_nonmeal_reimbursement_to_1040_line1a: Math.max(0, line7A - line6A),
    vehicle_part_ii: standardMileageLines(item.vehicle),
  });
}

function routedOutputs(items: F2106Input["f2106s"]): NodeOutput[] {
  const calculated = items.map((item) => ({
    item,
    lines: calculateForm2106Lines(item),
  }));
  if (
    calculated.some(({ lines }) =>
      lines.excess_nonmeal_reimbursement_to_1040_line1a > 0
    )
  ) {
    throw new Error(
      "Form 2106 excess column A reimbursement needs Form 1040 line 1a and W-2 reconciliation",
    );
  }
  const schedule1Total = calculated
    .filter(({ item }) =>
      item.qualification.kind !== EmployeeType.DISABLED_IMPAIRMENT
    )
    .reduce((sum, { lines }) => sum + lines.line10_deduction, 0);
  const scheduleATotal = calculated
    .filter(({ item }) =>
      item.qualification.kind === EmployeeType.DISABLED_IMPAIRMENT
    )
    .reduce((sum, { lines }) => sum + lines.line10_deduction, 0);
  return [
    ...(schedule1Total > 0
      ? [
        output(schedule1, { line12_business_expenses: schedule1Total }),
        output(agi_aggregator, { line12_business_expenses: schedule1Total }),
      ]
      : []),
    ...(scheduleATotal > 0
      ? [output(scheduleA, { line_16_other_deductions: scheduleATotal })]
      : []),
  ];
}

class F2106Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f2106";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    scheduleA,
    agi_aggregator,
  ]);

  compute(_ctx: NodeContext, rawInput: unknown): NodeResult {
    const parsed = inputSchema.parse(rawInput);
    return { outputs: routedOutputs(parsed.f2106s) };
  }
}

export const f2106 = new F2106Node();
