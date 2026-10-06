import { inputSchema as gSchema } from "../nodes/inputs/f1099g/index.ts";
import { filedOwnedScheduleF } from "../nodes/owned-business-filing.ts";
import { jointOwnerQbi } from "../nodes/intermediate/forms/form8995/joint-owner.ts";
import { isDeepStrictEqual } from "node:util";
import { normalizeAllPending } from "./pending.ts";
import { assertOwnedScheduleSE } from "./schedule-se-owner-source.ts";
import {
  computeNetProfit,
  inputSchema as farmSchema,
  reconcileFarmSources,
  wotcReductionsByFarm,
} from "../nodes/intermediate/forms/schedule_f/model.ts";
import { patronFiledBusinessLines } from "../nodes/inputs/qbi_patron/calculation.ts";
import {
  calculateForm5884,
  inputSchema as creditSchema,
} from "../nodes/inputs/f5884/index.ts";
import { inputSchema as necSchema } from "../nodes/inputs/f1099nec/index.ts";
import { inputSchema as w2Schema } from "../nodes/inputs/w2/index.ts";
import { inputSchema as seSchema } from "../nodes/intermediate/forms/schedule_se/index.ts";
import { scheduleSELines } from "../nodes/intermediate/forms/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../nodes/config/index.ts";
import { inputSchema as parentSchema } from "../nodes/intermediate/forms/form8995a/index.ts";
import {
  calculateFarmWotcLines,
  farmWotcBusinessAmounts,
} from "../nodes/intermediate/forms/form8995a/farm-wotc.ts";

import type { FilerIdentity } from "../mef/header.ts";
import { assertForm3800FinalCreditJoin } from "./form3800_final_credit_join.ts";

