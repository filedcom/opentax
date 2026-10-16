import { z } from "zod";
import {
  addCalendarMonths,
  type retirementCopy2026Schema,
} from "./retirement-statement.ts";
import {
  isSourceMoney,
  sourceCents,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";

const ref = z.string().trim().min(1), date = z.string().date();
const money = z.number().finite().nonnegative().max(1_000_000_000).refine(
  isSourceMoney,
);
export const iraConversion2026Schema = z.object({
  receipt: z.object({
    owner_tin: z.string().regex(/^\d{9}$/),
    source_document_reference: ref,
    custodian_tin: z.string().regex(/^\d{9}$/),
    account_number: ref,
    received_on: date,
    amount: money,
  }).strict(),
  direct_trustee_transfer_verified: z.literal(true),
  not_required_minimum_distribution_verified: z.literal(true),
  destination_roth_ira_verified: z.literal(true),
}).strict();

/** Original single-payment intake remains a complete, reconciled source route. */
export const iraSingleDisposition2026Schema = z.object({
  source_document_reference: ref,
  disposition_record_reference: ref,
  distributed_on: date,
  cash_paid_to_owner: money,
  no_unlisted_distribution_or_conversion: z.literal(true),
  conversion: iraConversion2026Schema.optional(),
}).strict();

export const iraStatementPaymentLedger2026Schema = z.object({
  source_document_reference: ref,
  record_reference: ref,
  complete_payment_inventory_verified: z.literal(true),
  no_substantially_equal_payment_modification_or_recapture_verified: z.literal(
    true,
  ),
  payments: z.array(
    z.object({
      record_reference: ref,
      distributed_on: date,
      gross: money.refine((n) => n > 0, "IRA ledger payment must be positive"),
      cash_paid_to_owner: money,
      federal_withheld: money,
      state_withholding: z.array(
        z.object({ state: ref, withheld: money }).strict(),
      ).max(2).default([]),
      local_withholding: z.array(
        z.object({ locality: ref, withheld: money }).strict(),
      ).max(2).default([]),
      conversion: iraConversion2026Schema.optional(),
    }).strict(),
  ).min(1).max(1000),
}).strict();

export type IraDisposition2026 =
  | { kind: "single"; source: z.output<typeof iraSingleDisposition2026Schema> }
  | {
    kind: "ledger";
    source: z.output<typeof iraStatementPaymentLedger2026Schema>;
  };

/** Resolve payment facts before annual Form 8606 arithmetic. Never allocate an
 * annual withholding total across invented dates, or accept entered taxability. */
export function resolveIraDisposition2026(
  disposition: IraDisposition2026,
  copy: z.output<typeof retirementCopy2026Schema>,
  owner: { owner_tin: string; dob: string },
  account: {
    plan_type: "traditional_ira" | "sep_ira" | "simple_ira";
    simple_first_contribution_date?: string;
  },
) {
  const c = copy;
  const ledger = disposition.kind === "ledger";
  const payments = disposition.kind === "ledger"
    ? disposition.source.payments
    : [{
      record_reference: undefined,
      distributed_on: disposition.source.distributed_on,
      gross: c.box1_gross_distribution,
      cash_paid_to_owner: disposition.source.cash_paid_to_owner,
      federal_withheld: c.box4_federal_withheld,
      state_withholding: c.state_information.map((s) => ({
        state: s.state,
        withheld: s.box14_state_withheld,
      })),
      local_withholding: c.local_information.map((s) => ({
        locality: s.locality,
        withheld: s.box17_local_withheld,
      })),
      conversion: disposition.source.conversion,
    }];
  if (
    ledger &&
    new Set(payments.map((p) => p.record_reference)).size !== payments.length
  ) {
    throw Error("IRA statement payment references must be distinct");
  }
  const reconcileJurisdictions = (
    issued: { key: string; amount: number }[],
    paid: { key: string; amount: number }[][],
  ) => {
    const sources = new Map(issued.map((v) => [v.key, v.amount]));
    if (
      sources.size !== issued.length ||
      paid.some((row) =>
        new Set(row.map((v) => v.key)).size !== row.length ||
        row.some((v) => !sources.has(v.key))
      ) ||
      issued.some((v) =>
        sumSourceMoney(
          paid.flatMap((row) =>
            row.filter((p) => p.key === v.key).map((p) => p.amount)
          ),
        ) !== v.amount
      )
    ) {
      throw Error(
        "IRA payment withholding must reconcile each issued state and locality once",
      );
    }
  };
  reconcileJurisdictions(
    c.state_information.map((v) => ({
      key: v.state,
      amount: v.box14_state_withheld,
    })),
    payments.map((p) =>
      p.state_withholding.map((v) => ({ key: v.state, amount: v.withheld }))
    ),
  );
  reconcileJurisdictions(
    c.local_information.map((v) => ({
      key: v.locality,
      amount: v.box17_local_withheld,
    })),
    payments.map((p) =>
      p.local_withholding.map((v) => ({ key: v.locality, amount: v.withheld }))
    ),
  );
  if (
    sumSourceMoney(payments.map((p) => p.gross)) !==
      c.box1_gross_distribution ||
    sumSourceMoney(payments.map((p) => p.federal_withheld)) !==
      c.box4_federal_withheld
  ) {
    throw Error(
      "IRA payment gross and federal withholding must reconcile the actual issued copy",
    );
  }
  const code = c.box7a_distribution_codes[0];
  const resolved = payments.map((p) => {
    if (
      !p.distributed_on.startsWith("2026-") || p.distributed_on < owner.dob ||
      c.box13_payment_date && c.box13_payment_date !== p.distributed_on
    ) {
      throw Error(
        "IRA disposition date disagrees with year, birth or issued payment date",
      );
    }
    if (
      code === "S" && account.plan_type !== "simple_ira" ||
      code === "7" &&
        p.distributed_on < addCalendarMonths(owner.dob, 59 * 12 + 6)
    ) {
      throw Error(
        "IRA issued distribution code conflicts with account type or payment-date age",
      );
    }
    if (account.plan_type === "simple_ira") {
      const first = account.simple_first_contribution_date;
      if (
        first && first > p.distributed_on ||
        (["1", "S"].includes(code) && (!first ||
          (p.distributed_on < addCalendarMonths(first, 24)) !== (code === "S")))
      ) {
        throw Error(
          "SIMPLE payment code conflicts with its actual two-year participation period",
        );
      }
    }
    const converted = p.conversion?.receipt.amount ?? 0;
    const withheld = sumSourceMoney([
      p.federal_withheld,
      ...p.state_withholding.map((v) => v.withheld),
      ...p.local_withholding.map((v) => v.withheld),
    ]);
    if (
      sumSourceMoney([converted, p.cash_paid_to_owner, withheld]) !== p.gross
    ) {
      throw Error(
        "IRA gross distribution must reconcile conversion, cash and withholding for each actual payment",
      );
    }
    const receipt = p.conversion?.receipt;
    if (receipt) {
      if (receipt.owner_tin !== owner.owner_tin) {
        throw Error("IRA conversion receipt must belong to the actual owner");
      }
      if (
        converted <= 0 || receipt.received_on < p.distributed_on ||
        receipt.received_on > "2026-12-31"
      ) {
        throw Error(
          "Direct IRA conversion requires a positive receipt after distribution within 2026",
        );
      }
      if (
        account.plan_type === "simple_ira" &&
        (!account.simple_first_contribution_date ||
          p.distributed_on <
            addCalendarMonths(account.simple_first_contribution_date, 24) ||
          code === "S")
      ) {
        throw Error(
          "SIMPLE conversion needs its completed two-year participation period",
        );
      }
    }
    return {
      record_reference: p.record_reference,
      payment_date: p.distributed_on,
      gross: p.gross,
      converted,
      nonconversion: (sourceCents(p.gross) - sourceCents(converted)) / 100,
      conversion: p.conversion,
    };
  });
  return {
    record_reference: disposition.kind === "ledger"
      ? disposition.source.record_reference
      : disposition.source.disposition_record_reference,
    payments: resolved,
    converted: sumSourceMoney(resolved.map((p) => p.converted)),
    nonconversion: sumSourceMoney(resolved.map((p) => p.nonconversion)),
  };
}
