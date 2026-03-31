export { FilingStatus } from "../../mef/header.ts";
export type { FilerIdentity } from "../../mef/header.ts";

export interface F8949Transaction {
  part: string;
  description: string;
  date_acquired: string;
  date_sold: string;
  proceeds: number;
  cost_basis: number;
  adjustment_codes?: string;
  adjustment_amount?: number;
  gain_loss: number;
  is_long_term: boolean;
}

import type { ALL_MEF_FORMS } from "./forms/index.ts";

type AnyForm = (typeof ALL_MEF_FORMS)[number];

/**
 * Aggregate pending dict for MEF XML generation.
 * Derived automatically from ALL_MEF_FORMS — no manual edits needed when
 * adding a new form. Each key matches the form's pendingKey; the value type
 * is the first parameter of that form's build() function.
 */
export type MefFormsPending = {
  [F in AnyForm as F["pendingKey"]]?: Parameters<F["build"]>[0];
};
