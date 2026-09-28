import { element, elements } from "../../../mef/xml.ts";

/** One nonpassive current-year source retained for Part V and print mapping. */
export type Form3800NonpassiveDetailRow = {
  readonly line: "1e" | "1f" | "1h" | "1i" | "1y" | "1aa" | "4b" | "4e";
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
  "1y": "Frm8936PartIICYAggrgtAmtGrp",
  "1aa": "Frm8936PartVCYAggrgtAmtGrp",
  "4b": "Frm5884CYAggrgtAmtGrp",
  "4e": "Frm8835PartIICYSpcfdAmtGrp",
};

const sourceDocumentName: Record<Form3800NonpassiveDetailRow["line"], string> =
  {
    "1e": "IRS8826",
    "1f": "IRS8835",
    "1h": "IRS8820",
    "1i": "IRS8874",
    "1y": "IRS8936",
    "1aa": "IRS8936",
    "4b": "IRS5884",
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
    (row.passThroughEin && row.sourceDocumentId)
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
