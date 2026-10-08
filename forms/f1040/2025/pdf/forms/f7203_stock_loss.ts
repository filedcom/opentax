import { projectPassiveSCorp7203Copy } from "../../passive-s-corp-loss-copies.ts";
import { PDFName, StandardFonts } from "pdf-lib";
import { projectOverflowDebtInventory } from "../../form7203_debt_inventory.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { projectReviewedStockLoss7203 } from "../../form7203_stock_loss_projection.ts";
import { sumPrincipalRepayments } from "../../../nodes/intermediate/forms/form7203/debt-note.ts";

// The official Form 7203 is Rev. December 2022 and remains the current IRS
// form. Widget names were inspected from its two-page AcroForm field tree.
const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].Table_Part3[0].";
const debtA = "topmostSubform[0].Page1[0].Table_SectionA[0].";
const debtB = "topmostSubform[0].Page2[0].Table_SectionB[0].";
const debtC = "topmostSubform[0].Page2[0].Table_SectionC[0].";
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
    domainKey: "open_account_debt1",
    pdfField: `${debtA}Header[0].aDebt1[0].c1_7[1]`,
  },
  {
    kind: "checkbox",
    domainKey: "formal_note_debt1",
    pdfField: `${debtA}Header[0].aDebt1[0].c1_7[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "open_account_debt2",
    pdfField: `${debtA}Header[0].bDebt2[0].c1_8[1]`,
  },
  {
    kind: "checkbox",
    domainKey: "formal_note_debt2",
    pdfField: `${debtA}Header[0].bDebt2[0].c1_8[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "open_account_debt3",
    pdfField: `${debtA}Header[0].cDebt3[0].c1_9[1]`,
  },
  {
    kind: "checkbox",
    domainKey: "formal_note_debt3",
    pdfField: `${debtA}Header[0].cDebt3[0].c1_9[0]`,
  },
  ...[
    ["16", "36", "39"],
    ["17", "40", "43"],
    ["18", "44", "47"],
    ["19", "48", "51"],
    ["20", "52", "55"],
  ].flatMap(([line, first, total]) => [
    textField(
      `line${line}_debt1`,
      `${debtA}Line${line}[0].f1_${first}[0]`,
      line === "16",
    ),
    textField(
      `line${line}_debt2`,
      `${debtA}Line${line}[0].f1_${Number(first) + 1}[0]`,
      line === "16",
    ),
    textField(
      `line${line}_debt3`,
      `${debtA}Line${line}[0].f1_${Number(first) + 2}[0]`,
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
    ["26", "21", "24"],
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
    textField(
      `line${line}_debt2`,
      `${debtB}Line${line}[0].f2_${
        String(Number(first) + 1).padStart(2, "0")
      }[0]`,
      line === "21",
    ),
    textField(
      `line${line}_debt3`,
      `${debtB}Line${line}[0].f2_${
        String(Number(first) + 2).padStart(2, "0")
      }[0]`,
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
  ...[["32", "45", "48"], ["33", "49", "52"]].flatMap(
    ([line, first, total]) => [
      textField(`line${line}_debt1`, `${debtC}Line${line}[0].f2_${first}[0]`),
      textField(
        `line${line}_debt2`,
        `${debtC}Line${line}[0].f2_${Number(first) + 1}[0]`,
      ),
      textField(`line${line}_total`, `${debtC}Line${line}[0].f2_${total}[0]`),
    ],
  ),
  textField("line32_debt3", `${debtC}Line32[0].f2_47[0]`),
  textField("line33_debt3", `${debtC}Line33[0].f2_51[0]`),
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
    if (raw.current_passive_s_corp_loss !== undefined) {
      return [projectPassiveSCorp7203Copy(raw, allPending, filer).pdfFields];
    }
    if (
      Array.isArray(raw.owned_debt_loss_sources) &&
      raw.owned_debt_loss_copy_index === undefined
    ) {
      return raw.owned_debt_loss_sources.flatMap((_, i) =>
        form7203StockLossPdf.instances!(
          {
            owned_debt_loss_sources: raw.owned_debt_loss_sources,
            owned_debt_loss_copy_index: i,
          },
          filer,
          allPending,
        ) ?? []
      );
    }
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
      allowedDebt1,
      allowedDebt2,
      allowedDebt3,
      carryover,
    } = projectReviewedStockLoss7203(raw, allPending ?? {}, filer);
    const repayment = sumPrincipalRepayments(note?.principal_repayments);
    const debtAfterRepayment = (note?.cash_advance_amount ?? 0) - repayment;
    const secondAdvance = note?.second_formal_note?.cash_advance_amount ??
      note?.open_account_net_advance_amount ?? 0;
    const secondRepayment =
      note?.second_formal_note?.principal_repayment?.amount ?? 0;
    const secondDebtAfterRepayment = secondAdvance - secondRepayment;
    const thirdAdvance = note?.kind === "owned_2025_formal_and_open_account" &&
        note.second_formal_note
      ? note.open_account_net_advance_amount
      : undefined;
    const totalRepayment = repayment + secondRepayment;
    const totalAdvance = (note?.cash_advance_amount ?? 0) + secondAdvance +
      (thirdAdvance ?? 0);
    const totalDebtAfterRepayment = debtAfterRepayment +
      secondDebtAfterRepayment + (thirdAdvance ?? 0);
    const base: Record<string, unknown> = {
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
          ...(note.kind === "owned_2025_open_account"
            ? { open_account_debt1: true }
            : { formal_note_debt1: true }),
          line16_debt1: 0,
          line16_total: 0,
          line17_debt1: note.cash_advance_amount,
          line17_total: totalAdvance,
          line18_debt1: note.cash_advance_amount,
          line18_total: totalAdvance,
          ...(repayment > 0 ? { line19_debt1: repayment } : {}),
          ...(totalRepayment > 0 ? { line19_total: totalRepayment } : {}),
          line20_debt1: debtAfterRepayment,
          line20_total: totalDebtAfterRepayment,
          line21_debt1: 0,
          line21_total: 0,
          line22_debt1: note.cash_advance_amount,
          line22_total: totalAdvance,
          line24_debt1: note.cash_advance_amount,
          line24_total: totalAdvance,
          ...(note.cash_advance_amount > 0 ? { line25_debt1: "1.0000" } : {}),
          ...(repayment > 0 ? { line26_debt1: repayment } : {}),
          ...(totalRepayment > 0 ? { line26_total: totalRepayment } : {}),
          line27_debt1: debtAfterRepayment,
          line27_total: totalDebtAfterRepayment,
          line29_debt1: debtAfterRepayment,
          line29_total: totalDebtAfterRepayment,
          line30_debt1: allowedDebt1,
          line30_total: allowedDebt,
          line31_debt1: debtAfterRepayment - allowedDebt1,
          line31_total: totalDebtAfterRepayment - allowedDebt,
          ...(secondAdvance > 0 ||
              note.kind === "owned_2025_formal_and_open_account"
            ? {
              ...(note.kind === "owned_2025_formal_and_open_account" &&
                  !note.second_formal_note
                ? { open_account_debt2: true }
                : { formal_note_debt2: true }),
              line16_debt2: 0,
              line17_debt2: secondAdvance,
              line18_debt2: secondAdvance,
              ...(secondRepayment > 0 ? { line19_debt2: secondRepayment } : {}),
              line20_debt2: secondDebtAfterRepayment,
              line21_debt2: 0,
              line22_debt2: secondAdvance,
              line24_debt2: secondAdvance,
              ...(secondAdvance > 0 ? { line25_debt2: "1.0000" } : {}),
              ...(secondRepayment > 0 ? { line26_debt2: secondRepayment } : {}),
              line27_debt2: secondDebtAfterRepayment,
              line29_debt2: secondDebtAfterRepayment,
              line30_debt2: allowedDebt2,
              line31_debt2: secondDebtAfterRepayment - allowedDebt2,
            }
            : {}),
          ...(thirdAdvance !== undefined
            ? {
              open_account_debt3: true,
              line16_debt3: 0,
              line17_debt3: thirdAdvance,
              line18_debt3: thirdAdvance,
              line20_debt3: thirdAdvance,
              line21_debt3: 0,
              line22_debt3: thirdAdvance,
              line24_debt3: thirdAdvance,
              ...(thirdAdvance > 0 ? { line25_debt3: "1.0000" } : {}),
              line27_debt3: thirdAdvance,
              line29_debt3: thirdAdvance,
              line30_debt3: allowedDebt3,
              line31_debt3: thirdAdvance - allowedDebt3,
            }
            : {}),
          ...(repayment > 0
            ? {
              line32_debt1: repayment,
              line33_debt1: repayment,
            }
            : {}),
          ...(secondRepayment > 0
            ? {
              line32_debt2: secondRepayment,
              line33_debt2: secondRepayment,
            }
            : {}),
          ...(totalRepayment > 0
            ? {
              line32_total: totalRepayment,
              line33_total: totalRepayment,
            }
            : {}),
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
    };
    const overflow = projectOverflowDebtInventory(note, allowedDebt);
    if (!overflow) return [base];
    const result: Record<string, unknown>[] = [];
    for (let start = 0; start < overflow.length; start += 3) {
      const row: Record<string, unknown> = start === 0 ? { ...base } : {
        shareholder_name: base.shareholder_name,
        shareholder_ssn: base.shareholder_ssn,
        corporation_name: base.corporation_name,
        corporation_ein: base.corporation_ein,
        part_ii_continuation: true,
      };
      for (const key of Object.keys(row)) {
        if (
          /_(debt[123]|total)$/.test(key) ||
          /^(formal_note|open_account)_debt/.test(key)
        ) delete row[key];
      }
      overflow.slice(start, start + 3).forEach((d, j) => {
        const suffix = `debt${j + 1}`;
        row[`${d.open ? "open_account" : "formal_note"}_${suffix}`] = true;
        Object.entries({
          16: 0,
          17: d.advance,
          18: d.advance,
          20: d.endingPrincipal,
          21: 0,
          22: d.advance,
          24: d.advance,
          27: d.endingPrincipal,
          29: d.endingPrincipal,
          30: d.loss,
          31: d.basis,
        }).forEach(([line, v]) => row[`line${line}_${suffix}`] = v);
        if (d.advance) row[`line25_${suffix}`] = "1.0000";
        if (d.repayment) {
          for (const line of [19, 26, 32, 33]) {
            row[`line${line}_${suffix}`] = d.repayment;
          }
        }
      });
      if (start === 0) {
        const advance = overflow.reduce((n, r) => n + r.advance, 0),
          repay = overflow.reduce((n, r) => n + r.repayment, 0),
          face = advance - repay;
        for (
          const [line, v] of Object.entries({
            16: 0,
            17: advance,
            18: advance,
            20: face,
            21: 0,
            22: advance,
            24: advance,
            27: face,
            29: face,
            30: allowedDebt,
            31: face - allowedDebt,
          })
        ) row[`line${line}_total`] = v;
        if (repay) {
          for (const line of [19, 26, 32, 33]) {
            row[`line${line}_total`] = repay;
          }
        }
      }
      row.debt_column_start = start + 1;
      row.debt_column_count = overflow.length;
      row.debt_source_references = overflow.slice(start, start + 3).map((d) =>
        d.id
      );
      result.push(row);
    }
    return result;
  },
  async decoratePages(document, pages, fields) {
    if (!fields.debt_column_start) return;
    const font = await document.embedFont(StandardFonts.Helvetica);
    if (fields.part_ii_continuation) {
      const sections = await Promise.all([
        document.embedPage(pages[0], {
          left: 0,
          bottom: 0,
          right: 612,
          top: 192,
        }),
        document.embedPage(pages[1], {
          left: 0,
          bottom: 444,
          right: 612,
          top: 792,
        }),
      ]);
      for (let i = 0; i < 2; i++) {
        await sections[i].embed();
        pages[i].node.set(PDFName.of("Contents"), document.context.obj([]));
        pages[i].drawPage(sections[i], {
          x: 0,
          y: i ? 444 : 0,
          width: 612,
          height: i ? 348 : 192,
        });
      }
      pages[0].drawText("Form 7203 - additional Part II only", {
        x: 36,
        y: 730,
        size: 12,
        font,
      });
      pages[0].drawText(
        `${fields.shareholder_name}  SSN ${fields.shareholder_ssn}`,
        { x: 36, y: 710, size: 10, font },
      );
      pages[0].drawText(
        `${fields.corporation_name}  EIN ${fields.corporation_ein}`,
        { x: 36, y: 692, size: 10, font },
      );
      pages[1].drawText(
        `${fields.shareholder_name}  SSN ${fields.shareholder_ssn}  EIN ${fields.corporation_ein}`,
        { x: 36, y: 767, size: 8, font },
      );
    }
    const end = Math.min(
      Number(fields.debt_column_start) + 2,
      Number(fields.debt_column_count),
    );
    pages[0].drawText(
      `Part II debt inventory ${fields.debt_column_start}-${end} of ${fields.debt_column_count}`,
      {
        x: 36,
        y: fields.part_ii_continuation ? 595 : 8,
        size: fields.part_ii_continuation ? 10 : 7,
        font,
      },
    );
    if (fields.part_ii_continuation) {
      for (
        const [j, id] of (fields.debt_source_references as string[]).entries()
      ) {
        pages[0].drawText(`${Number(fields.debt_column_start) + j}: ${id}`, {
          x: 36,
          y: 575 - j * 14,
          size: 8,
          font,
          maxWidth: 530,
        });
      }
    }
  },
};
