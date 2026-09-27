import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";
import { form8962 } from "../../intermediate/forms/form8962/index.ts";
import { form8960 } from "../../intermediate/forms/form8960/index.ts";
import { form4952 } from "../../intermediate/forms/form4952/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";

// 2025 Form 8814, Parts I and II.
const UNTAXED_AMOUNT = 1_350;
const BASE_AMOUNT = 2_700;
const MAX_CHILD_GROSS_INCOME = 13_500;

export const itemSchema = z.object({
  child_name: z.string().min(1),
  child_name_control: z.string().regex(/^[A-Z][A-Z\- ]{0,3}$/),
  child_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  // The election cannot be determined from the income boxes alone.
  child_age_eligible: z.literal(true),
  child_required_to_file: z.literal(true),
  child_income_only_permitted_types: z.literal(true),
  child_no_joint_return: z.literal(true),
  child_no_estimated_payments: z.literal(true),
  child_no_withholding: z.literal(true),
  parent_eligible_to_elect: z.literal(true),
  interest_income: z.number().nonnegative().optional(),
  // These amounts are already excluded from interest_income (Form 8814 line 1a).
  // MeF requires them on a linked ChildTaxableInterestStmt.
  interest_adjustments: z.object({
    nominee_distribution: z.number().positive().optional(),
    accrued_interest: z.number().positive().optional(),
    abp_adjustment: z.number().positive().optional(),
    oid_adjustment: z.number().positive().optional(),
  }).optional(),
  tax_exempt_interest: z.number().nonnegative().optional(),
  // Portion of line 1b that is a private-activity-bond AMT preference.
  private_activity_bond_interest: z.number().nonnegative().optional(),
  dividend_income: z.number().nonnegative().optional(),
  // Already excluded from dividend_income (Form 8814 line 2a).
  dividend_nominee_distribution: z.number().positive().optional(),
  qualified_dividends: z.number().nonnegative().optional(),
  capital_gain_distributions: z.number().nonnegative().optional(),
  // Already excluded from capital_gain_distributions (line 3).
  capital_gain_nominee_distribution: z.number().positive().optional(),
  alaska_pfd: z.number().nonnegative().optional(),
  nontaxable_social_security: z.number().nonnegative().optional(),
  child_had_foreign_account: z.boolean().optional(),
  // Distribution, grantor status, or transfer to a foreign trust in 2025.
  child_foreign_trust_part_iii_event: z.boolean().optional(),
}).superRefine((item, ctx) => {
  if ((item.qualified_dividends ?? 0) > (item.dividend_income ?? 0)) {
    ctx.addIssue({
      code: "custom",
      message: "Qualified dividends exceed ordinary dividends",
    });
  }
  if (
    (item.private_activity_bond_interest ?? 0) >
      (item.tax_exempt_interest ?? 0)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Private-activity-bond interest exceeds tax-exempt interest",
    });
  }
});

export const inputSchema = z.object({ f8814s: z.array(itemSchema).max(10) });
export type F8814Item = z.infer<typeof itemSchema>;
type F8814Input = z.infer<typeof inputSchema>;

export interface Form8814Lines {
  readonly item: F8814Item;
  readonly line2a: number;
  readonly line4: number;
  readonly line6: number;
  readonly line7: number;
  readonly line8: number;
  readonly line9: number;
  readonly line10: number;
  readonly line11: number;
  readonly line12: number;
  readonly line14: number;
  readonly line15: number;
  readonly dependentPtcMagi: number;
  readonly line12InvestmentIncome: number;
}

export function calculateForm8814(item: F8814Item): Form8814Lines {
  const line2a = (item.dividend_income ?? 0) + (item.alaska_pfd ?? 0);
  const line4 = (item.interest_income ?? 0) + line2a +
    (item.capital_gain_distributions ?? 0);
  if (line4 >= MAX_CHILD_GROSS_INCOME) {
    throw new Error(
      "Form 8814 is unavailable when child income is $13,500 or more",
    );
  }
  const line6 = Math.max(0, line4 - BASE_AMOUNT);
  const line7 = line6 > 0 ? (item.qualified_dividends ?? 0) / line4 : 0;
  const line8 = line6 > 0 ? (item.capital_gain_distributions ?? 0) / line4 : 0;
  // Retain full ratio precision until the whole-dollar lines 9 and 10.
  const line9 = Math.round(line6 * line7);
  const line10 = Math.min(Math.round(line6 * line8), line6 - line9);
  const line11 = line9 + line10;
  const line12 = line6 - line11;
  const line14 = Math.max(0, line4 - UNTAXED_AMOUNT);
  const line15 = Math.round(Math.min(line14, UNTAXED_AMOUNT) * 0.1);
  // Form 8962 Worksheet 1-2 uses a special amount for a child on Form 8814.
  const dependentPtcMagi = line4 > UNTAXED_AMOUNT
    ? (item.tax_exempt_interest ?? 0) + Math.min(line4, BASE_AMOUNT) +
      (item.nontaxable_social_security ?? 0)
    : 0;
  // IRS Form 8960 line 7 excludes the Alaska PFD share of line 12. Pub. 550
  // allocates that share as line 6 multiplied by PFD divided by line 4.
  const pfdShare = line4 > 0
    ? Math.round(line6 * (item.alaska_pfd ?? 0) / line4)
    : 0;
  const line12InvestmentIncome = Math.max(0, line12 - pfdShare);
  return {
    item,
    line2a,
    line4,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12,
    line14,
    line15,
    dependentPtcMagi,
    line12InvestmentIncome,
  };
}

