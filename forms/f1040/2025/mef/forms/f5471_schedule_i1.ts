import { element, elements } from "../../../mef/xml.ts";
import { projectForm8992Source } from "../../form8992_source.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

function converted(
  tag: string,
  functional: number,
  rate: string,
  usd: number,
): string {
  return elements(tag, [
    element("FunctionalCurrencyAmt", functional),
    element("ConversionRt", rate),
    element("USDollarAmt", usd),
  ]);
}

export const form5471ScheduleI1: MefFormDescriptor<
  "f5471_schedule_i1",
  unknown
> = {
  pendingKey: "f5471_schedule_i1",
  sourcePendingKeys: ["f5471"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5471si1.pdf",
  build(_fields, context) {
    if (!context?.pending?.f5471) return "";
    if (!context.filer) {
      throw new Error("Form 5471 Schedule I-1 needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      context.pending,
      context.filer,
    );
    const v = cfc.schedule_i1;
    const excluded = v.effectively_connected_income_functional +
      v.subpart_f_income_functional +
      v.high_tax_exception_income_functional +
      v.related_party_dividends_functional +
      v.foreign_oil_gas_income_functional;
    const grossTested = v.gross_income_functional - excluded;
    return elements("IRS5471ScheduleI1", [
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
      element("SeparateCategoryCd", v.separate_category),
      element("GrossIncomeAmt", v.gross_income_functional),
      element("ECIAmt", v.effectively_connected_income_functional),
      element("SubpartFIncomeAmt", v.subpart_f_income_functional),
      element(
        "HighTaxExceptionIncomeAmt",
        v.high_tax_exception_income_functional,
      ),
      element("RelatedPartyDividendsAmt", v.related_party_dividends_functional),
      element(
        "FrgnOilGasExtractionIncomeAmt",
        v.foreign_oil_gas_income_functional,
      ),
      element("TotalIncomeExclusionAmt", excluded),
      element("GrossIncomeLessTotIncmExclAmt", grossTested),
      element("AllocableDeductionAmt", v.allocable_deductions_functional),
      converted(
        "TestedIncomeLossGrp",
        grossTested - v.allocable_deductions_functional,
        v.average_exchange_rate,
        v.tested_income,
      ),
      converted(
        "TestedForeignIncomeTaxesGrp",
        v.tested_foreign_taxes_functional,
        v.average_exchange_rate,
        v.tested_foreign_taxes_usd,
      ),
      converted(
        "ProRataShareQBAIGrp",
        v.qbai_functional,
        v.average_exchange_rate,
        v.pro_rata_qbai,
      ),
      element("InterestExpenseAmt", v.interest_expense_functional),
      element(
        "QualifiedInterestExpenseAmt",
        v.qualified_interest_expense_functional,
      ),
      element("TestedLossQBAIAmt", v.tested_loss_qbai_functional),
      converted(
        "TestedInterestExpenseGrp",
        v.tested_interest_expense_functional,
        v.average_exchange_rate,
        v.pro_rata_tested_interest_expense,
      ),
      element("InterestIncomeAmt", v.interest_income_functional),
      element(
        "QualifiedInterestIncomeAmt",
        v.qualified_interest_income_functional,
      ),
      converted(
        "TestedInterestIncomeGrp",
        v.tested_interest_income_functional,
        v.average_exchange_rate,
        v.pro_rata_tested_interest_income,
      ),
    ]);
  },
};
