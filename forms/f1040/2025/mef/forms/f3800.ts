import { z } from "zod";
import {
  calculateForm3800Nonpassive,
  type Form8835CreditEntry,
} from "../../../nodes/inputs/f3800/calculation.ts";
import { inputSchema as f3800InputSchema } from "../../../nodes/inputs/f3800/index.ts";
import {
  calculateForm8826,
  inputSchema as f8826InputSchema,
} from "../../../nodes/inputs/f8826/index.ts";
import {
  calculateForm8820,
  inputSchema as f8820InputSchema,
} from "../../../nodes/inputs/f8820/index.ts";
import {
  calculateForm8835,
  inputSchema as f8835InputSchema,
} from "../../../nodes/inputs/f8835/index.ts";
import {
  calculateForm5884,
  inputSchema as f5884InputSchema,
} from "../../../nodes/inputs/f5884/index.ts";
import {
  computeCommercialVehicleCreditLines,
  computeNewVehicleCreditParts,
  inputSchema as f8936InputSchema,
} from "../../../nodes/inputs/f8936/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { FilingStatus as MefFilingStatus } from "../../../mef/header.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { buildIRS3800Nonpassive } from "./f3800_nonpassive.ts";

const amount = z.number().finite().nonnegative();
const taxBase = z.object({
  regularTax: amount,
  alternativeMinimumTax: amount,
  foreignTaxCredit: amount,
  priorAllowableCredits: amount,
  tentativeMinimumTax: amount,
  standardCredit: amount,
  specifiedCredit: amount,
});
const taxContextSchema = z.union([
  taxBase.extend({
    filingStatus: z.literal(FilingStatus.MFS),
    spouseHasBusinessCredit: z.boolean(),
  }),
  taxBase.extend({
    filingStatus: z.union([
      z.literal(FilingStatus.Single),
      z.literal(FilingStatus.MFJ),
      z.literal(FilingStatus.HOH),
      z.literal(FilingStatus.QSS),
    ]),
  }),
]);

type PendingForm3800 = Partial<z.infer<typeof f3800InputSchema>> & {
  readonly tax_context?: unknown;
  readonly allowed_credit?: number;
};

