import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8912IndividualLimit,
  calculateForm8912PartIVBond,
  deriveForm8912IndividualLimitInput,
  type Form8912FinalizedReturnLines,
} from "../../../nodes/inputs/f8912/calculation.ts";
import {
  type F8912UnreportedBond,
  interestFromItem,
  itemSchema,
  partIVRowInput,
  sourceLinesFromItem,
} from "../../../nodes/inputs/f8912/index.ts";

// An unregistered document builder. Return assembly must derive Part II from
// finalized return credits and attach this document before it may file.
export function buildForm8912Document(
  rawItem: unknown,
  finalizedReturn: Form8912FinalizedReturnLines,
): string {
  const item = itemSchema.parse(rawItem);
  if (item.reported_bonds.length > 99 || item.unreported_bonds.length > 99) {
    throw new Error(
      "Form 8912 MeF supports at most 99 Part III or Part IV bond groups",
    );
  }
  const source = sourceLinesFromItem(item);
  interestFromItem(item);
  const limit = calculateForm8912IndividualLimit(
    deriveForm8912IndividualLimitInput(source, finalizedReturn),
  );
  if (source.hasPassThroughCrebCredit) {
    throw new Error(
      "Form 8912 pass-through CREB credit needs its separate taxable-income limit",
    );
  }
  if (Math.abs(finalizedReturn.schedule3Line6k - limit.line12) > 0.000001) {
    throw new Error(
      "Form 8912 line 12 must reconcile to finalized Schedule 3 line 6k",
    );
  }

  let line19 = 0;
  const partIV = item.unreported_bonds.map((bond) => {
    const details = bond.line18_rows.map((row) => {
      const sourceRow = partIVRowInput(bond, row);
      const lines = calculateForm8912PartIVBond(sourceRow);
      line19 += lines.line18f;
      return elements("BondNotRptOn1097BTCDetail", [
        element("CUSIPNum", row.cusip),
        element("PrinciplePaymentDt", row.principal_payment_date),
        element("InterestPaymentDt", row.interest_payment_date),
        element("OutstndingBondPrinAmt", row.outstanding_principal),
        element("InterestPayableAmt", row.interest_payable),
        element("CreditRt", String(row.credit_rate)),
        element("TotalBeforeOthLimitationsCrAmt", lines.line18d),
        element(
          "PercentageAmt",
          (sourceRow.creditAllowancePercentage * 100).toFixed(2),
        ),
        element("BeforeOtherLmtAllowableCrAmt", lines.line18f),
      ]);
    });
    return partIVBondXml(bond, details);
  });

  return elements("IRS8912", [
    elements("TotalForm8912BondCreditGrp", [
      element("TotalAllForm1097BTCAmt", source.line1),
      element("NewCleanEnergyBondAmt", source.line2),
    ]),
    element("CarryforwardPYBondCreditAmt", source.line3),
    element("TotalCreditAmt", limit.line4),
    element("RegularTaxBeforeCreditAmt", limit.line7),
    element("AlternativeMinimumTaxAmt", limit.line8),
    element("SumRegularTaxAndAltMinTxAmt", limit.line9),
    element("ForeignTaxCreditAmt", limit.line10a),
    element("CertainAllowableCreditsAmt", limit.line10b),
    element("GeneralBusinessCreditAmt", limit.line10c),
    element("CreditPriorYearMinimumTaxAmt", limit.line10d),
    element("TotalCreditsAmt", limit.line10e),
    element("NetIncomeTaxAmt", limit.line11),
    element("CurrentYearAllowableCreditAmt", limit.line12),
    ...item.reported_bonds.map((bond) =>
      elements("BondInformation", [
        elements("BondIssuerName", [
          element("BusinessNameLine1Txt", bond.issuer_name),
        ]),
        element("BondIssuerEIN", bond.issuer_ein),
        element("UniqueId", bond.unique_identifier),
        element("Form1097BTCAmt", bond.credit_amount),
      ])
    ),
    element("TotalAllForm1097BTCAmt", source.line1),
    ...partIV,
    element("TotalOtherNotRptF1097BTCAmt", line19),
    element("NewCleanEnergyBondAmt", source.line2),
  ]);
}

function partIVBondXml(
  bond: F8912UnreportedBond,
  details: readonly string[],
): string {
  return elements("BondNotOnForm1097BTCGrp", [
    elements("BondIssuerName", [
      element("BusinessNameLine1Txt", bond.issuer_name),
    ]),
    element("CityNm", bond.issuer_city),
    element("StateAbbreviationCd", bond.issuer_state),
    element("BondIssuerEIN", bond.issuer_ein),
    element("BondIssueDt", bond.issue_date),
    element("BondMaturityDt", bond.maturity_date),
    element("BondDisposedDt", bond.disposition_date),
    ...details,
  ]);
}
