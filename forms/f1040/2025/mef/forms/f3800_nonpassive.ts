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
  if (input.facilities.length !== input.form8835DocumentIds.length) {
    throw new Error("Form 3800 needs one Form 8835 document ID per facility");
  }
  if (credits.rows.some((row) => row.facilityCount > 1)) {
    throw new Error(
      "Form 3800 multiple same-line facilities need Part V detail",
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
  const facilityGroups = credits.rows.map((row) => {
    const facility = row.facilities[0];
    const facilityIndex = input.facilities.indexOf(facility);
    const registration = row.transferOutAmount > 0
      ? element("TransferRegistrationNum", facility.registration_number)
      : "";
    const applied = row.line === "1f" ? lines.line17 : lines.line37;
    return elements(
      row.line === "1f"
        ? "Form8835PartIICYCreditsGrp"
        : "Frm8835PartIICYSpcfdCreditsGrp",
      [
        registration,
        element("GeneralBusCrFromNnPssvActyAmt", row.selfEarnedCredit),
        row.transferOutAmount > 0
          ? element("CreditTransferElectionAmt", -row.transferOutAmount)
          : "",
        element("TotalGeneralBusCreditsAmt", row.availableCredit),
        element("TotalGeneralBusCreditsAppTxAmt", applied),
      ],
      {
        referenceDocumentId: input.form8835DocumentIds[facilityIndex],
        referenceDocumentName: "IRS8835",
      },
    );
  });
  const ordinaryGroup = credits.rows.find((row) => row.line === "1f");
  const specifiedGroup = credits.rows.find((row) => row.line === "4e");
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
    ordinaryGroup
      ? facilityGroups.find((group) =>
        group.startsWith("<Form8835PartIICYCreditsGrp")
      ) ?? ""
      : "",
    specifiedGroup
      ? facilityGroups.find((group) =>
        group.startsWith("<Frm8835PartIICYSpcfdCreditsGrp")
      ) ?? ""
      : "",
  ]);
}
