import { element, elements } from "../../../mef/xml.ts";
import { projectForm8992Source } from "../../form8992_source.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const form5471ScheduleR: MefFormDescriptor<
  "f5471_schedule_r",
  unknown
> = {
  pendingKey: "f5471_schedule_r",
  sourcePendingKeys: ["f5471"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5471sr.pdf",
  build(_fields, context) {
    if (!context?.pending?.f5471) return "";
    if (!context.filer) {
      throw new Error("Form 5471 Schedule R needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      context.pending,
      context.filer,
    );
    // The reviewed source has zero distributions; Schedule R's repeatable
    // distribution group is intentionally absent, matching J line 9/P line 8.
    return elements("IRS5471ScheduleR", [
      element("PersonNm", shareholderName),
      element("SSN", cfc.shareholder_tin),
      elements("ForeignCorporationName", [
        element("BusinessNameLine1Txt", cfc.foreign_corp_name),
      ]),
      element("ForeignCorporationEIN", cfc.foreign_corp_ein),
      cfc.foreign_corp_reference_id
        ? elements("ForeignEntityIdentificationGrp", [
          element("ForeignEntityReferenceIdNum", cfc.foreign_corp_reference_id),
        ])
        : "",
    ]);
  },
};
