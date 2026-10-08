import { element, elements } from "../../../../../mef/xml.ts";
import { projectForm8992Source } from "../../../../domains/international/form8992/form8992_source.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";

export const form5471ScheduleH: MefFormDescriptor<
  "f5471_schedule_h",
  unknown
> = {
  pendingKey: "f5471_schedule_h",
  sourcePendingKeys: ["f5471"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5471sh.pdf",
  build(_fields, context) {
    if (!context?.pending?.f5471) return "";
    if (!context.filer) {
      throw new Error("Form 5471 Schedule H needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      context.pending,
      context.filer,
    );
    const h = cfc.schedule_h;
    return elements("IRS5471ScheduleH", [
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
      element("ForeignCYNetIncomePerBooksAmt", h.book_net_income_functional),
      // All 2a–2i adjustments are explicitly reviewed as zero in source.
      // Optional native adjustment tags are omitted, including line 2i's
      // statement-linked tags.
      element("TotalNetAdditionsAmt", 0),
      element("TotalNetSubtractionsAmt", 0),
      element("CurrentEarningsAndProfitsAmt", h.book_net_income_functional),
      element("EarningAndPrftPlusDASTMGainAmt", h.book_net_income_functional),
      element(
        "EPDASTMGeneralCatIncmAmt",
        h.book_net_income_functional - h.passive_category_ep,
      ),
      h.passive_category_ep
        ? element("EPDASTMPassiveCatIncmAmt", h.passive_category_ep)
        : "",
      element("CurrEarnAndPrftInUSDollarsAmt", h.current_ep_usd),
      element("ExchangeRt", h.average_exchange_rate),
    ]);
  },
};
