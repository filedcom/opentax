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
  const brokerIds = new Set(
    brokerRows.map((row) => row.transaction_id).filter((id) =>
      id !== undefined
    ),
  );
  for (const row of directRows) {
    if (row.source_transaction_id && brokerIds.has(row.source_transaction_id)) {
      throw new Error(
        "Form 1099-B and direct Form 8949 repeat the same identified broker sale",
      );
    }
  }
}
