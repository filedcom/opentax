import source from "./review-4852-ordinary-roth-source.json" with { type: "json" };
import type { PdfReviewFixture } from "./review-fixtures.ts";

/** Immutable synthetic corrected ordinary Roth account/source proof. */
export function ordinaryRothSubstituteReviewFixture(): PdfReviewFixture {
  return {
    id: "single-retained-4852-ordinary-roth",
    inputs: source.inputs,
    filer: source.filer as PdfReviewFixture["filer"],
    retainedSourceDocuments: source.retainedSourceDocuments.map((record) => ({
      document_reference: record.document_reference,
      bytes: Uint8Array.from(atob(record.bytesBase64), (char) => char.charCodeAt(0)),
    })),
    expectedPdfForms: ["f1040", "schedule2", "form8606", "form5329", "f4852"],
    reviewFocus: [
      "Owned ordinary non-SIMPLE Roth account records and completed4852 retain the unmarked IRA/SEP/SIMPLE checkbox",
      "Distribution7000 less eligible regular contribution basis5000 yields taxable2000 and early tax200 on8606/5329",
      "Wages125000 and Roth2000 yield AGI127000,total19747,withholding21000 and refund1253",
      "Completed4852 original/correction/workpaper/owner/account/document hashes and printed copy match exact retained bytes",
      "Synthetic retained records do not establish external issuer or signature authentication or IRS acceptance",
    ],
  };
}
