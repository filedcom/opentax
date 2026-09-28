import type { FilerIdentity } from "../mef/header.ts";
import {
  type Form7217Item,
  section731Form8949Transaction,
} from "../nodes/inputs/f7217/index.ts";
import { transactionSchema as form8949TransactionSchema } from
  "../nodes/intermediate/forms/form8949/index.ts";

/** Positive line 7 must reach the same Form 8949 row on the filed return. */
export function assertForm7217GainFiling(
  item: Form7217Item,
  filer: FilerIdentity,
  pending?: Readonly<Record<string, unknown>>,
): void {
  const expected = section731Form8949Transaction(item);
  if (!expected) return;
  const source = item.section_731_capital_gain_source!;
  const rows = form8949TransactionSchema.array().safeParse(
    pending?.form8949,
  );
  if (
    source.k1_partner_ssn.replaceAll("-", "") !==
      filer.primarySSN.replaceAll("-", "") ||
    !rows.success ||
    rows.data.filter((row) =>
      row.source_transaction_id === expected.source_transaction_id &&
      row.part === expected.part &&
      row.date_acquired === expected.date_acquired &&
      row.date_sold === expected.date_sold &&
      row.proceeds === expected.proceeds &&
      row.cost_basis === expected.cost_basis &&
      row.gain_loss === expected.gain_loss &&
      row.is_long_term === expected.is_long_term &&
      row.adjustment_codes === undefined &&
      row.adjustment_amount === undefined
    ).length !== 1
  ) {
    throw new Error(
      "Form 7217 section 731 gain needs a matching owner and exactly one sourced Form 8949 capital-gain row",
    );
  }
}
