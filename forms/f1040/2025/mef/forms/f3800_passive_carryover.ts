import { element, elements } from "../../../mef/xml.ts";
import type { Form3800PassiveTaxUseVintage } from "../../../nodes/inputs/f3800/calculation.ts";
import { groupForm3800PassiveCreditVintages } from "../../../nodes/inputs/f3800/calculation.ts";
import {
  PassiveCreditSourceOrigin,
  passiveCreditSourceOriginSchema,
} from "../../../nodes/intermediate/forms/form8582cr/source.ts";
import { planForm3800PassiveXmlRows } from "./f3800_passive_tags.ts";

export type Form3800PassiveCarryoverXml = {
  readonly partIV: readonly string[];
  readonly partVI: readonly string[];
};

function sourceEin(
  sources: readonly Form3800PassiveTaxUseVintage[],
): string {
  const allocations = sources.flatMap((source) =>
    source.sourceOrigin.kind === PassiveCreditSourceOrigin.Self
      ? []
      : [{ origin: source.sourceOrigin, amount: source.beforePassiveLimit }]
  );
  const entities = allocations.reduce<
    { origin: (typeof allocations)[number]["origin"]; amount: number }[]
  >((groups, allocation) => {
    const prior = groups.find((group) =>
      group.origin.kind === allocation.origin.kind &&
      (group.origin.entity_reference === allocation.origin.entity_reference ||
        (group.origin.ein !== undefined &&
          group.origin.ein === allocation.origin.ein))
    );
    if (
      prior &&
      (prior.origin.entity_reference !== allocation.origin.entity_reference ||
        prior.origin.ein !== allocation.origin.ein ||
        prior.origin.missing_ein_reason !==
          allocation.origin.missing_ein_reason)
    ) {
      throw new Error("Form 3800 passive entity identity does not reconcile");
    }
    return prior
      ? groups.map((group) =>
        group === prior
          ? { ...group, amount: group.amount + allocation.amount }
          : group
      )
      : [...groups, allocation];
  }, []);
  const origin = [...entities].sort((a, b) => b.amount - a.amount)[0]?.origin;
  if (!origin) return "";
  return origin.ein
    ? element("PassThroughEntityEIN", origin.ein)
    : element("MissingEINReasonCd", origin.missing_ein_reason);
}

/** Serialize passive Part IV rows and their required Part VI year/source detail. */
export function buildForm3800PassiveCarryoverXml(
  vintages: readonly Form3800PassiveTaxUseVintage[],
): Form3800PassiveCarryoverXml {
  if (
    new Set(vintages.map((source) => source.sourceKey)).size !== vintages.length
  ) {
    throw new Error("Form 3800 passive XML source keys must be unique");
  }
  for (const source of vintages) {
    passiveCreditSourceOriginSchema.parse(source.sourceOrigin);
    if (
      source.availableAfterPassiveLimit !== source.afterPassiveLimit ||
      !Number.isSafeInteger(source.appliedAgainstTax) ||
      !Number.isSafeInteger(source.unusedAfterTaxLimit) ||
      source.appliedAgainstTax < 0 || source.unusedAfterTaxLimit < 0 ||
      source.appliedAgainstTax + source.unusedAfterTaxLimit !==
        source.afterPassiveLimit
    ) {
      throw new Error("Form 3800 passive XML tax-use amounts do not reconcile");
    }
  }
  const planned = planForm3800PassiveXmlRows(
    groupForm3800PassiveCreditVintages(vintages),
  ).filter((row) => row.part === "carryover");
  const partIV = planned.map((row) => {
    const applied = row.sources.reduce(
      (sum, source) => sum + source.appliedAgainstTax,
      0,
    );
    const unused = row.sources.reduce(
      (sum, source) => sum + source.unusedAfterTaxLimit,
      0,
    );
    return elements(row.tag, [
      row.requiresSourceBreakdown
        ? element("CyovGeneralBusinessCrItemCnt", row.sources.length)
        : "",
      element("Yr", row.latestOriginatingTaxYear),
      sourceEin(row.sources),
      element("CrSubjToPassiveActyLmtAmt", row.beforePassiveLimit),
      element("PassiveActivityCrAfterLmtAmt", row.afterPassiveLimit),
      element("TotalGeneralBusCreditsAppTxAmt", applied),
      element("CarryforwardGeneralBusCrAmt", unused),
    ]);
  });
  const partVI = planned.flatMap((row) => {
    const tag = row.carryoverDetailTag;
    if (!row.requiresSourceBreakdown || !tag) return [];
    return row.sources.map((source) =>
      elements(tag, [
        element("Yr", source.originatingTaxYear),
        sourceEin([source]),
        element("CrSubjToPassiveActyLmtAmt", source.beforePassiveLimit),
        element("PassiveActivityCrAfterLmtAmt", source.afterPassiveLimit),
        element("TotalGeneralBusCreditsAppTxAmt", source.appliedAgainstTax),
        element("CarryforwardGeneralBusCrAmt", source.unusedAfterTaxLimit),
      ], { lineNumberTxt: `Part IV Line ${row.form3800CreditLine}` })
    );
  });
  return { partIV, partVI };
}
