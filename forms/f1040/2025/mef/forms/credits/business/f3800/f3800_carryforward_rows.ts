import type {
  Form3800CreditUseAllocation,
  Form3800CreditUseRow,
} from "../../../../../../nodes/inputs/credits/business/f3800/calculation.ts";
import { reconcileForm3800NonpassiveCarryforwards } from "../../../../../../nodes/inputs/credits/business/f3800/index.ts";
import { PassiveCreditSourceOrigin } from "../../../../../../nodes/intermediate/forms/credits/business/form8582cr/source.ts";
import {
  type Form3800CurrentEntityCredit,
  largestForm3800CurrentEntity,
} from "./f3800_current_rows.ts";
import type { Form3800CarryforwardDocumentSource } from "./f3800_carryforward_link.ts";
import type { Form3800NonpassiveCarryoverDetailRow } from "./f3800_carryover_details.ts";
import type { Form3800CarryoverRow } from "./f3800_passive_rows.ts";

type Entries = Parameters<typeof reconcileForm3800NonpassiveCarryforwards>[0];
type Vintage = ReturnType<
  typeof reconcileForm3800NonpassiveCarryforwards
>[number];

function cents(amount: number): number {
  const value = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) || !Number.isSafeInteger(value) ||
    Math.abs(amount * 100 - value) > 0.000001
  ) {
    throw new Error("Form 3800 carryforward assembly needs cent precision");
  }
  return value;
}

function sumMoney(amounts: readonly number[]): number {
  const total = amounts.reduce((sum, amount) => sum + cents(amount), 0);
  if (!Number.isSafeInteger(total)) {
    throw new Error("Form 3800 carryforward assembly exceeds cent precision");
  }
  return total / 100;
}

function taxUseKey(sourceKey: string): string {
  return `carryforward:${sourceKey}`;
}

/** Keep each ledger vintage identifiable through the shared Part II FIFO pass. */
export function form3800CarryforwardCreditUseRows(
  entries: Entries,
): Form3800CreditUseRow[] {
  return reconcileForm3800NonpassiveCarryforwards(entries).map((vintage) => ({
    sourceKey: taxUseKey(vintage.sourceKey),
    form3800CreditLine: vintage.form3800CreditLine,
    originatingTaxYear: vintage.originatingTaxYear,
    availableAfterPassiveLimit: vintage.availableAfterAdjustment,
  }));
}

function entityCredit(vintage: Vintage): Form3800CurrentEntityCredit[] {
  const origin = vintage.sourceOrigin;
  if (origin.kind === PassiveCreditSourceOrigin.Self) return [];
  if (origin.ein) {
    return [{
      entity: { ein: origin.ein },
      entityReference: origin.entity_reference,
      credit: vintage.availableAfterAdjustment,
    }];
  }
  if (origin.missing_ein_reason !== "APPLD FOR") {
    throw new Error("Form 3800 carryforward pass-through needs EIN evidence");
  }
  return [{
    entity: { missingEinReason: origin.missing_ein_reason },
    entityReference: origin.entity_reference,
    credit: vintage.availableAfterAdjustment,
  }];
}

