import { z } from "zod";
import { assertForm3800FinalCreditJoin } from "../../../../../domains/credits/business/form3800/form3800_final_credit_join.ts";
import {
  allocateForm3800SourceTaxUse,
  calculateForm3800Nonpassive,
  classifyForm3800PassiveCredits,
  form3800NonpassiveCreditUseRows,
  type Form8835CreditEntry,
} from "../../../../../../nodes/inputs/credits/business/f3800/calculation.ts";
import {
  inputSchema as f3800InputSchema,
  reconcileForm3800NonpassiveCarryforwards,
} from "../../../../../../nodes/inputs/credits/business/f3800/index.ts";
import { allocateDisabledAccessLine1eCredits } from "../../../../../../nodes/inputs/credits/business/f3800/disabled-access.ts";
import {
  calculateForm8582CR,
  inputSchema as f8582crInputSchema,
  PassiveCreditReportingRoute,
} from "../../../../../../nodes/intermediate/forms/credits/business/form8582cr/index.ts";
import {
  calculateForm8826,
  inputSchema as f8826InputSchema,
  isEligible as isForm8826Eligible,
} from "../../../../../../nodes/inputs/credits/business/f8826/index.ts";
import {
  calculateForm8820,
  inputSchema as f8820InputSchema,
} from "../../../../../../nodes/inputs/credits/business/f8820/index.ts";
import {
  calculateForm8874,
  inputSchema as f8874InputSchema,
} from "../../../../../../nodes/inputs/credits/business/f8874/index.ts";
import {
  calculateForm8835,
  inputSchema as f8835InputSchema,
} from "../../../../../../nodes/inputs/credits/business/f8835/index.ts";
import {
  calculateForm5884,
  inputSchema as f5884InputSchema,
} from "../../../../../../nodes/inputs/credits/business/f5884/index.ts";
import {
  computeCommercialVehicleCreditLines,
  computeNewVehicleCreditParts,
  inputSchema as f8936InputSchema,
} from "../../../../../../nodes/inputs/credits/individual/f8936/index.ts";
import { FilingStatus } from "../../../../../../nodes/types.ts";
import { FilingStatus as MefFilingStatus } from "../../../../../../mef/header.ts";
import type {
  MefBuildContext,
  MefFormDescriptor,
} from "../../../../form-descriptor.ts";
import {
  buildIRS3800Document,
  type Form3800DocumentParts,
} from "./f3800_document.ts";
import { joinForm3800DocumentParts } from "./f3800_join.ts";
import {
  buildForm3800CarryforwardRows,
  form3800CarryforwardCreditUseRows,
} from "./f3800_carryforward_rows.ts";
import { buildForm3800NonpassiveParts } from "./f3800_nonpassive.ts";
import { sameForm3800PassiveAllocations } from "./f3800_passive_link.ts";
import { buildForm3800PassiveRowXml } from "./f3800_passive_rows.ts";
import { reconcileDisabledAccessK1Credits } from "../f8826_credit_evidence.ts";
import { readDisabledAccessCapLedger } from "../f8826_cap_ledger.ts";
import { inputSchema as partnershipK1InputSchema } from "../../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import { inputSchema as sCorpK1InputSchema } from "../../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import { reconcileNewMarketsK1Credits } from "../f8874_credit_evidence.ts";
import { reconcileFiledTrustPartVClaims } from "../f3468_source.ts";
import { reconcileForm8844DirectEmployer } from "../f8844_source.ts";
import { reconcileForm8881DirectEmployer } from "../f8881.ts";
import { reconcileForm8941ScheduleC } from "../../health/f8941_source.ts";
import { reconcileForm8994DirectEmployer } from "../../../../../domains/credits/business/form8994/form8994_source.ts";
import { reconcileForm8864DocumentSource } from "../../../../../domains/credits/business/form8864/form8864_source.ts";
import { reconcileForm8882DirectEmployer } from "../f8882_source.ts";
import { reconcileForm8911BusinessFiling } from "../f8911_source.ts";
import { reconciledForm8908Source } from "../f8908_source_reconciliation.ts";
import { reconcileForm8908PwaAttachments } from "../f8908_pwa.ts";

