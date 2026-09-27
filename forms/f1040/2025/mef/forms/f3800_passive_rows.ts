import { element, elements } from "../../../mef/xml.ts";
import type { Form3800PassiveTaxUseVintage } from "../../../nodes/inputs/f3800/calculation.ts";
import { groupForm3800PassiveCreditVintages } from "../../../nodes/inputs/f3800/calculation.ts";
import {
  PassiveCreditSourceOrigin,
  passiveCreditSourceOriginSchema,
} from "../../../nodes/intermediate/forms/form8582cr/source.ts";
import {
  type Form3800CreditLine,
  planForm3800PassiveXmlRows,
} from "./f3800_passive_tags.ts";
import {
  buildForm3800CurrentCreditRowXml,
  combineForm3800CurrentCreditAmounts,
  type Form3800CurrentCreditRowMetadata,
} from "./f3800_current_rows.ts";

export type Form3800PassiveXmlRow = {
  readonly line: Form3800CreditLine;
  readonly xml: string;
};

export type Form3800CarryoverAmount = {
  readonly line: Form3800CreditLine;
  readonly passiveBeforeLimit: number;
  readonly passiveAfterLimit: number;
  readonly nonpassiveCredit: number;
  readonly appliedCredit: number;
  readonly recapturedOrAdjusted: number;
  readonly carryforwardCredit: number;
};

export type Form3800CarryoverXmlRow = Form3800PassiveXmlRow & {
  readonly amount: Form3800CarryoverAmount;
};

export type Form3800PassiveRowXml = {
  readonly partIII: readonly Form3800PassiveXmlRow[];
  readonly partIV: readonly Form3800CarryoverXmlRow[];
  readonly partV: readonly Form3800PassiveXmlRow[];
  readonly partVI: readonly Form3800PassiveXmlRow[];
};

function sourceEntity(
  sources: readonly Form3800PassiveTaxUseVintage[],
): Form3800CurrentCreditRowMetadata["entity"] {
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
  if (!origin) return undefined;
  if (origin.ein) return { ein: origin.ein };
  if (!origin.missing_ein_reason) {
    throw new Error("Form 3800 passive entity needs EIN information");
  }
  return { missingEinReason: origin.missing_ein_reason };
}

function sourceEin(
  sources: readonly Form3800PassiveTaxUseVintage[],
): string {
  const entity = sourceEntity(sources);
  if (!entity) return "";
  return "ein" in entity
    ? element("PassThroughEntityEIN", entity.ein)
    : element("MissingEINReasonCd", entity.missingEinReason);
}

/** Serialize passive Part III-VI source rows after Form 3800 tax-use allocation. */
export function buildForm3800PassiveRowXml(
  vintages: readonly Form3800PassiveTaxUseVintage[],
): Form3800PassiveRowXml {
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
  );
  const current = planned.filter((row) => row.part === "current");
  const carryover = planned.filter((row) => row.part === "carryover");
  const currentAmounts = new Map(
    combineForm3800CurrentCreditAmounts(
      [],
      current.map((row) => ({
        line: row.form3800CreditLine,
        beforePassiveLimit: row.beforePassiveLimit,
        afterPassiveLimit: row.afterPassiveLimit,
        appliedCredit: row.sources.reduce(
          (sum, source) => sum + source.appliedAgainstTax,
          0,
        ),
      })),
    ).map((row) => [row.line, row] as const),
  );
  const partIII = current.map((row) => {
    const amount = currentAmounts.get(row.form3800CreditLine);
    if (!amount) {
      throw new Error("Form 3800 current-year passive row was not combined");
    }
    return {
      line: row.form3800CreditLine,
      xml: buildForm3800CurrentCreditRowXml(amount, {
        sourceCount: row.sources.length,
        entity: sourceEntity(row.sources),
      }),
    };
  });
  const partIV = carryover.map((row) => {
    const applied = row.sources.reduce(
      (sum, source) => sum + source.appliedAgainstTax,
      0,
    );
    const unused = row.sources.reduce(
      (sum, source) => sum + source.unusedAfterTaxLimit,
      0,
    );
    return {
      line: row.form3800CreditLine,
      amount: {
        line: row.form3800CreditLine,
        passiveBeforeLimit: row.beforePassiveLimit,
        passiveAfterLimit: row.afterPassiveLimit,
        nonpassiveCredit: 0,
        appliedCredit: applied,
        recapturedOrAdjusted: 0,
        carryforwardCredit: unused,
      },
      xml: elements(row.tag, [
        row.requiresSourceBreakdown
          ? element("CyovGeneralBusinessCrItemCnt", row.sources.length)
          : "",
        element("Yr", row.latestOriginatingTaxYear),
        sourceEin(row.sources),
        element("CrSubjToPassiveActyLmtAmt", row.beforePassiveLimit),
        element("PassiveActivityCrAfterLmtAmt", row.afterPassiveLimit),
        element("TotalGeneralBusCreditsAppTxAmt", applied),
        element("CarryforwardGeneralBusCrAmt", unused),
      ]),
    };
  });
  const currentDetail = current.flatMap((row) => {
    if (!row.requiresSourceBreakdown) return [];
    const tag = row.currentDetailTag;
    if (!tag) {
      throw new Error(
        `Form 3800 Part III line ${row.form3800CreditLine} has no Part V detail row`,
      );
    }
    return row.sources.map((source) => ({
      line: row.form3800CreditLine,
      xml: elements(tag, [
        sourceEin([source]),
        element("OthThnCrTrnsfrElectCrBfrLmtAmt", source.beforePassiveLimit),
        element("CrTrnsfrElectCrAllwAftrLmtAmt", source.afterPassiveLimit),
        element("TotalGeneralBusCreditsAmt", source.afterPassiveLimit),
        element(
          "TotalGBCLessGrossEPEAppTxAmt",
          source.appliedAgainstTax,
        ),
        element("CarryforwardGeneralBusCrAmt", source.unusedAfterTaxLimit),
      ], { lineNumberTxt: `Part III Line ${row.form3800CreditLine}` }),
    }));
  });
  const partVI = carryover.flatMap((row) => {
    const tag = row.carryoverDetailTag;
    if (!row.requiresSourceBreakdown || !tag) return [];
    return row.sources.map((source) => ({
      line: row.form3800CreditLine,
      xml: elements(tag, [
        element("Yr", source.originatingTaxYear),
        sourceEin([source]),
        element("CrSubjToPassiveActyLmtAmt", source.beforePassiveLimit),
        element("PassiveActivityCrAfterLmtAmt", source.afterPassiveLimit),
        element("TotalGeneralBusCreditsAppTxAmt", source.appliedAgainstTax),
        element("CarryforwardGeneralBusCrAmt", source.unusedAfterTaxLimit),
      ], { lineNumberTxt: `Part IV Line ${row.form3800CreditLine}` }),
    }));
  });
  return { partIII, partIV, partV: currentDetail, partVI };
}
