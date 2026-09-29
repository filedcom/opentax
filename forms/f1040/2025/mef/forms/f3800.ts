import { z } from "zod";
import {
  allocateForm3800SourceTaxUse,
  calculateForm3800Nonpassive,
  classifyForm3800PassiveCredits,
  form3800NonpassiveCreditUseRows,
  type Form8835CreditEntry,
} from "../../../nodes/inputs/f3800/calculation.ts";
import { inputSchema as f3800InputSchema } from "../../../nodes/inputs/f3800/index.ts";
import { allocateDisabledAccessLine1eCredits } from "../../../nodes/inputs/f3800/disabled-access.ts";
import {
  calculateForm8582CR,
  inputSchema as f8582crInputSchema,
  PassiveCreditReportingRoute,
} from "../../../nodes/intermediate/forms/form8582cr/index.ts";
import {
  calculateForm8826,
  inputSchema as f8826InputSchema,
  isEligible as isForm8826Eligible,
} from "../../../nodes/inputs/f8826/index.ts";
import {
  calculateForm8820,
  inputSchema as f8820InputSchema,
} from "../../../nodes/inputs/f8820/index.ts";
import {
  calculateForm8874,
  inputSchema as f8874InputSchema,
} from "../../../nodes/inputs/f8874/index.ts";
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
import {
  buildIRS3800Document,
  type Form3800DocumentParts,
} from "./f3800_document.ts";
import { joinForm3800DocumentParts } from "./f3800_join.ts";
import { buildForm3800NonpassiveParts } from "./f3800_nonpassive.ts";
import { sameForm3800PassiveAllocations } from "./f3800_passive_link.ts";
import { buildForm3800PassiveRowXml } from "./f3800_passive_rows.ts";
import { reconcileDisabledAccessK1Credits } from "./f8826_credit_evidence.ts";
import { readDisabledAccessCapLedger } from "./f8826_cap_ledger.ts";
import { inputSchema as trustK1InputSchema } from "../../../nodes/inputs/k1_trust/index.ts";
import { inputSchema as partnershipK1InputSchema } from "../../../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as sCorpK1InputSchema } from "../../../nodes/inputs/k1_s_corp/index.ts";
import { reconcileNewMarketsK1Credits } from "./f8874_credit_evidence.ts";

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

