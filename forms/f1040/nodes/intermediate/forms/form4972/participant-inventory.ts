import { z } from "zod";
import {
  allocatedSourceCents,
  isSourceMoney,
  sourceCents,
} from "./source-rounding.ts";

const money = z.number().nonnegative().refine(isSourceMoney);
const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const copySchema = z.object({
  source_document_reference: reference,
  box2a_taxable_amount: money,
  box3_capital_gain: money,
  box6_nua: money,
  box8_other: money,
}).strict();
export const participantInventorySchema = z.object({
  administrator_statement_reference: reference,
  full_cash_distribution: money,
  full_annuity_value: money,
  recipients: z.array(
    z.object({
      recipient_ssn: ssn,
      cash_share_pct: z.number().positive().max(100),
      annuity_share_pct: z.number().min(0).max(100),
      source_copies: z.array(copySchema).min(1),
    }).strict(),
  ).min(2),
}).strict();

type Row = Record<string, unknown>;
function row(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      "Form4972 shared participant needs identified source records",
    );
  }
  return value as Row;
}
function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Validate administrator inventory against all issued copies in this return.
 * Other beneficiaries can appear in the complete administrator inventory;
 * their records are source facts, never extra current-return distributions.
 */
export function reconcileParticipantIssuedInventory(
  items: readonly Row[],
): void {
  const plans = items.map((item) => row(item.form4972_plan));
  const first = plans[0];
  if (
    !first ||
    plans.some((plan) =>
      plan.participant_ssn !== first.participant_ssn ||
      plan.participant_name !== first.participant_name ||
      plan.plan_reference !== first.plan_reference ||
      plan.full_balance_statement_reference !==
        first.full_balance_statement_reference ||
      !same(
        plan.participant_distribution_inventory,
        first.participant_distribution_inventory,
      )
    )
  ) {
    throw new Error(
      "Form4972 shared participant inventory differs between issued copies",
    );
  }
  const inventory = participantInventorySchema.parse(
    first.participant_distribution_inventory,
  );
  const recipients = inventory.recipients;
  const copies = recipients.flatMap((recipient) => recipient.source_copies);
  if (
    new Set(recipients.map((r) => r.recipient_ssn)).size !==
      recipients.length ||
    new Set(copies.map((c) => c.source_document_reference)).size !==
      copies.length ||
    Math.abs(recipients.reduce((s, r) => s + r.cash_share_pct, 0) - 100) >
      1e-9 ||
    (inventory.full_annuity_value > 0 &&
      Math.abs(recipients.reduce((s, r) => s + r.annuity_share_pct, 0) - 100) >
        1e-9)
  ) {
    throw new Error(
      "Form4972 administrator inventory needs unique recipients/copies and complete shares",
    );
  }
  let cash = 0, annuity = 0;
  for (const recipient of recipients) {
    const ownCash = recipient.source_copies.reduce(
      (s, c) =>
        s + sourceCents(c.box2a_taxable_amount) + sourceCents(c.box6_nua),
      0,
    );
    const ownAnnuity = recipient.source_copies.reduce(
      (s, c) => s + sourceCents(c.box8_other),
      0,
    );
    if (
      recipient.source_copies.some((c) =>
        c.box3_capital_gain > c.box2a_taxable_amount
      ) ||
      ownCash !==
        allocatedSourceCents(
          inventory.full_cash_distribution,
          recipient.cash_share_pct,
        ) ||
      ownAnnuity !==
        allocatedSourceCents(
          inventory.full_annuity_value,
          recipient.annuity_share_pct,
        )
    ) {
      throw new Error(
        "Form4972 administrator recipient allocations differ from complete distribution pools",
      );
    }
    cash += ownCash;
    annuity += ownAnnuity;
  }
  if (
    cash !== sourceCents(inventory.full_cash_distribution) ||
    annuity !== sourceCents(inventory.full_annuity_value)
  ) {
    throw new Error(
      "Form4972 administrator allocations do not conserve full participant amounts",
    );
  }
  for (const item of items) {
    const recipient = recipients.find((r) =>
      r.recipient_ssn === item.recipient_ssn
    );
    const copy = recipient?.source_copies.find((c) =>
      c.source_document_reference === item.source_document_reference
    );
    if (
      !recipient || !copy ||
      item.box9a_pct_total !== recipient.cash_share_pct ||
      ((Number(item.box8_other ?? 0) > 0) &&
        item.box8_pct_total !== recipient.annuity_share_pct) ||
      Object.entries(copy).some(([key, value]) =>
        key !== "source_document_reference" && Number(item[key] ?? 0) !== value
      )
    ) {
      throw new Error(
        "Form4972 issued copy differs from participant-wide administrator inventory",
      );
    }
  }
  for (
    const recipient of recipients.filter((r) =>
      items.some((i) => i.recipient_ssn === r.recipient_ssn)
    )
  ) {
    if (
      recipient.source_copies.some((copy) =>
        !items.some((i) =>
          i.source_document_reference === copy.source_document_reference
        )
      )
    ) {
      throw new Error(
        "Form4972 current recipient omitted an issued distribution copy",
      );
    }
  }
}

