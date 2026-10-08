import {
  buildOwned5471Schedule,
  owned5471AdditionalSchedules,
} from "./f5471-owned-schedules.ts";
import { element, elements } from "../../../../../mef/xml.ts";
import { projectForm8992Source } from "../../../../domains/international/form8992/form8992_source.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";

function ptepGroup(
  name: string,
  line7: number,
  line9: number,
  line10: number,
  line12: number,
): string {
  return elements(name, [
    line7 ? element("ReclassifiedSect959c2EPAmt", line7) : "",
    line9 ? element("ReclassifiedSect959c1EPAmt", line9) : "",
    line10 ? element("EarnInvstUSPropReclassifiedAmt", line10) : "",
    element("BalanceBeginningNextYearAmt", line12),
  ]);
}

export const form5471ScheduleP: MefFormDescriptor<
  "f5471_schedule_p",
  unknown
> = {
  pendingKey: "f5471_schedule_p",
  sourcePendingKeys: ["f5471"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5471sp.pdf",
  build(_fields, context) {
    if (!context?.pending?.f5471) return "";
    if (!context.filer) {
      throw new Error("Form 5471 Schedule P needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      context.pending,
      context.filer,
    );
    const j = cfc.schedule_j;
    if (cfc.owned_worksheet_source) {
      return buildOwned5471Schedule(
        cfc,
        shareholderName,
        "IRS5471ScheduleP",
        "GEN",
      );
    }
    const p = cfc.schedule_p;
    const subpartFFunctional = j.subpart_f_inclusion_functional;
    const giltiFunctional = j.section951a_inclusion_functional;
    const section956Functional = j.section956_inclusion_functional;
    const totalFunctional = j.section956_ptep_reclassified_functional;
    const subpartFUsd = cfc.schedule_i.line1a + cfc.schedule_i.line1b +
      cfc.schedule_i.line1c + cfc.schedule_i.line1d + cfc.schedule_i.line1e +
      cfc.schedule_i.line1f + cfc.schedule_i.line1g + cfc.schedule_i.line1h;
    const giltiUsd = p.section956_ptep_reclassified_usd_basis - subpartFUsd;
    const section956Usd = cfc.schedule_i.line2_us_property;
    const totalUsd = p.section956_ptep_reclassified_usd_basis;
    return elements("IRS5471ScheduleP", [
      element("PersonNm", shareholderName),
      element("SSN", cfc.shareholder_tin),
      element("ShareholderPersonNm", shareholderName),
      element("ShareholderSSN", cfc.shareholder_tin),
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
      ptepGroup(
        "FCGeneralSection959c1PTEPGrp",
        0,
        totalFunctional,
        section956Functional,
        totalFunctional + section956Functional,
      ),
      ptepGroup(
        "FCSection951APTEPGrp",
        giltiFunctional,
        -giltiFunctional,
        0,
        0,
      ),
      ptepGroup(
        "FCSection951a1APTEPGrp",
        subpartFFunctional,
        -subpartFFunctional,
        0,
        0,
      ),
      ptepGroup(
        "FCTotalPTEPGrp",
        totalFunctional,
        0,
        section956Functional,
        totalFunctional + section956Functional,
      ),
      ptepGroup(
        "USGeneralSection959c1PTEPGrp",
        0,
        totalUsd,
        section956Usd,
        totalUsd + section956Usd,
      ),
      ptepGroup("USSection951APTEPGrp", giltiUsd, -giltiUsd, 0, 0),
      ptepGroup("USSection951a1APTEPGrp", subpartFUsd, -subpartFUsd, 0, 0),
      ptepGroup(
        "USTotalPTEPGrp",
        totalUsd,
        0,
        section956Usd,
        totalUsd + section956Usd,
      ),
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
      "IRS5471ScheduleP",
    );
  },
};
