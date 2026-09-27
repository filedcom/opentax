export interface ScheduleBFilingFacts {
  taxableInterest: number;
  ordinaryDividends: number;
  sellerFinancedInterest: boolean;
  nomineeInterest: number;
  accruedInterest: number;
  oidAdjustment: number;
  bondPremiumAdjustment: number;
  savingsBondExclusion: number;
  nomineeDividends: number;
  foreignAccount: boolean;
  foreignTrust: boolean;
}

// 2025 Schedule B general instructions. The $1,500 tests are independent:
// taxable interest and ordinary dividends are not added together.
export function scheduleBFilingRequired(facts: ScheduleBFilingFacts): boolean {
  return facts.taxableInterest > 1_500 ||
    facts.ordinaryDividends > 1_500 ||
    facts.sellerFinancedInterest ||
    facts.nomineeInterest > 0 ||
    facts.accruedInterest > 0 ||
    facts.oidAdjustment > 0 ||
    facts.bondPremiumAdjustment > 0 ||
    facts.savingsBondExclusion > 0 ||
    facts.nomineeDividends > 0 ||
    facts.foreignAccount ||
    facts.foreignTrust;
}
