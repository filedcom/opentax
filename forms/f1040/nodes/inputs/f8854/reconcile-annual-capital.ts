import { z } from "zod";
import { transactionSchema as filedTransactionSchema } from "../../intermediate/forms/form8949/index.ts";
import { annualInputSchema, type F8854AnnualInput } from "./annual.ts";
import { dateSchema } from "./index.ts";
import { ReportedFormCode } from "./section-c.ts";

/** Reconcile each annual deferred-property disposition to a filed sale row. */
export function reconcileAnnualForm8854Form8949Properties(
  rawAnnual: F8854AnnualInput,
  filedForm8949: unknown,
): { itemId: string; transactionId: string; gainOrLoss: number }[] {
  const input = annualInputSchema.parse(rawAnnual);
  const properties = input.deferred_properties.filter((property) =>
    property.disposition.disposed_in_2025 &&
    property.disposition.reported_form_code === ReportedFormCode.Form8949
  );
  if (properties.length === 0) return [];
  const transactions = z.array(filedTransactionSchema).parse(
    filedForm8949 ?? [],
  );
  return properties.map((property) => {
    const disposition = property.disposition;
    if (!disposition.disposed_in_2025) {
      throw new Error("Annual Form 8854 disposition state changed");
    }
    const matches = transactions.filter((transaction) =>
      transaction.source_transaction_id === disposition.reported_transaction_id
    );
    if (matches.length !== 1) {
      throw new Error(
        `Annual Form 8854 property ${property.item_id} needs exactly one identified Form 8949 transaction`,
      );
    }
    const transaction = matches[0];
    if (
      transaction.date_sold !== disposition.disposition_date ||
      !dateSchema.safeParse(transaction.date_acquired).success ||
      transaction.date_acquired > transaction.date_sold ||
      transaction.proceeds !== disposition.actual_sale_proceeds ||
      transaction.cost_basis !== disposition.adjusted_basis_at_disposition ||
      !Number.isSafeInteger(transaction.proceeds) ||
      !Number.isSafeInteger(transaction.cost_basis)
    ) {
      throw new Error(
        `Annual Form 8854 property ${property.item_id} does not match its Form 8949 sale facts`,
      );
    }
    if (
      (transaction.adjustment_codes ?? "") !==
        (disposition.actual_sale_adjustment_codes ?? "") ||
      (transaction.adjustment_amount ?? 0) !==
        (disposition.actual_sale_adjustment_amount ?? 0) ||
      transaction.qsbs_code !== undefined ||
      transaction.qsbs_amount !== undefined
    ) {
      throw new Error(
        `Annual Form 8854 property ${property.item_id} has unreconciled Form 8949 adjustments`,
      );
    }
    const longTerm = ["D", "E", "F", "J", "K", "L"].includes(
      transaction.part,
    );
    const gainOrLoss = transaction.proceeds - transaction.cost_basis +
      (transaction.adjustment_amount ?? 0);
    if (
      transaction.is_long_term !== longTerm ||
      transaction.gain_loss !== gainOrLoss
    ) {
      throw new Error(
        `Annual Form 8854 property ${property.item_id} has inconsistent Form 8949 gain or holding period`,
      );
    }
    return {
      itemId: property.item_id,
      transactionId: disposition.reported_transaction_id,
      gainOrLoss,
    };
  });
}
