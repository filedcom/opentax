import { element, elements } from "../../../mef/xml.ts";
import type { Form3800PassiveTaxUseVintage } from "../../../nodes/inputs/f3800/calculation.ts";
import { groupForm3800PassiveCreditVintages } from "../../../nodes/inputs/f3800/calculation.ts";
import {
  PassiveCreditSourceOrigin,
  passiveCreditSourceOriginSchema,
} from "../../../nodes/intermediate/forms/form8582cr/source.ts";
import {
  form3800CarryoverDetailXmlTags,
  type Form3800CreditLine,
  form3800CurrentDetailXmlTags,
  form3800PassiveXmlTags,
  planForm3800PassiveXmlRows,
} from "./f3800_passive_tags.ts";
import {
  buildForm3800CurrentCreditRowXml,
  combineForm3800CurrentCreditAmounts,
  type Form3800CurrentCreditAmount,
  type Form3800CurrentCreditRowMetadata,
  type Form3800CurrentEntityCredit,
  type Form3800CurrentXmlRow,
} from "./f3800_current_rows.ts";

export type Form3800PassiveXmlRow = {
  readonly line: Form3800CreditLine;
  readonly xml: string;
};

/** Source-backed Part V/VI detail retained before native XML serialization. */
export type Form3800PassiveDetailRow = {
  readonly line: Form3800CreditLine;
  readonly source: Form3800PassiveTaxUseVintage;
  readonly sourceDocument?: Form3800PassiveSourceDocument;
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

export type Form3800CarryoverRow = {
  readonly line: Form3800CreditLine;
  readonly sourceKeys: readonly string[];
  readonly originatingTaxYear: number;
  readonly entity?: Form3800CurrentCreditRowMetadata["entity"];
  readonly amount: Form3800CarryoverAmount;
};

export type Form3800PassiveRowXml = {
  readonly partIII: readonly Form3800CurrentXmlRow[];
  readonly currentAmounts: readonly Form3800CurrentCreditAmount[];
  readonly partIV: readonly Form3800CarryoverRow[];
  readonly partV: readonly Form3800PassiveDetailRow[];
  readonly partVI: readonly Form3800PassiveDetailRow[];
};

export type Form3800PassiveSourceDocument = {
  readonly documentId: string;
  readonly documentName: string;
};

export function form3800PassiveCurrentDetailXml(
  row: Form3800PassiveDetailRow,
): string {
  const { source, sourceDocument } = row;
  const tag = form3800CurrentDetailXmlTags[row.line];
  if (
    !tag || row.line !== source.form3800CreditLine ||
    source.originatingTaxYear !== 2025
  ) {
    throw new Error("Form 3800 Part V detail source does not match its line");
  }
  return elements(tag, [
    sourceEin([source]),
    element("OthThnCrTrnsfrElectCrBfrLmtAmt", source.beforePassiveLimit),
    element("CrTrnsfrElectCrAllwAftrLmtAmt", source.afterPassiveLimit),
    element("TotalGeneralBusCreditsAmt", source.afterPassiveLimit),
    element("TotalGBCLessGrossEPEAppTxAmt", source.appliedAgainstTax),
    element("CarryforwardGeneralBusCrAmt", source.unusedAfterTaxLimit),
  ], {
    ...(sourceDocument
      ? {
        referenceDocumentId: sourceDocument.documentId,
        referenceDocumentName: sourceDocument.documentName,
      }
      : {}),
    lineNumberTxt: `Part III Line ${row.line}`,
  });
}

export function form3800PassiveCarryoverDetailXml(
  row: Form3800PassiveDetailRow,
): string {
  const { source } = row;
  const tag = form3800CarryoverDetailXmlTags[row.line];
  if (
    !tag || row.line !== source.form3800CreditLine ||
    source.originatingTaxYear >= 2025
  ) {
    throw new Error("Form 3800 Part VI detail source does not match its line");
  }
  return elements(tag, [
    element("Yr", source.originatingTaxYear),
    sourceEin([source]),
    element("CrSubjToPassiveActyLmtAmt", source.beforePassiveLimit),
    element("PassiveActivityCrAfterLmtAmt", source.afterPassiveLimit),
    element("TotalGeneralBusCreditsAppTxAmt", source.appliedAgainstTax),
    element("CarryforwardGeneralBusCrAmt", source.unusedAfterTaxLimit),
  ], { lineNumberTxt: `Part IV Line ${row.line}` });
}

function selfSourceDocument(
  source: Form3800PassiveTaxUseVintage,
  documents: Readonly<Record<string, Form3800PassiveSourceDocument>>,
): Form3800PassiveSourceDocument | undefined {
  return source.sourceOrigin.kind === PassiveCreditSourceOrigin.Self &&
      Object.hasOwn(documents, source.sourceForm)
    ? documents[source.sourceForm]
    : undefined;
}

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

/** Serialize the typed Part IV aggregate at the native document boundary. */
export function form3800CarryoverRowXml(row: Form3800CarryoverRow): string {
  const tag = form3800PassiveXmlTags[row.line]?.carryover;
  const amount = row.amount;
  if (
    !tag || amount.line !== row.line ||
    row.sourceKeys.length < 1 || row.sourceKeys.length > 999 ||
    row.sourceKeys.some((key) => !key) ||
    new Set(row.sourceKeys).size !== row.sourceKeys.length ||
    !Number.isInteger(row.originatingTaxYear) ||
    row.originatingTaxYear < 1900 || row.originatingTaxYear >= 2025 ||
    (row.entity && "ein" in row.entity &&
      !/^\d{9}$/.test(row.entity.ein))
  ) {
    throw new Error("Form 3800 Part IV typed source identity is invalid");
  }
  return elements(tag, [
    row.sourceKeys.length > 1
      ? element("CyovGeneralBusinessCrItemCnt", row.sourceKeys.length)
      : "",
    element("Yr", row.originatingTaxYear),
    row.entity
      ? "ein" in row.entity
        ? element("PassThroughEntityEIN", row.entity.ein)
        : element("MissingEINReasonCd", row.entity.missingEinReason)
      : "",
    element("CrSubjToPassiveActyLmtAmt", amount.passiveBeforeLimit),
    element("PassiveActivityCrAfterLmtAmt", amount.passiveAfterLimit),
    amount.nonpassiveCredit > 0
      ? element("GeneralBusCrFromNnPssvActyAmt", amount.nonpassiveCredit)
      : "",
    element("TotalGeneralBusCreditsAppTxAmt", amount.appliedCredit),
    amount.recapturedOrAdjusted !== 0
      ? element("GeneralBusCrCyovRcptrAdjAmt", amount.recapturedOrAdjusted)
      : "",
    element("CarryforwardGeneralBusCrAmt", amount.carryforwardCredit),
  ]);
}

function sourceEntityCredits(
  sources: readonly Form3800PassiveTaxUseVintage[],
): Form3800CurrentEntityCredit[] {
  return sources.flatMap<Form3800CurrentEntityCredit>((source) => {
    const origin = source.sourceOrigin;
    if (origin.kind === PassiveCreditSourceOrigin.Self) return [];
    if (origin.ein) {
      return [{
        entity: { ein: origin.ein },
        entityReference: origin.entity_reference,
        credit: source.beforePassiveLimit,
      }];
    }
    if (!origin.missing_ein_reason) {
      throw new Error("Form 3800 passive entity needs EIN information");
    }
    return [{
      entity: { missingEinReason: origin.missing_ein_reason },
      entityReference: origin.entity_reference,
      credit: source.beforePassiveLimit,
    }];
  });
}

/** Serialize passive Part III-VI source rows after Form 3800 tax-use allocation. */
export function buildForm3800PassiveRowXml(
  vintages: readonly Form3800PassiveTaxUseVintage[],
  selfSourceDocuments: Readonly<Record<string, Form3800PassiveSourceDocument>>,
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
  const currentAmounts = combineForm3800CurrentCreditAmounts(
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
  );
  const amountByLine = new Map(currentAmounts.map((row) => [row.line, row]));
  const partIII = current.map((row) => {
    const amount = amountByLine.get(row.form3800CreditLine);
    if (!amount) {
      throw new Error("Form 3800 current-year passive row was not combined");
    }
    const linkedDocuments = row.sources.flatMap((source) => {
      const document = selfSourceDocument(source, selfSourceDocuments);
      return document ? [document] : [];
    });
    const uniqueDocuments = new Map(
      linkedDocuments.map((document) => [document.documentId, document]),
    );
    if (uniqueDocuments.size > 1) {
      throw new Error(
        `Form 3800 passive line ${row.form3800CreditLine} has multiple self-earned source documents`,
      );
    }
    const linkedDocument = [...uniqueDocuments.values()][0];
    const metadata = {
      sourceCount: row.sources.length,
      entity: sourceEntity(row.sources),
      ...(linkedDocument
        ? {
          referenceDocumentId: linkedDocument.documentId,
          referenceDocumentName: linkedDocument.documentName,
        }
        : {}),
    };
    return {
      line: row.form3800CreditLine,
      metadata,
      entityCredits: sourceEntityCredits(row.sources),
      xml: buildForm3800CurrentCreditRowXml(amount, metadata),
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
      sourceKeys: row.sources.map((source) => source.sourceKey),
      originatingTaxYear: row.latestOriginatingTaxYear,
      entity: sourceEntity(row.sources),
      amount: {
        line: row.form3800CreditLine,
        passiveBeforeLimit: row.beforePassiveLimit,
        passiveAfterLimit: row.afterPassiveLimit,
        nonpassiveCredit: 0,
        appliedCredit: applied,
        recapturedOrAdjusted: 0,
        carryforwardCredit: unused,
      },
    };
  });
  const currentDetail = current.flatMap((row) => {
    const tag = row.currentDetailTag;
    if (!tag) {
      if (!row.requiresSourceBreakdown) return [];
      throw new Error(
        `Form 3800 Part III line ${row.form3800CreditLine} has no Part V detail row`,
      );
    }
    return row.sources.map((source) => {
      const detail: Form3800PassiveDetailRow = {
        line: row.form3800CreditLine,
        source,
        sourceDocument: selfSourceDocument(source, selfSourceDocuments),
      };
      return detail;
    });
  });
  const partVI = carryover.flatMap((row) => {
    const tag = row.carryoverDetailTag;
    if (!row.requiresSourceBreakdown || !tag) return [];
    return row.sources.map((source) => {
      const detail: Form3800PassiveDetailRow = {
        line: row.form3800CreditLine,
        source,
      };
      return detail;
    });
  });
  return {
    partIII,
    currentAmounts,
    partIV,
    partV: currentDetail,
    partVI,
  };
}
