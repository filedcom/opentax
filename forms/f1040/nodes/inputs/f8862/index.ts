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
// This input node carries the filed claim and prior notice facts to credit nodes.

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

// A reviewed prior IRS notice is separate from the current-year Form 8862
// answers. Its copy reference identifies the retained source, while the
// matching year, notice, and taxpayer are checked again at export.
export const priorCreditDisallowanceReviewSchema = z.object({
  disallowed_year: z.number().int().min(2016).max(2024),
  notice_reference: z.string().trim().min(1),
  notice_copy_reference: z.string().trim().min(1),
  taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  nonclerical_disallowance_verified: z.literal(true),
  no_active_ban_verified: z.literal(true),
}).strict();
export type PriorCreditDisallowanceReview = z.infer<
  typeof priorCreditDisallowanceReviewSchema
>;

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
  eitc_disallowed_year: z.number().int().min(1997).max(2024).optional(),
  eitc_disallowance_notice_reference: z.string().trim().min(1).optional(),
  ctc_disallowed_year: z.number().int().min(2016).max(2024).optional(),
  ctc_disallowance_notice_reference: z.string().trim().min(1).optional(),
  aotc_disallowed_year: z.number().int().min(2016).max(2024).optional(),
  aotc_disallowance_notice_reference: z.string().trim().min(1).optional(),

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

export function assertCreditDisallowanceEvidence(input: F8862Input): void {
  if (
    input.claim_eitc &&
    (input.eitc_disallowed_year === undefined ||
      !input.eitc_disallowance_notice_reference)
  ) {
    throw new Error(
      "Form 8862 EIC claim needs the prior disallowance year and IRS notice reference",
    );
  }
  if (
    input.claim_ctc &&
    (input.ctc_disallowed_year === undefined ||
      !input.ctc_disallowance_notice_reference)
  ) {
    throw new Error(
      "Form 8862 CTC/ACTC/ODC claim needs the prior disallowance year and IRS notice reference",
    );
  }
  if (
    input.claim_aotc &&
    (input.aotc_disallowed_year === undefined ||
      !input.aotc_disallowance_notice_reference)
  ) {
    throw new Error(
      "Form 8862 AOTC claim needs the prior disallowance year and IRS notice reference",
    );
  }
}

function eitcOutput(input: F8862Input): NodeOutput[] {
  if (!input.claim_eitc) return [];
  // Carry the claim and its notice identity to the EIC eligibility check.
  return [{
    nodeType: eitc.nodeType,
    fields: {
      form8862_filed: true,
      form8862_disallowed_year: input.eitc_disallowed_year,
      form8862_notice_reference: input.eitc_disallowance_notice_reference,
    },
  }];
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
    assertCreditDisallowanceEvidence(input);
    const outputs: NodeOutput[] = [
      ...eitcOutput(input),
      ...ctcOutput(input),
      ...aotcOutput(input),
    ];
    return { outputs };
  }
}

export const f8862 = new F8862Node();
