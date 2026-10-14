import { totalCurrentDebtAdvances } from "./debt-allocation.ts";
import { isDeepStrictEqual } from "node:util";
import { ownedSCorpLossLines } from "../../../deductions/business/form8995/owned-s-corp-loss.ts";
import { reconcileOwnedCurrentDebt } from "./owned-current-source.ts";

/** Each shareholder/corporation basis is limited before summing; issuer identity is scoped to its owner-issued record. */
export function ownedDebtFamily(raw: unknown) {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 4) {
    throw Error(
      "Owned MFJ debt family needs two through four independently source-bound shareholder/corporation copies",
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
      new_loans: totalCurrentDebtAdvances(note),
      reviewed_debt_evidence: note,
      ordinary_loss: -source.box1_ordinary_business,
    };
    return { source, ledger, note, basis, filed, fields };
  });
  const pairs = rows.map((r) =>
    `${r.source.recipient_tin}:${r.source.corporation_ein}`
  );
  const refs = rows.flatMap(
    (r) => [
      r.source.source_document_reference,
      r.basis.source.issued_k1_record.section199a_statement_reference,
      ...r.basis.source.complete_current_shareholder_debt_inventory.flatMap(
        (n) =>
          "transactions" in n
            ? [
              n.account_reference,
              n.principal_ledger_reference,
              n.oral_creditor_terms_record.record_reference,
              ...n.transactions.flatMap(
                (t) => [
                  t.transaction_reference,
                  t.shareholder_bank_reference,
                  t.corporate_bank_reference,
                ],
              ),
            ]
            : [n.funding.transfer_reference, n.instrument_reference],
      ),
    ],
  );
  if (
    new Set(pairs).size !== pairs.length || new Set(refs).size !== refs.length
  ) {
    throw Error(
      "Owned family needs distinct recipient/issuer pairs, issued K1/QBI statements and owned funding/instruments",
    );
  }
  const entry = (r: typeof rows[number]) => ({
    shareholder_ssn: r.source.recipient_tin,
    corporation_ein: r.source.corporation_ein,
    document_reference: r.source.source_document_reference,
    section199a_statement_reference:
      r.basis.source.issued_k1_record.section199a_statement_reference,
    ordinary_loss: -r.source.box1_ordinary_business,
  });
  for (const r of rows) {
    const owned = rows.filter((x) =>
      x.source.recipient_tin === r.source.recipient_tin
    );
    const inventory =
      r.basis.source.complete_current_shareholder_source_inventory;
    if (
      (owned.length > 1 && !inventory) ||
      (inventory && !isDeepStrictEqual(inventory, owned.map(entry)))
    ) {
      throw Error(
        "Complete owner-issued corporation inventory must match actual return sources without omitted or cross-owned businesses",
      );
    }
    const corporation = rows.filter((x) =>
      x.source.corporation_ein === r.source.corporation_ein
    );
    const shared = r.basis.source.co_owned_corporate_inventory;
    if (
      (corporation.length > 1 && !shared) || (shared &&
        (!isDeepStrictEqual(
          shared.complete_current_issued_shareholder_inventory,
          corporation.map(entry),
        ) ||
          corporation.some((x) =>
            !isDeepStrictEqual(
              x.basis.source.co_owned_corporate_inventory,
              shared,
            )
          )))
    ) {
      throw Error(
        "Shared issuer needs reciprocal complete owned K1 sources and identical actual corporate books/stock/bank inventory",
      );
    }
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
  const ownerRows = family.rows.map((r) => ({
    shareholder_ssn: r.source.recipient_tin,
    corporation_ein: r.source.corporation_ein,
    business_name: r.filed.line1_business_name,
    business_reference: r.filed.line1_business_reference,
    qbi: r.filed.line1_qbi,
  }));
  const businessRows: typeof ownerRows = [];
  for (const r of ownerRows) {
    const same = businessRows.find((b) =>
      b.corporation_ein === r.corporation_ein
    );
    if (same) {
      if (
        same.business_name !== r.business_name ||
        same.business_reference !== r.business_reference
      ) {
        throw Error(
          "Shared qualified business must retain identical source trade name/reference",
        );
      }
      same.qbi += r.qbi;
    } else businessRows.push({ ...r });
  }
  return {
    ...common,
    line1_qbi: -family.allowed,
    line2: -family.allowed,
    line16: family.allowed,
    ...(businessRows.length < ownerRows.length
      ? { owned_s_corp_qbi_business_rows: businessRows }
      : {}),
    owned_s_corp_loss_filing_rows: family.rows.map((r) => ({
      shareholder_ssn: r.source.recipient_tin,
      corporation_ein: r.source.corporation_ein,
      business_name: r.filed.line1_business_name,
      business_reference: r.filed.line1_business_reference,
      qbi: r.filed.line1_qbi,
    })),
  };
}
