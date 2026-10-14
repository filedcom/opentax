import { element, elements } from "../../../../../../mef/xml.ts";
import { projectForm8992Source } from "../../../../../domains/income/foreign/form8992/form8992_source.ts";
import type { MefFormDescriptor } from "../../../../form-descriptor.ts";

export const form5471ScheduleM: MefFormDescriptor<
  "f5471_schedule_m",
  unknown
> = {
  pendingKey: "f5471_schedule_m",
  sourcePendingKeys: ["f5471"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5471sm.pdf",
  build(_fields, context) {
    if (!context?.pending?.f5471) return "";
    if (!context.filer) {
      throw new Error("Form 5471 Schedule M needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      context.pending,
      context.filer,
    );
    const m = cfc.schedule_m;
    return elements("IRS5471ScheduleM", [
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
      element("FunctionalCurrencyDesc", cfc.functional_currency),
      element("ExchangeRt", cfc.schedule_i1.average_exchange_rate),
      elements("USPersonControlFrgnCorpGrp", [
        element("InventorySalesAmt", m.inventory_sales_to_filer_usd),
        element("InterestReceivedAmt", m.interest_received_from_filer_usd),
        element(
          "TotalTransactionsReceivedAmt",
          m.inventory_sales_to_filer_usd +
            (m.interest_received_from_filer_usd ?? 0),
        ),
        element(
          "AccountsPayableAmt",
          m.maximum_related_party_accounts_payable_usd,
        ),
        element("BorrowedAmt", m.maximum_related_party_borrowing_usd),
        element(
          "AccountsReceivableAmt",
          m.maximum_related_party_accounts_receivable_usd,
        ),
        element("LoanAmt", m.maximum_related_party_lending_usd),
      ]),
    ]);
  },
};
