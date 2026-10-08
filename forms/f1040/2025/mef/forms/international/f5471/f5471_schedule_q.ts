import {
  buildOwned5471Schedule,
  owned5471AdditionalSchedules,
} from "./f5471-owned-schedules.ts";
import { element, elements } from "../../../../../mef/xml.ts";
import { projectForm8992Source } from "../../../../domains/international/form8992/form8992_source.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";

export const form5471ScheduleQ: MefFormDescriptor<
  "f5471_schedule_q",
  unknown
> = {
  pendingKey: "f5471_schedule_q",
  sourcePendingKeys: ["f5471"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5471sq.pdf",
  build(_fields, context) {
    if (!context?.pending?.f5471) return "";
    if (!context.filer) {
      throw new Error("Form 5471 Schedule Q needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      context.pending,
      context.filer,
    );
    if (cfc.owned_worksheet_source) {
      return buildOwned5471Schedule(
        cfc,
        shareholderName,
        "IRS5471ScheduleQ",
        "GEN",
      );
    }
    const q = cfc.schedule_q;
    const testedNet = q.tested_gross_income_functional -
      q.tested_other_interest_expense_functional -
      q.tested_other_expenses_functional -
      q.tested_other_current_year_tax_functional;
    const totalGross = q.sales_gross_income_functional +
      q.tested_gross_income_functional;
    const totalNet = q.sales_gross_income_functional + testedNet;
    return elements("IRS5471ScheduleQ", [
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
      element("ForeignSourceIncomeInd", "X"),
      elements("TotFrgnBaseCoSalesIncmGrp", [
        element("TotalGrossIncomeAmt", q.sales_gross_income_functional),
        element("TotalNetIncomeAmt", q.sales_gross_income_functional),
        element(
          "TotalNetIncmAfterLossAllocnAmt",
          q.sales_gross_income_functional,
        ),
      ]),
      elements("FrgnBaseCoSalesIncmGrp", [
        element("RowId", 1),
        elements("QBUName", [
          element("BusinessNameLine1Txt", cfc.foreign_corp_name),
        ]),
        element("CountryCd", cfc.country_of_incorporation),
        element("GrossIncomeAmt", q.sales_gross_income_functional),
        element("NetIncomeAmt", q.sales_gross_income_functional),
        element("NetIncmAfterLossAllocnAmt", q.sales_gross_income_functional),
      ]),
      elements("TotalTestedIncomeGrp", [
        element("TotalGrossIncomeAmt", q.tested_gross_income_functional),
        element(
          "TotalOtherInterestExpnsAmt",
          q.tested_other_interest_expense_functional,
        ),
        element("TotalOtherExpensesAmt", q.tested_other_expenses_functional),
        element(
          "TotalOtherCurrentYearTaxAmt",
          q.tested_other_current_year_tax_functional,
        ),
        element("TotalNetIncomeAmt", testedNet),
        element(
          "TotalAllowedFrgnTaxCreditAmt",
          q.foreign_taxes_credit_allowed_usd,
        ),
        element(
          "TotalAverageAssetValueAmt",
          q.tested_average_asset_value_functional,
        ),
        element("TotalNetIncmAfterLossAllocnAmt", testedNet),
      ]),
      elements("TestedIncomeGrp", [
        element("RowId", 1),
        elements("QBUName", [
          element("BusinessNameLine1Txt", cfc.foreign_corp_name),
        ]),
        element("CountryCd", cfc.country_of_incorporation),
        element("GrossIncomeAmt", q.tested_gross_income_functional),
        element(
          "OtherInterestExpenseAmt",
          q.tested_other_interest_expense_functional,
        ),
        element("OtherExpenseAmt", q.tested_other_expenses_functional),
        element(
          "OtherCurrentYearTaxesAmt",
          q.tested_other_current_year_tax_functional,
        ),
        element("NetIncomeAmt", testedNet),
        element(
          "ForeignTaxesCreditAllowedAmt",
          q.foreign_taxes_credit_allowed_usd,
        ),
        element(
          "AverageAssetValueAmt",
          q.tested_average_asset_value_functional,
        ),
        element("NetIncmAfterLossAllocnAmt", testedNet),
      ]),
      elements("CFCTotalIncomeGrp", [
        element("TotalGrossIncomeAmt", totalGross),
        element(
          "TotalOtherInterestExpnsAmt",
          q.tested_other_interest_expense_functional,
        ),
        element("TotalOtherExpensesAmt", q.tested_other_expenses_functional),
        element(
          "TotalOtherCurrentYearTaxAmt",
          q.tested_other_current_year_tax_functional,
        ),
        element("TotalNetIncomeAmt", totalNet),
        element(
          "TotalAllowedFrgnTaxCreditAmt",
          q.foreign_taxes_credit_allowed_usd,
        ),
        element("TotalNetIncmAfterLossAllocnAmt", totalNet),
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
      "IRS5471ScheduleQ",
    );
  },
};
