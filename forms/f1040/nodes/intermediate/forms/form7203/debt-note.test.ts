import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { k1SCorpNode } from "../../../inputs/k1_s_corp/index.ts";
import { reconcileNewFormalNotes } from "./debt-note.ts";
import {
  calculatePriorReducedNoteGainCandidate,
  calculatePriorReducedNoteWorkpaper,
} from "./prior-reduced-note.ts";
import { buildReviewedStockLoss7203 } from "../../../../2025/mef/forms/f7203_stock_loss.ts";
import { form7203StockLossPdf } from "../../../../2025/pdf/forms/f7203_stock_loss.ts";
import { buildReviewedStockLossScheduleE } from "../../../../2025/mef/forms/schedule_e_stock_loss.ts";
import { scheduleEStockLossPdf } from "../../../../2025/pdf/forms/schedule_e_stock_loss.ts";
import { form7203 as form7203Node } from "./index.ts";
import { FilingStatus } from "../../../../mef/header.ts";
import { executePriorReduced7203WithSourceDocuments } from "../../../../2025/form7203_prior_reduced_execution.ts";

export const oneNote = {
  kind: "new_2025_formal_notes",
  shareholder_ssn: "123456789",
  corporation_ein: "987654321",
  k1_source_document_reference: "2025 signed K-1 copy",
  beginning_stock_basis: 500,
  beginning_stock_basis_workpaper_reference: "2024 stock-basis rollforward",
  current_box1_ordinary_loss: 4_000,
  formal_note_id: "note-2025-01",
  signed_note_document_reference: "signed note PDF 2025-01",
  note_execution_date: "2025-03-10",
  shareholder_lender_ssn: "123456789",
  corporate_borrower_ein: "987654321",
  bank_transfer_reference: "2025 bank transfer 77",
  cash_advance_amount: 2_000,
  corporation_received_funds_confirmed: true,
  shareholder_funded_directly_confirmed: true,
  not_a_guarantee_or_cosign_confirmed: true,
  beginning_note_face_amount: 0,
  beginning_note_debt_basis: 0,
  no_other_shareholder_debt_confirmed: true,
  no_2025_repayments_confirmed: true,
  no_prior_reduced_debt_basis_confirmed: true,
  no_other_2025_basis_changes_confirmed: true,
  no_prior_suspended_losses_confirmed: true,
};

export const oneNoteK1 = {
  corporation_name: "Test S Corp",
  corporation_ein: "987654321",
  source_document_reference: "2025 signed K-1 copy",
  recipient_tin: "123456789",
  box1_ordinary_business: -4_000,
  form7203_stock_loss_ledger: {
    shareholder_ssn: "123456789",
    shareholder_name_as_on_k1: "Alex Taxpayer",
    corporation_ein: "987654321",
    beginning_stock_basis: 500,
    beginning_basis_workpaper_reference: "2024 stock-basis rollforward",
    original_shareholder: true,
    all_shares_one_stock_block: true,
    no_current_year_stock_transactions: true,
    no_section_1367_1_g_election: true,
    no_other_2025_stock_basis_changes: true,
    no_other_schedule_e_activity: true,
    materially_participated_in_s_corporation: true,
    material_participation_workpaper_reference: "2025 activity log",
    no_shareholder_debt_or_repayments: false,
    no_prior_year_suspended_losses: true,
    no_at_risk_or_passive_limitation: true,
  },
  form7203_debt_evidence: oneNote,
};

Deno.test("Form 7203 one formal note candidate reconciles source identities and bounded loss", () => {
  const result = reconcileNewFormalNotes(oneNote, oneNoteK1);
  assertEquals(result.stockSupportedLoss, 500);
  assertEquals(result.debtSupportedLossCandidate, 2_000);
  assertThrows(() =>
    reconcileNewFormalNotes(
      {
        ...oneNote,
        bank_transfer_reference: oneNote.signed_note_document_reference,
      },
      oneNoteK1,
    )
  );
  assertThrows(() =>
    reconcileNewFormalNotes(oneNote, {
      ...oneNoteK1,
      source_document_reference: "different K-1",
    })
  );
});

