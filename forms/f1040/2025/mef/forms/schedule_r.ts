import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { inputSchema, schedule_r } from "../../../nodes/inputs/schedule_r/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

function number(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Schedule R cannot reconcile ${key}`);
  }
  return value;
}

type AgeBox = 1 | 3 | 7 | 8;

const AGE_BOX_TAG: Record<AgeBox, string> = {
  1: "Primary65OrOlderInd",
  3: "BothSpouses65OrOlderInd",
  7: "One65OrOlderOtherNotRtdInd",
  8: "Age65OrOldrNotLvngTogetherInd",
};

export function calculateScheduleRAgeOnly(
  context: MefBuildContext,
): { box: AgeBox; lines: Record<string, number> } {
  const source = inputSchema.parse(context.pending?.schedule_r);
  if (
    source.taxpayer_disabled === true ||
    source.spouse_disabled === true ||
    (source.taxpayer_disability_income ?? 0) !== 0 ||
    (source.spouse_disability_income ?? 0) !== 0 ||
    (source.taxpayer_age_65_or_older !== true &&
      source.spouse_age_65_or_older !== true) ||
    (source.taxpayer_age_65_or_older === true &&
      !source.age_65_source_reference) ||
    (source.spouse_age_65_or_older === true &&
      !source.spouse_age_65_source_reference) ||
    ((source.nontaxable_ssa ?? 0) > 0 &&
      !source.nontaxable_ssa_source_reference) ||
    ((source.nontaxable_pension ?? 0) > 0 &&
      (!source.nontaxable_pension_source_reference ||
        source.nontaxable_pension_line13b_eligible_verified !== true)) ||
    ((source.nontaxable_va ?? 0) > 0 &&
      (!source.nontaxable_va_source_reference ||
        source.nontaxable_va_veterans_pension_verified !== true))
  ) {
    throw new Error(
      "Schedule R age-only filing needs sourced taxpayer/spouse age and benefit facts; disability paths remain unsupported",
    );
  }
  const returnFields = context.pending?.f1040;
  const schedule3Fields = context.pending?.schedule3;
  if (
    !returnFields || typeof returnFields !== "object" ||
    !schedule3Fields || typeof schedule3Fields !== "object"
  ) {
    throw new Error("Schedule R needs finalized Form 1040 and Schedule 3");
  }
  const f1040 = returnFields as Record<string, unknown>;
  const schedule3 = schedule3Fields as Record<string, unknown>;
  if (
    f1040.filing_status !== source.filing_status || source.agi === undefined ||
    source.agi !== number(f1040, "line11_agi")
  ) {
    throw new Error("Schedule R AGI/status must match finalized Form 1040");
  }
  if (
    f1040.taxpayer_age_65_or_older !==
      (source.taxpayer_age_65_or_older === true) ||
    (source.filing_status === FilingStatus.MFJ &&
      f1040.spouse_age_65_or_older !==
        (source.spouse_age_65_or_older === true))
  ) {
    throw new Error(
      "Schedule R age-65 source must match finalized Form 1040 age indicator(s)",
    );
  }
  let box: AgeBox;
  let base: number;
  let threshold: number;
  if (
    source.filing_status === FilingStatus.Single ||
    source.filing_status === FilingStatus.HOH ||
    source.filing_status === FilingStatus.QSS
  ) {
    if (
      source.taxpayer_age_65_or_older !== true ||
      source.spouse_age_65_or_older === true
    ) throw new Error("Schedule R age-only status and owner disagree");
    box = 1;
    base = 5_000;
    threshold = 7_500;
  } else if (source.filing_status === FilingStatus.MFS) {
    if (
      source.taxpayer_age_65_or_older !== true ||
      source.spouse_age_65_or_older === true ||
      f1040.mfs_spouse_lived_with_taxpayer !== false ||
      !source.mfs_lived_apart_all_year_source_reference
    ) {
      throw new Error(
        "Schedule R MFS age-65 credit needs proof that spouses lived apart all year",
      );
    }
    box = 8;
    base = 3_750;
    threshold = 5_000;
  } else {
    if (
      source.filing_status !== FilingStatus.MFJ ||
      source.spouse_age_65_or_older === undefined ||
      source.taxpayer_age_65_or_older === undefined
    ) throw new Error("Schedule R joint age facts must identify both spouses");
    box = source.taxpayer_age_65_or_older &&
        source.spouse_age_65_or_older
      ? 3
      : 7;
    base = box === 3 ? 7_500 : 5_000;
    threshold = 10_000;
  }
  const benefits = source.nontaxable_ssa ?? 0;
  const otherBenefits = (source.nontaxable_pension ?? 0) +
    (source.nontaxable_va ?? 0);
  const grossSsa = number(f1040, "line6a_ss_gross");
  const taxableSsa = number(f1040, "line6b_ss_taxable");
  if (taxableSsa > grossSsa || benefits !== grossSsa - taxableSsa) {
    throw new Error(
      "Schedule R nontaxable Social Security must match finalized Form 1040 lines 6a and 6b",
    );
  }
  const excessAgi = Math.max(0, source.agi - threshold);
  const halfExcessAgi = Math.round(excessAgi / 2);
  const totalReduction = benefits + otherBenefits + halfExcessAgi;
  const net = Math.max(0, base - totalReduction);
  const tentative = Math.round(net * 0.15);
  const taxBeforeCredits = number(f1040, "line18_total_tax_before_credits");
  const priorCredits = number(schedule3, "line1_total") +
    number(schedule3, "line2_childcare_credit") +
    number(schedule3, "line6l_form8978_credit");
  const limit = Math.max(0, taxBeforeCredits - priorCredits);
  const credit = Math.min(tentative, limit);
  if (
    !Number.isSafeInteger(base) || !Number.isSafeInteger(benefits) ||
    !Number.isSafeInteger(otherBenefits) ||
    !Number.isSafeInteger(source.agi) ||
    !Number.isSafeInteger(halfExcessAgi) ||
    !Number.isSafeInteger(tentative) ||
    !Number.isSafeInteger(taxBeforeCredits) ||
    !Number.isSafeInteger(priorCredits) ||
    priorCredits < 0 || credit <= 0 ||
    number(schedule3, "line6d_elderly_disabled_credit") !== credit ||
    number(f1040, "line20_nonrefundable_credits") < credit
  ) {
    throw new Error(
      "Schedule R credit and tax limit must reconcile to finalized Schedule 3 and Form 1040",
    );
  }
  return { box, lines: {
    line10: base,
    line12: base,
    line13a: benefits,
    line13b: otherBenefits,
    line13c: benefits + otherBenefits,
    line14: source.agi,
    line15: threshold,
    line16: excessAgi,
    line17: halfExcessAgi,
    line18: totalReduction,
    line19: net,
    line20: tentative,
    line21: limit,
    line22: credit,
  } };
}

function buildAgeOnly(context: MefBuildContext): string {
  const { box, lines } = calculateScheduleRAgeOnly(context);
  return elements("IRS1040ScheduleR", [
    element(AGE_BOX_TAG[box], "X"),
    element("FilingStatusAmt", lines.line10),
    element("SmallerOfFSOrTaxableAmt", lines.line12),
    element("NontxSocSecAndRlrdBenefitsAmt", lines.line13a),
    ...(lines.line13b > 0 ? [element("NontaxableOtherAmt", lines.line13b)] : []),
    element("TotalNontaxableAmt", lines.line13c),
    element("TaxReturnAGIAmt", lines.line14),
    element("ExemptionAmt", lines.line15),
    element("AdjustedGrossIncomeAmt", lines.line16),
    element("HalfAGIAmt", lines.line17),
    element("AdjustedCreditAmt", lines.line18),
    element("NetCreditAmt", lines.line19),
    element("CalculatedAmountOfNetCreditAmt", lines.line20),
    element("TotalTaxLessCreditsAmt", lines.line21),
    element("CreditForElderlyOrDisabledAmt", lines.line22),
  ]);
}

export const scheduleR: MefFormDescriptor<"schedule_r", unknown> = {
  pendingKey: "schedule_r",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sr--2025.pdf",
  build(_fields, context = {}) {
    if (context.pending?.schedule_r === undefined) return "";
    const source = inputSchema.parse(context.pending.schedule_r);
    const sourceClaimsCredit = schedule_r.compute(
      { taxYear: 2025, formType: "f1040" },
      source,
    ).outputs.length > 0;
    const filedSchedule3 = context.pending.schedule3;
    const claimed = filedSchedule3 && typeof filedSchedule3 === "object"
      ? number(
        filedSchedule3 as Record<string, unknown>,
        "line6d_elderly_disabled_credit",
      )
      : 0;
    if (claimed <= 0) {
      if (!sourceClaimsCredit) return "";
      const returnFields = context.pending.f1040;
      if (
        !returnFields || typeof returnFields !== "object" ||
        !filedSchedule3 || typeof filedSchedule3 !== "object"
      ) {
        throw new Error("Schedule R needs finalized Form 1040 and Schedule 3");
      }
      const f1040 = returnFields as Record<string, unknown>;
      const s3 = filedSchedule3 as Record<string, unknown>;
      const taxLimit = number(f1040, "line18_total_tax_before_credits") -
        number(s3, "line1_total") -
        number(s3, "line2_childcare_credit") -
        number(s3, "line6l_form8978_credit");
      if (taxLimit <= 0) return "";
      throw new Error("Schedule R positive source credit is missing from Schedule 3 line 6d");
    }
    return buildAgeOnly(context);
  },
};
