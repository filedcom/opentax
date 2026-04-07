import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  // Filing status — determines threshold code for AdditionalTaxGrp
  filing_status?: string | null;
  // Part I (inside AdditionalTaxGrp > AdditionalMedicareTaxGrp)
  medicare_wages?: number | null;
  unreported_tips?: number | null;
  wages_8919?: number | null;
  // Part II (inside AdditionalTaxGrp > AddnlSelfEmploymentTaxGrp)
  se_income?: number | null;
  // Part III (inside AdditionalTaxGrp > AddnlRailroadRetirementTaxGrp)
  rrta_wages?: number | null;
  // Part V (outside AdditionalTaxGrp — top level of IRS8959)
  medicare_withheld?: number | null;
  rrta_medicare_withheld?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Additional Medicare Tax rate (0.9%)
const AMT_RATE = 0.009;

// XSD threshold amounts and codes by filing status
function thresholdAmount(filingStatus: string | null | undefined): number {
  if (filingStatus === "mfj" || filingStatus === "MFJ") return 250_000;
  if (filingStatus === "mfs" || filingStatus === "MFS") return 125_000;
  return 200_000; // Single, HOH, QSS
}

function thresholdCode(filingStatus: string | null | undefined): string {
  return String(thresholdAmount(filingStatus));
}

// Build AdditionalMedicareTaxGrp (Part I) with all required computed fields
function buildAdditionalMedicareTaxGrp(fields: Input, threshold: number): string {
  const hasWages = typeof fields.medicare_wages === "number";
  const hasTips = typeof fields.unreported_tips === "number";
  const hasWages8919 = typeof fields.wages_8919 === "number";
  // Only emit if any Part I wage/tip source is explicitly provided
  if (!hasWages && !hasTips && !hasWages8919) return "";

  const wages = hasWages ? (fields.medicare_wages as number) : 0;
  const tips = hasTips ? (fields.unreported_tips as number) : 0;
  const wages8919 = hasWages8919 ? (fields.wages_8919 as number) : 0;

  // Line 4: total Medicare wages + tips (required)
  const line4 = wages + tips + wages8919;
  // Line 6: excess above threshold (required)
  const line6 = Math.max(0, line4 - threshold);
  // Line 7: additional Medicare tax (required)
  const line7 = Math.round(line6 * AMT_RATE * 100) / 100;

  const parts: string[] = [];
  if (hasWages) parts.push(element("TotalW2MedicareWagesAndTipsAmt", wages));
  if (hasTips) parts.push(element("TotalUnreportedMedicareTipsAmt", tips));
  if (hasWages8919) parts.push(element("TotalWagesWithNoWithholdingAmt", wages8919));
  parts.push(element("TotalMedicareWagesAndTipsAmt", line4));
  // FilingStatusThresholdCd is on AdditionalTaxGrp, not here
  parts.push(element("WagesTipsSubjToAddlMedcrTaxAmt", line6));
  parts.push(element("AdditionalMedicareTaxAmt", line7));

  return elements("AdditionalMedicareTaxGrp", parts);
}

// Build AddnlSelfEmploymentTaxGrp (Part II) — only if se_income present
function buildAddnlSelfEmploymentTaxGrp(fields: Input): string {
  if (typeof fields.se_income !== "number") return "";
  return elements("AddnlSelfEmploymentTaxGrp", [
    element("TotalSelfEmploymentIncomeAmt", fields.se_income),
  ]);
}

// Build AddnlRailroadRetirementTaxGrp (Part III) — only if rrta_wages present
function buildAddnlRailroadRetirementTaxGrp(fields: Input): string {
  if (typeof fields.rrta_wages !== "number") return "";
  return elements("AddnlRailroadRetirementTaxGrp", [
    element("TotalRailroadRetirementCompAmt", fields.rrta_wages),
  ]);
}

// Build AdditionalTaxGrp wrapper (Parts I-III) with required TotalAMRRTTaxAmt
function buildAdditionalTaxGrp(fields: Input): string {
  const threshold = thresholdAmount(fields.filing_status as string | null);
  const medicarePart = buildAdditionalMedicareTaxGrp(fields, threshold);
  const sePart = buildAddnlSelfEmploymentTaxGrp(fields);
  const rrtaPart = buildAddnlRailroadRetirementTaxGrp(fields);
  if (!medicarePart && !sePart && !rrtaPart) return "";

  // TotalAMRRTTaxAmt (line 18) = sum of part I line 7 + part II line 13 + part III line 17
  // For the MeF builder we approximate from available data (0 if not computable)
  const code = thresholdCode(fields.filing_status as string | null);
  const wages = typeof fields.medicare_wages === "number" ? fields.medicare_wages : 0;
  const tips = typeof fields.unreported_tips === "number" ? fields.unreported_tips : 0;
  const wages8919 = typeof fields.wages_8919 === "number" ? fields.wages_8919 : 0;
  const line4 = wages + tips + wages8919;
  const medicareExcess = Math.max(0, line4 - threshold);
  const medicareTax = Math.round(medicareExcess * AMT_RATE * 100) / 100;

  const seIncome = typeof fields.se_income === "number" ? Math.max(0, fields.se_income) : 0;
  const seThreshold = Math.max(0, threshold - line4);
  const seExcess = Math.max(0, seIncome - seThreshold);
  const seTax = Math.round(seExcess * AMT_RATE * 100) / 100;

  const rrtaWages = typeof fields.rrta_wages === "number" ? fields.rrta_wages : 0;
  const rrtaExcess = Math.max(0, rrtaWages - threshold);
  const rrtaTax = Math.round(rrtaExcess * AMT_RATE * 100) / 100;

  const totalTax = Math.round((medicareTax + seTax + rrtaTax) * 100) / 100;

  return elements("AdditionalTaxGrp", [
    element("FilingStatusThresholdCd", code),
    medicarePart,
    sePart,
    rrtaPart,
    element("TotalAMRRTTaxAmt", totalTax),
  ]);
}

function buildIRS8959(fields: Input): string {
  const additionalTaxGrp = buildAdditionalTaxGrp(fields);
  const withheldParts: string[] = [];
  if (typeof fields.medicare_withheld === "number") {
    withheldParts.push(element("TotalW2MedicareTaxWithheldAmt", fields.medicare_withheld));
  }
  if (typeof fields.rrta_medicare_withheld === "number") {
    withheldParts.push(element("TotalW2AddlRRTTaxAmt", fields.rrta_medicare_withheld));
  }
  const hasContent = additionalTaxGrp !== "" || withheldParts.length > 0;
  if (!hasContent) return "";
  return elements("IRS8959", [additionalTaxGrp, ...withheldParts]);
}

// FIELD_MAP is kept for interface compatibility but the builder uses custom nesting logic.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["medicare_wages", "TotalW2MedicareWagesAndTipsAmt"],
  ["unreported_tips", "TotalUnreportedMedicareTipsAmt"],
  ["wages_8919", "TotalWagesWithNoWithholdingAmt"],
  ["se_income", "TotalSelfEmploymentIncomeAmt"],
  ["rrta_wages", "TotalRailroadRetirementCompAmt"],
  ["medicare_withheld", "TotalW2MedicareTaxWithheldAmt"],
  ["rrta_medicare_withheld", "TotalW2AddlRRTTaxAmt"],
];

export const form8959: MefFormDescriptor<"form8959", Input> = {
  pendingKey: "form8959",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8959.pdf",
  build(fields) {
    return buildIRS8959(fields);
  },
};
