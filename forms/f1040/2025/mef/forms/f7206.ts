import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  se_net_profit?: number | null;
  health_insurance_premiums?: number | null;
  ltc_premiums?: number | null;
  taxpayer_age?: number | null;
  ltc_premiums_spouse?: number | null;
  spouse_age?: number | null;
  premium_tax_credit?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["se_net_profit", "SENetProfitLossAmt"],
  ["health_insurance_premiums", "HealthInsPremPdAmt"],
  ["ltc_premiums", "LTCInsurancePremAmt"],
  ["taxpayer_age", "TaxpayerAgeNum"],
  ["ltc_premiums_spouse", "SpouseLTCInsurancePremAmt"],
  ["spouse_age", "SpouseAgeNum"],
  ["premium_tax_credit", "PremiumTaxCreditAmt"],
];

function buildIRS7206(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS7206", children);
}

export const form7206: MefFormDescriptor<"form7206", Input> = {
  pendingKey: "form7206",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f7206.pdf",
  build(fields) {
    return buildIRS7206(fields);
  },
};
