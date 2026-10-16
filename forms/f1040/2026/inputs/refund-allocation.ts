import { z } from "zod";
import { accountSchema } from "../../nodes/inputs/payments/refund/f8888/index.ts";
import {
  reconcileForm8888,
  reconcileRefundDepositAccounts,
} from "../../nodes/inputs/payments/refund/f8888/reconciliation.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";

const reference = z.string().trim().min(1);
export const refundAllocationClaim2026Schema = z.object({
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: reference,
    deposit_request_confirmed: z.literal(true),
    accounts: z.array(
      accountSchema.omit({ amount: true }).extend({
        record_reference: reference,
        allocation: z.union([
          z.number().int().positive().safe(),
          z.literal("remainder"),
        ]),
        us_financial_institution: z.literal(true),
        institution_accepts_deposit: z.literal(true),
      }).strict(),
    ).min(1).max(3),
  }).strict().superRefine(({ accounts }, ctx) => {
    if (accounts.filter((a) => a.allocation === "remainder").length > 1) {
      ctx.addIssue({
        code: "custom",
        message: "Only one refund account may receive the remainder",
      });
    }
    if (
      new Set(accounts.map((a) => a.record_reference)).size !== accounts.length
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Refund accounts need distinct source references",
      });
    }
  }),
}).strict();

const inputSchema = refundAllocationClaim2026Schema.partial().extend({
  settled_return: z.record(z.unknown()),
}).strict();

export function calculateRefundAllocation2026(
  raw: z.input<typeof inputSchema>,
) {
  const input = inputSchema.parse(raw);
  const f = input.settled_return;
  const bankKeys = [
    "bank_routing_number",
    "bank_account_number",
    "bank_account_type",
  ] as const;
  const hasBank = bankKeys.some((k) => f[k] !== undefined);
  if (!input.claim) {
    if (hasBank) {
      throw new Error(
        "TY2026 bank details need a reviewed refund allocation claim",
      );
    }
    return {
      source_input: input,
      accounts: [],
      total_allocation: 0,
      file_form8888: false,
      form1040_fields: {},
    };
  }
  const refund = f.line35a_refund;
  if (
    typeof refund !== "number" || !Number.isSafeInteger(refund) || refund <= 0
  ) {
    throw new Error(
      "Refund allocation needs a positive finalized Form 1040 refund",
    );
  }
  const filer = extractFilerIdentity(f);
  if (!filer) {
    throw new Error("Refund allocation needs finalized filer identity");
  }
  const fixed = input.claim.accounts.reduce(
    (sum, a) => sum + (typeof a.allocation === "number" ? a.allocation : 0),
    0,
  );
  if (!Number.isSafeInteger(fixed)) {
    throw new Error("Refund allocations exceed safe dollar precision");
  }
  const accounts = input.claim.accounts.map((a) =>
    accountSchema.parse({
      routing_number: a.routing_number,
      account_number: a.account_number,
      account_type: a.account_type,
      owner_name: a.owner_name,
      amount: a.allocation === "remainder" ? refund - fixed : a.allocation,
    })
  );
  const split = accounts.length > 1;
  if (
    hasBank && (split || bankKeys.some((k, i) =>
      f[k] !==
        [
          accounts[0].routing_number,
          accounts[0].account_number,
          accounts[0].account_type,
        ][i]
    ))
  ) {
    throw new Error("Refund allocation conflicts with general bank details");
  }
  const total = split
    ? reconcileForm8888(
      {
        account_1: accounts[0],
        account_2: accounts[1],
        ...(accounts[2] ? { account_3: accounts[2] } : {}),
      },
      filer,
      { f1040: f },
    ).total_allocation
    : reconcileRefundDepositAccounts(accounts, filer, f);
  return {
    source_input: input,
    accounts,
    total_allocation: total,
    file_form8888: split,
    form1040_fields: split ? { form8888_attached: true } : {
      form8888_attached: false,
      line35b_routing_number: accounts[0].routing_number,
      line35c_account_type: accounts[0].account_type,
      line35d_account_number: accounts[0].account_number,
    },
  };
}

/** Terminal metadata stage: refund choices cannot feed back into tax amounts. */
class RefundAllocation2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "refund_allocation";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Refund allocation needs f1040:2026 context");
    }
    const calculation = calculateRefundAllocation2026(raw);
    return {
      outputs: [{
        nodeType: this.nodeType,
        fields: { calculation_2026: calculation },
      }],
    };
  }
}
export const refund_allocation_2026 = new RefundAllocation2026();
