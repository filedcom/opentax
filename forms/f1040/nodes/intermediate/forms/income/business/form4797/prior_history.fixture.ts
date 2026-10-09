import { section1231PriorHistorySchema } from "./prior_history.ts";

/** IRS 2025 Form 4797 line 8 example; references are synthetic, not filing proof. */
export const irsSection1231History = section1231PriorHistorySchema.parse({
  tax_year: 2025,
  owner: { taxpayer_ssn: "123456789" },
  opening_2020_source_reference: "Reviewed 2019 closing section 1231 workpaper",
  opening_2020_losses: [],
  filed_years: [-4000, -6000, 0, 0, 3000].map((net, index) => ({
    tax_year: 2020 + index,
    owner: { taxpayer_ssn: "123456789" },
    filed_return_reference: `Reviewed ${2020 + index} return`,
    source_document_reference: `Reviewed ${2020 + index} section 1231 lines`,
    filed_line7_net_gain_loss: net,
    section1231_loss_taken_into_account: Math.max(0, -net),
    ...(index === 4
      ? {
        filed_line8_nonrecaptured_loss: 10000,
        filed_line12_recaptured_gain: 3000,
      }
      : {}),
  })),
});
