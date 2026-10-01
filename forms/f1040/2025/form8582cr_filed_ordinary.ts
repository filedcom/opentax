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
import { inputSchema as partnershipK1InputSchema } from "../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as sCorpK1InputSchema } from "../nodes/inputs/k1_s_corp/index.ts";
import { sameForm3800PassiveAllocations } from "./mef/forms/f3800_passive_link.ts";
import { assertForm3800FinalCreditJoin } from "./form3800_final_credit_join.ts";
import { FORM3800_PRINTED_PART_V_ROWS } from "./pdf/forms/f3800_capacity.ts";

type Pending = Readonly<Record<string, unknown>>;
const nonemptySource = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.length > 0
    : value !== null && typeof value === "object" &&
      Object.keys(value).length > 0;
const creditOnlyPartnershipFields = new Set([
  "partnership_name",
  "partnership_ein",
  "source_document_reference",
  "recipient_tin",
  "box15_code_ad_new_markets_credit",
  "new_markets_credit_subject_to_passive_activity_limit",
]);
const creditOnlySCorpFields = new Set([
  "corporation_name",
  "corporation_ein",
  "source_document_reference",
  "recipient_tin",
  "box13_code_ad_new_markets_credit",
  "new_markets_credit_subject_to_passive_activity_limit",
]);

