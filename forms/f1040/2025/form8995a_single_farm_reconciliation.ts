import { isDeepStrictEqual } from "node:util";
import { inputSchema as farmInput } from "../nodes/intermediate/forms/schedule_f/model.ts";
import { inputSchema as advancedInput } from "../nodes/intermediate/forms/form8995a/index.ts";
import {
  assertSingleFarmAmounts,
  singleFarmSourceAmounts,
} from "../nodes/intermediate/forms/form8995a/single-farm-source.ts";
function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    throw new Error("Advanced farm QBI needs a retained return source record");
  }
  return v as Record<string, unknown>;
}
function sum(v: unknown): number {
  return Array.isArray(v) ? v.reduce((s, n) => s + sum(n), 0) : Number(v ?? 0);
}
/** Independently bind both filing projections to the actual retained farm and tax sources. */
export function assertSingleFarmQbiReturn(
  pending: Readonly<Record<string, unknown>>,
): void {
  if (
    !pending.form8995a || !record(pending.form8995a).single_schedule_f_source
  ) return;
  const input = advancedInput.parse(pending.form8995a);
  assertSingleFarmAmounts(input);
  const source = singleFarmSourceAmounts(input.single_schedule_f_source!);
  const farms = farmInput.parse(pending.schedule_f).schedule_fs;
  const sink = record(pending.f1040),
    tax = record(pending.income_tax_calculation);
  const general = record(pending.general);
  const qualified = sum(tax.qualified_dividends);
  const capital = sum(tax.net_capital_gain);
  const ordinary = sum(sink.line3b_ordinary_dividends);
  if (
    !farms || farms.length !== 1 || !isDeepStrictEqual(farms[0], source.item) ||
    String(general.taxpayer_ssn ?? "").replaceAll("-", "") !==
      source.owner_ssn ||
    general.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    general.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    sum(sink.line1z_total_wages) !== 0 ||
    sum(sink.line9_total_income) !==
      source.profit + ordinary + sum(sink.line7_capital_gain) ||
    sum(sink.line10_adjustments) !== source.se_tax_deduction ||
    sum(sink.line11_agi) !==
      source.profit + ordinary + sum(sink.line7_capital_gain) -
        source.se_tax_deduction ||
    Math.round(qualified + capital) !== input.net_capital_gain ||
    input.business_filing_details?.qualified_dividends_zero_confirmed !==
      (qualified === 0)
  ) {
    throw new Error(
      "Advanced farm QBI differs from actual retained farm, owner, investment income or SE return sources",
    );
  }
}
