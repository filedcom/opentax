import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm3800Nonpassive,
  classifyForm8835Credits,
  type Form3800NonpassiveInput,
  type Form8835CreditEntry,
} from "../../../nodes/inputs/f3800/calculation.ts";

/** Source-backed Form 8835 credit rows, one facility per Part III line. */
export type Form3800NonpassiveXmlInput = {
  readonly tax: Form3800NonpassiveInput;
  readonly facilities: readonly Form8835CreditEntry[];
  readonly form8835DocumentIds: readonly string[];
  /** Part II credit allocated to each facility, in the same order. */
  readonly appliedCreditsByFacility: readonly number[];
  readonly transferStatementIdsByFileName: Readonly<Record<string, string>>;
};

export function buildIRS3800Nonpassive(
  input: Form3800NonpassiveXmlInput,
): string {
  const credits = classifyForm8835Credits(input.facilities);
  if (
    credits.standardCredit !== input.tax.standardCredit ||
    credits.specifiedCredit !== input.tax.specifiedCredit
  ) {
    throw new Error(
      "Form 3800 Part II credit amounts do not reconcile with Form 8835 facilities",
    );
  }
  if (
    input.facilities.length !== input.form8835DocumentIds.length ||
    input.facilities.length !== input.appliedCreditsByFacility.length ||
    input.form8835DocumentIds.some((id) => !id)
  ) {
    throw new Error(
      "Form 3800 needs a document ID and applied credit for each facility",
    );
  }
  const statementIds = credits.transferStatementFileNames.map((fileName) => {
    const id = input.transferStatementIdsByFileName[fileName];
    if (!id) {
      throw new Error(
        `Form 3800 transfer statement is not bundled: ${fileName}`,
      );
    }
    return id;
  });
  const lines = calculateForm3800Nonpassive(input.tax);
  const appliedAt = (index: number): number => {
    const amount = input.appliedCreditsByFacility[index];
    if (amount === undefined) {
      throw new Error(`Form 3800 facility ${index + 1} has no applied credit`);
    }
    return amount;
  };
  const documentIdAt = (index: number): string => {
    const id = input.form8835DocumentIds[index];
    if (!id) {
      throw new Error(
        `Form 3800 facility ${index + 1} has no Form 8835 document ID`,
      );
    }
    return id;
  };
  for (const [index, facility] of input.facilities.entries()) {
    const applied = appliedAt(index);
    const available = facility.credit_amount - facility.transfer_out_amount;
    if (!Number.isFinite(applied) || applied < 0 || applied > available) {
      throw new Error(
        `Form 3800 facility ${index + 1} has an invalid applied credit`,
      );
    }
  }
  const partVGroups: string[] = [];
  const partIIIGroups = credits.rows.map((row) => {
    const facilityIndexes = input.facilities.flatMap((facility, index) =>
      facility.form3800_line === row.line ? [index] : []
    );
    const applied = facilityIndexes.reduce(
      (sum, index) => sum + appliedAt(index),
      0,
    );
    const expected = row.line === "1f" ? lines.line17 : lines.line37;
    if (applied !== expected) {
      throw new Error(
        `Form 3800 Part III line ${row.line} does not reconcile to Part II`,
      );
    }
    const firstTransferred = row.facilities.find((facility) =>
      facility.transfer_out_amount > 0
    );
    if (row.facilityCount > 1) {
      for (const index of facilityIndexes) {
        const facility = input.facilities[index];
        if (!facility) {
          throw new Error(`Form 3800 facility ${index + 1} is missing`);
        }
        const available = facility.credit_amount - facility.transfer_out_amount;
        const facilityApplied = appliedAt(index);
        const specified = row.line === "4e";
        partVGroups.push(elements(
          specified
            ? "Frm8835PartIICYSpcfdAmtGrp"
            : "Frm8835PartIICYAggrgtAmtGrp",
          [
            facility.transfer_out_amount > 0
              ? element("TransferRegistrationNum", facility.registration_number)
              : "",
            element("OthThnCrTrnsfrElectCrNoLmtAmt", facility.credit_amount),
            facility.transfer_out_amount > 0
              ? element(
                "TrnsfrElectCrSoldNoLmtAmt",
                -facility.transfer_out_amount,
              )
              : "",
            element("TotalGeneralBusCreditsAmt", available),
            specified ? element("TotalGBCLessGrossEPEAmt", available) : "",
            element("TotalGBCLessGrossEPEAppTxAmt", facilityApplied),
            element("CarryforwardGeneralBusCrAmt", available - facilityApplied),
          ],
          {
            referenceDocumentId: documentIdAt(index),
            referenceDocumentName: specified
              ? "IRS8835 BinaryAttachment"
              : "IRS8835",
            lineNumberTxt: specified ? "Part III Line 4e" : "Part III Line 1f",
          },
        ));
      }
    }
    const firstFacilityIndex = facilityIndexes[0];
    if (firstFacilityIndex === undefined) {
      throw new Error(`Form 3800 Part III line ${row.line} has no facility`);
    }
    return {
      line: row.line,
      xml: elements(
        row.line === "1f"
          ? "Form8835PartIICYCreditsGrp"
          : "Frm8835PartIICYSpcfdCreditsGrp",
        [
          row.facilityCount > 1
            ? element("CYGeneralBusinessCrItemCnt", row.facilityCount)
            : "",
          firstTransferred
            ? element(
              "TransferRegistrationNum",
              firstTransferred.registration_number,
            )
            : "",
          element("GeneralBusCrFromNnPssvActyAmt", row.selfEarnedCredit),
          row.transferOutAmount > 0
            ? element("CreditTransferElectionAmt", -row.transferOutAmount)
            : "",
          element("TotalGeneralBusCreditsAmt", row.availableCredit),
          element("TotalGeneralBusCreditsAppTxAmt", applied),
        ],
        {
          referenceDocumentId: row.facilityCount > 1
            ? facilityIndexes.map(documentIdAt).join(" ")
            : documentIdAt(firstFacilityIndex),
          referenceDocumentName: "IRS8835",
        },
      ),
    };
  });
  const ordinaryGroup = partIIIGroups.find((group) => group.line === "1f");
  const specifiedGroup = partIIIGroups.find((group) => group.line === "4e");
  const totalRow = (
    tag: string,
    selfEarned: number,
    transferred: number,
    available: number,
    applied: number,
  ): string =>
    elements(tag, [
      element("GeneralBusCrFromNnPssvActyAmt", selfEarned),
      transferred > 0 ? element("CreditTransferElectionAmt", -transferred) : "",
      element("TotalGeneralBusCreditsAmt", available),
      element("TotalGeneralBusCreditsAppTxAmt", applied),
    ]);
  const ordinaryRow = credits.rows.find((row) => row.line === "1f");
  const specifiedRow = credits.rows.find((row) => row.line === "4e");
  const combinedSelfEarned = (ordinaryRow?.selfEarnedCredit ?? 0) +
    (specifiedRow?.selfEarnedCredit ?? 0);
  const combinedTransferred = (ordinaryRow?.transferOutAmount ?? 0) +
    (specifiedRow?.transferOutAmount ?? 0);
  return elements("IRS3800", [
    element("CAMTAndBEATInd", "false"),
    element("CreditTransferElectionInd", String(statementIds.length > 0)),
    statementIds.length > 0
      ? element("TransferElectionStatementCnt", statementIds.length, {
        referenceDocumentId: statementIds.join(" "),
        referenceDocumentName: "BinaryAttachment",
      })
      : "",
    element("GeneralBusCrFromNnPssvActyAmt", lines.line6),
    element("CYCreditsNotAllwAgainstTMTAmt", lines.line6),
    element("RegularTaxBeforeCreditsAmt", lines.line7),
    element("AlternativeMinimumTaxAmt", lines.line8),
    element("AdjustedRegTaxBeforeCreditAmt", lines.line9),
    element("ForeignTaxCreditAmt", lines.line10a),
    element("CertainAllowableCreditsAmt", lines.line10b),
    element("TotalTaxCreditsAmt", lines.line10c),
    element("NetIncomeTaxAmt", lines.line11),
    element("NetRegularTaxAmt", lines.line12),
    element("ExcessNetRegularTaxAmt", lines.line13),
    element("TentativeMinimumTaxAmt", lines.line14),
    element("AdjustedExcessNetRegularTaxAmt", lines.line15),
    element("AdjustedNetIncomeTaxAmt", lines.line16),
    element("SmllrCYNotAllwTMTOrTotAdjAmt", lines.line17),
    element("NetIncomeTaxLessPctExcessAmt", lines.line27),
    element("SumSmllrEmpwrZnEmplmnCrAmt", lines.line28),
    element("NetSmllrAndEmpwrZnEmplmnCrAmt", lines.line29),
    element("AllwGenBusCrFromNonPssvActyAmt", lines.line36),
    element("TotAllwGenAndEligSmllBusCrAmt", lines.line36),
    element("SmllrGenBusCrOrTotGenEligCrAmt", lines.line37),
    element("CurrentYearCreditAllowedAmt", lines.line38),
    ordinaryGroup?.xml ?? "",
    ordinaryRow
      ? totalRow(
        "GenBusCYCreditsSubTotGrp",
        ordinaryRow.selfEarnedCredit,
        ordinaryRow.transferOutAmount,
        ordinaryRow.availableCredit,
        lines.line17,
      )
      : "",
    specifiedGroup?.xml ?? "",
    specifiedRow
      ? totalRow(
        "GenBusCYCreditsSubTot2Grp",
        specifiedRow.selfEarnedCredit,
        specifiedRow.transferOutAmount,
        specifiedRow.availableCredit,
        lines.line37,
      )
      : "",
    totalRow(
      "TotGenBusCYCreditAmtGrp",
      combinedSelfEarned,
      combinedTransferred,
      credits.standardCredit + credits.specifiedCredit,
      lines.line38,
    ),
    partVGroups.length > 0
      ? elements("GBCBreakdownCYAggrgtAmtGrp", partVGroups)
      : "",
  ]);
}