function sameMoney(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

const filedReturnSchema = z.object({
  line16_income_tax: amount,
  line17_additional_taxes: amount.optional(),
  line19_child_tax_credit: amount.optional(),
  form8621_tax: amount.optional(),
});
const filedSchedule3Schema = z.object({
  line1_total: amount.optional(),
  line2_childcare_credit: amount.optional(),
  line3_education_credit: amount.optional(),
  line4_retirement_savings_credit: amount.optional(),
  line5a_residential_clean_energy: amount.optional(),
  line5b_energy_efficient_home: amount.optional(),
  line6a_total: amount.optional(),
  line6b_prior_year_min_tax_credit: amount.optional(),
  line6k_tax_credit_bonds: amount.optional(),
  line7_total: amount.optional(),
});
const filedForm6251Schema = z.object({
  line11_amt: amount,
  net_tmt: amount,
});

function reconcileFiledTaxContext(
  tax: z.infer<typeof taxContextSchema>,
  allowedCredit: number,
  context: MefBuildContext,
): void {
  const mefStatus = {
    [FilingStatus.Single]: MefFilingStatus.Single,
    [FilingStatus.MFS]: MefFilingStatus.MarriedFilingSeparately,
    [FilingStatus.MFJ]: MefFilingStatus.MarriedFilingJointly,
    [FilingStatus.HOH]: MefFilingStatus.HeadOfHousehold,
    [FilingStatus.QSS]: MefFilingStatus.QualifyingSurvivingSpouse,
  }[tax.filingStatus];
  if (context.filer && context.filer.filingStatus !== mefStatus) {
    throw new Error("Form 3800 filing status differs from the filed return");
  }
  const form1040 = filedReturnSchema.parse(context.pending?.f1040);
  const schedule3 = filedSchedule3Schema.parse(context.pending?.schedule3);
  const form6251 = filedForm6251Schema.parse(context.pending?.form6251);
  const checks = {
    regularTax: form1040.line16_income_tax +
      (form1040.line17_additional_taxes ?? 0) - form6251.line11_amt -
      (form1040.form8621_tax ?? 0),
    alternativeMinimumTax: form6251.line11_amt,
    tentativeMinimumTax: form6251.net_tmt,
    foreignTaxCredit: schedule3.line1_total ?? 0,
    priorAllowableCredits: (form1040.line19_child_tax_credit ?? 0) +
      (schedule3.line2_childcare_credit ?? 0) +
      (schedule3.line3_education_credit ?? 0) +
      (schedule3.line4_retirement_savings_credit ?? 0) +
      (schedule3.line5a_residential_clean_energy ?? 0) +
      (schedule3.line5b_energy_efficient_home ?? 0) +
      (schedule3.line7_total ?? 0) - (schedule3.line6a_total ?? 0) -
      (schedule3.line6b_prior_year_min_tax_credit ?? 0) -
      (schedule3.line6k_tax_credit_bonds ?? 0),
  };
  for (const [key, value] of Object.entries(checks)) {
    if (
      !Number.isFinite(value) || value < 0 ||
      !sameMoney(tax[key as keyof typeof checks], value)
    ) {
      throw new Error(
        `Form 3800 ${key} does not reconcile to the filed return`,
      );
    }
  }
  if (!sameMoney(schedule3.line6a_total ?? 0, allowedCredit)) {
    throw new Error(
      "Form 3800 allowed credit does not reconcile to Schedule 3 line 6a",
    );
  }
}

function sourceForm8826(
  fields: z.infer<typeof f3800InputSchema>,
  context: MefBuildContext,
) {
  if (!fields.f8826_credit_entries?.length) return undefined;
  const raw = context.pending?.f8826;
  if (!raw) {
    throw new Error(
      "Form 3800 disabled-access credit needs Form 8826 source facts",
    );
  }
  const source = f8826InputSchema.parse(raw);
  const lines = calculateForm8826(source);
  const expected = [
    ...(lines.selfCreditAfterCap > 0
      ? [{
        source_type: "self",
        source_ein: undefined,
        credit_amount: lines.selfCreditAfterCap,
      }]
      : []),
    ...(source.pass_through_credits ?? []).flatMap((entry, index) => {
      const credit = lines.passThroughCreditsAfterCap[index] ?? 0;
      return credit > 0
        ? [{
          source_type: entry.entity_type,
          source_ein: entry.entity_ein,
          credit_amount: credit,
        }]
        : [];
    }),
  ];
  const actual = fields.f8826_credit_entries;
  if (
    actual.length !== expected.length ||
    actual.some((entry, index) => {
      const sourceEntry = expected[index];
      return !sourceEntry || entry.source_type !== sourceEntry.source_type ||
        entry.source_ein !== sourceEntry.source_ein ||
        !sameMoney(entry.credit_amount, sourceEntry.credit_amount) ||
        entry.subject_to_passive_activity_limit;
    })
  ) {
    throw new Error(
      "Form 3800 disabled-access entries do not reconcile to Form 8826 sources",
    );
  }
  return { source, lines };
}

function sourceForm8820(
  fields: z.infer<typeof f3800InputSchema>,
  context: MefBuildContext,
) {
  if (!fields.f8820_credit) return undefined;
  const raw = context.pending?.f8820;
  if (!raw) {
    throw new Error(
      "Form 3800 orphan-drug credit needs Form 8820 source facts",
    );
  }
  const source = f8820InputSchema.parse(raw);
  const lines = calculateForm8820(source);
  const passive =
    (lines.line2c > 0 && source.subject_to_passive_activity_limit) ||
    (source.pass_through_credits ?? []).some((entry) =>
      entry.subject_to_passive_activity_limit
    );
  if (
    !sameMoney(fields.f8820_credit.credit_amount, lines.line4) ||
    fields.f8820_credit.subject_to_passive_activity_limit !==
      passive
  ) {
    throw new Error(
      "Form 3800 orphan-drug credit does not reconcile to Form 8820",
    );
  }
  return { source, lines };
}

function sourceForm8835(
  fields: z.infer<typeof f3800InputSchema>,
  context: MefBuildContext,
): readonly Form8835CreditEntry[] {
  if (!fields.f8835_credit_entries?.length) return [];
  const raw = context.pending?.f8835;
  if (!raw) {
    throw new Error("Form 3800 production credit needs Form 8835 source facts");
  }
  const source = f8835InputSchema.parse(raw);
  const expected: Form8835CreditEntry[] = source.f8835s.map((item) => {
    const lines = calculateForm8835(item);
    return {
      form3800_line: lines.form3800Line,
      credit_amount: lines.line15,
      transfer_out_amount: item.transfer_election_amount ?? 0,
      registration_number: item.registration_number,
      subject_to_passive_activity_limit: item.subject_to_passive_activity_limit,
      transfer_election_statement_file_name:
        item.transfer_election_statement_file_name,
    };
  });
  const actual = fields.f8835_credit_entries;
  if (
    actual.length !== expected.length ||
    actual.some((entry, index) => {
      const sourceEntry = expected[index];
      return !sourceEntry ||
        entry.form3800_line !== sourceEntry.form3800_line ||
        !sameMoney(entry.credit_amount, sourceEntry.credit_amount) ||
        !sameMoney(
          entry.transfer_out_amount,
          sourceEntry.transfer_out_amount,
        ) ||
        entry.registration_number !== sourceEntry.registration_number ||
        entry.subject_to_passive_activity_limit !==
          sourceEntry.subject_to_passive_activity_limit ||
        entry.transfer_election_statement_file_name !==
          sourceEntry.transfer_election_statement_file_name;
    })
  ) {
    throw new Error(
      "Form 3800 production entries do not reconcile to Form 8835 facilities",
    );
  }
  return expected;
}

function sourceForm5884(
  fields: z.infer<typeof f3800InputSchema>,
  context: MefBuildContext,
) {
  if (!fields.f5884_credit || fields.f5884_credit.credit_amount <= 0) {
    return undefined;
  }
  const raw = context.pending?.f5884;
  if (!raw) {
    throw new Error(
      "Form 3800 work opportunity credit needs Form 5884 source facts",
    );
  }
  const source = f5884InputSchema.parse(raw);
  const lines = calculateForm5884(source);
  if (
    (lines.line2 > 0 && source.subject_to_passive_activity_limit) ||
    (source.pass_through_credits ?? []).some((entry) =>
      entry.credit_amount > 0 && entry.subject_to_passive_activity_limit
    ) ||
    fields.f5884_credit.subject_to_passive_activity_limit ||
    !sameMoney(fields.f5884_credit.credit_amount, lines.line4)
  ) {
    throw new Error(
      "Form 3800 work opportunity entry does not reconcile to Form 5884 source",
    );
  }
  return { source, lines, credit: lines.line4 };
}

function sourceForm8936(
  fields: z.infer<typeof f3800InputSchema>,
  context: MefBuildContext,
) {
  const claimed = fields.f8936_new_vehicle_credit;
  if (!claimed || claimed.credit_amount <= 0) return undefined;
  const raw = context.pending?.f8936;
  if (!raw) {
    throw new Error(
      "Form 3800 clean vehicle credit needs Form 8936 source facts",
    );
  }
  const source = f8936InputSchema.parse(raw);
  const credit = source.f8936s.reduce((sum, item) => {
    if (item.credit_kind !== "new_clean_vehicle") return sum;
    const amount = computeNewVehicleCreditParts(item, source).business;
    if (amount <= 0) return sum;
    if (
      item.transferred_to_dealer === true ||
      item.business_credit_subject_to_passive_activity_limit !== false
    ) {
      throw new Error(
        "Form 3800 clean vehicle source needs nontransferred nonpassive business use",
      );
    }
    return sum + amount;
  }, 0);
  if (
    claimed.subject_to_passive_activity_limit ||
    !sameMoney(claimed.credit_amount, credit)
  ) {
    throw new Error(
      "Form 3800 line 1y does not reconcile to Form 8936 business credit",
    );
  }
  return { source, credit };
}

function sourceForm8936Commercial(
  fields: z.infer<typeof f3800InputSchema>,
  context: MefBuildContext,
) {
  const claimed = fields.f8936_commercial_vehicle_credit;
  if (!claimed || claimed.credit_amount <= 0) return undefined;
  const raw = context.pending?.f8936;
  if (!raw) {
    throw new Error(
      "Form 3800 commercial vehicle credit needs Form 8936 source facts",
    );
  }
  const source = f8936InputSchema.parse(raw);
  const credit = source.f8936s.reduce((sum, item) => {
    if (item.credit_kind !== "qualified_commercial_clean_vehicle") return sum;
    const amount = computeCommercialVehicleCreditLines(item).line26Credit;
    if (amount <= 0) return sum;
    if (item.business_credit_subject_to_passive_activity_limit !== false) {
      throw new Error(
        "Form 3800 commercial vehicle source needs nonpassive business use",
      );
    }
    return sum + amount;
  }, 0);
  if (
    claimed.subject_to_passive_activity_limit ||
    !sameMoney(claimed.credit_amount, credit)
  ) {
    throw new Error(
      "Form 3800 line 1aa does not reconcile to Form 8936 commercial credit",
    );
  }
  return { source, credit };
}

function form8826SourceAllocations(
  source: ReturnType<typeof sourceForm8826>,
  appliedCredit: number,
  explicit: readonly number[] | undefined,
): readonly number[] | undefined {
  if (!source) {
    if (explicit !== undefined) {
      throw new Error("Form 3800 has Form 8826 allocations without a source");
    }
    return undefined;
  }
  const amounts = [
    ...(source.lines.selfCreditAfterCap > 0
      ? [source.lines.selfCreditAfterCap]
      : []),
    ...source.lines.passThroughCreditsAfterCap.filter((credit) => credit > 0),
  ];
  if (amounts.length <= 1) return explicit;
  if (explicit !== undefined) return explicit;
  if (sameMoney(appliedCredit, 0)) return amounts.map(() => 0);
  if (sameMoney(appliedCredit, source.lines.line8)) return amounts;
  throw new Error(
    "Form 3800 needs Part V applied amounts for each Form 8826 source",
  );
}

function form5884SourceAllocations(
  source: ReturnType<typeof sourceForm5884>,
  appliedCredit: number,
  explicit: readonly number[] | undefined,
): readonly number[] | undefined {
  if (!source) {
    if (explicit !== undefined) {
      throw new Error("Form 3800 has Form 5884 allocations without a source");
    }
    return undefined;
  }
  const amounts = [
    ...(source.lines.line2 > 0 ? [source.lines.line2] : []),
    ...(source.source.pass_through_credits ?? []).flatMap((entry) =>
      entry.credit_amount > 0 ? [entry.credit_amount] : []
    ),
  ];
  if (amounts.length <= 1) return explicit;
  if (explicit !== undefined) return explicit;
  if (sameMoney(appliedCredit, 0)) return amounts.map(() => 0);
  if (sameMoney(appliedCredit, source.credit)) return amounts;
  throw new Error(
    "Form 3800 needs Part V applied amounts for each Form 5884 source",
  );
}

function form8820SourceAllocations(
  source: ReturnType<typeof sourceForm8820>,
  appliedCredit: number,
  explicit: readonly number[] | undefined,
): readonly number[] | undefined {
  if (!source) {
    if (explicit !== undefined) {
      throw new Error("Form 3800 has Form 8820 allocations without a source");
    }
    return undefined;
  }
  const amounts = [
    ...(source.lines.line2c > 0 ? [source.lines.line2c] : []),
    ...(source.source.pass_through_credits ?? []).map((entry) =>
      entry.credit_amount
    ),
  ];
  if (amounts.length <= 1) return explicit;
  if (explicit !== undefined) return explicit;
  if (sameMoney(appliedCredit, 0)) return amounts.map(() => 0);
  if (sameMoney(appliedCredit, source.lines.line4)) return amounts;
  throw new Error(
    "Form 3800 needs Part V applied amounts for each Form 8820 source",
  );
}

function form8835FacilityAllocations(
  facilities: readonly Form8835CreditEntry[],
  standardApplied: number,
  specifiedApplied: number,
  explicit: readonly number[] | undefined,
): readonly number[] {
  if (explicit !== undefined) return explicit;
  const result = facilities.map(() => 0);
  for (
    const [line, totalApplied] of [["1f", standardApplied], [
      "4e",
      specifiedApplied,
    ]] as const
  ) {
    const indexes = facilities.flatMap((facility, index) =>
      facility.form3800_line === line ? [index] : []
    );
    const available = indexes.map((index) =>
      facilities[index].credit_amount - facilities[index].transfer_out_amount
    );
    const totalAvailable = available.reduce((sum, credit) => sum + credit, 0);
    if (
      indexes.length > 1 && totalApplied > 0 &&
      !sameMoney(totalApplied, totalAvailable)
    ) {
      throw new Error(
        `Form 3800 needs Part V applied amounts for each Form 8835 line ${line} facility`,
      );
    }
    for (const [position, index] of indexes.entries()) {
      result[index] = indexes.length === 1
        ? totalApplied
        : sameMoney(totalApplied, 0)
        ? 0
        : available[position];
    }
  }
  return result;
}

export const form3800: MefFormDescriptor<"f3800", PendingForm3800> = {
  pendingKey: "f3800",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f3800.pdf",
  build(fields, context = {}) {
    const hasLegacyCredit = fields.f3800s?.some((entry) =>
      Object.values(entry).some((value) =>
        typeof value === "number" && value > 0
      )
    );
    if (hasLegacyCredit) {
      throw new Error(
        "Form 3800 legacy credit cannot be exported without source-backed calculation",
      );
    }
    const hasSourceCredit = fields.allowed_credit !== undefined ||
      fields.f8826_credit_entries?.some((entry) => entry.credit_amount > 0) ||
      (fields.f8820_credit?.credit_amount ?? 0) > 0 ||
      fields.f8835_credit_entries?.some((entry) => entry.credit_amount > 0) ||
      (fields.f5884_credit?.credit_amount ?? 0) > 0 ||
      (fields.f8936_new_vehicle_credit?.credit_amount ?? 0) > 0 ||
      (fields.f8936_commercial_vehicle_credit?.credit_amount ?? 0) > 0;
    if (!hasSourceCredit) return "";
    if (
      fields.tax_context === undefined || fields.allowed_credit === undefined
    ) {
      throw new Error(
        "Form 3800 source credit needs finalized Part II tax context",
      );
    }
    const tax = taxContextSchema.parse(fields.tax_context);
    const lines = calculateForm3800Nonpassive(tax);
    if (!sameMoney(fields.allowed_credit, lines.line38)) {
      throw new Error(
        "Form 3800 allowed credit does not reconcile to finalized Part II",
      );
    }
    const parsed = f3800InputSchema.parse(fields);
    if (!context.documentIdsByPendingKey) {
      // The bundle's first pass reserves document IDs; the second builds links.
      return "<IRS3800><CAMTAndBEATInd>false</CAMTAndBEATInd></IRS3800>";
    }
    reconcileFiledTaxContext(tax, fields.allowed_credit, context);
    if (
      tax.standardCredit > 0 &&
      context.documentIdsByPendingKey.form6251?.length !== 1
    ) {
      throw new Error("Form 3800 ordinary credit needs attached Form 6251");
    }
    const form8826 = sourceForm8826(parsed, context);
    const form8820 = sourceForm8820(parsed, context);
    const facilities = sourceForm8835(parsed, context);
    const form5884 = sourceForm5884(parsed, context);
    const form8936 = sourceForm8936(parsed, context);
    const form8936Commercial = sourceForm8936Commercial(parsed, context);
    const form8826Credit = form8826?.lines.line8 ?? 0;
    const form8820Credit = form8820?.lines.line4 ?? 0;
    const otherOrdinaryCredit = form8826Credit + form8820Credit +
      facilities.reduce(
        (sum, facility) =>
          sum +
          (facility.form3800_line === "1f"
            ? facility.credit_amount - facility.transfer_out_amount
            : 0),
        0,
      );
    let form8936Applied = parsed.form8936_applied_credit;
    if (form8936 && form8936Applied === undefined) {
      const sharedPartialLimit =
        (otherOrdinaryCredit > 0 || form8936Commercial !== undefined) &&
        lines.line17 > 0 && !sameMoney(lines.line17, tax.standardCredit);
      if (sharedPartialLimit) {
        throw new Error(
          "Form 3800 needs the applied-credit split for Form 8936 line 1y",
        );
      }
      form8936Applied = Math.min(form8936.credit, lines.line17);
    }
    if (!form8936 && parsed.form8936_applied_credit !== undefined) {
      throw new Error("Form 3800 has a Form 8936 allocation without a source");
    }
    let form8936CommercialApplied = parsed.form8936_commercial_applied_credit;
    if (form8936Commercial && form8936CommercialApplied === undefined) {
      const otherCredit = otherOrdinaryCredit + (form8936?.credit ?? 0);
      const partialLimit = otherCredit > 0 && lines.line17 > 0 &&
        !sameMoney(lines.line17, tax.standardCredit);
      if (partialLimit) {
        throw new Error(
          "Form 3800 needs the applied-credit split for Form 8936 line 1aa",
        );
      }
      form8936CommercialApplied = Math.min(
        form8936Commercial.credit,
        Math.max(0, lines.line17 - (form8936Applied ?? 0)),
      );
    }
    if (
      !form8936Commercial &&
      parsed.form8936_commercial_applied_credit !== undefined
    ) {
      throw new Error(
        "Form 3800 has a commercial Form 8936 allocation without a source",
      );
    }
    let form8820Applied = parsed.form8820_applied_credit;
    if (form8820 && form8820Applied === undefined) {
      const otherCredit = tax.standardCredit - form8820Credit;
      if (
        otherCredit > 0 && lines.line17 > 0 &&
        !sameMoney(lines.line17, tax.standardCredit)
      ) {
        throw new Error(
          "Form 3800 needs the applied-credit split for Form 8820 line 1h",
        );
      }
      form8820Applied = Math.min(
        form8820Credit,
        Math.max(
          0,
          lines.line17 - (form8936Applied ?? 0) -
            (form8936CommercialApplied ?? 0),
        ),
      );
    }
    if (!form8820 && parsed.form8820_applied_credit !== undefined) {
      throw new Error("Form 3800 has a Form 8820 allocation without a source");
    }
    if (!form8820 && parsed.form8820_applied_credits_by_source !== undefined) {
      throw new Error(
        "Form 3800 has Form 8820 source allocations without a source",
      );
    }
    if (form8820Applied !== undefined && form8820Applied > form8820Credit) {
      throw new Error(
        "Form 3800 Form 8820 allocation exceeds its source credit",
      );
    }
    const form8826Applied = Math.min(
      form8826Credit,
      Math.max(
        0,
        lines.line17 - (form8820Applied ?? 0) - (form8936Applied ?? 0) -
          (form8936CommercialApplied ?? 0),
      ),
    );
    const form8826Ids = context.documentIdsByPendingKey.f8826 ?? [];
    const selfEarned = (form8826?.lines.line6 ?? 0) > 0;
    if (selfEarned ? form8826Ids.length !== 1 : form8826Ids.length !== 0) {
      throw new Error(
        "Form 3800 Form 8826 document count does not match self-earned source",
      );
    }
    const form8820Ids = context.documentIdsByPendingKey.f8820 ?? [];
    const form8820Filed = form8820 &&
      (form8820.lines.line2c > 0 ||
        form8820.source.reduced_section280c_credit_election);
    if (form8820Ids.length !== (form8820Filed ? 1 : 0)) {
      throw new Error(
        "Form 3800 Form 8820 document count differs from the filed source",
      );
    }
    const form8835Ids = context.documentIdsByPendingKey.f8835 ?? [];
    if (form8835Ids.length !== facilities.length) {
      throw new Error("Form 3800 needs one attached Form 8835 per facility");
    }
    const form5884Ids = context.documentIdsByPendingKey.f5884 ?? [];
    if (
      form5884Ids.length !==
        (form5884 && form5884.lines.line2 > 0 ? 1 : 0)
    ) {
      throw new Error(
        "Form 3800 Form 5884 document count does not match self-earned source",
      );
    }
    const form8936Ids = context.documentIdsByPendingKey.f8936 ?? [];
    if ((form8936 || form8936Commercial) && form8936Ids.length !== 1) {
      throw new Error(
        "Form 3800 Form 8936 document count does not match its source",
      );
    }
    const form5884Applied = form5884
      ? parsed.form5884_applied_credit ??
        (facilities.some((facility) => facility.form3800_line === "4e") &&
            lines.line37 > 0 &&
            !sameMoney(lines.line37, tax.specifiedCredit)
          ? undefined
          : Math.min(form5884.credit, lines.line37))
      : undefined;
    if (form5884 && form5884Applied === undefined) {
      throw new Error(
        "Form 3800 needs the applied-credit split between Form 5884 and Form 8835",
      );
    }
    if (!form5884 && parsed.form5884_applied_credit !== undefined) {
      throw new Error("Form 3800 has a Form 5884 allocation without a source");
    }
    return buildIRS3800Nonpassive({
      tax,
      form5884: form5884
        ? {
          credit: form5884.credit,
          documentId: form5884Ids[0],
          appliedCredit: form5884Applied,
          sources: [
            ...(form5884.lines.line2 > 0
              ? [{ credit: form5884.lines.line2 }]
              : []),
            ...(form5884.source.pass_through_credits ?? []).flatMap((entry) =>
              entry.credit_amount > 0
                ? [{ credit: entry.credit_amount, ein: entry.entity_ein }]
                : []
            ),
          ],
          appliedCreditsBySource: form5884SourceAllocations(
            form5884,
            form5884Applied,
            parsed.form5884_applied_credits_by_source,
          ),
        }
        : undefined,
      form8826: form8826
        ? {
          source: form8826.source,
          documentId: form8826Ids[0],
          appliedCredit: form8826Applied,
          appliedCreditsBySource: form8826SourceAllocations(
            form8826,
            form8826Applied,
            parsed.form8826_applied_credits_by_source,
          ),
        }
        : undefined,
      form8820: form8820
        ? {
          credit: form8820Credit,
          documentId: form8820Ids[0],
          appliedCredit: form8820Applied!,
          sources: [
            ...(form8820.lines.line2c > 0
              ? [{ credit: form8820.lines.line2c }]
              : []),
            ...(form8820.source.pass_through_credits ?? []).map((entry) => ({
              credit: entry.credit_amount,
              ein: entry.entity_ein,
            })),
          ],
          appliedCreditsBySource: form8820SourceAllocations(
            form8820,
            form8820Applied!,
            parsed.form8820_applied_credits_by_source,
          ),
        }
        : undefined,
      form8936: form8936
        ? {
          credit: form8936.credit,
          documentId: form8936Ids[0],
          appliedCredit: form8936Applied!,
        }
        : undefined,
      form8936Commercial: form8936Commercial
        ? {
          credit: form8936Commercial.credit,
          documentId: form8936Ids[0],
          appliedCredit: form8936CommercialApplied!,
        }
        : undefined,
      facilities,
      form8835DocumentIds: form8835Ids,
      appliedCreditsByFacility: form8835FacilityAllocations(
        facilities,
        lines.line17 - form8826Applied - (form8820Applied ?? 0) -
          (form8936Applied ?? 0) -
          (form8936CommercialApplied ?? 0),
        lines.line37 - (form5884Applied ?? 0),
        parsed.form8835_applied_credits_by_facility,
      ),
      transferStatementIdsByFileName: context.documentIdsByAttachmentFileName ??
        {},
    });
  },
};
