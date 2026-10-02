import { inputSchema as brokerSchema } from "../nodes/inputs/f1099b/index.ts";
import { inputSchema as saleSchema } from "../nodes/inputs/f8949/index.ts";

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
