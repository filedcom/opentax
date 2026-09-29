export { FilingStatus } from "../../mef/header.ts";
export type { FilerIdentity } from "../../mef/header.ts";

export interface F8949Transaction {
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
  from_form4797_investment_1245?: true;
  form4797_property_id?: string;
}

import type { ALL_MEF_FORMS } from "./forms/index.ts";
import type { z } from "zod";
import type { inputSchema as fecInputSchema } from "../../nodes/inputs/fec/index.ts";
import type { inputSchema as patrInputSchema } from "../../nodes/inputs/f1099patr/index.ts";
import type { inputSchema as partnershipK1InputSchema } from "../../nodes/inputs/k1_partnership/index.ts";
import type { inputSchema as sCorpK1InputSchema } from "../../nodes/inputs/k1_s_corp/index.ts";
import type { inputSchema as trustK1InputSchema } from "../../nodes/inputs/k1_trust/index.ts";

type AnyForm = (typeof ALL_MEF_FORMS)[number];

/**
 * Aggregate pending dict for MEF XML generation.
 * Derived automatically from ALL_MEF_FORMS — no manual edits needed when
 * adding a new form. Each key matches the form's pendingKey; the value type
 * is the first parameter of that form's build() function.
 */
export type MefFormsPending =
  & {
    [F in AnyForm as F["pendingKey"]]?: Parameters<F["build"]>[0];
  }
  & {
    // Form 1116 line 1b needs the source compensation record for a filing check.
    // This is a source node in executor pending, not a second native document.
    fec?: z.infer<typeof fecInputSchema>;
    // Retained 1099-PATR source for the Form 8995-A Schedule D filing check.
    f1099patr?: z.infer<typeof patrInputSchema>;
    // K-1 source records are retained for downstream credit reconciliation.
    k1_partnership?: z.infer<typeof partnershipK1InputSchema>;
    k1_s_corp?: z.infer<typeof sCorpK1InputSchema>;
    k1_trust?: z.infer<typeof trustK1InputSchema>;
  };
