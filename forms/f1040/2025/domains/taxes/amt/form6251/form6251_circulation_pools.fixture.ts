import { circulationScheduleInputs } from "./form6251_circulation.fixture.ts";
import { itemSchema } from "../../../../../nodes/inputs/deductions/business/f59e/index.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";

function pool(id: string, year: number, cost: number, owner: TS) {
  const base = circulationScheduleInputs(year).f59e[0];
  const tin = owner === TS.S ? "444556666" : "123456789";
  const regular = year === 2025 ? cost : 0;
  const source = itemSchema.parse({
    ...base,
    original_amount: cost,
    remaining_unamortized: cost - Math.min(2025 - year, 3) * cost / 3,
    circulation_reviewed_workpaper_reference: `reviewed-${id}`,
    circulation_schedule_c_expense: regular > 0
      ? {
        business_reference: id,
        expense_description: `${id} circulation costs`,
        owner_tin: tin,
      }
      : undefined,
    circulation_cost_schedule: {
      ...base.circulation_cost_schedule,
      owner_tin: tin,
      cost_records: [{ source_reference: `invoice-${id}`, amount: cost }],
      prior_years: base.circulation_cost_schedule.prior_years.map((row, i) => ({
        ...row,
        regular_deduction: i === 0 ? cost : 0,
        amt_deduction: cost / 3,
        reviewed_return_reference: `${id}-${row.tax_year}-reviewed-return`,
      })),
    },
  });
  const business = {
    ...circulationScheduleInputs(2025).schedule_c[0],
    business_reference: id,
    line_a_principal_business: `${id} publishing`,
    proprietor_recipient: owner,
    line_1_gross_receipts: regular,
    part_v_other_expenses: [{
      description: `${id} circulation costs`,
      amount: regular,
    }],
  };
  return { source, business, regular };
}

function inputs(pools: ReturnType<typeof pool>[], joint: boolean) {
  const base = circulationScheduleInputs(2025);
  return {
    ...base,
    general: {
      ...base.general,
      filing_status: joint ? FilingStatus.MFJ : FilingStatus.Single,
      ...(joint
        ? {
          spouse_first_name: "Sam",
          spouse_last_name: "Taxpayer",
          spouse_ssn: "444-55-6666",
          spouse_dob: "1982-05-20",
        }
        : {}),
    },
    f59e: pools.map((item) => item.source),
    schedule_c: pools.filter((item) => item.regular > 0).map((item) =>
      item.business
    ),
  };
}

export const circulationPoolFixtures = [
  {
    id: "single-two-vintages",
    inputs: inputs([
      pool("current", 2025, 30000, TS.T),
      pool("prior", 2024, 30000, TS.T),
    ], false),
    difference: 10000,
    totalTax: 96550,
    regularTax: 37067,
  },
  {
    id: "single-offsetting-pools",
    inputs: inputs([
      pool("current", 2025, 15000, TS.T),
      pool("prior", 2024, 30000, TS.T),
    ], false),
    difference: 0,
    totalTax: 93750,
    regularTax: 37067,
  },
  {
    id: "joint-spouse-current",
    inputs: inputs([
      pool("spouse-current", 2025, 30000, TS.S),
      pool("primary-prior", 2023, 30000, TS.T),
    ], true),
    difference: 10000,
    totalTax: 82858,
    regularTax: 26898,
  },
  {
    id: "joint-four-offsetting-pools",
    inputs: inputs([
      pool("primary-current", 2025, 30000, TS.T),
      pool("spouse-current", 2025, 15000, TS.S),
      pool("primary-prior", 2024, 30000, TS.T),
      pool("spouse-prior", 2023, 60000, TS.S),
    ], true),
    difference: 0,
    totalTax: 80058,
    regularTax: 26898,
  },
];
