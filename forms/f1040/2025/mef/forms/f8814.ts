import { element, elements } from "../../../mef/xml.ts";
import type { Form8814Lines } from "../../../nodes/inputs/f8814/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = { items?: readonly Form8814Lines[] } & Record<string, unknown>;

function amount(tag: string, value: number): string {
  return value > 0 ? element(tag, value) : "";
}

function buildForm8814(
  line: Form8814Lines,
  multiple: boolean,
  statementId?: string,
): string {
  const item = line.item;
  const activePartI = line.line4 > 2_700;
  return elements("IRS8814", [
    element("ChildNm", item.child_name),
    element("ChildNameControlTxt", item.child_name_control),
    element("ChildSSN", item.child_ssn.replaceAll("-", "")),
    multiple ? element("MultipleForm8814Ind", "X") : "",
    (item.interest_income ?? 0) > 0 || item.interest_adjustments
      ? element(
        "ChildTaxableInterestAmt",
        item.interest_income ?? 0,
        statementId
          ? {
            referenceDocumentId: statementId,
            referenceDocumentName: "ChildTaxableInterestStatement",
          }
          : undefined,
      )
      : "",
    amount("ChildTaxExemptInterestAmt", item.tax_exempt_interest ?? 0),
    line.line2a > 0 || item.dividend_nominee_distribution
      ? element(
        "ChildOrdinaryDividendAmt",
        line.line2a,
        item.dividend_nominee_distribution === undefined ? undefined : {
          nomineeDistributionCd: "ND",
          nomineeDistributionAmt: String(
            Math.round(item.dividend_nominee_distribution),
          ),
        },
      )
      : "",
    amount("ChildQualifiedDividendAmt", item.qualified_dividends ?? 0),
    (item.capital_gain_distributions ?? 0) > 0 ||
      item.capital_gain_nominee_distribution
      ? element(
        "ChildCapitalGainDistriAmt",
        item.capital_gain_distributions ?? 0,
        item.capital_gain_nominee_distribution === undefined ? undefined : {
          nomineeDistributionCd: "ND",
          nomineeDistributionAmt: String(
            Math.round(item.capital_gain_nominee_distribution),
          ),
        },
      )
      : "",
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
    build(fields, context?: MefBuildContext) {
      const items = fields.items ?? [];
      const statementIds = context?.documentIdsByPendingKey
        ?.child_taxable_interest_statement ?? [];
      let statementIndex = 0;
      return items.map((line) => {
        const adjustments = line.item.interest_adjustments;
        const hasStatement = adjustments &&
          Object.values(adjustments).some((value) => value !== undefined);
        const statementId = hasStatement
          ? statementIds[statementIndex++]
          : undefined;
        return buildForm8814(line, items.length > 1, statementId);
      });
    },
  };
