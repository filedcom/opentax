import type {
  Form3800NonpassiveLines,
  Form3800PassiveTaxUseVintage,
} from "../../../nodes/inputs/f3800/calculation.ts";
import { PassiveCreditSourceOrigin } from "../../../nodes/intermediate/forms/form8582cr/source.ts";
import {
  buildForm3800CurrentCreditRowXml,
  combineForm3800CurrentCreditAmounts,
  type Form3800CurrentCreditAmount,
  type Form3800CurrentEntityCredit,
  type Form3800CurrentXmlRow,
  largestForm3800CurrentEntity,
} from "./f3800_current_rows.ts";
import type { Form3800DocumentParts } from "./f3800_document.ts";
import type { Form3800NonpassiveCarryoverDetailRow } from "./f3800_carryover_details.ts";
import type {
  Form3800CarryoverRow,
  Form3800PassiveDetailRow,
  Form3800PassiveRowXml,
} from "./f3800_passive_rows.ts";
import type { Form3800CreditLine } from "./f3800_passive_tags.ts";

function currentRowMap(
  rows: readonly Form3800CurrentXmlRow[],
  amounts: readonly Form3800CurrentCreditAmount[],
): ReadonlyMap<Form3800CreditLine, Form3800CurrentXmlRow> {
  const byLine = new Map(rows.map((row) => [row.line, row] as const));
  const amountLines = new Set(amounts.map((row) => row.line));
  if (
    byLine.size !== rows.length || amountLines.size !== amounts.length ||
    byLine.size !== amountLines.size ||
    rows.some((row) => !amountLines.has(row.line))
  ) {
    throw new Error("Form 3800 source rows and amounts do not reconcile");
  }
  return byLine;
}

function cents(amount: number): number {
  const value = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) || !Number.isSafeInteger(value) ||
    Math.abs(amount * 100 - value) > 0.000001
  ) {
    throw new Error("Form 3800 joined carryover needs cent precision");
  }
  return value;
}

function addMoney(left: number, right: number): number {
  const total = cents(left) + cents(right);
  if (!Number.isSafeInteger(total)) {
    throw new Error("Form 3800 joined carryover exceeds cent precision");
  }
  return total / 100;
}

function passiveEntityCredit(
  source: Form3800PassiveTaxUseVintage,
): Form3800CurrentEntityCredit[] {
  const origin = source.sourceOrigin;
  if (origin.kind === PassiveCreditSourceOrigin.Self) return [];
  if (origin.ein) {
    return [{
      entity: { ein: origin.ein },
      entityReference: origin.entity_reference,
      credit: source.beforePassiveLimit,
    }];
  }
  if (origin.missing_ein_reason !== "APPLD FOR") {
    throw new Error("Form 3800 joined passive source needs EIN evidence");
  }
  return [{
    entity: { missingEinReason: origin.missing_ein_reason },
    entityReference: origin.entity_reference,
    credit: source.beforePassiveLimit,
  }];
}