/** Replays one rental activity and its current-year credits against the filed return. */
export function reconcileFiledForm8582CROrdinary(
  raw: unknown,
  pending: Pending,
) {
  const input = form8582crInputSchema.parse(raw);
  const source = input.credit_sources[0];
  const selfCredit = input.credit_sources.length > 0 &&
    input.credit_sources.length <= FORM3800_PRINTED_PART_V_ROWS &&
    input.credit_sources.every((entry) =>
      entry.source_origin.kind === PassiveCreditSourceOrigin.Self
    );
  const partnershipCredit = source?.source_origin.kind ===
    PassiveCreditSourceOrigin.Partnership;
  const sCorpCredit = source?.source_origin.kind ===
    PassiveCreditSourceOrigin.SCorporation;
  if (
    !input.line6_ordinary_worksheet || input.credit_sources.length === 0 ||
    input.credit_sources.length > FORM3800_PRINTED_PART_V_ROWS || !source ||
    (!selfCredit && input.credit_sources.length !== 1) ||
    (!selfCredit && !partnershipCredit && !sCorpCredit) ||
    input.credit_sources.some((entry) =>
      entry.source_form !== "Form 8874" ||
      entry.category !== PassiveCreditCategory.Other ||
      entry.reporting_route !== PassiveCreditReportingRoute.Form3800Line3 ||
      entry.form3800_credit_line !== "1i" ||
      entry.current_year_credit <= 0 ||
      entry.prior_unallowed_credits.length !== 0 ||
      entry.publicly_traded_partnership
    ) ||
    input.modified_agi !== undefined ||
    input.is_real_estate_professional !== undefined ||
    input.form8582_line9_special_allowance_used !== undefined ||
    input.part_ii_tax_on_income_less_line14 !== undefined ||
    input.part_iii_tax_on_income_less_line26 !== undefined ||
    input.part_iv_tax_on_income_less_remaining_allowance !== undefined ||
    [
      "k1_trust",
      "f4835",
      "schedule_f",
      "form4797",
    ].some((key) => nonemptySource(pending[key]))
  ) {
    throw new Error(
      "Form 8582-CR printable ordinary route needs current-year self-earned Form 8874 credits within Form 3800 Part V capacity, or one credit-only K-1 code AD credit, and one sourced passive rental income activity",
    );
  }
  const tax = calculateForm8582CRLine6OrdinaryWorksheet(
    input.line6_ordinary_worksheet,
    pending.schedule_e,
    input,
    pending.f1040,
    pending.schedule1,
    pending.general,
    pending.f1099int,
  );
  let nonpassiveForm8874Credit = 0;
  if (selfCredit) {
    if (
      nonemptySource(pending.k1_partnership) ||
      nonemptySource(pending.k1_s_corp)
    ) {
      throw new Error("Form 8582-CR self-earned route has another K-1 source");
    }
    const creditForm = form8874InputSchema.parse(pending.f8874);
    const rows = calculateForm8874(creditForm).rows;
    const credits = rows.filter((row) =>
      row.investment.subject_to_passive_activity_limit
    );
    const ordinaryCredits = rows.filter((row) =>
      !row.investment.subject_to_passive_activity_limit
    );
    const sourceKeys = input.credit_sources.map((entry) =>
      JSON.stringify([
        entry.activity_reference,
        entry.source_document_reference,
      ])
    );
    if (
      credits.length !== input.credit_sources.length ||
      ordinaryCredits.length > 1 ||
      (ordinaryCredits.length === 1 && credits.length !== 1) ||
      input.credit_sources.length + ordinaryCredits.length >
        FORM3800_PRINTED_PART_V_ROWS ||
      new Set(sourceKeys).size !== sourceKeys.length ||
      credits.some((row) =>
        input.credit_sources.filter((entry) =>
          row.investment.passive_activity_reference ===
            entry.activity_reference &&
          row.investment.passive_source_document_reference ===
            entry.source_document_reference &&
          row.creditAmount === entry.current_year_credit
        ).length !== 1
      ) ||
      input.credit_sources.some((entry) =>
        credits.filter((row) =>
          row.investment.passive_activity_reference ===
            entry.activity_reference &&
          row.investment.passive_source_document_reference ===
            entry.source_document_reference &&
          row.creditAmount === entry.current_year_credit
        ).length !== 1
      )
    ) {
      throw new Error(
        "Form 8582-CR credit differs from the filed passive Form 8874 investment",
      );
    }
    nonpassiveForm8874Credit = ordinaryCredits[0]?.creditAmount ?? 0;
  } else if (partnershipCredit) {
    if (nonemptySource(pending.f8874)) {
      throw new Error(
        "Form 8582-CR partnership route has another Form 8874 source",
      );
    }
    if (nonemptySource(pending.k1_s_corp)) {
      throw new Error("Form 8582-CR partnership route has another K-1 source");
    }
    const k1s = partnershipK1InputSchema.parse(pending.k1_partnership)
      .k1_partnerships;
    const k1 = k1s[0];
    const origin = source.source_origin;
    const general = pending.general as { taxpayer_ssn?: string } | undefined;
    if (
      k1s.length !== 1 || !k1 ||
      Object.keys(k1).some((key) => !creditOnlyPartnershipFields.has(key)) ||
      origin.kind !== PassiveCreditSourceOrigin.Partnership ||
      origin.ein !== k1.partnership_ein ||
      origin.entity_reference !== k1.partnership_name ||
      source.activity_reference !== k1.source_document_reference ||
      source.source_document_reference !== k1.source_document_reference ||
      source.source_statement_reference !== undefined ||
      k1.box15_code_ad_new_markets_credit !== source.current_year_credit ||
      k1.new_markets_credit_subject_to_passive_activity_limit !== true ||
      !k1.recipient_tin ||
      k1.recipient_tin !== general?.taxpayer_ssn?.replaceAll("-", "")
    ) {
      throw new Error(
        "Form 8582-CR partnership code AD credit differs from the filed credit-only K-1",
      );
    }
  } else {
    if (
      nonemptySource(pending.f8874) ||
      nonemptySource(pending.k1_partnership)
    ) {
      throw new Error(
        "Form 8582-CR S corporation route has another credit source",
      );
    }
    const k1s = sCorpK1InputSchema.parse(pending.k1_s_corp).k1_s_corps;
    const k1 = k1s[0];
    const origin = source.source_origin;
    const general = pending.general as { taxpayer_ssn?: string } | undefined;
    if (
      k1s.length !== 1 || !k1 ||
      Object.keys(k1).some((key) => !creditOnlySCorpFields.has(key)) ||
      origin.kind !== PassiveCreditSourceOrigin.SCorporation ||
      origin.ein !== k1.corporation_ein ||
      origin.entity_reference !== k1.corporation_name ||
      source.activity_reference !== k1.source_document_reference ||
      source.source_document_reference !== k1.source_document_reference ||
      source.source_statement_reference !== undefined ||
      k1.box13_code_ad_new_markets_credit !== source.current_year_credit ||
      k1.new_markets_credit_subject_to_passive_activity_limit !== true ||
      !k1.recipient_tin ||
      k1.recipient_tin !== general?.taxpayer_ssn?.replaceAll("-", "")
    ) {
      throw new Error(
        "Form 8582-CR S corporation code AD credit differs from the filed credit-only K-1",
      );
    }
  }
  const lines = calculateForm8582CR(input);
  const ledger = buildCurrentYearCarryforwardLedger(input);
  if (
    lines.partI.line6 !== tax.line6 ||
    lines.partI.line5 !== input.credit_sources.reduce(
        (sum, entry) => sum + entry.current_year_credit,
        0,
      ) ||
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
    (nonpassiveForm8874Credit > 0 &&
      (f3800.f8874_credit?.credit_amount !== nonpassiveForm8874Credit ||
        f3800.f8874_credit?.subject_to_passive_activity_limit !== false)) ||
    (nonpassiveForm8874Credit === 0 && f3800.f8874_credit !== undefined) ||
    f3800.allowed_credit !== lines.line37 + nonpassiveForm8874Credit ||
    !sameForm3800PassiveAllocations(
      lines.sourceAllocations,
      f3800.passive_source_allocations ?? [],
    )
  ) {
    throw new Error(
      "Form 8582-CR line 37 and current-year source allocation differ from filed Form 3800",
    );
  }
  assertForm3800FinalCreditJoin(
    lines.line37 + nonpassiveForm8874Credit,
    pending,
  );
  return { lines, ledger, tax, nonpassiveForm8874Credit };
}
