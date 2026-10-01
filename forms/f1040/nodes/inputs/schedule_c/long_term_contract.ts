import {
  calculateScheduleCAtRiskNet,
  inputSchema as scheduleCSourceSchema,
  type ScheduleCItem,
} from "./model.ts";

/** First-year cost-to-cost AMT income from one deferred regular-tax contract. */
export function longTermContractAdjustment(item: ScheduleCItem): number {
  const paper = item.amt_long_term_contract_workpaper;
  if (!paper) return 0;
  const references = [
    paper.contract_reference,
    paper.signed_contract_reference,
    paper.cost_records_reference,
    paper.cost_estimate_review_reference,
  ];
  const hasRegularAmount = Object.entries(item).some(([key, value]) =>
    key.startsWith("line_") && typeof value === "number" && value !== 0
  );
  if (
    new Set(references).size !== references.length ||
    item.line_g_material_participation !== true ||
    item.line_f_accounting_method !== "cash" ||
    item.line_32_at_risk === "b" || item.at_risk_simplified !== undefined ||
    item.disposed_of_business === true ||
    item.amt_mining_cost_workpaper !== undefined ||
    item.amt_depletion_worksheet !== undefined ||
    (item.part_v_other_expenses?.length ?? 0) !== 0 ||
    hasRegularAmount ||
    calculateScheduleCAtRiskNet(item, 0).atRiskNet !== 0 ||
    paper.amt_allocable_costs_incurred_2025 >
      paper.amt_estimated_total_allocable_costs ||
    paper.fixed_contract_price <= paper.amt_estimated_total_allocable_costs
  ) {
    throw new Error(
      "Form 6251 long-term contract needs one active, uncompleted Schedule C contract with distinct reviewed records and no regular 2025 receipts or deductions",
    );
  }
  const amtGross = Math.round(
    paper.fixed_contract_price * paper.amt_allocable_costs_incurred_2025 /
      paper.amt_estimated_total_allocable_costs,
  );
  const amtProfit = amtGross - paper.amt_allocable_costs_incurred_2025;
  if (!Number.isSafeInteger(amtGross) || amtProfit <= 0) {
    throw new Error(
      "Form 6251 long-term contract needs positive whole-dollar AMT income",
    );
  }
  return amtProfit;
}

/** Replay Form 6251 line 2p against the source and final Schedule C join. */
export function assertForm6251LongTermContractSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const parsed = scheduleCSourceSchema.safeParse(pending?.schedule_c);
  const items = parsed.success ? parsed.data.schedule_cs : [];
  const contracts = items.filter((item) =>
    item.amt_long_term_contract_workpaper !== undefined
  );
  const filed = fields.line2p_long_term_contracts;
  if (
    (filed === undefined || filed === null || filed === 0) &&
    contracts.length === 0
  ) return;
  if (
    !parsed.success || items.length !== 1 || contracts.length !== 1 ||
    typeof filed !== "number" ||
    filed !== longTermContractAdjustment(contracts[0]) ||
    (parsed.data.line1_gross_receipts ?? 0) !== 0 ||
    (parsed.data.statutory_wages ?? 0) !== 0 ||
    (parsed.data.line_30_home_office ?? 0) !== 0 ||
    (parsed.data.line16a_interest_mortgage ?? 0) !== 0 ||
    (parsed.data.line_9_car_truck_expenses ?? 0) !== 0 ||
    (parsed.data.line_12_depletion ?? 0) !== 0 ||
    (parsed.data.f1099m_receipt_sources?.length ?? 0) !== 0 ||
    (parsed.data.f1099nec_receipt_sources?.length ?? 0) !== 0 ||
    (parsed.data.f1099k_receipt_sources?.length ?? 0) !== 0 ||
    (parsed.data.attorney_fee_sources?.length ?? 0) !== 0 ||
    (parsed.data.section481a_adjustments?.length ?? 0) !== 0 ||
    (parsed.data.wotc_wage_reductions?.length ?? 0) !== 0 ||
    parsed.data.form8829_line30 !== undefined ||
    (pending?.schedule1 as Record<string, unknown> | undefined)
        ?.line3_schedule_c !== 0
  ) {
    throw new Error(
      "Form 6251 line 2p needs the retained contract workpaper and zero regular Schedule C income",
    );
  }
}
