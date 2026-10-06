import type { inputSchema as form4852InputSchema } from "../../nodes/inputs/f4852/index.ts";
import type { inputSchema as educationIncomeSchema } from "../../nodes/inputs/education_income/index.ts";
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
import type { inputSchema as f4547InputSchema } from "../../nodes/inputs/f4547/index.ts";
import type { inputSchema as paymentRequestInputSchema } from "../../nodes/inputs/payment_request/index.ts";
import type { inputSchema as amendmentRequestInputSchema } from "../../nodes/inputs/amendment_request/index.ts";
import type { inputSchema as benefit1042sInputSchema } from "../../nodes/inputs/benefit_1042s/index.ts";
import type { inputSchema as f1099intInputSchema } from "../../nodes/inputs/f1099int/index.ts";
import type { inputSchema as f1099divInputSchema } from "../../nodes/inputs/f1099div/index.ts";
import type { inputSchema as f1099oidInputSchema } from "../../nodes/inputs/f1099oid/index.ts";
import type { inputSchema as f1099bInputSchema } from "../../nodes/inputs/f1099b/index.ts";
import type { inputSchema as f1099kInputSchema } from "../../nodes/inputs/f1099k/index.ts";
import type { inputSchema as f1098eInputSchema } from "../../nodes/inputs/f1098e/index.ts";
import type { inputSchema as f1099necInputSchema } from "../../nodes/inputs/f1099nec/index.ts";
import type { inputSchema as f8288InputSchema } from "../../nodes/inputs/f8288/index.ts";
import type { inputSchema as extInputSchema } from "../../nodes/inputs/ext/index.ts";
import type { inputSchema as f8812InputSchema } from "../../nodes/inputs/f8812/index.ts";
import type { inputSchema as f8863InputSchema } from "../../nodes/inputs/f8863/index.ts";
import type { inputSchema as generalInputSchema } from "../../nodes/inputs/general/index.ts";
import type { inputSchema as householdWagesInputSchema } from "../../nodes/inputs/household_wages/index.ts";
import type { inputSchema as standardDeductionInputSchema } from "../../nodes/intermediate/worksheets/standard_deduction/index.ts";
import type { inputSchema as patrInputSchema } from "../../nodes/inputs/f1099patr/index.ts";
import type { inputSchema as partnershipK1InputSchema } from "../../nodes/inputs/k1_partnership/index.ts";
import type { inputSchema as sCorpK1InputSchema } from "../../nodes/inputs/k1_s_corp/index.ts";
import type { inputSchema as trustK1InputSchema } from "../../nodes/inputs/k1_trust/index.ts";
import type { inputSchema as refinancePointsInputSchema } from "../../nodes/inputs/mortgage_refinance_points/index.ts";
import type { inputSchema as form3921InputSchema } from "../../nodes/inputs/f3921/index.ts";
import type { inputSchema as form8949SourceInputSchema } from "../../nodes/inputs/f8949/index.ts";
import type { inputSchema as form59eSourceInputSchema } from "../../nodes/inputs/f59e/index.ts";
import type { inputSchema as form8908InputSchema } from "../../nodes/inputs/f8908/index.ts";
import type { inputSchema as f453aInterestInputSchema } from "../../nodes/inputs/f453a_interest/index.ts";
import type { inputSchema as f8858InputSchema } from "../../nodes/inputs/f8858/index.ts";
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
    // An affirmative Form 4547 request stays in pending until its required
    // election signature route is implemented; attachment coverage rejects it.
    f4852?: z.infer<typeof form4852InputSchema>;
    f4547?: z.infer<typeof f4547InputSchema>;
    // A payment request is separate from a tax result or an already-paid
    // estimate. Preserve intent for a reviewed handoff; never emit a debit.
    payment_request?: z.infer<typeof paymentRequestInputSchema>;
    // Form 1040-X needs its own accepted-prior and corrected-year filing graph.
    amendment_request?: z.infer<typeof amendmentRequestInputSchema>;
    // Issued nonresident benefit copies need a distinct Form 1040 review path.
    benefit_1042s?: z.infer<typeof benefit1042sInputSchema>;
    // Form 1116 line 1b needs the source compensation record for a filing check.
    // This is a source node in executor pending, not a second native document.
    fec?: z.infer<typeof fecInputSchema>;
    // Form 1040 line 1h reconciles retained earned-income sources to finalized AGI.
    agi_aggregator?: {
      line8r_taxable_scholarships?: number;
      line1a_wages?: number;
      line1b_household_wages?: number;
      line1c_unreported_tips?: number;
      line1g_wages_8919?: number;
      line1h_other_earned?: number | number[];
      line2b_taxable_interest?: number;
      line3b_ordinary_dividends?: number;
      line21_student_loan_interest?: number;
    };
    // Unreported household-employment wages support the line 1b source replay.
    household_wages?: z.infer<typeof householdWagesInputSchema>;
    // Marketplace statements remain available for Form 8962 month-by-month
    // reconciliation even though they are not themselves native attachments.
    f1095a?: z.infer<typeof f1095aInputSchema>;
    // Payer statements remain available for Form 6251 AMT interest replay.
    f1099int?: z.infer<typeof f1099intInputSchema>;
    f1099div?: z.infer<typeof f1099divInputSchema>;
    f1099oid?: z.infer<typeof f1099oidInputSchema>;
    // Issued broker and contractor copies survive for owner checks at export.
    f1099b?: z.infer<typeof f1099bInputSchema>;
    f1099k?: z.infer<typeof f1099kInputSchema>;
    f1098e?: z.infer<typeof f1098eInputSchema>;
    f1099nec?: z.infer<typeof f1099necInputSchema>;
    // FIRPTA seller copies support the Form 1040 line 25c owner check.
    f8288?: z.infer<typeof f8288InputSchema>;
    // Reviewed payment details support Schedule 3 line 10 on the final return.
    ext?: z.infer<typeof extInputSchema>;
    // Filing and dependent source facts are retained for native cross-form
    // checks even when their input nodes do not emit standalone XML forms.
    general?: z.infer<typeof generalInputSchema>;
    standard_deduction?: z.infer<typeof standardDeductionInputSchema>;
    f8812?: z.infer<typeof f8812InputSchema>;
    // Education source rows remain available to reconcile Form 8862 and 8863.
    f8863?: z.infer<typeof f8863InputSchema>;
    education_income?: z.infer<typeof educationIncomeSchema>;
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
    // Section 453A origin-year and obligation inventory supports Schedule 2 line 15.
    f453a_interest?: z.infer<typeof f453aInterestInputSchema>;
    // Category 1 foreign-activity filing facts remain identifiable at export.
    f8858?: z.infer<typeof f8858InputSchema>;
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
