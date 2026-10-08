import type { PdfFieldEntry, PdfFormDescriptor } from "../../reviews/execution/form-descriptor.ts";
import { projectForm8992Source } from "../../../domains/international/form8992/form8992_source.ts";

const page = "topmostSubform[0].Page1[0].";
const text = (
  domainKey: string,
  pdfField: string,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}${pdfField}`,
  printZero,
});
const cell = (key: string, number: number, total = false): PdfFieldEntry =>
  text(
    key,
    total
      ? `Total[0].f1_${number}[0]`
      : `Table_SchA[0].Row1[0].${number === 9 ? "f2" : "f1"}_${number}[0]`,
  );

export const form8992ScheduleAPdf: PdfFormDescriptor = {
  pendingKey: "form8992_schedule_a",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8992sa--2022.pdf",
  pageIndices: () => [0],
  filerFields: [
    text("nameLine1", "f1_1[0]"),
    text("primarySSN", "f1_2[0]"),
  ],
  fields: [
    text("shareholder_name", "f1_3[0]"),
    text("shareholder_tin", "f1_4[0]"),
    cell("cfc_name", 5),
    cell("cfc_identifier", 6),
    cell("tested_income", 7),
    cell("tested_loss", 8),
    cell("pro_rata_tested_income", 9),
    cell("pro_rata_tested_loss", 10),
    cell("pro_rata_qbai", 11),
    cell("pro_rata_tested_loss_qbai", 12),
    cell("pro_rata_tested_interest_income", 13),
    cell("pro_rata_tested_interest_expense", 14),
    cell("gilti_allocation_ratio", 15),
    cell("gilti_allocated", 16),
    cell("total_tested_income", 125, true),
    cell("total_tested_loss", 126, true),
    cell("total_pro_rata_tested_income", 127, true),
    cell("total_pro_rata_tested_loss", 128, true),
    cell("total_pro_rata_qbai", 129, true),
    cell("total_pro_rata_tested_loss_qbai", 130, true),
    cell("total_pro_rata_tested_interest_income", 131, true),
    cell("total_pro_rata_tested_interest_expense", 132, true),
    cell("total_gilti_allocation_ratio", 133, true),
    cell("total_gilti_allocated", 134, true),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f5471) return [];
    if (!filer) {
      throw new Error("Form 8992 Schedule A PDF needs final filer identity");
    }
    const { cfc, calculation, shareholderName } = projectForm8992Source(
      allPending,
      filer,
    );
    const tested = cfc.schedule_i1;
    const allocated = tested.pro_rata_tested_income > 0;
    return [{
      shareholder_name: shareholderName,
      shareholder_tin: cfc.shareholder_tin,
      cfc_name: cfc.foreign_corp_name,
      cfc_identifier: cfc.foreign_corp_ein ?? cfc.foreign_corp_reference_id,
      tested_income: tested.tested_income,
      tested_loss: 0,
      pro_rata_tested_income: tested.pro_rata_tested_income,
      pro_rata_tested_loss: 0,
      pro_rata_qbai: tested.pro_rata_qbai,
      pro_rata_tested_loss_qbai: 0,
      pro_rata_tested_interest_income: tested.pro_rata_tested_interest_income,
      pro_rata_tested_interest_expense: tested.pro_rata_tested_interest_expense,
      gilti_allocation_ratio: allocated ? "1.0000" : undefined,
      gilti_allocated: allocated ? calculation.gilti : undefined,
      total_tested_income: tested.tested_income,
      total_tested_loss: 0,
      total_pro_rata_tested_income: tested.pro_rata_tested_income,
      total_pro_rata_tested_loss: 0,
      total_pro_rata_qbai: tested.pro_rata_qbai,
      total_pro_rata_tested_loss_qbai: 0,
      total_pro_rata_tested_interest_income:
        tested.pro_rata_tested_interest_income,
      total_pro_rata_tested_interest_expense:
        tested.pro_rata_tested_interest_expense,
      total_gilti_allocation_ratio: allocated ? "1.0000" : undefined,
      total_gilti_allocated: allocated ? calculation.gilti : undefined,
    }];
  },
};
