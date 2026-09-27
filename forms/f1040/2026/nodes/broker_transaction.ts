import type { z } from "zod";
import {
  Form8949Part,
  transactionSchema,
} from "../../nodes/intermediate/forms/form8949/index.ts";

type Transaction = z.infer<typeof transactionSchema>;

export interface BrokerTransactionFacts {
  readonly part: Form8949Part;
  readonly description: string;
  readonly dateAcquired: string;
  readonly dateSold: string;
  readonly proceeds: number;
  readonly reportedBasis?: number;
  readonly taxpayerBasis?: number;
  readonly basisReportedToIrs: boolean;
  readonly sellingExpenses: number;
  readonly washSaleLossDisallowed: number;
}

/** Preserve reported basis in column (e) and correct tax basis in column (g). */
export function brokerTransaction(facts: BrokerTransactionFacts): Transaction {
  const taxBasis = facts.taxpayerBasis ?? facts.reportedBasis!;
  const basisFor8949 = facts.basisReportedToIrs
    ? facts.reportedBasis!
    : taxBasis;
  const basisAdjustment = facts.basisReportedToIrs
    ? facts.reportedBasis! - taxBasis
    : 0;
  const adjustmentAmount = basisAdjustment - facts.sellingExpenses +
    facts.washSaleLossDisallowed;
  const adjustmentCodes = [
    basisAdjustment !== 0 ? "B" : "",
    facts.sellingExpenses > 0 ? "E" : "",
    facts.washSaleLossDisallowed > 0 ? "W" : "",
  ].join("");
  return {
    part: facts.part,
    description: facts.description,
    date_acquired: facts.dateAcquired,
    date_sold: facts.dateSold,
    proceeds: facts.proceeds,
    cost_basis: basisFor8949,
    ...(adjustmentCodes ? { adjustment_codes: adjustmentCodes } : {}),
    ...(adjustmentAmount !== 0 ? { adjustment_amount: adjustmentAmount } : {}),
    gain_loss: facts.proceeds - basisFor8949 + adjustmentAmount,
    is_long_term: [
      Form8949Part.D,
      Form8949Part.E,
      Form8949Part.F,
      Form8949Part.J,
      Form8949Part.K,
      Form8949Part.L,
    ].includes(facts.part),
  };
}
