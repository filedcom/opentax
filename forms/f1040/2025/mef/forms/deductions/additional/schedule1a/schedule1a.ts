import { assertSchedule1ASeniorGeneralSource } from "../../../../../domains/deductions/additional/schedule1a-senior-source.ts";
import { schedule_f as scheduleF } from "../../../../../../nodes/intermediate/forms/income/business/schedule_f/index.ts";
import { extractFilerIdentity } from "../../../../../../mef/filer.ts";
import { form7206 } from "../../../adjustments/health/f7206.ts";
import { assertIndependentOwnerHealthSource } from "../../../../../domains/adjustments/health/form7206/form7206_independent_owner_source.ts";
import { calculateSingleScheduleCForm7206 } from "../../../../../../nodes/intermediate/forms/adjustments/health/form7206/single-source.ts";
import { normalizeAllPending } from "../../../../../return-processing/pending.ts";
import { assertOwnedScheduleSE } from "../../../../../domains/taxes/self-employment/schedule-se/schedule-se-owner-source.ts";
import { tipSourceCanonical } from "../../../../../../nodes/intermediate/forms/deductions/business/form8995/qualified-tips.ts";
import { z } from "zod";
import { element, elements } from "../../../../../../mef/xml.ts";
import {
  calculateQualifiedTipsSchedule1A,
  calculateSeniorOnlySchedule1A,
  calculateVehicleInterestSchedule1A,
  calculateW2OvertimeSchedule1A,
  inputSchema,
  isQualifiedTipsOccupationCode,
  qualifiedEmployeeTipRows,
  seniorDeduction,
} from "../../../../../../nodes/intermediate/forms/deductions/additional/schedule1a/index.ts";
import { inputSchema as w2InputSchema } from "../../../../../../nodes/inputs/income/wages/w2/index.ts";
import { inputSchema as form4137InputSchema } from "../../../../../../nodes/intermediate/forms/taxes/employment/form4137/index.ts";
import { inputSchema as necInputSchema } from "../../../../../../nodes/inputs/income/business/f1099nec/index.ts";
import { inputSchema as miscInputSchema } from "../../../../../../nodes/inputs/income/business/f1099m/index.ts";
import { inputSchema as kInputSchema } from "../../../../../../nodes/inputs/income/business/f1099k/index.ts";
import { scheduleC } from "../../../../../../nodes/inputs/income/business/schedule_c/index.ts";
import { FilingStatus } from "../../../../../../nodes/types.ts";
import {
  calculatePhysicalPresence2555,
  physicalPresenceFilingSchema,
} from "../../../../../../nodes/intermediate/forms/income/foreign/form2555/calculation.ts";
import type { MefBuildContext, MefFormDescriptor } from "../../../../form-descriptor.ts";

const form1040ReconciliationSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus).optional(),
  line11_agi: z.number().finite().optional(),
  line13b_additional_deductions: z.number().int().nonnegative().optional(),
  schedule1a_line37_senior_deduction: z.number().int().nonnegative().optional(),
  taxpayer_ssn: z.string().optional(),
  taxpayer_age_65_or_older: z.boolean().optional(),
  taxpayer_ssn_valid_for_employment: z.boolean().optional(),
  taxpayer_ssn_issued_before_due_date: z.boolean().optional(),
  taxpayer_tin_issued_by_due_date: z.boolean().optional(),
  spouse_ssn: z.string().optional(),
  spouse_age_65_or_older: z.boolean().optional(),
  spouse_ssn_valid_for_employment: z.boolean().optional(),
  spouse_ssn_issued_before_due_date: z.boolean().optional(),
  spouse_tin_issued_by_due_date: z.boolean().optional(),
}).passthrough();

type Input = z.infer<typeof inputSchema> | readonly [];

