import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import {
  inputSchema,
  schedule_r,
  validDisabilityEvidence,
} from "../../../nodes/inputs/schedule_r/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

function number(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Schedule R cannot reconcile ${key}`);
  }
  return value;
}

type ScheduleRBox = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const BOX_TAG: Record<ScheduleRBox, string> = {
  1: "Primary65OrOlderInd",
  2: "Und65RtdPermnntTotDsbltyInd",
  3: "BothSpouses65OrOlderInd",
  4: "BothUnder65OneRtdDsbltyInd",
  5: "BothUnder65BothRtdDsbltyInd",
  6: "One65OrOlderOtherRtdDsbltyInd",
  7: "One65OrOlderOtherNotRtdInd",
  8: "Age65OrOldrNotLvngTogetherInd",
  9: "Under65DidNotLiveTogetherInd",
};

export function calculateScheduleR(
  context: MefBuildContext,
): {
  box: ScheduleRBox;
  priorYearStatement: boolean;
  lines: Record<string, number>;
} {
  const source = inputSchema.parse(context.pending?.schedule_r);
  if (
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
      "Schedule R filing needs sourced taxpayer/spouse age and benefit facts",
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
  const taxpayerDisabled = source.taxpayer_disabled === true &&
    source.taxpayer_age_65_or_older !== true;
  const spouseDisabled = source.spouse_disabled === true &&
    source.spouse_age_65_or_older !== true;
  if (
    (source.filing_status !== FilingStatus.MFJ &&
      (source.spouse_disabled === true ||
        source.spouse_disability_income !== undefined ||
        source.spouse_disability_evidence !== undefined)) ||
    (source.taxpayer_disabled === true && !taxpayerDisabled) ||
    (source.spouse_disabled === true && !spouseDisabled) ||
    (taxpayerDisabled !== (source.taxpayer_disability_income !== undefined)) ||
    (spouseDisabled !== (source.spouse_disability_income !== undefined)) ||
    (taxpayerDisabled &&
      !validDisabilityEvidence(source.taxpayer_disability_evidence)) ||
    (spouseDisabled &&
      !validDisabilityEvidence(source.spouse_disability_evidence)) ||
    (!taxpayerDisabled && source.taxpayer_disability_evidence !== undefined) ||
    (!spouseDisabled && source.spouse_disability_evidence !== undefined)
  ) {
    throw new Error(
      "Schedule R disability needs each qualifying person's reviewed income, retirement, and physician evidence",
    );
  }
  const disabilityWages =
    (source.taxpayer_disability_evidence?.disability_income_reported_on ===
        "wages"
      ? source.taxpayer_disability_income ?? 0
      : 0) +
    (source.spouse_disability_evidence?.disability_income_reported_on ===
        "wages"
      ? source.spouse_disability_income ?? 0
      : 0);
  const disabilityPension =
    (source.taxpayer_disability_evidence?.disability_income_reported_on ===
        "pension"
      ? source.taxpayer_disability_income ?? 0
      : 0) +
    (source.spouse_disability_evidence?.disability_income_reported_on ===
        "pension"
      ? source.spouse_disability_income ?? 0
      : 0);
  if (
    disabilityWages > number(f1040, "line1z_total_wages") ||
    disabilityPension > number(f1040, "line5b_pension_taxable")
  ) {
    throw new Error(
      "Schedule R taxable disability income exceeds finalized Form 1040 wages or taxable pensions",
    );
  }
  let box: ScheduleRBox | 0;
  let base: number;
  let threshold: number;
  if (
    source.filing_status === FilingStatus.Single ||
    source.filing_status === FilingStatus.HOH ||
    source.filing_status === FilingStatus.QSS
  ) {
    if (
      source.spouse_age_65_or_older === true
    ) throw new Error("Schedule R status and owner disagree");
    box = source.taxpayer_age_65_or_older === true
      ? 1
      : taxpayerDisabled
      ? 2
      : 0;
    base = 5_000;
    threshold = 7_500;
  } else if (source.filing_status === FilingStatus.MFS) {
    if (
      source.spouse_age_65_or_older === true ||
      f1040.mfs_spouse_lived_with_taxpayer !== false ||
      !source.mfs_lived_apart_all_year_source_reference
    ) {
      throw new Error(
        "Schedule R MFS credit needs proof that spouses lived apart all year",
      );
    }
    box = source.taxpayer_age_65_or_older === true
      ? 8
      : taxpayerDisabled
      ? 9
      : 0;
    base = 3_750;
    threshold = 5_000;
  } else {
    if (
      source.filing_status !== FilingStatus.MFJ ||
      source.spouse_age_65_or_older === undefined ||
      source.taxpayer_age_65_or_older === undefined
    ) throw new Error("Schedule R joint age facts must identify both spouses");
    const taxpayerOlder = source.taxpayer_age_65_or_older;
    const spouseOlder = source.spouse_age_65_or_older;
    if (taxpayerOlder && spouseOlder) box = 3;
    else if (
      (taxpayerOlder && spouseDisabled) || (spouseOlder && taxpayerDisabled)
    ) box = 6;
    else if (taxpayerOlder || spouseOlder) box = 7;
    else if (taxpayerDisabled && spouseDisabled) box = 5;
    else if (taxpayerDisabled || spouseDisabled) box = 4;
    else box = 0;
    base = [3, 5, 6].includes(box) ? 7_500 : 5_000;
    threshold = 10_000;
  }
  if (box === 0) {
    throw new Error("Schedule R needs a qualifying age or disability route");
  }
  const disabilityIncome =
    (taxpayerDisabled ? source.taxpayer_disability_income ?? 0 : 0) +
    (spouseDisabled ? source.spouse_disability_income ?? 0 : 0);
  const line11 = [2, 4, 5, 6, 9].includes(box)
    ? disabilityIncome + (box === 6 ? 5_000 : 0)
    : 0;
  const line12 = [2, 4, 5, 6, 9].includes(box) ? Math.min(base, line11) : base;
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
  const net = Math.max(0, line12 - totalReduction);
  const tentative = Math.round(net * 0.15);
  const taxBeforeCredits = number(f1040, "line18_total_tax_before_credits");
  const priorCredits = number(schedule3, "line1_total") +
    number(schedule3, "line2_childcare_credit") +
    number(schedule3, "line6l_form8978_credit");
  const limit = Math.max(0, taxBeforeCredits - priorCredits);
  const credit = Math.min(tentative, limit);
  if (
    !Number.isSafeInteger(base) || !Number.isSafeInteger(benefits) ||
    !Number.isSafeInteger(line11) || !Number.isSafeInteger(line12) ||
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
  const priorYearStatement = (taxpayerDisabled &&
    source.taxpayer_disability_evidence?.physician_statement ===
      "prior_year") ||
    (spouseDisabled &&
      source.spouse_disability_evidence?.physician_statement === "prior_year");
  return {
    box,
    priorYearStatement,
    lines: {
      line10: base,
      line11,
      line12,
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
    },
  };
}

function buildScheduleR(context: MefBuildContext): string {
  const { box, priorYearStatement, lines } = calculateScheduleR(context);
  return elements("IRS1040ScheduleR", [
    element(BOX_TAG[box], "X"),
    ...(priorYearStatement ? [element("PriorYearStatementInd", "X")] : []),
    element("FilingStatusAmt", lines.line10),
    ...(lines.line11 > 0
      ? [element("TaxableDisabilityAmt", lines.line11)]
      : []),
    element("SmallerOfFSOrTaxableAmt", lines.line12),
    element("NontxSocSecAndRlrdBenefitsAmt", lines.line13a),
    ...(lines.line13b > 0
      ? [element("NontaxableOtherAmt", lines.line13b)]
      : []),
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
      throw new Error(
        "Schedule R positive source credit is missing from Schedule 3 line 6d",
      );
    }
    return buildScheduleR(context);
  },
};
