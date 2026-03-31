import type { Form7206Fields, Form7206Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

const FIELD_MAP: ReadonlyArray<readonly [keyof Form7206Fields, string]> = [
  ["se_net_profit", "SENetProfitLossAmt"],
  ["health_insurance_premiums", "HealthInsPremPdAmt"],
  ["ltc_premiums", "LTCInsurancePremAmt"],
  ["taxpayer_age", "TaxpayerAgeNum"],
  ["ltc_premiums_spouse", "SpouseLTCInsurancePremAmt"],
  ["spouse_age", "SpouseAgeNum"],
  ["premium_tax_credit", "PremiumTaxCreditAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS7206(fields: Form7206Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS7206", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form7206MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f7206.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS7206(pending.form7206 ?? {});
  }
}

export const form7206 = new Form7206MefNode();
