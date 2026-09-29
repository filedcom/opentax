import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { form8959 } from "../form8959/index.ts";
import { form8919 } from "../form8919/index.ts";

const employerSchema = z.object({
  name: z.string().min(1),
  ein: z.string().regex(/^\d{2}-?\d{7}$/).optional(),
  applied_for_ein: z.literal(true).optional(),
  tips_received: z.number().nonnegative(),
  tips_reported: z.number().nonnegative(),
}).strict().superRefine((employer, ctx) => {
  if ((employer.ein === undefined) === (employer.applied_for_ein !== true)) {
    ctx.addIssue({
      code: "custom",
      message: "Form 4137 employer needs EIN or APPLIED FOR",
    });
  }
  if (employer.tips_reported > employer.tips_received) {
    ctx.addIssue({
      code: "custom",
      message: "Form 4137 reported tips exceed received tips",
    });
  }
});

const recipientSchema = z.enum(["taxpayer", "spouse"]);

const below20TipMonthSchema = z.object({
  employer_index: z.number().int().min(1),
  month: z.number().int().min(1).max(12),
  tips_received: z.number().positive().lt(20),
  tips_reported: z.number().nonnegative(),
}).strict().refine((month) => month.tips_reported <= month.tips_received, {
  message: "Form 4137 below-$20 month reported tips exceed received tips",
});

const allocatedTipDailyRecordSchema = z.object({
  date: z.string().refine((value) => {
    if (!/^(2024-12|2025-\d{2})-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value;
  }, "Form 4137 tip record date must be in December 2024 or 2025"),
  cash_charge_tips_received: z.number().nonnegative(),
  tips_reported_to_employer: z.number().nonnegative(),
  report_date: z.string().refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value;
  }, "Form 4137 report date must be valid").optional(),
  evidence_type: z.enum([
    "daily_tip_diary",
    "receipt_or_charge_slip",
    "employer_electronic_record",
  ]),
  evidence_reference: z.string().trim().min(1),
}).strict().superRefine((record, ctx) => {
  if (record.tips_reported_to_employer > record.cash_charge_tips_received) {
    ctx.addIssue({
      code: "custom",
      message: "Form 4137 daily reported tips exceed received tips",
    });
  }
  if (
    (record.tips_reported_to_employer > 0) !==
      (record.report_date !== undefined)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Form 4137 reported tips need a report date",
    });
  }
  if (record.report_date !== undefined && record.report_date < record.date) {
    ctx.addIssue({
      code: "custom",
      message: "Form 4137 report date precedes tip receipt",
    });
  }
});

const allocatedTipRecordSchema = z.object({
  employer_index: z.number().int().min(1),
  daily_records: z.array(allocatedTipDailyRecordSchema).min(1),
}).strict();

function included2025TipAmounts(
  record: z.infer<typeof allocatedTipDailyRecordSchema>,
): { received: number; reported: number } {
  const unreported = record.cash_charge_tips_received -
    record.tips_reported_to_employer;
  const receiptYear = Number(record.date.slice(0, 4));
  const reportedIn2025 = record.report_date !== undefined &&
    (record.date.startsWith("2024-12-")
      ? record.report_date > "2024-12-31" &&
        record.report_date <= "2025-01-10"
      : !(record.date.startsWith("2025-12-") &&
        record.report_date > "2025-12-31" &&
        record.report_date <= "2026-01-12"));
  const reported = reportedIn2025 ? record.tips_reported_to_employer : 0;
  return {
    received: (receiptYear === 2025 ? unreported : 0) + reported,
    reported,
  };
}

const formSchema = z.object({
  recipient: recipientSchema,
  employers: z.array(employerSchema).min(1),
  below_20_tip_months: z.array(below20TipMonthSchema).optional(),
  allocated_tip_records: z.array(allocatedTipRecordSchema).optional(),
  government_employee_tips: z.number().nonnegative().optional(),
  ss_wages_from_w2: z.number().nonnegative().optional(),
}).strict();

