import { form8815ForeignAddback } from "./form8815_foreign_addback.ts";
import { z } from "zod";
import {
  calculateForm8815,
  inputSchema as bondSchema,
} from "../../../../../nodes/intermediate/forms/income/investments/form8815/index.ts";
import { royaltyMagiDeduction } from "../../../../../nodes/intermediate/forms/income/investments/form8815/royalty_special_computation.ts";
import {
  calculateForm4952,
  inputSchema as interestSchema,
} from "../../../../../nodes/intermediate/forms/deductions/investments/form4952/index.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";

/** Shared by both filed forms; never calls either descriptor recursively. */
export function reconcileBondRoyaltyInterest(
  pending: Readonly<Record<string, unknown>>,
) {
  const interest = interestSchema.parse(pending.form4952);
  if (pending.form8815 === undefined) {
    if (interest.source_8815_excluded_interest !== undefined) {
      throw new Error("Form 4952 bond exclusion has no retained Form 8815");
    }
    return { exclusion: 0, magiIncomeAdjustment: 0, foreignExclusion: 0 };
  }
  const retained = z.record(z.unknown()).parse(pending.form8815);
  const bond = bondSchema.parse(Object.fromEntries(
    Object.keys(bondSchema.shape).map((key) => [key, retained[key]]),
  ));
  const special = bond.line9_worksheet.royalty_debt_special_computation;
  // This combined route has only the traced royalty and plain owned interest.
  // Do not infer an empty investment-income inventory from opt-in 1099 flags.
  if (
    !special || !interest.royalty_debt_trace || [
      "f1099div",
      "f1099oid",
      "f1099b",
      "f8949",
      "f8814",
      "form8814",
      "k1_partnership",
      "k1_s_corp",
      "k1_trust",
      "form1116",
    ].some((key) => pending[key] !== undefined)
  ) {
    throw new Error(
      "Form 8815 royalty computation needs a complete supported investment-income inventory",
    );
  }
  // The employee source requires line50 = 0; its addback also equals the
  // line45 exclusion subtracted on Schedule1 line8d.
  const foreignExclusion = form8815ForeignAddback(pending);
  if (
    bond.line9_worksheet.foreign_adoption_and_puerto_rico_addbacks !==
      foreignExclusion
  ) {
    throw new Error(
      "Form 8815 royalty MAGI needs the sourced foreign exclusion addback",
    );
  }
  const lines = calculateForm8815(bond, CONFIG_BY_YEAR[2025]);
  const actual = calculateForm4952(interest).line8;
  const dummy = royaltyMagiDeduction(
    special,
    bond.line9_worksheet.schedule_b_line2_interest,
  );
  const sink = z.object({
    line9_total_income: z.number(),
    line2b_taxable_interest: z.number().optional(),
  }).parse(pending.f1040);
  if (
    JSON.stringify(special.debt_trace) !==
      JSON.stringify(interest.royalty_debt_trace) ||
    interest.source_8815_excluded_interest !== lines.line14 ||
    Object.entries(lines).some(([key, value]) => retained[key] !== value) ||
    special.other_income_before_royalty_interest !==
      sink.line9_total_income - (sink.line2b_taxable_interest ?? 0) + actual
  ) {
    throw new Error(
      "Form 8815 royalty source, MAGI computation or actual Form 4952 differs from the final return",
    );
  }
  return {
    exclusion: lines.line14,
    magiIncomeAdjustment: actual - dummy,
    foreignExclusion,
  };
}
