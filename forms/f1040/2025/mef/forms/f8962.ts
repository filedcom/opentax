import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

// ─── Field Map ────────────────────────────────────────────────────────────────
// Maps Fields keys to IRS XSD element names for IRS8962.
// Element order follows the XSD sequence for Form 8962 (Premium Tax Credit).

export interface Fields {
  // QSEHRA indicator (required by XSD; true when taxpayer has a QSEHRA)
  qsehra_ind?: boolean | null;
  // Line 1: Household size
  household_size?: number | null;
  // Line 2a: Modified AGI (household income)
  household_income?: number | null;
  // Line 2b: Federal poverty line amount
  federal_poverty_line?: number | null;
  // Line 2c: Household income as percentage of FPL (e.g. 250 = 250%)
  federal_poverty_pct?: number | null;
  // Line 11a: Total annual premium
  annual_premium?: number | null;
  // Line 11b: Annual applicable SLCSP premium
  annual_slcsp?: number | null;
  // Line 11c: Annual applicable contribution amount
  annual_applicable_contribution?: number | null;
  // Line 11d: Annual maximum premium tax credit
  annual_max_ptc?: number | null;
  // Line 11e: Annual advance payment of PTC received
  annual_aptc?: number | null;
  // Line 26: Net premium tax credit (refundable credit, if positive)
  net_premium_tax_credit?: number | null;
  // Line 29: Excess advance premium tax credit repayment (if APTC exceeded)
  excess_advance_premium?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
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

function buildIRS8962(fields: Input): string {
  // Only emit Form 8962 when there is actual PTC or excess APTC data.
  // household_income alone (from agi_aggregator routing) does not make a return
  // require Form 8962 — marketplace coverage data is needed.
  const hasPtcData = typeof fields.net_premium_tax_credit === "number" ||
    typeof fields.excess_advance_premium === "number" ||
    typeof fields.annual_premium === "number" ||
    typeof fields.household_size === "number";
  if (!hasPtcData) return "";

  // QSEHRAInd is required by XSD (no minOccurs="0") and must be first
  const qsehraInd = fields.qsehra_ind === true ? "true" : "false";
  const children = [
    element("QSEHRAInd", qsehraInd),
    ...FIELD_MAP.map(([key, tag]) => {
      const value = fields[key];
      if (typeof value !== "number") return "";
      return element(tag, value);
    }),
  ];
  return elements("IRS8962", children);
}

export const form8962: MefFormDescriptor<"form8962", Input> = {
  pendingKey: "form8962",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8962.pdf",
  build(fields) {
    return buildIRS8962(fields);
  },
};
