import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import {
  calculateForm8912BondInterest,
  calculateForm8912PartIVBond,
  calculateForm8912SourceLines,
  type Form8912BondInterest,
  type Form8912SourceLines,
  type Form8912UnreportedBond,
} from "./calculation.ts";

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
  unique_identifier: z.string().min(1).max(40),
  credit_amount: z.number().finite().nonnegative(),
  disposition_date: isoDate.optional(),
  purchase_accrued_interest: z.number().finite().nonnegative(),
  sale_accrued_interest: z.number().finite().nonnegative(),
  taxable_interest_reported_elsewhere: z.number().finite().nonnegative(),
  issuer_elected_direct_payment: z.boolean(),
  is_pass_through_creb_credit: z.boolean(),
}).superRefine((bond, ctx) => {
  checkIssueWindow(bond.bond_type, bond.issue_date, ctx);
  if (bond.sale_accrued_interest > 0 && !bond.disposition_date) {
    ctx.addIssue({
      code: "custom",
      message: "Sale accrued interest needs a disposition date",
    });
  }
});

const partIVRowSchema = z.object({
  cusip: z.string().length(9).optional(),
  principal_payment_date: isoDate.optional(),
  interest_payment_date: isoDate.optional(),
  outstanding_principal: z.number().finite().nonnegative().optional(),
  interest_payable: z.number().finite().nonnegative().optional(),
  credit_rate: z.number().finite().min(0).max(1),
  credit_allowance_percentage: z.number().finite().min(0).max(1),
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
  purchase_accrued_interest: z.number().finite().nonnegative(),
  sale_accrued_interest: z.number().finite().nonnegative(),
  taxable_interest_reported_elsewhere: z.number().finite().nonnegative(),
  line18_rows: z.array(partIVRowSchema).min(1).max(50),
  issuer_elected_direct_payment: z.boolean(),
  is_pass_through_creb_credit: z.boolean(),
}).superRefine((bond, ctx) => {
  checkIssueWindow(bond.bond_type, bond.issue_date, ctx);
  if (bond.sale_accrued_interest > 0 && !bond.disposition_date) {
    ctx.addIssue({
      code: "custom",
      message: "Sale accrued interest needs a disposition date",
    });
  }
  for (const [index, row] of bond.line18_rows.entries()) {
    const issue = (message: string) =>
      ctx.addIssue({
        code: "custom",
        message,
        path: ["line18_rows", index],
      });
    if (bond.bond_type === BondType.BAB) {
      if (
        row.interest_payable === undefined ||
        row.outstanding_principal !== undefined
      ) {
        issue("BAB needs interest payable, not outstanding principal");
      }
      if (row.credit_rate !== 0.35 || row.credit_allowance_percentage !== 1) {
        issue("BAB needs a 35% rate and 100% allowance percentage");
      }
      if (!row.cusip || !row.interest_payment_date) {
        issue("BAB needs a CUSIP and interest payment date");
      }
    } else {
      if (
        row.outstanding_principal === undefined ||
        row.interest_payable !== undefined
      ) {
        issue("Non-BAB bond needs outstanding principal, not interest payable");
      }
      if (bond.bond_type === BondType.CREB) {
        if (!row.cusip || !row.principal_payment_date) {
          issue("CREB needs a CUSIP and principal payment date");
        }
      } else if (!row.cusip && !row.principal_payment_date) {
        issue("Bond needs a CUSIP or principal payment date");
      }
    }
  }
});

const carryforwardSchema = z.object({
  bond_type: z.nativeEnum(BondType),
  issue_date: pre2018IssueDate,
  bond_identifier: z.string().min(1),
  origin_tax_year: z.number().int().min(2000).max(2024),
  amount: z.number().finite().nonnegative(),
}).superRefine((carryforward, ctx) => {
  checkIssueWindow(carryforward.bond_type, carryforward.issue_date, ctx);
  if (
    carryforward.bond_type === BondType.CREB ||
    (carryforward.bond_type === BondType.QZAB &&
      carryforward.issue_date < "2008-10-04")
  ) {
    ctx.addIssue({
      code: "custom",
      message: "CREB and pre-October 4, 2008 QZAB credits cannot carry forward",
    });
  }
});

export const itemSchema = z.object({
  reported_bonds: z.array(reportedBondSchema),
  unreported_bonds: z.array(unreportedBondSchema),
  carryforwards: z.array(carryforwardSchema),
});

export const inputSchema = z.object({
  f8912s: z.array(itemSchema).min(1),
});

export type F8912Item = z.infer<typeof itemSchema>;
export type F8912UnreportedBond = F8912Item["unreported_bonds"][number];
export type F8912PartIVRow = F8912UnreportedBond["line18_rows"][number];

