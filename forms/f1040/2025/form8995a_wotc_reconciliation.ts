import { assertOwnedScheduleSE } from "./schedule-se-owner-source.ts";
import { inputSchema as w2Schema } from "../nodes/inputs/w2/index.ts";
import { isDeepStrictEqual } from "node:util";
import {
  assertSingleScheduleCWotcAmounts,
  type Form8995AInput,
  inputSchema as form8995aInputSchema,
} from "../nodes/intermediate/forms/form8995a/index.ts";
import {
  inputSchema as scheduleCInputSchema,
  wotcReductionsByBusiness,
} from "../nodes/inputs/schedule_c/model.ts";
import {
  calculateForm5884,
  inputSchema as wotcInputSchema,
} from "../nodes/inputs/f5884/index.ts";
import { inputSchema as seInputSchema } from "../nodes/intermediate/forms/schedule_se/index.ts";
import { scheduleSELines } from "../nodes/intermediate/forms/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../nodes/config/index.ts";
import { normalizeAllPending } from "./pending.ts";

/** Replay the retained employer credit, wage deduction, SE tax and QBI source. */
export function assertForm8995AWotcReturn(
  input: Form8995AInput,
  rawPending: Readonly<Record<string, unknown>> | undefined,
): void {
  const source = input.single_schedule_c_source;
  const rawScheduleC = rawPending?.schedule_c as
    | Record<string, unknown>
    | undefined;
  if (
    !source && rawPending?.f5884 === undefined &&
    !(Array.isArray(rawScheduleC?.wotc_wage_reductions) &&
      rawScheduleC.wotc_wage_reductions.length > 0)
  ) return;
  if (!source || !rawPending) {
    throw new Error(
      "Form 8995-A with WOTC needs its retained Schedule C and full return source",
    );
  }
  assertSingleScheduleCWotcAmounts(input);
  const pending = normalizeAllPending(rawPending as Record<string, unknown>);
  const parent = form8995aInputSchema.strict().safeParse(pending.form8995a);
  if (
    !parent.success || JSON.stringify(parent.data) !== JSON.stringify(input)
  ) {
    throw new Error(
      "Form 8995-A WOTC needs the matching retained parent source",
    );
  }
  const business = source.business;
  const scheduleC = scheduleCInputSchema.parse(pending.schedule_c);
  const wotc = wotcInputSchema.parse(pending.f5884);
  const lines = calculateForm5884(wotc);
  const allocations = lines.wageDeductionAllocations;
  const reduction = business.wotc_wage_reduction!;
  const retained = scheduleC.schedule_cs[0];
  const reductions = wotcReductionsByBusiness(scheduleC);
  const credit = pending.f3800?.f5884_credit as
    | Record<string, unknown>
    | undefined;
  const review = retained?.qbi_wotc_filing_review;
  if (
    scheduleC.schedule_cs.length !== 1 || !retained || !review ||
    JSON.stringify(retained) !== JSON.stringify(business.source_schedule_c) ||
    reductions.size !== 1 ||
    reductions.get(business.business_reference!) !== reduction ||
    lines.line2 !== reduction || lines.line3 !== 0 ||
    allocations.length !== 1 || allocations[0].location.kind !== "schedule_c" ||
    allocations[0].location.business_reference !==
      business.business_reference ||
    allocations[0].credit_amount !== reduction || wotc.controlled_group ||
    wotc.subject_to_passive_activity_limit !== false ||
    credit?.credit_amount !== lines.line4 ||
    credit.subject_to_passive_activity_limit !== false ||
    wotc.f5884s.length !== review.employee_w2_records.length
  ) {
    throw new Error(
      "Form 8995-A WOTC line 2, employer payroll and Form 3800 source do not reconcile",
    );
  }
  for (const employee of wotc.f5884s) {
    const w2 = review.employee_w2_records.find((record) =>
      record.employee_reference === employee.employee_reference
    );
    const payroll = employee.wage_records.reduce(
      (sum, record) => sum + record.qualified_wages,
      0,
    );
    if (
      !w2 || w2.box1_wages !== payroll || w2.box5_wages !== payroll ||
      employee.wage_records.some((record) =>
        record.deduction_location.kind !== "schedule_c" ||
        record.deduction_location.business_reference !==
          business.business_reference
      )
    ) {
      throw new Error(
        "Form 8995-A employer W-2 copies differ from certified employee payroll",
      );
    }
  }
  const se = seInputSchema.parse(pending.schedule_se);
  const joint = source.joint_se_source;
  const owned = joint ? assertOwnedScheduleSE(pending) : undefined;
  const seLines = owned
    ? owned.instances.find((row) => row.recipient === "T")
    : scheduleSELines(se, CONFIG_BY_YEAR[2025].ssWageBase);
  const wageRows = pending.w2 ? w2Schema.parse(pending.w2).w2s : [];
  const wagesTotal = wageRows.reduce((sum, row) => sum + row.box1_wages, 0);
  if (
    joint && (!owned || !isDeepStrictEqual(joint, owned.source) ||
      Math.abs(wagesTotal - (source.joint_wages_total ?? 0)) > 1e-7 ||
      pending.general?.filing_status !== "mfj" ||
      pending.general.taxpayer_ssn?.toString().replaceAll("-", "") !==
        review.owner_ssn)
  ) {
    throw new Error(
      "Form8995A joint WOTC owner and actual W2 sources disagree",
    );
  }
  const schedule1 = pending.schedule1;
  const f1040 = pending.f1040;
  const general = pending.general;
  const noAmount = (value: unknown) => value === undefined || value === 0;
  if (
    !seLines ||
    (owned
        ? owned.instances.find((row) => row.recipient === "T")
          ?.net_profit_schedule_c
        : se.net_profit_schedule_c) !==
      business.qbi ||
    !noAmount(se.net_profit_schedule_f) ||
    se.farm_optional_method_elected === true ||
    (!owned && !noAmount(se.w2_ss_wages)) ||
    !noAmount(se.unreported_tips_4137) ||
    !noAmount(se.wages_8919) ||
    seLines.line13 !== source.se_tax_deduction ||
    schedule1?.line15_se_deduction !== seLines.line13 ||
    pending.schedule2?.line4_se_tax !== seLines.line12 ||
    schedule1?.line3_schedule_c !== business.qbi ||
    schedule1?.line10_total_additional_income !== business.qbi ||
    !noAmount(schedule1?.line16_sep_simple) ||
    !noAmount(schedule1?.line17_se_health_insurance) ||
    f1040?.line8_additional_income !== business.qbi ||
    (joint &&
      (f1040?.line1a_wages !== wagesTotal ||
        f1040?.line1z_total_wages !== wagesTotal)) ||
    f1040?.line9_total_income !==
      (joint
        ? business.qbi + wagesTotal
        : Math.round(business.qbi + wagesTotal)) ||
    f1040?.line10_adjustments !== seLines.line13 ||
    f1040?.line11_agi !==
      (joint
        ? business.qbi + wagesTotal - seLines.line13
        : Math.round(business.qbi + wagesTotal - seLines.line13)) ||
    !noAmount(f1040?.line13b_additional_deductions) ||
    input.taxable_income !==
      Math.max(
        0,
        Math.round(
          Number(f1040?.line11_agi) - Number(f1040?.line12c_deduction_total),
        ),
      ) ||
    Math.round(
        Number(f1040?.line15_taxable_income) +
          Number(f1040?.line13_qbi_deduction),
      ) !== input.taxable_income ||
    general?.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    general?.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    [
      ...(joint ? [] : ["w2"]),
      "schedule_f",
      "schedule_e",
      "k1_partnership",
      "k1_s_corp",
      "f1099patr",
      "f1099div",
      "schedule_d",
      "f1099b",
      "sep_retirement",
      "form8829",
    ].some((key) => pending[key] !== undefined)
  ) {
    throw new Error(
      "Form 8995-A WOTC Schedule C, Schedule SE, Schedule 1 and Form 1040 sources differ",
    );
  }
}
