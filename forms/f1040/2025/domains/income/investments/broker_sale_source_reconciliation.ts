import {
  f1099b,
  inputSchema as brokerSchema,
} from "../../../../nodes/inputs/income/investments/f1099b/index.ts";
import {
  f8949,
  inputSchema as saleSchema,
} from "../../../../nodes/inputs/income/investments/f8949/index.ts";
import {
  f1099k,
  inputSchema as paymentSettlementSchema,
} from "../../../../nodes/inputs/income/business/f1099k/index.ts";
import {
  inputSchema as scheduleDSchema,
} from "../../../../nodes/intermediate/aggregation/income/investments/schedule_d/index.ts";
import {
  transactionSchema,
} from "../../../../nodes/intermediate/forms/income/investments/form8949/index.ts";

/** One issued broker sale must enter the return through exactly one input route. */
export function assertNoRepeatedBrokerSaleSources(
  brokerSource: unknown,
  directSaleSource: unknown,
): void {
  if (brokerSource === undefined || directSaleSource === undefined) return;
  const brokerRows = brokerSchema.parse(brokerSource).f1099bs;
  const directRows = saleSchema.parse(directSaleSource).f8949s;
  const brokerById = new Map<string, Array<string | undefined>>();
  for (const row of brokerRows) {
    if (!row.transaction_id) continue;
    const references = brokerById.get(row.transaction_id) ?? [];
    references.push(row.source_document_reference);
    brokerById.set(row.transaction_id, references);
  }
  for (const row of directRows) {
    const references = row.source_transaction_id
      ? brokerById.get(row.source_transaction_id)
      : undefined;
    if (
      references?.some((reference) =>
        !reference || !row.broker_statement_reference ||
        reference === row.broker_statement_reference
      )
    ) {
      throw new Error(
        "Form 1099-B and direct Form 8949 repeat the same identified broker sale",
      );
    }
  }
}

/** Replay retained sale sources into the Schedule D transaction multiset. */
export function assertCapitalSaleSourceRows(
  pending: Readonly<Record<string, unknown>>,
): void {
  if (
    pending.f1099b === undefined && pending.f8949 === undefined &&
    pending.f1099k === undefined
  ) return;
  const context = { taxYear: 2025, formType: "f1040" };
  const expected = [
    ...(pending.f1099b === undefined ? [] : f1099b.compute(
      context,
      brokerSchema.parse(pending.f1099b),
    ).outputs),
    ...(pending.f8949 === undefined ? [] : f8949.compute(
      context,
      saleSchema.parse(pending.f8949),
    ).outputs),
    ...(pending.f1099k === undefined ? [] : f1099k.compute(
      context,
      paymentSettlementSchema.parse(pending.f1099k),
    ).outputs),
  ].filter((row) => row.nodeType === "form8949")
    .map((row) => transactionSchema.parse(row.fields.transaction));
  if (expected.length === 0) return;
  if (pending.schedule_d === undefined) {
    throw new Error("Retained capital sales need Schedule D");
  }
  const schedule = scheduleDSchema.parse(pending.schedule_d);
  const actual = schedule.transaction === undefined
    ? []
    : Array.isArray(schedule.transaction)
    ? schedule.transaction
    : [schedule.transaction];
  const sourceLabel = pending.f1099k === undefined
    ? "1099-B or direct Form 8949"
    : "1099-B, 1099-K, or direct Form 8949";
  const key = (row: {
    part: string;
    description: string;
    source_transaction_id?: string;
    date_acquired: string;
    date_sold: string;
    proceeds: number;
    cost_basis: number;
    adjustment_codes?: string;
    adjustment_amount?: number;
    gain_loss: number;
    is_long_term: boolean;
    collectibles?: boolean;
    qsbs_code?: string;
    qsbs_amount?: number;
    from_form4797_investment_1245?: true;
    form4797_property_id?: string;
  }): string =>
    JSON.stringify([
      row.part,
      row.description,
      row.source_transaction_id ?? null,
      row.date_acquired,
      row.date_sold,
      row.proceeds,
      row.cost_basis,
      row.adjustment_codes ?? null,
      row.adjustment_amount ?? null,
      row.gain_loss,
      row.is_long_term,
      row.collectibles ?? false,
      row.qsbs_code ?? null,
      row.qsbs_amount ?? null,
      row.from_form4797_investment_1245 ?? false,
      row.form4797_property_id ?? null,
    ]);
  const counts = new Map<string, number>();
  for (const row of actual) {
    const id = key(row);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const row of expected) {
    const id = key(row);
    const count = counts.get(id) ?? 0;
    if (count === 0) {
      throw new Error(
        `Schedule D sale differs from retained ${sourceLabel} source`,
      );
    }
    counts.set(id, count - 1);
  }
  if (expected.some((row) => (counts.get(key(row)) ?? 0) !== 0)) {
    throw new Error(
      `Schedule D repeats a retained ${sourceLabel} sale`,
    );
  }
}