function joinCarryoverRows(
  nonpassive: Form3800DocumentParts | undefined,
  passive: Form3800PassiveRowXml,
): {
  rows: Form3800CarryoverRow[];
  nonpassiveDetails: Form3800NonpassiveCarryoverDetailRow[];
  passiveDetails: Form3800PassiveDetailRow[];
} {
  const ordinaryRows = nonpassive?.carryoverRows ?? [];
  const passiveRows = passive.partIV;
  const ordinaryByLine = new Map(ordinaryRows.map((row) => [row.line, row]));
  const passiveByLine = new Map(passiveRows.map((row) => [row.line, row]));
  if (
    ordinaryByLine.size !== ordinaryRows.length ||
    passiveByLine.size !== passiveRows.length
  ) {
    throw new Error("Form 3800 joined carryover lines are duplicated");
  }
  const mixedLines = new Set(
    ordinaryRows.filter((row) => passiveByLine.has(row.line)).map((row) =>
      row.line
    ),
  );
  const ordinaryDetails = [...(nonpassive?.carryoverDetails ?? [])];
  const passiveDetails = [...passive.partVI];
  const sources = nonpassive?.carryforwardSources ?? [];
  const sourceByKey = new Map(
    sources.map((source) => [source.sourceKey, source]),
  );
  if (sourceByKey.size !== sources.length) {
    throw new Error("Form 3800 joined carryforward source is duplicated");
  }
  for (const line of mixedLines) {
    const ordinary = ordinaryByLine.get(line)!;
    const passiveRow = passiveByLine.get(line)!;
    if (
      ordinary.sourceKeys.some((key) => passiveRow.sourceKeys.includes(key)) ||
      ordinary.amount.passiveBeforeLimit !== 0 ||
      ordinary.amount.passiveAfterLimit !== 0 ||
      passiveRow.amount.nonpassiveCredit !== 0
    ) {
      throw new Error(
        "Form 3800 mixed carryover source sides do not reconcile",
      );
    }
    if (ordinary.sourceKeys.length === 1) {
      const source = sourceByKey.get(ordinary.sourceKeys[0]);
      if (
        !source || source.line !== line ||
        cents(source.availableCredit) !==
          cents(ordinary.amount.nonpassiveCredit)
      ) {
        throw new Error(
          "Form 3800 mixed carryover lacks its nonpassive source",
        );
      }
      ordinaryDetails.push({
        sourceKey: source.sourceKey,
        line,
        originatingTaxYear: source.originatingTaxYear,
        entity: ordinary.entity,
        nonpassiveCredit: source.availableCredit,
        appliedCredit: ordinary.amount.appliedCredit,
        recapturedOrAdjusted: ordinary.amount.recapturedOrAdjusted,
        carryforwardCredit: ordinary.amount.carryforwardCredit,
      });
    }
    for (
      const source of passive.carryoverSources.filter((source) =>
        source.form3800CreditLine === line
      )
    ) {
      if (
        !passiveDetails.some((detail) =>
          detail.source.sourceKey === source.sourceKey
        )
      ) {
        passiveDetails.push({ line, source });
      }
    }
  }
  const rows = [...new Set([...ordinaryByLine.keys(), ...passiveByLine.keys()])]
    .map((line) => {
      const ordinary = ordinaryByLine.get(line);
      const passiveRow = passiveByLine.get(line);
      if (!ordinary) return passiveRow!;
      if (!passiveRow) return ordinary;
      const entityCredits: Form3800CurrentEntityCredit[] = [
        ...ordinaryDetails.filter((detail) =>
          detail.line === line && detail.entity
        )
          .map((detail) => ({
            entity: detail.entity!,
            entityReference: detail.sourceKey,
            credit: detail.nonpassiveCredit,
          })),
        ...passive.carryoverSources.filter((source) =>
          source.form3800CreditLine === line
        ).flatMap(passiveEntityCredit),
      ];
      return {
        line,
        sourceKeys: [...ordinary.sourceKeys, ...passiveRow.sourceKeys],
        originatingTaxYear: Math.max(
          ordinary.originatingTaxYear,
          passiveRow.originatingTaxYear,
        ),
        entity: largestForm3800CurrentEntity(entityCredits),
        amount: {
          line,
          passiveBeforeLimit: passiveRow.amount.passiveBeforeLimit,
          passiveAfterLimit: passiveRow.amount.passiveAfterLimit,
          nonpassiveCredit: ordinary.amount.nonpassiveCredit,
          appliedCredit: addMoney(
            ordinary.amount.appliedCredit,
            passiveRow.amount.appliedCredit,
          ),
          recapturedOrAdjusted: addMoney(
            ordinary.amount.recapturedOrAdjusted,
            passiveRow.amount.recapturedOrAdjusted,
          ),
          carryforwardCredit: addMoney(
            ordinary.amount.carryforwardCredit,
            passiveRow.amount.carryforwardCredit,
          ),
        },
      };
    });
  return { rows, nonpassiveDetails: ordinaryDetails, passiveDetails };
}

