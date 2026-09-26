import { element, elements } from "../../../mef/xml.ts";
import type { Form8814Lines } from "../../../nodes/inputs/f8814/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Input = { items?: readonly Form8814Lines[] } & Record<string, unknown>;

function amount(tag: string, value: number): string {
  return value > 0 ? element(tag, value) : "";
}

function buildForm8814(line: Form8814Lines, multiple: boolean): string {
  const item = line.item;
  const activePartI = line.line4 > 2_700;
  return elements("IRS8814", [
    element("ChildNm", item.child_name),
    element("ChildNameControlTxt", item.child_name_control),
    element("ChildSSN", item.child_ssn.replaceAll("-", "")),
    multiple ? element("MultipleForm8814Ind", "X") : "",
    amount("ChildTaxableInterestAmt", item.interest_income ?? 0),
    amount("ChildTaxExemptInterestAmt", item.tax_exempt_interest ?? 0),
    amount("ChildOrdinaryDividendAmt", line.line2a),
    amount("ChildQualifiedDividendAmt", item.qualified_dividends ?? 0),
    amount("ChildCapitalGainDistriAmt", item.capital_gain_distributions ?? 0),
    element("ChildInvestmentIncomeAmt", line.line4),
    activePartI ? element("ChildNetInvestmentIncomeAmt", line.line6) : "",
    activePartI && line.line7 > 0
      ? element("ChildQualifiedDividendPct", line.line7.toFixed(5))
      : "",
    activePartI && line.line8 > 0
      ? element("ChildCapitalGainDistriPct", line.line8.toFixed(5))
      : "",
    activePartI ? amount("ChildQualifiedDividendAdjAmt", line.line9) : "",
    activePartI ? amount("ChildCapitalGainDistriAdjAmt", line.line10) : "",
    activePartI ? element("ChildTaxBasisAdjustmentSumAmt", line.line11) : "",
    activePartI ? element("ChildNetAdjustedIncomeAmt", line.line12) : "",
    element("ChildInterestAndDivTaxBasisAmt", line.line14),
    line.line14 < 1_350 ? element("ChildTaxBasisUnderSpcfdAmtInd", "true") : "",
    amount("ChildInterestAndDividendTaxAmt", line.line15),
  ]);
}

export const form8814: MefFormDescriptor<"form8814", Input, readonly string[]> =
  {
    pendingKey: "form8814",
    FIELD_MAP: [],
    pdfUrl: "https://www.irs.gov/pub/irs-prior/f8814--2025.pdf",
    build(fields) {
      const items = fields.items ?? [];
      return items.map((line) => buildForm8814(line, items.length > 1));
    },
  };
