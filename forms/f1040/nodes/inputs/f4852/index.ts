import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

// Form type — which original form this 4852 substitutes
export enum FormType {
  W2 = "W2",
  R_1099 = "R_1099",
}

// Per-item schema — one Form 4852 (one employer or payer)
export const itemSchema = z.object({
  // Identifies which form this 4852 substitutes
  form_type: z.nativeEnum(FormType),

  // Payer/employer identification
  payer_name: z.string().min(1),
  payer_tin: z.string().optional(),

  // Part I fields — substitute for W-2 (used when form_type === W2)
  // Line 7a: wages, tips, other compensation (W-2 box 1)
  wages: z.number().nonnegative().optional(),
  // Line 7b: federal income tax withheld (W-2 box 2)
  federal_withheld: z.number().nonnegative().optional(),

  // Part II fields — substitute for 1099-R (used when form_type === R_1099)
  // Line 8a: gross distribution (1099-R box 1)
  gross_distribution: z.number().nonnegative().optional(),
  // Line 8b: taxable amount (1099-R box 2a); if omitted, treated as equal to gross_distribution
  taxable_amount: z.number().nonnegative().optional(),
  // Line 8c: federal income tax withheld (1099-R box 4) — shared field name with Part I
  // (only one part is active per item, so reusing federal_withheld above is intentional)
  // Line 8e: IRA/SEP/SIMPLE checkbox (1099-R box 7 IRA flag)
  is_ira: z.boolean().optional(),
}).superRefine((val, ctx) => {
  if (val.form_type === FormType.W2) {
    const hasWages = (val.wages ?? 0) > 0;
    const hasWithheld = (val.federal_withheld ?? 0) > 0;
    if (!hasWages && !hasWithheld) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "W2 form_type requires at least wages or federal_withheld to be nonzero",
      });
    }
  }
  if (val.form_type === FormType.R_1099) {
    if (val.gross_distribution === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "R_1099 form_type requires gross_distribution",
        path: ["gross_distribution"],
      });
    }
  }
});

// Node inputSchema — all Form 4852s for this return as a single array
export const inputSchema = z.object({
  f4852s: z.array(itemSchema).min(1),
});

type F4852Item = z.infer<typeof itemSchema>;
type F4852Items = F4852Item[];
type F1040Input = z.infer<typeof f1040.inputSchema>;

// Filter items by form type
function w2Items(items: F4852Items): F4852Items {
  return items.filter((item) => item.form_type === FormType.W2);
}

function r1099Items(items: F4852Items): F4852Items {
  return items.filter((item) => item.form_type === FormType.R_1099);
}

// IRA items from 1099-R substitutes
function iraItems(items: F4852Items): F4852Items {
  return r1099Items(items).filter((item) => item.is_ira === true);
}

// Pension/annuity items from 1099-R substitutes (non-IRA)
function pensionItems(items: F4852Items): F4852Items {
  return r1099Items(items).filter((item) => item.is_ira !== true);
}

// Effective taxable amount for a single 1099-R substitute item
// Defaults to gross_distribution if taxable_amount not specified
function effectiveTaxable(item: F4852Item): number {
  return item.taxable_amount ?? item.gross_distribution ?? 0;
}

// Build f1040 fields for W-2 substitutes → line1a and line25a
function wagesFields(items: F4852Items): Partial<F1040Input> {
  const w2s = w2Items(items);
  const totalWages = w2s.reduce((sum, item) => sum + (item.wages ?? 0), 0);
  const totalWithheld = w2s.reduce((sum, item) => sum + (item.federal_withheld ?? 0), 0);
  const fields: Partial<F1040Input> = {};
  if (totalWages > 0) fields.line1a_wages = totalWages;
  if (totalWithheld > 0) fields.line25a_w2_withheld = totalWithheld;
  return fields;
}

// Build f1040 fields for 1099-R pension substitutes → line5a/5b
function pensionFields(items: F4852Items): Partial<F1040Input> {
  const pensions = pensionItems(items);
  if (pensions.length === 0) return {};
  const totalGross = pensions.reduce((sum, item) => sum + (item.gross_distribution ?? 0), 0);
  const totalTaxable = pensions.reduce((sum, item) => sum + effectiveTaxable(item), 0);
  const fields: Partial<F1040Input> = {};
  if (totalGross > 0) fields.line5a_pension_gross = totalGross;
  fields.line5b_pension_taxable = totalTaxable;
  return fields;
}

// Build f1040 fields for 1099-R IRA substitutes → line4a/4b
function iraFields(items: F4852Items): Partial<F1040Input> {
  const iras = iraItems(items);
  if (iras.length === 0) return {};
  const totalGross = iras.reduce((sum, item) => sum + (item.gross_distribution ?? 0), 0);
  const totalTaxable = iras.reduce((sum, item) => sum + effectiveTaxable(item), 0);
  const fields: Partial<F1040Input> = {};
  if (totalGross > 0) fields.line4a_ira_gross = totalGross;
  fields.line4b_ira_taxable = totalTaxable;
  return fields;
}

// Build f1040 withholding for 1099-R substitutes → line25b
function r1099WithholdingFields(items: F4852Items): Partial<F1040Input> {
  const totalWithheld = r1099Items(items).reduce(
    (sum, item) => sum + (item.federal_withheld ?? 0),
    0,
  );
  if (totalWithheld <= 0) return {};
  return { line25b_withheld_1099: totalWithheld };
}

class F4852Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4852";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f4852s } = parsed;

    const outputs: NodeOutput[] = [];

    const wages = wagesFields(f4852s);
    const pension = pensionFields(f4852s);
    const ira = iraFields(f4852s);
    const r1099Withheld = r1099WithholdingFields(f4852s);

    const f1040Fields: Partial<F1040Input> = {
      ...wages,
      ...pension,
      ...ira,
      ...r1099Withheld,
    };

    if (Object.keys(f1040Fields).length > 0) {
      outputs.push(
        this.outputNodes.output(
          f1040,
          f1040Fields as AtLeastOne<F1040Input>,
        ),
      );
    }

    return { outputs };
  }
}

export const f4852 = new F4852Node();
