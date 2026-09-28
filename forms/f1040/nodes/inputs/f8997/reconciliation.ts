import type { ExecuteResult } from "../../../../../core/runtime/executor.ts";
import {
  assertForm8949TransactionMath,
  transactionSchema,
} from "../../intermediate/forms/form8949/index.ts";
import {
  calculateForm8997Statement,
  type Form8997Input,
  type Form8997Statement,
  inputSchema,
  QofEventKind,
  QofInclusionType,
} from "./ledger.ts";

type Pending = ExecuteResult["pending"];
type Transaction = ReturnType<typeof transactionSchema.parse>;
type Character = "short_term" | "long_term";

function transactionsAt(pending: Pending, node: string): Transaction[] {
  const raw = pending[node]?.transaction;
  if (raw === undefined) return [];
  const rows = Array.isArray(raw) ? raw : [raw];
  return rows.map((row) => transactionSchema.parse(row));
}

function oneRow(
  rows: readonly Transaction[],
  id: string,
  node: string,
): Transaction {
  const matches = rows.filter((row) => row.source_transaction_id === id);
  if (matches.length !== 1) {
    throw new Error(
      `Form 8997 reference ${id} needs exactly one executor ${node} transaction`,
    );
  }
  assertForm8949TransactionMath(matches[0]);
  return matches[0];
}

function sameFiledTransaction(
  id: string,
  form8949Rows: readonly Transaction[],
  scheduleDRows: readonly Transaction[],
): Transaction {
  const row = oneRow(form8949Rows, id, "Form 8949");
  const scheduleD = oneRow(scheduleDRows, id, "Schedule D");
  const comparable = [
    "part",
    "description",
    "date_acquired",
    "date_sold",
    "proceeds",
    "cost_basis",
    "adjustment_codes",
    "adjustment_amount",
    "gain_loss",
    "is_long_term",
  ] as const;
  if (comparable.some((key) => row[key] !== scheduleD[key])) {
    throw new Error(`Form 8997 reference ${id} differs between Form 8949 and Schedule D`);
  }
  return row;
}

function assertCharacter(row: Transaction, character: Character): void {
  const allowed = character === "short_term" ? ["C", "I"] : ["F", "L"];
  if (!allowed.includes(row.part) ||
    row.is_long_term !== (character === "long_term")) {
    throw new Error("Form 8997 Form 8949 row has the wrong original gain character or reporting box");
  }
}

function assertQofRow(
  row: Transaction,
  qofEin: string,
  acquiredDate: string,
  character: Character,
): void {
  assertCharacter(row, character);
  if (row.description !== qofEin || row.date_acquired !== acquiredDate) {
    throw new Error("Form 8997 Form 8949 row needs the QOF EIN and investment acquisition date");
  }
}

function assertCodeZ(
  row: Transaction,
  qofEin: string,
  acquiredDate: string,
  character: Character,
  amount: number,
): void {
  assertQofRow(row, qofEin, acquiredDate, character);
  if (row.adjustment_codes !== "Z" || row.adjustment_amount !== -amount ||
    row.proceeds !== 0 || row.cost_basis !== 0 || row.date_sold !== "" ||
    row.gain_loss !== -amount) {
    throw new Error("Form 8997 code Z row must be a separate negative deferral with blank sale columns");
  }
}

function assertCodeY(
  row: Transaction,
  lot: Form8997Input["investment_lots"][number],
  event: Form8997Input["investment_lots"][number]["events"][number],
  character: Character,
  amount: number,
): void {
  assertQofRow(row, lot.qof_ein, lot.acquired_date, character);
  if (!event.disposition || row.adjustment_codes !== "Y" ||
    row.adjustment_amount !== amount ||
    row.date_sold !== event.event_date ||
    row.proceeds !== event.disposition.proceeds ||
    row.cost_basis !== event.disposition.adjusted_basis) {
    throw new Error("Form 8997 code Y row must match the sourced sale, basis, date and positive inclusion");
  }
}

