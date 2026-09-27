import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { f3800 } from "../f3800/index.ts";

const drugSchema = z.object({
  generic_name: z.string().min(1),
  designation_application_number: z.string().min(1),
  designation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  qualified_clinical_testing_expenses: z.number().finite().nonnegative(),
  qualifying_testing_confirmed: z.literal(true),
  expenses_exclude_third_party_funding: z.literal(true),
  expenses_not_used_for_research_credit: z.literal(true),
});

const passThroughCreditSchema = z.object({
  source_type: z.enum(["partnership", "s_corporation", "estate", "trust"]),
  entity_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  credit_amount: z.number().int().positive(),
  subject_to_passive_activity_limit: z.boolean(),
});

const controlledGroupSchema = z.object({
  group_classification_document_reference: z.string().trim().min(1).max(80),
  taxpayer_member_ein: z.string().regex(/^\d{9}$/),
  members: z.array(z.object({
    ein: z.string().regex(/^\d{9}$/),
    business_name: z.string().trim().min(1).max(75),
    qualified_clinical_testing_expenses: z.number().int().nonnegative(),
  })).min(2),
});

const expenseReductionSchema = z.object({
  treatment: z.enum(["current_deduction", "capitalized_basis"]),
  return_form_or_schedule: z.string().trim().min(1),
  return_line: z.string().trim().min(1),
  return_instance_reference: z.string().trim().min(1).optional(),
  expense_record_reference: z.string().trim().min(1),
  amount_before_reduction: z.number().int().nonnegative(),
  reduction_amount: z.number().int().positive(),
  expense_amount_after_reduction: z.number().int().nonnegative(),
}).superRefine((entry, ctx) => {
  if (
    entry.amount_before_reduction - entry.reduction_amount !==
      entry.expense_amount_after_reduction
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["expense_amount_after_reduction"],
      message: "Form 8820 expense reduction must reconcile before and after",
    });
  }
  if (
    ["Schedule C", "Schedule F"].includes(entry.return_form_or_schedule) &&
    !entry.return_instance_reference
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["return_instance_reference"],
      message:
        "Form 8820 Schedule C/F reduction needs the business or farm reference",
    });
  }
});

export const inputSchema = z.object({
  f8820s: z.array(drugSchema),
  pass_through_credits: z.array(passThroughCreditSchema).optional(),
  controlled_group: controlledGroupSchema.optional(),
  reduced_section280c_credit_election: z.boolean(),
  form8932_overlapping_wage_credit: z.number().int().nonnegative(),
  subject_to_passive_activity_limit: z.boolean(),
  expense_reduction_statement_file_name: z.string().trim().regex(
    /^[A-Za-z0-9][A-Za-z0-9._ -]*\.pdf$/i,
  ).optional(),
  expense_reductions: z.array(expenseReductionSchema).optional(),
}).superRefine((input, ctx) => {
  const group = input.controlled_group;
  if (group) {
    const memberEins = new Set(group.members.map((member) => member.ein));
    if (memberEins.size !== group.members.length) {
      ctx.addIssue({
        code: "custom",
        path: ["controlled_group", "members"],
        message: "Form 8820 controlled-group member EINs must be distinct",
      });
    }
    if (!memberEins.has(group.taxpayer_member_ein)) {
      ctx.addIssue({
        code: "custom",
        path: ["controlled_group", "taxpayer_member_ein"],
        message: "Form 8820 taxpayer must be a listed group member",
      });
    }
  }
  if (
    input.f8820s.length === 0 &&
    (input.pass_through_credits?.length ?? 0) === 0 &&
    !input.reduced_section280c_credit_election
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["f8820s"],
      message: "Form 8820 needs own drugs, pass-through credit, or an election",
    });
  }
  if (
    input.f8820s.length === 0 && input.form8932_overlapping_wage_credit > 0
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["form8932_overlapping_wage_credit"],
      message: "Form 8820 wage-credit overlap requires own drug expenses",
    });
  }
  const entities = new Set<string>();
  input.pass_through_credits?.forEach((entry, index) => {
    const id = `${entry.source_type}:${entry.entity_ein}`;
    if (entities.has(id)) {
      ctx.addIssue({
        code: "custom",
        path: ["pass_through_credits", index, "entity_ein"],
        message: "Form 8820 pass-through source is duplicated",
      });
    }
    entities.add(id);
  });
  const expenseRecords = new Set<string>();
  const destinations = new Set<string>();
  input.expense_reductions?.forEach((entry, index) => {
    if (expenseRecords.has(entry.expense_record_reference)) {
      ctx.addIssue({
        code: "custom",
        path: ["expense_reductions", index, "expense_record_reference"],
        message: "Form 8820 expense reduction record is duplicated",
      });
    }
    expenseRecords.add(entry.expense_record_reference);
    const destination = [
      entry.return_form_or_schedule,
      entry.return_instance_reference ?? "",
      entry.return_line,
    ].join(":");
    if (destinations.has(destination)) {
      ctx.addIssue({
        code: "custom",
        path: ["expense_reductions", index, "return_line"],
        message: "Form 8820 expense reductions need one row per filed line",
      });
    }
    destinations.add(destination);
  });
});

export type F8820Input = z.infer<typeof inputSchema>;

