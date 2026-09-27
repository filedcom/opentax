import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { form8978_reporting_year } from "../../intermediate/worksheets/form8978_reporting_year/index.ts";

// Form 8978 (Rev. January 2023, still used in TY2025) is a comparison of
// corrected and originally reported tax liabilities for up to four affected
// years per form. A marginal-rate estimate is not a Form 8978 calculation.
export enum Form8978Source {
  BbaAudit = "bba_audit",
  Aar = "aar",
}

export const adjustmentSchema = z.object({
  description: z.string().trim().min(1).max(50),
  amount: z.number().int(),
  tracking_number: z.string().regex(
    /^[1-9]\d{3}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])-(?!000000)\d{6}$/,
  ).optional(),
  aar_tracking_number: z.string().regex(
    /^[1-9]\d(0[1-9]|1[0-2])\d{4}-(?!000000)\d{6}$/,
  ).optional(),
  audit_control_number: z.string().regex(
    /^[1-9]\d(0[1-9]|1[0-2])(?!000000)\d{6}$/,
  ).optional(),
  ein: z.string().regex(/^\d{9}$/).optional(),
  missing_ein_reason: z.enum(["APPLD FOR", "FOREIGNUS"]).optional(),
  ssn: z.string().regex(/^\d{9}$/).optional(),
}).refine(
  (row) =>
    [
      row.tracking_number,
      row.aar_tracking_number,
      row.audit_control_number,
      row.ein,
      row.missing_ein_reason,
      row.ssn,
    ].filter(Boolean).length <= 1,
  "Form 8978 Schedule A adjustment needs at most one tracking identifier",
);

export const yearColumnSchema = z.object({
  tax_year_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) =>
    !Number.isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
  ),
  original_income: z.number().int(),
  income_adjustments: z.array(adjustmentSchema),
  original_deductions: z.number().int(),
  deduction_adjustments: z.array(adjustmentSchema),
  corrected_taxable_income: z.number().int().optional(),
  corrected_taxable_income_explanation: z.string().trim().min(1).max(5000)
    .optional(),
  // Source-backed recomputation under that affected year's tax rules.
  corrected_income_tax: z.number().int().nonnegative(),
  corrected_amt: z.number().int().nonnegative(),
  original_credits: z.number().int().nonnegative(),
  credit_adjustments: z.array(adjustmentSchema),
  corrected_income_tax_liability: z.number().int().nonnegative().optional(),
  corrected_income_tax_liability_explanation: z.string().trim().min(1)
    .max(5000).optional(),
  original_tax_liability: z.number().int().nonnegative(),
  penalty: z.number().int().nonnegative().optional(),
  interest: z.number().int().nonnegative().optional(),
  tax_calculation_explanation: z.string().trim().min(1).max(5000),
  penalty_calculation_explanation: z.string().trim().min(1).max(5000)
    .optional(),
  interest_calculation_explanation: z.string().trim().min(1).max(5000)
    .optional(),
}).refine(
  (column) =>
    !column.penalty || Boolean(column.penalty_calculation_explanation),
  "Form 8978 penalties need a calculation statement",
).refine(
  (column) =>
    !column.interest || Boolean(column.interest_calculation_explanation),
  "Form 8978 interest needs a calculation statement",
);

export const filingSchema = z.object({
  source: z.nativeEnum(Form8978Source),
  columns: z.array(yearColumnSchema).min(1).max(4),
});

export const inputSchema = z.object({
  filings: z.array(filingSchema).min(1).max(6),
});

type YearColumn = z.infer<typeof yearColumnSchema>;
type Filing = z.infer<typeof filingSchema>;
export type Form8978Input = z.infer<typeof inputSchema>;

