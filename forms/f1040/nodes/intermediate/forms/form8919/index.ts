import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { form8959 } from "../form8959/index.ts";
import { schedule_se } from "../schedule_se/index.ts";

const amount = z.number().int().nonnegative();
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const tin = z.string().regex(/^(?:\d{2}-?\d{7}|\d{3}-?\d{2}-?\d{4})$/);
const validDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}, "Form 8919 correspondence date must be valid");

export const reasonCodeSchema = z.enum(["A", "C", "G", "H"]);

export const employerSchema = z.object({
  name: z.string().trim().min(1),
  tin_type: z.enum(["ein", "ssn", "unknown"]),
  tin: tin.optional(),
  reason_code: reasonCodeSchema,
  correspondence_received_date: validDate.optional(),
  correspondence_reference: z.string().trim().min(1).optional(),
  ss8_filed_date: validDate.optional(),
  ss8_filing_reference: z.string().trim().min(1).optional(),
  form1099_received: z.boolean(),
  wages: amount.positive(),
  form1099_payer_tin: tin.optional(),
}).strict().superRefine((employer, ctx) => {
  if ((employer.tin_type === "unknown") === (employer.tin !== undefined)) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8919 firm needs a TIN or an unknown-TIN indicator",
    });
  }
  if (
    employer.tin && employer.tin_type === "ein" &&
    !/^\d{2}-?\d{7}$/.test(employer.tin)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8919 employer EIN has the wrong format",
    });
  }
  if (
    employer.tin && employer.tin_type === "ssn" &&
    !/^\d{3}-?\d{2}-?\d{4}$/.test(employer.tin)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8919 employer SSN has the wrong format",
    });
  }
  if (
    ["A", "C"].includes(employer.reason_code) !==
      (employer.correspondence_received_date !== undefined)
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8919 reason A/C needs a correspondence date, G/H must omit it",
    });
  }
  if (
    ["A", "C"].includes(employer.reason_code) !==
      (employer.correspondence_reference !== undefined)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8919 reason A/C needs an IRS correspondence reference",
    });
  }
  const ss8Required = ["A", "G"].includes(employer.reason_code);
  const ss8Complete = employer.ss8_filed_date !== undefined &&
    employer.ss8_filing_reference !== undefined;
  const ss8Present = employer.ss8_filed_date !== undefined ||
    employer.ss8_filing_reference !== undefined;
  if ((ss8Required && !ss8Complete) || (!ss8Required && ss8Present)) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8919 reason A/G needs Form SS-8 filing date and reference",
    });
  }
  if (employer.reason_code === "H" && !employer.form1099_received) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8919 reason H needs a 1099-MISC or 1099-NEC",
    });
  }
  if (
    employer.form1099_received !==
      (employer.form1099_payer_tin !== undefined)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8919 column (e) must match a 1099-MISC/NEC source link",
    });
  }
});

export const formSchema = z.object({
  recipient: z.enum(["taxpayer", "spouse"]),
  employers: z.array(employerSchema).min(1),
}).strict();

export const form1099SourceSchema = z.object({
  kind: z.enum(["1099misc", "1099nec"]),
  recipient_ssn: ssn,
  payer_name: z.string().trim().min(1),
  payer_tin: tin,
  amount: z.number().positive(),
}).strict();

export const w2SourceSchema = z.object({
  employee_ssn: z.string().optional(),
  employer_name: z.string().optional(),
  employer_ein: z.string().optional(),
  ss_wages_and_tips: z.number().nonnegative(),
  rrta_compensation: z.number().nonnegative(),
}).strict();

export const form4137SourceSchema = z.object({
  recipient: z.enum(["taxpayer", "spouse"]),
  line10_ss_tips: z.number().nonnegative(),
}).strict();

export const inputSchema = z.object({
  taxpayer_ssn: ssn.optional(),
  spouse_ssn: ssn.optional(),
  forms: z.array(formSchema).optional(),
  form1099_sources: z.array(form1099SourceSchema).optional(),
  w2_sources: z.array(w2SourceSchema).optional(),
  form4137_sources: z.array(form4137SourceSchema).optional(),
}).strict();

export type Form8919Input = z.infer<typeof inputSchema>;
export type Form8919Calculation = {
  recipient: "taxpayer" | "spouse";
  employers: z.infer<typeof employerSchema>[];
  line6: number;
  line8: number;
  line9: number;
  line10: number;
  line11: number;
  line12: number;
  line13: number;
};

const digits = (value: string) => value.replace(/\D/g, "");

