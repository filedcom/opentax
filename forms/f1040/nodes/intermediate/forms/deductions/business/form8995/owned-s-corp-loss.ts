import { reconcileOwnedCurrentDebt } from "../../../income/business/form7203/owned-current-source.ts";

/** Pure replay of the owned current-year issued K1/QBI statement and actual
 * direct loan records. No node imports or asserted allowable-loss scalar. */
export function ownedSCorpLossLines(
  raw: unknown,
  taxableIncomeBeforeQbi: number,
) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw Error("Owned S corporation QBI loss requires its complete K1 source");
  }
  const source = raw as Record<string, unknown>;
  const note = source.form7203_debt_evidence as
    | Record<string, unknown>
    | undefined;
  const stock = source.form7203_stock_loss_ledger as
    | Record<string, unknown>
    | undefined;
  if (
    !note ||
    ![
      "new_2025_formal_notes",
      "owned_2025_formal_notes",
      "owned_2025_open_account",
      "owned_2025_formal_and_open_account",
    ].includes(
      String(note.kind),
    ) || !stock || !note.owned_current_records ||
    stock.no_shareholder_debt_or_repayments !== false ||
    note.beginning_note_face_amount !== 0 ||
    note.beginning_note_debt_basis !== 0
  ) {
    throw Error(
      "Owned S corporation QBI loss requires source-proved new direct notes and its unchanged opening stock record",
    );
  }
  const r = reconcileOwnedCurrentDebt(
    note.owned_current_records,
    note as unknown as Parameters<typeof reconcileOwnedCurrentDebt>[1],
  );
  const k = r.source.issued_k1_record;
  const capital = r.source.current_cash_capital_record,
    declared = stock.cash_capital_contribution as
      | Record<string, unknown>
      | undefined;
  if (
    capital
      ? !declared || declared.amount !== capital.paid_cash ||
        declared.contributed_date !== capital.contributed_on ||
        declared.shareholder_ssn !== capital.shareholder_ssn ||
        declared.corporation_ein !== capital.corporation_ein ||
        declared.bank_transfer_reference !== capital.transfer_reference ||
        declared.corporate_capital_account_reference !==
          capital.corporate_capital_account_reference
      : declared !== undefined
  ) {
    throw Error(
      "Owned shareholder current cash capital source is detached from the actual stock ledger",
    );
  }

  if (
    source.corporation_ein !== k.corporation_ein ||
    source.corporation_name !== k.corporation_name ||
    source.source_document_reference !== k.document_reference ||
    source.recipient_tin !== k.shareholder_ssn ||
    source.box1_ordinary_business !== -k.box1_ordinary_loss ||
    (source.box16_code_e_loan_repayment ?? 0) !==
      k.box16_code_e_principal_repayments ||
    stock.shareholder_ssn !== k.shareholder_ssn ||
    stock.corporation_ein !== k.corporation_ein ||
    stock.beginning_stock_basis !== r.beginningStock ||
    stock.beginning_basis_workpaper_reference !==
      r.source.opening_stock_record.workpaper_reference ||
    stock.no_prior_year_suspended_losses !== true ||
    stock.no_other_schedule_e_activity !==
      (r.source.complete_current_shareholder_source_inventory?.length
        ? r.source.complete_current_shareholder_source_inventory.length === 1
        : true) ||
    stock.material_participation_workpaper_reference !==
      r.source.shareholder_participation_records.log_reference ||
    stock.materially_participated_in_s_corporation !== true ||
    source.qbi_amount !== undefined || source.sstb_indicator === true
  ) {
    throw Error(
      "Owned S corporation issued ordinary-loss/QBI statement is detached from the actual K1 and stock/debt basis",
    );
  }
  if (!Number.isFinite(taxableIncomeBeforeQbi) || taxableIncomeBeforeQbi < 0) {
    throw Error(
      "Owned S corporation QBI loss needs finalized taxable income before QBI",
    );
  }
  return {
    line1_business_name: k.qualified_us_business_name,
    line1_business_reference: k.qualified_us_business_reference,
    line1_ein: k.qualified_us_business_ein,
    line1_qbi: r.qualifiedLoss,
    line2: r.qualifiedLoss,
    line3: 0,
    line4: 0,
    line5: 0,
    line6: 0,
    line7: 0,
    line8: 0,
    line9: 0,
    line10: 0,
    line11: Math.round(taxableIncomeBeforeQbi),
    line12: 0,
    line13: Math.round(taxableIncomeBeforeQbi),
    line14: Math.round(taxableIncomeBeforeQbi * 0.2),
    line15: 0,
    line16: -r.qualifiedLoss,
    line17: 0,
  };
}