/** Combine source-backed Part III rows before final IRS3800 document assembly. */
export function joinForm3800DocumentParts(
  lines: Form3800NonpassiveLines,
  nonpassive: Form3800DocumentParts | undefined,
  passive: Form3800PassiveRowXml,
): Form3800DocumentParts {
  const nonpassiveAmounts = nonpassive?.currentAmounts ?? [];
  const nonpassiveRows = currentRowMap(
    nonpassive?.currentRows ?? [],
    nonpassiveAmounts,
  );
  const passiveRows = currentRowMap(passive.partIII, passive.currentAmounts);
  if (
    nonpassiveAmounts.some((row) =>
      row.passiveBeforeLimit !== 0 || row.passiveAfterLimit !== 0
    ) ||
    passive.currentAmounts.some((row) =>
      row.nonpassiveCredit !== 0 || row.transferOutCredit !== 0
    )
  ) {
    throw new Error("Form 3800 source side contains another side's credits");
  }
  const currentAmounts = combineForm3800CurrentCreditAmounts(
    nonpassiveAmounts.map((row) => ({
      line: row.line,
      grossCredit: row.nonpassiveCredit,
      transferOutCredit: row.transferOutCredit,
      appliedCredit: row.appliedCredit,
    })),
    passive.currentAmounts.map((row) => ({
      line: row.line,
      beforePassiveLimit: row.passiveBeforeLimit,
      afterPassiveLimit: row.passiveAfterLimit,
      appliedCredit: row.appliedCredit,
    })),
  );
  const currentRows = currentAmounts.map((amount) => {
    const ordinary = nonpassiveRows.get(amount.line);
    const passiveRow = passiveRows.get(amount.line);
    if (!ordinary) {
      if (!passiveRow) throw new Error("Form 3800 current row was not joined");
      return passiveRow;
    }
    if (!passiveRow) return ordinary;
    if (
      ordinary.metadata.referenceDocumentId &&
      passiveRow.metadata.referenceDocumentId &&
      (ordinary.metadata.referenceDocumentId !==
          passiveRow.metadata.referenceDocumentId ||
        ordinary.metadata.referenceDocumentName !==
          passiveRow.metadata.referenceDocumentName)
    ) {
      throw new Error(
        "Form 3800 mixed current row has conflicting document references",
      );
    }
    const entityCredits = [
      ...ordinary.entityCredits,
      ...passiveRow.entityCredits,
    ];
    const metadata = {
      sourceCount: ordinary.metadata.sourceCount +
        passiveRow.metadata.sourceCount,
      transferRegistrationNumber:
        ordinary.metadata.transferRegistrationNumber ??
          passiveRow.metadata.transferRegistrationNumber,
      entity: largestForm3800CurrentEntity(entityCredits),
      referenceDocumentId: ordinary.metadata.referenceDocumentId ??
        passiveRow.metadata.referenceDocumentId,
      referenceDocumentName: ordinary.metadata.referenceDocumentName ??
        passiveRow.metadata.referenceDocumentName,
    };
    return {
      line: amount.line,
      metadata,
      entityCredits,
      xml: buildForm3800CurrentCreditRowXml(amount, metadata),
    };
  });
  const carryover = joinCarryoverRows(nonpassive, passive);
  return {
    lines,
    transferStatementIds: nonpassive?.transferStatementIds ?? [],
    carryforwardSources: nonpassive?.carryforwardSources ?? [],
    currentRows,
    currentAmounts,
    carryoverRows: carryover.rows,
    currentDetails: nonpassive?.currentDetails ?? [],
    carryoverDetails: carryover.nonpassiveDetails,
    passiveCurrentDetails: passive.partV,
    passiveCarryoverDetails: carryover.passiveDetails,
  };
}
