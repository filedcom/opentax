import {
  assertDistinctCirculationCosts,
  resolveCirculationDeductions,
} from "../../../../../nodes/inputs/deductions/business/f59e/circulation.ts";
import {
  ExpenditureType,
  inputSchema as form59eSourceSchema,
} from "../../../../../nodes/inputs/deductions/business/f59e/index.ts";
import type { z } from "zod";
import {
  calculateScheduleCAtRiskNet,
  inputSchema as scheduleCSourceSchema,
  projectScheduleCItems,
  wotcReductionsByBusiness,
} from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { schedule1 as schedule1Node } from "../../../../../nodes/outputs/general/return-assembly/schedule1/index.ts";
import { TS } from "../../../../../nodes/types.ts";

const circulationExpenseError =
  "Form 6251 circulation deductions need distinct owned Schedule C expenses and finalized Schedule 1 income";

function circulationExpenseKey(
  item: z.infer<typeof form59eSourceSchema>["f59es"][number],
  businesses: ReturnType<typeof projectScheduleCItems>,
  general: z.infer<typeof generalSchema>,
  finalIdentity: z.infer<typeof generalSchema>,
): string {
  const error = circulationExpenseError;
  const trace = item.circulation_schedule_c_expense;
  if (!trace) throw new Error(error);
  const matches = businesses.filter((business) =>
    business.business_reference === trace.business_reference
  );
  if (matches.length !== 1) throw new Error(error);
  const business = matches[0];
  const spouse = business.proprietor_recipient === TS.S;
  const owner = spouse ? general.spouse_ssn : general.taxpayer_ssn;
  const finalOwner = spouse
    ? finalIdentity.spouse_ssn
    : finalIdentity.taxpayer_ssn;
  const expenses = (business.part_v_other_expenses ?? []).filter((expense) =>
    expense.description === trace.expense_description
  );
  if (
    owner?.replaceAll("-", "") !== trace.owner_tin ||
    finalOwner?.replaceAll("-", "") !== trace.owner_tin ||
    (spouse && general.filing_status !== "mfj") ||
    general.filing_status !== finalIdentity.filing_status ||
    business.line_g_material_participation !== true ||
    business.line_32_at_risk === "b" ||
    business.at_risk_simplified !== undefined ||
    business.disposed_of_business === true ||
    expenses.length !== 1 || expenses[0].amount !== item.regular_tax_deduction
  ) throw new Error(error);
  return JSON.stringify([
    trace.business_reference,
    trace.expense_description,
  ]);
}

function assertRegularCirculationExpenses(
  items: z.infer<typeof form59eSourceSchema>["f59es"],
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const deducted = items.filter((item) =>
    (item.regular_tax_deduction ?? 0) > 0
  );
  if (deducted.length === 0) return;
  const source = scheduleCSourceSchema.safeParse(pending?.schedule_c);
  const general = generalSchema.safeParse(pending?.general);
  const finalIdentity = generalSchema.safeParse(pending?.f1040);
  const schedule1 = schedule1Node.inputSchema.safeParse(pending?.schedule1);
  const error = circulationExpenseError;
  if (
    !source.success || !general.success || !finalIdentity.success ||
    !schedule1.success
  ) {
    throw new Error(error);
  }
  const businesses = projectScheduleCItems(source.data);
  const keys = deducted.map((item) =>
    circulationExpenseKey(item, businesses, general.data, finalIdentity.data)
  );
  if (new Set(keys).size !== keys.length) throw new Error(error);
  const reductions = wotcReductionsByBusiness(source.data);
  const net = businesses.reduce(
    (sum, business) =>
      sum + calculateScheduleCAtRiskNet(
        business,
        reductions.get(business.business_reference ?? "") ?? 0,
      ).atRiskNet,
    0,
  );
  if (schedule1.data.line3_schedule_c !== net) throw new Error(error);
}

/** Recompute Form 6251 line 2o from the retained reviewed §59(e) records. */
export function assertForm6251CirculationSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const amount = fields.line2o_circulation_costs;
  const parsed = form59eSourceSchema.safeParse(pending?.f59e);
  const items = parsed.success ? parsed.data.f59es : [];
  const circulation = items.filter((item) =>
    item.expenditure_type === ExpenditureType.Circulation
  ).map((item) => ({ ...item, ...resolveCirculationDeductions(item, 2025) }));
  assertDistinctCirculationCosts(
    circulation.map((item) => item.circulation_cost_schedule),
  );
  for (const item of circulation) {
    if (!item.circulation_cost_schedule) continue;
    const general = generalSchema.parse(pending?.general);
    const finalIdentity = generalSchema.parse(pending?.f1040);
    const owner = item.circulation_cost_schedule.owner_tin;
    const primary = general.taxpayer_ssn?.replaceAll("-", "") === owner &&
      finalIdentity.taxpayer_ssn?.replaceAll("-", "") === owner;
    const spouse = general.filing_status === "mfj" &&
      finalIdentity.filing_status === "mfj" &&
      general.spouse_ssn?.replaceAll("-", "") === owner &&
      finalIdentity.spouse_ssn?.replaceAll("-", "") === owner;
    if (
      (!primary && !spouse) || (item.circulation_schedule_c_expense &&
        item.circulation_schedule_c_expense.owner_tin !== owner)
    ) {
      throw new Error(
        "Circulation amortization owner must match the finalized filer and business expense",
      );
    }
  }
  const difference = circulation.reduce(
    (sum, item) =>
      sum + (item.regular_tax_deduction ?? 0) - (item.amt_deduction ?? 0),
    0,
  );
  if (
    (amount === undefined || amount === null || amount === 0) &&
    difference === 0 && circulation.length === 0 &&
    (parsed.success || pending?.f59e === undefined)
  ) return;
  if (
    !parsed.success || circulation.length === 0 ||
    circulation.length !== items.length ||
    circulation.some((item) =>
      item.regular_tax_deduction === undefined ||
      item.amt_deduction === undefined ||
      item.regular_three_year_writeoff_elected === undefined ||
      item.circulation_reviewed_workpaper_reference === undefined ||
      item.circulation_no_unamortized_property_loss !== true ||
      item.regular_tax_deduction > item.original_amount ||
      item.amt_deduction > item.original_amount ||
      item.remaining_unamortized > item.original_amount ||
      (item.regular_three_year_writeoff_elected &&
        item.regular_tax_deduction !== item.amt_deduction)
    ) ||
    new Set(
        circulation.map((item) =>
          item.circulation_reviewed_workpaper_reference
        ),
      ).size !== circulation.length ||
    difference !== (amount ?? 0)
  ) {
    throw new Error(
      "Form 6251 line 2o needs matching retained, reviewed circulation-cost deductions",
    );
  }
  assertRegularCirculationExpenses(circulation, pending);
}
