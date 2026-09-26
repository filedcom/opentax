import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { calculateForm8912SourceLines } from "./calculation.ts";

// Form 8912 (Rev. December 2024): Part III uses Form 1097-BTC amounts;
// Part IV computes credits where no Form 1097-BTC was received. This node
// does not file the tentative credit. Part II must first limit it against tax.
export enum BondType {
  CREB = "CREB",
  NEW_CREB = "NEW_CREB",
  QECB = "QECB",
  QZAB = "QZAB",
  QSCB = "QSCB",
  BAB = "BAB",
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pre2018IssueDate = isoDate.refine(
  (date) => date <= "2017-12-31",
  "Tax credit bonds issued after 2017 are ineligible",
);

const reportedBondSchema = z.object({
  bond_type: z.nativeEnum(BondType),
  issue_date: pre2018IssueDate,
  issuer_ein: z.string().regex(/^\d{9}$/),
  unique_identifier: z.string().min(1),
  credit_amount: z.number().finite().nonnegative(),
  issuer_elected_direct_payment: z.boolean(),
  is_pass_through_creb_credit: z.boolean(),
});

const unreportedBondSchema = z.object({
  bond_type: z.nativeEnum(BondType),
  issue_date: pre2018IssueDate,
  issuer_name: z.string().min(1),
  issuer_ein: z.string().regex(/^\d{9}$/),
  maturity_date: isoDate,
  outstanding_principal: z.number().finite().nonnegative(),
  credit_rate: z.number().finite().nonnegative(),
  ownership_percentage: z.number().finite().min(0).max(1),
  issuer_elected_direct_payment: z.boolean(),
});

export const itemSchema = z.object({
  reported_bonds: z.array(reportedBondSchema),
  unreported_bonds: z.array(unreportedBondSchema),
  qualified_bond_carryforward: z.number().finite().nonnegative(),
});

export const inputSchema = z.object({
  f8912s: z.array(itemSchema).min(1),
});

class F8912Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8912";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    for (const item of input.f8912s) {
      const lines = calculateForm8912SourceLines(
        item.reported_bonds.map((bond) => ({
          bondType: bond.bond_type,
          creditAmount: bond.credit_amount,
          issuerElectedDirectPayment: bond.issuer_elected_direct_payment,
          isPassThroughCrebCredit: bond.is_pass_through_creb_credit,
        })),
        item.unreported_bonds.map((bond) => ({
          bondType: bond.bond_type,
          outstandingPrincipal: bond.outstanding_principal,
          creditRate: bond.credit_rate,
          ownershipPercentage: bond.ownership_percentage,
          issuerElectedDirectPayment: bond.issuer_elected_direct_payment,
        })),
        item.qualified_bond_carryforward,
      );
      if (lines.hasPassThroughCrebCredit) {
        throw new Error(
          "Form 8912 pass-through CREB credit needs its separate taxable-income limit",
        );
      }
      if (lines.line4 > 0) {
        throw new Error(
          "Form 8912 positive credit cannot be filed until the Part II tax limit and source document are integrated",
        );
      }
    }
    return { outputs: [] };
  }
}

export const f8912 = new F8912Node();
