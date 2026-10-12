import {
  compareAtsIssuedCopyValues,
  type IssuedCopyTarget,
} from "./ty2025-issued-copy-values.ts";
import {
  SCENARIO_1040_03_FACTS,
  SCENARIO_1040_08_FACTS,
} from "./ty2025_cases.ts";

interface IssuedRetirement {
  payerName: string;
  payerEin: string;
  grossDistribution: number;
  taxableAmount: number;
  federalWithholding: number;
  distributionCode: string;
}
const target = (
  s: IssuedRetirement,
  recipient: string,
  sourcePage: number,
): IssuedCopyTarget => ({
  sourcePage,
  copyName: s.payerName,
  fields: {
    RecipientSSN: recipient,
    PayerEIN: s.payerEin,
    GrossDistributionAmt: s.grossDistribution,
    TaxableAmt: s.taxableAmount,
    FederalIncomeTaxWithheldAmt: s.federalWithholding,
    F1099RDistributionCd: s.distributionCode,
    // These four boxes are visibly unmarked on all three reviewed issued pages.
    // A Roth code does not replace the printed IRA-box answer or prove a QCD.
    CorrectedInd: false,
    TxblAmountNotDeterminedInd: false,
    TotalDistributionInd: false,
    IRASEPSIMPLEInd: false,
  },
});

export const ATS_RETIREMENT_TARGETS: Readonly<
  Record<string, readonly IssuedCopyTarget[]>
> = {
  "1040-03": [
    target(
      SCENARIO_1040_03_FACTS.form1099R,
      SCENARIO_1040_03_FACTS.taxpayer.ssn,
      4,
    ),
  ],
  "1040-08": SCENARIO_1040_08_FACTS.form1099R.map((s, i) =>
    target(s, SCENARIO_1040_08_FACTS.taxpayer.ssn, i + 4)
  ),
};

export function compareAtsRetirementValues(
  xml: string | null,
  targets: readonly IssuedCopyTarget[],
) {
  return {
    scope:
      "Issued 1099-R recipient/payer TINs, amounts, distribution codes and printed indicators; no rollover destination, QCD election, PDF or IRS-acceptance claim.",
    rows: compareAtsIssuedCopyValues(xml, targets, {
      root: "IRS1099R",
      nameField: "PayerName",
      stringPatterns: {
        RecipientSSN: /^\d{9}$/,
        PayerEIN: /^\d{9}$/,
        // Exact cached IRS1099R schema pattern; semantic code rules are separate.
        F1099RDistributionCd: /^[A-Za-z0-9]{1,2}$/,
      },
    }),
  };
}
