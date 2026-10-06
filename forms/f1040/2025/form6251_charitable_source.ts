import {
  reconcileProducingMiningCharitableAmt,
  scheduleA,
} from "../nodes/inputs/schedule_a/index.ts";

/** Retained current AMT charitable account is derived from the owned Form8283
 * mine inventory, never from a supplied line3/allowance/carry scalar. */
export function assertForm6251CharitableSource(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
) {
  const combinedLine3 = Number(fields.line3_form8864_income_exclusion ?? 0) +
    Number(fields.line3_houseboat_interest_addback ?? 0) +
    Number(fields.line3_charitable_contribution_adjustment ?? 0);
  if (
    fields.line3_related_adjustments_total !== undefined &&
    fields.line3_related_adjustments_total !== combinedLine3
  ) {
    throw new Error(
      "Form6251 supplied filed line3 total differs from actual source adjustments",
    );
  }
  const source = pending?.schedule_a as Record<string, unknown> | undefined;
  const rows = source?.noncash_contribution_items as
    | Record<string, unknown>[]
    | undefined;
  const giftInventory = pending?.f8283 as {
    section_a_items?: Record<string, any>[];
    section_b_items?: Record<string, any>[];
  } | undefined;
  const giftMine = [
    ...(giftInventory?.section_a_items ?? []),
    ...(giftInventory?.section_b_items ?? []),
  ].some((gift) =>
    (gift.special_fmv_reduction?.source ??
      gift.natural_resource_ordinary_income_reduction)?.kind ===
      "producing_mining_617"
  );
  const hasOwnedSource = rows?.some((row) =>
    row.producing_mining_charitable_amt_source
  );
  if (
    !hasOwnedSource && !giftMine &&
    fields.line3_charitable_contribution_adjustment === undefined &&
    source?.charitable_amt_reconciliation === undefined
  ) return;
  if (!source || !pending?.f8283 || !hasOwnedSource) {
    throw new Error(
      "Form6251 charitable adjustment requires owned current Form8283/AMT source",
    );
  }
  const regular = scheduleA.inputSchema.parse({
    ...source,
    line_11_cash_contributions: undefined,
    line_12_noncash_contributions: undefined,
    line_13_contribution_carryover: undefined,
  });
  if (
    regular.agi !==
      (pending.f1040 as Record<string, unknown> | undefined)?.line11_agi
  ) throw new Error("Form6251 charitable source AGI differs from final return");
  const gifts = pending.f8283 as {
    section_a_items?: Record<string, any>[];
    section_b_items?: Record<string, any>[];
  };
  const actual = [
    ...(gifts.section_a_items ?? []),
    ...(gifts.section_b_items ?? []),
  ];
  for (const row of regular.noncash_contribution_items ?? []) {
    const mine = row.producing_mining_charitable_amt_source;
    if (!mine) continue;
    const returnPerson = pending.f1040 as Record<string, unknown>;
    const actualOwner = String(
      mine.proprietor_recipient === "S"
        ? returnPerson.spouse_ssn ?? ""
        : returnPerson.taxpayer_ssn ?? "",
    ).replaceAll("-", "");
    if (mine.donor_ssn !== actualOwner) {
      throw new Error(
        "Form6251 charitable source donor differs from actual return owner",
      );
    }
    const index = actual.findIndex((gift) =>
      JSON.stringify(
        gift.special_fmv_reduction?.source ??
          gift.natural_resource_ordinary_income_reduction,
      ) === JSON.stringify(mine)
    );
    if (index < 0 || row.contribution_id !== `f8283:${index + 1}`) {
      throw new Error(
        "Form6251 AMT charitable source detached from owned gift inventory",
      );
    }
  }
  const calc = reconcileProducingMiningCharitableAmt(regular, 2025)!;
  if (
    source.line_11_cash_contributions !== calc.regular_current_cash_allowed ||
    source.line_12_noncash_contributions !==
      calc.regular_current_noncash_allowed ||
    JSON.stringify(source.charitable_amt_reconciliation) !==
      JSON.stringify(calc) ||
    Number(fields.line3_charitable_contribution_adjustment ?? 0) !==
      calc.line3_charitable_contribution_adjustment
  ) {
    throw new Error(
      "Form6251 charitable adjustment/current allowance/carry account differs from owned source",
    );
  }
}
