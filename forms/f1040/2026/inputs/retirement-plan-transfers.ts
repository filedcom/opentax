import { z } from "zod";
import { investmentOwner2026 } from "./investment-source.ts";
import { retirementCopy2026Schema } from "./retirement-statement.ts";
import {
  calculateForm4852Bridge2026,
  form4852Bridge2026Schema,
} from "./form4852-bridge.ts";
import {
  directTransferLedger2026Schema,
  reconcileDirectTransfers2026,
} from "./retirement-direct-transfers.ts";
import { FilingStatus } from "../../nodes/types.ts";
const date = z.string().date();
/** Internal current-source binding; public claims cannot enter calculated basis additions. */
export const planTransferSources2026Schema = investmentOwner2026.extend({
  taxpayer_dob: date,
  spouse_dob: date.optional(),
  reviewed_on: date,
  entries: z.array(
    z.object({
      copy: retirementCopy2026Schema,
      reviewed_on: date,
      ledger: directTransferLedger2026Schema,
    }).strict(),
  ).max(100),
  form4852_sources_2026: form4852Bridge2026Schema.optional(),
}).strict();
export type PlanTransferSources2026 = z.input<
  typeof planTransferSources2026Schema
>;
export function calculatePlanTransfers2026(raw: PlanTransferSources2026) {
  const input = planTransferSources2026Schema.parse(raw),
    substitutes = input.form4852_sources_2026
      ? calculateForm4852Bridge2026(input.form4852_sources_2026)
      : undefined;
  if (
    substitutes &&
    (substitutes.source_input.filing_status !== input.filing_status ||
      substitutes.source_input.taxpayer_ssn !== input.taxpayer_ssn ||
      substitutes.source_input.spouse_ssn !== input.spouse_ssn)
  ) throw Error("Plan transfers and Form 4852 must use the same return owners");
  const copies = new Set<string>(), receipts = new Set<string>();
  const rows = input.entries.map((e) => {
    const c = e.copy,
      spouse = c.recipient === "spouse",
      id = spouse ? input.spouse_ssn : input.taxpayer_ssn,
      dob = spouse ? input.spouse_dob : input.taxpayer_dob;
    if (
      !id || !dob || spouse && input.filing_status !== FilingStatus.MFJ ||
      (c.recipient_tin.startsWith("XXX")
        ? !id.endsWith(c.recipient_tin.slice(-4))
        : c.recipient_tin.replaceAll("-", "") !== id) ||
      copies.has(c.source_document_reference) || e.reviewed_on < "2027-01-01" ||
      e.reviewed_on > input.reviewed_on
    ) {
      throw Error(
        "Plan transfers need distinct current sources, actual owners and completed treatment reviews",
      );
    }
    copies.add(c.source_document_reference);
    if (
      substitutes &&
      JSON.stringify(c) !==
        JSON.stringify(
          substitutes.effective_retirement_copies.find((s) =>
            s.source_document_reference === c.source_document_reference
          ),
        )
    ) {
      throw Error(
        "Plan transfer copy differs from the actual Form 4852 receiving inventory",
      );
    }
    const calculation = reconcileDirectTransfers2026(
      e.ledger,
      c,
      id,
      e.reviewed_on,
      dob,
      substitutes?.ledger.rows.find((s) =>
        s.source.source_document_reference === c.source_document_reference
      )?.source,
    );
    for (const ref of calculation.receipt_references) {
      if (receipts.has(ref)) {
        throw Error(
          "Direct transfer receipt is reused across retirement statements",
        );
      }
      receipts.add(ref);
    }
    return {
      source_document_reference: c.source_document_reference,
      owner_tin: id,
      reviewed_on: e.reviewed_on,
      calculation,
    };
  });
  const destinations = rows.flatMap((r) =>
    r.calculation.payments.flatMap((p) =>
      p.destinations.map((d) => ({
        ...d,
        source_document_reference: r.source_document_reference,
        payment_reference: p.payment_reference,
        paid_on: p.paid_on,
        plan_basis_record_reference: p.plan_basis_record_reference,
        reviewed_on: r.reviewed_on,
      }))
    )
  );
  return {
    source_input: input,
    rows,
    destinations,
    basis_records: destinations.filter((d) =>
      d.after_tax_basis > 0 &&
      ["traditional_ira", "eligible_non_roth_plan"].includes(d.destination_type)
    ).map((d) => ({
      ...d,
      basis_year: Number(d.received_on.slice(0, 4)),
      basis_amount: d.after_tax_basis,
    })),
  };
}
