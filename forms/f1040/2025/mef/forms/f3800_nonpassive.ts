import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm3800Nonpassive,
  classifyForm8835Credits,
  type Form3800NonpassiveInput,
  type Form3800PassiveActivityLines,
  type Form8835CreditEntry,
} from "../../../nodes/inputs/f3800/calculation.ts";
import type { Form3800DocumentParts } from "./f3800_document.ts";
import type { Form3800NonpassiveDetailRow } from "./f3800_nonpassive_details.ts";
import {
  buildForm3800CurrentCreditRowXml,
  combineForm3800CurrentCreditAmounts,
  type Form3800CurrentCreditRowMetadata,
  type Form3800CurrentEntityCredit,
  type Form3800CurrentXmlRow,
  largestForm3800CurrentEntity,
} from "./f3800_current_rows.ts";

function nontransferableCurrentRow(
  line: "1e" | "1h" | "1i" | "1y" | "1aa" | "4b",
  credit: number,
  appliedCredit: number,
  metadata: Form3800CurrentCreditRowMetadata,
  entityCredits: readonly Form3800CurrentEntityCredit[],
): Form3800CurrentXmlRow {
  const [row] = combineForm3800CurrentCreditAmounts([{
    line,
    grossCredit: credit,
    transferOutCredit: 0,
    appliedCredit,
  }], []);
  return {
    line,
    metadata,
    entityCredits,
    xml: buildForm3800CurrentCreditRowXml(row, metadata),
  };
}

function passThroughEntityCredits(
  sources: readonly { readonly credit: number; readonly ein?: string }[],
): Form3800CurrentEntityCredit[] {
  return sources.flatMap((source) =>
    source.ein ? [{ entity: { ein: source.ein }, credit: source.credit }] : []
  );
}

/** Source-backed nonpassive Form 8826, 8835, 5884, and 8936 rows. */
export type Form3800NonpassiveXmlInput = {
  readonly tax: Form3800NonpassiveInput;
  readonly passiveActivity: Form3800PassiveActivityLines;
  readonly passiveApplied: {
    readonly standard: number;
    readonly specified: number;
  };
  readonly form5884?: {
    readonly credit: number;
    /** Present only when the filer earned a credit on their own Form 5884. */
    readonly documentId?: string;
    readonly appliedCredit: number;
    readonly sources: readonly {
      readonly credit: number;
      readonly ein?: string;
    }[];
    /** Self-earned source first, then positive pass-through sources. */
    readonly appliedCreditsBySource?: readonly number[];
  };
  readonly disabledAccess?: {
    readonly credit: number;
    /** Present only when the taxpayer has a self-earned Form 8826 credit. */
    readonly documentId?: string;
    readonly appliedCredit: number;
    /** Self-earned source first, then positive K-1 sources in input order. */
    readonly sources: readonly Form8826PartVSource[];
    readonly appliedCreditsBySource?: readonly number[];
  };
  readonly form8820?: {
    readonly credit: number;
    /** Present only when the filer has their own Form 8820 or an election. */
    readonly documentId?: string;
    readonly appliedCredit: number;
    readonly sources: readonly {
      readonly credit: number;
      readonly ein?: string;
    }[];
    /** Self-earned source first, then positive pass-through sources. */
    readonly appliedCreditsBySource?: readonly number[];
  };
  readonly form8874?: {
    readonly credit: number;
    /** Present only when the filer earned a credit on their own Form 8874. */
    readonly documentId?: string;
    readonly appliedCredit: number;
    readonly sources: readonly {
      readonly credit: number;
      readonly ein?: string;
    }[];
    readonly appliedCreditsBySource?: readonly number[];
  };
  readonly form8936?: {
    readonly credit: number;
    readonly documentId: string;
    readonly appliedCredit: number;
  };
  readonly form8936Commercial?: {
    readonly credit: number;
    readonly documentId: string;
    readonly appliedCredit: number;
  };
  readonly facilities: readonly Form8835CreditEntry[];
  readonly form8835DocumentIds: readonly string[];
  /** Part II credit allocated to each facility, in the same order. */
  readonly appliedCreditsByFacility: readonly number[];
  readonly transferStatementIdsByFileName: Readonly<Record<string, string>>;
};

