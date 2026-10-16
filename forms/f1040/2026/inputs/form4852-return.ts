import {
  calculateForm4852Bridge2026,
  type Form4852Bridge2026,
} from "./form4852-bridge.ts";
import { w2Item2026Schema } from "./w2-source.ts";
import {
  type RetirementSource2026,
  retirementSource2026Schema,
} from "./retirement-source.ts";
/** Compare against the actual executed receiving inventories, not repeated totals. */
export function reconcileForm4852ReturnSources2026(
  raw: Form4852Bridge2026,
  wages: unknown,
  retirement?: RetirementSource2026,
) {
  const r = calculateForm4852Bridge2026(raw),
    w = w2Item2026Schema.array().parse(wages ?? []);
  if (JSON.stringify(w) !== JSON.stringify(r.effective_wages)) {
    throw Error("Form 4852 draft must reconcile the executed wage inventory");
  }
  const pension = retirement
    ? retirementSource2026Schema.parse(retirement)
    : undefined;
  if (
    JSON.stringify(pension?.claim.copies ?? []) !==
      JSON.stringify(r.effective_retirement_copies) ||
    r.substitute_retirement_copies.length &&
      JSON.stringify(pension?.form4852_sources_2026) !==
        JSON.stringify(r.source_input)
  ) {
    throw Error(
      "Form 4852 draft must reconcile the executed retirement inventory and substitute workpaper",
    );
  }
  return r;
}
