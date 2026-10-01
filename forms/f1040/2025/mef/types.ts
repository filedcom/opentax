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
import type { inputSchema as f1095aInputSchema } from "../../nodes/inputs/f1095a/index.ts";
import type { inputSchema as f1099intInputSchema } from "../../nodes/inputs/f1099int/index.ts";
import type { inputSchema as f1099oidInputSchema } from "../../nodes/inputs/f1099oid/index.ts";
import type { inputSchema as extInputSchema } from "../../nodes/inputs/ext/index.ts";
import type { inputSchema as f8812InputSchema } from "../../nodes/inputs/f8812/index.ts";
import type { inputSchema as f8863InputSchema } from "../../nodes/inputs/f8863/index.ts";
import type { inputSchema as generalInputSchema } from "../../nodes/inputs/general/index.ts";
import type { inputSchema as patrInputSchema } from "../../nodes/inputs/f1099patr/index.ts";
import type { inputSchema as partnershipK1InputSchema } from "../../nodes/inputs/k1_partnership/index.ts";
import type { inputSchema as sCorpK1InputSchema } from "../../nodes/inputs/k1_s_corp/index.ts";
import type { inputSchema as trustK1InputSchema } from "../../nodes/inputs/k1_trust/index.ts";
import type { inputSchema as refinancePointsInputSchema } from "../../nodes/inputs/mortgage_refinance_points/index.ts";
import type { inputSchema as form3921InputSchema } from "../../nodes/inputs/f3921/index.ts";
import type { inputSchema as form8949SourceInputSchema } from "../../nodes/inputs/f8949/index.ts";
import type { inputSchema as form59eSourceInputSchema } from "../../nodes/inputs/f59e/index.ts";
import type { inputSchema as form8908InputSchema } from "../../nodes/inputs/f8908/index.ts";
import type { inputSchema as form1116PriorCarryoverInputSchema } from "../../nodes/inputs/form1116_prior_carryover/index.ts";
import type { IsoAmtBasisLot } from "../../nodes/inputs/f3921/index.ts";
import type { PublicForm8839Source } from "../../nodes/intermediate/forms/form8839/public_source.ts";

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
    // Marketplace statements remain available for Form 8962 month-by-month
    // reconciliation even though they are not themselves native attachments.
    f1095a?: z.infer<typeof f1095aInputSchema>;
    // Payer statements remain available for Form 6251 AMT interest replay.
    f1099int?: z.infer<typeof f1099intInputSchema>;
    f1099oid?: z.infer<typeof f1099oidInputSchema>;
    // Reviewed payment details support Schedule 3 line 10 on the final return.
    ext?: z.infer<typeof extInputSchema>;
    // Filing and dependent source facts are retained for native cross-form
    // checks even when their input nodes do not emit standalone XML forms.
    general?: z.infer<typeof generalInputSchema>;
    f8812?: z.infer<typeof f8812InputSchema>;
    // Education source rows remain available to reconcile Form 8862 and 8863.
    f8863?: z.infer<typeof f8863InputSchema>;
    // Retained 1099-PATR source for the Form 8995-A Schedule D filing check.
    f1099patr?: z.infer<typeof patrInputSchema>;
    // K-1 source records are retained for downstream credit reconciliation.
    k1_partnership?: z.infer<typeof partnershipK1InputSchema>;
    k1_s_corp?: z.infer<typeof sCorpK1InputSchema>;
    k1_trust?: z.infer<typeof trustK1InputSchema>;
    // Source-only refinancing records support Schedule A line 8c.
    mortgage_refinance_points?: z.infer<typeof refinancePointsInputSchema>;
    // Payer-issued ISO exercise copies support Form 6251 line 2i.
    f3921?: z.infer<typeof form3921InputSchema> & {
      iso_amt_basis_ledger?: readonly IsoAmtBasisLot[];
    };
    // Raw transaction input is retained to replay AMT basis rows at export.
    f8949?: z.infer<typeof form8949SourceInputSchema>;
    // Current-year §59(e) records support Form 6251 line 2o replay.
    f59e?: z.infer<typeof form59eSourceInputSchema>;
    // Retained energy-efficient-home source for attachment-byte preflight.
    f8908?: z.infer<typeof form8908InputSchema>;
    // Accepted prior Form 1116 Schedule B rows remain available for carryover replay.
    form1116_prior_carryover?: z.infer<
      typeof form1116PriorCarryoverInputSchema
    >;
    /** Internal replay record from the one public Form 8839 source. */
    form8839_route?: {
      public_source: PublicForm8839Source;
      pre_adoption_sink_input: Record<string, unknown>;
      pre_adoption_schedule3: Record<string, unknown>;
    };
  };
