import { z } from "zod";
import {
  isSourceMoney,
  sourceCents,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import type { retirementCopy2026Schema } from "./retirement-statement.ts";
import type { calculateForm4852Sources2026 } from "./form4852-source.ts";
const ref = z.string().trim().min(1),
  date = z.string().date(),
  tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().max(1_000_000_000).refine(
  isSourceMoney,
);
export const directTransferLedger2026Schema = z.object({
  record_reference: ref,
  complete_payment_and_destination_inventory_verified: z.literal(true),
  eligible_direct_transfer_no_rmd_or_other_ineligible_amount_verified: z
    .literal(true),
  no_cash_received_by_filer_verified: z.literal(true),
  payments: z.array(
    z.object({
      payment_reference: ref,
      paid_on: date,
      gross: money.refine((v) => v > 0),
      after_tax_basis: money,
      plan_basis_record_reference: ref,
      plan_proportionate_basis_and_simultaneous_destination_allocation_verified:
        z.literal(true),
      destinations: z.array(
        z.object({
          receipt_reference: ref,
          owner_tin: tin,
          custodian_tin: tin,
          account_number: ref,
          received_on: date,
          amount: money.refine((v) => v > 0),
          after_tax_basis: money,
          destination_type: z.enum([
            "traditional_ira",
            "eligible_non_roth_plan",
            "roth_ira",
            "designated_roth_plan",
          ]),
          receiving_account_eligibility_verified: z.literal(true),
        }).strict(),
      ).min(1).max(100),
    }).strict(),
  ).min(1).max(1000),
}).strict();
export type DirectTransferLedger2026 = z.input<
  typeof directTransferLedger2026Schema
>;
/** Resolve actual dated transfers before the shared code-G income projection. */
export function reconcileDirectTransfers2026(
  raw: DirectTransferLedger2026,
  copy: z.output<typeof retirementCopy2026Schema>,
  ownerTin: string,
  reviewedOn: string,
  ownerDob: string,
  substitute?: ReturnType<
    typeof calculateForm4852Sources2026
  >["rows"][number]["source"],
) {
  const input = directTransferLedger2026Schema.parse(raw);
  if (
    copy.box7b_ira_sep_simple || copy.box7a_distribution_codes.join("") !== "G"
  ) throw Error("Direct plan transfer ledger needs a non-IRA code G source");
  if (
    substitute &&
    (substitute.kind !== "1099r" ||
      substitute.source_document_reference !== copy.source_document_reference ||
      substitute.owner_tin !== ownerTin ||
      substitute.payer_tin !== copy.payer_tin ||
      substitute.account_number !== copy.account_number)
  ) {
    throw Error(
      "Direct transfer ledger needs its actual Form 4852 owner and account",
    );
  }
  const estimated = substitute?.kind === "1099r" ? substitute : undefined;
  const refs = new Set<string>([input.record_reference]);
  const unique = (v: string) => {
    if (refs.has(v)) {
      throw Error(
        "Direct transfer payment and receipt references must be distinct",
      );
    }
    refs.add(v);
  };
  const payments = input.payments.map((p) => {
    unique(p.payment_reference);
    unique(p.plan_basis_record_reference);
    if (
      !p.paid_on.startsWith("2026-") || p.paid_on < ownerDob ||
      p.after_tax_basis > p.gross ||
      copy.box13_payment_date && copy.box13_payment_date !== p.paid_on
    ) {
      throw Error(
        "Direct transfer payment date or basis conflicts with its source",
      );
    }
    const destinations = p.destinations.map((d) => {
      unique(d.receipt_reference);
      if (
        d.owner_tin !== ownerTin || d.received_on < p.paid_on ||
        d.received_on > reviewedOn || d.after_tax_basis > d.amount
      ) {
        throw Error(
          "Direct transfer receipt needs the actual owner, timely receipt and supported basis",
        );
      }
      const roth = ["roth_ira", "designated_roth_plan"].includes(
        d.destination_type,
      );
      if (!roth && d.after_tax_basis > 0) {
        throw Error(
          "After-tax plan rollovers into non-Roth accounts need destination basis integration",
        );
      }
      return {
        ...d,
        taxable: roth
          ? (sourceCents(d.amount) - sourceCents(d.after_tax_basis)) / 100
          : 0,
      };
    });
    if (
      sumSourceMoney(destinations.map((d) => d.amount)) !== p.gross ||
      sumSourceMoney(destinations.map((d) => d.after_tax_basis)) !==
        p.after_tax_basis
    ) {
      throw Error(
        "Direct transfer destinations must reconcile each payment's gross and plan basis",
      );
    }
    const taxable = sumSourceMoney(destinations.map((d) => d.taxable));
    if (estimated) {
      const source = estimated.distribution_sources.find((s) =>
        s.distribution_reference === p.payment_reference
      );
      if (
        !source || source.paid_on !== p.paid_on ||
        source.gross_distribution !== p.gross ||
        source.taxable_amount_not_determined ||
        source.taxable_amount !== taxable ||
        source.employee_contributions !== p.after_tax_basis ||
        source.federal_withheld !== 0 || source.state_tax_withheld !== 0 ||
        source.local_tax_withheld !== 0 || source.account_type !== "non_ira"
      ) {
        throw Error(
          "Direct transfer receipts must reconcile every actual Form 4852 payment, taxable amount, basis and withholding",
        );
      }
    }
    return { ...p, destinations, taxable };
  });
  const gross = sumSourceMoney(payments.map((p) => p.gross)),
    taxable = sumSourceMoney(payments.map((p) => p.taxable)),
    basis = sumSourceMoney(payments.map((p) => p.after_tax_basis));
  if (
    estimated && payments.length !== estimated.distribution_sources.length ||
    gross !== copy.box1_gross_distribution ||
    taxable !== copy.box2a_taxable_amount ||
    basis !== copy.box5_employee_contributions ||
    copy.box2b_taxable_amount_not_determined ||
    copy.box4_federal_withheld !== 0 ||
    copy.state_information.some((s) => s.box14_state_withheld !== 0) ||
    copy.local_information.some((s) => s.box17_local_withheld !== 0)
  ) {
    throw Error(
      "Direct transfer ledger must reconcile the complete current statement and zero withholding",
    );
  }
  return {
    source_input: input,
    payments,
    gross,
    taxable,
    after_tax_basis: basis,
    receipt_references: payments.flatMap((p) =>
      p.destinations.map((d) => d.receipt_reference)
    ),
  };
}
