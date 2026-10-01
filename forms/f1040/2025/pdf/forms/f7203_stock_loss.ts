import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { projectReviewedStockLoss7203 } from "../../form7203_stock_loss_projection.ts";

// The official Form 7203 is Rev. December 2022 and remains the current IRS
// form. Widget names were inspected from its two-page AcroForm field tree.
const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].Table_Part3[0].";
const debtA = "topmostSubform[0].Page1[0].Table_SectionA[0].";
const debtB = "topmostSubform[0].Page2[0].Table_SectionB[0].";
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
  textField("line2_cash_capital_contribution", `${page1}f1_08[0]`),
  textField("line5_basis_before_distributions", `${page1}f1_23[0]`, true),
  textField("line7_basis_after_distributions", `${page1}f1_25[0]`, true),
  textField("line10_basis_before_loss", `${page1}f1_30[0]`),
  textField("line11_allowable_stock_loss", `${page1}f1_31[0]`),
  textField("line14_basis_decrease", `${page1}f1_34[0]`),
  textField("line15_ending_basis", `${page1}f1_35[0]`, true),
  {
    kind: "checkbox",
    domainKey: "formal_note_debt1",
    pdfField: `${debtA}Header[0].aDebt1[0].c1_7[0]`,
  },
  ...[
    ["16", "36", "39"],
    ["17", "40", "43"],
    ["18", "44", "47"],
    ["20", "52", "55"],
  ].flatMap(([line, first, total]) => [
    textField(
      `line${line}_debt1`,
      `${debtA}Line${line}[0].f1_${first}[0]`,
      line === "16",
    ),
    textField(
      `line${line}_total`,
      `${debtA}Line${line}[0].${line === "16" ? "f2" : "f1"}_${total}[0]`,
      line === "16",
    ),
  ]),
  ...[
    ["21", "01", "04"],
    ["22", "05", "08"],
    ["24", "13", "16"],
    ["25", "17", "20"],
    ["27", "25", "28"],
    ["29", "33", "36"],
    ["30", "37", "40"],
    ["31", "41", "44"],
  ].flatMap(([line, first, total]) => [
    textField(
      `line${line}_debt1`,
      `${debtB}Line${line}[0].f2_${first}[0]`,
      line === "21",
    ),
    ...(line === "25" ? [] : [
      textField(
        `line${line}_total`,
        `${debtB}Line${line}[0].f2_${total}[0]`,
        line === "21",
      ),
    ]),
  ]),
  textField("line35_current_loss", `${page2}Line35[0].f2_57[0]`),
  textField("line35_allowed_stock", `${page2}Line35[0].f2_59[0]`),
  textField("line35_allowed_debt", `${page2}Line35[0].f2_60[0]`),
  textField("line35_carryover", `${page2}Line35[0].f2_61[0]`),
  textField("line47_current_loss", `${page2}Line47[0].f2_118[0]`),
  textField("line47_allowed_stock", `${page2}Line47[0].f2_120[0]`),
  textField("line47_allowed_debt", `${page2}Line47[0].f2_121[0]`),
  textField("line47_carryover", `${page2}Line47[0].f2_122[0]`),
];

export const form7203StockLossPdf: PdfFormDescriptor = {
  pendingKey: "form7203",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f7203--2022.pdf",
  pageIndices: () => [0, 1],
  fields,
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    const {
      source,
      ledger,
      basis,
      contribution,
      availableBasis,
      note,
      currentLoss,
      allowedStock,
      allowedDebt,
      carryover,
    } = projectReviewedStockLoss7203(raw, allPending ?? {}, filer);
    return [{
      shareholder_name: ledger.shareholder_name_as_on_k1,
      shareholder_ssn: ledger.shareholder_ssn,
      corporation_name: source.corporation_name,
      corporation_ein: ledger.corporation_ein,
      original_shareholder: true,
      line1_beginning_basis: basis,
      ...(contribution > 0
        ? { line2_cash_capital_contribution: contribution }
        : {}),
      line5_basis_before_distributions: availableBasis,
      line7_basis_after_distributions: availableBasis,
      ...(availableBasis > 0
        ? {
          line10_basis_before_loss: availableBasis,
          line11_allowable_stock_loss: allowedStock,
          line14_basis_decrease: allowedStock,
        }
        : {}),
      line15_ending_basis: availableBasis - allowedStock,
      ...(note
        ? {
          formal_note_debt1: true,
          line16_debt1: 0,
          line16_total: 0,
          line17_debt1: note.cash_advance_amount,
          line17_total: note.cash_advance_amount,
          line18_debt1: note.cash_advance_amount,
          line18_total: note.cash_advance_amount,
          line20_debt1: note.cash_advance_amount,
          line20_total: note.cash_advance_amount,
          line21_debt1: 0,
          line21_total: 0,
          line22_debt1: note.cash_advance_amount,
          line22_total: note.cash_advance_amount,
          line24_debt1: note.cash_advance_amount,
          line24_total: note.cash_advance_amount,
          line25_debt1: "1.0000",
          line27_debt1: note.cash_advance_amount,
          line27_total: note.cash_advance_amount,
          line29_debt1: note.cash_advance_amount,
          line29_total: note.cash_advance_amount,
          line30_debt1: allowedDebt,
          line30_total: allowedDebt,
          line31_debt1: note.cash_advance_amount - allowedDebt,
          line31_total: note.cash_advance_amount - allowedDebt,
        }
        : {}),
      line35_current_loss: currentLoss,
      ...(availableBasis > 0 ? { line35_allowed_stock: allowedStock } : {}),
      ...(note ? { line35_allowed_debt: allowedDebt } : {}),
      ...(carryover > 0 ? { line35_carryover: carryover } : {}),
      line47_current_loss: currentLoss,
      ...(availableBasis > 0 ? { line47_allowed_stock: allowedStock } : {}),
      ...(note ? { line47_allowed_debt: allowedDebt } : {}),
      ...(carryover > 0 ? { line47_carryover: carryover } : {}),
    }];
  },
};