class F8814Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8814";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    schedule1,
    schedule_d,
    schedule_b,
    agi_aggregator,
    income_tax_calculation,
    form8962,
    form8960,
    form4952,
    form6251,
  ]);

  compute(_ctx: NodeContext, rawInput: F8814Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.f8814s.length === 0) return { outputs: [] };
    const ssns = input.f8814s.map((item) => item.child_ssn.replaceAll("-", ""));
    if (new Set(ssns).size !== ssns.length) {
      throw new Error("Form 8814 cannot elect twice for the same child");
    }
    const lines = input.f8814s.map(calculateForm8814);
    if (lines.some((line) => line.line15 === 0)) {
      throw new Error(
        "Form 8814 requires child income above the $1,350 filing threshold",
      );
    }
    const sum = (pick: (line: Form8814Lines) => number) =>
      lines.reduce((total, line) => total + pick(line), 0);
    const line9 = sum((line) => line.line9);
    const line10 = sum((line) => line.line10);
    const line12 = sum((line) => line.line12);
    const line15 = sum((line) => line.line15);
    const line12InvestmentIncome = sum((line) => line.line12InvestmentIncome);
    const childHadForeignAccount = lines.some((line) =>
      line.item.child_had_foreign_account === true
    );
    const childHadForeignTrust = lines.some((line) =>
      line.item.child_foreign_trust_part_iii_event === true
    );
    const outputs: NodeOutput[] = [
      { nodeType: "form8814", fields: { items: lines } },
      {
        nodeType: form8962.nodeType,
        fields: {
          form8814_children: lines.map((line) => ({
            ssn: line.item.child_ssn.replaceAll("-", ""),
            magi: line.dependentPtcMagi,
          })),
        },
      },
      {
        nodeType: income_tax_calculation.nodeType,
        fields: { form8814_tax: line15 },
      },
      {
        nodeType: f1040.nodeType,
        fields: {
          form8814_tax: line15,
          ...(line9 > 0
            ? {
              line3a_qualified_dividends: line9,
              line3b_ordinary_dividends: line9,
            }
            : {}),
        },
      },
    ];
    if (childHadForeignAccount || childHadForeignTrust) {
      outputs.push({
        nodeType: schedule_b.nodeType,
        fields: {
          ...(childHadForeignAccount ? { form8814_foreign_account: true } : {}),
          ...(childHadForeignTrust ? { form8814_foreign_trust: true } : {}),
        },
      });
    }
    const privateActivityBondInterest = sum((line) =>
      line.item.private_activity_bond_interest ?? 0
    );
    if (privateActivityBondInterest > 0) {
      outputs.push({
        nodeType: form6251.nodeType,
        fields: { line2g_pab_interest: privateActivityBondInterest },
      });
    }
    if (line9 > 0) {
      outputs.push({
        nodeType: form4952.nodeType,
        fields: { form8814_line9_qualified_dividends: line9 },
      });
      outputs.push({
        nodeType: schedule_b.nodeType,
        fields: { form8814_dividends: line9 },
      });
      outputs.push({
        nodeType: income_tax_calculation.nodeType,
        fields: { qualified_dividends: line9 },
      });
      outputs.push({
        nodeType: agi_aggregator.nodeType,
        fields: { line3b_ordinary_dividends: line9 },
      });
      outputs.push({
        nodeType: form8960.nodeType,
        fields: { line2_ordinary_dividends: line9 },
      });
    }
    if (line10 > 0) {
      outputs.push({
        nodeType: form4952.nodeType,
        fields: { form8814_line10_capital_gain: line10 },
      });
      outputs.push({
        nodeType: schedule_d.nodeType,
        fields: { line13_form8814: line10 },
      });
    }
    if (line12 > 0) {
      outputs.push({
        nodeType: schedule1.nodeType,
        fields: { line8z_form8814: line12 },
      });
      outputs.push({
        nodeType: agi_aggregator.nodeType,
        fields: { line8z_form8814: line12 },
      });
    }
    if (line12InvestmentIncome > 0) {
      outputs.push({
        nodeType: form4952.nodeType,
        fields: {
          form8814_line12_investment_income: line12InvestmentIncome,
        },
      });
      outputs.push({
        nodeType: form8960.nodeType,
        fields: { form8814_line12_investment_income: line12InvestmentIncome },
      });
    }
    return { outputs };
  }
}

export const f8814 = new F8814Node();