const w2TipSourceSchema = z.object({
  employee_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
  employer_name: z.string().min(1).optional(),
  employer_ein: z.union([
    z.string().regex(/^\d{2}-?\d{7}$/),
    z.literal("Applied For"),
  ]).optional(),
  allocated_tips: z.number().nonnegative(),
  rrta_compensation: z.number().nonnegative().optional(),
  ss_wages_and_tips: z.number().nonnegative().optional(),
}).strict();

export const inputSchema = z.object({
  taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
  spouse_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
  forms: z.array(formSchema).optional(),
  w2_tip_sources: z.array(w2TipSourceSchema).optional(),
}).strict();

export type Form4137Input = z.infer<typeof inputSchema>;
export type Form4137Calculation = {
  recipient: "taxpayer" | "spouse";
  employers: z.infer<typeof employerSchema>[];
  totalTipsReceived: number;
  totalTipsReported: number;
  unreportedTips: number;
  incidentalTips: number;
  medicareTips: number;
  ssWagesAndTips: number;
  ssWageBaseRoom: number;
  governmentEmployeeTips: number;
  ssTips: number;
  ssTax: number;
  medicareTax: number;
  totalTax: number;
};

export function calculateForm4137(
  input: Form4137Input,
  ssWageBase: number,
): Form4137Calculation[] {
  const forms = input.forms ?? [];
  const sources = input.w2_tip_sources ?? [];
  const recipients = new Set(forms.map((form) => form.recipient));
  if (recipients.size !== forms.length) {
    throw new Error("Form 4137 needs one form per tip recipient");
  }
  if (
    forms.length === 0 && sources.every((source) => source.allocated_tips === 0)
  ) {
    return [];
  }
  const taxpayerSsn = input.taxpayer_ssn?.replaceAll("-", "");
  const spouseSsn = input.spouse_ssn?.replaceAll("-", "");
  if (taxpayerSsn !== undefined && taxpayerSsn === spouseSsn) {
    throw new Error("Form 4137 taxpayer and spouse SSNs must differ");
  }
  const attributedSources = sources.map((source) => {
    const employeeSsn = source.employee_ssn?.replaceAll("-", "");
    let recipient: "taxpayer" | "spouse";
    if (employeeSsn === undefined) {
      if (spouseSsn !== undefined) {
        throw new Error(
          "Form 4137 joint-return W-2 needs employee SSN for tip attribution",
        );
      }
      recipient = "taxpayer";
    } else if (taxpayerSsn !== undefined && employeeSsn === taxpayerSsn) {
      recipient = "taxpayer";
    } else if (spouseSsn !== undefined && employeeSsn === spouseSsn) {
      recipient = "spouse";
    } else {
      throw new Error("Form 4137 W-2 employee SSN does not match a filer");
    }
    if (source.allocated_tips > 0 && !recipients.has(recipient)) {
      throw new Error(
        `Form 4137 ${recipient} allocated tips need employer tip records`,
      );
    }
    if ((source.rrta_compensation ?? 0) > 0 && source.allocated_tips > 0) {
      throw new Error(
        "Form 4137 cannot include tips from RRTA-covered work",
      );
    }
    return { ...source, recipient };
  });
  return forms.map((form) => {
    const related = attributedSources.filter((source) =>
      source.recipient === form.recipient
    );
    const employerKeys = new Set<string>();
    for (const employer of form.employers) {
      const key = `${employer.name}\u0000${
        employer.ein?.replaceAll("-", "") ?? "Applied For"
      }`;
      if (employerKeys.has(key)) {
        throw new Error("Form 4137 needs one row per employer");
      }
      employerKeys.add(key);
    }
    for (const source of related) {
      if ((source.rrta_compensation ?? 0) === 0) continue;
      if (!source.employer_name || !source.employer_ein) {
        throw new Error(
          "Form 4137 RRTA W-2 needs employer name and EIN",
        );
      }
      const sourceEin = source.employer_ein === "Applied For"
        ? "Applied For"
        : source.employer_ein.replaceAll("-", "");
      if (
        form.employers.some((employer) =>
          employer.name === source.employer_name &&
          (employer.ein?.replaceAll("-", "") ?? "Applied For") === sourceEin
        )
      ) {
        throw new Error(
          "Form 4137 cannot include RRTA-covered employer tips",
        );
      }
    }
    const allocatedByEmployer = new Map<number, number>();
    for (const source of related) {
      if (source.allocated_tips === 0) continue;
      if (!source.employer_name || !source.employer_ein) {
        throw new Error(
          "Form 4137 allocated-tip W-2 needs employer name and EIN",
        );
      }
      const sourceEin = source.employer_ein;
      const index = form.employers.findIndex((employer) =>
        employer.name === source.employer_name &&
        (employer.ein?.replaceAll("-", "") ?? "Applied For") ===
          (sourceEin === "Applied For"
            ? "Applied For"
            : sourceEin.replaceAll("-", ""))
      );
      if (index < 0) {
        throw new Error(
          "Form 4137 allocated-tip W-2 employer does not match line 1",
        );
      }
      allocatedByEmployer.set(
        index,
        (allocatedByEmployer.get(index) ?? 0) + source.allocated_tips,
      );
    }
    const totalTipsReceived = form.employers.reduce(
      (sum, employer) => sum + employer.tips_received,
      0,
    );
    const totalTipsReported = form.employers.reduce(
      (sum, employer) => sum + employer.tips_reported,
      0,
    );
    const unreportedTips = totalTipsReceived - totalTipsReported;
    const allocatedRecordByEmployer = new Map<number, boolean>();
    for (const records of form.allocated_tip_records ?? []) {
      const index = records.employer_index - 1;
      if (index >= form.employers.length) {
        throw new Error("Form 4137 allocated tip record has no employer row");
      }
      if (allocatedRecordByEmployer.has(index)) {
        throw new Error("Form 4137 duplicate employer tip record set");
      }
      const dates = new Set<string>();
      let received = 0;
      let reported = 0;
      for (const record of records.daily_records) {
        if (dates.has(record.date)) {
          throw new Error("Form 4137 duplicate daily tip record date");
        }
        dates.add(record.date);
        const included = included2025TipAmounts(record);
        received += included.received;
        reported += included.reported;
      }
      const employer = form.employers[index];
      if (
        received !== employer.tips_received ||
        reported !== employer.tips_reported
      ) {
        throw new Error(
          "Form 4137 daily tip records disagree with employer line 1 totals",
        );
      }
      allocatedRecordByEmployer.set(index, true);
    }
    for (const [index, allocated] of allocatedByEmployer) {
      const employer = form.employers[index];
      if (
        allocated > employer.tips_received - employer.tips_reported &&
        !allocatedRecordByEmployer.has(index)
      ) {
        throw new Error(
          `Form 4137 ${form.recipient} employer unreported tips are below W-2 allocated tips without reconciled daily records`,
        );
      }
    }
    const below20Months = form.below_20_tip_months ?? [];
    const seenMonths = new Set<string>();
    const incidentalByEmployer = new Map<number, {
      received: number;
      reported: number;
    }>();
    for (const month of below20Months) {
      if (month.employer_index > form.employers.length) {
        throw new Error("Form 4137 below-$20 month has no employer row");
      }
      const key = `${month.employer_index}:${month.month}`;
      if (seenMonths.has(key)) {
        throw new Error("Form 4137 duplicate employer/month tip record");
      }
      seenMonths.add(key);
      const prior = incidentalByEmployer.get(month.employer_index) ?? {
        received: 0,
        reported: 0,
      };
      incidentalByEmployer.set(month.employer_index, {
        received: prior.received + month.tips_received,
        reported: prior.reported + month.tips_reported,
      });
    }
    for (const [index, monthly] of incidentalByEmployer) {
      const employer = form.employers[index - 1];
      if (
        monthly.received > employer.tips_received ||
        monthly.reported > employer.tips_reported ||
        monthly.received - monthly.reported >
          employer.tips_received - employer.tips_reported
      ) {
        throw new Error(
          "Form 4137 below-$20 month records exceed employer annual tips",
        );
      }
    }
    for (const employer of form.employers) {
      const employerEin = employer.ein?.replaceAll("-", "") ?? "Applied For";
      if (
        !related.some((source) =>
          (source.rrta_compensation ?? 0) === 0 &&
          source.employer_name === employer.name &&
          (source.employer_ein === "Applied For"
              ? "Applied For"
              : source.employer_ein?.replaceAll("-", "")) === employerEin
        )
      ) {
        throw new Error(
          `Form 4137 ${form.recipient} line 1 employer does not match a filed W-2`,
        );
      }
    }
    const incidentalTips = below20Months.reduce(
      (sum, month) => sum + month.tips_received - month.tips_reported,
      0,
    );
    if (incidentalTips > unreportedTips) {
      throw new Error("Form 4137 line 5 exceeds unreported tips");
    }
    const medicareTips = unreportedTips - incidentalTips;
    const governmentEmployeeTips = form.government_employee_tips ?? 0;
    if (governmentEmployeeTips > medicareTips) {
      throw new Error(
        "Form 4137 government employee tips exceed Medicare tips",
      );
    }
    const allW2WagesKnown = related.length > 0 &&
      related.every((source) => source.ss_wages_and_tips !== undefined);
    const sourcedWages = allW2WagesKnown
      ? related.reduce(
        (sum, source) => sum + (source.ss_wages_and_tips ?? 0),
        0,
      )
      : undefined;
    if (
      sourcedWages !== undefined && form.ss_wages_from_w2 !== undefined &&
      sourcedWages !== form.ss_wages_from_w2
    ) {
      throw new Error("Form 4137 line 8 disagrees with W-2 wages and tips");
    }
    const ssWages = form.ss_wages_from_w2 ?? sourcedWages;
    if (ssWages === undefined) {
      throw new Error(
        "Form 4137 line 8 needs all W-2 social security wages and tips",
      );
    }
    const rrtaCompensation = related.reduce(
      (sum, source) => sum + (source.rrta_compensation ?? 0),
      0,
    );
    const ssWagesAndTips = ssWages + Math.min(rrtaCompensation, ssWageBase);
    const ssWageBaseRoom = Math.max(0, ssWageBase - ssWagesAndTips);
    const ssTips = Math.min(
      Math.max(0, medicareTips - governmentEmployeeTips),
      ssWageBaseRoom,
    );
    const ssTax = Math.round(ssTips * 0.062);
    const medicareTax = Math.round(medicareTips * 0.0145);
    return {
      recipient: form.recipient,
      employers: form.employers,
      totalTipsReceived,
      totalTipsReported,
      unreportedTips,
      incidentalTips,
      medicareTips,
      ssWagesAndTips,
      ssWageBaseRoom,
      governmentEmployeeTips,
      ssTips,
      ssTax,
      medicareTax,
      totalTax: ssTax + medicareTax,
    };
  });
}