Deno.test("Form 7203 two-note second principal repayment replays into return, native and PDF", () => {
  const secondNote = {
    formal_note_id: "note-2025-02",
    signed_note_document_reference: "signed note PDF 2025-02",
    note_execution_date: "2025-06-12",
    shareholder_lender_ssn: "123456789",
    corporate_borrower_ein: "987654321",
    bank_transfer_reference: "2025 bank transfer 88",
    cash_advance_amount: 1_000,
    corporation_received_funds_confirmed: true,
    shareholder_funded_directly_confirmed: true,
    not_a_guarantee_or_cosign_confirmed: true,
    beginning_note_face_amount: 0,
    beginning_note_debt_basis: 0,
    no_2025_repayments_confirmed: false,
    principal_repayment: {
      formal_note_id: "note-2025-02",
      date: "2025-08-15",
      amount: 500,
      corporate_loan_ledger_reference:
        "2025 corporation note-02 principal ledger",
      shareholder_bank_deposit_reference:
        "2025 shareholder note-02 bank deposit",
      principal_only_confirmed: true,
    },
    no_prior_reduced_debt_basis_confirmed: true,
  };
  const notes = {
    ...oneNote,
    current_box1_ordinary_loss: 2_500,
    second_formal_note: secondNote,
  };
  const source = {
    ...oneNoteK1,
    box1_ordinary_business: -2_500,
    box16_code_e_loan_repayment: 500,
    form7203_debt_evidence: notes,
  };
  assertEquals(
    reconcileNewFormalNotes(notes, source).debtSupportedLossCandidate,
    2_000,
  );
  const k1 = k1SCorpNode.compute(
    { taxYear: 2025, formType: "f1040" },
    k1SCorpNode.inputSchema.parse({ k1_s_corps: [source] }),
  );
  const fields = k1.outputs.find((row) => row.nodeType === "form7203")!.fields;
  const nodeResult = form7203Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form7203Node.inputSchema.parse(fields),
  );
  assertEquals(nodeResult.outputs.length, 0);
  const filer = {
    primarySSN: "123456789",
    fullName: "Alex Taxpayer",
    nameLine1: "Alex Taxpayer",
    nameControl: "TAXP",
    address: {
      line1: "1 Main St",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    filingStatus: FilingStatus.Single,
  };
  const pending = {
    k1_s_corp: { k1_s_corps: [source] },
    schedule1: {
      line5_schedule_e: -2_500,
      line10_total_additional_income: -2_500,
    },
    f1040: { line8_additional_income: -2_500 },
  };
  const xml = buildReviewedStockLoss7203(fields, { filer, pending });
  assertEquals(xml.match(/<ShareholderDebtBasisGrp>/g)?.length, 2);
  assertEquals(
    xml.includes("<PrincipalDebtRepaymentAmt>500</PrincipalDebtRepaymentAmt>"),
    true,
  );
  assertEquals(xml.includes("<AllowableLossAmt>1600</AllowableLossAmt>"), true);
  assertEquals(xml.includes("<AllowableLossAmt>400</AllowableLossAmt>"), true);
  assertEquals(
    xml.includes(
      "<TotPrincipalDebtRepaymentAmt>500</TotPrincipalDebtRepaymentAmt>",
    ),
    true,
  );
  const pdf = form7203StockLossPdf.instances?.(fields, filer, pending)?.[0];
  assertEquals(pdf?.line19_debt1, undefined);
  assertEquals(pdf?.line19_debt2, 500);
  assertEquals(pdf?.line26_debt2, 500);
  assertEquals(pdf?.line32_debt2, 500);
  assertEquals(pdf?.line33_debt2, 500);
  assertEquals(pdf?.line27_total, 2_500);
  assertEquals(pdf?.line30_debt1, 1_600);
  assertEquals(pdf?.line30_debt2, 400);
  assertEquals(pdf?.line31_debt1, 400);
  assertEquals(pdf?.line31_debt2, 100);
  assertEquals(pdf?.line35_allowed_debt, 2_000);
  assertEquals(
    buildReviewedStockLossScheduleE(fields, { filer, pending }).includes(
      "<NonpassiveLossAmt>2500</NonpassiveLossAmt>",
    ),
    true,
  );
  assertEquals(
    scheduleEStockLossPdf.instances?.(fields, filer, pending)?.[0]?.line41,
    -2_500,
  );
  assertThrows(() =>
    reconcileNewFormalNotes({
      ...notes,
      second_formal_note: {
        ...secondNote,
        principal_repayment: {
          ...secondNote.principal_repayment,
          formal_note_id: oneNote.formal_note_id,
        },
      },
    }, source)
  );
  assertThrows(() =>
    reconcileNewFormalNotes({
      ...notes,
      no_2025_repayments_confirmed: false,
      principal_repayments: [{
        ...secondNote.principal_repayment,
        formal_note_id: oneNote.formal_note_id,
        corporate_loan_ledger_reference: "first note loan ledger",
        shareholder_bank_deposit_reference: "first note bank deposit",
      }],
    }, source)
  );
  assertThrows(() =>
    buildReviewedStockLoss7203(fields, {
      filer,
      pending: {
        ...pending,
        k1_s_corp: {
          k1_s_corps: [{ ...source, box16_code_e_loan_repayment: 600 }],
        },
      },
    })
  );
  assertThrows(() =>
    form7203StockLossPdf.instances?.(fields, filer, {
      ...pending,
      f1040: { line8_additional_income: -2_400 },
    })
  );
});

Deno.test("Form 7203 one-note K-1 posts the bounded debt-basis loss allowance", () => {
  const parsed = k1SCorpNode.inputSchema.parse({ k1_s_corps: [oneNoteK1] });
  const result = k1SCorpNode.compute(
    { taxYear: 2025, formType: "f1040" },
    parsed,
  );
  const form7203 = result.outputs.find((item) => item.nodeType === "form7203");
  assertEquals(form7203?.fields.stock_basis_beginning, 500);
  assertEquals(form7203?.fields.new_loans, 2_000);
  assertEquals(form7203?.fields.ordinary_loss, 4_000);
  const basisResult = form7203Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form7203Node.inputSchema.parse(form7203!.fields),
  );
  assertEquals(basisResult.carryforwards?.suspended_scorp_loss_7203, 1_500);
  assertEquals(
    basisResult.outputs.find((item) => item.nodeType === "schedule1")?.fields
      .basis_disallowed_add_back,
    1_500,
  );
});