const amount = z.number().finite().nonnegative();
const taxBase = z.object({
  regularTax: amount,
  alternativeMinimumTax: amount,
  foreignTaxCredit: amount,
  priorAllowableCredits: amount,
  tentativeMinimumTax: amount,
  standardCredit: amount,
  empowermentCredit: amount.optional(),
  specifiedCredit: amount,
  standardCarryforward: amount,
  specifiedCarryforward: amount,
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
  assertForm3800FinalCreditJoin(allowedCredit, context.pending ?? {});
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
    entry.source_type === "self"
  );
  const directSources = sourceEntries.filter((entry) =>
    entry.source_type === "estate" || entry.source_type === "trust" ||
    ((entry.source_type === "partnership" ||
      entry.source_type === "s_corporation") &&
      Boolean(entry.source_document_reference))
  );
  if (formSources.length + directSources.length !== sourceEntries.length) {
    throw new Error(
      "Form 3800 disabled-access pass-through source needs its K-1 document reference",
    );
  }
  const raw = context.pending?.f8826;
  if (formSources.length > 0 && !raw) {
    throw new Error(
      "Form 3800 disabled-access credit needs Form 8826 source facts",
    );
  }
  const source = raw ? f8826InputSchema.parse(raw) : undefined;
  const lines = source ? calculateForm8826(source) : undefined;
  for (const declared of source?.pass_through_credits ?? []) {
    if (declared.subject_to_passive_activity_limit) {
      if (!ledger) {
        throw new Error(
          "Passive Form 8826 pass-through credit needs its gross source ledger",
        );
      }
      continue;
    }
    const matching = directSources.filter((entry) =>
      entry.source_type === declared.entity_type &&
      entry.source_ein === declared.entity_ein &&
      entry.source_document_reference === declared.source_document_reference &&
      sameMoney(entry.credit_amount, declared.credit_amount) &&
      !entry.subject_to_passive_activity_limit
    );
    if (matching.length !== 1) {
      throw new Error(
        "Form 3800 disabled-access K-1 source differs from Form 8826 line 7",
      );
    }
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
  if (directSources.length > 0) {
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

export function sourceOrphanDrugK1Credits(
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
      throw new Error(
        "Form 3800 estate/trust K-1 box 13 code M orphan-drug credit needs qualified clinical-testing and passive-activity source evidence",
      );
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
  form: "8820" | "8874" | "3468",
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

function prepareForm3800Base(
  fields: PendingForm3800,
  context: MefBuildContext,
) {
  if (fields.f8911_credit !== undefined) {
    if (!context.pending) {
      throw new Error(
        "Form 8911 business export needs property-source reconciliation before Form 3800 filing",
      );
    }
    reconcileForm8911BusinessFiling(context.pending.f8911, context.pending);
  }
  const hasLegacyCredit = fields.f3800s?.some((entry) =>
    Object.values(entry).some((value) => typeof value === "number" && value > 0)
  );
  if (hasLegacyCredit) {
    throw new Error(
      "Form 3800 legacy credit cannot be exported without source-backed calculation",
    );
  }
  const hasSourceCredit = fields.f8911_credit !== undefined ||
    fields.allowed_credit !== undefined ||
    fields.f8826_credit_entries?.some((entry) => entry.credit_amount > 0) ||
    (fields.f8820_credit?.credit_amount ?? 0) > 0 ||
    (fields.f8874_credit?.credit_amount ?? 0) > 0 ||
    (fields.f8844_direct_employer_credit?.credit_amount ?? 0) > 0 ||
    fields.f8881_credit !== undefined ||
    fields.f8908_credit !== undefined ||
    fields.f8941_direct_employer_credit !== undefined ||
    fields.f8994_direct_employer_credit !== undefined ||
    fields.f8864_direct_producer_credit !== undefined ||
    fields.f8882_direct_employer_credit !== undefined ||
    fields.f8874_k1_credit_entries?.some((entry) => entry.credit_amount > 0) ||
    fields.f8820_k1_credit_entries?.some((entry) => entry.credit_amount > 0) ||
    fields.f8835_credit_entries?.some((entry) => entry.credit_amount > 0) ||
    (fields.f5884_credit?.credit_amount ?? 0) > 0 ||
    (fields.f8936_new_vehicle_credit?.credit_amount ?? 0) > 0 ||
    (fields.f8936_commercial_vehicle_credit?.credit_amount ?? 0) > 0 ||
    Boolean(fields.carryforward_vintages?.length) ||
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
  const lines = calculateForm3800Nonpassive(tax, passiveActivity, {
    roundPercentageLinesToWholeDollars: true,
  });
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
  const base = prepareForm3800Base(fields, context);
  if (!base) return undefined;
  if (!context.documentIdsByPendingKey) {
    throw new Error("Form 3800 preparation needs reserved document IDs");
  }
  const { tax, parsed, passiveActivity, lines, allowedCredit } = base;
  const carryforwardEntries = parsed.carryforward_vintages ?? [];
  const empowermentCarryforward = reconcileForm3800NonpassiveCarryforwards(
    carryforwardEntries,
  ).filter((entry) => entry.form3800CreditLine === "3").reduce(
    (sum, entry) => sum + entry.availableAfterAdjustment,
    0,
  );
  reconcileFiledTaxContext(tax, allowedCredit, context);
  reconcilePassiveSources(parsed, context);
  if (
    (lines.line6 > 0 || lines.line22 > 0) &&
    context.documentIdsByPendingKey.form6251?.length !== 1
  ) {
    throw new Error("Form 3800 ordinary credit needs attached Form 6251");
  }
  const form8826 = sourceForm8826(parsed, context);
  const form8820 = sourceForm8820(parsed, context);
  const form8874 = sourceForm8874(parsed, context);
  const form8844 = parsed.f8844_direct_employer_credit
    ? reconcileForm8844DirectEmployer(context.pending ?? {})
    : undefined;
  const form8881 = parsed.f8881_credit
    ? reconcileForm8881DirectEmployer(context.pending ?? {})
    : undefined;
  const form8908 = parsed.f8908_credit
    ? reconciledForm8908Source(context.pending?.f8908, parsed)
    : undefined;
  const form8941 = parsed.f8941_direct_employer_credit
    ? reconcileForm8941ScheduleC(context.pending ?? {}, context.filer)
    : undefined;
  const form8994 = parsed.f8994_direct_employer_credit
    ? reconcileForm8994DirectEmployer(
      context.pending?.f8994,
      context.pending ?? {},
    )
    : undefined;
  const form8864 = parsed.f8864_direct_producer_credit
    ? reconcileForm8864DocumentSource(
      context.pending?.f8864,
      context.pending ?? {},
    )
    : undefined;
  if (
    form8864 && (
      parsed.f8864_direct_producer_credit?.credit_amount !==
        form8864.lines.line11 ||
      parsed.f8864_direct_producer_credit?.schedule_c_business_reference !==
        form8864.source.schedule_c_business_reference ||
      parsed.f8864_direct_producer_credit?.form637_registration_number !==
        form8864.source.form637_registration_number
    )
  ) {
    throw new Error("Form 3800 line 1l differs from filed Form 8864 source");
  }
  if (
    form8994 && (
      parsed.f8994_direct_employer_credit?.credit_amount !==
        form8994.lines.line3 ||
      parsed.f8994_direct_employer_credit?.schedule_c_business_reference !==
        form8994.source.schedule_c_business_reference ||
      parsed.f8994_direct_employer_credit?.schedule_c_wage_ledger_reference !==
        form8994.source.schedule_c_wage_ledger_reference
    )
  ) {
    throw new Error("Form 3800 line 4j differs from filed Form 8994 source");
  }
  if (
    form8941 && (
      parsed.f8941_direct_employer_credit?.credit_amount !==
        form8941.lines.line16 ||
      parsed.f8941_direct_employer_credit?.schedule_c_business_reference !==
        ("schedule_c_business_reference" in form8941.source
          ? form8941.source.schedule_c_business_reference
          : undefined) ||
      parsed.f8941_direct_employer_credit?.schedule_f_farm_id !==
        ("schedule_f_farm_id" in form8941.source
          ? form8941.source.schedule_f_farm_id
          : undefined) ||
      parsed.f8941_direct_employer_credit?.shop_plan_reference !==
        form8941.source.shop_plan_reference ||
      JSON.stringify(
          parsed.f8941_direct_employer_credit?.shop_plan_references,
        ) !== JSON.stringify(form8941.planReferences) ||
      JSON.stringify(
          parsed.f8941_direct_employer_credit?.group_business_references,
        ) !== JSON.stringify(form8941.groupBusinessReferences) ||
      JSON.stringify(
          parsed.f8941_direct_employer_credit
            ?.independent_spouse_business_references,
        ) !==
        JSON.stringify(form8941.independentSpouseBusinessReferences) ||
      JSON.stringify(
          parsed.f8941_direct_employer_credit?.independent_spouse_credits,
        ) !==
        JSON.stringify(form8941.independentSpouseCredits)
    )
  ) {
    throw new Error("Form 3800 line 4h differs from filed Form 8941 source");
  }
  const form8911 = parsed.f8911_credit
    ? reconcileForm8911BusinessFiling(
      context.pending?.f8911,
      context.pending ?? {},
    )
    : undefined;
  const form8882 = parsed.f8882_direct_employer_credit
    ? reconcileForm8882DirectEmployer(
      context.pending?.f8882,
      context.pending ?? {},
    )
    : undefined;
  if (
    form8882 && (
      parsed.f8882_direct_employer_credit?.credit_amount !==
        form8882.lines.line7 ||
      parsed.f8882_direct_employer_credit?.schedule_c_business_reference !==
        form8882.source.schedule_c_business_reference
    )
  ) {
    throw new Error("Form 3800 line 1k differs from its filed Form 8882");
  }
  if (
    form8882 && context.filer &&
    form8882.source.proprietor_ssn !==
      context.filer.primarySSN.replaceAll("-", "")
  ) {
    throw new Error("Form 3800 line 1k owner differs from filed taxpayer");
  }
  if (form8908) reconcileForm8908PwaAttachments(form8908.source, context);
  if (
    form8908 && context.filer &&
    form8908.source.contractor_ssn !== context.filer.primarySSN &&
    form8908.source.contractor_ssn !== context.filer.spouse?.ssn
  ) {
    throw new Error(
      "Form 8908 line 1p contractor differs from filed taxpayer or spouse",
    );
  }
  if (
    (tax.empowermentCredit ?? 0) !==
      (form8844?.lines.line2 ?? 0) + empowermentCarryforward
  ) {
    throw new Error(
      "Form 3800 line 22 differs from sourced empowerment-zone credits",
    );
  }
  const newMarketsK1Credits = parsed.f8874_k1_credit_entries ?? [];
  reconcileNewMarketsK1Credits(newMarketsK1Credits, context.pending ?? {});
  const orphanDrugK1Credits = sourceOrphanDrugK1Credits(
    parsed,
    context,
  );
  const trustPartVEntries = parsed.f3468_trust_part_v_credit_entries ?? [];
  const filedTrustPartVClaims = reconcileFiledTrustPartVClaims(
    context.pending ?? {},
  );
  if (trustPartVEntries.length !== filedTrustPartVClaims.length) {
    throw new Error(
      "Form 3800 line 1v trust credits differ from filed Form 3468 Part V",
    );
  }
  const form3468Ids = context.documentIdsByPendingKey.f3468 ?? [];
  if (
    trustPartVEntries.length > 0 &&
    (form3468Ids.length !== filedTrustPartVClaims.length ||
      form3468Ids.some((id) => !id))
  ) {
    throw new Error(
      "Form 3800 line 1v needs one attached Form 3468 per trust property",
    );
  }
  const trustPartVSourceRows = filedTrustPartVClaims.map((claim, index) => {
    if (
      context.filer &&
      claim.statement.beneficiary_ssn !== context.filer.primarySSN
    ) {
      throw new Error(
        "Form 3800 line 1v trust beneficiary differs from filed taxpayer",
      );
    }
    const matches = trustPartVEntries.filter((entry) =>
      entry.source_type === claim.source_type &&
      entry.source_ein === claim.source_ein &&
      entry.source_document_reference === claim.source_document_reference &&
      entry.source_statement_reference === claim.source_statement_reference &&
      entry.credit_amount === claim.credit_amount &&
      entry.subject_to_passive_activity_limit === false
    );
    if (matches.length !== 1) {
      throw new Error(
        "Form 3800 line 1v credit differs from reviewed trust Form 3468 source",
      );
    }
    const documentId = form3468Ids[index];
    if (!documentId) {
      throw new Error(
        "Form 3800 line 1v trust property lacks its Form 3468 document ID",
      );
    }
    return {
      credit: claim.credit_amount,
      ein: claim.source_ein,
      documentId,
    };
  });
  const form3468PartVCredit = trustPartVSourceRows.reduce(
    (sum, source) => sum + source.credit,
    0,
  );
  if (
    form3468PartVCredit === 0 &&
    parsed.form3468_part_v_applied_credits_by_source !== undefined
  ) {
    throw new Error(
      "Form 3800 has Form 3468 Part V allocations without a trust source",
    );
  }
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
    form8881PartICredit: form8881?.line8,
    form8881PartIICredit: form8881?.line11,
    form8881PartIIICredit: form8881?.line15,
    form8908Credit: form8908?.lines.line8,
    form8941Credit: form8941?.lines.line16,
    form8994Credit: form8994?.lines.line3,
    form8864Credit: form8864?.lines.line11,
    form8882Credit: form8882?.lines.line7,
    form8911Credit: form8911?.businessCredit,
    form8844Credit: form8844?.lines.line2,
    form3468PartVCredit,
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
    [
      ...form3800CarryforwardCreditUseRows(carryforwardEntries),
      ...nonpassiveSources,
    ],
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
      empowerment: sum.empowerment +
        (row.form3800CreditLine === "3" ? row.appliedAgainstTax : 0),
      specified: sum.specified +
        (row.form3800CreditLine.startsWith("4") ? row.appliedAgainstTax : 0),
    }),
    { standard: 0, empowerment: 0, specified: 0 },
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
  const form8844Applied = applied("nonpassive:8844");
  const form8881Applied = {
    i: applied("nonpassive:8881:i"),
    ii: applied("nonpassive:8881:ii"),
    iii: applied("nonpassive:8881:iii"),
  };
  const form8908Applied = applied("nonpassive:8908");
  const form8941Applied = sourceApplied(
    Boolean(form8941),
    "nonpassive:8941",
    parsed.form8941_applied_credit,
  );
  if (form8941) {
    if (parsed.form8941_applied_credit === undefined) {
      throw new Error(
        "Form 8941 needs explicit Form 3800 allowed-credit allocation",
      );
    }
    reconcileForm8941ScheduleC(
      context.pending ?? {},
      context.filer,
      form8941Applied,
    );
  }
  const form8994Applied = sourceApplied(
    Boolean(form8994),
    "nonpassive:8994",
    parsed.form8994_applied_credit,
  );
  if (form8994) {
    if (parsed.form8994_applied_credit === undefined) {
      throw new Error(
        "Form 8994 needs explicit Form 3800 allowed-credit allocation",
      );
    }
    reconcileForm8994DirectEmployer(
      context.pending?.f8994,
      context.pending ?? {},
      form8994Applied,
    );
  }
  const form8864Applied = sourceApplied(
    Boolean(form8864),
    "nonpassive:8864",
    parsed.form8864_applied_credit,
  );
  const form8882Applied = applied("nonpassive:8882");
  const form8911Applied = applied("nonpassive:8911");
  const form3468PartVApplied = sourceApplied(
    form3468PartVCredit > 0,
    "nonpassive:3468-part-v",
    undefined,
  );
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
  const form8844Ids = context.documentIdsByPendingKey.f8844 ?? [];
  if (form8844Ids.length !== (form8844 ? 1 : 0)) {
    throw new Error("Form 3800 Form 8844 document count differs from source");
  }
  const form8881Ids = context.documentIdsByPendingKey.f8881 ?? [];
  if (form8881Ids.length !== (form8881 ? 1 : 0)) {
    throw new Error("Form 3800 Form 8881 document count differs from source");
  }
  const form8908Ids = context.documentIdsByPendingKey.f8908 ?? [];
  if (form8908Ids.length !== (form8908 ? 1 : 0)) {
    throw new Error("Form 3800 Form 8908 document count differs from source");
  }
  const form8941Ids = context.documentIdsByPendingKey.f8941 ?? [];
  if (
    form8941Ids.length !==
      (form8941 ? (form8941.kind === "independent_spouses" ? 2 : 1) : 0)
  ) {
    throw new Error("Form 3800 Form 8941 document count differs from source");
  }
  const form8994Ids = context.documentIdsByPendingKey.f8994 ?? [];
  if (form8994Ids.length !== (form8994 ? 1 : 0)) {
    throw new Error("Form 3800 Form 8994 document count differs from source");
  }
  const form8864Ids = context.documentIdsByPendingKey.f8864 ?? [];
  if (form8864Ids.length !== (form8864 ? 1 : 0)) {
    throw new Error("Form 3800 Form 8864 document count differs from source");
  }
  const form8911Ids = context.documentIdsByTag?.IRS8911 ?? [];
  if (
    form8911 &&
    (form8911Ids.length !== 1 ||
      context.documentIdsByTag?.IRS8911ScheduleA?.length !==
        form8911.properties.length ||
      context.documentIdsByTag?.IRS4562?.length !==
        form8911.depreciationDocumentCount)
  ) {
    throw new Error(
      "Form 3800 Form 8911 source needs its parent, property and depreciation documents",
    );
  }
  const form8882Ids = context.documentIdsByPendingKey.f8882 ?? [];
  if (form8882Ids.length !== (form8882 ? 1 : 0)) {
    throw new Error("Form 3800 Form 8882 document count differs from source");
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
      form8844: form8844
        ? {
          credit: form8844.lines.line2,
          documentId: form8844Ids[0],
          appliedCredit: form8844Applied,
        }
        : undefined,
      form8881: form8881
        ? {
          documentId: form8881Ids[0],
          parts: [
            {
              line: "1j" as const,
              credit: form8881.line8,
              appliedCredit: form8881Applied.i,
            },
            {
              line: "1dd" as const,
              credit: form8881.line11,
              appliedCredit: form8881Applied.ii,
            },
            {
              line: "1ee" as const,
              credit: form8881.line15,
              appliedCredit: form8881Applied.iii,
            },
          ].filter((part) => part.credit > 0),
        }
        : undefined,
      form8908: form8908
        ? {
          credit: form8908.lines.line8,
          documentId: form8908Ids[0],
          appliedCredit: form8908Applied,
        }
        : undefined,
      form8941: form8941
        ? {
          credit: form8941.lines.line16,
          documentId: form8941Ids[0],
          appliedCredit: form8941Applied,
          ...(form8941.kind === "independent_spouses"
            ? {
              sources: form8941.memberLines.map((line, index) => ({
                credit: line.line16,
                documentId: form8941Ids[index],
              })),
            }
            : {}),
        }
        : undefined,
      form8994: form8994
        ? {
          credit: form8994.lines.line3,
          documentId: form8994Ids[0],
          appliedCredit: form8994Applied,
        }
        : undefined,
      form8864: form8864
        ? {
          credit: form8864.lines.line11,
          documentId: form8864Ids[0],
          appliedCredit: form8864Applied,
        }
        : undefined,
      form8911: form8911
        ? {
          credit: form8911.businessCredit,
          documentId: form8911Ids[0],
          appliedCredit: form8911Applied,
        }
        : undefined,
      form8882: form8882
        ? {
          credit: form8882.lines.line7,
          documentId: form8882Ids[0],
          appliedCredit: form8882Applied,
        }
        : undefined,
      form3468PartV: form3468PartVCredit > 0
        ? {
          credit: form3468PartVCredit,
          appliedCredit: form3468PartVApplied,
          sources: trustPartVSourceRows,
          appliedCreditsBySource: nonpassiveSourceAllocations(
            "3468",
            trustPartVSourceRows.map((source) => source.credit),
            form3468PartVCredit,
            form3468PartVApplied,
            parsed.form3468_part_v_applied_credits_by_source,
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
  const carryforward = buildForm3800CarryforwardRows(
    carryforwardEntries,
    context.documentIdsByTag?.CarryforwardGeneralBusinessCr ?? [],
    taxUse.nonpassiveSources,
  );
  const nonpassiveWithCarryforward: Form3800DocumentParts | undefined =
    carryforwardEntries.length > 0
      ? {
        ...(nonpassiveParts ?? {
          lines,
          transferStatementIds: [],
          carryforwardSources: [],
          currentRows: [],
          currentAmounts: [],
          carryoverRows: [],
          currentDetails: [],
          carryoverDetails: [],
          passiveCurrentDetails: [],
          passiveCarryoverDetails: [],
        }),
        carryforwardSources: carryforward.sources,
        carryoverRows: carryforward.rows,
        carryoverDetails: carryforward.details,
      }
      : nonpassiveParts;
  const joined = joinForm3800DocumentParts(
    lines,
    nonpassiveWithCarryforward,
    passiveParts,
  );
  if (carryforwardEntries.length > 0) {
    buildIRS3800Document(joined);
    throw new Error(
      "Form 3800 carryforward needs authenticated prior-return evidence and an attached filed history statement",
    );
  }
  return {
    ...joined,
    form3468DocumentIds: form3468Ids,
    form5884DocumentIds: form5884Ids,
    form8835DocumentIds: form8835Ids,
    form8874DocumentIds: form8874Ids,
  };
}

export const form3800: MefFormDescriptor<"f3800", PendingForm3800> = {
  pendingKey: "f3800",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f3800.pdf",
  build(fields, context = {}) {
    if (!context.documentIdsByPendingKey) {
      const base = prepareForm3800Base(fields, context);
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
