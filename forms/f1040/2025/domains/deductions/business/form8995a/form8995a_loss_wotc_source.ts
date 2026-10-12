import { isDeepStrictEqual } from "node:util";
import type { Form8995AInput } from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { reviewedLossWotcReductions } from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/loss-wotc.ts";
import {
  inputSchema as scheduleCInputSchema,
  wotcReductionsByBusiness,
} from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import {
  calculateForm5884,
  inputSchema as wotcInputSchema,
} from "../../../../../nodes/inputs/credits/business/f5884/index.ts";
import { inputSchema as w2Schema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";

/** Credit-source joins shared by loss-parent and companion native/PDF exports. */
export function assertLossWotcSources(
  input: Form8995AInput,
  rawPending: Readonly<Record<string, unknown>> | undefined,
): void {
  const businesses = input.schedule_c_qbi_businesses ?? [];
  const reductions = reviewedLossWotcReductions(businesses);
  const pending = normalizeAllPending(
    rawPending as Record<string, unknown> ?? {},
  );
  if (
    !reductions.size && !pending.f5884 &&
    !(Array.isArray(pending.schedule_c?.wotc_wage_reductions) &&
      pending.schedule_c.wotc_wage_reductions.length)
  ) return;
  const scheduleC = scheduleCInputSchema.parse(pending.schedule_c);
  const retainedReductions = wotcReductionsByBusiness(scheduleC);
  if (!reductions.size && !retainedReductions.size && !pending.f5884) return;
  const employers = businesses.filter((b) =>
    reductions.has(b.business_reference!)
  );
  const wotc = wotcInputSchema.parse(pending.f5884);
  const lines = calculateForm5884(wotc);
  const general = pending.general;
  const credit = pending.f3800?.f5884_credit as
    | Record<string, unknown>
    | undefined;
  const payrollCopies = employers.flatMap((b) =>
    b.source_schedule_c.qbi_wotc_filing_review!.employee_w2_records
  );
  if (
    !employers.length ||
    (wotc.controlled_group &&
      !wotc.controlled_group.joint_filed_members_review) ||
    wotc.subject_to_passive_activity_limit !== false ||
    lines.line3 !== 0 ||
    lines.line2 !== [...reductions.values()].reduce((a, b) => a + b, 0) ||
    retainedReductions.size !== reductions.size ||
    [...reductions].some(([ref, amount]) =>
      retainedReductions.get(ref) !== amount
    ) ||
    lines.wageDeductionAllocations.length !== employers.length ||
    lines.wageDeductionAllocations.some((a) =>
      a.location.kind !== "schedule_c" ||
      reductions.get(a.location.business_reference) !== a.credit_amount
    ) ||
    credit?.credit_amount !== lines.line4 ||
    credit.subject_to_passive_activity_limit !== false ||
    pending.f1040?.form5884_determined_credit !== lines.line4 ||
    general?.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    !isDeepStrictEqual(input, pending.form8995a) ||
    wotc.f5884s.length !== payrollCopies.length ||
    new Set(payrollCopies.map((r) => r.source_document_reference)).size !==
      payrollCopies.length ||
    new Set(payrollCopies.map((r) => r.ssa_filing_record_reference)).size !==
      payrollCopies.length
  ) {
    throw Error(
      "QBI loss WOTC credit, complete payroll and retained business reductions disagree",
    );
  }
  if (wotc.controlled_group) {
    const group = wotc.controlled_group;
    const members = group.joint_filed_members_review!.members;
    if (
      general.filing_status !== "mfj" || employers.length !== 2 ||
      group.members.length !== employers.length ||
      members.length !== employers.length ||
      group.members.some((m) =>
        !employers.some((e) =>
          e.ein === m.ein && e.business_name === m.business_name
        )
      ) ||
      members.some((m) =>
        !employers.some((e) =>
          e.ein === m.ein && e.business_reference === m.business_reference &&
          e.source_schedule_c.proprietor_recipient === m.proprietor_recipient &&
          e.source_schedule_c.qbi_wotc_filing_review?.owner_ssn ===
            m.proprietor_ssn
        )
      )
    ) {
      throw Error("QBI loss WOTC needs complete matching joint group members");
    }
  } else if (employers.length > 1) {
    const control = wotc.ordinary_joint_employer_control_review;
    if (
      general.filing_status !== "mfj" || !control ||
      control.businesses.length !== employers.length ||
      control.businesses.some((b) =>
        !employers.some((e) =>
          b.business_reference === e.business_reference &&
          b.employer_ein === e.ein &&
          b.proprietor_ssn ===
            e.source_schedule_c.qbi_wotc_filing_review?.owner_ssn
        )
      )
    ) {
      throw Error(
        "Multiple loss-route WOTC employers need matching ordinary joint employer reviews",
      );
    }
  }
  const wageRows = pending.w2 ? w2Schema.parse(pending.w2).w2s : [];
  for (const business of employers) {
    const review = business.source_schedule_c.qbi_wotc_filing_review!;
    const owner = business.source_schedule_c.proprietor_recipient ?? "T";
    const ownerSsn = String(
      owner === "S" ? general.spouse_ssn : general.taxpayer_ssn,
    ).replaceAll("-", "");
    if (
      (general.filing_status !== "single" && review.owner_ssn !== ownerSsn) ||
      (review.owner_ssn !== undefined && review.owner_ssn !== ownerSsn) ||
      !scheduleC.schedule_cs.some((s) =>
        isDeepStrictEqual(s, business.source_schedule_c)
      ) ||
      wageRows.some((w) => w.employer_ein?.replace(/\D/g, "") === business.ein)
    ) {
      throw Error(
        "QBI loss WOTC proprietor, actual wages and employer sources disagree",
      );
    }
  }
  for (const employee of wotc.f5884s) {
    const matches = employers.filter((b) =>
      b.source_schedule_c.qbi_wotc_filing_review!.employee_w2_records
        .some((r) => r.employee_reference === employee.employee_reference) &&
      (!wotc.controlled_group || b.ein === employee.employer_ein)
    );
    if (matches.length !== 1) {
      throw Error(
        "WOTC payroll must identify one reviewed loss-route employer",
      );
    }
    const business = matches[0];
    const review = business.source_schedule_c.qbi_wotc_filing_review!;
    const record = review.employee_w2_records.find((r) =>
      r.employee_reference === employee.employee_reference
    )!;
    const payroll = employee.wage_records.reduce(
      (sum, r) => sum + r.qualified_wages,
      0,
    );
    const direct = employee.direct_employer_review;
    if (
      record.box1_wages !== payroll || record.box5_wages !== payroll ||
      employee.wage_records.some((r) =>
        r.deduction_location.kind !== "schedule_c" ||
        r.deduction_location.business_reference !== business.business_reference
      ) ||
      ((general.filing_status === "mfj" || direct) && (!direct ||
        direct.employer_ein !== business.ein ||
        direct.business_reference !== business.business_reference ||
        direct.proprietor_ssn !== review.owner_ssn ||
        direct.proprietor_recipient !==
          (business.source_schedule_c.proprietor_recipient ?? "T")))
    ) {
      throw Error(
        "QBI loss WOTC certified employee payroll differs from issued W2 and proprietor review",
      );
    }
  }
}
