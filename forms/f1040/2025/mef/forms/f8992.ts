import { element, elements } from "../../../mef/xml.ts";
import { projectForm8992Source } from "../../form8992_source.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

// TY2025 v5.4 IRS8992.xsd. Part II line 1 repeats Part I line 3 on the
// printed form; the native schema has only NetCFCTestedIncomeAmt.
export const FIELD_MAP = [
  ["part_i_line1", "SumProRataShrNetTestedIncmAmt"],
  ["part_i_line2", "SumProRataShrNetTestedLossAmt"],
  ["part_i_line3", "NetCFCTestedIncomeAmt"],
  ["part_ii_line2", "DeemedTangibleIncomeReturnAmt"],
  ["part_ii_line3a", "TotProRataShrTestedIntExpnsAmt"],
  ["part_ii_line3b", "TotProRataShrTestedIntIncmAmt"],
  ["part_ii_line3c", "SpecifiedInterestExpenseAmt"],
  ["part_ii_line4", "NetDTIRAmt"],
  ["part_ii_line5", "GILTIReceivedAmt"],
] as const;

export const form8992: MefFormDescriptor<"form8992", unknown> = {
  pendingKey: "form8992",
  sourcePendingKeys: ["f5471"],
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8992.pdf",
  build(_fields, context) {
    if (!context?.pending?.f5471) return "";
    if (!context.filer) throw new Error("Form 8992 needs final filer identity");
    const { cfc, calculation, shareholderName } = projectForm8992Source(
      context.pending,
      context.filer,
    );
    const scheduleIds = context.documentIdsByPendingKey?.form8992_schedule_a;
    if (context.documentIdsByPendingKey && scheduleIds?.length !== 1) {
      throw new Error("Form 8992 needs one linked Schedule A document");
    }
    return elements(
      "IRS8992",
      [
        element("ShareholderPersonNm", shareholderName),
        element("SSN", cfc.shareholder_tin),
        ...FIELD_MAP.map(([key, tag]) =>
          element(tag, calculation.form8992[key])
        ),
      ],
      scheduleIds?.[0]
        ? {
          referenceDocumentId: scheduleIds[0],
          referenceDocumentName:
            "BinaryAttachment IRS8992ScheduleA IRS8992ScheduleB",
        }
        : undefined,
    );
  },
};