function reconcilePassiveSources(
  fields: z.infer<typeof f3800InputSchema>,
  context: MefBuildContext,
): void {
  const sources = fields.passive_source_allocations ?? [];
  if (sources.length === 0) return;
  if (context.documentIdsByPendingKey?.form8582cr?.length !== 1) {
    throw new Error("Form 3800 passive credit needs one attached Form 8582-CR");
  }
  const filedSource = f8582crInputSchema.parse(context.pending?.form8582cr);
  const calculated = calculateForm8582CR(filedSource).sourceAllocations.filter(
    (source) => source.reporting_route !== PassiveCreditReportingRoute.Form8834,
  );
  if (!sameForm3800PassiveAllocations(sources, calculated)) {
    throw new Error(
      "Form 3800 passive credit sources differ from filed Form 8582-CR",
    );
  }
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
  const ledger = readDisabledAccessCapLedger(context);
  const actual = fields.f8826_credit_entries ?? [];
  if (actual.length === 0 && !ledger?.rawEntries.length) return undefined;
  const sourceEntries = ledger?.rawEntries ?? actual;
  const formSources = sourceEntries.filter((entry) =>
    entry.source_type === "self" ||
    ((entry.source_type === "partnership" ||
      entry.source_type === "s_corporation") &&
      !entry.source_document_reference)
  );
  const directSources = sourceEntries.filter((entry) =>
    entry.source_type === "estate" || entry.source_type === "trust" ||
    ((entry.source_type === "partnership" ||
      entry.source_type === "s_corporation") &&
      Boolean(entry.source_document_reference))
  );
  const raw = context.pending?.f8826;
  if (formSources.length > 0 && !raw) {
    throw new Error(
      "Form 3800 disabled-access credit needs Form 8826 source facts",
    );
  }
  const source = raw ? f8826InputSchema.parse(raw) : undefined;
  const lines = source ? calculateForm8826(source) : undefined;
  if (
    directSources.some((entry) =>
      source?.pass_through_credits?.some((other) =>
        entry.source_type === other.entity_type &&
        entry.source_ein === other.entity_ein &&
        entry.source_document_reference === other.source_document_reference
      )
    )
  ) {
    throw new Error(
      "Form 3800 disabled-access K-1 source is duplicated on Form 8826",
    );
  }
  const expected = source && lines
    ? [
      ...(!source.subject_to_passive_activity_limit &&
          (ledger ? lines.line6 : lines.selfCreditAfterCap) > 0
        ? [{
          source_type: "self",
          source_ein: undefined,
          credit_amount: ledger ? lines.line6 : lines.selfCreditAfterCap,
          subject_to_passive_activity_limit:
            source.subject_to_passive_activity_limit,
        }]
        : []),
      ...(source.pass_through_credits ?? []).flatMap((entry, index) => {
        if (entry.subject_to_passive_activity_limit) return [];
        const credit = ledger
          ? entry.credit_amount
          : lines.passThroughCreditsAfterCap[index] ?? 0;
        return credit > 0
          ? [{
            source_type: entry.entity_type,
            source_ein: entry.entity_ein,
            credit_amount: credit,
            subject_to_passive_activity_limit:
              entry.subject_to_passive_activity_limit,
          }]
          : [];
      }),
    ]
    : [];
  if (
    formSources.length !== expected.length ||
    formSources.some((entry, index) => {
      const sourceEntry = expected[index];
      return !sourceEntry || entry.source_type !== sourceEntry.source_type ||
        entry.source_ein !== sourceEntry.source_ein ||
        !sameMoney(entry.credit_amount, sourceEntry.credit_amount) ||
        sourceEntry.subject_to_passive_activity_limit ||
        entry.subject_to_passive_activity_limit;
    })
  ) {
    throw new Error(
      "Form 3800 disabled-access entries do not reconcile to Form 8826 sources",
    );
  }
  if (directSources.length > 0 && !ledger) {
    if (!context.pending) {
      throw new Error("Form 3800 estate/trust credit needs its K-1 source");
    }
    reconcileDisabledAccessK1Credits(
      directSources.map((entry) => {
        if (
          entry.source_type === "self" ||
          !entry.source_ein || !entry.source_document_reference ||
          ((entry.source_type === "estate" || entry.source_type === "trust") &&
            !entry.source_statement_reference)
        ) {
          throw new Error(
            "Form 3800 K-1 disabled-access source is incomplete",
          );
        }
        return {
          source_type: entry.source_type,
          entity_ein: entry.source_ein,
          source_document_reference: entry.source_document_reference,
          source_statement_reference: entry.source_statement_reference,
          credit_amount: entry.credit_amount,
          subject_to_passive_activity_limit:
            entry.subject_to_passive_activity_limit,
        };
      }),
      context.pending,
    );
  }
  if (actual.length === 0) return undefined;
  const cappedAmounts = allocateDisabledAccessLine1eCredits(
    actual.map((entry) => entry.credit_amount),
  );
  const credit = cappedAmounts.reduce((sum, amount) => sum + amount, 0);
  return {
    source,
    lines,
    credit,
    sources: actual.flatMap((entry, index) => {
      const amount = cappedAmounts[index] ?? 0;
      return amount > 0 ? [{ credit: amount, ein: entry.source_ein }] : [];
    }),
  };
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

function sourceForm8874(
  fields: z.infer<typeof f3800InputSchema>,
  context: MefBuildContext,
) {
  if (!fields.f8874_credit) return undefined;
  const raw = context.pending?.f8874;
  if (!raw) {
    throw new Error(
      "Form 3800 new-markets credit needs Form 8874 source facts",
    );
  }
  const source = f8874InputSchema.parse(raw);
  const lines = calculateForm8874(source);
  if (
    !sameMoney(fields.f8874_credit.credit_amount, lines.nonpassiveCredit) ||
    fields.f8874_credit.subject_to_passive_activity_limit !== false
  ) {
    throw new Error("Form 3800 new-markets credit differs from Form 8874");
  }
  return { source, lines, credit: lines.nonpassiveCredit };
}

function sourceOrphanDrugK1Credits(
  fields: z.infer<typeof f3800InputSchema>,
  context: MefBuildContext,
) {
  const entries = fields.f8820_k1_credit_entries ?? [];
  if (entries.length === 0) return [];
  const partnershipK1s =
    entries.some((entry) => entry.source_type === "partnership")
      ? partnershipK1InputSchema.parse(context.pending?.k1_partnership)
        .k1_partnerships
      : [];
  const sCorpK1s =
    entries.some((entry) => entry.source_type === "s_corporation")
      ? sCorpK1InputSchema.parse(context.pending?.k1_s_corp).k1_s_corps
      : [];
  const trustK1s =
    entries.some((entry) =>
        entry.source_type === "estate" || entry.source_type === "trust"
      )
      ? trustK1InputSchema.parse(context.pending?.k1_trust).k1_trusts
      : [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.subject_to_passive_activity_limit) {
      throw new Error(
        "Orphan-drug K-1 passive credit needs Form 8582-CR before Form 3800",
      );
    }
    const key = [
      entry.source_type,
      entry.source_ein,
      entry.source_document_reference,
    ].join(":");
    if (seen.has(key)) {
      throw new Error("Form 3800 orphan-drug K-1 source is duplicated");
    }
    seen.add(key);
    if (entry.source_type === "partnership") {
      const matches = partnershipK1s.filter((k1) =>
        k1.partnership_ein === entry.source_ein &&
        k1.source_document_reference === entry.source_document_reference
      );
      if (
        matches.length !== 1 ||
        matches[0].box15_code_z_orphan_drug_credit !== entry.credit_amount ||
        matches[0].orphan_drug_credit_subject_to_passive_activity_limit !==
          entry.subject_to_passive_activity_limit
      ) {
        throw new Error(
          "Form 3800 orphan-drug credit does not reconcile to partnership K-1 box 15 code Z",
        );
      }
    } else if (entry.source_type === "s_corporation") {
      const matches = sCorpK1s.filter((k1) =>
        k1.corporation_ein === entry.source_ein &&
        k1.source_document_reference === entry.source_document_reference
      );
      if (
        matches.length !== 1 ||
        matches[0].box13_code_z_orphan_drug_credit !== entry.credit_amount ||
        matches[0].orphan_drug_credit_subject_to_passive_activity_limit !==
          entry.subject_to_passive_activity_limit
      ) {
        throw new Error(
          "Form 3800 orphan-drug credit does not reconcile to S-corporation K-1 box 13 code Z",
        );
      }
    } else {
      const matches = trustK1s.filter((k1) =>
        k1.entity_type === entry.source_type &&
        k1.estate_trust_ein === entry.source_ein &&
        k1.source_document_reference === entry.source_document_reference
      );
      if (
        matches.length !== 1 ||
        matches[0].box13_code_m_orphan_drug_credit !== entry.credit_amount ||
        matches[0].orphan_drug_credit_subject_to_passive_activity_limit !==
          entry.subject_to_passive_activity_limit
      ) {
        throw new Error(
          "Form 3800 orphan-drug credit does not reconcile to estate/trust K-1 box 13 code M",
        );
      }
    }
  }
  return entries;
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
  const amounts = source.sources.map((entry) => entry.credit);
  if (amounts.length <= 1) return explicit;
  if (explicit !== undefined) return explicit;
  if (sameMoney(appliedCredit, 0)) return amounts.map(() => 0);
  if (sameMoney(appliedCredit, source.credit)) return amounts;
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

function nonpassiveSourceAllocations(
  form: "8820" | "8874",
  amounts: readonly number[],
  credit: number,
  appliedCredit: number,
  explicit: readonly number[] | undefined,
): readonly number[] | undefined {
  if (amounts.length === 0) {
    if (explicit !== undefined) {
      throw new Error(
        `Form 3800 has Form ${form} allocations without a source`,
      );
    }
    return undefined;
  }
  if (amounts.length <= 1) return explicit;
  if (explicit !== undefined) return explicit;
  if (sameMoney(appliedCredit, 0)) return amounts.map(() => 0);
  if (sameMoney(appliedCredit, credit)) return amounts;
  throw new Error(
    `Form 3800 needs Part V applied amounts for each Form ${form} source`,
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

function prepareForm3800Base(fields: PendingForm3800) {
  const hasLegacyCredit = fields.f3800s?.some((entry) =>
    Object.values(entry).some((value) => typeof value === "number" && value > 0)
  );
  if (hasLegacyCredit) {
    throw new Error(
      "Form 3800 legacy credit cannot be exported without source-backed calculation",
    );
  }
  const hasSourceCredit = fields.allowed_credit !== undefined ||
    fields.f8826_credit_entries?.some((entry) => entry.credit_amount > 0) ||
    (fields.f8820_credit?.credit_amount ?? 0) > 0 ||
    (fields.f8874_credit?.credit_amount ?? 0) > 0 ||
    fields.f8874_k1_credit_entries?.some((entry) => entry.credit_amount > 0) ||
    fields.f8820_k1_credit_entries?.some((entry) => entry.credit_amount > 0) ||
    fields.f8835_credit_entries?.some((entry) => entry.credit_amount > 0) ||
    (fields.f5884_credit?.credit_amount ?? 0) > 0 ||
    (fields.f8936_new_vehicle_credit?.credit_amount ?? 0) > 0 ||
    (fields.f8936_commercial_vehicle_credit?.credit_amount ?? 0) > 0 ||
    Boolean(fields.passive_source_allocations?.length);
  if (!hasSourceCredit) return undefined;
  if (fields.tax_context === undefined || fields.allowed_credit === undefined) {
    throw new Error(
      "Form 3800 source credit needs finalized Part II tax context",
    );
  }
  const tax = taxContextSchema.parse(fields.tax_context);
  const parsed = f3800InputSchema.parse(fields);
  const passiveActivity = classifyForm3800PassiveCredits(
    parsed.passive_source_allocations ?? [],
  );
  const lines = calculateForm3800Nonpassive(tax, passiveActivity);
  if (!sameMoney(fields.allowed_credit, lines.line38)) {
    throw new Error(
      "Form 3800 allowed credit does not reconcile to finalized Part II",
    );
  }
  return {
    tax,
    parsed,
    passiveActivity,
    lines,
    allowedCredit: fields.allowed_credit,
  };
}

/** Prepare the exact source-linked parts serialized by the linked MeF pass. */
export function prepareForm3800DocumentParts(
  fields: PendingForm3800,
  context: MefBuildContext,
): Form3800DocumentParts | undefined {
  const base = prepareForm3800Base(fields);
  if (!base) return undefined;
  if (!context.documentIdsByPendingKey) {
    throw new Error("Form 3800 preparation needs reserved document IDs");
  }
  const { tax, parsed, passiveActivity, lines, allowedCredit } = base;
  reconcileFiledTaxContext(tax, allowedCredit, context);
  reconcilePassiveSources(parsed, context);
  if (
    lines.line6 > 0 &&
    context.documentIdsByPendingKey.form6251?.length !== 1
  ) {
    throw new Error("Form 3800 ordinary credit needs attached Form 6251");
  }
  const form8826 = sourceForm8826(parsed, context);
  const form8820 = sourceForm8820(parsed, context);
  const form8874 = sourceForm8874(parsed, context);
  const newMarketsK1Credits = parsed.f8874_k1_credit_entries ?? [];
  reconcileNewMarketsK1Credits(newMarketsK1Credits, context.pending ?? {});
  const orphanDrugK1Credits = sourceOrphanDrugK1Credits(
    parsed,
    context,
  );
  const facilities = sourceForm8835(parsed, context);
  const form5884 = sourceForm5884(parsed, context);
  const form8936 = sourceForm8936(parsed, context);
  const form8936Commercial = sourceForm8936Commercial(parsed, context);
  const form8826Credit = form8826?.credit ?? 0;
  const form8820Sources = [
    ...(form8820?.lines.line2c ? [{ credit: form8820.lines.line2c }] : []),
    ...(form8820?.source.pass_through_credits ?? []).map((entry) => ({
      credit: entry.credit_amount,
      ein: entry.entity_ein,
    })),
    ...orphanDrugK1Credits.map((entry) => ({
      credit: entry.credit_amount,
      ein: entry.source_ein,
    })),
  ];
  const form8820Credit = form8820Sources.reduce(
    (sum, source) => sum + source.credit,
    0,
  );
  const form8874Sources = [
    ...(form8874 ? [{ credit: form8874.credit }] : []),
    ...newMarketsK1Credits.map((entry) => ({
      credit: entry.credit_amount,
      ein: entry.source_ein,
    })),
  ];
  const form8874Credit = form8874Sources.reduce(
    (sum, source) => sum + source.credit,
    0,
  );
  if (
    form8820Credit > 0 &&
    form8820?.source.pass_through_credits?.some((source) =>
      orphanDrugK1Credits.some((entry) =>
        entry.source_type === source.source_type &&
        entry.source_ein === source.entity_ein &&
        entry.source_document_reference === source.source_document_reference
      )
    )
  ) {
    throw new Error(
      "Form 3800 orphan-drug K-1 source is duplicated on Form 8820",
    );
  }
  const nonpassiveSources = form3800NonpassiveCreditUseRows({
    form8826Credit,
    form8820Credit,
    form8874Credit,
    form5884Credit: form5884?.credit,
    form8936NewVehicleCredit: form8936?.credit,
    form8936CommercialVehicleCredit: form8936Commercial?.credit,
    facilities,
  });
  const taxUse = allocateForm3800SourceTaxUse(
    (parsed.passive_source_allocations ?? []).map((source) => ({
      ...source,
      source_statement_reference: source.source_statement_reference,
      form3800_credit_line: source.form3800_credit_line,
    })),
    nonpassiveSources,
    lines,
  );
  const sourceUse = new Map(
    taxUse.nonpassiveSources.map((row) => [row.sourceKey, row] as const),
  );
  const applied = (sourceKey: string): number =>
    sourceUse.get(sourceKey)?.appliedAgainstTax ?? 0;
  const passiveApplied = taxUse.passiveVintages.reduce(
    (sum, row) => ({
      standard: sum.standard +
        (row.form3800CreditLine !== "3" &&
            !row.form3800CreditLine.startsWith("4")
          ? row.appliedAgainstTax
          : 0),
      specified: sum.specified +
        (row.form3800CreditLine.startsWith("4") ? row.appliedAgainstTax : 0),
    }),
    { standard: 0, specified: 0 },
  );
  const sourceApplied = (
    exists: boolean,
    sourceKey: string,
    explicit: number | undefined,
  ): number => {
    if (!exists && explicit !== undefined) {
      throw new Error(`Form 3800 ${sourceKey} allocation has no source`);
    }
    const used = applied(sourceKey);
    if (explicit !== undefined && !sameMoney(explicit, used)) {
      throw new Error(
        `Form 3800 ${sourceKey} allocation differs from FIFO tax use`,
      );
    }
    return used;
  };
  const form8936Applied = sourceApplied(
    Boolean(form8936),
    "nonpassive:8936-new",
    parsed.form8936_applied_credit,
  );
  const form8936CommercialApplied = sourceApplied(
    Boolean(form8936Commercial),
    "nonpassive:8936-commercial",
    parsed.form8936_commercial_applied_credit,
  );
  const form8820Applied = sourceApplied(
    form8820Credit > 0,
    "nonpassive:8820",
    parsed.form8820_applied_credit,
  );
  const form8874Applied = applied("nonpassive:8874");
  if (
    form8820Credit === 0 &&
    parsed.form8820_applied_credits_by_source !== undefined
  ) {
    throw new Error(
      "Form 3800 has Form 8820 source allocations without a source",
    );
  }
  const form8826Applied = applied("nonpassive:8826");
  const form8826Ids = context.documentIdsByPendingKey.f8826 ?? [];
  const filedForm8826 = context.pending?.f8826 === undefined
    ? undefined
    : f8826InputSchema.parse(context.pending.f8826);
  const selfEarned = filedForm8826 && isForm8826Eligible(filedForm8826) &&
    calculateForm8826(filedForm8826).line6 > 0;
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
  const form8874Ids = context.documentIdsByPendingKey.f8874 ?? [];
  const filedForm8874 = context.pending?.f8874 === undefined
    ? undefined
    : f8874InputSchema.parse(context.pending.f8874);
  if (form8874Ids.length !== (filedForm8874 ? 1 : 0)) {
    throw new Error("Form 3800 Form 8874 document count differs from source");
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
  const form8936Ids = context.documentIdsByTag?.IRS8936 ?? [];
  if ((form8936 || form8936Commercial) && form8936Ids.length !== 1) {
    throw new Error(
      "Form 3800 Form 8936 document count does not match its source",
    );
  }
  const form5884Applied = sourceApplied(
    Boolean(form5884),
    "nonpassive:5884",
    parsed.form5884_applied_credit,
  );
  const nonpassiveParts = nonpassiveSources.length > 0
    ? buildForm3800NonpassiveParts({
      tax,
      passiveActivity,
      passiveApplied,
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
      disabledAccess: form8826
        ? {
          credit: form8826.credit,
          sources: form8826.sources,
          documentId: form8826.sources.some((source) => !source.ein)
            ? form8826Ids[0]
            : undefined,
          appliedCredit: form8826Applied,
          appliedCreditsBySource: form8826SourceAllocations(
            form8826,
            form8826Applied,
            parsed.form8826_applied_credits_by_source,
          ),
        }
        : undefined,
      form8820: form8820Credit > 0
        ? {
          credit: form8820Credit,
          documentId: form8820Ids[0],
          appliedCredit: form8820Applied,
          sources: form8820Sources,
          appliedCreditsBySource: nonpassiveSourceAllocations(
            "8820",
            form8820Sources.map((source) => source.credit),
            form8820Credit,
            form8820Applied,
            parsed.form8820_applied_credits_by_source,
          ),
        }
        : undefined,
      form8874: form8874Credit > 0
        ? {
          credit: form8874Credit,
          documentId: form8874Ids[0],
          appliedCredit: form8874Applied,
          sources: form8874Sources,
          appliedCreditsBySource: nonpassiveSourceAllocations(
            "8874",
            form8874Sources.map((source) => source.credit),
            form8874Credit,
            form8874Applied,
            parsed.form8874_applied_credits_by_source,
          ),
        }
        : undefined,
      form8936: form8936
        ? {
          credit: form8936.credit,
          documentId: form8936Ids[0],
          appliedCredit: form8936Applied,
        }
        : undefined,
      form8936Commercial: form8936Commercial
        ? {
          credit: form8936Commercial.credit,
          documentId: form8936Ids[0],
          appliedCredit: form8936CommercialApplied,
        }
        : undefined,
      facilities,
      form8835DocumentIds: form8835Ids,
      appliedCreditsByFacility: form8835FacilityAllocations(
        facilities,
        applied("nonpassive:8835:1f"),
        applied("nonpassive:8835:4e"),
        parsed.form8835_applied_credits_by_facility,
      ),
      transferStatementIdsByFileName: context.documentIdsByAttachmentFileName ??
        {},
    })
    : undefined;
  const passiveParts = buildForm3800PassiveRowXml(
    taxUse.passiveVintages,
    filedForm8874
      ? {
        "Form 8874": {
          documentId: form8874Ids[0],
          documentName: "IRS8874",
        },
      }
      : {},
  );
  return joinForm3800DocumentParts(lines, nonpassiveParts, passiveParts);
}

export const form3800: MefFormDescriptor<"f3800", PendingForm3800> = {
  pendingKey: "f3800",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f3800.pdf",
  build(fields, context = {}) {
    if (!context.documentIdsByPendingKey) {
      const base = prepareForm3800Base(fields);
      // The bundle's first pass reserves document IDs; the second builds links.
      return base
        ? "<IRS3800><CAMTAndBEATInd>false</CAMTAndBEATInd></IRS3800>"
        : "";
    }
    const parts = prepareForm3800DocumentParts(fields, context);
    if (parts) context.onPreparedForm3800?.(parts);
    return parts ? buildIRS3800Document(parts) : "";
  },
};
