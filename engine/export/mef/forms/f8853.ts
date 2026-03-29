import { element, elements } from "../xml.ts";
import type { Form8853Fields, Form8853Input } from "../types.ts";
export type { Form8853Input };

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8853Fields, string]> = [
  ["employer_archer_msa", "EmployerArcherMSAContriAmt"],
  ["taxpayer_archer_msa_contributions", "TxpyrArcherMSAContriAmt"],
  ["line3_limitation_amount", "ArcherMSALimitationAmt"],
  ["compensation", "CompensationAmt"],
  ["archer_msa_distributions", "ArcherMSADistributionAmt"],
  ["archer_msa_rollover", "ArcherMSARolloverAmt"],
  ["archer_msa_qualified_expenses", "ArcherMSAQualifiedExpnsAmt"],
  ["medicare_advantage_distributions", "MedcrAdvntageMSADistriAmt"],
  ["medicare_advantage_qualified_expenses", "MedcrAdvntageMSAQlfyExpnsAmt"],
  ["ltc_gross_payments", "LTCGrossPaymentsAmt"],
  ["ltc_qualified_contract_amount", "LTCQualifiedContractAmt"],
  ["ltc_accelerated_death_benefits", "LTCAcceleratedDeathBnftAmt"],
  ["ltc_period_days", "LTCPeriodDaysCnt"],
  ["ltc_actual_costs", "LTCActualCostsAmt"],
  ["ltc_reimbursements", "LTCReimbursementsAmt"],
];

export function buildIRS8853(fields: Form8853Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8853", children);
}