function assertGainSource(
  lot: Form8997Input["investment_lots"][number],
  rows: readonly Transaction[],
  character: Character,
  amount: number,
): string {
  const fresh = lot.new_deferral;
  if (!fresh || fresh.kind !== "new_election" ||
    fresh.source_gain_references.length !== 1 ||
    fresh.deferred_gain.short_term > 0 &&
      fresh.deferred_gain.long_term > 0) {
    throw new Error("Form 8997 ordinary deferral join needs one gain source and one original character");
  }
  const id = fresh.source_gain_references[0];
  const row = oneRow(rows, id, "eligible-gain Form 8949");
  const shortTermPart = ["A", "B", "C", "G", "H", "I"].includes(row.part);
  if (row.adjustment_codes !== undefined ||
    row.adjustment_amount !== undefined ||
    row.date_sold !== fresh.gain_realized_date ||
    row.gain_loss <= 0 || row.gain_loss < amount ||
    row.is_long_term !== (character === "long_term") ||
    shortTermPart !== (character === "short_term")) {
    throw new Error("Form 8997 ordinary eligible gain does not match its original Form 8949 source row");
  }
  return id;
}

/**
 * Reconcile only executor-owned 2025 pending facts. This is not an export
 * authorization: source-document bytes, special elections and annual
 * attachment validation remain separate gates.
 */
export function reconcileForm8997Pending(pending: Pending): Form8997Statement {
  const source = inputSchema.parse(pending.f8997);
  const statement = calculateForm8997Statement(source);
  const form8949Rows = transactionsAt(pending, "form8949");
  const scheduleDRows = transactionsAt(pending, "schedule_d");
  const linkedIds = new Set<string>();
  const sourceUses = new Map<string, number>();
  for (const lot of source.investment_lots) {
    const fresh = lot.new_deferral;
    if (fresh) {
      if (fresh.kind !== "new_election") {
        throw new Error("Form 8997 noninclusion transfer needs its own verified join");
      }
      if (fresh.special_gain_code || fresh.form4797_source_reference) {
        throw new Error("Form 8997 transfer and special-gain deferrals need their own verified join");
      }
      for (const character of ["short_term", "long_term"] as const) {
        const amount = fresh.deferred_gain[character];
        if (amount === 0) continue;
        const id = fresh.form8949_code_z_rows[`${character}_row_reference`];
        if (!id) throw new Error("Form 8997 deferral has no code Z row reference");
        assertCodeZ(
          sameFiledTransaction(id, form8949Rows, scheduleDRows),
          lot.qof_ein,
          lot.acquired_date,
          character,
          amount,
        );
        linkedIds.add(id);
        const sourceId = assertGainSource(lot, form8949Rows, character, amount);
        sameFiledTransaction(sourceId, form8949Rows, scheduleDRows);
        sourceUses.set(sourceId, (sourceUses.get(sourceId) ?? 0) + amount);
      }
    }
    for (const event of lot.events) {
      if (event.kind !== QofEventKind.Inclusion ||
        event.inclusion_type !== QofInclusionType.SaleOrExchange ||
        event.special_gain_code || event.form4797_source_reference ||
        event.basis_adjustment_code ||
        event.ten_year_fmv_election || !event.disposition ||
        event.included_gain.short_term > 0 && event.included_gain.long_term > 0) {
        throw new Error("Form 8997 non-sale, mixed-character and special events need a separate verified join");
      }
      for (const character of ["short_term", "long_term"] as const) {
        const amount = event.included_gain[character];
        if (amount === 0) continue;
        const id = event.form8949_code_y_rows?.[`${character}_row_reference`];
        if (!id) throw new Error("Form 8997 inclusion has no code Y row reference");
        assertCodeY(
          sameFiledTransaction(id, form8949Rows, scheduleDRows),
          lot,
          event,
          character,
          amount,
        );
        linkedIds.add(id);
      }
    }
  }
  for (const [id, allocated] of sourceUses) {
    if (allocated > oneRow(form8949Rows, id, "eligible-gain Form 8949").gain_loss) {
      throw new Error("Form 8997 deferrals exceed the shared eligible gain source");
    }
  }
  for (const row of form8949Rows) {
    if ((row.adjustment_codes === "Z" || row.adjustment_codes === "Y") &&
      (!row.source_transaction_id || !linkedIds.has(row.source_transaction_id))) {
      throw new Error("Executor Form 8949 has an unlinked QOF code Z or Y row");
    }
  }
  const directScheduleDRows = pending.schedule_d?.transactions;
  if (Array.isArray(directScheduleDRows) && directScheduleDRows.some((row) =>
    typeof row === "object" && row !== null &&
    "adjustment_codes" in row &&
    (row.adjustment_codes === "Z" || row.adjustment_codes === "Y")
  )) {
    throw new Error("QOF code Z/Y rows must pass through the filed Form 8949 transaction path");
  }
  return statement;
}
