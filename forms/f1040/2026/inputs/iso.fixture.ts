import type { z } from "zod";
import type { isoClaim2026Schema } from "./iso-source.ts";

/** Synthetic source copies and custody review, never taxpayer data. */
export function syntheticIso2026(): z.input<typeof isoClaim2026Schema> {
  return {
    tax_year: 2026,
    f3921s: [{
      source_document_reference: "synthetic-3921-one",
      corporation_name: "Example Corporation",
      corporation_ein: "123456789",
      employee_tin: "111223333",
      box1_date_option_granted: "2024-02-01",
      box2_date_option_exercised: "2026-06-01",
      box3_exercise_price_per_share: 10,
      box4_fmv_per_share: 110,
      box5_shares_transferred: 1000,
      rights_transferable_and_not_subject_to_substantial_risk_on_exercise: true,
      shares_disposed_during_exercise_year: 0,
      amount_paid_for_option: 0,
    }],
    year_end_holdings_review: {
      as_of: "2026-12-31",
      brokerage_record_reference: "synthetic-year-end-stock-record",
      all_exercised_shares_still_owned: true,
      source_document_references: ["synthetic-3921-one"],
    },
  };
}