export function partIVRowInput(
  bond: F8912UnreportedBond,
  row: F8912PartIVRow,
): Form8912UnreportedBond {
  const creditBaseAmount = bond.bond_type === BondType.BAB
    ? row.interest_payable
    : row.outstanding_principal;
  if (creditBaseAmount === undefined) {
    throw new Error("Form 8912 line 18 credit base is missing");
  }
  return {
    bondType: bond.bond_type,
    creditBaseAmount,
    creditRate: row.credit_rate,
    creditAllowancePercentage: row.credit_allowance_percentage,
    issuerElectedDirectPayment: bond.issuer_elected_direct_payment,
    isPassThroughCrebCredit: bond.is_pass_through_creb_credit,
  };
}

export function sourceLinesFromItem(
  item: F8912Item,
): Form8912SourceLines {
  return calculateForm8912SourceLines(
    item.reported_bonds.map((bond) => ({
      bondType: bond.bond_type,
      creditAmount: bond.credit_amount,
      issuerElectedDirectPayment: bond.issuer_elected_direct_payment,
      isPassThroughCrebCredit: bond.is_pass_through_creb_credit,
    })),
    item.unreported_bonds.flatMap((bond) =>
      bond.line18_rows.map((row) => partIVRowInput(bond, row))
    ),
    item.carryforwards.reduce(
      (sum, carryforward) => sum + carryforward.amount,
      0,
    ),
  );
}

export function interestFromItem(item: F8912Item): Form8912BondInterest {
  return interestRowsFromItem(item).reduce(
    (sum, { interest }) => ({
      creditInterest: sum.creditInterest + interest.creditInterest,
      purchaseAccruedInterestRecoveredAsBasis:
        sum.purchaseAccruedInterestRecoveredAsBasis +
        interest.purchaseAccruedInterestRecoveredAsBasis,
      saleAccruedInterest: sum.saleAccruedInterest +
        interest.saleAccruedInterest,
      taxableInterest: sum.taxableInterest + interest.taxableInterest,
    }),
    {
      creditInterest: 0,
      purchaseAccruedInterestRecoveredAsBasis: 0,
      saleAccruedInterest: 0,
      taxableInterest: 0,
    },
  );
}

export function interestRowsFromItem(
  item: F8912Item,
): ReadonlyArray<
  {
    readonly payerName: string;
    readonly interest: Form8912BondInterest;
    readonly taxableInterestReportedElsewhere: number;
  }
> {
  const reported = item.reported_bonds.map((bond) => ({
    payerName: bond.issuer_name,
    taxableInterestReportedElsewhere: bond.taxable_interest_reported_elsewhere,
    interest: calculateForm8912BondInterest(
      bond.credit_amount,
      bond.purchase_accrued_interest,
      bond.sale_accrued_interest,
    ),
  }));
  const unreported = item.unreported_bonds.map((bond) => {
    const credit = bond.line18_rows.reduce(
      (sum, row) =>
        sum +
        calculateForm8912PartIVBond(partIVRowInput(bond, row)).line20,
      0,
    );
    return {
      payerName: bond.issuer_name,
      taxableInterestReportedElsewhere:
        bond.taxable_interest_reported_elsewhere,
      interest: calculateForm8912BondInterest(
        credit,
        bond.purchase_accrued_interest,
        bond.sale_accrued_interest,
      ),
    };
  });
  const rows = [...reported, ...unreported];
  for (const row of rows) {
    if (row.taxableInterestReportedElsewhere > row.interest.taxableInterest) {
      throw new Error(
        "Form 8912 interest reported elsewhere exceeds this bond's taxable interest",
      );
    }
  }
  return rows;
}

class F8912Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8912";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_b, f1040]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    const outputs: NodeOutput[] = [];
    let tentativeCredit = 0;
    for (const item of input.f8912s) {
      const lines = sourceLinesFromItem(item);
      const interestRows = interestRowsFromItem(item);
      if (lines.hasPassThroughCrebCredit) {
        throw new Error(
          "Form 8912 pass-through CREB credit needs its separate taxable-income limit",
        );
      }
      tentativeCredit += lines.line4;
      for (const row of interestRows) {
        const unreportedInterest = row.interest.taxableInterest -
          row.taxableInterestReportedElsewhere;
        if (unreportedInterest > 0) {
          outputs.push(this.outputNodes.output(schedule_b, {
            payer_name: row.payerName,
            taxable_interest_net: unreportedInterest,
          }));
        }
      }
    }
    if (tentativeCredit > 0) {
      outputs.push(this.outputNodes.output(f1040, {
        form8912_tentative_credit: tentativeCredit,
      }));
    }
    return { outputs };
  }
}

export const f8912 = new F8912Node();