function buildSchedule(raw: Input, context?: MefBuildContext): string {
  if (Array.isArray(raw) && raw.length === 0) return "";
  const input = inputSchema.parse(raw);
  const positive2555 = input.form2555_exclusion_review !== undefined;
  if (positive2555 && input.senior_zero_exclusions_review) {
    throw new Error("Schedule 1-A Part I reviews cannot conflict");
  }
  if (!input.senior_zero_exclusions_review && !positive2555) {
    const hasDeductionSource = input.taxpayer_age_65_or_older === true ||
      input.spouse_age_65_or_older === true ||
      (input.qualified_employee_tips?.length ?? 0) > 0 ||
      (input.qualified_form4137_tips?.length ?? 0) > 0 ||
      (input.form4070_reports?.length ?? 0) > 0 ||
      (input.employer_tip_statements?.length ?? 0) > 0 ||
      (input.qualified_trade_business_tips?.length ?? 0) > 0 ||
      (input.qualified_w2_overtime?.length ?? 0) > 0 ||
      (input.vehicle_loans?.length ?? 0) > 0;
    if (hasDeductionSource) {
      throw new Error(
        "Schedule 1-A positive source needs sourced Part I zero-exclusion review or a Form 2555 exclusion review",
      );
    }
    const claim = z.object({
      line13b_additional_deductions: z.number().optional(),
    }).passthrough().parse(context?.pending?.f1040);
    if ((claim.line13b_additional_deductions ?? 0) === 0) return "";
    throw new Error(
      "Schedule 1-A positive line 13b needs sourced Part I zero-exclusion review or a Form 2555 exclusion review",
    );
  }
  const form1040 = form1040ReconciliationSchema.parse(
    context?.pending?.f1040,
  );
  if (
    context?.pending && ("form4563" in context.pending ||
      (!positive2555 && "form2555" in context.pending))
  ) {
    throw new Error(
      "Schedule 1-A zero-exclusion review conflicts with a Form 2555 or Form 4563 source",
    );
  }
  let form2555Line45 = 0;
  if (positive2555) {
    const hasTips = (input.qualified_employee_tips?.length ?? 0) > 0 ||
      (input.qualified_form4137_tips?.length ?? 0) > 0 ||
      (input.form4070_reports?.length ?? 0) > 0 ||
      (input.employer_tip_statements?.length ?? 0) > 0 ||
      (input.qualified_trade_business_tips?.length ?? 0) > 0;
    const overtimeCount = input.qualified_w2_overtime?.length ?? 0;
    const hasSeniorOrVehicle = input.taxpayer_age_65_or_older === true ||
      input.spouse_age_65_or_older === true ||
      (input.vehicle_loans?.length ?? 0) > 0;
    const pending2555 = z.object({
      filing_details: physicalPresenceFilingSchema,
    })
      .passthrough().parse(context?.pending?.form2555);
    const lines = calculatePhysicalPresence2555(
      pending2555.filing_details,
      2025,
    );
    if (
      lines.qualifyingDays !== 365 || lines.line45 <= 0 ||
      lines.line50 !== 0 ||
      input.form2555_line45_exclusion !== lines.line45 ||
      input.form2555_line50_housing_deduction !== lines.line50 ||
      hasTips || overtimeCount > 1 ||
      (overtimeCount > 0 && hasSeniorOrVehicle)
    ) {
      throw new Error(
        "Schedule 1-A positive Form 2555 Part I needs a matching full-year exclusion, zero housing deduction, and one supported deduction route",
      );
    }
    form2555Line45 = lines.line45;
  } else if (
    input.form2555_line45_exclusion !== undefined ||
    input.form2555_line50_housing_deduction !== undefined
  ) {
    throw new Error(
      "Schedule 1-A zero-exclusion review conflicts with Form 2555 amounts",
    );
  }
  const parts: string[] = [];
  let total = 0;
  let senior = 0;
  let part1: { line1_agi: number; line3_magi: number } | undefined;
  if (
    (input.qualified_employee_tips?.length ?? 0) > 0 ||
    (input.qualified_form4137_tips?.length ?? 0) > 0 ||
    (input.form4070_reports?.length ?? 0) > 0 ||
    (input.employer_tip_statements?.length ?? 0) > 0 ||
    (input.qualified_trade_business_tips?.length ?? 0) > 0
  ) {
    const lines = calculateQualifiedTipsSchedule1A(
      { taxYear: 2025, formType: "f1040" },
      input,
    );
    const entries = input.qualified_employee_tips ?? [];
    const form4137Entries = input.qualified_form4137_tips ?? [];
    const filedW2s = context?.pending?.w2
      ? w2InputSchema.parse(context.pending.w2).w2s
      : [];
    const sourceW2s = filedW2s.filter((item) =>
      item.box13_statutory_employee !== true &&
      (item.qualified_tips_box14_review !== undefined ||
        (item.box14b_tipped_code !== undefined &&
          isQualifiedTipsOccupationCode(item.box14b_tipped_code) &&
          (item.box7_ss_tips ?? 0) > 0))
    );
    const normalize = (value: string) => value.replaceAll("-", "");
    if (
      sourceW2s.length !== entries.length ||
      !entries.every((entry) =>
        sourceW2s.some((source) =>
          normalize(source.employee_ssn ?? "") ===
            normalize(entry.employee_ssn) &&
          normalize(source.employer_ein ?? "") ===
            normalize(entry.employer_ein) &&
          source.employer_name === entry.employer_name &&
          (source.qualified_tips_box14_review === undefined
            ? entry.source_type === "w2_box7" &&
              source.box7_ss_tips === entry.amount
            : entry.source_type === "w2_box14" &&
              (source.box14_entries ?? []).filter((box14) =>
                  box14.description ===
                    source.qualified_tips_box14_review!.box14_description &&
                  !box14.is_state_sdi_pfml &&
                  box14.amount === entry.amount
                ).length === 1) &&
          source.box5_medicare_wages === entry.box5_medicare_wages &&
          (source.qualified_tips_box14_review?.occupation_code ??
              source.box14b_tipped_code) === entry.occupation_code &&
          (source.box14b_tipped_code === undefined ||
            source.box14b_tipped_code === entry.occupation_code)
        )
      )
    ) {
      throw new Error(
        "Schedule 1-A W-2 tips do not match the employer sources",
      );
    }
    if (
      !(input.form4070_reports ?? []).every((report) =>
        filedW2s.some((source) =>
          normalize(source.employee_ssn ?? "") ===
            normalize(report.employee_ssn) &&
          normalize(source.employer_ein ?? "") ===
            normalize(report.employer_ein) &&
          source.employer_name === report.employer_name &&
          source.box13_statutory_employee !== true &&
          (source.box14b_tipped_code === undefined ||
            source.box14b_tipped_code === report.occupation_code) &&
          isQualifiedTipsOccupationCode(report.occupation_code)
        )
      )
    ) {
      throw new Error(
        "Schedule 1-A Form 4070 tips need a matching filed W-2 employer and occupation",
      );
    }
    if (
      !(input.employer_tip_statements ?? []).every((statement) =>
        filedW2s.some((source) =>
          normalize(source.employee_ssn ?? "") ===
            normalize(statement.employee_ssn) &&
          normalize(source.employer_ein ?? "") ===
            normalize(statement.employer_ein) &&
          source.employer_name === statement.employer_name &&
          source.box13_statutory_employee !== true &&
          source.box1_wages >= statement.amount &&
          source.qualified_tips_box14_review === undefined &&
          (source.box14b_tipped_code === undefined ||
            source.box14b_tipped_code === statement.occupation_code) &&
          isQualifiedTipsOccupationCode(statement.occupation_code)
        )
      )
    ) {
      throw new Error(
        "Schedule 1-A employer tip statement needs a matching filed W-2 employer, wages, and occupation",
      );
    }
    const form4137 = form4137InputSchema.parse(
      context?.pending?.form4137 ?? {},
    );
    const expectedForm4137Entries = (form4137.forms ?? []).flatMap((form) => {
      const employeeSsn = form.recipient === "taxpayer"
        ? form4137.taxpayer_ssn
        : form4137.spouse_ssn;
      if (!employeeSsn) return [];
      return form.employers.flatMap((employer) => {
        if (!employer.ein || employer.tips_received <= 0) return [];
        const matches = filedW2s.filter((source) =>
          normalize(source.employee_ssn ?? "") === normalize(employeeSsn) &&
          normalize(source.employer_ein ?? "") === normalize(employer.ein!) &&
          source.employer_name === employer.name &&
          source.box13_statutory_employee !== true
        );
        if (matches.length > 1) {
          throw new Error(
            "Schedule 1-A Form 4137 tips need one qualifying W-2 per employer",
          );
        }
        const source = matches[0];
        if (!source) return [];
        if (
          employer.tipped_occupation_code !== undefined &&
          source.box14b_tipped_code !== undefined &&
          employer.tipped_occupation_code !== source.box14b_tipped_code
        ) {
          throw new Error(
            "Schedule 1-A Form 4137 occupation disagrees with W-2 box 14b",
          );
        }
        const occupationCode = employer.tipped_occupation_code ??
          source.box14b_tipped_code;
        return occupationCode !== undefined &&
            isQualifiedTipsOccupationCode(occupationCode)
          ? [{
            employee_ssn: employeeSsn,
            employer_ein: employer.ein,
            employer_name: employer.name,
            amount: employer.tips_received,
            occupation_code: occupationCode,
          }]
          : [];
      });
    });
    if (
      form4137Entries.length !== expectedForm4137Entries.length ||
      !form4137Entries.every((entry) => {
        const recipient = entry.employee_ssn.replaceAll("-", "") ===
            form4137.taxpayer_ssn?.replaceAll("-", "")
          ? "taxpayer"
          : entry.employee_ssn.replaceAll("-", "") ===
              form4137.spouse_ssn?.replaceAll("-", "")
          ? "spouse"
          : undefined;
        if (recipient === undefined) return false;
        const employer = (form4137.forms ?? []).find((form) =>
          form.recipient === recipient
        )?.employers.find((candidate) =>
          candidate.ein?.replaceAll("-", "") ===
            entry.employer_ein.replaceAll("-", "") &&
          candidate.name === entry.employer_name &&
          candidate.tips_received === entry.amount
        );
        const source = filedW2s.find((candidate) =>
          candidate.employee_ssn?.replaceAll("-", "") ===
            entry.employee_ssn.replaceAll("-", "") &&
          candidate.employer_ein?.replaceAll("-", "") ===
            entry.employer_ein.replaceAll("-", "") &&
          candidate.employer_name === entry.employer_name &&
          candidate.box13_statutory_employee !== true
        );
        return employer !== undefined && source !== undefined &&
          expectedForm4137Entries.some((expected) =>
            normalize(expected.employee_ssn) ===
              normalize(entry.employee_ssn) &&
            normalize(expected.employer_ein) ===
              normalize(entry.employer_ein) &&
            expected.employer_name === entry.employer_name &&
            expected.amount === entry.amount &&
            expected.occupation_code === entry.occupation_code
          ) &&
          (employer.tipped_occupation_code ?? source.box14b_tipped_code) ===
            entry.occupation_code &&
          (source.box14b_tipped_code === undefined ||
            source.box14b_tipped_code === entry.occupation_code);
      })
    ) {
      throw new Error(
        "Schedule 1-A Form 4137 tips do not match the filed employer and W-2 sources",
      );
    }
    const matchesRecipient = (
      ssn: string,
      sourceSsn: string | undefined,
      returnSsn: string | undefined,
      employmentValid: boolean | undefined,
      issuedBeforeDueDate: boolean | undefined,
      tinIssuedByDueDate: boolean | undefined,
    ) =>
      sourceSsn?.replaceAll("-", "") === ssn &&
      returnSsn?.replaceAll("-", "") === ssn &&
      employmentValid === true && issuedBeforeDueDate === true &&
      tinIssuedByDueDate === true;
    const allRecipientsMatch = qualifiedEmployeeTipRows(input).every(
      (entry) => {
        const ssn = normalize(entry.employee_ssn);
        const taxpayer = matchesRecipient(
          ssn,
          input.taxpayer_ssn,
          form1040.taxpayer_ssn,
          form1040.taxpayer_ssn_valid_for_employment,
          form1040.taxpayer_ssn_issued_before_due_date,
          form1040.taxpayer_tin_issued_by_due_date,
        );
        const spouse = input.filing_status === FilingStatus.MFJ &&
          matchesRecipient(
            ssn,
            input.spouse_ssn,
            form1040.spouse_ssn,
            form1040.spouse_ssn_valid_for_employment,
            form1040.spouse_ssn_issued_before_due_date,
            form1040.spouse_tin_issued_by_due_date,
          );
        return taxpayer || spouse;
      },
    );
    if (
      form1040.filing_status !== input.filing_status ||
      !allRecipientsMatch ||
      Math.round(form1040.line11_agi ?? NaN) !== lines.line1_agi
    ) {
      throw new Error(
        "Schedule 1-A tips identity and Part I/VI do not reconcile to Form 1040",
      );
    }
    if ((input.qualified_trade_business_tips?.length ?? 0) > 0) {
      const nec = context?.pending?.f1099nec
        ? necInputSchema.parse(context.pending.f1099nec).f1099necs
        : [];
      const misc = context?.pending?.f1099m
        ? miscInputSchema.parse(context.pending.f1099m).f1099ms
        : [];
      const k = context?.pending?.f1099k
        ? kInputSchema.parse(context.pending.f1099k).f1099ks
        : [];
      const sources = [
        ...nec.flatMap((item) =>
          item.qualified_tips_review
            ? [{
              source_form: "1099nec" as const,
              business_reference: item.schedule_c_business_reference,
              recipient_ssn: item.recipient_ssn,
              payer_name: item.payer_name,
              payer_tin: item.payer_tin.replaceAll("-", ""),
              source_amount: item.box1_nec,
              amount: item.qualified_tips_review.amount,
              occupation_code: item.qualified_tips_review.occupation_code,
              occupation_review_reference:
                item.qualified_tips_review.occupation_review_reference,
              tip_records_reference:
                item.qualified_tips_review.tip_records_reference,
              included_in_source_amount:
                item.qualified_tips_review.included_in_box1,
              no_other_allocable_deductions:
                item.qualified_tips_review.no_other_allocable_deductions,
              ...(item.qualified_tips_review
                  .allocable_health_plan_identifiers !== undefined
                ? {
                  allocable_health_plan_identifiers: item.qualified_tips_review
                    .allocable_health_plan_identifiers,
                }
                : {}),
              no_other_allocable_deductions_review_reference:
                item.qualified_tips_review
                  .no_other_allocable_deductions_review_reference,
            }]
            : []
        ),
        ...misc.flatMap((item) =>
          item.qualified_tips_box3_review
            ? [{
              source_form: "1099misc" as const,
              business_reference: item.schedule_c_business_reference,
              recipient_ssn: item.recipient_tin,
              payer_name: item.payer_name,
              payer_tin: item.payer_tin,
              source_amount: item.box3_other_income,
              amount: item.qualified_tips_box3_review.amount,
              occupation_code: item.qualified_tips_box3_review.occupation_code,
              occupation_review_reference:
                item.qualified_tips_box3_review.occupation_review_reference,
              tip_records_reference:
                item.qualified_tips_box3_review.tip_records_reference,
              included_in_source_amount:
                item.qualified_tips_box3_review.included_in_box3,
              no_other_allocable_deductions:
                item.qualified_tips_box3_review.no_other_allocable_deductions,
              ...(item.qualified_tips_box3_review
                  .allocable_health_plan_identifiers !== undefined
                ? {
                  allocable_health_plan_identifiers:
                    item.qualified_tips_box3_review
                      .allocable_health_plan_identifiers,
                }
                : {}),
              no_other_allocable_deductions_review_reference:
                item.qualified_tips_box3_review
                  .no_other_allocable_deductions_review_reference,
            }]
            : []
        ),
        ...k.flatMap((item) =>
          item.qualified_tips_box1a_review
            ? [{
              source_form: "1099k" as const,
              business_reference: item.schedule_c_business_reference,
              recipient_ssn: item.recipient_tin,
              payer_name: item.pse_name,
              payer_tin: item.pse_tin?.replaceAll("-", ""),
              source_amount: item.box1a_gross_payments,
              amount: item.qualified_tips_box1a_review.amount,
              occupation_code: item.qualified_tips_box1a_review.occupation_code,
              occupation_review_reference:
                item.qualified_tips_box1a_review.occupation_review_reference,
              tip_records_reference:
                item.qualified_tips_box1a_review.tip_records_reference,
              included_in_source_amount:
                item.qualified_tips_box1a_review.included_in_box1a,
              no_other_allocable_deductions:
                item.qualified_tips_box1a_review.no_other_allocable_deductions,
              ...(item.qualified_tips_box1a_review
                  .allocable_health_plan_identifiers !== undefined
                ? {
                  allocable_health_plan_identifiers:
                    item.qualified_tips_box1a_review
                      .allocable_health_plan_identifiers,
                }
                : {}),
              no_other_allocable_deductions_review_reference:
                item.qualified_tips_box1a_review
                  .no_other_allocable_deductions_review_reference,
            }]
            : []
        ),
      ];
      const reports = input.qualified_trade_business_tips!;
      const canonical = (rows: readonly Record<string, unknown>[]) =>
        rows.map((row) =>
          JSON.stringify(
            Object.fromEntries(
              Object.entries(row).sort(([a], [b]) => a.localeCompare(b)),
            ),
          )
        ).sort();
      if (
        JSON.stringify(canonical(sources)) !==
          JSON.stringify(canonical(reports))
      ) {
        throw new Error(
          "Schedule 1-A business tips do not match filed payer sources",
        );
      }
      const businessOutput = scheduleC.compute(
        { taxYear: 2025, formType: "f1040" },
        context?.pending?.schedule_c as Parameters<typeof scheduleC.compute>[1],
      ).outputs.find((item) => item.nodeType === "schedule1a");
      const businessRows = businessOutput?.fields
        .qualified_tips_schedule_c_businesses;
      const farmOutput = context?.pending?.schedule_f === undefined
        ? undefined
        : scheduleF.compute(
          { taxYear: 2025, formType: "f1040" },
          context.pending.schedule_f as Parameters<typeof scheduleF.compute>[1],
        ).outputs.find((item) => item.nodeType === "schedule1a");
      if (
        tipSourceCanonical(
          farmOutput?.fields.qualified_tips_schedule_f_businesses,
        ) !==
          tipSourceCanonical(input.qualified_tips_schedule_f_businesses)
      ) {
        throw new Error(
          "Schedule1A actual farm source inventory differs from issued owned farm return",
        );
      }
      const scheduleOne = z.object({
        line3_schedule_c: z.number().optional(),
        line15_se_deduction: z.number().optional(),
        line6_schedule_f: z.number().optional(),
        line16_sep_simple: z.number().optional(),
        line17_se_health_insurance: z.number().optional(),
      })
        .passthrough().parse(context?.pending?.schedule1);
      const actualPending = normalizeAllPending(
        context?.pending as Record<string, unknown>,
      );
      const actualHealth = actualPending.form7206;
      if (
        tipSourceCanonical(input.qualified_tips_health_plan_source) !==
          tipSourceCanonical(actualHealth?.single_schedule_c_plan) ||
        tipSourceCanonical(input.qualified_tips_health_plans_source) !==
          tipSourceCanonical(actualHealth?.independent_schedule_c_plans)
      ) {
        throw new Error(
          "Schedule1A business-tip health source must match actual established Form7206 plans",
        );
      }
      let healthDeduction = 0;
      if (input.qualified_tips_health_plan_source) {
        form7206.build(actualHealth!, {
          pending: actualPending,
          filer: context?.filer ?? extractFilerIdentity(actualPending.f1040),
        });
        healthDeduction = calculateSingleScheduleCForm7206(
          input.qualified_tips_health_plan_source,
        ).line14;
      } else if (input.qualified_tips_health_plans_source) {
        healthDeduction =
          assertIndependentOwnerHealthSource(actualPending, context?.filer)
            .deduction;
      }
      const line15 = scheduleOne.line15_se_deduction ?? 0;
      const owned = input.qualified_tips_owner_se_source === undefined
        ? undefined
        : context?.pending
        ? assertOwnedScheduleSE(
          normalizeAllPending(context.pending as Record<string, unknown>),
        )
        : undefined;
      if (
        input.qualified_tips_owner_se_source !== undefined && (!owned ||
          tipSourceCanonical(owned.source) !==
            tipSourceCanonical(input.qualified_tips_owner_se_source))
      ) {
        throw new Error(
          "Schedule1A tips owner halfSE source differs from the actual issued income and businesses",
        );
      }
      if (
        JSON.stringify(businessRows) !==
          JSON.stringify(input.qualified_tips_schedule_c_businesses) ||
        line15 !== (input.qualified_tips_se_deduction ?? 0) ||
        scheduleOne.line3_schedule_c !==
          input.qualified_tips_schedule_c_businesses?.reduce(
            (sum, business) => sum + business.line31_net_profit,
            0,
          ) ||
        (scheduleOne.line6_schedule_f ?? 0) !==
          (input.qualified_tips_schedule_f_profit ?? 0) ||
        (scheduleOne.line16_sep_simple ?? 0) !== 0 ||
        (scheduleOne.line17_se_health_insurance ?? 0) !== healthDeduction ||
        !reports.every((report) => {
          const ssn = report.recipient_ssn.replaceAll("-", "");
          return matchesRecipient(
            ssn,
            input.taxpayer_ssn,
            form1040.taxpayer_ssn,
            form1040.taxpayer_ssn_valid_for_employment,
            form1040.taxpayer_ssn_issued_before_due_date,
            form1040.taxpayer_tin_issued_by_due_date,
          ) || (input.filing_status === FilingStatus.MFJ && matchesRecipient(
            ssn,
            input.spouse_ssn,
            form1040.spouse_ssn,
            form1040.spouse_ssn_valid_for_employment,
            form1040.spouse_ssn_issued_before_due_date,
            form1040.spouse_tin_issued_by_due_date,
          ));
        })
      ) {
        throw new Error(
          "Schedule 1-A business tips do not match Schedule C or SE",
        );
      }
    }
    part1 = lines;
    total += lines.line13_tips;
    parts.push(
      element("QualifiedTipsWagesAmt", lines.line4a_w2_tips),
      element("QualifiedTipsForm4137Amt", lines.line4b_form4137_tips),
      element("QualifiedTipsEmployeeAmt", lines.line4c_employee_tips),
      lines.line5_trade_business_tips > 0
        ? element("QualifiedTipsTradeOrBusAmt", lines.line5_trade_business_tips)
        : "",
      element("TotalQualifiedTipsAmt", lines.line6_total_tips),
      element("SmallerTipsOrMaxDedAmt", lines.line7_capped_tips),
      element("TipsFilingStatusThrshldAmt", lines.line9_threshold),
      lines.line10_excess_magi > 0
        ? element("TipsMAGILessThrshldAmt", lines.line10_excess_magi)
        : "",
      lines.line10_excess_magi > 0
        ? element("TipsMAGILessThrshldDivideNum", lines.line11_thousands)
        : "",
      lines.line10_excess_magi > 0
        ? element("TipsMAGILessThrshldRedAmt", lines.line12_reduction)
        : "",
      element("QualifiedTipsDeductionAmt", lines.line13_tips),
    );
  }
  if ((input.qualified_w2_overtime?.length ?? 0) > 0) {
    const lines = calculateW2OvertimeSchedule1A(
      { taxYear: 2025, formType: "f1040" },
      input,
    );
    const statementEntries = input.qualified_w2_overtime!.filter((entry) =>
      entry.employer_statement_reference !== undefined ||
      entry.aggregate_overtime_statement_reference !== undefined ||
      entry.double_time_excess_statement_reference !== undefined
    );
    const box14Entries = input.qualified_w2_overtime!.filter((entry) =>
      entry.employer_statement_reference === undefined &&
      entry.aggregate_overtime_statement_reference === undefined &&
      entry.double_time_excess_statement_reference === undefined
    );
    if (box14Entries.length > 0) {
      const sourceW2s = context?.pending?.w2
        ? w2InputSchema.parse(context.pending.w2).w2s
        : [];
      const sourceBox14W2s = sourceW2s.filter((w2) =>
        w2.flsa_overtime_review !== undefined &&
        w2.flsa_overtime_review.employer_statement === undefined &&
        w2.flsa_overtime_review.aggregate_overtime_statement === undefined &&
        w2.flsa_overtime_review.double_time_excess_statement === undefined
      );
      const normalize = (value: string) => value.replaceAll("-", "");
      if (
        sourceBox14W2s.length !== box14Entries.length ||
        !box14Entries.every((entry) =>
          sourceBox14W2s.filter((w2) => {
            const premiums = (w2.box14_entries ?? []).filter((box14) =>
              box14.description.trim().toLowerCase() ===
                "flsa overtime premium"
            );
            return normalize(w2.employee_ssn ?? "") ===
                normalize(entry.employee_ssn) &&
              normalize(w2.employer_ein ?? "") ===
                normalize(entry.employer_ein) &&
              w2.box13_statutory_employee !== true &&
              w2.box1_wages === entry.box1_wages &&
              premiums.length === 1 && premiums[0].amount === entry.amount &&
              premiums[0].is_state_sdi_pfml !== true &&
              w2.flsa_overtime_review?.source_reference ===
                entry.source_reference &&
              w2.flsa_overtime_review?.covered_nonexempt_employee === true &&
              w2.flsa_overtime_review?.premium_included_in_box1 === true;
          }).length === 1
        )
      ) {
        throw new Error(
          "Schedule 1-A box 14 overtime does not match the filed W-2 premium and review",
        );
      }
    }
    if (statementEntries.length > 0) {
      const sourceW2s = context?.pending?.w2
        ? w2InputSchema.parse(context.pending.w2).w2s
        : [];
      const sourceStatementW2s = sourceW2s.filter((w2) =>
        w2.flsa_overtime_review?.employer_statement !== undefined ||
        w2.flsa_overtime_review?.aggregate_overtime_statement !== undefined ||
        w2.flsa_overtime_review?.double_time_excess_statement !== undefined
      );
      const normalize = (value: string) => value.replaceAll("-", "");
      if (
        sourceStatementW2s.length !== statementEntries.length ||
        !statementEntries.every((entry) =>
          sourceStatementW2s.some((w2) => {
            const review = w2.flsa_overtime_review;
            const statement = review?.employer_statement;
            const aggregate = review?.aggregate_overtime_statement;
            const doubleTime = review?.double_time_excess_statement;
            const methodMatches = statement !== undefined &&
                aggregate === undefined &&
                doubleTime === undefined &&
                entry.aggregate_overtime_statement_reference === undefined &&
                entry.double_time_excess_statement_reference === undefined &&
                statement.tax_year === 2025 &&
                statement.furnished_to_employee === true &&
                statement.qualified_overtime_premium === entry.amount &&
                statement.statement_reference ===
                  entry.employer_statement_reference ||
              aggregate !== undefined && statement === undefined &&
                doubleTime === undefined &&
                entry.employer_statement_reference === undefined &&
                entry.double_time_excess_statement_reference === undefined &&
                aggregate.tax_year === 2025 &&
                aggregate.furnished_to_employee === true &&
                aggregate.aggregate_time_and_half_overtime_pay / 3 ===
                  entry.amount &&
                aggregate.statement_reference ===
                  entry.aggregate_overtime_statement_reference ||
              doubleTime !== undefined && statement === undefined &&
                aggregate === undefined &&
                entry.employer_statement_reference === undefined &&
                entry.aggregate_overtime_statement_reference === undefined &&
                doubleTime.tax_year === 2025 &&
                doubleTime.furnished_to_employee === true &&
                doubleTime.excess_over_regular_pay / 2 === entry.amount &&
                doubleTime.statement_reference ===
                  entry.double_time_excess_statement_reference;
            return methodMatches &&
              normalize(w2.employee_ssn ?? "") ===
                normalize(entry.employee_ssn) &&
              normalize(w2.employer_ein ?? "") ===
                normalize(entry.employer_ein) &&
              normalize(
                  (statement ?? aggregate ?? doubleTime)!.employee_ssn,
                ) ===
                normalize(entry.employee_ssn) &&
              normalize(
                  (statement ?? aggregate ?? doubleTime)!.employer_ein,
                ) ===
                normalize(entry.employer_ein) &&
              w2.box1_wages === entry.box1_wages &&
              review?.source_reference === entry.source_reference &&
              review?.covered_nonexempt_employee === true &&
              review?.premium_included_in_box1 === true &&
              !(w2.box14_entries ?? []).some((box14) =>
                box14.description.trim().toLowerCase() ===
                  "flsa overtime premium"
              );
          })
        )
      ) {
        throw new Error(
          "Schedule 1-A employer-statement overtime does not match the filed W-2 and furnished statement source",
        );
      }
    }
    const matchesRecipient = (
      sourceSsn: string,
      inputSsn: string | undefined,
      returnSsn: string | undefined,
      employmentValid: boolean | undefined,
      issuedBeforeDueDate: boolean | undefined,
      tinIssuedByDueDate: boolean | undefined,
    ) =>
      sourceSsn.replaceAll("-", "") === inputSsn?.replaceAll("-", "") &&
      sourceSsn.replaceAll("-", "") === returnSsn?.replaceAll("-", "") &&
      employmentValid === true && issuedBeforeDueDate === true &&
      tinIssuedByDueDate === true;
    const ownersMatch = input.qualified_w2_overtime!.every((entry) =>
      matchesRecipient(
        entry.employee_ssn,
        input.taxpayer_ssn,
        form1040.taxpayer_ssn,
        form1040.taxpayer_ssn_valid_for_employment,
        form1040.taxpayer_ssn_issued_before_due_date,
        form1040.taxpayer_tin_issued_by_due_date,
      ) ||
      (input.filing_status === FilingStatus.MFJ && matchesRecipient(
        entry.employee_ssn,
        input.spouse_ssn,
        form1040.spouse_ssn,
        form1040.spouse_ssn_valid_for_employment,
        form1040.spouse_ssn_issued_before_due_date,
        form1040.spouse_tin_issued_by_due_date,
      ))
    );
    if (
      form1040.filing_status !== input.filing_status ||
      !ownersMatch ||
      Math.round(form1040.line11_agi ?? NaN) !== lines.line1_agi
    ) {
      throw new Error(
        "Schedule 1-A overtime identity and Part I/VI do not reconcile to Form 1040",
      );
    }
    part1 = lines;
    total += lines.line21_overtime;
    parts.push(
      element("QualifiedOvertimeWagesAmt", lines.line14a_w2_overtime),
      element("QualifiedOvertimeForm1099Amt", 0),
      element("TotalQualifiedOvertimeAmt", lines.line14c_total_overtime),
      element("SmallerOvertimeOrMaxDedAmt", lines.line15_capped_overtime),
      element("OvertimeFilingStatusThrshldAmt", lines.line17_threshold),
      lines.line18_excess_magi > 0
        ? element("OtMAGILessThrshldAmt", lines.line18_excess_magi)
        : "",
      lines.line18_excess_magi > 0
        ? element("OtMAGILessThrshldDivideNum", lines.line19_thousands)
        : "",
      lines.line18_excess_magi > 0
        ? element("OtMAGILessThrshldRedAmt", lines.line20_reduction)
        : "",
      element("QualifiedOvertimeCompDedAmt", lines.line21_overtime),
    );
  }
  if ((input.vehicle_loans?.length ?? 0) > 0) {
    const lines = calculateVehicleInterestSchedule1A(
      { taxYear: 2025, formType: "f1040" },
      input,
    );
    const returnSsns = [form1040.taxpayer_ssn];
    if (input.filing_status === FilingStatus.MFJ) {
      returnSsns.push(form1040.spouse_ssn);
    }
    if (
      form1040.filing_status !== input.filing_status ||
      input.taxpayer_ssn?.replaceAll("-", "") !==
        form1040.taxpayer_ssn?.replaceAll("-", "") ||
      (input.filing_status === FilingStatus.MFJ &&
        input.spouse_ssn?.replaceAll("-", "") !==
          form1040.spouse_ssn?.replaceAll("-", "")) ||
      !input.vehicle_loans!.every((loan) =>
        returnSsns.some((ssn) =>
          ssn?.replaceAll("-", "") === loan.borrower_ssn.replaceAll("-", "")
        )
      ) ||
      Math.round(form1040.line11_agi ?? NaN) !== lines.line1_agi
    ) {
      throw new Error(
        "Schedule 1-A vehicle interest identity and Part I/VI do not reconcile to Form 1040",
      );
    }
    part1 = lines;
    total += lines.line30_vehicle_interest;
    parts.push(
      ...lines.line22_vehicles.map((loan) =>
        elements("QlfyPassengerVehicleLoanIntGrp", [
          element("VIN", loan.vin),
          element("QualifiedCarLoanIntDedSchAmt", loan.deducted_elsewhere),
          element("QualifiedCarLoanInterestAmt", loan.schedule1a_interest),
        ])
      ),
      element("TotQualifiedCarLoanInterestAmt", lines.line23_total_interest),
      element("SmallerCarLoanIntOrMaxDedAmt", lines.line24_capped_interest),
      element("CarLnIntFilingStatusThrshldAmt", lines.line26_threshold),
      lines.line27_excess_magi > 0
        ? element("CarLnIntMAGILessThrshldAmt", lines.line27_excess_magi)
        : "",
      lines.line27_excess_magi > 0
        ? element("CarLnIntMAGILessThrshldDivNum", lines.line28_thousands)
        : "",
      lines.line27_excess_magi > 0
        ? element("CarLnIntMAGILessThrshldRedAmt", lines.line29_reduction)
        : "",
      element("QualifiedCarLoanInterestDedAmt", lines.line30_vehicle_interest),
    );
  }
  if (seniorDeduction({ taxYear: 2025, formType: "f1040" }, input) > 0) {
    const lines = calculateSeniorOnlySchedule1A(
      { taxYear: 2025, formType: "f1040" },
      input,
    );
    assertSchedule1ASeniorGeneralSource(context?.pending?.general, input, lines.line36a_taxpayer, lines.line36b_spouse);
    const matchesPerson = (
      claimed: number,
      sourceSsn: string | undefined,
      returnSsn: string | undefined,
      returnAge: boolean | undefined,
      employmentValid: boolean | undefined,
      issuedBeforeDueDate: boolean | undefined,
      tinIssuedByDueDate: boolean | undefined,
    ) =>
      claimed === 0 || (
        sourceSsn !== undefined && returnSsn !== undefined &&
        sourceSsn.replaceAll("-", "") === returnSsn.replaceAll("-", "") &&
        returnAge === true && employmentValid === true &&
        issuedBeforeDueDate === true && tinIssuedByDueDate === true
      );
    if (
      form1040.filing_status !== input.filing_status ||
      !matchesPerson(
        lines.line36a_taxpayer,
        input.taxpayer_ssn,
        form1040.taxpayer_ssn,
        form1040.taxpayer_age_65_or_older,
        form1040.taxpayer_ssn_valid_for_employment,
        form1040.taxpayer_ssn_issued_before_due_date,
        form1040.taxpayer_tin_issued_by_due_date,
      ) ||
      !matchesPerson(
        lines.line36b_spouse,
        input.spouse_ssn,
        form1040.spouse_ssn,
        form1040.spouse_age_65_or_older,
        form1040.spouse_ssn_valid_for_employment,
        form1040.spouse_ssn_issued_before_due_date,
        form1040.spouse_tin_issued_by_due_date,
      ) ||
      Math.round(form1040.line11_agi ?? NaN) !== lines.line1_agi
    ) {
      throw new Error(
        "Schedule 1-A senior identity and Part I/VI do not reconcile to Form 1040",
      );
    }
    part1 = lines;
    senior = lines.line37_senior;
    total += senior;
    parts.push(
      element("EnhncSrDedFSThrshldAmt", lines.line32_threshold),
      element("EnhncSrDedMAGILessThrshldAmt", lines.line33_excess_magi),
      element("EnhnSrDedMAGILessThrshldRedAmt", lines.line34_reduction),
      element("SpecfiedDolLessThrshldRedAmt", lines.line35_per_person),
      lines.line36a_taxpayer > 0
        ? element("PrimaryEnhancedSeniorDedAmt", lines.line36a_taxpayer)
        : "",
      lines.line36b_spouse > 0
        ? element("SpouseEnhancedSeniorDedAmt", lines.line36b_spouse)
        : "",
      element("EnhancedSeniorDeductionAmt", lines.line37_senior),
    );
  }
  if (
    !part1 && total === 0 &&
    (form1040.line13b_additional_deductions ?? 0) === 0
  ) return "";
  if (
    !part1 || form1040.filing_status !== input.filing_status ||
    Math.round(form1040.line11_agi ?? NaN) !== part1.line1_agi ||
    (form1040.line13b_additional_deductions ?? 0) !== total ||
    (form1040.schedule1a_line37_senior_deduction ?? 0) !== senior
  ) {
    throw new Error(
      "Schedule 1-A total and senior deduction do not reconcile to Form 1040",
    );
  }
  if (total === 0) return "";
  return elements("IRS1040Schedule1A", [
    element("AdjustedGrossIncomeAmt", part1.line1_agi),
    form2555Line45 > 0
      ? element("TotalIncomeExclusionAmt", form2555Line45)
      : "",
    form2555Line45 > 0
      ? element("TotalExclusionsDeductionAmt", form2555Line45)
      : "",
    element("ModifiedAGIAmt", part1.line3_magi),
    ...parts,
    element("TotalAdditionalDeductionsAmt", total),
  ]);
}

export const schedule1a: MefFormDescriptor<"schedule1a", Input> = {
  pendingKey: "schedule1a",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s1a--2025.pdf",
  build: buildSchedule,
};