/** Separate spouse elections for one participant share the same source pool.
 * Election-specific options remain separate; administrator allocations agree.
 */
export function reconcileSharedParticipantElections(
  sources: readonly Row[],
  elections: readonly Row[],
): void {
  const plans = sources.map((s) => row(s.form4972_plan));
  const first = plans[0], second = plans[1];
  if (!first || !second) {
    throw new Error(
      "Form4972 paired beneficiaries need both participant plans",
    );
  }
  if (
    first.participant_ssn !== second.participant_ssn &&
    first.plan_reference !== second.plan_reference
  ) return;
  if (
    first.participant_ssn !== second.participant_ssn ||
    first.plan_reference !== second.plan_reference ||
    first.participant_name !== second.participant_name ||
    first.full_balance_statement_reference !==
      second.full_balance_statement_reference ||
    !same(
      first.participant_distribution_inventory,
      second.participant_distribution_inventory,
    )
  ) {
    throw new Error(
      "Form4972 shared participant needs one reconciled plan inventory",
    );
  }
  const inventory = participantInventorySchema.parse(
    first.participant_distribution_inventory,
  );
  for (const source of sources) {
    const recipient = inventory.recipients.find((r) =>
      r.recipient_ssn === source.recipient_ssn
    );
    if (!recipient || source.recipient_share_pct !== recipient.cash_share_pct) {
      throw new Error(
        "Form4972 spouse source group differs from administrator recipient share",
      );
    }
  }
  const [a, b] = elections;
  for (
    const field of [
      "participant_died_before_1996_08_21",
      "death_benefit_exclusion",
      "death_benefit_exclusion_source_reference",
    ]
  ) {
    if (!same(a[field], b[field])) {
      throw new Error("Form4972 shared participant death records conflict");
    }
  }
  if (a.death_benefit_allocation || b.death_benefit_allocation) {
    const x = row(a.death_benefit_allocation),
      y = row(b.death_benefit_allocation);
    const deathRecipients = z.array(
      z.object({
        recipient_ssn: ssn,
        share_pct: z.number(),
        excluded_amount: money,
      }),
    ).parse(x.recipients);
    if (
      deathRecipients.length !== inventory.recipients.length ||
      inventory.recipients.some((r) =>
        !deathRecipients.some((d) =>
          d.recipient_ssn === r.recipient_ssn &&
          d.share_pct === r.cash_share_pct
        )
      )
    ) {
      throw new Error(
        "Form4972 death recipients differ from issued participant inventory",
      );
    }

    if (
      !same(x.recipients, y.recipients) ||
      x.participant_ssn !== y.participant_ssn
    ) {
      throw new Error("Form4972 shared participant death allocations conflict");
    }
  }
  if (a.partial_estate_tax_source || b.partial_estate_tax_source) {
    const x = row(a.partial_estate_tax_source),
      y = row(b.partial_estate_tax_source);
    for (
      const field of [
        "administrator_statement_reference",
        "estate_tax_return_reference",
        "full_distribution_taxable_amount",
        "full_distribution_federal_estate_tax",
      ]
    ) {
      if (!same(x[field], y[field])) {
        throw new Error(
          "Form4972 shared participant estate allocations conflict",
        );
      }
    }
    if (
      x.full_distribution_taxable_amount !== inventory.full_cash_distribution
    ) {
      throw new Error(
        "Form4972 estate allocation differs from full issued cash distribution",
      );
    }
  }
}
