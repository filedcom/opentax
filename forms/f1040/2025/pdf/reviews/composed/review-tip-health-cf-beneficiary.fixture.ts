import sources from "./review-tip-health-cf-beneficiary.inputs.json" with {
  type: "json",
};
import metadata from "./review-tip-health-cf-beneficiary.metadata.json" with {
  type: "json",
};
import type { FilerIdentity } from "../../../../mef/header.ts";
import type { PdfReviewFixture } from "../../review-fixtures.ts";

/** Exact public inputs of already reviewed packets. No runtime catalog or tax-fixture imports. */
export function tipHealthCfBeneficiaryReviewFixtures(): readonly PdfReviewFixture[] {
  return metadata.map((row) => ({
    id: row.id,
    inputs: structuredClone(
      (sources as Record<string, Record<string, unknown>>)[row.id],
    ),
    filer: structuredClone(row.filer) as FilerIdentity,
    expectedPdfForms: [...row.expectedPdfForms],
    reviewFocus: row.id.startsWith("partial-4972-")
      ? [
        "Same-participant issued partial-beneficiary cash, NUA and annuity distributions combine on one Form4972 with separate source share percentages",
        "The reviewed recipient identity, gross-up worksheets and one Form1040 tax inclusion remain source-bound across every filled page",
      ]
      : [
        "Issued business-tip records, actual established owner health plans and full owner SE sources settle before Schedule1-A tip net-income limits",
        "Business-specific qualified-tip exclusions and health deductions preserve own C/F QBI, applicable WOTC ordering and finalized Form1040 equations",
        "Zero-tip and zero-QBI packets preserve actual required or omitted form copies; each reviewed PDF owner and page origin remains source-bound",
      ],
  }));
}
