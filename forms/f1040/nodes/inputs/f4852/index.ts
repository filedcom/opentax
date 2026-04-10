import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form8959 } from "../../intermediate/forms/form8959/index.ts";
import { form5329 } from "../../intermediate/forms/form5329/index.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

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
  // W-2 box 3: social security wages — subject to SS tax up to the wage base
  social_security_wages: z.number().nonnegative().optional()
    .describe("Social security wages (W-2 box 3)"),
  // W-2 box 4: social security tax withheld — flows to Schedule 3 excess FICA credit
  social_security_withheld: z.number().nonnegative().optional()
    .describe("Social security tax withheld (W-2 box 4)"),
  // W-2 box 5: Medicare wages and tips — subject to Medicare/FICA tax (no wage base cap)
  medicare_wages: z.number().nonnegative().optional()
    .describe("Medicare wages and tips (W-2 box 5)"),
  // W-2 box 6: Medicare tax withheld — flows to SE/FICA credit; also used for RRTA
  medicare_withheld: z.number().nonnegative().optional()
    .describe("Medicare tax withheld (W-2 box 6)"),

  // Part II fields — substitute for 1099-R (used when form_type === R_1099)
  // Line 8a: gross distribution (1099-R box 1)
  gross_distribution: z.number().nonnegative().optional(),
  // Line 8b: taxable amount (1099-R box 2a); if omitted, treated as equal to gross_distribution
  taxable_amount: z.number().nonnegative().optional(),
  // Line 8c: federal income tax withheld (1099-R box 4) — shared field name with Part I
  // (only one part is active per item, so reusing federal_withheld above is intentional)
  // Line 8e: IRA/SEP/SIMPLE checkbox (1099-R box 7 IRA flag)
  is_ira: z.boolean().optional(),
  // 1099-R box 3: capital gain (included in box 2a) — qualifies for lower capital gain rates
  capital_gain: z.number().nonnegative().optional()
    .describe("Capital gain included in taxable amount (1099-R box 3)"),
  // 1099-R box 5: employee contributions / designated Roth contributions or insurance premiums —
  // reduces the taxable amount (already-taxed basis returned to the taxpayer)
  employee_contributions: z.number().nonnegative().optional()
    .describe("Employee contributions or insurance premiums (1099-R box 5)"),
  // 1099-R box 7: distribution code — determines penalty applicability and routing
  // (e.g., code 1 = early distribution, code 7 = normal, code G = direct rollover)
  distribution_code: z.string().optional()
    .describe("Distribution code (1099-R box 7); affects early withdrawal penalty and routing"),
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

// Effective taxable amount for a single 1099-R substitute item.
// Reduces by employee_contributions (already-taxed basis returned to taxpayer).
// Defaults to gross_distribution if taxable_amount not specified.
function effectiveTaxable(item: F4852Item): number {
  const raw = item.taxable_amount ?? item.gross_distribution ?? 0;
  const basis = item.employee_contributions ?? 0;
  return Math.max(0, raw - basis);
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

// Route W-2 substitute FICA fields to form8959 (Additional Medicare Tax).
// Mirrors the w2 node's medicareOutput() logic for boxes 3–6.
function ficaOutputs(items: F4852Items): NodeOutput[] {
  const w2s = w2Items(items).filter(
    (item) =>
      item.medicare_wages !== undefined || item.medicare_withheld !== undefined,
  );
  if (w2s.length === 0) return [];
  const totalMedicareWages = w2s.reduce((sum, item) => sum + (item.medicare_wages ?? 0), 0);
  const totalMedicareWithheld = w2s.reduce((sum, item) => sum + (item.medicare_withheld ?? 0), 0);
  const fields: Partial<z.infer<typeof form8959["inputSchema"]>> = {};
  if (totalMedicareWages > 0) fields.medicare_wages = totalMedicareWages;
  if (totalMedicareWithheld > 0) fields.medicare_withheld = totalMedicareWithheld;
  if (Object.keys(fields).length === 0) return [];
  return [output(form8959, fields as AtLeastOne<z.infer<typeof form8959["inputSchema"]>>)];
}

// Route W-2 substitute excess SS withholding to Schedule 3 line 11.
// Only applicable when there are multiple W-2 substitutes and total SS withheld
// exceeds the per-employer maximum. The ss_wage_base / ssTaxPerEmployer is not
// available here (no NodeContext config access in helper scope), so we emit
// the raw total and let schedule3 handle it — same pattern as w2 node's
// excessSsOutput where we check for multiple employers.
// Note: for a single-employer substitute the excess would be zero regardless.
function excessSsOutputs(items: F4852Items): NodeOutput[] {
  const w2s = w2Items(items);
  if (w2s.length < 2) return [];
  const totalSsWithheld = w2s.reduce((sum, item) => sum + (item.social_security_withheld ?? 0), 0);
  if (totalSsWithheld <= 0) return [];
  // We cannot compute the wage-base cap without config, so emit social_security_withheld
  // as a signal; schedule3 accumulates and the excess is computed downstream.
  // TODO: pass NodeContext into helper functions so we can apply the per-employer cap here.
  return [output(schedule3, { line11_excess_ss: totalSsWithheld })];
}

// Route 1099-R substitute early distributions (distribution_code === "1") to form5329.
function earlyDistOutputs(items: F4852Items): NodeOutput[] {
  const earlyItems = r1099Items(items).filter(
    (item) => item.distribution_code === "1",
  );
  return earlyItems.map((item) =>
    output(form5329, {
      early_distribution: effectiveTaxable(item),
      distribution_code: item.distribution_code!,
    })
  );
}

class F4852Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4852";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, form8959, form5329, schedule3]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
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

    // FICA / Medicare routing for W-2 substitutes (boxes 3–6)
    outputs.push(...ficaOutputs(f4852s));
    outputs.push(...excessSsOutputs(f4852s));

    // Early distribution penalty routing for 1099-R substitutes (code 1 → form5329)
    outputs.push(...earlyDistOutputs(f4852s));

    // TODO: capital_gain (1099-R box 3) — when a dedicated capital-gain-from-pension
    // node or Schedule D pathway exists for annuity capital gains, route
    // r1099Items(f4852s).filter(i => (i.capital_gain ?? 0) > 0) there.
    // For now, the capital gain is already included in the taxable amount flowing
    // to line4b/5b above and will be taxed at ordinary rates (conservative).

    return { outputs };
  }
}

export const f4852 = new F4852Node();
