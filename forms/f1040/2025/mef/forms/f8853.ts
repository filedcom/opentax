import type { Form8853Fields, Form8853Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8853Fields, string]> = [
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

function buildIRS8853(fields: Form8853Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8853", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8853MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8853.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8853(pending.form8853 ?? {});
  }
}

export const form8853 = new Form8853MefNode();
