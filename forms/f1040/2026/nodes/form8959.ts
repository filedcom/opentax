import { f8812 } from "../../nodes/inputs/credits/child/f8812/index.ts";
import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  additionalMedicareTax,
  regularMedicareTax,
} from "../../nodes/intermediate/forms/taxes/employment/form8959/amounts.ts";
import { f1040_2026_node } from "./f1040.ts";
import { schedule2_2026 } from "./schedule2.ts";

const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const reference = z.string().trim().min(1);
const normalize = (value: string) => value.replaceAll("-", "");
export const w2MedicareSourceSchema = z.object({
  employee_ssn: ssn,
  employer_ein: z.string().regex(/^\d{2}-?\d{7}$/),
  source_document_reference: reference,
  box5_medicare_wages: money,
  box6_medicare_withheld: money,
  uncollected_fica_medicare: money,
  rrta_compensation: money,
  rrta_additional_withheld: money,
}).strict();
const ownerAmount = z.object({
  employee_ssn: ssn,
  source_reference: reference,
  amount: money.int(),
}).strict();
export const inputSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
  w2_medicare_sources_2026: z.array(w2MedicareSourceSchema).default([]),
  form4137_medicare_sources_2026: z.array(ownerAmount).default([]),
  form8919_medicare_sources_2026: z.array(ownerAmount).default([]),
  // One finalized Schedule SE line 6 per owner. Losses never offset the other spouse.
  schedule_se_medicare_sources_2026: z.array(
    ownerAmount.extend({ amount: z.number().int().safe() }),
  ).default([]),
  ct2_medicare_sources_2026: z.array(
    z.object({
      employee_ssn: ssn,
      source_reference: reference,
      compensation: money,
      additional_tax_paid: money,
    }).strict(),
  ).default([]),
}).strict();
export type Form8959Input2026 = z.input<typeof inputSchema>;

