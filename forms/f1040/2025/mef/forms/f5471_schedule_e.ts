import {
  buildOwned5471Schedule,
  owned5471AdditionalSchedules,
} from "./f5471-owned-schedules.ts";
import { element, elements } from "../../../mef/xml.ts";
import { projectForm8992Source } from "../../form8992_source.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const form5471ScheduleE: MefFormDescriptor<"f5471_schedule_e", unknown> =
  {
    pendingKey: "f5471_schedule_e",
    sourcePendingKeys: ["f5471"],
    FIELD_MAP: [],
    pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5471se.pdf",
    build(_fields, context) {
      if (!context?.pending?.f5471) return "";
      if (!context.filer) {
        throw new Error("Form 5471 Schedule E needs final filer identity");
      }
      const { cfc, shareholderName } = projectForm8992Source(
        context.pending,
        context.filer,
      );
      if (cfc.owned_worksheet_source) {
        return buildOwned5471Schedule(
          cfc,
          shareholderName,
          "IRS5471ScheduleE",
          "GEN",
        );
      }
      const e = cfc.schedule_e;
      return elements("IRS5471ScheduleE", [
        element("PersonNm", shareholderName),
        element("SSN", cfc.shareholder_tin),
        elements("ForeignCorporationName", [
          element("BusinessNameLine1Txt", cfc.foreign_corp_name),
        ]),
        element("ForeignCorporationEIN", cfc.foreign_corp_ein),
        cfc.foreign_corp_reference_id
          ? elements("ForeignEntityIdentificationGrp", [
            element(
              "ForeignEntityReferenceIdNum",
              cfc.foreign_corp_reference_id,
            ),
          ])
          : "",
        element("SeparateCategoryCd", "GEN"),
        elements("TxsForeignTaxCrAllowedGrp", [
          elements("PayorName", [
            element("BusinessNameLine1Txt", cfc.foreign_corp_name),
          ]),
          element("PayorEIN", cfc.foreign_corp_ein),
          cfc.foreign_corp_reference_id
            ? elements("ForeignEntityIdentificationGrp", [
              element(
                "ForeignEntityReferenceIdNum",
                cfc.foreign_corp_reference_id,
              ),
            ])
            : "",
          element("ForeignCountryOrUSPossessionCd", e.tax_country_code),
          element("ForeignTaxYearEndDt", e.foreign_tax_year_end),
          element("USTaxYearEndDt", e.us_tax_year_end),
          element("ForeignTaxableIncomeAmount", e.taxable_income_local),
          element("LocalCurrencyCd", e.local_currency),
          element("TaxInForeignCurrencyAmt", e.tax_local),
          element("ConversionRt", e.tax_conversion_rate),
          element("TaxInUSDollarsAmt", e.tax_usd),
          element("TaxInFunctionalCurrencyAmt", e.tax_functional),
        ]),
        element("TotalTaxInUSDollarsAmt", e.tax_usd),
        element("TotalTaxInFunctionalCurAmt", e.tax_functional),
        element("Section986a1DElectionInd", "false"),
        elements("Frm5471SchETestedIncomeGrp", [
          element("TotalTaxInUSDollarsAmt", e.tax_usd),
          element("TotalCurrentAccumulatedEPAmt", e.tax_usd),
          element("BalanceTxsPaidOrAccruedAmt", e.tax_usd),
          element("RedOtherTxsNotDeemedPdAmt", -e.tax_usd),
        ]),
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
        "IRS5471ScheduleE",
      );
    },
  };
