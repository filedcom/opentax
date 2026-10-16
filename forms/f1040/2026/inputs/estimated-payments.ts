import { z } from "zod";
import {
  divorcedJointAllocationSchema,
  mfsJointAllocationSchema,
  quarterPaymentSchema,
} from "../../nodes/inputs/payments/estimated/f1040es/index.ts";
import {
  type EstimatedPaymentAmounts,
  type EstimatedQuarter,
  reconcileJointEstimatedRecords,
  sumEstimatedPaymentRecords,
} from "../../nodes/inputs/payments/estimated/f1040es/calculation.ts";
import { extensionPaymentClaim2026Schema } from "./extension-payments.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";

const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const dollars = z.number().int().nonnegative().safe();
const money = z.number().finite().positive().refine(
  (v) =>
    Number.isSafeInteger(Math.round(v * 100)) &&
    Math.abs(v * 100 - Math.round(v * 100)) < 1e-6,
  "Payment needs safe cent precision",
);
const posting = {
  irs_account_record_reference: ref,
  transaction_reference: ref,
  status: z.literal("posted"),
  payment_category: z.literal("estimated_tax"),
};
const payment2026Schema = quarterPaymentSchema.extend({
  tax_year: z.literal(2026),
  amount: money,
  processing_fee: money.or(z.literal(0)).optional(),
  ...posting,
}).strict();
const jointRows = (
  schema:
    | typeof divorcedJointAllocationSchema.shape.payments.element
    | typeof mfsJointAllocationSchema.shape.payments.element,
) =>
  schema.extend({
    tax_year: z.literal(2026),
    joint_payment_amount: dollars.positive(),
    taxpayer_allocated_amount: dollars.positive(),
    ...posting,
  }).strict();
const jointEligibility = {
  both_calendar_year_taxpayers_verified: z.literal(true),
  neither_nonresident_alien_at_payment_verified: z.literal(true),
  no_divorce_or_separate_maintenance_decree_at_payment_verified: z.literal(
    true,
  ),
};
const divorced2026Schema = divorcedJointAllocationSchema.omit({
  divorce_date_2025: true,
  not_remarried_in_2025_verified: true,
  payments: true,
}).extend({
  divorce_date_2026: z.string().date().refine((v) => v.startsWith("2026-")),
  not_remarried_in_2026_verified: z.literal(true),
  payments: z.array(
    jointRows(divorcedJointAllocationSchema.shape.payments.element),
  ).min(1).max(4),
  ...jointEligibility,
}).strict();
const mfs2026Schema = mfsJointAllocationSchema.omit({ payments: true }).extend({
  payments: z.array(jointRows(mfsJointAllocationSchema.shape.payments.element))
    .min(1).max(4),
  ...jointEligibility,
}).strict();
const priorCreditSchema = z.object({
  prior_return: z.object({
    tax_year: z.literal(2025),
    form: z.literal("1040"),
    record_reference: ref,
    acceptance_reference: ref,
    filing_status: z.nativeEnum(FilingStatus),
    primary_tin: tin,
    spouse_tin: tin.optional(),
    line34_overpayment: dollars,
    line35a_refund: dollars,
    line36_applied_to_2026: dollars.positive(),
    line38_underpayment_penalty: dollars,
    no_amendments_or_adjustments_verified: z.literal(true),
  }).strict(),
  account_credit: z.object({
    tax_year: z.literal(2026),
    account_tin: tin,
    amount: dollars.positive(),
    effective_date: z.string().date(),
    irs_account_record_reference: ref,
    transaction_reference: ref,
    originating_return_reference: ref,
    no_reversals_offsets_or_transfers_verified: z.literal(true),
  }).strict(),
}).strict();

export const estimatedPaymentClaim2026Schema = z.object({
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    as_of: z.string().date().refine((v) => v >= "2026-01-01"),
    no_name_change_since_payments_verified: z.literal(true),
    payments: z.array(payment2026Schema),
    prior_year_credits: z.array(priorCreditSchema),
    joint_allocation: z.union([divorced2026Schema, mfs2026Schema]).optional(),
  }).strict().refine(
    (c) =>
      c.payments.length + c.prior_year_credits.length > 0 ||
      !!c.joint_allocation,
    "Estimated payment claim needs payment or credit records",
  ),
}).strict();

