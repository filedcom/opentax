import { element, elements } from "../../../../../../mef/xml.ts";

/** One nonpassive current-year source retained for Part V and print mapping. */
export type Form3800NonpassiveDetailRow = {
  readonly line:
    | "1e"
    | "1f"
    | "1h"
    | "1i"
    | "1j"
    | "1k"
    | "1l"
    | "1p"
    | "1v"
    | "1y"
    | "1aa"
    | "1dd"
    | "1ee"
    | "3"
    | "4b"
    | "4h"
    | "4j"
    | "4e";
  readonly credit: number;
  readonly appliedCredit: number;
  readonly passThroughEin?: string;
  readonly transferOutCredit?: number;
  readonly transferRegistrationNumber?: string;
  readonly sourceDocumentId?: string;
};

const detailTag: Record<Form3800NonpassiveDetailRow["line"], string> = {
  "1e": "Frm8826CYAggrgtAmtGrp",
  "1f": "Frm8835PartIICYAggrgtAmtGrp",
  "1h": "Frm8820CYAggrgtAmtGrp",
  "1i": "Frm8874CYAggrgtAmtGrp",
  "1j": "Frm8881PartICYAggrgtAmtGrp",
  "1k": "Frm8882CYAggrgtAmtGrp",
  "1l": "Frm8864CYAggrgtAmtGrp",
  "1p": "Frm8908CYAggrgtAmtGrp",
  "1v": "Frm3468PartVCYAggrgtAmtGrp",
  "1y": "Frm8936PartIICYAggrgtAmtGrp",
  "1aa": "Frm8936PartVCYAggrgtAmtGrp",
  "1dd": "Frm8881PartIICYAggrgtAmtGrp",
  "1ee": "Frm8881PartIIICYAggrgtAmtGrp",
  "3": "Frm8844CYAggrgtAmtGrp",
  "4b": "Frm5884CYAggrgtAmtGrp",
  "4h": "Frm8941CYAggrgtAmtGrp",
  "4j": "Frm8994CYAggrgtAmtGrp",
  "4e": "Frm8835PartIICYSpcfdAmtGrp",
};

const sourceDocumentName: Record<Form3800NonpassiveDetailRow["line"], string> =
  {
    "1e": "IRS8826",
    "1f": "IRS8835",
    "1h": "IRS8820",
    "1i": "IRS8874",
    "1j": "IRS8881",
    "1k": "IRS8882",
    "1l": "IRS8864",
    "1p": "IRS8908",
    "1v": "IRS3468 BinaryAttachment",
    "1y": "IRS8936",
    "1aa": "IRS8936",
    "1dd": "IRS8881",
    "1ee": "IRS8881",
    "3": "IRS8844",
    "4b": "IRS5884",
    "4h": "IRS8941",
    "4j": "IRS8994",
    "4e": "IRS8835 BinaryAttachment",
  };

export function form3800NonpassiveCurrentDetailXml(
  row: Form3800NonpassiveDetailRow,
): string {
  const transferred = row.transferOutCredit ?? 0;
  const facility = row.line === "1f" || row.line === "4e";
  const specified = row.line === "1aa" || row.line === "4e";
  if (
    !Number.isFinite(row.credit) || row.credit < 0 ||
    !Number.isFinite(row.appliedCredit) || row.appliedCredit < 0 ||
    !Number.isFinite(transferred) || transferred < 0 ||
    row.appliedCredit > row.credit - transferred ||
    (!facility && (transferred !== 0 || row.transferRegistrationNumber)) ||
    (transferred > 0 && !row.transferRegistrationNumber) ||
    (row.passThroughEin !== undefined && !/^\d{9}$/.test(row.passThroughEin)) ||
    (row.passThroughEin && row.sourceDocumentId && row.line !== "1v")
  ) {
    throw new Error("Form 3800 nonpassive Part V source is invalid");
  }
  const available = row.credit - transferred;
  return elements(detailTag[row.line], [
    row.passThroughEin
      ? element("PassThroughEntityEIN", row.passThroughEin)
      : "",
    row.transferRegistrationNumber
      ? element("TransferRegistrationNum", row.transferRegistrationNumber)
      : "",
    element("OthThnCrTrnsfrElectCrNoLmtAmt", row.credit),
    transferred > 0 ? element("TrnsfrElectCrSoldNoLmtAmt", -transferred) : "",
    element("TotalGeneralBusCreditsAmt", available),
    specified ? element("TotalGBCLessGrossEPEAmt", available) : "",
    element("TotalGBCLessGrossEPEAppTxAmt", row.appliedCredit),
    element("CarryforwardGeneralBusCrAmt", available - row.appliedCredit),
  ], {
    ...(row.sourceDocumentId
      ? {
        referenceDocumentId: row.sourceDocumentId,
        referenceDocumentName: sourceDocumentName[row.line],
      }
      : {}),
    lineNumberTxt: `Part III Line ${row.line}`,
  });
}
