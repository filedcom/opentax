import {
  calculateScheduleCAtRiskNet,
  inputSchema as scheduleCSourceSchema,
  type ScheduleCItem,
  wotcReductionsByBusiness,
} from "./model.ts";

/** One identified current-year Schedule C expense, with ten-year AMT cost. */
export function miningCostAdjustment(item: ScheduleCItem): number {
  const workpaper = item.amt_mining_cost_workpaper;
  if (!workpaper) return 0;
  if (
    item.line_g_material_participation !== true ||
    item.line_32_at_risk === "b" || item.at_risk_simplified !== undefined ||
    item.disposed_of_business === true
  ) {
    throw new Error(
      "Form 6251 mining costs need a nonpassive, unlimited continuing Schedule C activity",
    );
  }
  const matches = (item.part_v_other_expenses ?? []).filter((expense) =>
    expense.description === workpaper.expense_description
  );
  const expense = matches[0]?.amount;
  if (
    matches.length !== 1 || expense === undefined ||
    !Number.isInteger(expense) || expense <= 0 || expense % 10 !== 0 ||
    !/^2025-\d{2}-\d{2}$/.test(workpaper.paid_or_incurred_date) ||
    Number.isNaN(Date.parse(workpaper.paid_or_incurred_date)) ||
    new Date(workpaper.paid_or_incurred_date).toISOString().slice(0, 10) !==
      workpaper.paid_or_incurred_date
  ) {
    throw new Error(
      "Form 6251 mining costs need one identified 2025 Schedule C Part V expense divisible into ten annual AMT deductions",
    );
  }
  return expense - expense / 10;
}

/** Replay line 2q against the original expense and finalized Schedule C join. */
export function assertForm6251MiningSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const parsed = scheduleCSourceSchema.safeParse(pending?.schedule_c);
  const items = parsed.success ? parsed.data.schedule_cs : [];
  const mining = items.filter((item) => item.amt_mining_cost_workpaper);
  const filed = fields.line2q_mining_costs;
  if (
    (filed === undefined || filed === null || filed === 0) &&
    mining.length === 0
  ) {
    return;
  }
  if (
    !parsed.success || items.length !== 1 || mining.length !== 1 ||
    typeof filed !== "number" ||
    filed !== miningCostAdjustment(mining[0]) ||
    (pending?.schedule1 as Record<string, unknown> | undefined)
        ?.line3_schedule_c !== calculateScheduleCAtRiskNet(
          mining[0],
          wotcReductionsByBusiness(parsed.data).get(
            mining[0].business_reference ?? "",
          ) ?? 0,
        ).atRiskNet
  ) {
    throw new Error(
      "Form 6251 line 2q needs the retained mining workpaper, named Schedule C expense, and finalized Schedule 1 business income",
    );
  }
}