const inputSchema = estimatedPaymentClaim2026Schema.partial().extend({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: tin,
  spouse_ssn: tin.optional(),
  extension_payment_sources: extensionPaymentClaim2026Schema.shape.claim.shape
    .payments.element.array().optional(),
}).strict();
const normalize = (v: string | undefined) => v?.replaceAll("-", "");
const quarters = ["q1", "q2", "q3", "q4"] as const;
function quarterAmounts(
  rows: readonly { quarter: EstimatedQuarter; amount: number }[],
): EstimatedPaymentAmounts {
  return Object.fromEntries(
    quarters.map((quarter) => [
      `payment_${quarter}`,
      rows.filter((r) => r.quarter === quarter).reduce(
        (total, r) => total + r.amount,
        0,
      ),
    ]),
  );
}

export function calculateEstimatedPayments2026(
  raw: z.input<typeof inputSchema>,
) {
  const input = inputSchema.parse(raw), claim = input.claim;
  const result = {
    source_input: input,
    line26_estimated_payments: 0,
    source_total: 0,
    former_spouse_ssn: undefined as string | undefined,
  };
  if (!claim) return result;
  const taxpayer = normalize(input.taxpayer_ssn)!;
  const spouse = input.filing_status === FilingStatus.MFJ
    ? normalize(input.spouse_ssn)
    : undefined;
  const currentOwners = new Set([taxpayer, spouse].filter(Boolean));
  const confirmations = new Set<string>(),
    transactions = new Set<string>(),
    returns = new Set<string>();
  const extensions = new Set(
    input.extension_payment_sources?.map((p) =>
      p.evidence.payment_confirmation_reference
    ),
  );
  const record = (confirmation: string, transaction: string, date: string) => {
    if (confirmations.has(confirmation) || transactions.has(transaction)) {
      throw new Error(
        "Estimated payment records must be distinct across all sources",
      );
    }
    if (extensions.has(confirmation) || extensions.has(transaction)) {
      throw new Error(
        "One payment cannot be both estimated tax and an extension payment",
      );
    }
    if (date < "2026-01-01" || date > claim.as_of) {
      throw new Error(
        "Estimated payment or credit date is outside the reviewed period",
      );
    }
    confirmations.add(confirmation);
    transactions.add(transaction);
  };
  for (const payment of claim.payments) {
    if (!currentOwners.has(normalize(payment.payer_tin))) {
      throw new Error(
        "Estimated payment payer is not the taxpayer or a joint-return spouse",
      );
    }
    record(
      payment.payment_record_reference,
      payment.transaction_reference,
      payment.payment_date,
    );
  }
  const ordinary = sumEstimatedPaymentRecords({
    ...quarterAmounts(claim.payments),
    quarter_payment_records: claim.payments,
  });
  let joint = 0;
  if (claim.joint_allocation) {
    const review = claim.joint_allocation;
    if (normalize(review.taxpayer_ssn) !== taxpayer) {
      throw new Error("Joint payment allocation belongs to another taxpayer");
    }
    if ("divorce_date_2026" in review) {
      if (review.divorce_date_2026 > claim.as_of) {
        throw new Error(
          "Divorce event is later than the estimated-payment review",
        );
      }
      if (
        ![FilingStatus.Single, FilingStatus.HOH].includes(
          input.filing_status,
        ) || input.spouse_ssn !== undefined
      ) {
        throw new Error(
          "Divorced payment allocation needs the unmarried single/HOH filer",
        );
      }
      result.former_spouse_ssn = normalize(review.former_spouse_ssn);
    } else if (
      input.filing_status !== FilingStatus.MFS ||
      normalize(input.spouse_ssn) !== normalize(review.spouse_ssn)
    ) {
      throw new Error(
        "MFS payment allocation needs both current spouse identities",
      );
    }
    const amounts = quarterAmounts(
      review.payments.map((p) => ({
        quarter: p.quarter,
        amount: p.taxpayer_allocated_amount,
      })),
    );
    reconcileJointEstimatedRecords(
      amounts,
      review,
      "divorce_date_2026" in review ? review.divorce_date_2026 : undefined,
    );
    for (const p of review.payments) {
      record(
        p.payment_record_reference,
        p.transaction_reference,
        p.payment_date,
      );
    }
    joint = sumEstimatedPaymentRecords(amounts);
  }
  let credit = 0;
  const priorOwners = new Set<string>();
  const acceptedReturns = new Set<string>();
  for (
    const { prior_return: prior, account_credit: posted } of claim
      .prior_year_credits
  ) {
    const primary = normalize(prior.primary_tin),
      priorSpouse = normalize(prior.spouse_tin);
    if (
      !currentOwners.has(primary) ||
      !currentOwners.has(normalize(posted.account_tin))
    ) throw new Error("Prior-year credit belongs to another return");
    if (
      prior.filing_status === FilingStatus.MFJ &&
      (input.filing_status !== FilingStatus.MFJ || !priorSpouse ||
        priorSpouse === primary || !currentOwners.has(priorSpouse))
    ) {
      throw new Error(
        "Prior joint credit needs the same joint filers or a separate allocation review",
      );
    }
    if (
      prior.filing_status !== FilingStatus.MFJ &&
      normalize(posted.account_tin) !== primary
    ) {
      throw new Error(
        "Individual prior-year credit must remain on its owner account",
      );
    }
    const owners = prior.filing_status === FilingStatus.MFJ
      ? [primary!, priorSpouse!]
      : [primary!];
    if (
      (prior.filing_status === FilingStatus.MFS &&
        (!priorSpouse || primary === priorSpouse)) ||
      (![FilingStatus.MFJ, FilingStatus.MFS].includes(prior.filing_status) &&
        priorSpouse !== undefined)
    ) {
      throw new Error(
        "Prior-return spouse identity disagrees with its filing status",
      );
    }
    if (
      returns.has(prior.record_reference) ||
      acceptedReturns.has(prior.acceptance_reference) || owners.some((tin) =>
        priorOwners.has(tin)
      )
    ) {
      throw new Error("Duplicate prior-return credit source");
    }
    returns.add(prior.record_reference);
    acceptedReturns.add(prior.acceptance_reference);
    owners.forEach((tin) => priorOwners.add(tin));
    if (
      posted.originating_return_reference !== prior.record_reference ||
      posted.amount !== prior.line36_applied_to_2026 ||
      prior.line34_overpayment - prior.line38_underpayment_penalty !==
        prior.line35a_refund + prior.line36_applied_to_2026
    ) throw new Error("Prior-return election and posted IRS credit disagree");
    record(
      prior.record_reference,
      posted.transaction_reference,
      posted.effective_date,
    );
    credit += posted.amount;
  }
  const total = sumEstimatedPaymentRecords({
    payment_q1: ordinary,
    payment_q2: joint,
    applied_from_prior_year: credit,
  });
  if (!Number.isSafeInteger(Math.round(total * 100))) {
    throw new Error("Estimated payment total exceeds safe cent precision");
  }
  const sourceTotal = Math.round(total * 100) / 100;
  return {
    ...result,
    source_total: sourceTotal,
    line26_estimated_payments: roundWholeDollars(sourceTotal),
  };
}

