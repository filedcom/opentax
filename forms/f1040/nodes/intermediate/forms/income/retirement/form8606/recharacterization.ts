import { z } from "zod";
const reference = z.string().trim().min(1);
const identity = {
  source_document_reference: reference,
  owner_ssn: z.string().regex(/^\d{9}$/),
  custodian_ein: z.string().regex(/^\d{9}$/),
  account_number: reference,
};
const contribution = z.object({
  ...identity,
  designated_tax_year: z.literal(2025),
  received_on: z.string().date().refine((d) =>
    d >= "2025-01-01" && d <= "2025-12-31"
  ),
  account_type: z.literal("traditional_ira"),
  regular_cash_contribution: z.literal(true),
  amount: z.number().positive(),
}).strict();
export const iraRecharacterizationReviewSchema = z.object({
  original_contribution: contribution,
  original_form5498: z.object({
    ...identity,
    tax_year: z.literal(2025),
    account_type: z.literal("traditional_ira"),
    box1_ira_contributions: z.number().positive(),
    box2_rollovers: z.literal(0),
    box3_conversions: z.literal(0),
  }).strict(),
  transfer: z.object({
    ...identity,
    transferred_on: z.string().date().refine((d) => d.startsWith("2025-")),
    original_contribution_reference: reference,
    regular_contribution_not_conversion: z.literal(true),
    entire_original_contribution: z.literal(true),
    contribution_principal: z.number().positive(),
    custodian_calculated_related_earnings: z.number(),
    amount_transferred: z.number().positive(),
    receiving_custodian_ein: z.string().regex(/^\d{9}$/),
    receiving_account_number: reference,
    trustee_to_trustee: z.literal(true),
  }).strict(),
  destination_receipt: z.object({
    ...identity,
    received_on: z.string().date(),
    transfer_source_document_reference: reference,
    account_type: z.literal("ordinary_roth_ira"),
    amount_received: z.number().positive(),
  }).strict(),
  destination_form5498: z.object({
    ...identity,
    tax_year: z.literal(2025),
    account_type: z.literal("ordinary_roth_ira"),
    box2_rollovers: z.literal(0),
    box3_conversions: z.literal(0),
    box4_recharacterized_contributions: z.number().positive(),
    box10_regular_roth_contributions: z.literal(0),
  }).strict(),
  annual_contribution_inventory: z.object({
    source_document_reference: reference,
    owner_ssn: z.string().regex(/^\d{9}$/),
    tax_year: z.literal(2025),
    all_owned_ira_regular_contributions_included: z.literal(true),
    regular_contribution_receipts: z.array(contribution).min(1),
  }).strict(),
}).strict();
export type IraRecharacterizationReview = z.infer<
  typeof iraRecharacterizationReviewSchema
>;
type Copy = {
  box1_gross_distribution: number;
  box2a_taxable_amount?: number;
  box7_distribution_code?: string;
  box7_ira_simple_indicator?: boolean;
  recipient_ssn?: string;
  payer_ein: string;
  account_number?: string;
  source_document_reference?: string;
  ira_recharacterization_review?: IraRecharacterizationReview;
  rollover_code?: string;
  prior_ira_basis?: number;
  exclude_8606_roth?: boolean;
  qcd_full?: boolean;
  qcd_partial_amount?: number;
  box7_code2?: string;
};
export function reviewedIraRecharacterization(item: Copy) {
  const review = iraRecharacterizationReviewSchema.parse(
    item.ira_recharacterization_review,
  );
  const c = review.original_contribution,
    t = review.transfer,
    d = review.destination_receipt,
    a = review.original_form5498,
    b = review.destination_form5498,
    i = review.annual_contribution_inventory;
  const digits = (s: string | undefined) => (s ?? "").replace(/\D/g, "");
  const same = (x: typeof c | typeof a | typeof t) =>
    x.owner_ssn === c.owner_ssn && x.custodian_ein === c.custodian_ein &&
    x.account_number === c.account_number;
  if (
    item.box7_distribution_code !== "N" ||
    item.box7_ira_simple_indicator === true || item.box7_code2 ||
    item.rollover_code || item.prior_ira_basis || item.exclude_8606_roth ||
    item.qcd_full || item.qcd_partial_amount ||
    item.box2a_taxable_amount !== 0 ||
    digits(item.recipient_ssn) !== c.owner_ssn ||
    digits(item.payer_ein) !== c.custodian_ein ||
    item.account_number !== c.account_number || !same(a) || !same(t) ||
    t.original_contribution_reference !== c.source_document_reference ||
    c.amount !== a.box1_ira_contributions ||
    c.amount !== t.contribution_principal ||
    Math.abs(
        c.amount + t.custodian_calculated_related_earnings -
          t.amount_transferred,
      ) > 0.0000001 ||
    item.box1_gross_distribution !== t.amount_transferred ||
    t.transferred_on < c.received_on ||
    d.owner_ssn !== c.owner_ssn ||
    d.custodian_ein !== t.receiving_custodian_ein ||
    d.account_number !== t.receiving_account_number ||
    d.transfer_source_document_reference !== t.source_document_reference ||
    d.received_on !== t.transferred_on ||
    d.amount_received !== t.amount_transferred ||
    b.owner_ssn !== d.owner_ssn || b.custodian_ein !== d.custodian_ein ||
    b.account_number !== d.account_number ||
    b.box4_recharacterized_contributions !== d.amount_received ||
    i.owner_ssn !== c.owner_ssn ||
    i.regular_contribution_receipts.filter((r) =>
        JSON.stringify(r) === JSON.stringify(c)
      ).length !== 1 ||
    new Set(
        i.regular_contribution_receipts.map((r) => r.source_document_reference),
      ).size !== i.regular_contribution_receipts.length ||
    new Set([
        item.source_document_reference,
        c.source_document_reference,
        a.source_document_reference,
        t.source_document_reference,
        d.source_document_reference,
        b.source_document_reference,
        i.source_document_reference,
      ]).size !== 7
  ) {
    throw new Error(
      "IRA recharacterization needs actual matching regular contribution, custodian earnings/transfer, receiving account, issued5498 and complete annual owner inventory sources",
    );
  }
  return review;
}
export function iraRecharacterizationDocuments(
  review: IraRecharacterizationReview,
) {
  return [
    review.original_contribution,
    review.original_form5498,
    review.transfer,
    review.destination_receipt,
    review.destination_form5498,
    review.annual_contribution_inventory,
  ];
}
export function iraRecharacterizationExplanation(item: Copy) {
  const r = reviewedIraRecharacterization(item),
    c = r.original_contribution,
    t = r.transfer,
    d = r.destination_receipt;
  return `Owner SSN ${c.owner_ssn}: regular 2025 traditional IRA contribution of $${
    c.amount.toFixed(2)
  } received ${c.received_on} by custodian ${c.custodian_ein}, account ${c.account_number}. The entire contribution was recharacterized ${t.transferred_on} by trustee-to-trustee transfer to ordinary Roth IRA custodian ${d.custodian_ein}, account ${d.account_number}. Custodian-calculated related earnings (negative for loss) were $${
    t.custodian_calculated_related_earnings.toFixed(2)
  }; actual amount transferred and received was $${
    t.amount_transferred.toFixed(2)
  }. Treat the principal as originally contributed to the Roth IRA. No deduction is claimed for this traditional IRA contribution. Include the transferred amount on 2025 Form1040 line4a; taxable recharacterization amount is zero. The entire contribution is recharacterized, so it does not require Form8606 PartI.`;
}