Deno.test("Form 7203 native and PDF print one formal note and Part III debt allowance", () => {
  const filer = {
    primarySSN: "123456789",
    nameLine1: "Alex Taxpayer",
    nameControl: "TAXP",
    address: {
      line1: "1 Main St",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    filingStatus: FilingStatus.Single,
  };
  const pending = {
    k1_s_corp: { k1_s_corps: [oneNoteK1] },
    schedule1: {
      line5_schedule_e: -2_500,
      line10_total_additional_income: -2_500,
    },
    f1040: { line8_additional_income: -2_500 },
  };
  const fields = {
    stock_basis_beginning: 500,
    ordinary_loss: 4_000,
    new_loans: 2_000,
    reviewed_debt_evidence: oneNote,
  };
  const xml = buildReviewedStockLoss7203(fields, { filer, pending });
  assertEquals(xml.includes("<FormalNoteInd>X</FormalNoteInd>"), true);
  assertEquals(xml.includes("<AllowableLossAmt>2000</AllowableLossAmt>"), true);
  assertEquals(xml.includes("<ShrAllwblLossFromDebtBasisGrp>"), true);
  const pdf = form7203StockLossPdf.instances?.(fields, filer, pending)?.[0];
  assertEquals(pdf?.line30_debt1, 2_000);
  assertEquals(pdf?.line31_debt1, 0);
  assertEquals(pdf?.line35_allowed_debt, 2_000);
  assertEquals(pdf?.line47_carryover, 1_500);
  assertEquals(
    form7203StockLossPdf.fields.find((entry) =>
      entry.domainKey === "formal_note_debt1"
    )?.pdfField,
    "topmostSubform[0].Page1[0].Table_SectionA[0].Header[0].aDebt1[0].c1_7[0]",
  );
  assertEquals(
    form7203StockLossPdf.fields.find((entry) =>
      entry.domainKey === "line30_debt1"
    )?.pdfField,
    "topmostSubform[0].Page2[0].Table_SectionB[0].Line30[0].f2_37[0]",
  );
  const scheduleEXml = buildReviewedStockLossScheduleE(fields, {
    filer,
    pending,
  });
  assertEquals(
    scheduleEXml.includes("<NonpassiveLossAmt>2500</NonpassiveLossAmt>"),
    true,
  );
  const scheduleEPdf = scheduleEStockLossPdf.instances?.(fields, filer, pending)
    ?.[0];
  assertEquals(scheduleEPdf?.line41, -2_500);
  assertThrows(
    () =>
      buildReviewedStockLoss7203(fields, {
        filer,
        pending: {
          ...pending,
          schedule1: {
            line5_schedule_e: -500,
            line10_total_additional_income: -500,
          },
        },
      }),
    Error,
    "must match Schedule 1 line 5",
  );
});

Deno.test("Form 7203 sourced principal repayment reduces debt basis before the current loss", () => {
  const repaidNote = {
    ...oneNote,
    no_2025_repayments_confirmed: false,
    principal_repayments: [{
      formal_note_id: oneNote.formal_note_id,
      date: "2025-08-15",
      amount: 500,
      corporate_loan_ledger_reference:
        "corporate loan ledger repayment 2025-08",
      shareholder_bank_deposit_reference:
        "shareholder bank principal deposit 2025-08",
      principal_only_confirmed: true,
    }],
  };
  const source = {
    ...oneNoteK1,
    box16_code_e_loan_repayment: 500,
    form7203_debt_evidence: repaidNote,
  };
  assertEquals(
    reconcileNewFormalNotes(repaidNote, source)
      .debtSupportedLossCandidate,
    1_500,
  );
  const k1 = k1SCorpNode.compute(
    { taxYear: 2025, formType: "f1040" },
    k1SCorpNode.inputSchema.parse({ k1_s_corps: [source] }),
  );
  const fields = k1.outputs.find((row) => row.nodeType === "form7203")!.fields;
  const result = form7203Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form7203Node.inputSchema.parse(fields),
  );
  assertEquals(result.carryforwards?.suspended_scorp_loss_7203, 2_000);
  assertEquals(
    result.outputs.find((row) => row.nodeType === "schedule1")?.fields
      .basis_disallowed_add_back,
    2_000,
  );
  const filer = {
    primarySSN: "123456789",
    fullName: "Alex Taxpayer",
    nameLine1: "Alex Taxpayer",
    nameControl: "TAXP",
    address: {
      line1: "1 Main St",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    filingStatus: FilingStatus.Single,
  };
  const pending = {
    k1_s_corp: { k1_s_corps: [source] },
    schedule1: {
      line5_schedule_e: -2_000,
      line10_total_additional_income: -2_000,
    },
    f1040: { line8_additional_income: -2_000 },
  };
  const xml = buildReviewedStockLoss7203(fields, { filer, pending });
  assertEquals(
    xml.includes("<PrincipalDebtRepaymentAmt>500</PrincipalDebtRepaymentAmt>"),
    true,
  );
  assertEquals(
    xml.includes(
      "<NontaxableDebtRepaymentAmt>500</NontaxableDebtRepaymentAmt>",
    ),
    true,
  );
  assertEquals(xml.includes("<AllowableLossAmt>1500</AllowableLossAmt>"), true);
  const pdf = form7203StockLossPdf.instances?.(fields, filer, pending)?.[0];
  assertEquals(pdf?.line19_debt1, 500);
  assertEquals(pdf?.line26_debt1, 500);
  assertEquals(pdf?.line30_debt1, 1_500);
  assertEquals(pdf?.line32_debt1, 500);
  assertEquals(pdf?.line33_debt1, 500);
  assertEquals(pdf?.line35_allowed_debt, 1_500);
  assertThrows(() =>
    reconcileNewFormalNotes({
      ...repaidNote,
      principal_repayments: [{
        ...repaidNote.principal_repayments[0],
        date: "2025-03-01",
      }],
    }, source)
  );
  assertThrows(() =>
    buildReviewedStockLoss7203(fields, {
      filer,
      pending: {
        ...pending,
        k1_s_corp: {
          k1_s_corps: [{
            ...source,
            form7203_debt_evidence: {
              ...repaidNote,
              principal_repayments: [{
                ...repaidNote.principal_repayments[0],
                amount: 600,
              }],
            },
          }],
        },
      },
    })
  );
  assertThrows(() =>
    form7203StockLossPdf.instances?.(fields, filer, {
      ...pending,
      f1040: { line8_additional_income: -1_900 },
    })
  );
});

Deno.test("Form 7203 two sourced formal notes allocate Part II loss in separate columns", () => {
  const twoNotes = {
    ...oneNote,
    second_formal_note: {
      formal_note_id: "note-2025-02",
      signed_note_document_reference: "signed note PDF 2025-02",
      note_execution_date: "2025-06-12",
      shareholder_lender_ssn: "123456789",
      corporate_borrower_ein: "987654321",
      bank_transfer_reference: "2025 bank transfer 88",
      cash_advance_amount: 1_000,
      corporation_received_funds_confirmed: true,
      shareholder_funded_directly_confirmed: true,
      not_a_guarantee_or_cosign_confirmed: true,
      beginning_note_face_amount: 0,
      beginning_note_debt_basis: 0,
      no_2025_repayments_confirmed: true,
      no_prior_reduced_debt_basis_confirmed: true,
    },
  };
  const source = {
    ...oneNoteK1,
    form7203_debt_evidence: twoNotes,
  };
  assertEquals(
    reconcileNewFormalNotes(twoNotes, source)
      .debtSupportedLossCandidate,
    3_000,
  );
  const k1 = k1SCorpNode.compute(
    { taxYear: 2025, formType: "f1040" },
    k1SCorpNode.inputSchema.parse({ k1_s_corps: [source] }),
  );
  const fields = k1.outputs.find((row) => row.nodeType === "form7203")!.fields;
  assertEquals(fields.new_loans, 3_000);
  const result = form7203Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form7203Node.inputSchema.parse(fields),
  );
  assertEquals(result.carryforwards?.suspended_scorp_loss_7203, 500);
  const filer = {
    primarySSN: "123456789",
    fullName: "Alex Taxpayer",
    nameLine1: "Alex Taxpayer",
    nameControl: "TAXP",
    address: {
      line1: "1 Main St",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    filingStatus: FilingStatus.Single,
  };
  const pending = {
    k1_s_corp: { k1_s_corps: [source] },
    schedule1: {
      line5_schedule_e: -3_500,
      line10_total_additional_income: -3_500,
    },
    f1040: { line8_additional_income: -3_500 },
  };
  const xml = buildReviewedStockLoss7203(fields, { filer, pending });
  assertEquals(xml.match(/<ShareholderDebtBasisGrp>/g)?.length, 2);
  assertEquals(
    xml.includes("<TotAdditionalLoansAmt>3000</TotAdditionalLoansAmt>"),
    true,
  );
  assertEquals(
    xml.includes("<TotDebtBasisEndTaxYrAmt>0</TotDebtBasisEndTaxYrAmt>"),
    true,
  );
  const pdf = form7203StockLossPdf.instances?.(fields, filer, pending)?.[0];
  assertEquals(pdf?.formal_note_debt2, true);
  assertEquals(pdf?.line17_debt2, 1_000);
  assertEquals(pdf?.line17_total, 3_000);
  assertEquals(pdf?.line30_debt1, 2_000);
  assertEquals(pdf?.line30_debt2, 1_000);
  assertEquals(pdf?.line30_total, 3_000);
  assertEquals(
    form7203StockLossPdf.fields.find((entry) =>
      entry.domainKey === "formal_note_debt2"
    )?.pdfField,
    "topmostSubform[0].Page1[0].Table_SectionA[0].Header[0].bDebt2[0].c1_8[0]",
  );
  assertEquals(
    form7203StockLossPdf.fields.find((entry) =>
      entry.domainKey === "line30_debt2"
    )?.pdfField,
    "topmostSubform[0].Page2[0].Table_SectionB[0].Line30[0].f2_38[0]",
  );
  const scheduleEXml = buildReviewedStockLossScheduleE(fields, {
    filer,
    pending,
  });
  assertEquals(
    scheduleEXml.includes("<NonpassiveLossAmt>3500</NonpassiveLossAmt>"),
    true,
  );
  const scheduleEPdf = scheduleEStockLossPdf.instances?.(fields, filer, pending)
    ?.[0];
  assertEquals(scheduleEPdf?.line41, -3_500);
  assertThrows(() =>
    reconcileNewFormalNotes({
      ...twoNotes,
      second_formal_note: {
        ...twoNotes.second_formal_note,
        formal_note_id: twoNotes.formal_note_id,
      },
    }, source)
  );
  assertThrows(() =>
    reconcileNewFormalNotes({
      ...twoNotes,
      current_box1_ordinary_loss: 2_400,
    }, {
      ...source,
      box1_ordinary_business: -2_400,
    })
  );
  assertThrows(() =>
    buildReviewedStockLoss7203(fields, {
      filer,
      pending: {
        ...pending,
        k1_s_corp: {
          k1_s_corps: [{
            ...source,
            form7203_debt_evidence: {
              ...twoNotes,
              second_formal_note: {
                ...twoNotes.second_formal_note,
                cash_advance_amount: 1_200,
              },
            },
          }],
        },
      },
    })
  );
  assertThrows(() =>
    form7203StockLossPdf.instances?.(fields, filer, {
      ...pending,
      f1040: { line8_additional_income: -3_400 },
    })
  );
  const partialSource = {
    ...source,
    box1_ordinary_business: -2_000,
    form7203_debt_evidence: {
      ...twoNotes,
      current_box1_ordinary_loss: 2_000,
    },
  };
  const partialFields = k1SCorpNode.compute(
    { taxYear: 2025, formType: "f1040" },
    k1SCorpNode.inputSchema.parse({ k1_s_corps: [partialSource] }),
  ).outputs.find((row) => row.nodeType === "form7203")!.fields;
  const partialPending = {
    k1_s_corp: { k1_s_corps: [partialSource] },
    schedule1: {
      line5_schedule_e: -2_000,
      line10_total_additional_income: -2_000,
    },
    f1040: { line8_additional_income: -2_000 },
  };
  const partialPdf = form7203StockLossPdf.instances?.(
    partialFields,
    filer,
    partialPending,
  )?.[0];
  assertEquals(partialPdf?.line30_debt1, 1_000);
  assertEquals(partialPdf?.line30_debt2, 500);
  assertEquals(partialPdf?.line31_debt1, 1_000);
  assertEquals(partialPdf?.line31_debt2, 500);
});

Deno.test("Form 7203 two formal notes reconcile one identified principal repayment and post-repayment loss allocation", () => {
  const repaidTwoNotes = {
    ...oneNote,
    current_box1_ordinary_loss: 2_500,
    no_2025_repayments_confirmed: false,
    principal_repayments: [{
      formal_note_id: oneNote.formal_note_id,
      date: "2025-08-15",
      amount: 500,
      corporate_loan_ledger_reference:
        "2025 corporation note-01 principal ledger",
      shareholder_bank_deposit_reference:
        "2025 shareholder note-01 bank deposit",
      principal_only_confirmed: true,
    }],
    second_formal_note: {
      formal_note_id: "note-2025-02",
      signed_note_document_reference: "signed note PDF 2025-02",
      note_execution_date: "2025-06-12",
      shareholder_lender_ssn: "123456789",
      corporate_borrower_ein: "987654321",
      bank_transfer_reference: "2025 bank transfer 88",
      cash_advance_amount: 1_000,
      corporation_received_funds_confirmed: true,
      shareholder_funded_directly_confirmed: true,
      not_a_guarantee_or_cosign_confirmed: true,
      beginning_note_face_amount: 0,
      beginning_note_debt_basis: 0,
      no_2025_repayments_confirmed: true,
      no_prior_reduced_debt_basis_confirmed: true,
    },
  };
  const source = {
    ...oneNoteK1,
    box1_ordinary_business: -2_500,
    box16_code_e_loan_repayment: 500,
    form7203_debt_evidence: repaidTwoNotes,
  };
  assertEquals(
    reconcileNewFormalNotes(repaidTwoNotes, source)
      .debtSupportedLossCandidate,
    2_000,
  );
  const k1 = k1SCorpNode.compute(
    { taxYear: 2025, formType: "f1040" },
    k1SCorpNode.inputSchema.parse({ k1_s_corps: [source] }),
  );
  const fields = k1.outputs.find((row) => row.nodeType === "form7203")!.fields;
  const nodeResult = form7203Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form7203Node.inputSchema.parse(fields),
  );
  assertEquals(nodeResult.outputs.length, 0);
  const filer = {
    primarySSN: "123456789",
    fullName: "Alex Taxpayer",
    nameLine1: "Alex Taxpayer",
    nameControl: "TAXP",
    address: {
      line1: "1 Main St",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    filingStatus: FilingStatus.Single,
  };
  const pending = {
    k1_s_corp: { k1_s_corps: [source] },
    schedule1: {
      line5_schedule_e: -2_500,
      line10_total_additional_income: -2_500,
    },
    f1040: { line8_additional_income: -2_500 },
  };
  const xml = buildReviewedStockLoss7203(fields, { filer, pending });
  assertEquals(xml.match(/<ShareholderDebtBasisGrp>/g)?.length, 2);
  assertEquals(
    xml.includes("<PrincipalDebtRepaymentAmt>500</PrincipalDebtRepaymentAmt>"),
    true,
  );
  assertEquals(
    xml.includes(
      "<TotDebtBasisBfrExpnssLossAmt>2500</TotDebtBasisBfrExpnssLossAmt>",
    ),
    true,
  );
  assertEquals(xml.includes("<AllowableLossAmt>1200</AllowableLossAmt>"), true);
  assertEquals(xml.includes("<AllowableLossAmt>800</AllowableLossAmt>"), true);
  const pdf = form7203StockLossPdf.instances?.(fields, filer, pending)?.[0];
  assertEquals(pdf?.line19_debt1, 500);
  assertEquals(pdf?.line19_debt2, undefined);
  assertEquals(pdf?.line27_total, 2_500);
  assertEquals(pdf?.line30_debt1, 1_200);
  assertEquals(pdf?.line30_debt2, 800);
  assertEquals(pdf?.line31_debt1, 300);
  assertEquals(pdf?.line31_debt2, 200);
  assertEquals(pdf?.line35_allowed_debt, 2_000);
  const scheduleEXml = buildReviewedStockLossScheduleE(fields, {
    filer,
    pending,
  });
  assertEquals(
    scheduleEXml.includes("<NonpassiveLossAmt>2500</NonpassiveLossAmt>"),
    true,
  );
  assertEquals(
    scheduleEStockLossPdf.instances?.(fields, filer, pending)?.[0]?.line41,
    -2_500,
  );
  assertThrows(() =>
    reconcileNewFormalNotes({
      ...repaidTwoNotes,
      principal_repayments: [{
        ...repaidTwoNotes.principal_repayments[0],
        formal_note_id: repaidTwoNotes.second_formal_note.formal_note_id,
      }],
    }, source)
  );
  assertThrows(() =>
    reconcileNewFormalNotes({
      ...repaidTwoNotes,
      second_formal_note: {
        ...repaidTwoNotes.second_formal_note,
        no_2025_repayments_confirmed: false,
      },
    }, source)
  );
  assertThrows(() =>
    buildReviewedStockLoss7203(fields, {
      filer,
      pending: {
        ...pending,
        k1_s_corp: {
          k1_s_corps: [{ ...source, box16_code_e_loan_repayment: 600 }],
        },
      },
    })
  );
  assertThrows(() =>
    form7203StockLossPdf.instances?.(fields, filer, {
      ...pending,
      schedule1: { ...pending.schedule1, line5_schedule_e: -2_400 },
    })
  );
});

Deno.test("Form 7203 two formal notes replay each identified repayment through the return and both debt columns", () => {
  const notes = {
    ...oneNote,
    current_box1_ordinary_loss: 2_000,
    no_2025_repayments_confirmed: false,
    principal_repayments: [{
      formal_note_id: oneNote.formal_note_id,
      date: "2025-08-15",
      amount: 500,
      corporate_loan_ledger_reference:
        "2025 note-01 corporate principal ledger",
      shareholder_bank_deposit_reference: "2025 note-01 shareholder deposit",
      principal_only_confirmed: true,
    }],
    second_formal_note: {
      formal_note_id: "note-2025-02",
      signed_note_document_reference: "signed note PDF 2025-02",
      note_execution_date: "2025-06-12",
      shareholder_lender_ssn: "123456789",
      corporate_borrower_ein: "987654321",
      bank_transfer_reference: "2025 bank transfer 88",
      cash_advance_amount: 1_000,
      corporation_received_funds_confirmed: true,
      shareholder_funded_directly_confirmed: true,
      not_a_guarantee_or_cosign_confirmed: true,
      beginning_note_face_amount: 0,
      beginning_note_debt_basis: 0,
      no_2025_repayments_confirmed: false,
      principal_repayment: {
        formal_note_id: "note-2025-02",
        date: "2025-09-12",
        amount: 250,
        corporate_loan_ledger_reference:
          "2025 note-02 corporate principal ledger",
        shareholder_bank_deposit_reference: "2025 note-02 shareholder deposit",
        principal_only_confirmed: true,
      },
      no_prior_reduced_debt_basis_confirmed: true,
    },
  };
  const source = {
    ...oneNoteK1,
    box1_ordinary_business: -2_000,
    box16_code_e_loan_repayment: 750,
    form7203_debt_evidence: notes,
  };
  assertEquals(
    reconcileNewFormalNotes(notes, source).debtSupportedLossCandidate,
    1_500,
  );
  const k1 = k1SCorpNode.compute(
    { taxYear: 2025, formType: "f1040" },
    k1SCorpNode.inputSchema.parse({ k1_s_corps: [source] }),
  );
  const fields = k1.outputs.find((row) => row.nodeType === "form7203")!.fields;
  const nodeResult = form7203Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form7203Node.inputSchema.parse(fields),
  );
  assertEquals(nodeResult.outputs.length, 0);
  const filer = {
    primarySSN: "123456789",
    fullName: "Alex Taxpayer",
    nameLine1: "Alex Taxpayer",
    nameControl: "TAXP",
    address: {
      line1: "1 Main St",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    filingStatus: FilingStatus.Single,
  };
  const pending = {
    k1_s_corp: { k1_s_corps: [source] },
    schedule1: {
      line5_schedule_e: -2_000,
      line10_total_additional_income: -2_000,
    },
    f1040: { line8_additional_income: -2_000 },
  };
  const xml = buildReviewedStockLoss7203(fields, { filer, pending });
  assertEquals(xml.match(/<ShareholderDebtBasisGrp>/g)?.length, 2);
  assertEquals(
    xml.includes(
      "<TotPrincipalDebtRepaymentAmt>750</TotPrincipalDebtRepaymentAmt>",
    ),
    true,
  );
  assertEquals(
    xml.includes("<PrincipalDebtRepaymentAmt>500</PrincipalDebtRepaymentAmt>"),
    true,
  );
  assertEquals(
    xml.includes("<PrincipalDebtRepaymentAmt>250</PrincipalDebtRepaymentAmt>"),
    true,
  );
  assertEquals(
    xml.includes(
      "<TotDebtBasisBfrExpnssLossAmt>2250</TotDebtBasisBfrExpnssLossAmt>",
    ),
    true,
  );
  assertEquals(xml.includes("<AllowableLossAmt>1000</AllowableLossAmt>"), true);
  assertEquals(xml.includes("<AllowableLossAmt>500</AllowableLossAmt>"), true);
  const pdf = form7203StockLossPdf.instances?.(fields, filer, pending)?.[0];
  assertEquals(pdf?.line19_debt1, 500);
  assertEquals(pdf?.line19_debt2, 250);
  assertEquals(pdf?.line19_total, 750);
  assertEquals(pdf?.line26_debt1, 500);
  assertEquals(pdf?.line26_debt2, 250);
  assertEquals(pdf?.line32_debt1, 500);
  assertEquals(pdf?.line32_debt2, 250);
  assertEquals(pdf?.line33_total, 750);
  assertEquals(pdf?.line27_total, 2_250);
  assertEquals(pdf?.line30_debt1, 1_000);
  assertEquals(pdf?.line30_debt2, 500);
  assertEquals(pdf?.line31_debt1, 500);
  assertEquals(pdf?.line31_debt2, 250);
  assertEquals(pdf?.line35_allowed_debt, 1_500);
  assertEquals(
    buildReviewedStockLossScheduleE(fields, { filer, pending }).includes(
      "<NonpassiveLossAmt>2000</NonpassiveLossAmt>",
    ),
    true,
  );
  assertEquals(
    scheduleEStockLossPdf.instances?.(fields, filer, pending)?.[0]?.line41,
    -2_000,
  );
  assertThrows(() =>
    reconcileNewFormalNotes({
      ...notes,
      second_formal_note: {
        ...notes.second_formal_note,
        principal_repayment: {
          ...notes.second_formal_note.principal_repayment,
          formal_note_id: notes.formal_note_id,
        },
      },
    }, source)
  );
  assertThrows(() =>
    reconcileNewFormalNotes({
      ...notes,
      second_formal_note: {
        ...notes.second_formal_note,
        principal_repayment: {
          ...notes.second_formal_note.principal_repayment,
          shareholder_bank_deposit_reference:
            notes.principal_repayments[0].shareholder_bank_deposit_reference,
        },
      },
    }, source)
  );
  assertThrows(() =>
    buildReviewedStockLoss7203(fields, {
      filer,
      pending: {
        ...pending,
        k1_s_corp: {
          k1_s_corps: [{ ...source, box16_code_e_loan_repayment: 500 }],
        },
      },
    })
  );
  assertThrows(() =>
    form7203StockLossPdf.instances?.(fields, filer, {
      ...pending,
      schedule1: { ...pending.schedule1, line5_schedule_e: -1_900 },
    })
  );
  assertThrows(() =>
    buildReviewedStockLoss7203(fields, {
      filer,
      pending: {
        ...pending,
        f1040: { line8_additional_income: -1_900 },
      },
    })
  );
});

Deno.test("Form 7203 prior reduced formal note reads matching 2024 MeF XML but remains closed for filing", async () => {
  const submissionId = "1234567890123abcdef0";
  const ns = 'xmlns="http://www.irs.gov/efile"';
  const formBody =
    `<ShareholderSSN>123456789</ShareholderSSN><SCorporationEIN>987654321</SCorporationEIN><StockBasisEndTaxYearAmt>100</StockBasisEndTaxYearAmt><ShareholderDebtBasisGrp><FormalNoteInd>X</FormalNoteInd><LoanBalanceEndTaxYrAmt>1000</LoanBalanceEndTaxYrAmt><DebtBasisEndTaxYrAmt>500</DebtBasisEndTaxYrAmt></ShareholderDebtBasisGrp><TotLoanBalanceEndTaxYrAmt>1000</TotLoanBalanceEndTaxYrAmt><TotDebtBasisEndTaxYrAmt>500</TotDebtBasisEndTaxYrAmt>`;
  const priorReturn =
    `<Return ${ns}><ReturnHeader><TaxYr>2024</TaxYr><TaxPeriodEndDt>2024-12-31</TaxPeriodEndDt><ReturnTypeCd>1040</ReturnTypeCd><Filer><PrimarySSN>123456789</PrimarySSN></Filer></ReturnHeader><ReturnData><IRS1040/><IRS7203>${formBody}</IRS7203></ReturnData></Return>`;
  const priorReturnDigest = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(priorReturn),
      ),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const manifest =
    `<IRSSubmissionManifest ${ns}><SubmissionId>${submissionId}</SubmissionId><TIN>123456789</TIN><TaxYr>2024</TaxYr><GovernmentCd>IRS</GovernmentCd><FederalSubmissionTypeCd>1040</FederalSubmissionTypeCd><SubmissionXmlSha256>${priorReturnDigest}</SubmissionXmlSha256></IRSSubmissionManifest>`;
  const ack =
    `<Acknowledgement ${ns}><SubmissionId>${submissionId}</SubmissionId><TIN>123456789</TIN><TaxYear>2024</TaxYear><GovernmentCode>IRS</GovernmentCode><SubmissionType>1040</SubmissionType><SubmissionCategory>IND</SubmissionCategory><TaxPeriodEndDate>2024-12-31</TaxPeriodEndDate><AcceptanceStatus>Accepted</AcceptanceStatus><CompletedValidation>true</CompletedValidation></Acknowledgement>`;
  const records = [
    { reference: "2025 signed K-1 copy", text: "synthetic K-1" },
    {
      reference: "2024 stock-basis rollforward",
      text: "synthetic stock basis",
    },
    { reference: "signed 2023 formal note", text: "synthetic signed note" },
    {
      reference: "2023 original shareholder bank advance",
      text: "synthetic bank advance",
    },
    { reference: "accepted 2024 Form 1040", text: priorReturn },
    { reference: "2024 submission manifest", text: manifest },
    { reference: "2024 IRS acceptance receipt", text: ack },
    {
      reference: "accepted 2024 Form 7203",
      text: `<IRS7203 ${ns}>${formBody}</IRS7203>`,
    },
    {
      reference: "2025 corporate note principal ledger",
      text: "synthetic loan ledger",
    },
    {
      reference: "2025 shareholder bank deposit",
      text: "synthetic bank deposit",
    },
  ].map(({ reference, text }) => ({
    reference,
    bytes: new TextEncoder().encode(text),
  }));
  const hashes = await Promise.all(records.map(async (document) =>
    Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", document.bytes)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("")
  ));
  const prior = {
    kind: "prior_reduced_formal_note_repayment",
    shareholder_ssn: "123456789",
    corporation_ein: "987654321",
    k1_source_document_reference: "2025 signed K-1 copy",
    k1_source_document_sha256: hashes[0],
    beginning_stock_basis: 100,
    beginning_stock_basis_workpaper_reference: "2024 stock-basis rollforward",
    beginning_stock_basis_workpaper_sha256: hashes[1],
    current_box1_ordinary_loss: 400,
    formal_note_id: "note-2023-01",
    signed_note_document_reference: "signed 2023 formal note",
    signed_note_sha256: hashes[2],
    note_execution_date: "2023-05-10",
    original_advance_date: "2023-05-10",
    original_advance_amount: 1_000,
    original_advance_bank_reference: "2023 original shareholder bank advance",
    original_advance_bank_sha256: hashes[3],
    no_prior_note_principal_changes_confirmed: true,
    no_form1099b_or_da_for_repayment_confirmed: true,
    no_other_2025_capital_transactions_confirmed: true,
    shareholder_lender_ssn: "123456789",
    corporate_borrower_ein: "987654321",
    prior_filed_return_reference: "accepted 2024 Form 1040",
    prior_filed_return_sha256: hashes[4],
    prior_submission_id: submissionId,
    prior_submission_manifest_reference: "2024 submission manifest",
    prior_submission_manifest_sha256: hashes[5],
    prior_accepted_acknowledgement_reference: "2024 IRS acceptance receipt",
    prior_accepted_acknowledgement_sha256: hashes[6],
    prior_filed_form7203_reference: "accepted 2024 Form 7203",
    prior_filed_form7203_sha256: hashes[7],
    prior_form7203_line20_ending_face: 1_000,
    prior_form7203_line31_ending_basis: 500,
    opening_note_face_amount: 1_000,
    opening_note_debt_basis: 500,
    principal_repayment: {
      formal_note_id: "note-2023-01",
      date: "2025-08-15",
      amount: 400,
      corporate_loan_ledger_reference: "2025 corporate note principal ledger",
      corporate_loan_ledger_sha256: hashes[8],
      shareholder_bank_deposit_reference: "2025 shareholder bank deposit",
      shareholder_bank_deposit_sha256: hashes[9],
      principal_only_confirmed: true,
    },
    no_other_shareholder_debt_confirmed: true,
    no_2025_advances_confirmed: true,
    no_2025_basis_restoration_confirmed: true,
    no_other_2025_basis_changes_confirmed: true,
    no_prior_suspended_losses_confirmed: true,
  };
  const source = {
    ...oneNoteK1,
    box1_ordinary_business: -400,
    box16_code_e_loan_repayment: 400,
    form7203_stock_loss_ledger: {
      ...oneNoteK1.form7203_stock_loss_ledger,
      beginning_stock_basis: 100,
    },
    form7203_debt_evidence: prior,
  };
  const inputs = {
    general: { filing_status: "single", taxpayer_ssn: "123-45-6789" },
    k1_s_corp: [source],
  };
  const bound = await executePriorReduced7203WithSourceDocuments(
    inputs,
    records,
  );
  assertEquals(bound.verifiedSourceDocuments.manifest.length, 10);
  assertEquals(
    bound.inspectedPriorFiling.parsedAcknowledgmentStatus,
    "Accepted",
  );
  assertEquals(bound.inspectedPriorFiling.returnDigestLinkedToManifest, true);
  assertEquals(bound.inspectedPriorFiling.issuerAuthenticated, false);
  const rejectReadableXmlChange = async (
    index: number,
    altered: string,
    digestField: string,
    expectedMessage?: string,
  ) => {
    const bytes = new TextEncoder().encode(altered);
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    await assertRejects(
      () =>
        executePriorReduced7203WithSourceDocuments(
          {
            ...inputs,
            k1_s_corp: [{
              ...source,
              form7203_debt_evidence: { ...prior, [digestField]: digest },
            }],
          },
          records.map((document, documentIndex) =>
            documentIndex === index ? { ...document, bytes } : document
          ),
        ),
      Error,
      expectedMessage,
    );
  };
  await rejectReadableXmlChange(
    4,
    priorReturn.replace("<PrimarySSN>123456789", "<PrimarySSN>999999999"),
    "prior_filed_return_sha256",
  );
  await rejectReadableXmlChange(
    5,
    manifest.replace(submissionId, "another-submission-id"),
    "prior_submission_manifest_sha256",
  );
  await rejectReadableXmlChange(
    5,
    manifest.replace(priorReturnDigest, "0".repeat(64)),
    "prior_submission_manifest_sha256",
  );
  await rejectReadableXmlChange(
    6,
    ack.replace("<AcceptanceStatus>Accepted", "<AcceptanceStatus>Rejected"),
    "prior_accepted_acknowledgement_sha256",
  );
  await rejectReadableXmlChange(
    7,
    `<IRS7203 ${ns}>${
      formBody.replace(
        "<DebtBasisEndTaxYrAmt>500",
        "<DebtBasisEndTaxYrAmt>501",
      )
    }</IRS7203>`,
    "prior_filed_form7203_sha256",
  );
  // Closing balances alone do not establish that this is the filed copy.
  // Rehash the changed source, so a digest mismatch cannot explain rejection.
  await rejectReadableXmlChange(
    7,
    `<IRS7203 ${ns}>${formBody}<StockBasisBegTaxYrAmt>999</StockBasisBegTaxYrAmt></IRS7203>`,
    "prior_filed_form7203_sha256",
    "separate filed copy differs",
  );
  await rejectReadableXmlChange(
    7,
    `<IRS7203 ${ns}>${
      formBody.replace("<FormalNoteInd>", '<FormalNoteInd xmlns="urn:foreign">')
    }</IRS7203>`,
    "prior_filed_form7203_sha256",
  );
  // Namespace correctness also applies to the acknowledgment, independently of
  // complete Form7203 copy matching.
  await rejectReadableXmlChange(
    6,
    ack.replace("<AcceptanceStatus>", '<AcceptanceStatus xmlns="urn:foreign">'),
    "prior_accepted_acknowledgement_sha256",
    "foreign XML namespace",
  );
  assertEquals(
    bound.inspectedPriorFiling.separateFormMatchesEmbeddedContent,
    true,
  );
  const manifestWithoutReturnDigest = manifest.replace(
    `<SubmissionXmlSha256>${priorReturnDigest}</SubmissionXmlSha256>`,
    "",
  );
  const manifestWithoutBytes = new TextEncoder().encode(
    manifestWithoutReturnDigest,
  );
  const manifestWithoutHash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        manifestWithoutBytes,
      ),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const unlinked = await executePriorReduced7203WithSourceDocuments(
    {
      ...inputs,
      k1_s_corp: [{
        ...source,
        form7203_debt_evidence: {
          ...prior,
          prior_submission_manifest_sha256: manifestWithoutHash,
        },
      }],
    },
    records.map((document, index) =>
      index === 5 ? { ...document, bytes: manifestWithoutBytes } : document
    ),
  );
  assertEquals(
    unlinked.inspectedPriorFiling.returnDigestLinkedToManifest,
    false,
  );
  assertEquals(unlinked.inspectedPriorFiling.issuerAuthenticated, false);
  assertEquals(bound.stagedPriorReducedNoteGain.form1040_line7_gain, 200);
  assertEquals(
    bound.verifiedSourceDocuments.getBytes(records[0].reference),
    records[0].bytes,
  );
  const returnedCopy = bound.verifiedSourceDocuments.getBytes(
    records[0].reference,
  );
  if (!returnedCopy) throw new Error("missing verified K-1 bytes");
  returnedCopy[0] = 0;
  assertEquals(
    bound.verifiedSourceDocuments.getBytes(records[0].reference),
    records[0].bytes,
  );
  assertEquals(
    bound.diagnostics.some((entry) =>
      entry.nodeType === "k1_s_corp" &&
      entry.message.includes("prior reduced note")
    ),
    true,
  );
  await assertRejects(() =>
    executePriorReduced7203WithSourceDocuments(
      inputs,
      records.slice(1),
    )
  );
  await assertRejects(() =>
    executePriorReduced7203WithSourceDocuments(
      inputs,
      [
        { ...records[0], bytes: new TextEncoder().encode("changed") },
        ...records.slice(1),
      ],
    )
  );
  await assertRejects(() =>
    executePriorReduced7203WithSourceDocuments(
      inputs,
      records.map((document, index) =>
        index === 3
          ? { ...document, bytes: new TextEncoder().encode("changed advance") }
          : document
      ),
    )
  );
  await assertRejects(() =>
    executePriorReduced7203WithSourceDocuments(
      {
        ...inputs,
        k1_s_corp: [{
          ...source,
          form7203_debt_evidence: {
            ...prior,
            k1_source_document_sha256: "0".repeat(64),
          },
        }],
      },
      records,
    )
  );
  const workpaper = calculatePriorReducedNoteWorkpaper(prior, source);
  assertEquals(workpaper.line25_basis_ratio, "0.5000");
  assertEquals(workpaper.line26_nontaxable_repayment, 200);
  assertEquals(workpaper.line27_basis_before_loss, 300);
  assertEquals(workpaper.line30_allowed_debt_loss, 300);
  assertEquals(workpaper.line34_reportable_gain, 200);
  assertEquals(workpaper.allowed_schedule_e_loss, 400);
  const gain = calculatePriorReducedNoteGainCandidate(prior, source);
  assertEquals(gain.transaction.part, "F");
  assertEquals(gain.transaction.date_acquired, "2023-05-10");
  assertEquals(gain.transaction.date_sold, "2025-08-15");
  assertEquals(gain.transaction.proceeds, 400);
  assertEquals(gain.transaction.cost_basis, 200);
  assertEquals(gain.transaction.gain_loss, 200);
  assertEquals(gain.schedule_d_line10_gain, 200);
  assertEquals(gain.form1040_line7_gain, 200);
  assertThrows(() =>
    calculatePriorReducedNoteGainCandidate({
      ...prior,
      original_advance_date: "2025-01-01",
    }, source)
  );
  assertThrows(() =>
    calculatePriorReducedNoteGainCandidate({
      ...prior,
      original_advance_amount: 900,
    }, source)
  );
  assertThrows(() =>
    calculatePriorReducedNoteWorkpaper({
      ...prior,
      prior_form7203_line31_ending_basis: 600,
    }, source)
  );
  assertThrows(() =>
    calculatePriorReducedNoteWorkpaper(prior, {
      ...source,
      box16_code_e_loan_repayment: 500,
    })
  );
  const filer = {
    primarySSN: "123456789",
    fullName: "Alex Taxpayer",
    nameLine1: "Alex Taxpayer",
    nameControl: "TAXP",
    address: {
      line1: "1 Main St",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    filingStatus: FilingStatus.Single,
  };
  const fields = {
    stock_basis_beginning: 100,
    debt_basis_beginning: 500,
    ordinary_loss: 400,
    reviewed_debt_evidence: prior,
  };
  const pending = { k1_s_corp: { k1_s_corps: [source] } };
  assertThrows(() =>
    k1SCorpNode.compute(
      { taxYear: 2025, formType: "f1040" },
      k1SCorpNode.inputSchema.parse({ k1_s_corps: [source] }),
    )
  );
  assertThrows(() =>
    form7203Node.compute(
      { taxYear: 2025, formType: "f1040" },
      form7203Node.inputSchema.parse(fields),
    )
  );
  assertThrows(() => buildReviewedStockLoss7203(fields, { filer, pending }));
  assertThrows(() => form7203StockLossPdf.instances?.(fields, filer, pending));
});
