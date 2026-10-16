import type { z } from "zod";
import { gamblingClaim2026Schema } from "./gambling-source.ts";
import { refundAllocationGraph2026 } from "./refund-allocation.fixture.ts";
import { itemizedClaim2026 } from "../schedule-a.fixture.ts";
export function gamblingClaim2026(): z.input<
  typeof gamblingClaim2026Schema
>["claim"] {
  return {
    tax_year: 2026,
    record_reference: "gambling-inventory",
    casual_gambling_only_verified: true,
    complete_winnings_and_losses_inventory_verified: true,
    winnings_not_netted_against_losses_verified: true,
    no_shared_winners_nominee_or_foreign_tax_cases_verified: true,
    copies: [{
      calendar_year: 2026,
      source_document_reference: "casino-copy",
      payer_name: "Synthetic Casino",
      payer_ein: "000000013",
      box9_winner_tin: "400001037",
      box1_winnings: 2200,
      box2_date_won: "2026-02-15",
      box3_type_of_wager: "Slot machines",
      box4_federal_withheld: 0,
      box5_transaction: "8888888",
      box7_identical_wagers: 0,
      current_copy_review_reference: "issued-copy-review",
      superseded_document_references: [],
      identical_wager_review: {
        record_reference: "identical-review",
        box7_included_in_box1: false,
        no_overlap_with_other_copies_verified: true,
      },
    }],
    winnings: [{
      record_reference: "casino-win",
      owner_tin: "400001037",
      payment_date: "2026-02-15",
      location: "Synthetic Casino, Austin TX",
      wager_type: "Slot machines",
      amount: 2200,
      supporting_record_reference: "casino-diary",
      w2g_source_references: ["casino-copy"],
      includes_noncash_fmv_and_payer_paid_tax_verified: true,
      wager_basis_already_reconciled_verified: true,
    }, {
      record_reference: "raffle-win",
      owner_tin: "400001037",
      payment_date: "2026-03-01",
      location: "Synthetic Raffle, Austin TX",
      wager_type: "Raffle",
      amount: 300,
      supporting_record_reference: "raffle-receipt",
      w2g_source_references: [],
      includes_noncash_fmv_and_payer_paid_tax_verified: true,
      wager_basis_already_reconciled_verified: true,
    }],
    losses: [],
  };
}
export function gamblingGraph2026(losses = false) {
  const { refund_allocation: _, ...base } = refundAllocationGraph2026();
  const claim = gamblingClaim2026();
  if (losses) {
    claim.winnings[0].amount = 30000;
    claim.copies[0].box1_winnings = 30000;
    claim.winnings.pop();
    claim.losses.push({
      record_reference: "losing-session",
      owner_tin: "400001037",
      payment_date: "2026-09-01",
      location: "Synthetic Casino, Austin TX",
      wager_type: "Slot machines",
      amount: 30000,
      supporting_record_reference: "loss-diary",
      actual_loss_not_stakes_or_net_annual_loss_verified: true,
      not_used_to_reduce_reported_winnings_verified: true,
    });
  }
  const { no_casualty_or_other_itemized_deductions: __, ...scope } =
    itemizedClaim2026.source_scope_review;
  return {
    ...base,
    gambling: { claim },
    ...(losses
      ? {
        schedule_a: {
          ...itemizedClaim2026,
          source_scope_review: {
            ...scope,
            has_gambling_loss_sources: true as const,
            no_casualty_or_other_itemized_except_supported_sources:
              true as const,
          },
        },
      }
      : {}),
  };
}
