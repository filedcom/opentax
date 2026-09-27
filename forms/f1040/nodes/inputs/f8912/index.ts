import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form8912AllowancePercentage } from "./allowance.ts";
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
  unique_identifier_code: z.enum(["C", "A", "O"]),
  unique_identifier: z.string().regex(/^[A-Za-z0-9]{1,39}$/, {
    message:
      "Form 1097-BTC box 2b must contain 1 to 39 alphanumeric characters",
  }),
  // Annual Form 1097-BTC boxes 5a-5l, January through December.
  monthly_credit_amounts: z.array(z.number().finite().nonnegative()).length(12),
  credit_amount: z.number().finite().nonnegative(),
  disposition_date: isoDate.optional(),
  purchase_accrued_interest: z.number().finite().nonnegative(),
  sale_accrued_interest: z.number().finite().nonnegative(),
  taxable_interest_reported_elsewhere: z.number().finite().nonnegative(),
  issuer_elected_direct_payment: z.boolean(),
  is_pass_through_creb_credit: z.boolean(),
}).superRefine((bond, ctx) => {
  checkIssueWindow(bond.bond_type, bond.issue_date, ctx);
  if (
    bond.unique_identifier_code === "C" && bond.unique_identifier.length < 9
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 1097-BTC CUSIP identifier must begin with a 9-character CUSIP",
      path: ["unique_identifier"],
    });
  }
  const monthlyTotal = bond.monthly_credit_amounts.reduce(
    (sum, amount) => sum + amount,
    0,
  );
  if (Math.abs(monthlyTotal - bond.credit_amount) > 0.01) {
    ctx.addIssue({
      code: "custom",
      message: "Form 1097-BTC box 1 must equal the sum of boxes 5a through 5l",
      path: ["credit_amount"],
    });
  }
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
  allowance_dates: z.array(isoDate).min(1).max(5),
});

