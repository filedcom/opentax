import { element, elements } from "../../../mef/xml.ts";
import { reconcileForm4952DividendPath } from "../../form4952_dividend_reconciliation.ts";
import { reconcileForm4952InterestPath } from "../../form4952_interest_reconciliation.ts";
import { reconcileForm4952CombinedPath } from "../../form4952_combined_reconciliation.ts";
import { reconcileForm4952PartnershipPath } from "../../form4952_partnership_reconciliation.ts";
import { reconcileForm4952K1InterestAgainst1099Path } from "../../form4952_k1_1099int_reconciliation.ts";
import { reconcileForm4952K1InterestAgainst1099DivPath } from "../../form4952_k1_1099div_reconciliation.ts";
import { reconcileForm4952MiscRoyaltyPath } from "../../form4952_misc_royalty_reconciliation.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line1?: number | null;
  line2?: number | null;
  line3?: number | null;
  line4a?: number | null;
  line4b?: number | null;
  line4c?: number | null;
  line4d?: number | null;
  line4e?: number | null;
  line4f?: number | null;
  line4g?: number | null;
  line4h?: number | null;
  line5?: number | null;
  line6?: number | null;
  line7?: number | null;
  line8?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Exact sequence and names from TY2025v5.4 IRS4952.xsd.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line1", "InvestmentInterestExpenseAmt"],
  ["line2", "PriorYrDisallowInvsmtIntExpAmt"],
  ["line3", "TotalInvestmentInterestExpAmt"],
  ["line4a", "InvestmentPropGrossIncomeAmt"],
  ["line4b", "InvestmentPropQualDividendsAmt"],
  ["line4c", "InvestmentPropNetGrossIncAmt"],
  ["line4d", "InvestmentPropNetDispGainAmt"],
  ["line4e", "PropertyDspstnCapGainInvIncAmt"],
  ["line4f", "InvestmentNetGainLessSmallAmt"],
  ["line4g", "InvestmentIncomeElectionAmt"],
  ["line4h", "InvestmentIncomeAmt"],
  ["line5", "InvestmentExpenseAmt"],
  ["line6", "NetInvestmentIncomeAmt"],
  ["line7", "DisallowedCarryForwardExpAmt"],
  ["line8", "InvestmentInterestExpDeductAmt"],
];

export const form4952: MefFormDescriptor<"form4952", Input> = {
  pendingKey: "form4952",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4952--2025.pdf",
  build(fields, context) {
    if (
      fields.source_1099_royalties !== undefined
    ) {
      if (!context?.filer) {
        throw new Error("Form 4952 linked royalty needs filer identity");
      }
      reconcileForm4952MiscRoyaltyPath(
        fields,
        context.pending ?? {},
        context.filer,
      );
    } else if (
      fields.source_1099_dividends !== undefined &&
      fields.source_1099_interest !== undefined
    ) {
      reconcileForm4952CombinedPath(fields, context?.pending ?? {});
    } else if (
      fields.source_1099_dividends !== undefined &&
      fields.source_k1_investment_interest !== undefined
    ) {
      reconcileForm4952K1InterestAgainst1099DivPath(
        fields,
        context?.pending ?? {},
      );
    } else if (fields.source_1099_dividends !== undefined) {
      reconcileForm4952DividendPath(fields, context?.pending ?? {});
    } else if (
      fields.source_1099_interest !== undefined &&
      fields.source_k1_investment_interest !== undefined
    ) {
      reconcileForm4952K1InterestAgainst1099Path(
        fields,
        context?.pending ?? {},
      );
    } else if (fields.source_1099_interest !== undefined) {
      reconcileForm4952InterestPath(fields, context?.pending ?? {});
    } else if (
      fields.source_k1_interest !== undefined &&
      fields.source_k1_investment_interest !== undefined
    ) {
      reconcileForm4952PartnershipPath(fields, context?.pending ?? {});
    } else {
      throw new Error(
        "Form 4952 export needs a source-reconciled investment-income route",
      );
    }
    return elements(
      "IRS4952",
      FIELD_MAP.map(([key, tag]) => {
        const value = fields[key];
        return typeof value === "number" ? element(tag, value) : "";
      }),
    );
  },
};
