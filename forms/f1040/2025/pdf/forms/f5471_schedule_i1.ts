import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { projectForm8992Source } from "../../form8992_source.ts";

const page = "form1[0].Page1[0].";
const field = (
  domainKey: string,
  number: number,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}f1_${number}[0]`,
  printZero,
});

export const form5471ScheduleI1Pdf: PdfFormDescriptor = {
  pendingKey: "f5471_schedule_i1",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f5471si1--2021.pdf",
  pageIndices: () => [0],
  fields: [
    field("shareholder_name", 1),
    field("shareholder_tin", 2),
    field("cfc_name", 3),
    field("cfc_ein", 4),
    field("cfc_reference_id", 5),
    field("separate_category", 6),
    field("gross_income", 8),
    field("eci", 9),
    field("subpart_f", 10),
    field("high_tax", 11),
    field("related_dividends", 12),
    field("oil_gas", 13),
    field("total_exclusions", 14),
    field("gross_tested", 15),
    field("allocable_deductions", 16),
    field("tested_functional", 17),
    field("rate", 18),
    field("tested_usd", 19),
    field("taxes_functional", 20),
    field("rate", 21),
    field("taxes_usd", 22),
    field("qbai_functional", 23),
    field("rate", 24),
    field("qbai_usd", 25),
    field("interest_expense", 26),
    field("qualified_interest_expense", 27),
    field("loss_qbai", 28),
    field("tested_interest_expense_functional", 29),
    field("rate", 30),
    field("tested_interest_expense_usd", 31),
    field("interest_income", 32),
    field("qualified_interest_income", 33),
    field("tested_interest_income_functional", 34),
    field("rate", 35),
    field("tested_interest_income_usd", 36),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f5471) return [];
    if (!filer) {
      throw new Error("Form 5471 Schedule I-1 PDF needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      allPending,
      filer,
    );
    const v = cfc.schedule_i1;
    const totalExclusions = v.effectively_connected_income_functional +
      v.subpart_f_income_functional +
      v.high_tax_exception_income_functional +
      v.related_party_dividends_functional +
      v.foreign_oil_gas_income_functional;
    const grossTested = v.gross_income_functional - totalExclusions;
    return [{
      shareholder_name: shareholderName,
      shareholder_tin: cfc.shareholder_tin,
      cfc_name: cfc.foreign_corp_name,
      cfc_ein: cfc.foreign_corp_ein,
      cfc_reference_id: cfc.foreign_corp_reference_id,
      separate_category: v.separate_category,
      gross_income: v.gross_income_functional,
      eci: v.effectively_connected_income_functional,
      subpart_f: v.subpart_f_income_functional,
      high_tax: v.high_tax_exception_income_functional,
      related_dividends: v.related_party_dividends_functional,
      oil_gas: v.foreign_oil_gas_income_functional,
      total_exclusions: totalExclusions,
      gross_tested: grossTested,
      allocable_deductions: v.allocable_deductions_functional,
      tested_functional: grossTested - v.allocable_deductions_functional,
      rate: v.average_exchange_rate,
      tested_usd: v.tested_income,
      taxes_functional: v.tested_foreign_taxes_functional,
      taxes_usd: v.tested_foreign_taxes_usd,
      qbai_functional: v.qbai_functional,
      qbai_usd: v.pro_rata_qbai,
      interest_expense: v.interest_expense_functional,
      qualified_interest_expense: v.qualified_interest_expense_functional,
      loss_qbai: v.tested_loss_qbai_functional,
      tested_interest_expense_functional: v.tested_interest_expense_functional,
      tested_interest_expense_usd: v.pro_rata_tested_interest_expense,
      interest_income: v.interest_income_functional,
      qualified_interest_income: v.qualified_interest_income_functional,
      tested_interest_income_functional: v.tested_interest_income_functional,
      tested_interest_income_usd: v.pro_rata_tested_interest_income,
    }];
  },
};
