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
  calculateForm8835,
  inputSchema as f8835InputSchema,
} from "../../../nodes/inputs/f8835/index.ts";
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
      fields.f8835_credit_entries?.some((entry) => entry.credit_amount > 0);
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
    const facilities = sourceForm8835(parsed, context);
    const form8826Credit = form8826?.lines.line8 ?? 0;
    const form8826Applied = Math.min(form8826Credit, lines.line17);
    const form8826Ids = context.documentIdsByPendingKey.f8826 ?? [];
    const selfEarned = (form8826?.lines.line6 ?? 0) > 0;
    if (selfEarned ? form8826Ids.length !== 1 : form8826Ids.length !== 0) {
      throw new Error(
        "Form 3800 Form 8826 document count does not match self-earned source",
      );
    }
    const form8835Ids = context.documentIdsByPendingKey.f8835 ?? [];
    if (form8835Ids.length !== facilities.length) {
      throw new Error("Form 3800 needs one attached Form 8835 per facility");
    }
    return buildIRS3800Nonpassive({
      tax,
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
      facilities,
      form8835DocumentIds: form8835Ids,
      appliedCreditsByFacility: form8835FacilityAllocations(
        facilities,
        lines.line17 - form8826Applied,
        lines.line37,
        parsed.form8835_applied_credits_by_facility,
      ),
      transferStatementIdsByFileName: context.documentIdsByAttachmentFileName ??
        {},
    });
  },
};