export interface Form8820Lines {
  line1: number;
  line2a: number;
  line2b: number;
  line2c: number;
  line3: number;
  line4: number;
  controlledGroup?: {
    totalExpenses: number;
    totalCredit: number;
    members: {
      ein: string;
      business_name: string;
      qualified_clinical_testing_expenses: number;
      credit_share: number;
    }[];
  };
}

function allocateControlledGroupCredit(
  group: z.infer<typeof controlledGroupSchema>,
  rate: number,
): NonNullable<Form8820Lines["controlledGroup"]> {
  const totalExpenses = group.members.reduce(
    (sum, member) => sum + member.qualified_clinical_testing_expenses,
    0,
  );
  const totalCredit = Math.round(totalExpenses * rate);
  const shares = group.members.map((member) =>
    totalExpenses === 0
      ? 0
      : totalCredit * member.qualified_clinical_testing_expenses /
        totalExpenses
  );
  const wholeShares = shares.map(Math.floor);
  const remainder = totalCredit - wholeShares.reduce((sum, n) => sum + n, 0);
  const ranked = group.members.map((member, index) => ({
    index,
    fraction: shares[index] - wholeShares[index],
    ein: member.ein,
  })).sort((a, b) => b.fraction - a.fraction || a.ein.localeCompare(b.ein));
  for (const { index } of ranked.slice(0, remainder)) wholeShares[index]++;
  return {
    totalExpenses,
    totalCredit,
    members: group.members.map((member, index) => ({
      ...member,
      credit_share: wholeShares[index],
    })),
  };
}

function validDesignationDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value && value <= "2025-12-31";
}

export function calculateForm8820(raw: F8820Input): Form8820Lines {
  const input = inputSchema.parse(raw);
  const designations = new Set<string>();
  for (const drug of input.f8820s) {
    if (!validDesignationDate(drug.designation_date)) {
      throw new Error("Form 8820 needs a valid orphan-drug designation date");
    }
    if (designations.has(drug.designation_application_number)) {
      throw new Error("Form 8820 has a duplicate drug designation number");
    }
    designations.add(drug.designation_application_number);
  }
  const line1 = Math.round(input.f8820s.reduce(
    (sum, drug) => sum + drug.qualified_clinical_testing_expenses,
    0,
  ));
  const rate = input.reduced_section280c_credit_election ? 0.1975 : 0.25;
  const controlledGroup = input.controlled_group
    ? allocateControlledGroupCredit(input.controlled_group, rate)
    : undefined;
  const taxpayerMember = controlledGroup?.members.find((member) =>
    member.ein === input.controlled_group?.taxpayer_member_ein
  );
  if (
    taxpayerMember &&
    taxpayerMember.qualified_clinical_testing_expenses !== line1
  ) {
    throw new Error(
      "Form 8820 taxpayer group expenses must equal own line 1 expenses",
    );
  }
  const line2a = taxpayerMember?.credit_share ?? Math.round(line1 * rate);
  const line2b = input.form8932_overlapping_wage_credit;
  if (line2b > line2a) {
    throw new Error("Form 8820 overlapping wage credit exceeds line 2a");
  }
  if (
    line2a > 0 && !input.reduced_section280c_credit_election &&
    !input.expense_reduction_statement_file_name
  ) {
    throw new Error(
      "Form 8820 non-reduced credit needs the expense-reduction statement",
    );
  }
  if (line2a > 0 && !input.reduced_section280c_credit_election) {
    // The section 280C adjustment is the unreduced line 2a credit, not line
    // 2c after the separate Form 8932 overlap subtraction.
    const reduction = (input.expense_reductions ?? []).reduce(
      (sum, entry) => sum + entry.reduction_amount,
      0,
    );
    if (reduction !== line2a) {
      throw new Error(
        "Form 8820 expense reductions must equal the full credit on line 2a",
      );
    }
  }
  if (
    input.reduced_section280c_credit_election &&
    (input.expense_reduction_statement_file_name ||
      (input.expense_reductions?.length ?? 0) > 0)
  ) {
    throw new Error(
      "Form 8820 reduced-credit election cannot claim an expense reduction",
    );
  }
  if (
    line2a === 0 &&
    (input.expense_reduction_statement_file_name ||
      (input.expense_reductions?.length ?? 0) > 0)
  ) {
    throw new Error(
      "Form 8820 has no own credit to reduce deductions or basis",
    );
  }
  const line2c = Math.max(0, line2a - line2b);
  const line3 = (input.pass_through_credits ?? []).reduce(
    (sum, entry) => sum + entry.credit_amount,
    0,
  );
  return {
    line1,
    line2a,
    line2b,
    line2c,
    line3,
    line4: line2c + line3,
    ...(controlledGroup ? { controlledGroup } : {}),
  };
}

class F8820Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8820";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800]);

  compute(_ctx: NodeContext, raw: F8820Input): NodeResult {
    const input = inputSchema.parse(raw);
    const lines = calculateForm8820(input);
    if (lines.line4 === 0) return { outputs: [] };
    return {
      outputs: [this.outputNodes.output(f3800, {
        f8820_credit: {
          credit_amount: lines.line4,
          subject_to_passive_activity_limit:
            (lines.line2c > 0 && input.subject_to_passive_activity_limit) ||
            (input.pass_through_credits ?? []).some((entry) =>
              entry.subject_to_passive_activity_limit
            ),
        },
      })],
    };
  }
}

export const f8820 = new F8820Node();
