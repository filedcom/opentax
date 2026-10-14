export interface LikeKindExchange {
  relinquished_basis?: number;
  received_fmv?: number;
  cash_received?: number;
  other_property_fmv?: number;
  liabilities_assumed_by_buyer?: number;
  liabilities_taxpayer_assumed?: number;
  cash_paid?: number;
  exchange_expenses?: number;
}

// Form 8824 (2025), Part III. Net liabilities must be compared before adding
// cash or other boot. Expenses reduce line 15 first; any remainder goes on 18.
export function calculateLikeKindExchange(input: LikeKindExchange) {
  const cash = input.cash_received ?? 0;
  const other = input.other_property_fmv ?? 0;
  const buyerLiabilities = input.liabilities_assumed_by_buyer ?? 0;
  const taxpayerLiabilities = input.liabilities_taxpayer_assumed ?? 0;
  const cashPaid = input.cash_paid ?? 0;
  const expenses = input.exchange_expenses ?? 0;
  const netLiabilities = buyerLiabilities - taxpayerLiabilities - cashPaid;
  const bootBeforeExpenses = cash + other + Math.max(0, netLiabilities);
  const line15 = Math.max(0, bootBeforeExpenses - expenses);
  const line16 = input.received_fmv ?? 0;
  const line17 = line15 + line16;
  const line18 = (input.relinquished_basis ?? 0) +
    Math.max(0, -netLiabilities) +
    Math.max(0, expenses - bootBeforeExpenses);
  const line19 = line17 - line18;
  const line20 = Math.max(0, Math.min(line15, line19));
  const line21 = 0; // Recapture is not derivable from these inputs.
  const line22 = line20;
  const line23 = line21 + line22;
  const line24 = line19 - line23;
  const line25 = line18 + line23 - line15;
  return {
    line15,
    line16,
    line17,
    line18,
    line19,
    line20,
    line21,
    line22,
    line23,
    line24,
    line25,
  };
}

export function requiresGainStatement(input: LikeKindExchange): boolean {
  const lines = calculateLikeKindExchange(input);
  return (input.cash_received ?? 0) > 0 ||
    (input.other_property_fmv ?? 0) > 0 ||
    (input.cash_paid ?? 0) > 0 ||
    lines.line15 > 0;
}
