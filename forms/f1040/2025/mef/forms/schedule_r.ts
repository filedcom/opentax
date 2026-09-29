import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { inputSchema } from "../../../nodes/inputs/schedule_r/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

function number(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Schedule R cannot reconcile ${key}`);
  }
  return value;
}

export function calculateScheduleRAge65Single(
  context: MefBuildContext,
): Record<string, number> {
  const source = inputSchema.parse(context.pending?.schedule_r);
  if (
    source.filing_status !== FilingStatus.Single ||
    source.taxpayer_age_65_or_older !== true ||
    source.taxpayer_disabled === true ||
    source.spouse_age_65_or_older === true ||
    source.spouse_disabled === true ||
    (source.taxpayer_disability_income ?? 0) !== 0 ||
    (source.spouse_disability_income ?? 0) !== 0 ||
    (source.nontaxable_pension ?? 0) !== 0 ||
    (source.nontaxable_va ?? 0) !== 0 ||
    !source.age_65_source_reference ||
    ((source.nontaxable_ssa ?? 0) > 0 &&
      !source.nontaxable_ssa_source_reference)
  ) {
    throw new Error(
      "Schedule R native filing needs sourced single-taxpayer age-65 facts; disability, spouse, and other-benefit paths remain unsupported",
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
    f1040.filing_status !== "single" || source.agi === undefined ||
    source.agi !== number(f1040, "line11_agi")
  ) {
    throw new Error("Schedule R AGI/status must match finalized Form 1040");
  }
  const base = 5_000;
  const benefits = source.nontaxable_ssa ?? 0;
  const grossSsa = number(f1040, "line6a_ss_gross");
  const taxableSsa = number(f1040, "line6b_ss_taxable");
  if (taxableSsa > grossSsa || benefits !== grossSsa - taxableSsa) {
    throw new Error(
      "Schedule R nontaxable Social Security must match finalized Form 1040 lines 6a and 6b",
    );
  }
  const excessAgi = Math.max(0, source.agi - 7_500);
  const halfExcessAgi = excessAgi / 2;
  const totalReduction = benefits + halfExcessAgi;
  const net = Math.max(0, base - totalReduction);
  const tentative = Math.round(net * 0.15 * 100) / 100;
  const taxBeforeCredits = number(f1040, "line18_total_tax_before_credits");
  const priorCredits = number(schedule3, "line1_total") +
    number(schedule3, "line2_childcare_credit") +
    number(schedule3, "line6l_form8978_credit");
  const limit = Math.max(0, taxBeforeCredits - priorCredits);
  const credit = Math.min(tentative, limit);
  if (
    !Number.isSafeInteger(base) || !Number.isSafeInteger(benefits) ||
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
  return {
    line10: base,
    line12: base,
    line13a: benefits,
    line13c: benefits,
    line14: source.agi,
    line15: 7_500,
    line16: excessAgi,
    line17: halfExcessAgi,
    line18: totalReduction,
    line19: net,
    line20: tentative,
    line21: limit,
    line22: credit,
  };
}

function buildAge65Single(context: MefBuildContext): string {
  const lines = calculateScheduleRAge65Single(context);
  return elements("IRS1040ScheduleR", [
    element("Primary65OrOlderInd", "X"),
    element("FilingStatusAmt", lines.line10),
    element("SmallerOfFSOrTaxableAmt", lines.line12),
    element("NontxSocSecAndRlrdBenefitsAmt", lines.line13a),
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
    const initial = source.filing_status === FilingStatus.Single &&
        source.taxpayer_age_65_or_older === true
      ? 5_000
      : 0;
    const reduction = (source.nontaxable_ssa ?? 0) +
      (source.nontaxable_pension ?? 0) + (source.nontaxable_va ?? 0) +
      Math.max(0, ((source.agi ?? 0) - 7_500) / 2);
    const filedSchedule3 = context.pending.schedule3;
    const claimed = filedSchedule3 && typeof filedSchedule3 === "object"
      ? number(
        filedSchedule3 as Record<string, unknown>,
        "line6d_elderly_disabled_credit",
      )
      : 0;
    if (claimed <= 0 && (initial === 0 || initial <= reduction)) return "";
    return buildAge65Single(context);
  },
};
