import {
  allocateDebtInventory,
  allocateThreeDebtReductions,
  allocateTwoDebtReductions,
} from "../../../../nodes/intermediate/forms/form7203/debt-allocation.ts";
import { isDeepStrictEqual } from "node:util";
import { FilingStatus } from "../../../../mef/header.ts";
import {
  ownedDebtFamily,
  ownedDebtFamilyQbiLines,
} from "../../../../nodes/intermediate/forms/form7203/owned-family.ts";
import { ownedSCorpLossLines } from "../../../../nodes/intermediate/forms/form8995/owned-s-corp-loss.ts";
import { z } from "zod";
import type { FilerIdentity } from "../../../../mef/header.ts";
import { inputSchema as k1SCorpInputSchema } from "../../../../nodes/inputs/k1_s_corp/index.ts";
import { inputSchema as form7203InputSchema } from "../../../../nodes/intermediate/forms/form7203/index.ts";
import { reviewedStockLossLedgerSchema } from "../../../../nodes/intermediate/forms/form7203/stock-ledger.ts";
import {
  reconcileCashCapitalAndNewNote,
  reconcileNewFormalNotes,
  sumPrincipalRepayments,
  totalCurrentDebtAdvances,
} from "../../../../nodes/intermediate/forms/form7203/debt-note.ts";

const pendingRecordSchema = z.record(z.string(), z.unknown());

