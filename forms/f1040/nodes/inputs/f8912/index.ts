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

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

const isoDate = z.string().refine(isCalendarDate, "Invalid calendar date");
const pre2018IssueDate = isoDate.refine(
  (date) => date <= "2017-12-31",
  "Tax credit bonds issued after 2017 are ineligible",
);

const issueWindow: Readonly<Record<BondType, readonly [string, string]>> = {
  [BondType.CREB]: ["2006-01-01", "2009-12-31"],
  [BondType.NEW_CREB]: ["2008-10-04", "2017-12-31"],
  [BondType.QECB]: ["2008-10-04", "2017-12-31"],
  [BondType.QZAB]: ["1998-01-01", "2017-12-31"],
  [BondType.QSCB]: ["2009-02-18", "2017-12-31"],
  [BondType.BAB]: ["2009-02-18", "2010-12-31"],
};

function checkIssueWindow(
  bondType: BondType,
  issueDate: string,
  ctx: z.RefinementCtx,
): void {
  const [first, last] = issueWindow[bondType];
  if (issueDate < first || issueDate > last) {
    ctx.addIssue({
      code: "custom",
      message: `${bondType} issue date must be between ${first} and ${last}`,
      path: ["issue_date"],
    });
  }
}

const reportedBondSchema = z.object({
  bond_type: z.nativeEnum(BondType),
  issue_date: pre2018IssueDate,
  issuer_name: z.string().min(1),
  issuer_ein: z.string().regex(/^\d{9}$/),
  unique_identifier: z.string().min(1),
  credit_amount: z.number().finite().nonnegative(),
  issuer_elected_direct_payment: z.boolean(),
  is_pass_through_creb_credit: z.boolean(),
}).superRefine((bond, ctx) => {
  checkIssueWindow(bond.bond_type, bond.issue_date, ctx);
});

const unreportedBondSchema = z.object({
  bond_type: z.nativeEnum(BondType),
  issue_date: pre2018IssueDate,
  issuer_name: z.string().min(1),
  issuer_city: z.string().min(1),
  issuer_state: z.string().length(2),
  issuer_ein: z.string().regex(/^\d{9}$/),
  maturity_date: isoDate,
  disposition_date: isoDate.optional(),
  cusip: z.string().min(1).optional(),
  principal_payment_dates: z.array(isoDate),
  interest_payment_dates: z.array(isoDate),
  outstanding_principal: z.number().finite().nonnegative().optional(),
  interest_payable: z.number().finite().nonnegative().optional(),
  credit_rate: z.number().finite().nonnegative(),
  credit_allowance_percentage: z.number().finite().min(0).max(1),
  issuer_elected_direct_payment: z.boolean(),
}).superRefine((bond, ctx) => {
  checkIssueWindow(bond.bond_type, bond.issue_date, ctx);
  if (bond.bond_type === BondType.BAB) {
    if (
      bond.interest_payable === undefined ||
      bond.outstanding_principal !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "BAB needs interest payable, not outstanding principal",
      });
    }
    if (bond.credit_rate !== 0.35 || bond.credit_allowance_percentage !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "BAB needs a 35% rate and 100% allowance percentage",
      });
    }
    if (!bond.cusip || bond.interest_payment_dates.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "BAB needs a CUSIP and interest payment dates",
      });
    }
  } else {
    if (
      bond.outstanding_principal === undefined ||
      bond.interest_payable !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Non-BAB bond needs outstanding principal, not interest payable",
      });
    }
  }
  if (bond.bond_type === BondType.CREB) {
    if (!bond.cusip || bond.principal_payment_dates.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "CREB needs a CUSIP and principal payment dates",
      });
    }
  } else if (!bond.cusip && bond.principal_payment_dates.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Bond needs a CUSIP or principal payment dates",
    });
  }
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
          creditBaseAmount: bond.bond_type === BondType.BAB
            ? bond.interest_payable!
            : bond.outstanding_principal!,
          creditRate: bond.credit_rate,
          creditAllowancePercentage: bond.credit_allowance_percentage,
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
