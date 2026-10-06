import { isDeepStrictEqual } from "node:util";
import {
  assertPatron1099PATRSource,
  calculateIndependentPatronBusinesses,
  type Form8995AInput,
  inputSchema,
} from "../nodes/intermediate/forms/form8995a/index.ts";
import { independentReviewsSchema } from "../nodes/inputs/qbi_patron/schema.ts";
import { inputSchema as farmSchema } from "../nodes/intermediate/forms/schedule_f/model.ts";
import { assertOwnedScheduleSE } from "./schedule-se-owner-source.ts";
import { normalizeAllPending } from "./pending.ts";
import { ordinaryTax2025 } from "../nodes/intermediate/worksheets/tax_table_2025.ts";

export function assertIndependentPatronReturn(
  input: Form8995AInput,
  raw: Readonly<Record<string, unknown>> | undefined,
) {
  if (!input.independent_patron_sources) return;
  if (!raw) {
    throw new Error("Independent patron needs full actual source return");
  }
  const pending = normalizeAllPending(raw as Record<string, unknown>);
  const result = calculateIndependentPatronBusinesses(input),
    source = result.family.source;
  const farm = farmSchema.parse(pending.schedule_f);
  if (
    !isDeepStrictEqual(inputSchema.parse(pending.form8995a), input) ||
    !isDeepStrictEqual(
      inputSchema.parse(pending.form8995a_schedule_d),
      input,
    ) ||
    !isDeepStrictEqual(
      independentReviewsSchema.parse(pending.qbi_patron),
      source.review,
    ) ||
    !isDeepStrictEqual(farm.independent_patron_reviews, source.review) ||
    farm.patron_filing_review || farm.farm_optional_method_elected ||
    farm.schedule_fs.length !== source.businesses.length ||
    source.businesses.some((s) =>
      !farm.schedule_fs.some((f) => isDeepStrictEqual(f, s.business_source))
    )
  ) {
    throw new Error(
      "Independent patron parent, companion and owned source reviews differ",
    );
  }
  assertPatron1099PATRSource(input, pending.f1099patr);
  const se = assertOwnedScheduleSE(pending);
  if (!se || !isDeepStrictEqual(se.source, source.owned_se_source)) {
    throw new Error(
      "Independent patron owner SE differs from public farm source",
    );
  }
  const s1 = pending.schedule1, f = pending.f1040, lines = result.parent;
  const health = result.family.health?.deduction ?? 0;
  const profit = result.family.profit, agi = profit - se.deduction - health;
  const medicare = Math.round(
    Math.max(0, Math.round(se.medicareEarnings) - 250000) * .009,
  );
  const zero = (v: unknown) => v === undefined || v === 0;
  if (
    pending.general?.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    pending.general?.qbi_not_patron_of_specified_cooperative_confirmed ===
      true ||
    [
      "schedule_c",
      "schedule_e",
      "w2",
      "k1_partnership",
      "k1_s_corp",
      "f1099div",
      "f1099int",
      "f1099b",
      "schedule_d",
      "f5884",
      "form8829",
      "sep_retirement",
    ].some((k) => pending[k] !== undefined) ||
    !isDeepStrictEqual(
      pending.form7206?.independent_schedule_c_plans,
      source.owned_health_source,
    ) ||
    !isDeepStrictEqual(
      pending.form7206?.independent_plan_filing_rows,
      result.family.health?.rows,
    ) ||
    !isDeepStrictEqual(
      pending.form8995?.joint_owner_health_plans_source,
      source.owned_health_source,
    ) ||
    !zero(s1?.line16_sep_simple) ||
    Number(s1?.line17_se_health_insurance ?? 0) !== health ||
    s1?.line6_schedule_f !== profit ||
    s1?.line10_total_additional_income !== profit ||
    s1?.line15_se_deduction !== se.deduction ||
    f?.line8_additional_income !== profit || f?.line9_total_income !== profit ||
    f?.line10_adjustments !== se.deduction + health ||
    f?.line11_agi !== agi || !zero(f?.line13b_additional_deductions) ||
    input.taxable_income !==
      Math.max(0, agi - Number(f?.line12c_deduction_total)) ||
    f?.line13_qbi_deduction !== lines.line39 ||
    f?.line15_taxable_income !==
      Math.max(0, input.taxable_income - lines.line39) ||
    f?.line14_deductions_qbi_total !==
      Number(f?.line12c_deduction_total) + lines.line39 ||
    f?.line16_income_tax !==
      ordinaryTax2025(Number(f?.line15_taxable_income), input.filing_status) ||
    pending.schedule2?.line4_se_tax !== se.tax ||
    (pending.form8959?.line18_total_tax ?? 0) !== medicare ||
    (pending.schedule2?.line11_additional_medicare ?? 0) !== medicare ||
    f?.line22_tax_after_credits !== f?.line16_income_tax ||
    f?.line23_other_taxes !== se.tax + medicare ||
    f?.line24_total_tax !==
      Number(f?.line22_tax_after_credits) + se.tax + medicare
  ) {
    throw new Error(
      "Independent patron farms, attributable expenses, QBI and final1040 tax do not reconcile",
    );
  }
}
