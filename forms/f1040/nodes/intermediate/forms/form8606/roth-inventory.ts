import { z } from "zod";
import { isDeepStrictEqual } from "node:util";
import { roundWholeDollars } from "../../../../whole-dollars.ts";
import {
  reviewedRothActivity,
  rothActivityReviewSchema,
} from "./roth-activity.ts";

const paymentSchema = rothActivityReviewSchema.shape.payment.extend({
  form1099r_source_document_reference: z.string().trim().min(1),
  issuer: z.object({
    name: z.string().trim().min(1),
    address_line1: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: z.string().regex(/^[A-Z]{2}$/),
    zip: z.string().trim().min(5),
  }).strict(),
  federal_withheld: z.number().nonnegative(),
  state_tax_withheld: z.number().nonnegative(),
  local_tax_withheld: z.number().nonnegative(),
}).strict();
export const rothOwnerInventorySchema = rothActivityReviewSchema.omit({
  payment: true,
  form1099r_source_document_reference: true,
  inventory: true,
}).extend({
  owner: z.enum(["T", "S"]),
  inventory: rothActivityReviewSchema.shape.inventory.omit({
    no_other_current_roth_distribution: true,
  })
    .extend({ all_current_roth_payments_included: z.literal(true) }).strict(),
  payments: z.array(paymentSchema).min(1),
}).strict();
export type RothOwnerInventory = z.infer<typeof rothOwnerInventorySchema>;
const sumMoney = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100;

/** Calculate the annual owner basis once; each payment keeps its actual lineage. */
export function reviewedRothOwnerInventory(raw: unknown) {
  const review = rothOwnerInventorySchema.parse(raw);
  const { all_current_roth_payments_included: _complete, ...inventory } =
    review.inventory;
  const payments = review.payments.map(
    (
      {
        form1099r_source_document_reference,
        issuer: _issuer,
        federal_withheld: _federal,
        state_tax_withheld: _state,
        local_tax_withheld: _local,
        ...payment
      },
    ) => {
      // This is a single-payment calculation view of an already complete listed
      // inventory. The collection binder below proves every actual current copy.
      const facts = reviewedRothActivity({
        owner_identity: review.owner_identity,
        inventory: { ...inventory, no_other_current_roth_distribution: true },
        contributions: review.contributions,
        payment,
        form1099r_source_document_reference,
      });
      return { ...facts, payment, form1099r_source_document_reference };
    },
  );
  const references = review.payments.flatMap((
    row,
  ) => [
    row.source_document_reference,
    row.form1099r_source_document_reference,
  ]);
  const lineage = review.payments.map((row) =>
    JSON.stringify([
      row.custodian_ein,
      row.account_number,
      row.distribution_reference,
    ])
  );
  if (
    new Set(references).size !== references.length ||
    new Set(lineage).size !== lineage.length
  ) {
    throw new Error(
      "Roth owner inventory repeats current payment source/copy/account lineage",
    );
  }
  const nonqualified = payments.filter((row) => !row.qualified);
  const rawGross = sumMoney(
    payments.map((row) => row.payment.gross_distribution),
  );
  const rawNonqualifiedGross = sumMoney(
    nonqualified.map((row) => row.payment.gross_distribution),
  );
  const basis = payments[0].basis;
  const gross = roundWholeDollars(rawGross);
  const nonqualifiedGross = roundWholeDollars(rawNonqualifiedGross);
  const taxable = Math.max(0, nonqualifiedGross - basis);
  // Age-based J payments necessarily precede this owner's age-exempt T
  // payments. Regular contributions are consumed first across every account.
  const earlyGross = roundWholeDollars(
    sumMoney(
      nonqualified.filter((row) => !row.ageException).map((row) =>
        row.payment.gross_distribution
      ),
    ),
  );
  const earlyTaxable = Math.min(taxable, Math.max(0, earlyGross - basis));
  return {
    review,
    payments,
    rawGross,
    gross,
    nonqualifiedGross,
    rawBasis: payments[0].rawBasis,
    basis,
    taxable,
    earlyTaxable,
    requires8606: nonqualified.length > 0,
    rawRemainingContributionBasis: Math.max(
      0,
      payments[0].rawBasis - rawNonqualifiedGross,
    ),
    print: {
      print_roth_line19_distributions: nonqualifiedGross,
      print_roth_line20_homebuyer: 0,
      print_roth_line21_after_homebuyer: nonqualifiedGross,
      print_roth_line22_contribution_basis: basis,
      print_roth_line23_after_contribution_basis: taxable,
      print_roth_line24_conversion_basis: 0,
      print_roth_line25a_earnings: taxable,
      print_roth_line25b_disaster: 0,
      print_roth_line25c_taxable: taxable,
    },
  };
}

