import {
  calculateForm8582CR,
  inputSchema as form8582crInputSchema,
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../nodes/intermediate/forms/form8582cr/index.ts";
import { buildCurrentYearCarryforwardLedger } from "../nodes/intermediate/forms/form8582cr/carryforward-ledger.ts";
import { calculateForm8582CRLine6OrdinaryWorksheet } from "../nodes/intermediate/forms/form8582cr/line6_ordinary_worksheet.ts";
import {
  calculateForm8874,
  inputSchema as form8874InputSchema,
} from "../nodes/inputs/f8874/index.ts";
import { inputSchema as form3800InputSchema } from "../nodes/inputs/f3800/index.ts";
import { sameForm3800PassiveAllocations } from "./mef/forms/f3800_passive_link.ts";
import { assertForm3800FinalCreditJoin } from "./form3800_final_credit_join.ts";

type Pending = Readonly<Record<string, unknown>>;
const nonemptySource = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.length > 0
    : value !== null && typeof value === "object" &&
      Object.keys(value).length > 0;

/** Replays the one-activity, current-year-only line 6 and credit source against the filed return. */
export function reconcileFiledForm8582CROrdinary(
  raw: unknown,
  pending: Pending,
) {
  const input = form8582crInputSchema.parse(raw);
  const source = input.credit_sources[0];
  if (
    !input.line6_ordinary_worksheet || input.credit_sources.length !== 1 ||
    !source || source.source_form !== "Form 8874" ||
    source.source_origin.kind !== PassiveCreditSourceOrigin.Self ||
    source.category !== PassiveCreditCategory.Other ||
    source.reporting_route !== PassiveCreditReportingRoute.Form3800Line3 ||
    source.form3800_credit_line !== "1i" ||
    source.current_year_credit <= 0 ||
    source.prior_unallowed_credits.length !== 0 ||
    source.publicly_traded_partnership ||
    input.modified_agi !== undefined ||
    input.is_real_estate_professional !== undefined ||
    input.form8582_line9_special_allowance_used !== undefined ||
    input.part_ii_tax_on_income_less_line14 !== undefined ||
    input.part_iii_tax_on_income_less_line26 !== undefined ||
    input.part_iv_tax_on_income_less_remaining_allowance !== undefined ||
    [
      "k1_partnership",
      "k1_s_corp",
      "k1_trust",
      "f4835",
      "schedule_f",
      "form4797",
    ].some((key) => nonemptySource(pending[key]))
  ) {
    throw new Error(
      "Form 8582-CR printable ordinary route needs one current-year self-earned Form 8874 credit and one sourced passive rental income activity",
    );
  }
  const tax = calculateForm8582CRLine6OrdinaryWorksheet(
    input.line6_ordinary_worksheet,
    pending.schedule_e,
    input,
    pending.f1040,
    pending.schedule1,
    pending.general,
  );
  const creditForm = form8874InputSchema.parse(pending.f8874);
  const credits = calculateForm8874(creditForm).rows.filter((row) =>
    row.investment.subject_to_passive_activity_limit
  );
  if (
    creditForm.investments.length !== 1 || credits.length !== 1 ||
    credits[0].investment.passive_activity_reference !==
      source.activity_reference ||
    credits[0].investment.passive_source_document_reference !==
      source.source_document_reference ||
    credits[0].creditAmount !== source.current_year_credit
  ) {
    throw new Error(
      "Form 8582-CR credit differs from the filed passive Form 8874 investment",
    );
  }
  const lines = calculateForm8582CR(input);
  const ledger = buildCurrentYearCarryforwardLedger(input);
  if (
    lines.partI.line6 !== tax.line6 ||
    lines.partI.line5 !== source.current_year_credit ||
    lines.partI.rental.total !== 0 || lines.partI.rehabilitation.total !== 0 ||
    lines.partI.housing.total !== 0 || lines.partII || lines.partIII ||
    lines.partIV ||
    ledger.total_credit !== lines.partI.line5 ||
    ledger.allowed_credit !== lines.line37 ||
    ledger.unallowed_credit !== lines.suspendedCredit
  ) {
    throw new Error(
      "Form 8582-CR ordinary line 6 and current-year Worksheet 9 ledger do not reconcile",
    );
  }
  const f3800 = form3800InputSchema.parse(pending.f3800);
  if (
    !sameForm3800PassiveAllocations(
      lines.sourceAllocations,
      f3800.passive_source_allocations ?? [],
    )
  ) {
    throw new Error(
      "Form 8582-CR line 37 and source allocation differ from filed Form 3800",
    );
  }
  assertForm3800FinalCreditJoin(lines.line37, pending);
  return { lines, ledger, tax };
}
