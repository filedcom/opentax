import { z } from "zod";
import { createHash } from "node:crypto";
import { investmentOwner2026 } from "./investment-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import {
  totalFederalWithheld,
  totalWinnings,
  validateDistinctW2GCopies,
  validateW2GCopy,
  w2gFieldsSchema,
} from "../../nodes/inputs/income/gambling/w2g/index.ts";
const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().refine(
  (v) =>
    Number.isSafeInteger(Math.round(v * 100)) &&
    Math.abs(v * 100 - Math.round(v * 100)) < 1e-6,
  "Gambling amounts require safe cent precision",
);
const date = z.string().date().refine((v) => v.startsWith("2026-"));
export const gamblingCopy2026Schema = w2gFieldsSchema.extend({
  calendar_year: z.literal(2026),
  source_document_reference: ref,
  payer_name: ref,
  payer_ein: tin,
  box9_winner_tin: tin,
  box1_winnings: money,
  box2_date_won: z.string().date(),
  box3_type_of_wager: ref,
  box4_federal_withheld: money,
  box7_identical_wagers: money,
  box15_state_withheld: money.default(0),
  box16_local_winnings: money.default(0),
  box17_local_withheld: money.default(0),
  box18_locality: ref.optional(),
  current_copy_review_reference: ref,
  superseded_document_references: z.array(ref),
  // Read the issued copy and transaction records together: box 7 must not be
  // added again if already included in box 1 or another linked payment.
  identical_wager_review: z.object({
    record_reference: ref,
    box7_included_in_box1: z.boolean(),
    no_overlap_with_other_copies_verified: z.literal(true),
  }).strict(),
  issued_copy_pdf_base64: ref.optional(),
}).strict().superRefine(validateW2GCopy);
const ledger = z.object({
  record_reference: ref,
  owner_tin: tin,
  payment_date: date,
  location: ref,
  wager_type: ref,
  amount: money,
  supporting_record_reference: ref,
}).strict();
export const gamblingClaim2026Schema = z.object({
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    casual_gambling_only_verified: z.literal(true),
    complete_winnings_and_losses_inventory_verified: z.literal(true),
    winnings_not_netted_against_losses_verified: z.literal(true),
    no_shared_winners_nominee_or_foreign_tax_cases_verified: z.literal(true),
    copies: z.array(gamblingCopy2026Schema),
    winnings: z.array(
      ledger.extend({
        w2g_source_references: z.array(ref),
        includes_noncash_fmv_and_payer_paid_tax_verified: z.literal(true),
        wager_basis_already_reconciled_verified: z.literal(true),
      }).strict(),
    ),
    losses: z.array(
      ledger.extend({
        actual_loss_not_stakes_or_net_annual_loss_verified: z.literal(true),
        not_used_to_reduce_reported_winnings_verified: z.literal(true),
      }).strict(),
    ),
  }).strict().refine(
    (c) => c.winnings.length > 0 || c.losses.length > 0,
    "Gambling claim needs a ledger",
  ),
}).strict();
export const gamblingSource2026Schema = investmentOwner2026.extend(
  gamblingClaim2026Schema.shape,
).strict();
export function calculateGambling2026(
  raw: z.input<typeof gamblingSource2026Schema>,
) {
  const input = gamblingSource2026Schema.parse(raw), c = input.claim;
  const owners = new Set([
    input.taxpayer_ssn,
    ...(input.filing_status === FilingStatus.MFJ && input.spouse_ssn
      ? [input.spouse_ssn]
      : []),
  ]);
  z.object({ w2gs: z.array(gamblingCopy2026Schema) }).superRefine(
    validateDistinctW2GCopies,
  ).parse({ w2gs: c.copies });
  const refs = new Set<string>();
  const check = (reference: string, owner: string) => {
    if (!owners.has(owner)) {
      throw new Error("Gambling record belongs to another filer");
    }
    if (refs.has(reference)) {
      throw new Error("Duplicate gambling source record");
    }
    refs.add(reference);
  };
  const copies = new Map(
    c.copies.map((copy) => [copy.source_document_reference, copy]),
  );
  const superseded = new Set<string>();
  for (const copy of c.copies) {
    check(copy.source_document_reference, copy.box9_winner_tin);
    for (const old of copy.superseded_document_references) {
      if (copies.has(old) || superseded.has(old)) {
        throw new Error(
          "Gambling copy inventory includes a superseded or multiply replaced copy",
        );
      }
      superseded.add(old);
    }
    if (
      (copy.box15_state_withheld > 0 &&
        (!copy.box13_state || !copy.box13_payer_state_id)) ||
      copy.box17_local_withheld > 0 && !copy.box18_locality
    ) throw new Error("W-2G withholding needs its state/local identity");
  }
  const used = new Set<string>();
  for (const win of c.winnings) {
    check(win.record_reference, win.owner_tin);
    let reported = 0;
    for (const reference of win.w2g_source_references) {
      const copy = copies.get(reference);
      if (
        !copy || used.has(reference) || copy.box9_winner_tin !== win.owner_tin
      ) {
        throw new Error(
          "Each current W-2G needs one matching owner ledger row",
        );
      }
      if (copy.box2_date_won > win.payment_date) {
        throw new Error(
          "W-2G winning date is later than its receipt ledger date",
        );
      }
      used.add(reference);
      reported += copy.box1_winnings +
        (copy.identical_wager_review.box7_included_in_box1
          ? 0
          : copy.box7_identical_wagers);
    }
    if (Math.round(reported * 100) > Math.round(win.amount * 100)) {
      throw new Error("Winnings ledger omits reported W-2G amounts");
    }
  }
  if (used.size !== copies.size) {
    throw new Error("Every W-2G must reconcile to the winnings ledger");
  }
  for (const loss of c.losses) check(loss.record_reference, loss.owner_tin);
  const winnings = totalWinnings(
    c.winnings.map((r) => ({ box1_winnings: r.amount })),
  );
  const losses = c.losses.reduce((n, r) => n + Math.round(r.amount * 100), 0) /
    100;
  const withheld = totalFederalWithheld(c.copies);
  if (
    ![winnings, losses, withheld].every((v) =>
      Number.isSafeInteger(Math.round(v * 100))
    )
  ) throw new Error("Gambling totals exceed safe cent range");
  // IRC 165(d): 90% of losses, capped at gains, rather than 90% of gains.
  const lossDeduction = roundWholeDollars(Math.min(losses * .9, winnings));
  return {
    source_input: input,
    winnings,
    losses,
    federal_withheld: withheld,
    schedule1_line8b: roundWholeDollars(winnings),
    schedule_a_line17a: lossDeduction,
  };
}
/** Original issued copies remain separate from generated development pages. */
export function gamblingIssuedAttachments2026(
  source: z.input<typeof gamblingSource2026Schema>,
) {
  return calculateGambling2026(source).source_input.claim.copies.filter((c) =>
    c.box4_federal_withheld > 0
  ).map((c) => {
    if (
      !c.issued_copy_pdf_base64 || !c.issued_copy_pdf_sha256 ||
      !c.issued_copy_attachment_file_name
    ) {
      throw new Error(
        "Withheld W-2G needs its original issued PDF for draft assembly",
      );
    }
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(
        atob(c.issued_copy_pdf_base64),
        (v) => v.charCodeAt(0),
      );
    } catch {
      throw new Error("Invalid issued W-2G PDF bytes");
    }
    if (
      new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-" ||
      !new TextDecoder().decode(bytes.slice(-16)).includes("%%EOF") ||
      createHash("sha256").update(bytes).digest("hex") !==
        c.issued_copy_pdf_sha256
    ) throw new Error("Issued W-2G PDF differs from retained digest");
    return {
      reference: c.source_document_reference,
      fileName: c.issued_copy_attachment_file_name,
      sha256: c.issued_copy_pdf_sha256,
      bytes,
      requiredForForms: ["f1040"],
      pages: 0,
    };
  });
}
