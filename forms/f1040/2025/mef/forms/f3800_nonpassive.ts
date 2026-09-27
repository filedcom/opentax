import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm3800Nonpassive,
  classifyForm8835Credits,
  type Form3800NonpassiveInput,
  type Form8835CreditEntry,
} from "../../../nodes/inputs/f3800/calculation.ts";
import {
  calculateForm8826,
  type F8826Input,
  inputSchema as form8826InputSchema,
  isEligible as isEligibleForForm8826,
} from "../../../nodes/inputs/f8826/index.ts";

/** Source-backed nonpassive Form 8826, Form 8835, and Form 5884 rows. */
export type Form3800NonpassiveXmlInput = {
  readonly tax: Form3800NonpassiveInput;
  readonly form5884?: {
    readonly credit: number;
    readonly documentId: string;
    readonly appliedCredit: number;
  };
  readonly form8826?: {
    readonly source: F8826Input;
    /** Required when the taxpayer has a self-earned Form 8826 credit. */
    readonly documentId?: string;
    readonly appliedCredit: number;
    /** Self-earned source first, then positive K-1 sources in input order. */
    readonly appliedCreditsBySource?: readonly number[];
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

export function buildIRS3800Nonpassive(
  input: Form3800NonpassiveXmlInput,
): string {
  const credits = classifyForm8835Credits(input.facilities);
  if (!input.form8826 && !input.form5884 && input.facilities.length === 0) {
    throw new Error("Form 3800 needs a source credit document");
  }
  const form8826Lines = input.form8826
    ? calculateForm8826(form8826InputSchema.parse(input.form8826.source))
    : undefined;
  const form8826Credit = form8826Lines?.line8 ?? 0;
  const form5884Credit = input.form5884?.credit ?? 0;
  if (input.form5884) {
    if (
      !input.form5884.documentId ||
      !Number.isFinite(form5884Credit) || form5884Credit <= 0 ||
      !Number.isFinite(input.form5884.appliedCredit) ||
      input.form5884.appliedCredit < 0 ||
      input.form5884.appliedCredit > form5884Credit
    ) {
      throw new Error(
        "Form 3800 has an invalid Form 5884 source or allocation",
      );
    }
  }
  if (input.form8826) {
    const source = input.form8826.source;
    const selfEarned = calculateForm8826(source).line6 > 0;
    if (
      (selfEarned && source.subject_to_passive_activity_limit) ||
      (source.pass_through_credits ?? []).some((entry) =>
        entry.credit_amount > 0 && entry.subject_to_passive_activity_limit
      )
    ) {
      throw new Error("Form 8826 passive credit needs Form 8582-CR");
    }
    if (source.eligible_expenditures > 0 && !isEligibleForForm8826(source)) {
      throw new Error(
        "Form 3800 has an ineligible self-earned Form 8826 credit",
      );
    }
    if (
      form8826Credit <= 0 ||
      (selfEarned && !input.form8826.documentId) ||
      (!selfEarned && input.form8826.documentId)
    ) {
      throw new Error("Form 3800 needs an eligible Form 8826 source document");
    }
    const applied = input.form8826.appliedCredit;
    if (!Number.isFinite(applied) || applied < 0 || applied > form8826Credit) {
      throw new Error("Form 3800 has an invalid Form 8826 applied credit");
    }
  }
  if (
    credits.standardCredit + form8826Credit !== input.tax.standardCredit ||
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
  const lines = calculateForm3800Nonpassive(input.tax);
  const form8826Sources: Form8826PartVSource[] = input.form8826 &&
      form8826Lines
    ? [
      ...(form8826Lines.selfCreditAfterCap > 0
        ? [{ credit: form8826Lines.selfCreditAfterCap }]
        : []),
      ...(input.form8826.source.pass_through_credits ?? []).flatMap(
        (source, index) => {
          const credit = form8826Lines.passThroughCreditsAfterCap[index] ?? 0;
          return credit > 0 ? [{ credit, ein: source.entity_ein }] : [];
        },
      ),
    ]
    : [];
  const form8826PassThroughSources = form8826Sources.filter((source) =>
    source.ein !== undefined
  );
  const form8826NeedsPartV = form8826Sources.length > 1;
  if (form8826NeedsPartV && form8826Sources.length > 999) {
    throw new Error("Form 3800 Part V exceeds the Form 8826 item count");
  }
  if (
    input.form8826?.appliedCreditsBySource !== undefined &&
    !form8826NeedsPartV
  ) {
    throw new Error(
      "Form 3800 Form 8826 source allocations are only needed for multiple sources",
    );
  }
  if (
    form8826NeedsPartV &&
    input.form8826?.appliedCreditsBySource?.length !== form8826Sources.length
  ) {
    throw new Error(
      "Form 3800 needs an applied credit for each Form 8826 Part V source",
    );
  }
  const form8826AppliedSources = form8826NeedsPartV
    ? input.form8826!.appliedCreditsBySource!
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
      ) !== cents(input.form8826!.appliedCredit, "Form 8826 applied credit")
    ) {
      throw new Error(
        "Form 3800 Form 8826 Part V applied credits do not reconcile",
      );
    }
  }
  const filedForm8826PartV = form8826NeedsPartV
    ? filedForm8826Sources(form8826Sources, form8826AppliedSources)
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
  const form8826Applied = input.form8826?.appliedCredit ?? 0;
  const standardApplied = input.facilities.reduce(
    (sum, facility, index) =>
      sum + (facility.form3800_line === "1f" ? appliedAt(index) : 0),
    form8826Applied,
  );
  const specifiedApplied = input.facilities.reduce(
    (sum, facility, index) =>
      sum + (facility.form3800_line === "4e" ? appliedAt(index) : 0),
    input.form5884?.appliedCredit ?? 0,
  );
  if (standardApplied !== lines.line17 || specifiedApplied !== lines.line37) {
    throw new Error(
      "Form 3800 Part III applied credits do not reconcile to Part II",
    );
  }
  const form8826DocumentId = input.form8826?.documentId;
  const form8826PartVGroups = form8826NeedsPartV
    ? filedForm8826PartV.map((source) =>
      elements("Frm8826CYAggrgtAmtGrp", [
        source.ein ? element("PassThroughEntityEIN", source.ein) : "",
        element("OthThnCrTrnsfrElectCrNoLmtAmt", source.filedCredit),
        element("TotalGeneralBusCreditsAmt", source.filedCredit),
        element(
          "TotalGBCLessGrossEPEAppTxAmt",
          source.filedApplied,
        ),
        element(
          "CarryforwardGeneralBusCrAmt",
          source.filedCredit - source.filedApplied,
        ),
      ], {
        ...(source.ein || !form8826DocumentId ? {} : {
          referenceDocumentId: form8826DocumentId,
          referenceDocumentName: "IRS8826",
        }),
        lineNumberTxt: "Part III Line 1e",
      })
    )
    : [];
  const partVGroups: string[] = [];
  const partIIIGroups = credits.rows.map((row) => {
    const facilityIndexes = input.facilities.flatMap((facility, index) =>
      facility.form3800_line === row.line ? [index] : []
    );
    const applied = facilityIndexes.reduce(
      (sum, index) => sum + appliedAt(index),
      0,
    );
    const expected = row.line === "1f"
      ? lines.line17 - form8826Applied
      : lines.line37 - (input.form5884?.appliedCredit ?? 0);
    if (applied !== expected) {
      throw new Error(
        `Form 3800 Part III line ${row.line} does not reconcile to Part II`,
      );
    }
    const firstTransferred = row.facilities.find((facility) =>
      facility.transfer_out_amount > 0
    );
    if (row.facilityCount > 1) {
      for (const index of facilityIndexes) {
        const facility = input.facilities[index];
        if (!facility) {
          throw new Error(`Form 3800 facility ${index + 1} is missing`);
        }
        const available = facility.credit_amount - facility.transfer_out_amount;
        const facilityApplied = appliedAt(index);
        const specified = row.line === "4e";
        partVGroups.push(elements(
          specified
            ? "Frm8835PartIICYSpcfdAmtGrp"
            : "Frm8835PartIICYAggrgtAmtGrp",
          [
            facility.transfer_out_amount > 0
              ? element("TransferRegistrationNum", facility.registration_number)
              : "",
            element("OthThnCrTrnsfrElectCrNoLmtAmt", facility.credit_amount),
            facility.transfer_out_amount > 0
              ? element(
                "TrnsfrElectCrSoldNoLmtAmt",
                -facility.transfer_out_amount,
              )
              : "",
            element("TotalGeneralBusCreditsAmt", available),
            specified ? element("TotalGBCLessGrossEPEAmt", available) : "",
            element("TotalGBCLessGrossEPEAppTxAmt", facilityApplied),
            element("CarryforwardGeneralBusCrAmt", available - facilityApplied),
          ],
          {
            referenceDocumentId: documentIdAt(index),
            referenceDocumentName: specified
              ? "IRS8835 BinaryAttachment"
              : "IRS8835",
            lineNumberTxt: specified ? "Part III Line 4e" : "Part III Line 1f",
          },
        ));
      }
    }
    const firstFacilityIndex = facilityIndexes[0];
    if (firstFacilityIndex === undefined) {
      throw new Error(`Form 3800 Part III line ${row.line} has no facility`);
    }
    return {
      line: row.line,
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
          referenceDocumentId: row.facilityCount > 1
            ? facilityIndexes.map(documentIdAt).join(" ")
            : documentIdAt(firstFacilityIndex),
          referenceDocumentName: "IRS8835",
        },
      ),
    };
  });
  const ordinaryGroup = partIIIGroups.find((group) => group.line === "1f");
  const specifiedGroup = partIIIGroups.find((group) => group.line === "4e");
  const totalRow = (
    tag: string,
    selfEarned: number,
    transferred: number,
    available: number,
    applied: number,
  ): string =>
    elements(tag, [
      element("GeneralBusCrFromNnPssvActyAmt", selfEarned),
      transferred > 0 ? element("CreditTransferElectionAmt", -transferred) : "",
      element("TotalGeneralBusCreditsAmt", available),
      element("TotalGeneralBusCreditsAppTxAmt", applied),
    ]);
  const ordinaryRow = credits.rows.find((row) => row.line === "1f");
  const specifiedRow = credits.rows.find((row) => row.line === "4e");
  const combinedSelfEarned = form8826Credit +
    (ordinaryRow?.selfEarnedCredit ?? 0) +
    (specifiedRow?.selfEarnedCredit ?? 0) + form5884Credit;
  const combinedTransferred = (ordinaryRow?.transferOutAmount ?? 0) +
    (specifiedRow?.transferOutAmount ?? 0);
  return elements("IRS3800", [
    element("CAMTAndBEATInd", "false"),
    element("CreditTransferElectionInd", String(statementIds.length > 0)),
    statementIds.length > 0
      ? element("TransferElectionStatementCnt", statementIds.length, {
        referenceDocumentId: statementIds.join(" "),
        referenceDocumentName: "BinaryAttachment",
      })
      : "",
    element("GeneralBusCrFromNnPssvActyAmt", lines.line6),
    element("CYCreditsNotAllwAgainstTMTAmt", lines.line6),
    element("RegularTaxBeforeCreditsAmt", lines.line7),
    element("AlternativeMinimumTaxAmt", lines.line8),
    element("AdjustedRegTaxBeforeCreditAmt", lines.line9),
    element("ForeignTaxCreditAmt", lines.line10a),
    element("CertainAllowableCreditsAmt", lines.line10b),
    element("TotalTaxCreditsAmt", lines.line10c),
    element("NetIncomeTaxAmt", lines.line11),
    element("NetRegularTaxAmt", lines.line12),
    element("ExcessNetRegularTaxAmt", lines.line13),
    element("TentativeMinimumTaxAmt", lines.line14),
    element("AdjustedExcessNetRegularTaxAmt", lines.line15),
    element("AdjustedNetIncomeTaxAmt", lines.line16),
    element("SmllrCYNotAllwTMTOrTotAdjAmt", lines.line17),
    element("NetIncomeTaxLessPctExcessAmt", lines.line27),
    element("SumSmllrEmpwrZnEmplmnCrAmt", lines.line28),
    element("NetSmllrAndEmpwrZnEmplmnCrAmt", lines.line29),
    element("AllwGenBusCrFromNonPssvActyAmt", lines.line36),
    element("TotAllwGenAndEligSmllBusCrAmt", lines.line36),
    element("SmllrGenBusCrOrTotGenEligCrAmt", lines.line37),
    element("CurrentYearCreditAllowedAmt", lines.line38),
    input.form8826
      ? elements(
        "Form8826CYCreditsGrp",
        [
          form8826NeedsPartV
            ? element("CYGeneralBusinessCrItemCnt", form8826Sources.length)
            : "",
          form8826PassThroughSources.length > 0
            ? element(
              "PassThroughEntityEIN",
              [...form8826PassThroughSources].sort((a, b) =>
                b.credit - a.credit
              )[0].ein,
            )
            : "",
          element("GeneralBusCrFromNnPssvActyAmt", form8826Credit),
          element("TotalGeneralBusCreditsAmt", form8826Credit),
          element("TotalGeneralBusCreditsAppTxAmt", form8826Applied),
        ],
        input.form8826.documentId
          ? {
            referenceDocumentId: input.form8826.documentId,
            referenceDocumentName: "IRS8826",
          }
          : undefined,
      )
      : "",
    ordinaryGroup?.xml ?? "",
    ordinaryRow || input.form8826
      ? totalRow(
        "GenBusCYCreditsSubTotGrp",
        form8826Credit + (ordinaryRow?.selfEarnedCredit ?? 0),
        ordinaryRow?.transferOutAmount ?? 0,
        form8826Credit + (ordinaryRow?.availableCredit ?? 0),
        lines.line17,
      )
      : "",
    input.form5884
      ? elements("Form5884CYCreditsGrp", [
        element("GeneralBusCrFromNnPssvActyAmt", form5884Credit),
        element("TotalGeneralBusCreditsAmt", form5884Credit),
        element(
          "TotalGeneralBusCreditsAppTxAmt",
          input.form5884.appliedCredit,
        ),
      ], {
        referenceDocumentId: input.form5884.documentId,
        referenceDocumentName: "IRS5884",
      })
      : "",
    specifiedGroup?.xml ?? "",
    specifiedRow || input.form5884
      ? totalRow(
        "GenBusCYCreditsSubTot2Grp",
        form5884Credit + (specifiedRow?.selfEarnedCredit ?? 0),
        specifiedRow?.transferOutAmount ?? 0,
        form5884Credit + (specifiedRow?.availableCredit ?? 0),
        lines.line37,
      )
      : "",
    totalRow(
      "TotGenBusCYCreditAmtGrp",
      combinedSelfEarned,
      combinedTransferred,
      form8826Credit + credits.standardCredit + credits.specifiedCredit +
        form5884Credit,
      lines.line38,
    ),
    form8826PartVGroups.length + partVGroups.length > 0
      ? elements("GBCBreakdownCYAggrgtAmtGrp", [
        ...form8826PartVGroups,
        ...partVGroups,
      ])
      : "",
  ]);
}