function adjustmentTotal(
  rows: readonly z.infer<typeof adjustmentSchema>[],
): number {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

export function calculateYearColumn(column: YearColumn) {
  const line1b = adjustmentTotal(column.income_adjustments);
  const line2 = column.original_income + line1b;
  const line3b = adjustmentTotal(column.deduction_adjustments);
  const line4 = column.original_deductions + line3b;
  const ordinaryLine5 = line2 - line4;
  if (
    column.corrected_taxable_income !== undefined &&
    column.corrected_taxable_income !== ordinaryLine5 &&
    !column.corrected_taxable_income_explanation
  ) {
    throw new Error(
      `Form 8978 ${column.tax_year_end} line 5 adjustment needs its separate calculation statement`,
    );
  }
  const line5 = column.corrected_taxable_income ?? ordinaryLine5;
  const line8 = column.corrected_income_tax + column.corrected_amt;
  const line9b = adjustmentTotal(column.credit_adjustments);
  const line10 = column.original_credits + line9b;
  if (line10 < 0 || line10 > line8) {
    throw new Error(
      `Form 8978 ${column.tax_year_end} corrected credits need the affected-year tax limitation`,
    );
  }
  const ordinaryLine11 = line8 - line10;
  if (
    column.corrected_income_tax_liability !== undefined &&
    column.corrected_income_tax_liability !== ordinaryLine11 &&
    !column.corrected_income_tax_liability_explanation
  ) {
    throw new Error(
      `Form 8978 ${column.tax_year_end} line 11 adjustment needs its separate calculation statement`,
    );
  }
  const line11 = column.corrected_income_tax_liability ?? ordinaryLine11;
  const line13 = line11 - column.original_tax_liability;
  return {
    ...column,
    line1b,
    line2,
    line3b,
    line4,
    line5,
    line8,
    line9b,
    line10,
    line11,
    line13,
  };
}

export function calculateFiling(filing: Filing) {
  const years = filing.columns.map(calculateYearColumn);
  const line14 = years.reduce((sum, year) => sum + year.line13, 0);
  const line16 = years.reduce((sum, year) => sum + (year.penalty ?? 0), 0);
  const line18 = years.reduce((sum, year) => sum + (year.interest ?? 0), 0);
  return { source: filing.source, years, line14, line16, line18 };
}

export type Form8978Lines = ReturnType<typeof calculateFiling>;

class F8978Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8978";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    income_tax_calculation,
    form6251,
    form8978_reporting_year,
  ]);

  compute(ctx: NodeContext, rawInput: Form8978Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const firstAudit = input.filings.findIndex((filing) =>
      filing.source === Form8978Source.BbaAudit
    );
    if (
      firstAudit >= 0 &&
      input.filings.slice(firstAudit).some((filing) =>
        filing.source === Form8978Source.Aar
      )
    ) {
      throw new Error("Form 8978 AAR filings must precede BBA audit filings");
    }
    const filings = input.filings.map((filing) => {
      const yearEnds = filing.columns.map((column) => column.tax_year_end);
      if (
        filing.columns.every((column) =>
          column.income_adjustments.length === 0 &&
          column.deduction_adjustments.length === 0 &&
          column.credit_adjustments.length === 0
        )
      ) {
        throw new Error(
          "Form 8978 needs Schedule A adjustment rows from Form 8986",
        );
      }
      if (new Set(yearEnds).size !== yearEnds.length) {
        throw new Error("Form 8978 repeats an affected tax year on one form");
      }
      if (yearEnds.some((date) => Number(date.slice(0, 4)) >= ctx.taxYear)) {
        throw new Error(
          "Form 8978 affected tax years must precede the reporting year",
        );
      }
      return calculateFiling(filing);
    });
    const line14 = filings.reduce((sum, filing) => sum + filing.line14, 0);
    return {
      outputs: [
        {
          nodeType: this.nodeType,
          fields: {
            filings: input.filings,
            calculated_filings: filings,
            line14,
          },
        },
        ...(line14 > 0
          ? [this.outputNodes.output(income_tax_calculation, {
            form8978_tax: line14,
          })]
          : []),
        ...(line14 < 0
          ? [
            this.outputNodes.output(form6251, {
              form8978_negative_line14: -line14,
            }),
            this.outputNodes.output(form8978_reporting_year, {
              negative_form8978_line14: -line14,
            }),
          ]
          : []),
      ],
    };
  }
}

export const f8978 = new F8978Node();
