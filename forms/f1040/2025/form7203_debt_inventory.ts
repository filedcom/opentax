import { allocateDebtInventory } from "../nodes/intermediate/forms/form7203/debt-allocation.ts";
import type { ReviewedNewFormalNotes } from "../nodes/intermediate/forms/form7203/debt-note.ts";

/** Called only after the complete public source has been independently replayed. */
export function projectOverflowDebtInventory(
  note: ReviewedNewFormalNotes | undefined,
  loss: number,
) {
  if (
    !note?.additional_formal_notes ||
    note.kind !== "owned_2025_formal_and_open_account"
  ) return undefined;
  const formal = [
    {
      id: note.formal_note_id,
      advance: note.cash_advance_amount,
      repayment: (note.principal_repayments ?? []).reduce(
        (n, r) => n + r.amount,
        0,
      ),
      open: false,
    },
    ...[note.second_formal_note!, ...note.additional_formal_notes].map((n) => ({
      id: n.formal_note_id,
      advance: n.cash_advance_amount,
      repayment: n.principal_repayment?.amount ?? 0,
      open: false,
    })),
  ];
  const open = note.owned_current_records
    .complete_current_shareholder_debt_inventory.at(-1)!;
  if (!("account_reference" in open)) {
    throw Error("Missing genuine final open account");
  }
  const debts = [...formal, {
    id: open.account_reference,
    advance: note.open_account_net_advance_amount,
    repayment: 0,
    open: true,
  }];
  const allocation = allocateDebtInventory(
    loss,
    debts.map((n) => n.advance - n.repayment),
  );
  return debts.map((n, i) => ({
    ...n,
    endingPrincipal: n.advance - n.repayment,
    loss: allocation.filed[i],
    basis: allocation.basis[i],
    exact: allocation.exact[i],
  }));
}