/** Assemble source-linked Part IV/VI and computation references after tax use. */
export function buildForm3800CarryforwardRows(
  entries: Entries,
  documentIds: readonly string[],
  allocations: readonly Form3800CreditUseAllocation[],
): {
  readonly sources: readonly Form3800CarryforwardDocumentSource[];
  readonly rows: readonly Form3800CarryoverRow[];
  readonly details: readonly Form3800NonpassiveCarryoverDetailRow[];
} {
  const vintages = reconcileForm3800NonpassiveCarryforwards(entries);
  if (
    documentIds.length !== vintages.length ||
    documentIds.some((id) => !id.trim() || /\s/.test(id)) ||
    new Set(documentIds).size !== documentIds.length
  ) {
    throw new Error(
      "Form 3800 carryforward assembly needs one reserved computation ID per vintage",
    );
  }
  const allocationByKey = new Map(
    allocations.map((allocation) => [allocation.sourceKey, allocation]),
  );
  if (
    allocationByKey.size !== allocations.length ||
    allocations.filter((allocation) =>
        allocation.sourceKey.startsWith("carryforward:")
      ).length !== vintages.length
  ) {
    throw new Error(
      "Form 3800 carryforward tax-use sources are duplicated or unbound",
    );
  }
  const assigned = vintages.map((vintage, index) => {
    const key = taxUseKey(vintage.sourceKey);
    const use = allocationByKey.get(key);
    if (
      !use || use.form3800CreditLine !== vintage.form3800CreditLine ||
      use.originatingTaxYear !== vintage.originatingTaxYear ||
      cents(use.availableAfterPassiveLimit) !==
        cents(vintage.availableAfterAdjustment) ||
      cents(use.appliedAgainstTax) < 0 ||
      cents(use.unusedAfterTaxLimit) < 0 ||
      cents(use.appliedAgainstTax) + cents(use.unusedAfterTaxLimit) !==
        cents(vintage.availableAfterAdjustment)
    ) {
      throw new Error(
        "Form 3800 carryforward tax use does not match its ledger vintage",
      );
    }
    return { vintage, use, key, documentId: documentIds[index] };
  });
  const sources: Form3800CarryforwardDocumentSource[] = assigned.map(
    ({ vintage, key, documentId }) => ({
      sourceKey: key,
      line: vintage.form3800CreditLine,
      originatingTaxYear: vintage.originatingTaxYear,
      documentId,
      availableCredit: vintage.availableAfterAdjustment,
      revisedFromOriginal: vintage.revisedFromOriginal,
    }),
  );
  const ordered = [...assigned].sort((a, b) =>
    a.vintage.originatingTaxYear - b.vintage.originatingTaxYear ||
    a.key.localeCompare(b.key)
  );
  const lines = [
    ...new Set(ordered.map(({ vintage }) => vintage.form3800CreditLine)),
  ];
  const rows: Form3800CarryoverRow[] = lines.map((line) => {
    const group = ordered.filter(({ vintage }) =>
      vintage.form3800CreditLine === line
    );
    const credit = sumMoney(
      group.map(({ vintage }) => vintage.availableAfterAdjustment),
    );
    const applied = sumMoney(group.map(({ use }) => use.appliedAgainstTax));
    const unused = sumMoney(group.map(({ use }) => use.unusedAfterTaxLimit));
    return {
      line,
      sourceKeys: group.map(({ key }) => key),
      originatingTaxYear: Math.max(
        ...group.map(({ vintage }) => vintage.originatingTaxYear),
      ),
      entity: largestForm3800CurrentEntity(
        group.flatMap(({ vintage }) => entityCredit(vintage)),
      ),
      amount: {
        line,
        passiveBeforeLimit: 0,
        passiveAfterLimit: 0,
        nonpassiveCredit: credit,
        appliedCredit: applied,
        recapturedOrAdjusted: 0,
        carryforwardCredit: unused,
      },
    };
  });
  const details: Form3800NonpassiveCarryoverDetailRow[] = ordered.flatMap(
    ({ vintage, use, key }) =>
      ordered.filter((candidate) =>
          candidate.vintage.form3800CreditLine === vintage.form3800CreditLine
        ).length > 1
        ? [{
          sourceKey: key,
          line: vintage.form3800CreditLine,
          originatingTaxYear: vintage.originatingTaxYear,
          entity: entityCredit(vintage)[0]?.entity,
          nonpassiveCredit: vintage.availableAfterAdjustment,
          appliedCredit: use.appliedAgainstTax,
          recapturedOrAdjusted: 0,
          carryforwardCredit: use.unusedAfterTaxLimit,
        }]
        : [],
  );
  return { sources, rows, details };
}
