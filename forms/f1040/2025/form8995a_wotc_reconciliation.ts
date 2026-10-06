import { assertQualifiedTipQbiSource } from "./form8995_qualified_tip_source.ts";
import { assertOwnedScheduleSE } from "./schedule-se-owner-source.ts";
import { inputSchema as w2Schema } from "../nodes/inputs/w2/index.ts";
import { isDeepStrictEqual } from "node:util";
import {
  assertSingleScheduleCWotcAmounts,
  calculateOwnedWotcBusinesses,
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
  const sources = input.wotc_business_sources ??
    (input.single_schedule_c_source ? [input.single_schedule_c_source] : []);
  const source = sources[0];
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
  if (input.wotc_business_sources) calculateOwnedWotcBusinesses(input);
  else assertSingleScheduleCWotcAmounts(input);
  const pending = normalizeAllPending(rawPending as Record<string, unknown>);
  assertQualifiedTipQbiSource({
    qualified_tip_qbi_source: input.single_schedule_c_source
      ?.qualified_tip_qbi_source,
  }, pending);
  const additional = Number(pending.f1040?.line13b_additional_deductions ?? 0);
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
  if (sources.length === 2) {
    const ordinary = wotc.ordinary_joint_employer_control_review;
    const group = wotc.controlled_group;
    const members = group?.joint_filed_members_review?.members;
    const matching = group
      ? members?.length === 2 && group.members.length === 2 &&
        group.members.every((m) =>
          sources.some((s) =>
            s.business.ein === m.ein &&
            s.business.business_name === m.business_name
          )
        ) &&
        members.every((m) =>
          sources.some((s) =>
            s.business.ein === m.ein &&
            s.business.business_reference === m.business_reference &&
            s.business.source_schedule_c.proprietor_recipient ===
              m.proprietor_recipient &&
            s.business.source_schedule_c.qbi_wotc_filing_review?.owner_ssn ===
              m.proprietor_ssn
          )
        )
      : ordinary?.businesses.every((b) =>
        sources.some((s) =>
          s.business.ein === b.employer_ein &&
          s.business.business_reference === b.business_reference &&
          s.business.source_schedule_c.qbi_wotc_filing_review?.owner_ssn ===
            b.proprietor_ssn
        )
      );
    if (!matching) {
      throw new Error(
        "Two owned WOTC employers need actual reviewed ordinary exceptions or complete joint common-control source members",
      );
    }
  }
  if (wotc.controlled_group?.joint_filed_members_review) {
    const copies = sources.flatMap((s) =>
      s.business.source_schedule_c.qbi_wotc_filing_review!.employee_w2_records
    );
    if (
      new Set(copies.map((r) => r.source_document_reference)).size !==
        copies.length ||
      new Set(copies.map((r) => r.ssa_filing_record_reference)).size !==
        copies.length
    ) {
      throw new Error(
        "Shared group people require distinct issued W2 and SSA employer source copies",
      );
    }
  }
  const lines = calculateForm5884(wotc);
  const allocations = lines.wageDeductionAllocations;
  const reduction = sources.reduce(
    (sum, s) => sum + s.business.wotc_wage_reduction!,
    0,
  );
  const profit = sources.reduce((sum, s) => sum + s.business.qbi, 0);
  const retained = scheduleC.schedule_cs[0];
  const reductions = wotcReductionsByBusiness(scheduleC);
  const credit = pending.f3800?.f5884_credit as
    | Record<string, unknown>
    | undefined;
  const review = retained?.qbi_wotc_filing_review;
  if (
    scheduleC.schedule_cs.length !== sources.length || !retained || !review ||
    sources.some((s) =>
      !scheduleC.schedule_cs.some((c) =>
        isDeepStrictEqual(c, s.business.source_schedule_c)
      ) ||
      reductions.get(s.business.business_reference!) !==
        s.business.wotc_wage_reduction
    ) ||
    reductions.size !== sources.length ||
    lines.line2 !== reduction || lines.line3 !== 0 ||
    allocations.length !== sources.length ||
    allocations.some((a) =>
      a.location.kind !== "schedule_c" ||
      !sources.some((s) =>
        s.business.business_reference ===
          (a.location as any).business_reference &&
        s.business.wotc_wage_reduction === a.credit_amount
      )
    ) ||
    (wotc.controlled_group &&
      !wotc.controlled_group.joint_filed_members_review) ||
    wotc.subject_to_passive_activity_limit !== false ||
    credit?.credit_amount !== lines.line4 ||
    credit.subject_to_passive_activity_limit !== false ||
    wotc.f5884s.length !==
      sources.reduce((sum, s) =>
        sum +
        s.business.source_schedule_c.qbi_wotc_filing_review!.employee_w2_records
          .length, 0)
  ) {
    throw new Error(
      "Form 8995-A WOTC line 2, employer payroll and Form 3800 source do not reconcile",
    );
  }
  for (const employee of wotc.f5884s) {
    const matches = sources.filter((s) =>
      s.business.source_schedule_c.qbi_wotc_filing_review!.employee_w2_records
        .some((r) => r.employee_reference === employee.employee_reference) &&
      (!wotc.controlled_group || s.business.ein === employee.employer_ein)
    );
    if (matches.length !== 1) {
      throw new Error(
        "WOTC employee must belong to one distinct reviewed employer",
      );
    }
    const business = matches[0].business,
      retained = business.source_schedule_c,
      review = retained.qbi_wotc_filing_review!;
    const w2 = review.employee_w2_records.find((record) =>
      record.employee_reference === employee.employee_reference
    );
    const payroll = employee.wage_records.reduce(
      (sum, record) => sum + record.qualified_wages,
      0,
    );
    if (
      !w2 || w2.box1_wages !== payroll || w2.box5_wages !== payroll ||
      (source.joint_se_source && (!employee.direct_employer_review ||
        employee.direct_employer_review.employer_ein !== business.ein ||
        employee.direct_employer_review.proprietor_ssn !== review.owner_ssn ||
        employee.direct_employer_review.proprietor_recipient !==
          (retained.proprietor_recipient ?? "T") ||
        employee.direct_employer_review.business_reference !==
          business.business_reference)) ||
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
    ? { line12: owned.tax, line13: owned.deduction }
    : scheduleSELines(se, CONFIG_BY_YEAR[2025].ssWageBase);
  const wageRows = pending.w2 ? w2Schema.parse(pending.w2).w2s : [];
  if (
    wageRows.some((row) =>
      sources.some((s) =>
        row.employer_ein?.replace(/\D/g, "") === s.business.ein
      )
    )
  ) {
    throw new Error(
      "Actual W2 employer conflicts with WOTC proprietor or reviewed complete employer payroll",
    );
  }
  const wagesTotal = wageRows.reduce((sum, row) => sum + row.box1_wages, 0);
  if (
    joint && (!owned || !isDeepStrictEqual(joint, owned.source) ||
      Math.abs(wagesTotal - (source.joint_wages_total ?? 0)) > 1e-7 ||
      pending.general?.filing_status !== "mfj" ||
      sources.some((s) =>
        (s.business.source_schedule_c.proprietor_recipient === "S"
          ? pending.general.spouse_ssn
          : pending.general.taxpayer_ssn)?.toString().replaceAll("-", "") !==
          s.business.source_schedule_c.qbi_wotc_filing_review!.owner_ssn
      ))
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
        ? owned.instances.reduce(
          (sum, row) => sum + row.net_profit_schedule_c,
          0,
        )
        : se.net_profit_schedule_c) !==
      profit ||
    !noAmount(se.net_profit_schedule_f) ||
    se.farm_optional_method_elected === true ||
    (!owned && !noAmount(se.w2_ss_wages)) ||
    !noAmount(se.unreported_tips_4137) ||
    !noAmount(se.wages_8919) ||
    seLines.line13 !==
      sources.reduce((sum, s) => sum + s.se_tax_deduction, 0) ||
    schedule1?.line15_se_deduction !== seLines.line13 ||
    pending.schedule2?.line4_se_tax !== seLines.line12 ||
    schedule1?.line3_schedule_c !== profit ||
    schedule1?.line10_total_additional_income !== profit ||
    !noAmount(schedule1?.line16_sep_simple) ||
    !noAmount(schedule1?.line17_se_health_insurance) ||
    f1040?.line8_additional_income !== profit ||
    (joint &&
      (f1040?.line1a_wages !== wagesTotal ||
        f1040?.line1z_total_wages !== wagesTotal)) ||
    f1040?.line9_total_income !==
      (joint ? profit + wagesTotal : Math.round(profit + wagesTotal)) ||
    f1040?.line10_adjustments !== seLines.line13 ||
    f1040?.line11_agi !==
      (joint
        ? profit + wagesTotal - seLines.line13
        : Math.round(profit + wagesTotal - seLines.line13)) ||
    input.taxable_income !==
      Math.max(
        0,
        Math.round(
          Number(f1040?.line11_agi) - Number(f1040?.line12c_deduction_total) -
            additional,
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