const unreportedBondSchema = z.object({
  bond_type: z.nativeEnum(BondType),
  issue_date: pre2018IssueDate,
  issuer_name: z.string().min(1),
  issuer_city: z.string().min(1),
  issuer_state: z.string().length(2),
  issuer_ein: z.string().regex(/^\d{9}$/),
  maturity_date: isoDate,
  acquisition_date: isoDate,
  disposition_date: isoDate.optional(),
  disposition_kind: z.enum(["sale", "redemption", "other"]).optional(),
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
  if (Boolean(bond.disposition_date) !== Boolean(bond.disposition_kind)) {
    ctx.addIssue({
      code: "custom",
      message: "Part IV disposition date and kind must be provided together",
      path: ["disposition_kind"],
    });
  }
  const allowanceDates = new Set<string>();
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
      if (row.credit_rate !== 0.35) {
        issue("BAB needs a 35% credit rate");
      }
      if (!row.cusip || !row.interest_payment_date) {
        issue("BAB needs a CUSIP and interest payment date");
      }
      if (row.principal_payment_date !== undefined) {
        issue("BAB must not use a principal payment date");
      }
    } else {
      if (row.interest_payment_date !== undefined) {
        issue("Non-BAB bond must not use an interest payment date");
      }
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
    for (const date of row.allowance_dates) {
      if (allowanceDates.has(date)) {
        issue("Bond allowance date cannot appear in more than one line 18 row");
      }
      allowanceDates.add(date);
    }
    try {
      form8912AllowancePercentage({
        bondType: bond.bond_type,
        issueDate: bond.issue_date,
        acquisitionDate: bond.acquisition_date,
        maturityDate: bond.maturity_date,
        dispositionDate: bond.disposition_date,
        dispositionKind: bond.disposition_kind,
      }, {
        allowanceDates: row.allowance_dates,
        interestPaymentDate: row.interest_payment_date,
      });
    } catch (error) {
      issue(error instanceof Error ? error.message : "Invalid allowance dates");
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
}).superRefine((item, ctx) => {
  const identifiers = new Set<string>();
  item.reported_bonds.forEach((bond, index) => {
    const identifier = `${bond.issuer_ein}:${bond.unique_identifier}`;
    if (identifiers.has(identifier)) {
      ctx.addIssue({
        code: "custom",
        message: "Form 1097-BTC issuer and unique identifier appear twice",
        path: ["reported_bonds", index, "unique_identifier"],
      });
    }
    identifiers.add(identifier);
  });
});

export const inputSchema = z.object({
  f8912s: z.array(itemSchema).min(1),
}).superRefine((input, ctx) => {
  const reportedIdentifiers = new Set<string>();
  const reportedCusips = new Set<string>();
  input.f8912s.forEach((item, itemIndex) => {
    item.reported_bonds.forEach((bond, bondIndex) => {
      const identifier = `${bond.issuer_ein}:${bond.unique_identifier}`;
      if (reportedIdentifiers.has(identifier)) {
        ctx.addIssue({
          code: "custom",
          message:
            "Form 1097-BTC issuer and unique identifier appear in multiple Form 8912 items",
          path: ["f8912s", itemIndex, "reported_bonds", bondIndex],
        });
      }
      reportedIdentifiers.add(identifier);
      if (bond.unique_identifier_code === "C") {
        reportedCusips.add(
          `${bond.issuer_ein}:${bond.unique_identifier.slice(0, 9)}`,
        );
      }
    });
  });
  input.f8912s.forEach((item, itemIndex) => {
    item.unreported_bonds.forEach((bond, bondIndex) => {
      bond.line18_rows.forEach((row, rowIndex) => {
        if (
          row.cusip && reportedCusips.has(`${bond.issuer_ein}:${row.cusip}`)
        ) {
          ctx.addIssue({
            code: "custom",
            message:
              "Form 8912 bond credit is already reported on Form 1097-BTC",
            path: [
              "f8912s",
              itemIndex,
              "unreported_bonds",
              bondIndex,
              "line18_rows",
              rowIndex,
              "cusip",
            ],
          });
        }
      });
    });
  });
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
    creditAllowancePercentage: form8912AllowancePercentage({
      bondType: bond.bond_type,
      issueDate: bond.issue_date,
      acquisitionDate: bond.acquisition_date,
      maturityDate: bond.maturity_date,
      dispositionDate: bond.disposition_date,
      dispositionKind: bond.disposition_kind,
    }, {
      allowanceDates: row.allowance_dates,
      interestPaymentDate: row.interest_payment_date,
    }),
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

export function sourceLinesFromInput(
  input: z.infer<typeof inputSchema>,
): Form8912SourceLines {
  return input.f8912s.reduce<Form8912SourceLines>((total, item) => {
    const lines = sourceLinesFromItem(item);
    return {
      line1: total.line1 + lines.line1,
      line2: total.line2 + lines.line2,
      line3: total.line3 + lines.line3,
      line4: total.line4 + lines.line4,
      hasPassThroughCrebCredit: total.hasPassThroughCrebCredit ||
        lines.hasPassThroughCrebCredit,
    };
  }, {
    line1: 0,
    line2: 0,
    line3: 0,
    line4: 0,
    hasPassThroughCrebCredit: false,
  });
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
  readonly outputNodes = new OutputNodes([
    schedule_b,
    schedule3,
    form6251,
    f1040,
  ]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    const outputs: NodeOutput[] = [];
    const source = sourceLinesFromInput(input);
    if (source.hasPassThroughCrebCredit) {
      throw new Error(
        "Form 8912 pass-through CREB credit needs its separate taxable-income limit",
      );
    }
    for (const item of input.f8912s) {
      const interestRows = interestRowsFromItem(item);
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
    if (source.line4 > 0) {
      outputs.push(this.outputNodes.output(f1040, {
        form8912_source_lines: source,
      }));
      outputs.push(this.outputNodes.output(schedule3, {
        form8912_source_credit_pending: true,
      }));
      outputs.push(this.outputNodes.output(form6251, {
        must_compute_for_bond_credit: true,
      }));
    }
    return { outputs };
  }
}

export const f8912 = new F8912Node();