export function rothOwnerInventoryDocuments(review: RothOwnerInventory) {
  return [
    review.owner_identity,
    review.inventory,
    ...review.contributions.flatMap((row) => [row.form5498, ...row.receipts]),
    ...review.payments,
  ];
}

type SourceCopy = {
  roth_owner_inventory_review?: unknown;
  ts?: string;
  recipient_ssn?: string;
  payer_ein: string;
  payer_name?: string;
  payer_address_line1?: string;
  payer_address_city?: string;
  payer_address_state?: string;
  payer_address_zip?: string;
  account_number?: string;
  source_document_reference?: string;
  box1_gross_distribution: number;
  box7_distribution_code: string;
  box7_code2?: string;
  box13_date_of_payment?: string;
  box2a_taxable_amount?: number;
  box2b_not_determined?: boolean;
  box7_ira_simple_indicator?: boolean;
  exclude_8606_roth?: boolean;
  box4_federal_withheld?: number;
  box14_state_tax?: number;
  box17_local_tax?: number;
};

/** Complete owner-qualified joins, including ordinary issued and substitute copies. */
export function reconcileRothOwnerInventoryCopies(
  items: readonly SourceCopy[],
) {
  const current = items.filter((row) => row.roth_owner_inventory_review);
  if (!current.length) return [];
  const groups = new Map<
    string,
    ReturnType<typeof reviewedRothOwnerInventory>
  >();
  for (const item of current) {
    const facts = reviewedRothOwnerInventory(item.roth_owner_inventory_review);
    const previous = groups.get(facts.review.owner);
    if (previous && !isDeepStrictEqual(previous.review, facts.review)) {
      throw new Error(
        "Current Roth copies disagree on the complete owner history/payment inventory",
      );
    }
    groups.set(facts.review.owner, facts);
    const payment = facts.review.payments.find((row) =>
      row.form1099r_source_document_reference === item.source_document_reference
    );
    if (
      !payment || item.ts !== facts.review.owner ||
      item.recipient_ssn?.replace(/\D/g, "") !== payment.owner_ssn ||
      item.payer_ein.replace(/\D/g, "") !== payment.custodian_ein ||
      item.account_number !== payment.account_number ||
      item.box1_gross_distribution !== payment.gross_distribution ||
      item.box13_date_of_payment !== payment.distributed_on ||
      item.box7_distribution_code !== payment.distribution_code ||
      item.box7_code2 !== undefined ||
      item.payer_name !== payment.issuer.name ||
      item.payer_address_line1 !== payment.issuer.address_line1 ||
      item.payer_address_city !== payment.issuer.city ||
      item.payer_address_state !== payment.issuer.state ||
      item.payer_address_zip !== payment.issuer.zip ||
      (item.box4_federal_withheld ?? 0) !== payment.federal_withheld ||
      (item.box14_state_tax ?? 0) !== payment.state_tax_withheld ||
      (item.box17_local_tax ?? 0) !== payment.local_tax_withheld ||
      item.box2a_taxable_amount !== undefined ||
      item.box2b_not_determined !== true ||
      item.box7_ira_simple_indicator !== true || item.exclude_8606_roth !== true
    ) {
      throw new Error(
        "Current Roth copy owner/account/payment and unknown-taxable facts differ from complete inventory",
      );
    }
  }
  for (const facts of groups.values()) {
    const actual = current.filter((row) => row.ts === facts.review.owner);
    if (
      actual.length !== facts.review.payments.length ||
      facts.review.payments.some((payment) =>
        actual.filter((row) =>
          row.source_document_reference ===
            payment.form1099r_source_document_reference
        ).length !== 1
      )
    ) {
      throw new Error(
        "Complete Roth owner inventory has missing/duplicate actual current issued/substitute payments",
      );
    }
    if (
      items.some((row) =>
        row.ts === facts.review.owner && row.box7_ira_simple_indicator &&
        !row.roth_owner_inventory_review
      )
    ) {
      throw new Error(
        "Roth owner inventory conflicts with an unjoined current IRA source",
      );
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.review.owner === b.review.owner ? 0 : a.review.owner === "T" ? -1 : 1
  );
}

export function rothOwnerPrintFields(
  facts: ReturnType<typeof reviewedRothOwnerInventory>,
) {
  return {
    print_line1_nondeductible: 0,
    print_line2_prior_basis: 0,
    print_line3_total_basis: 0,
    print_line14_remaining_basis: 0,
    source_traditional_distributions: 0,
    source_roth_conversion: 0,
    source_roth_distribution: facts.nonqualifiedGross,
    source_roth_basis_contributions: facts.basis,
    source_roth_basis_conversions: 0,
    roth_owner_inventory_review: facts.review,
    ...facts.print,
  };
}
