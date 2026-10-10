import {
  calculateForm8582CR,
  inputSchema as form8582crInputSchema,
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../../../../../nodes/intermediate/forms/credits/business/form8582cr/index.ts";
import { buildCurrentYearCarryforwardLedger } from "../../../../../nodes/intermediate/forms/credits/business/form8582cr/carryforward-ledger.ts";
import { calculateForm8582CRLine6OrdinaryWorksheet } from "../../../../../nodes/intermediate/forms/credits/business/form8582cr/line6_ordinary_worksheet.ts";
import {
  calculateForm8874,
  inputSchema as form8874InputSchema,
} from "../../../../../nodes/inputs/credits/business/f8874/index.ts";
import { inputSchema as form3800InputSchema } from "../../../../../nodes/inputs/credits/business/f3800/index.ts";
import { inputSchema as partnershipK1InputSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import { inputSchema as sCorpK1InputSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import { sameForm3800PassiveAllocations } from "../../../../mef/forms/credits/business/f3800/f3800_passive_link.ts";
import { assertForm3800FinalCreditJoin } from "../form3800/form3800_final_credit_join.ts";

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
type CreditSource = ReturnType<
  typeof form8582crInputSchema.parse
>["credit_sources"][number];

function reconcilePartnershipK1Credits(
  sources: readonly CreditSource[],
  pending: Pending,
) {
  if (sources.length === 0) {
    if (nonemptySource(pending.k1_partnership)) {
      throw new Error("Form 8582-CR has an unclaimed partnership K-1 source");
    }
    return;
  }
  const k1s = partnershipK1InputSchema.parse(pending.k1_partnership)
    .k1_partnerships;
  const general = pending.general as { taxpayer_ssn?: string } | undefined;
  if (
    k1s.length !== sources.length ||
    k1s.some((k1) =>
      Object.keys(k1).some((key) => !creditOnlyPartnershipFields.has(key)) ||
      !k1.recipient_tin ||
      k1.recipient_tin !== general?.taxpayer_ssn?.replaceAll("-", "") ||
      k1.new_markets_credit_subject_to_passive_activity_limit !== true
    ) ||
    sources.some((source) =>
      k1s.filter((k1) =>
        source.source_origin.kind === PassiveCreditSourceOrigin.Partnership &&
        source.source_origin.ein === k1.partnership_ein &&
        source.source_origin.entity_reference === k1.partnership_name &&
        source.activity_reference === k1.source_document_reference &&
        source.source_document_reference === k1.source_document_reference &&
        source.source_statement_reference === undefined &&
        k1.box15_code_ad_new_markets_credit === source.current_year_credit
      ).length !== 1
    ) ||
    k1s.some((k1) =>
      sources.filter((source) =>
        source.source_origin.kind === PassiveCreditSourceOrigin.Partnership &&
        source.source_origin.ein === k1.partnership_ein &&
        source.source_origin.entity_reference === k1.partnership_name &&
        source.activity_reference === k1.source_document_reference &&
        source.source_document_reference === k1.source_document_reference &&
        source.source_statement_reference === undefined &&
        k1.box15_code_ad_new_markets_credit === source.current_year_credit
      ).length !== 1
    )
  ) {
    throw new Error(
      "Form 8582-CR partnership code AD credits differ from the filed credit-only K-1s",
    );
  }
}

function reconcileSCorpK1Credits(
  sources: readonly CreditSource[],
  pending: Pending,
) {
  if (sources.length === 0) {
    if (nonemptySource(pending.k1_s_corp)) {
      throw new Error("Form 8582-CR has an unclaimed S corporation K-1 source");
    }
    return;
  }
  const k1s = sCorpK1InputSchema.parse(pending.k1_s_corp).k1_s_corps;
  const general = pending.general as { taxpayer_ssn?: string } | undefined;
  if (
    k1s.length !== sources.length ||
    k1s.some((k1) =>
      Object.keys(k1).some((key) => !creditOnlySCorpFields.has(key)) ||
      !k1.recipient_tin ||
      k1.recipient_tin !== general?.taxpayer_ssn?.replaceAll("-", "") ||
      k1.new_markets_credit_subject_to_passive_activity_limit !== true
    ) ||
    sources.some((source) =>
      k1s.filter((k1) =>
        source.source_origin.kind === PassiveCreditSourceOrigin.SCorporation &&
        source.source_origin.ein === k1.corporation_ein &&
        source.source_origin.entity_reference === k1.corporation_name &&
        source.activity_reference === k1.source_document_reference &&
        source.source_document_reference === k1.source_document_reference &&
        source.source_statement_reference === undefined &&
        k1.box13_code_ad_new_markets_credit === source.current_year_credit
      ).length !== 1
    ) ||
    k1s.some((k1) =>
      sources.filter((source) =>
        source.source_origin.kind === PassiveCreditSourceOrigin.SCorporation &&
        source.source_origin.ein === k1.corporation_ein &&
        source.source_origin.entity_reference === k1.corporation_name &&
        source.activity_reference === k1.source_document_reference &&
        source.source_document_reference === k1.source_document_reference &&
        source.source_statement_reference === undefined &&
        k1.box13_code_ad_new_markets_credit === source.current_year_credit
      ).length !== 1
    )
  ) {
    throw new Error(
      "Form 8582-CR S corporation code AD credits differ from the filed credit-only K-1s",
    );
  }
}

/** Replays the rental-income inventory and its current-year credits against the filed return. */
export function reconcileFiledForm8582CROrdinary(
  raw: unknown,
  pending: Pending,
) {
  const input = form8582crInputSchema.parse(raw);
  const source = input.credit_sources[0];
  const selfCredit = input.credit_sources.length > 0 &&
    input.credit_sources.every((entry) =>
      entry.source_origin.kind === PassiveCreditSourceOrigin.Self
    );
  const passThroughCredit = input.credit_sources.length > 0 &&
    input.credit_sources.every((entry) =>
      entry.source_origin.kind === PassiveCreditSourceOrigin.Partnership ||
      entry.source_origin.kind === PassiveCreditSourceOrigin.SCorporation
    );
  const selfSources = input.credit_sources.filter((entry) =>
    entry.source_origin.kind === PassiveCreditSourceOrigin.Self
  );
  const passThroughSources = input.credit_sources.filter((entry) =>
    entry.source_origin.kind === PassiveCreditSourceOrigin.Partnership ||
    entry.source_origin.kind === PassiveCreditSourceOrigin.SCorporation
  );
  const mixedCredit = selfSources.length > 0 &&
    passThroughSources.length > 0 &&
    selfSources.length + passThroughSources.length ===
      input.credit_sources.length;
  if (
    !input.line6_ordinary_worksheet || input.credit_sources.length === 0 ||
    !source ||
    (!selfCredit && !passThroughCredit && !mixedCredit) ||
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
      "Form 8582-CR printable ordinary route needs current-year self-earned Form 8874 and/or credit-only partnership/S corporation K-1 code AD sources with reconciled Form 3800 Part V detail, plus a complete sourced passive rental income inventory",
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
  if (selfCredit || mixedCredit) {
    if (
      selfCredit &&
      (nonemptySource(pending.k1_partnership) ||
        nonemptySource(pending.k1_s_corp))
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
    const sourceKeys = selfSources.map((entry) =>
      JSON.stringify([
        entry.activity_reference,
        entry.source_document_reference,
      ])
    );
    if (
      credits.length !== selfSources.length ||
      ordinaryCredits.length > (mixedCredit ? 0 : 1) ||
      (ordinaryCredits.length === 1 && selfSources.length !== 1) ||
      new Set(sourceKeys).size !== sourceKeys.length ||
      credits.some((row) =>
        selfSources.filter((entry) =>
          row.investment.passive_activity_reference ===
            entry.activity_reference &&
          row.investment.passive_source_document_reference ===
            entry.source_document_reference &&
          row.creditAmount === entry.current_year_credit
        ).length !== 1
      ) ||
      selfSources.some((entry) =>
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
  }
  if (passThroughCredit || mixedCredit) {
    if (passThroughCredit && nonemptySource(pending.f8874)) {
      throw new Error(
        "Form 8582-CR K-1 route has another Form 8874 source",
      );
    }
    const activities = input.credit_sources.map((entry) =>
      entry.activity_reference
    );
    const references = input.credit_sources.map((entry) =>
      entry.source_document_reference
    );
    if (
      new Set(activities).size !== activities.length ||
      new Set(references).size !== references.length
    ) {
      throw new Error(
        "Form 8582-CR K-1 credits need distinct activity and source references",
      );
    }
    reconcilePartnershipK1Credits(
      input.credit_sources.filter((entry) =>
        entry.source_origin.kind === PassiveCreditSourceOrigin.Partnership
      ),
      pending,
    );
    reconcileSCorpK1Credits(
      input.credit_sources.filter((entry) =>
        entry.source_origin.kind === PassiveCreditSourceOrigin.SCorporation
      ),
      pending,
    );
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
  const filedForm3800Allowed = (
    pending.f3800 as Record<string, unknown> | undefined
  )?.allowed_credit;
  if (
    (nonpassiveForm8874Credit > 0 &&
      (f3800.f8874_credit?.credit_amount !== nonpassiveForm8874Credit ||
        f3800.f8874_credit?.subject_to_passive_activity_limit !== false)) ||
    (nonpassiveForm8874Credit === 0 && f3800.f8874_credit !== undefined) ||
    filedForm3800Allowed !== lines.line37 + nonpassiveForm8874Credit ||
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