/** 2026 printed form, with distinct employment and self-employment destinations. */
export function calculateForm8959_2026(raw: Form8959Input2026) {
  const input = inputSchema.parse(raw);
  const joint = input.filing_status === FilingStatus.MFJ;
  if (
    joint &&
    (!input.spouse_ssn ||
      normalize(input.spouse_ssn) === normalize(input.taxpayer_ssn))
  ) {
    throw new Error("Joint Form 8959 needs distinct filer identities");
  }
  const owner = (value: string) => {
    const id = normalize(value);
    if (
      id !== normalize(input.taxpayer_ssn) &&
      !(joint && id === normalize(input.spouse_ssn!))
    ) {
      throw new Error("Form 8959 source owner does not belong to this return");
    }
    return id;
  };
  const refs = new Set<string>();
  const employers = new Set<string>();
  for (const row of input.w2_medicare_sources_2026) {
    const key = `${owner(row.employee_ssn)}:${normalize(row.employer_ein)}`;
    if (refs.has(row.source_document_reference) || employers.has(key)) {
      throw new Error(
        "Duplicate Form 8959 W-2 source or employer needs correction reconciliation",
      );
    }
    refs.add(row.source_document_reference);
    employers.add(key);
  }
  for (
    const rows of [
      input.form4137_medicare_sources_2026,
      input.form8919_medicare_sources_2026,
      input.schedule_se_medicare_sources_2026,
      input.ct2_medicare_sources_2026,
    ]
  ) {
    const owners = new Set<string>();
    for (const row of rows) {
      const id = owner(row.employee_ssn);
      if (owners.has(id) || refs.has(row.source_reference)) {
        throw new Error(
          "Form 8959 requires one finalized source per form and owner, with distinct references",
        );
      }
      owners.add(id);
      refs.add(row.source_reference);
    }
  }
  const sum = <T>(rows: T[], amount: (row: T) => number) =>
    rows.reduce((n, row) => n + amount(row), 0);
  const round = (n: number) => {
    const value = Math.round(n);
    if (!Number.isSafeInteger(value)) {
      throw new Error("Form 8959 amount exceeds whole-dollar range");
    }
    return value;
  };
  const w2s = input.w2_medicare_sources_2026;
  const ct2 = input.ct2_medicare_sources_2026;
  const threshold = joint
    ? 250_000
    : input.filing_status === FilingStatus.MFS
    ? 125_000
    : 200_000;
  const wageSource = sum(w2s, (r) => r.box5_medicare_wages);
  const tipSource = sum(input.form4137_medicare_sources_2026, (r) => r.amount);
  const wage8919Source = sum(
    input.form8919_medicare_sources_2026,
    (r) => r.amount,
  );
  const rrtaSource = sum(w2s, (r) => r.rrta_compensation) +
    sum(ct2, (r) => r.compensation);
  const seSource = sum(
    input.schedule_se_medicare_sources_2026,
    (r) => Math.max(0, r.amount),
  );
  const line1 = round(wageSource),
    line2 = round(tipSource),
    line3 = round(wage8919Source);
  const line4 = round(line1 + line2 + line3),
    line6 = Math.max(0, line4 - threshold);
  const line7 = additionalMedicareTax(line6);
  const line8 = round(rrtaSource), line10 = Math.max(0, line8 - threshold);
  const line11 = additionalMedicareTax(line10), line12 = line7 + line11;
  const line13 = round(seSource), line16 = Math.max(0, threshold - line4);
  const line17 = Math.max(0, line13 - line16),
    line18 = additionalMedicareTax(line17);
  const line19 = round(
    sum(w2s, (r) => r.box6_medicare_withheld + r.uncollected_fica_medicare),
  );
  const line21 = regularMedicareTax(line1),
    line22 = Math.max(0, line19 - line21);
  const line23 = round(
    sum(w2s, (r) => r.rrta_additional_withheld) +
      sum(ct2, (r) => r.additional_tax_paid),
  );
  const line24 = line22 + line23;
  // Filing uses source thresholds even where the resulting tax rounds to zero.
  const required =
    w2s.some((r) =>
      r.box5_medicare_wages > 200_000 || r.rrta_compensation > 200_000
    ) ||
    wageSource + tipSource + wage8919Source + seSource > threshold ||
    rrtaSource > threshold || line24 > 0;
  return {
    source_input: input,
    file_form8959: required,
    has_medicare_wages: wageSource + tipSource + wage8919Source > 0,
    has_rrta: rrtaSource > 0,
    has_self_employment: input.schedule_se_medicare_sources_2026.length > 0,
    has_withholding: wageSource + tipSource + wage8919Source > 0 ||
      rrtaSource > 0 || line19 > 0 ||
      line23 > 0,
    lines: {
      line1,
      line2,
      line3,
      line4,
      line5: threshold,
      line6,
      line7,
      line8,
      line9: threshold,
      line10,
      line11,
      line12,
      line13,
      line14: threshold,
      line15: line4,
      line16,
      line17,
      line18,
      line19,
      line20: line1,
      line21,
      line22,
      line23,
      line24,
    },
  };
}
class Form8959Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8959";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule2_2026,
    f1040_2026_node,
    f8812,
  ]);
  compute(ctx: NodeContext, raw: Form8959Input2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Form 8959 needs f1040:2026 context");
    }
    const calculation = calculateForm8959_2026(raw);
    const { line12, line18, line24 } = calculation.lines;
    return {
      outputs: [
        {
          nodeType: "f8812",
          fields: {
            medicare_payroll_2026: {
              wage_tax: calculation.lines.line7,
              additional_wage_withheld: calculation.lines.line22,
              has_rrta_or_self_employment: calculation.has_rrta ||
                calculation.has_self_employment,
            },
          },
        },
        {
          nodeType: "form8959",
          fields: {
            calculation_2026: calculation,
            file_form8959: calculation.file_form8959,
          },
        },
        {
          nodeType: "schedule2",
          fields: {
            line17b_medicare_wage_tax: line12,
            line11_medicare_self_employment_tax: line18,
          },
        },
        { nodeType: "f1040", fields: { line25c_other_withheld: line24 } },
      ],
    };
  }
}
export const form8959_2026 = new Form8959Node2026();
