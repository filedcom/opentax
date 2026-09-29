import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { projectReviewedStockLoss7203 } from "../../form7203_stock_loss_projection.ts";

// The official Form 7203 is Rev. December 2022 and remains the current IRS
// form. Widget names were inspected from its two-page AcroForm field tree.
const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].Table_Part3[0].";
const textField = (
  domainKey: string,
  pdfField: string,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
  ...(printZero ? { printZero: true } : {}),
});

const fields: ReadonlyArray<PdfFieldEntry> = [
  textField("shareholder_name", `${page1}f1_01[0]`),
  textField("shareholder_ssn", `${page1}f1_02[0]`),
  textField("corporation_name", `${page1}f1_03[0]`),
  textField("corporation_ein", `${page1}f1_04[0]`),
  {
    kind: "checkbox",
    domainKey: "original_shareholder",
    pdfField: `${page1}c1_1[0]`,
  },
  textField("line1_beginning_basis", `${page1}f1_07[0]`, true),
  textField("line5_basis_before_distributions", `${page1}f1_23[0]`, true),
  textField("line7_basis_after_distributions", `${page1}f1_25[0]`, true),
  textField("line10_basis_before_loss", `${page1}f1_30[0]`),
  textField("line11_allowable_stock_loss", `${page1}f1_31[0]`),
  textField("line14_basis_decrease", `${page1}f1_34[0]`),
  textField("line15_ending_basis", `${page1}f1_35[0]`, true),
  textField("line35_current_loss", `${page2}Line35[0].f2_57[0]`),
  textField("line35_allowed_stock", `${page2}Line35[0].f2_59[0]`),
  textField("line35_carryover", `${page2}Line35[0].f2_61[0]`),
  textField("line47_current_loss", `${page2}Line47[0].f2_118[0]`),
  textField("line47_allowed_stock", `${page2}Line47[0].f2_120[0]`),
  textField("line47_carryover", `${page2}Line47[0].f2_122[0]`),
];

export const form7203StockLossPdf: PdfFormDescriptor = {
  pendingKey: "form7203",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f7203--2022.pdf",
  pageIndices: () => [0, 1],
  fields,
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    const { source, ledger, basis, currentLoss, allowed, carryover } =
      projectReviewedStockLoss7203(raw, allPending ?? {}, filer);
    return [{
      shareholder_name: ledger.shareholder_name_as_on_k1,
      shareholder_ssn: ledger.shareholder_ssn,
      corporation_name: source.corporation_name,
      corporation_ein: ledger.corporation_ein,
      original_shareholder: true,
      line1_beginning_basis: basis,
      line5_basis_before_distributions: basis,
      line7_basis_after_distributions: basis,
      ...(basis > 0
        ? {
          line10_basis_before_loss: basis,
          line11_allowable_stock_loss: allowed,
          line14_basis_decrease: allowed,
        }
        : {}),
      line15_ending_basis: basis - allowed,
      line35_current_loss: currentLoss,
      ...(basis > 0 ? { line35_allowed_stock: allowed } : {}),
      ...(carryover > 0 ? { line35_carryover: carryover } : {}),
      line47_current_loss: currentLoss,
      ...(basis > 0 ? { line47_allowed_stock: allowed } : {}),
      ...(carryover > 0 ? { line47_carryover: carryover } : {}),
    }];
  },
};