/** Reconcile reviewed farm employer/issued sources to the complete finalized return. */
export function assertFarmWotcReturn(
  fieldsValue: unknown,
  rawPending: Readonly<Record<string, unknown>> | undefined,
  filer?: FilerIdentity,
  descriptorSource?: { key: "schedule_f" | "f5884"; value: unknown },
): void {
  const rawFields = (fieldsValue ?? {}) as Readonly<Record<string, unknown>>;
  const rawFarm = rawPending?.schedule_f as any;
  if (!rawFarm) {
    if (rawFields.farm_wotc_filing_source) {
      throw new Error("Farm WOTC QBI lacks actual farm return sources");
    }
    return;
  }
  const pending = normalizeAllPending(rawPending as Record<string, unknown>);
  const source = farmSchema.parse(pending.schedule_f),
    reductions = wotcReductionsByFarm(source);
  const reviewed = source.schedule_fs.filter((f) => f.qbi_wotc_filing_review);
  const wotc = pending.f5884 ? creditSchema.parse(pending.f5884) : undefined;
  const directs = wotc?.f5884s.filter((e) =>
    e.direct_employer_review &&
    e.wage_records.some((r) => r.deduction_location.kind === "schedule_f")
  ) ?? [];
  if (
    !reviewed.length && !directs.length && !rawFields.farm_wotc_filing_source
  ) return;
  if (
    (reviewed.length !== 1 && reviewed.length !== 2) || !wotc ||
    source.farm_optional_method_elected === true ||
    wotc.controlled_group || wotc.pass_through_credits?.length ||
    source.patron_filing_review ||
    source.schedule_fs.some((f) => f.accounting_method !== "cash") ||
    wotc.subject_to_passive_activity_limit !== false
  ) {
    throw new Error(
      "Reviewed farm WOTC needs actual regular-SE direct-employer sources",
    );
  }
  if (
    descriptorSource && !isDeepStrictEqual(
      descriptorSource.key === "schedule_f"
        ? farmSchema.parse(descriptorSource.value)
        : creditSchema.parse(descriptorSource.value),
      descriptorSource.key === "schedule_f" ? source : wotc,
    )
  ) {
    throw new Error("Farm WOTC descriptor differs from actual retained source");
  }
  reconcileFarmSources(source);
  const lines = calculateForm5884(wotc),
    allocations = lines.wageDeductionAllocations;
  if (
    lines.line3 !== 0 ||
    lines.line2 !== [...reductions.values()].reduce((a, b) => a + b, 0) ||
    allocations.length !== reviewed.length ||
    allocations.some((a) =>
      a.location.kind !== "schedule_f" ||
      reductions.get(a.location.farm_id) !== a.credit_amount
    ) ||
    (pending.f3800?.f5884_credit as any)?.credit_amount !== lines.line4 ||
    (pending.f3800?.f5884_credit as any)?.subject_to_passive_activity_limit !==
      false ||
    wotc.f5884s.length !==
      reviewed.reduce(
        (a, f) => a + f.qbi_wotc_filing_review!.employee_w2_records.length,
        0,
      )
  ) {
    throw new Error(
      "Farm WOTC full determined allocations and actual Form3800 source disagree",
    );
  }
  const general = pending.general, final = pending.f1040;
  if (
    !general || !final ||
    !["single", "mfj"].includes(String(general.filing_status)) ||
    general.filing_status !== final.filing_status
  ) throw new Error("Farm WOTC needs actual filed owner/status identity");
  const primary = String(general.taxpayer_ssn).replace(/\D/g, ""),
    spouse = String(general.spouse_ssn ?? "").replace(/\D/g, "");
  if (
    String(final.taxpayer_ssn).replace(/\D/g, "") !== primary ||
    (general.filing_status === "mfj" &&
      String(final.spouse_ssn).replace(/\D/g, "") !== spouse) ||
    (filer && (filer.primarySSN.replace(/\D/g, "") !== primary ||
      (general.filing_status === "mfj" &&
        filer.spouse?.ssn.replace(/\D/g, "") !== spouse)))
  ) {
    throw new Error("Farm WOTC actual final/header owner identity differs");
  }
  if (reviewed.length === 2) {
    const control = wotc.ordinary_joint_employer_control_review;
    const employeeCopies = reviewed.flatMap((f) =>
      f.qbi_wotc_filing_review!.employee_w2_records
    );
    if (
      general.filing_status !== "mfj" || !control ||
      new Set(employeeCopies.map((r) => r.source_document_reference)).size !==
        employeeCopies.length ||
      new Set(reviewed.map((f) => f.proprietor_recipient)).size !== 2 ||
      new Set(reviewed.map((f) => f.farm_id)).size !== 2 ||
      new Set(reviewed.map((f) => f.line_d_ein?.replace(/\D/g, ""))).size !==
        2 ||
      control.businesses.some((b) =>
        !reviewed.some((f) =>
          b.employer_ein === f.line_d_ein?.replace(/\D/g, "") &&
          b.business_reference === f.farm_id &&
          b.proprietor_ssn === f.qbi_wotc_filing_review?.owner_ssn &&
          b.proprietor_ssn ===
            (f.proprietor_recipient === "S" ? spouse : primary)
        )
      )
    ) {
      throw new Error(
        "Two farm employers need actual separate spouse ownership and attribution-exception sources",
      );
    }
  }
  assertForm3800FinalCreditJoin(
    Number(pending.f3800?.allowed_credit ?? 0),
    pending,
  );
  const nec = pending.f1099nec
    ? necSchema.parse(pending.f1099nec).f1099necs
    : [];
  const agricultural = pending.f1099g
    ? gSchema.parse(pending.f1099g).f1099gs
    : [];
  const businessRefs = [
    ...source.schedule_fs.map((f) => f.farm_id),
    ...((pending.schedule_c?.schedule_cs as any[]) ?? []).map((c) =>
      c.business_reference
    ),
  ];
  for (const farm of reviewed) {
    farmWotcBusinessAmounts({
      kind: "schedule_f",
      item: farm,
      determined_wage_reduction: reductions.get(farm.farm_id ?? "") ?? 0,
    });
    const review = farm.qbi_wotc_filing_review!,
      owner = farm.proprietor_recipient === "S" ? spouse : primary;
    const others = businessRefs.filter((r) => r !== farm.farm_id);
    const issued = nec.filter((r) =>
      r.for_routing === "schedule_f" && r.farm_id === farm.farm_id
    );
    if (
      !farm.farm_id || !farm.line_c_farm_name || !farm.line_d_ein || !owner ||
      review.owner_ssn !== owner ||
      (general.filing_status === "single" &&
        farm.proprietor_recipient !== "T") ||
      (others.length
        ? review.no_other_business_or_aggregation_confirmed === true ||
          review.no_aggregation_confirmed !== true ||
          !isDeepStrictEqual(review.reviewed_other_business_references, others)
        : review.no_other_business_or_aggregation_confirmed !== true) ||
      !issued.length || issued.some((r) =>
        r.recipient_ssn?.replace(/\D/g, "") !== owner ||
        !r.source_document_reference ||
        !source.farm_sources?.some((s) =>
          s.kind === "1099nec_farm_income" && s.farm_id === farm.farm_id &&
          s.recipient_tin === owner &&
          s.payer_tin === r.payer_tin.replace(/\D/g, "") &&
          s.payer_name === r.payer_name && s.amount === r.box1_nec &&
          s.source_document_reference === r.source_document_reference
        )
      )
    ) {
      throw new Error(
        "Farm WOTC owner, ownership review and actual issued farm income source do not reconcile",
      );
    }
    const crops = agricultural.filter((r) =>
      r.farm_id === farm.farm_id &&
      r.box_7_payment_kind === "agricultural_program" &&
      (r.box_7_agriculture ?? 0) > 0
    );
    const cropAmount = crops.reduce((sum, r) =>
      sum + (r.box_7_agriculture ?? 0), 0);
    const customAmount = issued.reduce((sum, r) =>
      sum + (r.box1_nec ?? 0), 0);
    if (
      !crops.length || cropAmount <= customAmount ||
      farm.line4a_ag_program_payments !== cropAmount ||
      farm.line4b_ag_program_payments_taxable !== cropAmount ||
      farm.line8_other_income !== customAmount || crops.some((r) =>
        r.recipient_tin !== owner || !source.farm_sources?.some((s) =>
          s.kind === "1099g_agriculture" && s.farm_id === farm.farm_id &&
          s.amount === r.box_7_agriculture && s.recipient_tin === owner &&
          s.payer_name === r.payer_name &&
          s.payer_tin === r.payer_tin?.replace(/\D/g, "") &&
          s.source_document_reference === r.source_document_reference
        )
      )
    ) {
      throw new Error(
        "Farm WOTC principal farming activity, actual agricultural-program copies and secondary custom-work source do not reconcile",
      );
    }
    const workers = wotc.f5884s.filter((e) =>
      e.direct_employer_review?.business_reference === farm.farm_id
    );
    if (workers.length !== review.employee_w2_records.length) {
      throw new Error(
        "Farm WOTC actual employer employee set differs from its W2 copies",
      );
    }
    for (const e of workers) {
      const employer = e.direct_employer_review!,
        record = review.employee_w2_records.find((r) =>
          r.employee_reference === e.employee_reference
        );
      const payroll = e.wage_records.reduce((a, r) =>
        a + r.qualified_wages, 0);
      if (
        !record ||
        record.box3_social_security_wages !==
          Math.min(record.box1_wages, CONFIG_BY_YEAR[2025].ssWageBase) ||
        record.employer_ein !== employer.employer_ein ||
        [primary, spouse].includes(record.employee_ssn) ||
        record.swa_certification_reference !==
          e.certification.swa_certification_reference ||
        !isDeepStrictEqual(
          record.payroll_record_references,
          e.wage_records.map((r) =>
            r.payroll_record_reference
          ),
        ) ||
        Math.abs(record.box1_wages - payroll) > 1e-6 ||
        Math.abs(record.box5_wages - payroll) > 1e-6 ||
        employer.employer_ein !== farm.line_d_ein.replace(/\D/g, "") ||
        employer.proprietor_ssn !== owner ||
        employer.proprietor_recipient !== farm.proprietor_recipient ||
        e.wage_records.some((r) =>
          r.deduction_location.kind !== "schedule_f" ||
          r.deduction_location.farm_id !== farm.farm_id
        )
      ) {
        throw new Error(
          "Farm WOTC employer proprietor/certification/payroll/issued W2 identities differ",
        );
      }
    }
  }
  const wages = pending.w2 ? w2Schema.parse(pending.w2).w2s : [];
  if (
    wages.some((w) =>
      !w.employee_ssn || !w.source_document_reference ||
      ![primary, spouse].includes(w.employee_ssn.replace(/\D/g, "")) ||
      reviewed.some((f) =>
        w.employer_ein?.replace(/\D/g, "") === f.line_d_ein?.replace(/\D/g, "")
      )
    )
  ) {
    throw new Error(
      "Farm WOTC household W2 owner or employer conflicts with actual farmer payroll",
    );
  }
  const owned = general.filing_status === "mfj"
    ? assertOwnedScheduleSE(pending)
    : undefined;
  const profits = source.schedule_fs.map((f) =>
    f.qbi_wotc_filing_review
      ? patronFiledBusinessLines(
        "schedule_f",
        f,
        reductions.get(f.farm_id ?? "") ?? 0,
      ).profit
      : filedOwnedScheduleF(f)?.profit ?? computeNetProfit(f)
  );
  const farmProfit = profits.reduce((a, b) => a + b, 0);
  let half: number, tax: number;
  if (owned) {
    half = owned.deduction;
    tax = owned.tax;
  } else {
    const se = seSchema.parse(pending.schedule_se),
      expected = scheduleSELines(se, CONFIG_BY_YEAR[2025].ssWageBase);
    if (
      se.net_profit_schedule_f !== farmProfit ||
      (se.net_profit_schedule_c ?? 0) !== 0 || !expected
    ) {
      throw new Error(
        "Single farm WOTC SE profit differs from actual finalized farm deduction",
      );
    }
    half = expected.line13;
    tax = expected.line12;
  }
  const wageTotal = wages.reduce((a, w) => a + w.box1_wages, 0);
  const profit = owned
    ? owned.source.businesses.reduce((a, b) => a + b.net_profit, 0)
    : farmProfit;
  if (
    pending.schedule1?.line6_schedule_f !== farmProfit ||
    pending.schedule1?.line15_se_deduction !== half ||
    pending.schedule2?.line4_se_tax !== tax ||
    Math.abs(Number(final.line11_agi) - (wageTotal + profit - half)) > 1e-6 ||
    Number(final.line1a_wages ?? 0) !== wageTotal ||
    general.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    general.qbi_not_patron_of_specified_cooperative_confirmed !== true
  ) {
    throw new Error(
      "Farm WOTC finalized farm/SE/AGI source equations do not reconcile",
    );
  }
  if (!rawFields.farm_wotc_filing_source) {
    const taxable = Math.round(
      Math.max(
        0,
        Number(final.line11_agi) - Number(final.line12c_deduction_total),
      ),
    );
    const expected = owned
      ? jointOwnerQbi(owned.source, taxable, CONFIG_BY_YEAR[2025].ssWageBase)
        .line15
      : Math.min(
        Math.round(Math.max(0, Math.round(farmProfit - half)) * .2),
        Math.round(taxable * .2),
      );
    if (
      Number(final.line13_qbi_deduction ?? 0) !== expected ||
      Number(pending.form8995?.qbi_deduction ?? 0) !== expected
    ) {
      throw new Error(
        "Farm WOTC below-threshold actual QBI and final deduction disagree",
      );
    }
  }
  if (rawFields.farm_wotc_filing_source) {
    const fields = parentSchema.strict().parse(rawFields),
      calculated = calculateFarmWotcLines(fields);
    if (
      !isDeepStrictEqual(
        parentSchema.strict().parse(pending.form8995a),
        fields,
      ) ||
      !isDeepStrictEqual(calculated.source.joint_se_source, owned?.source) ||
      (calculated.lossSchedule
        ? !isDeepStrictEqual(pending.form8995a_schedule_c, pending.form8995a)
        : pending.form8995a_schedule_c !== undefined) ||
      calculated.source.se_tax_deduction !== half ||
      Math.abs(calculated.source.joint_wages_total - wageTotal) > 1e-6 ||
      calculated.source.businesses.length !== businessRefs.length ||
      calculated.source.businesses.some((r) =>
        r.kind === "schedule_f"
          ? !source.schedule_fs.some((f) =>
            isDeepStrictEqual(f, r.item) &&
            r.determined_wage_reduction ===
              (reductions.get(f.farm_id ?? "") ?? 0)
          )
          : !(pending.schedule_c?.schedule_cs as any[])?.some((c) =>
            isDeepStrictEqual(c, r.item)
          )
      ) ||
      fields.taxable_income !==
        Math.round(
          Number(final.line11_agi) - Number(final.line12c_deduction_total),
        ) ||
      final.line13_qbi_deduction !== calculated.parent.line39 ||
      Math.round(Number(final.line15_taxable_income)) !==
        fields.taxable_income - calculated.parent.line39
    ) {
      throw new Error(
        "Farm WOTC advanced parent source and final1040 deductions disagree",
      );
    }
  }
}
