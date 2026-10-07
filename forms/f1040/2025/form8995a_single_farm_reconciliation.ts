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
  const filedW2 =
    ((pending.w2 as Record<string, unknown> | undefined)?.w2s ?? []) as Record<
      string,
      unknown
    >[];
  const ownerW2 = filedW2.map((row) => ({
    employer_ein: String(row.employer_ein ?? "").replaceAll("-", ""),
    employer_name: row.employer_name,
    employee_ssn: String(row.employee_ssn ?? "").replaceAll("-", ""),
    source_document_reference: row.source_document_reference,
    box1_wages: row.box1_wages,
    box3_ss_wages: row.box3_ss_wages ?? 0,
    box5_medicare_wages: row.box5_medicare_wages ?? 0,
    box7_ss_tips: row.box7_ss_tips ?? 0,
  }));
  const sink = record(pending.f1040),
    tax = record(pending.income_tax_calculation);
  const general = record(pending.general);
  const qualified = sum(sink.line3a_qualified_dividends);
  const capital = sum(tax.net_capital_gain);
  const ordinary = sum(sink.line3b_ordinary_dividends);
  const filedCapitalGain = sum(sink.line7_capital_gain) +
    sum(sink.line7a_cap_gain_distrib);
  const childIncome = sum(
    (pending.schedule1 as Record<string, unknown> | undefined)?.line8z_form8814,
  );
  if (
    !farms || farms.length !== 1 || !isDeepStrictEqual(farms[0], source.item) ||
    String(general.taxpayer_ssn ?? "").replaceAll("-", "") !==
      source.owner_ssn ||
    general.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    general.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    !isDeepStrictEqual(ownerW2, source.owner_w2_wage_sources ?? []) ||
    sum(sink.line1z_total_wages) !== ownerW2.reduce(
        (total, row) => total + Number(row.box1_wages),
        0,
      ) ||
    sum(sink.line9_total_income) !==
      source.profit + ordinary + childIncome + filedCapitalGain +
        sum(sink.line1z_total_wages) ||
    sum(sink.line10_adjustments) !== source.se_tax_deduction ||
    sum(sink.line11_agi) !==
      source.profit + ordinary + childIncome + filedCapitalGain -
        source.se_tax_deduction + sum(sink.line1z_total_wages) ||
    Math.round(qualified + capital) !== input.net_capital_gain ||
    input.business_filing_details?.qualified_dividends_zero_confirmed !==
      (qualified === 0)
  ) {
    throw new Error(
      "Advanced farm QBI differs from actual retained farm, owner, investment income or SE return sources",
    );
  }
}