export function calculateForm8919(
  input: Form8919Input,
  ssWageBase: number,
): Form8919Calculation[] {
  const forms = input.forms ?? [];
  if (
    input.taxpayer_ssn && input.spouse_ssn &&
    digits(input.taxpayer_ssn) === digits(input.spouse_ssn)
  ) {
    throw new Error("Form 8919 taxpayer and spouse SSNs must differ");
  }
  const seenRecipients = new Set<string>();
  for (const form of forms) {
    if (
      !(form.recipient === "spouse" ? input.spouse_ssn : input.taxpayer_ssn)
    ) {
      throw new Error(`Form 8919 needs ${form.recipient} SSN`);
    }
    if (seenRecipients.has(form.recipient)) {
      throw new Error("Form 8919 needs one combined form per recipient");
    }
    seenRecipients.add(form.recipient);
    const firms = new Set<string>();
    for (const employer of form.employers) {
      const firm = `${employer.name}\u0000${
        employer.tin ? digits(employer.tin) : "UNKNOWN"
      }`;
      if (firms.has(firm)) {
        throw new Error("Form 8919 needs one row per firm");
      }
      firms.add(firm);
    }
  }
  if (forms.length === 0 && (input.form1099_sources?.length ?? 0) === 0) {
    return [];
  }
  const w2ByRecipient = new Map<"taxpayer" | "spouse", {
    ssWages: number;
    rrtaCompensation: number;
    employers: Set<string>;
  }>();
  for (const source of input.w2_sources ?? []) {
    const employeeSsn = source.employee_ssn && digits(source.employee_ssn);
    const recipient = employeeSsn === undefined
      ? input.spouse_ssn === undefined ? "taxpayer" : undefined
      : employeeSsn === digits(input.taxpayer_ssn ?? "")
      ? "taxpayer"
      : employeeSsn === digits(input.spouse_ssn ?? "")
      ? "spouse"
      : undefined;
    if (!recipient) {
      throw new Error("Form 8919 W-2 needs a filer-matching employee SSN");
    }
    const prior = w2ByRecipient.get(recipient) ?? {
      ssWages: 0,
      rrtaCompensation: 0,
      employers: new Set<string>(),
    };
    prior.ssWages += source.ss_wages_and_tips;
    prior.rrtaCompensation += source.rrta_compensation;
    if (source.employer_ein) {
      prior.employers.add(digits(source.employer_ein));
    }
    w2ByRecipient.set(recipient, prior);
  }
  const form4137ByRecipient = new Map<"taxpayer" | "spouse", number>();
  for (const source of input.form4137_sources ?? []) {
    form4137ByRecipient.set(
      source.recipient,
      (form4137ByRecipient.get(source.recipient) ?? 0) +
        source.line10_ss_tips,
    );
  }
  const sourceTotals = new Map<string, { amount: number; name: string }>();
  for (const source of input.form1099_sources ?? []) {
    const recipient =
      digits(source.recipient_ssn) === digits(input.taxpayer_ssn ?? "")
        ? "taxpayer"
        : digits(source.recipient_ssn) === digits(input.spouse_ssn ?? "")
        ? "spouse"
        : undefined;
    if (!recipient) {
      throw new Error(
        "Form 8919 1099-MISC/NEC recipient does not match a filer",
      );
    }
    const key = `${recipient}:${digits(source.payer_tin)}`;
    const prior = sourceTotals.get(key);
    if (prior && prior.name !== source.payer_name) {
      throw new Error(
        "Form 8919 1099-MISC/NEC payer names disagree for one TIN",
      );
    }
    sourceTotals.set(key, {
      amount: (prior?.amount ?? 0) + source.amount,
      name: source.payer_name,
    });
  }
  const matchedSources = new Set<string>();
  const result = forms.map((form) => {
    for (const employer of form.employers) {
      if (!employer.form1099_payer_tin) continue;
      const key = `${form.recipient}:${digits(employer.form1099_payer_tin)}`;
      if (matchedSources.has(key)) {
        throw new Error(
          "Form 8919 1099-MISC/NEC source is claimed by multiple firms",
        );
      }
      matchedSources.add(key);
      const source = sourceTotals.get(key);
      if (
        !source || Math.round(source.amount) !== employer.wages ||
        source.name !== employer.name
      ) {
        throw new Error(
          "Form 8919 firm wages disagree with routed 1099-MISC/NEC",
        );
      }
      if (
        employer.tin &&
        digits(employer.tin) !== digits(employer.form1099_payer_tin)
      ) {
        throw new Error(
          "Form 8919 firm TIN disagrees with 1099-MISC/NEC payer",
        );
      }
    }
    for (const employer of form.employers) {
      if (employer.reason_code !== "H") continue;
      const w2Employers = w2ByRecipient.get(form.recipient)?.employers;
      if (!employer.tin || !w2Employers?.has(digits(employer.tin))) {
        throw new Error("Form 8919 reason H needs a W-2 from the same firm");
      }
    }
    const line6 = form.employers.reduce(
      (sum, employer) => sum + employer.wages,
      0,
    );
    const w2 = w2ByRecipient.get(form.recipient);
    const line8 = Math.round(
      (w2?.ssWages ?? 0) +
        Math.min(w2?.rrtaCompensation ?? 0, ssWageBase) +
        (form4137ByRecipient.get(form.recipient) ?? 0),
    );
    const line9 = Math.max(0, ssWageBase - line8);
    const line10 = Math.min(line6, line9);
    const line11 = Math.round(line10 * 0.062);
    const line12 = Math.round(line6 * 0.0145);
    return {
      recipient: form.recipient,
      employers: form.employers,
      line6,
      line8,
      line9,
      line10,
      line11,
      line12,
      line13: line11 + line12,
    };
  });
  for (const key of sourceTotals.keys()) {
    if (!matchedSources.has(key)) {
      throw new Error(
        "Routed 1099-MISC/NEC needs a matching Form 8919 firm row",
      );
    }
  }
  return result;
}

class Form8919Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8919";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    schedule2,
    schedule_se,
    form8959,
  ]);

  compute(ctx: NodeContext, rawInput: Form8919Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const forms = calculateForm8919(input, cfg.ssWageBase);
    if (forms.length === 0) return { outputs: [] };
    const line6 = forms.reduce((sum, form) => sum + form.line6, 0);
    const line10 = forms.reduce((sum, form) => sum + form.line10, 0);
    const line13 = forms.reduce((sum, form) => sum + form.line13, 0);
    return {
      outputs: [
        output(f1040, { line1g_wages_8919: line6 }),
        output(schedule2, { line6_uncollected_8919: line13 }),
        output(schedule_se, { wages_8919: line10 }),
        output(form8959, { wages_8919: line6 }),
      ],
    };
  }
}

export const form8919 = new Form8919Node();