class EstimatedPayments2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "estimated_payments";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["f1040"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Estimated payments need f1040:2026 context");
    }
    const calculation = calculateEstimatedPayments2026(raw);
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: calculation } },
        {
          nodeType: "f1040",
          fields: {
            line26_estimated_payments: calculation.line26_estimated_payments,
            line26_former_spouse_ssn: calculation.former_spouse_ssn,
          },
        },
      ],
    };
  }
}
export const estimated_payments_2026 = new EstimatedPayments2026();

export type EstimatedPaymentSource2026 = z.input<typeof inputSchema>;
/** PDF/filing projection must use the same owners and payment inventory. */
export function reconcileEstimatedPaymentReturn2026(
  source: EstimatedPaymentSource2026 | undefined,
  fields: Record<string, unknown>,
): void {
  if (!source) {
    if (
      (fields.line26_estimated_payments ?? 0) !== 0 ||
      fields.line26_former_spouse_ssn !== undefined
    ) {
      throw new Error(
        "Form 1040 line 26 needs retained estimated-payment sources",
      );
    }
    return;
  }
  const calculated = calculateEstimatedPayments2026(source);
  if (
    normalize(source.taxpayer_ssn) !==
      normalize(fields.taxpayer_ssn as string | undefined) ||
    normalize(source.spouse_ssn) !==
      normalize(fields.spouse_ssn as string | undefined) ||
    source.filing_status !== fields.filing_status
  ) {
    throw new Error("Estimated-payment sources belong to another filer");
  }
  if (
    calculated.line26_estimated_payments !==
      (fields.line26_estimated_payments ?? 0) ||
    calculated.former_spouse_ssn !== fields.line26_former_spouse_ssn
  ) {
    throw new Error(
      "Form 1040 line 26 disagrees with its estimated-payment sources",
    );
  }
}
