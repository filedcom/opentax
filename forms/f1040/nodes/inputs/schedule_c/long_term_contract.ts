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

/** Replay Form 6251 line 2p against one or two reviewed Schedule C contracts. */
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
  const multiContractReferences = contracts.flatMap((item) => [
    item.business_reference,
    item.amt_long_term_contract_workpaper!.contract_reference,
    item.amt_long_term_contract_workpaper!.signed_contract_reference,
    item.amt_long_term_contract_workpaper!.cost_records_reference,
    item.amt_long_term_contract_workpaper!.cost_estimate_review_reference,
  ]);
  const amt = fields.line11_amt;
  const schedule2 = pending?.schedule2 as Record<string, unknown> | undefined;
  const form1040 = pending?.f1040 as Record<string, unknown> | undefined;
  if (
    !parsed.success || items.length !== contracts.length ||
    contracts.length < 1 || contracts.length > 2 ||
    (contracts.length === 2 &&
      (multiContractReferences.some((reference) => !reference) ||
        new Set(multiContractReferences).size !==
          multiContractReferences.length)) ||
    typeof filed !== "number" ||
    filed !== contracts.reduce(
        (sum, item) => sum + longTermContractAdjustment(item),
        0,
      ) ||
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
        ?.line3_schedule_c !== 0 ||
    (typeof amt === "number" && amt > 0 &&
      (schedule2?.line2_amt !== amt ||
        typeof form1040?.line17_additional_taxes !== "number" ||
        Number(form1040.line17_additional_taxes) < amt))
  ) {
    throw new Error(
      "Form 6251 line 2p needs the retained contract workpaper and zero regular Schedule C income",
    );
  }
}
