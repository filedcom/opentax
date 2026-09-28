import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { eitc } from "../../intermediate/forms/eitc/index.ts";
import { f8812 } from "../f8812/index.ts";
import { f8863 } from "../f8863/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8862 — Information to Claim Certain Credits After Disallowance
//
// Taxpayers must file this form to reclaim EITC, CTC/ACTC, or AOTC after
// the IRS disallowed the credit in a prior year (e.g., due to an audit).
// This input node signals eligibility restoration to the downstream credit nodes.

const personNameSchema = z.object({
  first_name: z.string().min(1).max(20).regex(/^[A-Za-z-]+(?: [A-Za-z-]+)*$/),
  last_name: z.string().min(1).max(20).regex(/^[A-Za-z-]+(?: [A-Za-z-]+)*$/),
});

const monthDaySchema = z.string().regex(
  /^--(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d)|(?:0[13-9]|1[0-2])-30|(?:0[13578]|1[02])-31)$/,
);

const eitcChildSchema = personNameSchema.extend({
  days_in_us: z.number().int().min(0).max(366).optional(),
  birth_month_day: monthDaySchema.optional(),
  death_month_day: monthDaySchema.optional(),
});

const noQualifyingChildSchema = z.object({
  main_home_us_days: z.number().int().min(0).max(366),
  age: z.number().int().min(0).max(999),
  claimed_as_dependent: z.boolean(),
});

const ctcChildSchema = personNameSchema.extend({
  lived_with_over_half_year: z.boolean(),
  qualifying_child: z.boolean(),
  dependent: z.boolean(),
  us_citizen_national_or_resident: z.boolean(),
});

const otherDependentSchema = personNameSchema.extend({
  dependent: z.boolean(),
  us_citizen_national_or_resident: z.boolean(),
});

const aotcStudentSchema = personNameSchema.extend({
  eligible: z.boolean(),
  credit_claimed_four_prior_years: z.boolean(),
});

export const inputSchema = z.object({
  // Which credits were previously disallowed and are being reclaimed
  claim_eitc: z.boolean().optional(),
  claim_ctc: z.boolean().optional(), // Child Tax Credit / ACTC (Form 8812)
  claim_aotc: z.boolean().optional(), // American Opportunity Tax Credit (Form 8863)
  // An active 2- or 10-year credit ban can be contested only on a mailed return.
  // A filing claim must explicitly state this status; absence is not "no ban".
  credit_disallowance_ban_active: z.boolean().optional(),

  // Internal prior-disallowance metadata. Part I line 1 is the filing year,
  // not any of these years; the TY2025 MeF document does not serialize them.
  eitc_disallowed_year: z.number().int().nonnegative().optional(),
  ctc_disallowed_year: z.number().int().nonnegative().optional(),
  aotc_disallowed_year: z.number().int().nonnegative().optional(),

  // Part II: EITC — qualifying children eligibility re-certification
  eitc_qualifying_children_count: z.number().int().min(0).max(3).optional(),

  // Part III: CTC qualifying children count
  ctc_qualifying_children_count: z.number().int().min(0).max(15).optional(),

  // Part IV: AOTC — student eligibility re-certification
  aotc_student_count: z.number().int().min(0).max(25).optional(),

  // TY2025 Form 8862 detail needed to produce a complete MeF document.
  eitc_income_reporting_only: z.boolean().optional(),
  eitc_qualifying_child_of_other: z.boolean().optional(),
  eitc_children: z.array(eitcChildSchema).max(3).optional(),
  eitc_without_child: z.object({
    primary: noQualifyingChildSchema,
    spouse: noQualifyingChildSchema.optional(),
  }).optional(),
  ctc_children: z.array(ctcChildSchema).max(15).optional(),
  other_dependents: z.array(otherDependentSchema).max(15).optional(),
  aotc_students: z.array(aotcStudentSchema).max(25).optional(),
});

export type F8862Input = z.infer<typeof inputSchema>;

function eitcOutput(input: F8862Input): NodeOutput[] {
  if (!input.claim_eitc) return [];
  // Signal to the eitc node that disallowance has been cleared via Form 8862.
  return [{ nodeType: eitc.nodeType, fields: { form8862_filed: true } }];
}

function ctcOutput(input: F8862Input): NodeOutput[] {
  if (!input.claim_ctc) return [];
  return [{ nodeType: f8812.nodeType, fields: { form8862_filed: true } }];
}

function aotcOutput(input: F8862Input): NodeOutput[] {
  if (!input.claim_aotc) return [];
  return [{ nodeType: f8863.nodeType, fields: { form8862_filed: true } }];
}

class F8862Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8862";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([eitc, f8812, f8863]);

  compute(_ctx: NodeContext, rawInput: F8862Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const outputs: NodeOutput[] = [
      ...eitcOutput(input),
      ...ctcOutput(input),
      ...aotcOutput(input),
    ];
    return { outputs };
  }
}

export const f8862 = new F8862Node();
