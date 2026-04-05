import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  // Internal tracking fields written by Schedule C/F nodes (not IRS8995 elements)
  qbi_from_schedule_c?: number | null;
  qbi_from_schedule_f?: number | null;
  // IRS8995 aggregated totals (valid XSD elements)
  qbi?: number | null;
  taxable_income?: number | null;
  net_capital_gain?: number | null;
  qbi_loss_carryforward?: number | null;
  reit_loss_carryforward?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Tag names verified against IRS8995.xsd (2025v3.0).
// Fields qbi_from_schedule_c and qbi_from_schedule_f are INTERNAL tracking
// fields only — they have no corresponding IRS8995 element. They are excluded
// from FIELD_MAP. The per-business data belongs inside QualifiedBusinessIncomeDedGrp
// (a nested repeating group requiring SSN/PersonNm + QlfyBusinessIncomeOrLossAmt),
// which requires a more complex builder that is tracked separately.
//
// Tag corrections from original:
//   qbi → TotQualifiedBusinessIncomeAmt (was QualifiedBusinessIncomeAmt — not in XSD)
//   taxable_income → TaxableIncomeBeforeQBIDedAmt (was TaxableIncomeAmt — not in XSD)
//   qbi_loss_carryforward → TotQlfyBusLossCarryforwardAmt (was QBILossCarryforwardAmt)
//   reit_loss_carryforward → TotQlfyREITDivPTPLossCfwdAmt (was REITLossCarryforwardAmt)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["qbi", "TotQualifiedBusinessIncomeAmt"],
  ["net_capital_gain", "NetCapitalGainAmt"],
  ["taxable_income", "TaxableIncomeBeforeQBIDedAmt"],
  ["qbi_loss_carryforward", "TotQlfyBusLossCarryforwardAmt"],
  ["reit_loss_carryforward", "TotQlfyREITDivPTPLossCfwdAmt"],
];

// IRS8995 has a nested structure: each business gets a QualifiedBusinessIncomeDedGrp
// containing PersonNm/SSN/EIN + QlfyBusinessIncomeOrLossAmt. The per-source tracking
// fields (qbi_from_schedule_c etc.) are internal only and cannot be emitted as
// top-level IRS8995 elements.
//
// Only emit IRS8995 when we have aggregated total fields that map to valid XSD
// top-level elements. The per-source tracking fields alone are not sufficient.
function buildIRS8995(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  const hasContent = children.some((c) => c !== "");
  if (!hasContent) return "";
  return elements("IRS8995", children);
}

export const form8995: MefFormDescriptor<"form8995", Input> = {
  pendingKey: "form8995",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8995.pdf",
  build(fields) {
    return buildIRS8995(fields);
  },
};
