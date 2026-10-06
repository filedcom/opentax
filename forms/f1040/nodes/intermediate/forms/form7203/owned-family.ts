import { ownedSCorpLossLines } from "../form8995/owned-s-corp-loss.ts";
import { reconcileOwnedCurrentDebt } from "./owned-current-source.ts";

/** Two separate shareholders/corporations: basis is limited before summing. */
export function ownedDebtFamily(raw: unknown) {
  if (!Array.isArray(raw) || raw.length !== 2) {
    throw Error(
      "Owned MFJ debt family needs exactly two independently owned corporation sources",
    );
  }
  const rows = raw.map((source: any) => {
    const filed = ownedSCorpLossLines(source, 0);
    const note = source.form7203_debt_evidence;
    const basis = reconcileOwnedCurrentDebt(note.owned_current_records, note);
    const ledger = source.form7203_stock_loss_ledger;
    const fields = {
      stock_basis_beginning: basis.beginningStock,
      ...(basis.currentCashCapital
        ? {
          additional_contributions: basis.currentCashCapital,
          reviewed_stock_loss_ledger: ledger,
        }
        : {}),
      new_loans: note.cash_advance_amount +
        (note.second_formal_note?.cash_advance_amount ?? 0),
      reviewed_debt_evidence: note,
      ordinary_loss: -source.box1_ordinary_business,
    };
    return { source, ledger, note, basis, filed, fields };
  });
  const ssns = rows.map((r) => r.source.recipient_tin),
    eins = rows.map((r) => r.source.corporation_ein),
    refs = rows.flatMap(
      (r) => [
        r.source.source_document_reference,
        ...r.basis.source.complete_current_shareholder_debt_inventory.map((n) =>
          n.funding.transfer_reference
        ),
      ],
    );
  if (
    new Set(ssns).size !== 2 || new Set(eins).size !== 2 ||
    new Set(refs).size !== refs.length
  ) {
    throw Error(
      "Owned MFJ corporations must retain distinct shareholder, issuer and funding source identities",
    );
  }
  return {
    rows,
    allowed: rows.reduce((n, r) => n + r.basis.allowedLoss, 0),
    suspended: rows.reduce((n, r) => n + r.basis.suspendedLoss, 0),
  };
}

export function ownedDebtFamilyQbiLines(raw: unknown, taxable: number) {
  const family = ownedDebtFamily(raw);
  const first = ownedSCorpLossLines(family.rows[0].source, taxable);
  const {
    line1_business_name: _name,
    line1_business_reference: _ref,
    line1_ein: _ein,
    ...common
  } = first;
  return {
    ...common,
    line1_qbi: -family.allowed,
    line2: -family.allowed,
    line16: family.allowed,
    owned_s_corp_loss_filing_rows: family.rows.map((r) => ({
      shareholder_ssn: r.source.recipient_tin,
      corporation_ein: r.source.corporation_ein,
      business_name: r.filed.line1_business_name,
      business_reference: r.filed.line1_business_reference,
      qbi: r.filed.line1_qbi,
    })),
  };
}
