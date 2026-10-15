import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  calculateForm8919,
  employerSchema as sharedEmployerSchema,
  employerSchemaForWages,
  form4137SourceSchema,
} from "../../nodes/intermediate/forms/taxes/employment/form8919/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { wages2026 } from "../../nodes/config/2026-wages.ts";
import {
  employeePaymentAmount,
  employeePaymentSchema,
} from "./employee-payments.ts";
import { f1040_2026_node } from "../nodes/f1040.ts";
import { agi_2026 } from "../nodes/agi.ts";
import { schedule2_2026 } from "../nodes/schedule2.ts";
import { form8959_2026 } from "../nodes/form8959.ts";
import { eitc } from "../../nodes/intermediate/forms/credits/earned-income/eitc/index.ts";
import { f8812 } from "../../nodes/inputs/credits/child/f8812/index.ts";
import { schedule_se } from "../../nodes/intermediate/forms/taxes/self-employment/schedule_se/index.ts";
const reference = z.string().trim().min(1);
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const normalize = (value: string) => value.replaceAll("-", "");
const date = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "Form 8919 review date must be valid");
const employerSchema = sharedEmployerSchema.innerType().omit({
  wages: true,
  form1099_received: true,
  form1099_payer_tin: true,
}).extend({
  income_records: z.array(employeePaymentSchema).min(1),
  employee_classification_review_reference: reference,
  performed_services_as_employee: z.literal(true),
  no_social_security_or_medicare_withholding: z.literal(true),
  wages_not_in_w2_or_other_income: z.literal(true),
  not_unreported_tips: z.literal(true),
}).strict();
export const claimInputSchema = z.object({
  tax_year: z.literal(2026),
  evidence_review_date: date,
  forms: z.array(
    z.object({
      recipient: z.enum(["taxpayer", "spouse"]),
      employers: z.array(employerSchema).min(1),
    }).strict(),
  ).min(1).max(2),
}).strict();
export const inputSchema = claimInputSchema.partial().extend({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
  w2_sources: z.array(
    z.object({
      employee_ssn: ssn,
      employer_name: reference,
      employer_ein: z.string().regex(/^\d{2}-?\d{7}$/),
      source_document_reference: reference,
      ss_wages_and_tips: money.optional(),
      rrta_compensation: money,
    }).strict(),
  ).default([]),
  form4137_sources: z.array(
    form4137SourceSchema.extend({ line10_ss_tips: money.int() }),
  ).default([]),
}).strict();
export type Form8919Input2026 = z.input<typeof inputSchema>;
export function calculateForm8919_2026(raw: Form8919Input2026) {
  const input = inputSchema.parse(raw);
  const joint = input.filing_status === FilingStatus.MFJ;
  if (
    joint &&
    (!input.spouse_ssn ||
      normalize(input.spouse_ssn) === normalize(input.taxpayer_ssn))
  ) throw new Error("Joint Form 8919 needs distinct filer identities");
  const owner = (recipient: "taxpayer" | "spouse") => {
    if (recipient === "spouse" && !joint) {
      throw new Error("Spouse Form 8919 requires a joint return");
    }
    return recipient === "taxpayer" ? input.taxpayer_ssn : input.spouse_ssn!;
  };
  const checkOwner = (id: string) => {
    if (
      normalize(id) !== normalize(input.taxpayer_ssn) &&
      !(joint && normalize(id) === normalize(input.spouse_ssn!))
    ) throw new Error("Form 8919 source owner does not belong to this return");
  };
  const sourceIds = new Set<string>();
  const w2Pairs = new Set<string>();
  for (const source of input.w2_sources) {
    checkOwner(source.employee_ssn);
    const key = `${normalize(source.employee_ssn)}:${
      normalize(source.employer_ein)
    }`;
    if (sourceIds.has(source.source_document_reference) || w2Pairs.has(key)) {
      throw new Error(
        "Duplicate Form 8919 W-2 source or employer needs reconciliation",
      );
    }
    sourceIds.add(source.source_document_reference);
    w2Pairs.add(key);
    if (input.forms?.length && source.ss_wages_and_tips === undefined) {
      throw new Error(
        "Form 8919 needs actual W-2 Social Security boxes, including reviewed zeros",
      );
    }
  }
  const tipOwners = new Set<string>();
  for (const source of input.form4137_sources) {
    owner(source.recipient);
    if (
      tipOwners.has(source.recipient) ||
      source.line10_ss_tips > wages2026.ssWageBase
    ) {
      throw new Error(
        "Form 8919 needs one valid Form 4137 wage-base amount per owner",
      );
    }
    tipOwners.add(source.recipient);
  }
  if (!input.forms?.length) {
    return { source_input: input, forms: [], withholding: 0 };
  }
  if (
    !input.evidence_review_date || input.evidence_review_date < "2026-01-01"
  ) {
    throw new Error(
      "Form 8919 needs a current preparation evidence-review date",
    );
  }
  const source1099s: Parameters<
    typeof calculateForm8919
  >[0]["form1099_sources"] = [];
  const paymentIds = new Set<string>();
  const additionalPaymentSources: {
    recipient: "taxpayer" | "spouse";
    firm_tin: string;
    amount: number;
  }[] = [];
  let withholding = 0;
  const forms = input.forms.map((form) => {
    const expected = owner(form.recipient);
    const firms = new Set<string>();
    return {
      recipient: form.recipient,
      employers: form.employers.map((employer) => {
        const firm = employer.tin
          ? normalize(employer.tin)
          : `unknown:${employer.name}`;
        if (firms.has(firm)) {
          throw new Error("Form 8919 needs one reconciled row per firm");
        }
        firms.add(firm);
        for (
          const evidenceDate of [
            employer.correspondence_received_date,
            employer.ss8_filed_date,
          ]
        ) {
          if (evidenceDate && evidenceDate > input.evidence_review_date!) {
            throw new Error(
              "Form 8919 evidence cannot be dated after its preparation review",
            );
          }
        }
        if (
          employer.reason_code === "A" && employer.ss8_filed_date &&
          employer.correspondence_received_date &&
          employer.ss8_filed_date > employer.correspondence_received_date
        ) {
          throw new Error(
            "Form 8919 SS-8 filing must precede the determination letter",
          );
        }
        const records1099 = employer.income_records.filter((r) =>
          r.kind !== "payment_record"
        );
        for (const record of employer.income_records) {
          if (normalize(record.recipient_ssn) !== normalize(expected)) {
            throw new Error(
              "Form 8919 payment recipient must match its form owner",
            );
          }
          if (sourceIds.has(record.source_document_reference)) {
            throw new Error(
              "Duplicate Form 8919 income or W-2 source document",
            );
          }
          sourceIds.add(record.source_document_reference);
          const payments = record.kind === "payment_record"
            ? [{
              payment_reference: record.payment_reference,
              gross_wages: record.amount,
            }]
            : record.wage_payments;
          if (
            Math.abs(
              payments.reduce((n, p) => n + p.gross_wages, 0) -
                employeePaymentAmount(record),
            ) > 0.000001
          ) {
            throw new Error(
              "Form 8919 wage payment ledger must reconcile to its source amount",
            );
          }
          for (const payment of payments) {
            if (paymentIds.has(payment.payment_reference)) {
              throw new Error(
                "Form 8919 cannot count the same wage payment twice",
              );
            }
            paymentIds.add(payment.payment_reference);
          }
          if (record.kind === "payment_record") {
            if (records1099.length && employer.tin) {
              additionalPaymentSources.push({
                recipient: form.recipient,
                firm_tin: employer.tin,
                amount: record.amount,
              });
            }
            if (record.payment_date > input.evidence_review_date!) {
              throw new Error(
                "Form 8919 payment cannot follow its preparation review",
              );
            }
          } else {
            if (
              !employer.tin ||
              normalize(record.payer_tin) !== normalize(employer.tin) ||
              record.payer_name !== employer.name
            ) {
              throw new Error(
                "Form 8919 income record must match firm TIN and name",
              );
            }
            source1099s.push({
              kind: record.kind,
              recipient_ssn: expected,
              payer_tin: record.payer_tin,
              payer_name: record.payer_name,
              amount: employeePaymentAmount(record),
            });
            withholding += record.box4_federal_withholding;
          }
        }
        const wages = Math.round(
          employer.income_records.reduce(
            (n, record) => n + employeePaymentAmount(record),
            0,
          ),
        );
        return employerSchemaForWages(z.number().int().nonnegative().safe())
          .parse({
            name: employer.name,
            tin_type: employer.tin_type,
            tin: employer.tin,
            reason_code: employer.reason_code,
            correspondence_received_date: employer.correspondence_received_date,
            correspondence_reference: employer.correspondence_reference,
            ss8_filed_date: employer.ss8_filed_date,
            ss8_filing_reference: employer.ss8_filing_reference,
            wages,
            form1099_received: records1099.length > 0,
            ...(records1099.length
              ? { form1099_payer_tin: records1099[0].payer_tin }
              : {}),
          });
      }),
    };
  });
  const calculated = calculateForm8919(
    {
      taxpayer_ssn: input.taxpayer_ssn,
      spouse_ssn: joint ? input.spouse_ssn : undefined,
      forms,
      form1099_sources: source1099s,
      form4137_sources: input.form4137_sources,
      w2_sources: input.w2_sources.map((s) => ({
        ...s,
        ss_wages_and_tips: s.ss_wages_and_tips!,
      })),
    },
    wages2026.ssWageBase,
    additionalPaymentSources,
  );
  if (
    !Number.isSafeInteger(Math.round(withholding)) ||
    !Number.isSafeInteger(calculated.reduce((n, form) => n + form.line6, 0)) ||
    calculated.some((form) =>
      [
        form.line6,
        form.line8,
        form.line9,
        form.line10,
        form.line11,
        form.line12,
        form.line13,
      ].some((n) => !Number.isSafeInteger(n))
    )
  ) {
    throw new Error(
      "Form 8919 amounts exceed the supported whole-dollar range",
    );
  }
  return { source_input: input, forms: calculated, withholding };
}
class Form8919Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8919";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040_2026_node,
    agi_2026,
    schedule2_2026,
    form8959_2026,
    schedule_se,
    eitc,
    f8812,
  ]);
  override get outputNodeTypes() {
    return [...this.outputNodes.nodeTypes, "schedule_c"];
  }
  compute(ctx: NodeContext, raw: Form8919Input2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Form 8919 needs f1040:2026 context");
    }
    const calculation = calculateForm8919_2026(raw);
    if (!calculation.forms.length) return { outputs: [] };
    const wages = calculation.forms.reduce((n, form) => n + form.line6, 0);
    const tax = calculation.forms.reduce((n, form) => n + form.line13, 0);
    const sources = calculation.forms.map((form) => ({
      employee_ssn: form.recipient === "taxpayer"
        ? calculation.source_input.taxpayer_ssn
        : calculation.source_input.spouse_ssn!,
      source_reference: `form8919:2026:${form.recipient}`,
      amount: form.line6,
    }));
    return {
      outputs: [
        {
          nodeType: "schedule_c",
          fields: { unsupported_payroll_sources: ["form8919"] },
        },
        { nodeType: "form8919", fields: { calculation_2026: calculation } },
        {
          nodeType: "f1040",
          fields: {
            line1g_wages_8919: wages,
            line25b_withheld_1099: calculation.withholding,
          },
        },
        { nodeType: "agi_aggregator", fields: { line1g_wages_8919: wages } },
        { nodeType: "schedule2", fields: { line16b_form8919_wage_tax: tax } },
        {
          nodeType: "form8959",
          fields: { form8919_medicare_sources_2026: sources },
        },
        { nodeType: "eitc", fields: { earned_income: wages } },
        { nodeType: "f8812", fields: { auto_earned_income: wages } },
        {
          nodeType: "schedule_se",
          fields: {
            form8919_sources_2026: sources.map((source, i) => ({
              employee_ssn: source.employee_ssn,
              source_reference: source.source_reference,
              line10_ss_wages: calculation.forms[i].line10,
            })),
          },
        },
      ],
    };
  }
}
export const form8919_2026 = new Form8919Node2026();
