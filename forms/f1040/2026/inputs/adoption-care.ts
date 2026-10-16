import type { z } from "zod";
import {
  type adoptionIncomeBridge2026Schema,
  replayAdoptionIncome2026,
} from "./adoption-settlement.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { w2Item2026Schema } from "./w2-source.ts";

/** Form 2441 uses taxable wage adjustments, separately for each return owner.
 * A special-needs exclusion can exceed payments. Never substitute the gross
 * compensation used by the under-24 support tests or assign a joint total twice.
 */
export function adoptionCareIncome2026(
  raw: z.input<typeof adoptionIncomeBridge2026Schema>,
  owners: { filing_status: string; taxpayer_ssn: string; spouse_ssn?: string },
  wages: z.input<typeof w2Item2026Schema>[],
  inventoryReference: string | undefined,
) {
  const adoption = replayAdoptionIncome2026(raw, owners),
    s = adoption.source_input;
  if (inventoryReference !== s.claim.record_reference) {
    throw Error(
      "Care adoption review needs the actual adoption inventory reference",
    );
  }
  const ordered = (rows: typeof wages) =>
    [...rows].sort((a, b) =>
      a.source_document_reference.localeCompare(b.source_document_reference)
    );
  // Parse both sides before comparing defaults and normalized source values.
  if (
    JSON.stringify(ordered(s.wage_sources)) !==
      JSON.stringify(ordered(wages.map((w) => w2Item2026Schema.parse(w))))
  ) {
    throw Error("Care and adoption need the same issued W-2 inventory");
  }
  const programs = new Map(
    s.claim.programs.map((p) => [p.record_reference, p]),
  );
  const adjustments = { taxpayer: 0, spouse: 0 };
  const children = adoption.children.map((line, i) => {
    const prepared = adoption.source.children[i], child = prepared.source;
    const current = roundWholeDollars(prepared.current_benefits);
    const adjustment = current - line.line29;
    const programRefs = new Set(
      child.current_benefits.map((b) => b.program_reference),
    );
    if (line.line29 > 0 && prepared.special_needs_program_reference) {
      programRefs.add(prepared.special_needs_program_reference);
    }
    const tins = new Set(
      [...programRefs].map((id) => programs.get(id)!.owner_tin),
    );
    if (adjustment !== 0 && tins.size !== 1) {
      throw Error(
        "Care adoption adjustment needs a reconciled per-spouse exclusion allocation for this child",
      );
    }
    const ownerTin = tins.size === 1 ? [...tins][0] : undefined;
    const owner = !ownerTin
      ? undefined
      : ownerTin === s.taxpayer_ssn
      ? "taxpayer"
      : ownerTin === s.spouse_ssn
      ? "spouse"
      : undefined;
    if (adjustment !== 0 && !owner) {
      throw Error("Care adoption adjustment has no actual return owner");
    }
    if (owner) adjustments[owner] += adjustment;
    return {
      child_reference: child.record_reference,
      program_references: [...programRefs],
      owner_tin: ownerTin,
      owner,
      current_benefits: current,
      exclusion: line.line29,
      wage_adjustment: adjustment,
    };
  });
  if (
    adjustments.taxpayer + adjustments.spouse !==
      adoption.line1f_taxable_adoption_benefits
  ) {
    throw Error(
      "Owner adoption adjustments must reconcile signed Form 1040 line 1f",
    );
  }
  return { adoption, children, adjustments };
}