class Form4137Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4137";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    schedule2,
    agi_aggregator,
    form8959,
    form8919,
  ]);

  compute(ctx: NodeContext, rawInput: Form4137Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No form4137 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);
    const forms = calculateForm4137(input, cfg.ssWageBase);
    const tipIncome = forms.reduce((sum, form) => sum + form.unreportedTips, 0);
    const medicareTips = forms.reduce(
      (sum, form) => sum + form.medicareTips,
      0,
    );
    const tipTax = forms.reduce((sum, form) => sum + form.totalTax, 0);
    return {
      outputs: [
        ...(tipIncome > 0
          ? [output(f1040, { line1c_unreported_tips: tipIncome })]
          : []),
        ...(tipIncome > 0
          ? [output(agi_aggregator, { line1c_unreported_tips: tipIncome })]
          : []),
        ...(tipTax > 0
          ? [output(schedule2, { line5_unreported_tip_tax: tipTax })]
          : []),
        ...(medicareTips > 0
          ? [output(form8959, { unreported_tips: medicareTips })]
          : []),
        ...(forms.length > 0
          ? [output(form8919, {
            form4137_sources: forms.map((form) => ({
              recipient: form.recipient,
              line10_ss_tips: form.ssTips,
            })),
          })]
          : []),
      ],
    };
  }
}

export const form4137 = new Form4137Node();