// Shared by the staged native and PDF projections. It is deliberately strict:
// the historical loose basis number is not a filing-source alternative.
function projectSingleReviewedStockLoss7203(
  rawFields: Record<string, unknown>,
  allPending: Readonly<Record<string, unknown>>,
  filer: FilerIdentity | undefined,
) {
  if (!filer) {
    throw new Error(
      "Form 7203 stock-loss projection needs the identified filer",
    );
  }
  if (!allPending.k1_s_corp) {
    throw new Error(
      "Form 7203 stock-loss projection needs a reviewed S-corporation K-1",
    );
  }
  const k1Sources = k1SCorpInputSchema.parse(allPending.k1_s_corp).k1_s_corps;
  if (k1Sources.length !== 1) {
    throw new Error(
      "Form 7203 stock-loss projection currently needs exactly one S-corporation K-1",
    );
  }
  const source = k1Sources[0];
  if (
    source.form7203_debt_evidence?.kind ===
      "prior_reduced_formal_note_repayment"
  ) {
    throw new Error(
      "Form 7203 prior reduced note needs executor-owned prior filing and current payment bytes before native or PDF export",
    );
  }
  const note = source.form7203_debt_evidence
    ? reconcileNewFormalNotes(
      source.form7203_debt_evidence,
      source,
    ).note
    : undefined;
  const ledger = reviewedStockLossLedgerSchema.parse(
    source.form7203_stock_loss_ledger,
  );
  if (
    Object.keys(rawFields).some((key) =>
      key !== "stock_basis_beginning" && key !== "ordinary_loss" &&
      key !== "additional_contributions" &&
      key !== "reviewed_stock_loss_ledger" &&
      !(note && (key === "new_loans" || key === "reviewed_debt_evidence"))
    )
  ) {
    throw new Error(
      "Form 7203 stock-loss projection does not accept unreviewed basis fields",
    );
  }
  const fields = form7203InputSchema.parse(rawFields);
  const currentLoss = -(source.box1_ordinary_business ?? 0);
  const basis = ledger.beginning_stock_basis;
  const contribution = ledger.cash_capital_contribution?.amount ?? 0;
  if (note && contribution > 0) {
    reconcileCashCapitalAndNewNote(ledger, note);
    if (
      currentLoss <= basis + contribution ||
      JSON.stringify(fields.reviewed_stock_loss_ledger) !==
        JSON.stringify(ledger)
    ) {
      throw new Error(
        "Form 7203 combined capital-and-debt projection needs exact stock evidence and loss reaching the note",
      );
    }
  } else if (fields.reviewed_stock_loss_ledger !== undefined) {
    throw new Error(
      "Form 7203 debt projection only retains a stock ledger for a cash capital contribution",
    );
  }
  if (
    note
      ? ledger.no_shareholder_debt_or_repayments ||
        ledger.beginning_stock_basis !== note.beginning_stock_basis ||
        ledger.beginning_basis_workpaper_reference !==
          note.beginning_stock_basis_workpaper_reference ||
        ledger.shareholder_ssn !== note.shareholder_ssn ||
        ledger.corporation_ein !== note.corporation_ein ||
        fields.new_loans !== totalCurrentDebtAdvances(note) ||
        JSON.stringify(fields.reviewed_debt_evidence) !== JSON.stringify(note)
      : !ledger.no_shareholder_debt_or_repayments ||
        fields.new_loans !== undefined ||
        fields.reviewed_debt_evidence !== undefined
  ) {
    throw new Error(
      "Form 7203 formal-note and stock basis source must reconcile",
    );
  }
  const availableBasis = basis + contribution;
  const normalizedName = (value: string) =>
    value.trim().toUpperCase().replace(/\s+/g, " ");
  const isSpouse = filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    ledger.shareholder_ssn === filer.spouse?.ssn;
  const shareholderSSN = isSpouse ? filer.spouse!.ssn : filer.primarySSN;
  const shareholderName = isSpouse
    ? [
      filer.spouse!.firstName,
      filer.spouse!.middleInitial,
      filer.spouse!.lastName,
    ].filter(Boolean).join(" ")
    : filer.fullName ?? filer.nameLine1;
  const validBusinessName = /^([A-Za-z0-9#\-()&'] ?)*[A-Za-z0-9#\-()&']$/;
  if (
    !Number.isSafeInteger(currentLoss) || currentLoss <= 0 ||
    source.corporation_ein !== ledger.corporation_ein ||
    source.corporation_name.length > 75 ||
    !validBusinessName.test(source.corporation_name) ||
    !source.source_document_reference ||
    source.stock_basis_beginning !== undefined ||
    source.debt_basis_beginning !== undefined ||
    ledger.shareholder_ssn !== shareholderSSN ||
    normalizedName(ledger.shareholder_name_as_on_k1) !==
      normalizedName(shareholderName) ||
    fields.stock_basis_beginning !== basis ||
    (fields.additional_contributions ?? 0) !== contribution ||
    fields.ordinary_loss !== currentLoss ||
    [
      source.box2_rental_re,
      source.box3_other_rental,
      source.box4_interest,
      source.box5a_ordinary_dividends,
      source.box6_royalties,
      source.box7_net_st_cap_gain,
      source.box8a_net_lt_cap_gain,
      source.box9_net_1231,
      source.box10_other_income,
      source.box11_section_179,
      source.box12_other_deductions,
      source.box12_code_h_investment_interest,
      source.box16_tax_exempt_income,
      source.box17_distributions,
      source.pre2018_suspended_losses,
      source.pre2018_at_risk_suspended,
    ].some((amount) => (amount ?? 0) !== 0)
  ) {
    throw new Error(
      "Form 7203 stock-loss projection needs the same single-source stock-only loss and basis as the K-1",
    );
  }

  const allowedStock = Math.min(currentLoss, availableBasis);
  const firstDebtBasis = note
    ? note.cash_advance_amount -
      sumPrincipalRepayments(note.principal_repayments)
    : 0;
  const secondDebtBasis = (note?.second_formal_note?.cash_advance_amount ??
    note?.open_account_net_advance_amount ?? 0) -
    (note?.second_formal_note?.principal_repayment?.amount ?? 0);
  const thirdDebtBasis = note?.kind === "owned_2025_formal_and_open_account" &&
      note.second_formal_note
    ? note.open_account_net_advance_amount
    : 0;
  const inventoryCapacities = note?.additional_formal_notes
    ? [
      firstDebtBasis,
      secondDebtBasis,
      ...note.additional_formal_notes.map((n) =>
        n.cash_advance_amount - (n.principal_repayment?.amount ?? 0)
      ),
      thirdDebtBasis,
    ]
    : undefined;
  const allowedDebt = note
    ? Math.min(
      currentLoss - allowedStock,
      inventoryCapacities?.reduce((a, b) => a + b, 0) ??
        firstDebtBasis + secondDebtBasis + thirdDebtBasis,
    )
    : 0;
  const inventoryAllocation = inventoryCapacities
    ? allocateDebtInventory(allowedDebt, inventoryCapacities)
    : undefined;
  const three = note?.kind === "owned_2025_formal_and_open_account" &&
      note.second_formal_note && !note.additional_formal_notes
    ? allocateThreeDebtReductions(allowedDebt, [
      firstDebtBasis,
      secondDebtBasis,
      thirdDebtBasis,
    ])
    : undefined;
  const allowedDebt1 = inventoryAllocation?.filed[0] ?? three?.filed[0] ??
    (note?.kind === "owned_2025_formal_and_open_account"
      ? allocateTwoDebtReductions(allowedDebt, firstDebtBasis, secondDebtBasis)
        .first
      : secondDebtBasis > 0
      ? allowedDebt * firstDebtBasis / (firstDebtBasis + secondDebtBasis)
      : allowedDebt);
  if (!Number.isSafeInteger(allowedDebt1)) {
    throw new Error(
      "Form 7203 two-note loss does not allocate in exact whole dollars",
    );
  }
  const allowedDebt2 = inventoryAllocation?.filed[1] ?? three?.filed[1] ??
    (allowedDebt - allowedDebt1);
  const allowedDebt3 = inventoryAllocation?.filed[2] ?? three?.filed[2] ?? 0;
  const allowed = allowedStock + allowedDebt;
  const carryover = currentLoss - allowed;
  const schedule1 = pendingRecordSchema.parse(allPending.schedule1);
  const form1040 = pendingRecordSchema.parse(allPending.f1040);
  const printedLine5 = schedule1.line5_schedule_e;
  const schedule1Line10 = schedule1.line10_total_additional_income;
  const form1040Line8 = form1040.line8_additional_income;
  if (
    printedLine5 !== -allowed ||
    typeof schedule1Line10 !== "number" ||
    (form1040Line8 ?? 0) !== schedule1Line10
  ) {
    throw new Error(
      "Form 7203 allowed stock loss must match Schedule 1 line 5 and Form 1040 line 8",
    );
  }

  if (note?.owned_current_records !== undefined) {
    const qbi = pendingRecordSchema.parse(allPending.form8995);
    const f = form1040;
    const expected = ownedSCorpLossLines(
      source,
      Math.max(
        0,
        Number(f.line11_agi) - Number(f.line12c_deduction_total) -
          Number(f.line13b_additional_deductions ?? 0),
      ),
    );
    if (
      Object.entries(expected).some(([key, value]) => qbi[key] !== value) ||
      qbi.qbi_deduction !== 0 || qbi.qbi !== -allowed ||
      carryover !== currentLoss - allowed
    ) {
      throw Error(
        "Owned Form7203 basis limitation must retain its distinct current qualified-loss carry on the actual Form8995",
      );
    }
  }

  return {
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
    allowed,
    carryover,
  };
}

export function projectReviewedStockLoss7203(
  rawFields: Record<string, unknown>,
  allPending: Readonly<Record<string, unknown>>,
  filer: FilerIdentity | undefined,
) {
  if (rawFields.owned_debt_loss_sources !== undefined) {
    if (
      Object.keys(rawFields).some((k) =>
        k !== "owned_debt_loss_sources" && k !== "owned_debt_loss_copy_index"
      )
    ) {
      throw Error(
        "Owned MFJ basis copies cannot mix scalar or unreviewed basis fields",
      );
    }
    const projections = projectOwned7203Family(rawFields, allPending, filer);
    const index = rawFields.owned_debt_loss_copy_index;
    if (
      typeof index !== "number" || !Number.isInteger(index) || index < 0 ||
      index >= projections.length
    ) throw Error("Owned MFJ Form7203 needs its actual selected source copy");
    return projections[index];
  }
  return projectSingleReviewedStockLoss7203(rawFields, allPending, filer);
}

export function projectOwned7203Family(
  rawFields: Record<string, unknown>,
  allPending: Readonly<Record<string, unknown>>,
  filer: FilerIdentity | undefined,
) {
  if (
    !filer || filer.filingStatus !== FilingStatus.MarriedFilingJointly ||
    !filer.spouse?.ssn
  ) {
    throw Error(
      "Owned spouse debt family requires the actual identified MFJ return",
    );
  }
  const sources = k1SCorpInputSchema.parse(allPending.k1_s_corp).k1_s_corps;
  if (
    !isDeepStrictEqual(rawFields.owned_debt_loss_sources, sources) ||
    !isDeepStrictEqual(
      (allPending.form7203 as any)?.owned_debt_loss_sources,
      sources,
    )
  ) {
    throw Error(
      "Owned MFJ basis copies must retain the complete actual source inventory",
    );
  }
  const family = ownedDebtFamily(sources);
  const owners = new Set(family.rows.map((r) => r.source.recipient_tin));
  if (
    [...owners].some((ssn) =>
      ssn !== filer.primarySSN && ssn !== filer.spouse!.ssn
    )
  ) {
    throw Error(
      "Owned MFJ debt sources must belong separately to primary and spouse",
    );
  }
  const sch = pendingRecordSchema.parse(allPending.schedule1),
    f = pendingRecordSchema.parse(allPending.f1040),
    qbi = pendingRecordSchema.parse(allPending.form8995);
  const taxable = Math.max(
    0,
    Number(f.line11_agi) - Number(f.line12c_deduction_total) -
      Number(f.line13b_additional_deductions ?? 0),
  );
  const expected = ownedDebtFamilyQbiLines(sources, taxable);
  if (
    sch.line5_schedule_e !== -family.allowed ||
    f.line8_additional_income !== sch.line10_total_additional_income ||
    qbi.qbi !== -family.allowed ||
    !isDeepStrictEqual(qbi.owned_s_corp_loss_sources, sources) ||
    Object.entries(expected).some(([k, v]) => !isDeepStrictEqual(qbi[k], v))
  ) {
    throw Error(
      "Owned MFJ basis losses/carries and jointQBI must reconcile independently before summing",
    );
  }
  return family.rows.map((r) => {
    const delta = family.allowed - r.basis.allowedLoss;
    const virtual = {
      ...allPending,
      k1_s_corp: { k1_s_corps: [r.source] },
      form7203: r.fields,
      schedule1: {
        ...sch,
        line5_schedule_e: -r.basis.allowedLoss,
        line10_total_additional_income:
          Number(sch.line10_total_additional_income) + delta,
      },
      f1040: {
        ...f,
        line8_additional_income: Number(f.line8_additional_income) + delta,
      },
      form8995: {
        ...qbi,
        ...ownedSCorpLossLines(r.source, taxable),
        qbi: -r.basis.allowedLoss,
        owned_s_corp_loss_source: r.source,
      },
    };
    return projectSingleReviewedStockLoss7203(r.fields, virtual, filer);
  });
}
