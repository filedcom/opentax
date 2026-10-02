import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Alimony Received Input Node
//
// Handles alimony received under divorce or separation instruments executed
// before January 1, 2019. Such amounts are taxable to the recipient under
// IRC §71 (pre-TCJA rules apply based on instrument date).
//
// Amounts reported on Schedule 1, Line 2a.
// Post-2018 instruments and express later exclusions yield no taxable income.

// ─── Schema ───────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // Identifies one original agreement when several payments are retained.
  agreement_reference: z.string().trim().min(1),
  recipient_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  // Alimony amount received during the tax year
  amount: z.number().nonnegative(),
  // Date of the divorce or separation agreement (ISO date YYYY-MM-DD)
  // Must be before 2019-01-01 for pre-TCJA taxability
  divorce_agreement_date: z.string().date(),
  // A pre-2019 agreement can cease to be taxable when a later modification
  // expressly applies the post-2018 alimony treatment.
  post_2018_modification_excludes_alimony: z.boolean(),
  // Retained payer identity; the recipient supplies their SSN to the payer.
  payer_ssn: z.string().optional(),
});

export const inputSchema = z.object({
  alimony_receiveds: z.array(itemSchema),
});

export interface TaxableAlimonyAgreement {
  reference: string;
  recipientSsn: string;
  agreementMonth: string;
  amount: number;
}

export interface TaxableAlimonySummary {
  amount: number;
  agreementMonth: string;
  agreements: readonly TaxableAlimonyAgreement[];
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Only pre-2019 instrument dates without an express later exclusion are taxable.
function isTaxable(item: z.infer<typeof itemSchema>): boolean {
  return item.divorce_agreement_date < "2019-01-01" &&
    !item.post_2018_modification_excludes_alimony;
}

export function taxableAlimonyReceived(
  raw: unknown,
): TaxableAlimonySummary | undefined {
  const sourceItems = inputSchema.parse(raw).alimony_receiveds;
  const evidence = new Map<string, {
    date: string;
    recipientSsn: string;
    excluded: boolean;
  }>();
  for (const item of sourceItems) {
    const recipientSsn = item.recipient_ssn.replaceAll("-", "");
    const prior = evidence.get(item.agreement_reference);
    if (
      prior &&
      (prior.date !== item.divorce_agreement_date ||
        prior.recipientSsn !== recipientSsn ||
        prior.excluded !== item.post_2018_modification_excludes_alimony)
    ) {
      throw new Error(
        "Alimony agreement reference has conflicting original date, recipient, or modification review",
      );
    }
    evidence.set(item.agreement_reference, {
      date: item.divorce_agreement_date,
      recipientSsn,
      excluded: item.post_2018_modification_excludes_alimony,
    });
  }
  const items = sourceItems.filter(isTaxable)
    .filter((item) => item.amount > 0);
  if (items.length === 0) return undefined;
  const groups = new Map<string, TaxableAlimonyAgreement>();
  for (const item of items) {
    const month = item.divorce_agreement_date.slice(0, 7);
    const recipientSsn = item.recipient_ssn.replaceAll("-", "");
    const prior = groups.get(item.agreement_reference);
    if (prior) {
      if (
        prior.agreementMonth !== month ||
        prior.recipientSsn !== recipientSsn
      ) {
        throw new Error(
          "Alimony agreement reference has conflicting original date or recipient",
        );
      }
      prior.amount += item.amount;
    } else {
      groups.set(item.agreement_reference, {
        reference: item.agreement_reference,
        recipientSsn,
        agreementMonth: month,
        amount: item.amount,
      });
    }
  }
  if (groups.size > 10) {
    throw new Error(
      "Schedule 1 supports at most ten taxable alimony agreement groups",
    );
  }
  const agreements = [...groups.values()].sort((a, b) =>
    b.amount - a.amount ||
    a.agreementMonth.localeCompare(b.agreementMonth) ||
    a.reference.localeCompare(b.reference)
  );
  if (agreements.length > 1 && agreements[0].amount === agreements[1].amount) {
    throw new Error(
      "Schedule 1 line 2b needs a unique highest-income alimony agreement",
    );
  }
  return {
    amount: agreements.reduce((sum, agreement) => sum + agreement.amount, 0),
    agreementMonth: agreements[0].agreementMonth,
    agreements,
  };
}

export function assertTaxableAlimonySchedule1(
  filedAmount: unknown,
  source: unknown,
  ownerSsns?: readonly string[],
): ReturnType<typeof taxableAlimonyReceived> {
  if (source === undefined) {
    if (typeof filedAmount === "number" && filedAmount > 0) {
      throw new Error(
        "Schedule 1 line 2a needs dated alimony agreement source",
      );
    }
    return undefined;
  }
  const taxable = taxableAlimonyReceived(source);
  if ((taxable?.amount ?? 0) !== (filedAmount ?? 0)) {
    throw new Error("Schedule 1 line 2a differs from taxable alimony sources");
  }
  if (taxable) {
    if (!ownerSsns || ownerSsns.length === 0) {
      throw new Error("Schedule 1 alimony needs an identified recipient");
    }
    const allowed = new Set(ownerSsns.map((ssn) => ssn.replaceAll("-", "")));
    if (
      taxable.agreements.some((agreement) =>
        !allowed.has(agreement.recipientSsn)
      )
    ) {
      throw new Error("Schedule 1 alimony recipient differs from filer");
    }
  }
  return taxable;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class AlimonyReceivedNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "alimony_received";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    const taxable = taxableAlimonyReceived(input)?.amount ?? 0;

    if (taxable <= 0) {
      return { outputs: [] };
    }

    return {
      outputs: [
        this.outputNodes.output(schedule1, {
          line2a_alimony_received: taxable,
        }),
        this.outputNodes.output(agi_aggregator, {
          line2a_alimony_received: taxable,
        }),
      ],
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const alimony_received = new AlimonyReceivedNode();
