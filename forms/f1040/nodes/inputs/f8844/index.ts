import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8844 — Empowerment Zone Employment Credit
// IRC §1396 (§38): 20% credit on qualified zone wages (capped at $15,000 per employee).
// Employee must both live and work in an IRS-designated empowerment zone.
// Maximum credit per employee = $3,000. Part of General Business Credit → Schedule 3.

// TY2025 Constants per IRC §1396
const WAGE_CAP = 15_000; // $15,000 per employee per IRC §1396(b)
const CREDIT_RATE = 0.20; // 20% per IRC §1396(a)

// Per-employee schema — one item per qualified zone employee
export const itemSchema = z.object({
  // Employee name (informational only, does not affect computation)
  employee_name: z.string().optional(),
  // Total wages paid to this employee during the year
  qualified_zone_wages: z.number().nonnegative(),
  // Whether the employee's principal residence is in the empowerment zone
  employee_lives_in_zone: z.boolean(),
  // Whether the employee performs substantially all services in the empowerment zone
  employee_works_in_zone: z.boolean(),
});

export const inputSchema = z.object({
  f8844s: z.array(itemSchema).min(1),
});

type F8844Item = z.infer<typeof itemSchema>;

// Employee qualifies only if both zone tests are met per IRC §1396(d)(1)
function isQualified(item: F8844Item): boolean {
  return item.employee_lives_in_zone === true && item.employee_works_in_zone === true;
}

// Credit for one qualified employee per IRC §1396(a) and (b)
function employeeCredit(item: F8844Item): number {
  if (!isQualified(item)) return 0;
  const cappedWages = Math.min(item.qualified_zone_wages, WAGE_CAP);
  return cappedWages * CREDIT_RATE;
}

function totalCredit(items: F8844Item[]): number {
  return items.reduce((sum, item) => sum + employeeCredit(item), 0);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8844Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8844";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = totalCredit(input.f8844s);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8844 = new F8844Node();
