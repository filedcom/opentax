import type { Form8962Fields, Form8962Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";
import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

// ─── Field Map ────────────────────────────────────────────────────────────────
// Maps Form8962Fields keys to IRS XSD element names for IRS8962.
// Element order follows the XSD sequence for Form 8962 (Premium Tax Credit).

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8962Fields, string]> = [
  ["household_size", "ExemptionNumber"],
  ["household_income", "HouseholdIncomeAmt"],
  ["federal_poverty_line", "FederalPovertyLineAmt"],
  ["federal_poverty_pct", "HouseholdIncomeAsPercentageOfFPL"],
  ["annual_premium", "TotalPremiumAmt"],
  ["annual_slcsp", "AnnualApplicableSLCSPAmt"],
  ["annual_applicable_contribution", "ApplicableFigureAmt"],
  ["annual_max_ptc", "AnnualMaximumPremiumTaxCreditAmt"],
  ["annual_aptc", "TotalAdvancePaymentPTCAmt"],
  ["net_premium_tax_credit", "PremiumTaxCreditAmt"],
  ["excess_advance_premium", "ExcessAdvancePremiumTaxCreditRepayAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS8962(fields: Form8962Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8962", children);
}

// ─── MEF Node ─────────────────────────────────────────────────────────────────

class Form8962MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8962.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8962(pending.form8962 ?? {});
  }
}

export const form8962 = new Form8962MefNode();
