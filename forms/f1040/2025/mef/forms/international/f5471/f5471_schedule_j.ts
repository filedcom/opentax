import {
  buildOwned5471Schedule,
  owned5471AdditionalSchedules,
} from "./f5471-owned-schedules.ts";
import { element, elements } from "../../../../../mef/xml.ts";
import { projectForm8992Source } from "../../../../domains/international/form8992/form8992_source.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";

export const form5471ScheduleJ: MefFormDescriptor<
  "f5471_schedule_j",
  unknown
> = {
  pendingKey: "f5471_schedule_j",
  sourcePendingKeys: ["f5471"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5471sj.pdf",
  build(_fields, context) {
    if (!context?.pending?.f5471) return "";
    if (!context.filer) {
      throw new Error("Form 5471 Schedule J needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      context.pending,
      context.filer,
    );
    if (cfc.owned_worksheet_source) {
      return buildOwned5471Schedule(
        cfc,
        shareholderName,
        "IRS5471ScheduleJ",
        "GEN",
      );
    }
    const j = cfc.schedule_j;
    const opening = j.opening_post2017_untaxed_ep_functional;
    const current = cfc.schedule_h.book_net_income_functional;
    const beforeInclusions = opening + current;
    const subpartF = j.subpart_f_inclusion_functional;
    const gilti = j.section951a_inclusion_functional;
    const section956 = j.section956_inclusion_functional;
    const reclassifiedPtep = j.section956_ptep_reclassified_functional;
    const untaxedClosing = beforeInclusions - subpartF - gilti - section956;
    return elements("IRS5471ScheduleJ", [
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
      element("SeparateCategoryCd", "GEN"),
      elements("Post2017EPNotPrevTaxedGrp", [
        element("BeginningYearBalanceAmt", opening),
        element("AdjustedBeginningBalanceAmt", opening),
        element("CurrentYearEPDeficitAmt", current),
        element("TotalCurrentAccumulatedEPAmt", beforeInclusions),
        element("ReclassifiedSect959c2EPAmt", -(subpartF + gilti)),
        element("EarnInvstUSPropReclassifiedAmt", -section956),
        element("BalanceBeginningNextYearAmt", untaxedClosing),
      ]),
      elements("GeneralSection959c1PTEPGrp", [
        element("ReclassifiedSect959c1EPAmt", reclassifiedPtep),
        element("EarnInvstUSPropReclassifiedAmt", section956),
        element("BalanceBeginningNextYearAmt", reclassifiedPtep + section956),
      ]),
      elements("Section951APTEPGrp", [
        element("ReclassifiedSect959c2EPAmt", gilti),
        element("ReclassifiedSect959c1EPAmt", -gilti),
        element("BalanceBeginningNextYearAmt", 0),
      ]),
      elements("Section951a1APTEPGrp", [
        element("ReclassifiedSect959c2EPAmt", subpartF),
        element("ReclassifiedSect959c1EPAmt", -subpartF),
        element("BalanceBeginningNextYearAmt", 0),
      ]),
      elements("TotalSection964AEPGrp", [
        element("BeginningYearBalanceAmt", opening),
        element("AdjustedBeginningBalanceAmt", opening),
        element("CurrentYearEPDeficitAmt", current),
        element("TotalCurrentAccumulatedEPAmt", beforeInclusions),
        element("BalanceBeginningNextYearAmt", beforeInclusions),
      ]),
      element(
        "BeginningYearBalanceAmt",
        j.part_ii_beginning_recapture_balance_functional,
      ),
      element("FutureRecaptureAmt", j.part_ii_future_recapture_functional),
      element(
        "CurrentYearRecaptureAmt",
        j.part_ii_current_recapture_functional,
      ),
      element("EndYearBalanceAmt", 0),
    ]);
  },
  buildAdditionalDocuments(_fields, context) {
    if (!context?.pending?.f5471) return [];
    if (!context.filer) {
      throw Error("Owned category schedules need final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      context.pending,
      context.filer,
    );
    return owned5471AdditionalSchedules(
      cfc,
      shareholderName,
      "IRS5471ScheduleJ",
    );
  },
};
