import { element, elements } from "../../../mef/xml.ts";
import {
  computeF8828Lines,
  type F8828Item,
  inputSchema,
} from "../../../nodes/inputs/f8828/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm8828Sources } from "./f8828_source_reconciliation.ts";

type Input = ReturnType<typeof inputSchema.parse>;
export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function addressXml(
  tag: string,
  address: F8828Item["property_address"],
): string {
  return elements(tag, [
    element("AddressLine1Txt", address.line1),
    element("AddressLine2Txt", address.line2),
    element("CityNm", address.city),
    element("StateAbbreviationCd", address.state),
    element("ZIPCd", address.zip),
  ]);
}

function validateFiledAmount(
  item: F8828Item,
): ReturnType<typeof computeF8828Lines> {
  const lines = computeF8828Lines(item);
  if (
    Object.values(lines).some((value) => !Number.isSafeInteger(value)) ||
    !Number.isSafeInteger(item.adjusted_gross_income) ||
    !Number.isSafeInteger(item.tax_exempt_interest) ||
    !Number.isSafeInteger(item.home_gain_included_in_gross_income)
  ) {
    throw new Error(
      "Form 8828 MeF requires safe whole-dollar source and line amounts",
    );
  }
  return lines;
}

export function reconcileForm8828(
  items: readonly F8828Item[],
  context?: MefBuildContext,
): void {
  for (const item of items) validateFiledAmount(item);
  reconcileForm8828Sources(items, context?.pending, context?.filer);
}

function buildIRS8828(item: F8828Item): string {
  const line = validateFiledAmount(item);
  const through13 = [
    addressXml("MortgSbsdyPropertyAddress", item.property_address),
    element(
      "MortgSbsdyTaxExemptBondInd",
      item.subsidy_type === "tax_exempt_bond_loan" ? "true" : undefined,
    ),
    element(
      "MortgSbsdyMortgageCrCertInd",
      item.subsidy_type === "mortgage_credit_certificate" ? "true" : undefined,
    ),
    element("MortgSbsdyCertIssuerStateCd", item.issuer_state),
    element(
      "MortgSbsdyCertIssuerSubdivNm",
      item.issuer_type === "political_subdivision"
        ? item.issuer_name
        : undefined,
    ),
    element(
      "MortgSbsdyCertIssuerAgencyNm",
      item.issuer_type === "agency" ? item.issuer_name : undefined,
    ),
    element("MortgSbsdyOrigLendingInstnNm", item.original_lender_name),
    addressXml("MortgSbsdyOrigLendingInstnAddr", item.original_lender_address),
    element("MortgSbsdyOriginalLoanClsDt", item.original_loan_closing_date),
    element("MortgSbsdySaleOrDisposClsDt", item.disposition_date),
    element("MortgSbsdyOrigClsElapsYearCnt", line.line7_full_years),
    element("MortgSbsdyOrigClsElapsMnthCnt", line.line7_full_months),
    element("MortgSbsdyOrigLoanPaymentDt", item.full_repayment_date),
    element("MortgSbsdySalesPriceIntHomeAmt", line.line9_sales_price),
    element("MortgSbsdyExpnssFromHmSaleAmt", line.line10_selling_expenses),
    element("MortgSbsdySaleOfHmRealizedAmt", line.line11_amount_realized),
    element("MortgSbsdyAdjustedBasisInHmAmt", line.line12_adjusted_basis),
    element("MortgSbsdyGainOrLossHmSaleAmt", line.line13_gain_or_loss),
  ];
  if (line.line13_gain_or_loss <= 0) return elements("IRS8828", through13);
  const through17 = [
    ...through13,
    element("MortgSbsdyGainLossAdjHmSaleAmt", line.line14_half_gain),
    element("MortgSbsdyModifiedAGIAmt", line.line15_modified_agi),
    element(
      "MortgSbsdyAdjustedQlfyIncmAmt",
      line.line16_adjusted_qualifying_income,
    ),
    element("MortgSbsdyIncomeBasisAmt", line.line17_income_excess),
  ];
  if (line.line17_income_excess <= 0) return elements("IRS8828", through17);
  return elements("IRS8828", [
    ...through17,
    element(
      "MortgSbsdyIncomePercentageRt",
      (line.line18_income_percentage / 100).toFixed(2),
    ),
    element(
      "MortgSbsdyFederallySbsdzdAmt",
      line.line19_federally_subsidized_amount,
    ),
    element(
      "MortgSbsdyHoldingPeriodRt",
      (line.line20_holding_period_percentage / 100).toFixed(2),
    ),
    element("MortgSbsdyFedSbsdzdAdjAmt", line.line21_holding_adjusted_amount),
    element("MortgSbsdyRecaptureAmt", line.line22_recapture_amount),
    element("MortgSbsdyRecaptureTaxAmt", line.line23_tax),
  ]);
}

// Staged descriptor: the public export guard remains until attachment validation.
export const form8828: MefFormDescriptor<"f8828", Input, readonly string[]> = {
  pendingKey: "f8828",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8828.pdf",
  build(fields, context) {
    const { f8828s } = inputSchema.parse(fields);
    reconcileForm8828(f8828s, context);
    return f8828s.map(buildIRS8828);
  },
};