type Form8826PartVSource = {
  readonly credit: number;
  readonly ein?: string;
};

type FiledForm8826PartVSource = Form8826PartVSource & {
  readonly filedCredit: number;
  readonly filedApplied: number;
};

function cents(amount: number, description: string): number {
  const value = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) || !Number.isSafeInteger(value) ||
    Math.abs(amount * 100 - value) > 0.000001
  ) {
    throw new Error(`${description} must have cent precision`);
  }
  return value;
}

/** Keep whole-dollar Part V rows additive with the separately rounded totals. */
function filedForm8826Sources(
  sources: readonly Form8826PartVSource[],
  applied: readonly number[],
): FiledForm8826PartVSource[] {
  const creditCents = sources.map((source, index) =>
    cents(source.credit, `Form 8826 source ${index + 1} credit`)
  );
  const appliedCents = applied.map((amount, index) =>
    cents(amount, `Form 8826 source ${index + 1} applied credit`)
  );
  const allocate = (amounts: readonly number[]): number[] => {
    const whole = amounts.map((amount) => Math.floor(amount / 100));
    const target = Math.round(
      amounts.reduce((sum, amount) => sum + amount, 0) / 100,
    );
    const remaining = target - whole.reduce((sum, amount) => sum + amount, 0);
    const order = amounts.map((amount, index) => ({
      index,
      remainder: amount % 100,
    })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (const { index } of order.slice(0, remaining)) whole[index] += 1;
    return whole;
  };
  const filedApplied = allocate(appliedCents);
  const filedCredit = creditCents.map((amount, index) =>
    Math.max(Math.floor(amount / 100), filedApplied[index])
  );
  const creditTarget = Math.round(
    creditCents.reduce((sum, amount) => sum + amount, 0) / 100,
  );
  const remainingCredit = creditTarget -
    filedCredit.reduce((sum, amount) => sum + amount, 0);
  if (remainingCredit < 0) {
    throw new Error(
      "Form 8826 Part V whole-dollar source rows cannot reconcile",
    );
  }
  const creditOrder = creditCents.map((amount, index) => ({
    index,
    remainder: amount % 100,
  })).filter(({ index }) =>
    filedCredit[index] < Math.ceil(creditCents[index] / 100)
  )
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  if (remainingCredit > creditOrder.length) {
    throw new Error(
      "Form 8826 Part V whole-dollar source rows cannot reconcile",
    );
  }
  for (const { index } of creditOrder.slice(0, remainingCredit)) {
    filedCredit[index] += 1;
  }
  return sources.map((source, index) => ({
    ...source,
    filedCredit: filedCredit[index],
    filedApplied: filedApplied[index],
  }));
}

export function buildForm3800NonpassiveParts(
  input: Form3800NonpassiveXmlInput,
): Form3800DocumentParts {
  const credits = classifyForm8835Credits(input.facilities);
  if (
    !input.disabledAccess && !input.form8820 && !input.form8874 &&
    !input.form5884 &&
    !input.form8936 &&
    !input.form8936Commercial &&
    input.facilities.length === 0
  ) {
    throw new Error("Form 3800 needs a source credit document");
  }
  const form8826Credit = input.disabledAccess?.credit ?? 0;
  const form8820Credit = input.form8820?.credit ?? 0;
  const form8874Credit = input.form8874?.credit ?? 0;
  const form5884Credit = input.form5884?.credit ?? 0;
  const form8936Credit = input.form8936?.credit ?? 0;
  const form8936CommercialCredit = input.form8936Commercial?.credit ?? 0;
  if (input.form8874) {
    const source = input.form8874;
    const hasSelfEarned = source.sources.some((entry) => !entry.ein);
    if (
      !Number.isInteger(form8874Credit) || form8874Credit <= 0 ||
      !Number.isInteger(source.appliedCredit) ||
      source.appliedCredit < 0 || source.appliedCredit > form8874Credit ||
      source.sources.length === 0 || source.sources.length > 999 ||
      source.sources.some((entry) =>
        !Number.isInteger(entry.credit) || entry.credit <= 0 ||
        (entry.ein !== undefined && !/^\d{9}$/.test(entry.ein))
      ) ||
      source.sources.reduce((sum, entry) => sum + entry.credit, 0) !==
        form8874Credit ||
      hasSelfEarned !== Boolean(source.documentId) ||
      source.sources.filter((entry) => !entry.ein).length > 1
    ) {
      throw new Error(
        "Form 3800 has an invalid Form 8874 source or allocation",
      );
    }
    if (source.sources.length > 1) {
      const applied = source.appliedCreditsBySource;
      if (
        !applied || applied.length !== source.sources.length ||
        applied.some((amount, index) =>
          !Number.isInteger(amount) || amount < 0 ||
          amount > source.sources[index].credit
        ) ||
        applied.reduce((sum, amount) => sum + amount, 0) !==
          source.appliedCredit
      ) {
        throw new Error(
          "Form 3800 Form 8874 Part V applied credits do not reconcile",
        );
      }
    } else if (source.appliedCreditsBySource !== undefined) {
      throw new Error("Form 3800 Form 8874 allocations need multiple sources");
    }
  }
  if (
    input.form8936 &&
    (!input.form8936.documentId ||
      !Number.isInteger(form8936Credit) || form8936Credit <= 0 ||
      !Number.isInteger(input.form8936.appliedCredit) ||
      input.form8936.appliedCredit < 0 ||
      input.form8936.appliedCredit > form8936Credit)
  ) {
    throw new Error("Form 3800 has an invalid Form 8936 line 1y allocation");
  }
  if (
    input.form8936Commercial &&
    (!input.form8936Commercial.documentId ||
      !Number.isInteger(form8936CommercialCredit) ||
      form8936CommercialCredit <= 0 ||
      !Number.isInteger(input.form8936Commercial.appliedCredit) ||
      input.form8936Commercial.appliedCredit < 0 ||
      input.form8936Commercial.appliedCredit > form8936CommercialCredit)
  ) {
    throw new Error("Form 3800 has an invalid Form 8936 line 1aa allocation");
  }
  if (input.form5884) {
    const source = input.form5884;
    const hasSelfEarned = source.sources.some((entry) => !entry.ein);
    if (
      !Number.isFinite(form5884Credit) || form5884Credit <= 0 ||
      !Number.isInteger(form5884Credit) ||
      !Number.isFinite(source.appliedCredit) ||
      !Number.isInteger(source.appliedCredit) ||
      source.appliedCredit < 0 ||
      source.appliedCredit > form5884Credit ||
      source.sources.length === 0 || source.sources.length > 999 ||
      source.sources.some((entry) =>
        !Number.isInteger(entry.credit) || entry.credit <= 0
      ) ||
      source.sources.reduce((sum, entry) => sum + entry.credit, 0) !==
        form5884Credit ||
      hasSelfEarned !== Boolean(source.documentId) ||
      source.sources.filter((entry) => !entry.ein).length > 1
    ) {
      throw new Error(
        "Form 3800 has an invalid Form 5884 source or allocation",
      );
    }
    if (source.sources.length > 1) {
      const applied = source.appliedCreditsBySource;
      if (
        !applied || applied.length !== source.sources.length ||
        applied.some((amount, index) =>
          !Number.isInteger(amount) || amount < 0 ||
          amount > source.sources[index].credit
        ) ||
        applied.reduce((sum, amount) => sum + amount, 0) !==
          source.appliedCredit
      ) {
        throw new Error(
          "Form 3800 Form 5884 Part V applied credits do not reconcile",
        );
      }
    } else if (source.appliedCreditsBySource !== undefined) {
      throw new Error(
        "Form 3800 Form 5884 source allocations need multiple sources",
      );
    }
  }
  if (input.disabledAccess) {
    const source = input.disabledAccess;
    const selfEarned = source.sources.some((entry) => !entry.ein);
    if (
      form8826Credit <= 0 ||
      source.sources.length === 0 || source.sources.length > 999 ||
      source.sources.filter((entry) => !entry.ein).length > 1 ||
      source.sources.some((entry) =>
        cents(entry.credit, "Form 8826 source credit") <= 0 ||
        (entry.ein !== undefined && !/^\d{9}$/.test(entry.ein))
      ) ||
      cents(source.credit, "Form 8826 credit") !==
        source.sources.reduce(
          (sum, entry) => sum + cents(entry.credit, "Form 8826 source credit"),
          0,
        ) ||
      (selfEarned && !source.documentId) ||
      (!selfEarned && source.documentId)
    ) {
      throw new Error("Form 3800 needs an eligible Form 8826 source document");
    }
    const applied = source.appliedCredit;
    if (
      cents(applied, "Form 8826 applied credit") < 0 ||
      cents(applied, "Form 8826 applied credit") >
        cents(form8826Credit, "Form 8826 credit")
    ) {
      throw new Error("Form 3800 has an invalid Form 8826 applied credit");
    }
  }
  if (input.form8820) {
    const source = input.form8820;
    const hasSelfEarned = source.sources.some((entry) => !entry.ein);
    if (
      !Number.isFinite(form8820Credit) || form8820Credit <= 0 ||
      !Number.isInteger(form8820Credit) ||
      !Number.isInteger(source.appliedCredit) ||
      source.appliedCredit < 0 || source.appliedCredit > form8820Credit ||
      source.sources.length === 0 || source.sources.length > 999 ||
      source.sources.some((entry) =>
        !Number.isInteger(entry.credit) || entry.credit <= 0
      ) ||
      source.sources.reduce((sum, entry) => sum + entry.credit, 0) !==
        form8820Credit ||
      (hasSelfEarned && !source.documentId) ||
      source.sources.filter((entry) => !entry.ein).length > 1
    ) {
      throw new Error(
        "Form 3800 has an invalid Form 8820 source or allocation",
      );
    }
    if (source.sources.length > 1) {
      const applied = source.appliedCreditsBySource;
      if (
        !applied || applied.length !== source.sources.length ||
        applied.some((amount, index) =>
          !Number.isInteger(amount) || amount < 0 ||
          amount > source.sources[index].credit
        ) ||
        applied.reduce((sum, amount) => sum + amount, 0) !==
          source.appliedCredit
      ) {
        throw new Error(
          "Form 3800 Form 8820 Part V applied credits do not reconcile",
        );
      }
    } else if (source.appliedCreditsBySource !== undefined) {
      throw new Error("Form 3800 Form 8820 allocations need multiple sources");
    }
  }
  if (
    credits.standardCredit + form8826Credit + form8820Credit +
          form8874Credit + form8936Credit +
          form8936CommercialCredit !==
      input.tax.standardCredit ||
    credits.specifiedCredit + form5884Credit !== input.tax.specifiedCredit
  ) {
    throw new Error(
      "Form 3800 Part II credit amounts do not reconcile with source documents",
    );
  }
  if (
    input.facilities.length !== input.form8835DocumentIds.length ||
    input.facilities.length !== input.appliedCreditsByFacility.length ||
    input.form8835DocumentIds.some((id) => !id)
  ) {
    throw new Error(
      "Form 3800 needs a document ID and applied credit for each facility",
    );
  }
  const statementIds = credits.transferStatementFileNames.map((fileName) => {
    const id = input.transferStatementIdsByFileName[fileName];
    if (!id) {
      throw new Error(
        `Form 3800 transfer statement is not bundled: ${fileName}`,
      );
    }
    return id;
  });
  const lines = calculateForm3800Nonpassive(
    input.tax,
    input.passiveActivity,
  );
  if (
    cents(input.passiveApplied.standard, "Form 3800 passive standard use") <
      0 ||
    cents(input.passiveApplied.specified, "Form 3800 passive specified use") <
      0 ||
    cents(input.passiveApplied.standard, "Form 3800 passive standard use") >
      cents(lines.line17, "Form 3800 line 17") ||
    cents(input.passiveApplied.specified, "Form 3800 passive specified use") >
      cents(lines.line37, "Form 3800 line 37")
  ) {
    throw new Error("Form 3800 passive tax use exceeds Part II");
  }
  const form8826Sources = input.disabledAccess?.sources ?? [];
  const form8826PassThroughSources = form8826Sources.filter((source) =>
    source.ein !== undefined
  );
  const form8826NeedsPartV = form8826Sources.length > 1;
  if (form8826NeedsPartV && form8826Sources.length > 999) {
    throw new Error("Form 3800 Part V exceeds the Form 8826 item count");
  }
  if (
    input.disabledAccess?.appliedCreditsBySource !== undefined &&
    !form8826NeedsPartV
  ) {
    throw new Error(
      "Form 3800 Form 8826 source allocations are only needed for multiple sources",
    );
  }
  if (
    form8826NeedsPartV &&
    input.disabledAccess?.appliedCreditsBySource?.length !==
      form8826Sources.length
  ) {
    throw new Error(
      "Form 3800 needs an applied credit for each Form 8826 Part V source",
    );
  }
  const form8826AppliedSources = form8826NeedsPartV
    ? input.disabledAccess!.appliedCreditsBySource!
    : [];
  if (form8826NeedsPartV) {
    for (const [index, source] of form8826Sources.entries()) {
      const applied = form8826AppliedSources[index];
      if (
        applied === undefined || !Number.isFinite(applied) || applied < 0 ||
        applied > source.credit
      ) {
        throw new Error(
          `Form 3800 Form 8826 Part V source ${
            index + 1
          } has an invalid applied credit`,
        );
      }
    }
    if (
      form8826AppliedSources.reduce(
        (sum, amount, index) =>
          sum + cents(amount, `Form 8826 source ${index + 1} applied credit`),
        0,
      ) !==
        cents(input.disabledAccess!.appliedCredit, "Form 8826 applied credit")
    ) {
      throw new Error(
        "Form 3800 Form 8826 Part V applied credits do not reconcile",
      );
    }
  }
  const filedForm8826PartV = input.disabledAccess
    ? filedForm8826Sources(
      form8826Sources,
      form8826NeedsPartV
        ? form8826AppliedSources
        : [input.disabledAccess.appliedCredit],
    )
    : [];
  const appliedAt = (index: number): number => {
    const amount = input.appliedCreditsByFacility[index];
    if (amount === undefined) {
      throw new Error(`Form 3800 facility ${index + 1} has no applied credit`);
    }
    return amount;
  };
  const documentIdAt = (index: number): string => {
    const id = input.form8835DocumentIds[index];
    if (!id) {
      throw new Error(
        `Form 3800 facility ${index + 1} has no Form 8835 document ID`,
      );
    }
    return id;
  };
  for (const [index, facility] of input.facilities.entries()) {
    const applied = appliedAt(index);
    const available = facility.credit_amount - facility.transfer_out_amount;
    if (!Number.isFinite(applied) || applied < 0 || applied > available) {
      throw new Error(
        `Form 3800 facility ${index + 1} has an invalid applied credit`,
      );
    }
  }
  const form8826Applied = input.disabledAccess?.appliedCredit ?? 0;
  const standardApplied = input.facilities.reduce(
    (sum, facility, index) =>
      sum + (facility.form3800_line === "1f" ? appliedAt(index) : 0),
    form8826Applied + (input.form8820?.appliedCredit ?? 0) +
      (input.form8874?.appliedCredit ?? 0) +
      (input.form8936?.appliedCredit ?? 0) +
      (input.form8936Commercial?.appliedCredit ?? 0),
  );
  const specifiedApplied = input.facilities.reduce(
    (sum, facility, index) =>
      sum + (facility.form3800_line === "4e" ? appliedAt(index) : 0),
    input.form5884?.appliedCredit ?? 0,
  );
  if (
    cents(standardApplied, "Form 3800 standard source use") !==
      cents(lines.line17, "Form 3800 line 17") -
        cents(
          input.passiveApplied.standard,
          "Form 3800 passive standard use",
        ) ||
    cents(specifiedApplied, "Form 3800 specified source use") !==
      cents(lines.line37, "Form 3800 line 37") -
        cents(input.passiveApplied.specified, "Form 3800 passive specified use")
  ) {
    throw new Error(
      "Form 3800 Part III applied credits do not reconcile to Part II",
    );
  }
  const form8826DocumentId = input.disabledAccess?.documentId;
  const form8826PartVGroups: Form3800NonpassiveDetailRow[] = filedForm8826PartV
    .map((source) => ({
      line: "1e" as const,
      credit: source.filedCredit,
      appliedCredit: source.filedApplied,
      passThroughEin: source.ein,
      sourceDocumentId: source.ein ? undefined : form8826DocumentId,
    }));
  const form8820 = input.form8820;
  const form8820PassThroughSources =
    form8820?.sources.filter((source) => source.ein !== undefined) ?? [];
  const form8820PartVGroups: Form3800NonpassiveDetailRow[] = form8820
    ? form8820.sources.map((source, index) => {
      const applied = form8820.sources.length > 1
        ? form8820.appliedCreditsBySource![index]
        : form8820.appliedCredit;
      return {
        line: "1h" as const,
        credit: source.credit,
        appliedCredit: applied,
        passThroughEin: source.ein,
        sourceDocumentId: source.ein ? undefined : form8820.documentId,
      };
    })
    : [];
  const form8874PartVGroups: Form3800NonpassiveDetailRow[] = input.form8874
    ? input.form8874.sources.map((source, index) => {
      const applied = input.form8874!.sources.length > 1
        ? input.form8874!.appliedCreditsBySource![index]
        : input.form8874!.appliedCredit;
      return {
        line: "1i" as const,
        credit: source.credit,
        appliedCredit: applied,
        passThroughEin: source.ein,
        sourceDocumentId: source.ein ? undefined : input.form8874!.documentId,
      };
    })
    : [];
  const form5884 = input.form5884;
  const form5884PartVGroups: Form3800NonpassiveDetailRow[] = form5884
    ? form5884.sources.map((source, index) => {
      const applied = form5884.sources.length > 1
        ? form5884.appliedCreditsBySource?.[index]
        : form5884.appliedCredit;
      if (applied === undefined) {
        throw new Error(
          `Form 3800 Form 5884 source ${index + 1} has no allocation`,
        );
      }
      return {
        line: "4b" as const,
        credit: source.credit,
        appliedCredit: applied,
        passThroughEin: source.ein,
        sourceDocumentId: source.ein ? undefined : form5884.documentId,
      };
    })
    : [];
  const partVGroups: Form3800NonpassiveDetailRow[] = [];
  const partIIIGroups = credits.rows.map((row) => {
    const facilityIndexes = input.facilities.flatMap((facility, index) =>
      facility.form3800_line === row.line ? [index] : []
    );
    const applied = facilityIndexes.reduce(
      (sum, index) => sum + appliedAt(index),
      0,
    );
    const firstTransferred = row.facilities.find((facility) =>
      facility.transfer_out_amount > 0
    );
    for (const index of facilityIndexes) {
      const facility = input.facilities[index];
      if (!facility) {
        throw new Error(`Form 3800 facility ${index + 1} is missing`);
      }
      const facilityApplied = appliedAt(index);
      partVGroups.push({
        line: row.line,
        credit: facility.credit_amount,
        appliedCredit: facilityApplied,
        transferOutCredit: facility.transfer_out_amount,
        transferRegistrationNumber: facility.transfer_out_amount > 0
          ? facility.registration_number
          : undefined,
        sourceDocumentId: documentIdAt(index),
      });
    }
    const firstFacilityIndex = facilityIndexes[0];
    if (firstFacilityIndex === undefined) {
      throw new Error(`Form 3800 Part III line ${row.line} has no facility`);
    }
    const metadata: Form3800CurrentCreditRowMetadata = {
      sourceCount: row.facilityCount,
      transferRegistrationNumber: firstTransferred?.registration_number,
      referenceDocumentId: row.facilityCount > 1
        ? facilityIndexes.map(documentIdAt).join(" ")
        : documentIdAt(firstFacilityIndex),
      referenceDocumentName: "IRS8835",
    };
    if (!metadata.referenceDocumentId || !metadata.referenceDocumentName) {
      throw new Error("Form 3800 facility credit needs a source document");
    }
    return {
      line: row.line,
      metadata,
      entityCredits: [],
      xml: elements(
        row.line === "1f"
          ? "Form8835PartIICYCreditsGrp"
          : "Frm8835PartIICYSpcfdCreditsGrp",
        [
          row.facilityCount > 1
            ? element("CYGeneralBusinessCrItemCnt", row.facilityCount)
            : "",
          firstTransferred
            ? element(
              "TransferRegistrationNum",
              firstTransferred.registration_number,
            )
            : "",
          element("GeneralBusCrFromNnPssvActyAmt", row.selfEarnedCredit),
          row.transferOutAmount > 0
            ? element("CreditTransferElectionAmt", -row.transferOutAmount)
            : "",
          element("TotalGeneralBusCreditsAmt", row.availableCredit),
          element("TotalGeneralBusCreditsAppTxAmt", applied),
        ],
        {
          referenceDocumentId: metadata.referenceDocumentId,
          referenceDocumentName: metadata.referenceDocumentName,
        },
      ),
    };
  });
  const ordinaryGroup = partIIIGroups.find((group) => group.line === "1f");
  const specifiedGroup = partIIIGroups.find((group) => group.line === "4e");
  const form5884PassThroughSources =
    form5884?.sources.filter((source) => source.ein !== undefined) ?? [];
  const form8826EntityCredits = passThroughEntityCredits(
    form8826PassThroughSources,
  );
  const form8820EntityCredits = passThroughEntityCredits(
    form8820PassThroughSources,
  );
  const form8874EntityCredits = passThroughEntityCredits(
    input.form8874?.sources.filter((source) => source.ein !== undefined) ?? [],
  );
  const form5884EntityCredits = passThroughEntityCredits(
    form5884PassThroughSources,
  );
  const currentRows: Form3800CurrentXmlRow[] = [
    ...(input.disabledAccess
      ? [
        nontransferableCurrentRow(
          "1e",
          form8826Credit,
          form8826Applied,
          {
            sourceCount: form8826Sources.length,
            entity: largestForm3800CurrentEntity(form8826EntityCredits),
            referenceDocumentId: input.disabledAccess.documentId,
            referenceDocumentName: input.disabledAccess.documentId
              ? "IRS8826"
              : undefined,
          },
          form8826EntityCredits,
        ),
      ]
      : []),
    ...(ordinaryGroup ? [ordinaryGroup] : []),
    ...(input.form8820
      ? [
        nontransferableCurrentRow(
          "1h",
          form8820Credit,
          input.form8820.appliedCredit,
          {
            sourceCount: input.form8820.sources.length,
            entity: largestForm3800CurrentEntity(form8820EntityCredits),
            referenceDocumentId: input.form8820.documentId,
            referenceDocumentName: input.form8820.documentId
              ? "IRS8820"
              : undefined,
          },
          form8820EntityCredits,
        ),
      ]
      : []),
    ...(input.form8874
      ? [
        nontransferableCurrentRow(
          "1i",
          form8874Credit,
          input.form8874.appliedCredit,
          {
            sourceCount: input.form8874.sources.length,
            entity: largestForm3800CurrentEntity(form8874EntityCredits),
            referenceDocumentId: input.form8874.documentId,
            referenceDocumentName: input.form8874.documentId
              ? "IRS8874"
              : undefined,
          },
          form8874EntityCredits,
        ),
      ]
      : []),
    ...(input.form8936
      ? [
        nontransferableCurrentRow(
          "1y",
          form8936Credit,
          input.form8936.appliedCredit,
          {
            sourceCount: 1,
            referenceDocumentId: input.form8936.documentId,
            referenceDocumentName: "IRS8936",
          },
          [],
        ),
      ]
      : []),
    ...(input.form8936Commercial
      ? [
        nontransferableCurrentRow(
          "1aa",
          form8936CommercialCredit,
          input.form8936Commercial.appliedCredit,
          {
            sourceCount: 1,
            referenceDocumentId: input.form8936Commercial.documentId,
            referenceDocumentName: "IRS8936",
          },
          [],
        ),
      ]
      : []),
    ...(form5884
      ? [
        nontransferableCurrentRow(
          "4b",
          form5884Credit,
          form5884.appliedCredit,
          {
            sourceCount: form5884.sources.length,
            entity: largestForm3800CurrentEntity(form5884EntityCredits),
            referenceDocumentId: form5884.documentId,
            referenceDocumentName: form5884.documentId ? "IRS5884" : undefined,
          },
          form5884EntityCredits,
        ),
      ]
      : []),
    ...(specifiedGroup ? [specifiedGroup] : []),
  ];
  const currentAmounts = combineForm3800CurrentCreditAmounts([
    ...(input.disabledAccess
      ? [{
        line: "1e" as const,
        grossCredit: form8826Credit,
        transferOutCredit: 0,
        appliedCredit: form8826Applied,
      }]
      : []),
    ...credits.rows.map((row) => ({
      line: row.line,
      grossCredit: row.selfEarnedCredit,
      transferOutCredit: row.transferOutAmount,
      appliedCredit: input.facilities.reduce(
        (sum, facility, index) =>
          sum + (facility.form3800_line === row.line ? appliedAt(index) : 0),
        0,
      ),
    })),
    ...(input.form8820
      ? [{
        line: "1h" as const,
        grossCredit: form8820Credit,
        transferOutCredit: 0,
        appliedCredit: input.form8820.appliedCredit,
      }]
      : []),
    ...(input.form8874
      ? [{
        line: "1i" as const,
        grossCredit: form8874Credit,
        transferOutCredit: 0,
        appliedCredit: input.form8874.appliedCredit,
      }]
      : []),
    ...(input.form8936
      ? [{
        line: "1y" as const,
        grossCredit: form8936Credit,
        transferOutCredit: 0,
        appliedCredit: input.form8936.appliedCredit,
      }]
      : []),
    ...(input.form8936Commercial
      ? [{
        line: "1aa" as const,
        grossCredit: form8936CommercialCredit,
        transferOutCredit: 0,
        appliedCredit: input.form8936Commercial.appliedCredit,
      }]
      : []),
    ...(form5884
      ? [{
        line: "4b" as const,
        grossCredit: form5884Credit,
        transferOutCredit: 0,
        appliedCredit: form5884.appliedCredit,
      }]
      : []),
  ], []);
  return {
    lines,
    transferStatementIds: statementIds,
    currentRows,
    currentAmounts,
    carryoverRows: [],
    currentDetails: [
      ...form8826PartVGroups,
      ...partVGroups,
      ...form8820PartVGroups,
      ...form8874PartVGroups,
      ...form5884PartVGroups,
      ...(input.form8936
        ? [{
          line: "1y" as const,
          credit: form8936Credit,
          appliedCredit: input.form8936.appliedCredit,
          sourceDocumentId: input.form8936.documentId,
        }]
        : []),
      ...(input.form8936Commercial
        ? [{
          line: "1aa" as const,
          credit: form8936CommercialCredit,
          appliedCredit: input.form8936Commercial.appliedCredit,
          sourceDocumentId: input.form8936Commercial.documentId,
        }]
        : []),
    ],
    carryoverDetails: [],
    passiveCurrentDetails: [],
    passiveCarryoverDetails: [],
  };
}
