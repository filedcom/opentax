import { element, elements } from "../../../../../mef/xml.ts";
import { reconcileForm4952DividendPath } from "../../../../domains/deductions/form4952/form4952_dividend_reconciliation.ts";
import { reconcileForm4952InterestPath } from "../../../../domains/deductions/form4952/form4952_interest_reconciliation.ts";
import { reconcileForm4952CombinedPath } from "../../../../domains/deductions/form4952/form4952_combined_reconciliation.ts";
import { reconcileForm4952PartnershipPath } from "../../../../domains/deductions/form4952/form4952_partnership_reconciliation.ts";
import { reconcileForm4952K1InterestAgainst1099Path } from "../../../../domains/deductions/form4952/form4952_k1_1099int_reconciliation.ts";
import { reconcileForm4952K1InterestAgainst1099DivPath } from "../../../../domains/deductions/form4952/form4952_k1_1099div_reconciliation.ts";
import { reconcileForm4952MiscRoyaltyPath } from "../../../../domains/deductions/form4952/form4952_misc_royalty_reconciliation.ts";
import { assertForm4952K1Recipients } from "../../../../domains/deductions/form4952/form4952_k1_recipient.ts";
import {
  hasForm4952K1CodeB,
  reconcileForm4952K1CodeBRoyaltyPath,
} from "../../../../domains/deductions/form4952/form4952_k1_code_b_reconciliation.ts";
import { reconcileForm4952DirectDebtExport } from "../../../../domains/deductions/form4952/form4952_debt_reconciliation.ts";
import {
  hasForm4952PriorCarryforward,
  reconcileForm4952PriorCarryforward,
} from "../../../../domains/deductions/form4952/form4952_prior_carryforward_reconciliation.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";
import { FilingStatus } from "../../../types.ts";
import { reconcileForm4952ScheduleJChildDividend } from "../../../../domains/deductions/form4952/form4952_schedulej_child_reconciliation.ts";
import { reconcileForm4952PabAmt } from "../../../../domains/deductions/form4952/form4952_pab_amt_reconciliation.ts";

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
    if (hasForm4952K1CodeB(fields, context?.pending ?? {})) {
      if (!context?.filer) {
        throw new Error("Form 4952 K-1 code B needs final filer identity");
      }
      assertForm4952K1Recipients(context.pending ?? {}, context.filer);
      reconcileForm4952K1CodeBRoyaltyPath(fields, context.pending ?? {});
      throw new Error(
        "Form 4952 K-1 code B export needs verified issued supplement and deduction-limitation source bytes",
      );
    }
    if (hasForm4952PriorCarryforward(fields, context?.pending ?? {})) {
      reconcileForm4952PriorCarryforward(
        fields,
        context?.pending ?? {},
        context?.filer?.primarySSN,
      );
      if (!context?.filer) {
        throw new Error(
          "Form 4952 prior carryforward needs final filer identity",
        );
      }
      throw new Error(
        "Form 4952 prior carryforward export needs authenticated accepted 2024 filing and verified source bytes",
      );
    }
    if (
      fields.source_private_activity_bond_interest === undefined &&
      (fields.direct_debt_trace !== undefined ||
        (context?.pending?.form4952 as Record<string, unknown> | undefined)
            ?.direct_debt_trace !== undefined)
    ) {
      reconcileForm4952DirectDebtExport(
        fields,
        context?.pending ?? {},
        context?.filer?.primarySSN,
        context?.filer?.filingStatus === FilingStatus.MarriedFilingJointly
          ? context.filer.spouse?.ssn
          : undefined,
      );
      if (!context?.filer) {
        throw new Error(
          "Form 4952 direct debt export needs final filer identity",
        );
      }
    }
    if (fields.source_k1_investment_interest !== undefined) {
      if (!context?.filer) {
        throw new Error("Form 4952 K-1 source needs final filer identity");
      }
      assertForm4952K1Recipients(context.pending ?? {}, context.filer);
    }
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
      fields.source_k1_investment_interest !== undefined
    ) {
      reconcileForm4952K1InterestAgainst1099DivPath(
        fields,
        context?.pending ?? {},
      );
    } else if (
      fields.source_1099_dividends !== undefined &&
      fields.source_1099_interest !== undefined
    ) {
      reconcileForm4952CombinedPath(fields, context?.pending ?? {});
    } else if (
      fields.source_1099_dividends !== undefined &&
      context?.pending?.schedule_j !== undefined &&
      context?.pending?.form8814 !== undefined
    ) {
      reconcileForm4952ScheduleJChildDividend(
        fields,
        context.pending,
        context.filer?.primarySSN,
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
    } else if (fields.source_private_activity_bond_interest !== undefined) {
      reconcileForm4952PabAmt(
        fields,
        context?.pending ?? {},
        context?.filer?.primarySSN,
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
        if (typeof value !== "number") return "";
        const specialElection = key === "line4e" &&
          context?.pending?.schedule_j !== undefined &&
          context?.pending?.form8814 !== undefined &&
          typeof fields.elected_capital_gain_portion === "number" &&
          typeof fields.line4g === "number" &&
          fields.line4g > 0 &&
          fields.elected_capital_gain_portion <
            Math.min(fields.line4g, value);
        return element(
          tag,
          value,
          specialElection
            ? {
              investmentPropGainElectedCd: "ELEC",
              investmentPropGainElectedAmt: String(
                fields.elected_capital_gain_portion,
              ),
            }
            : undefined,
        );
      }),
    );
  },
};
