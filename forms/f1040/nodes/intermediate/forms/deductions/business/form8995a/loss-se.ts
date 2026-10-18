import { z } from "zod";
import { qbiYearConfig } from "./thresholds.ts";
import { FilingStatus } from "../../../../../types.ts";
import {
  computeGrossIncome,
  computeNetProfit,
  isSeExempt,
  type ScheduleCItem,
} from "../../../../../inputs/income/business/schedule_c/model.ts";
import {
  ownedScheduleSE,
  ownerSourcesSchema,
} from "../../../taxes/self-employment/schedule_se/owner-calculation.ts";

export const lossSeSourceSchema = z.object({
  deduction: z.number().int().positive(),
  joint_se_source: ownerSourcesSchema.optional(),
}).strict();

/** Section 1.199A-3(b)(1)(vi): attributable deductions precede QBI loss netting. */
export function reviewedLossSeAllocations(
  items: readonly ScheduleCItem[],
  status: FilingStatus,
  raw: z.infer<typeof lossSeSourceSchema>,
  taxYear: number,
  wotcReductions: ReadonlyMap<string, number> = new Map(),
): number[] {
  const source = lossSeSourceSchema.parse(raw);
  const refs = items.map((item) => item.business_reference);
  if (refs.some((ref) => !ref) || new Set(refs).size !== items.length) {
    throw Error("QBI loss SE allocation needs distinct business references");
  }
  const joint = status === FilingStatus.MFJ;
  if (joint !== (source.joint_se_source !== undefined)) {
    throw Error("QBI loss SE source must match the actual filing status");
  }
  const ownerDeductions = { T: source.deduction, S: 0 };
  if (source.joint_se_source) {
    const owned = ownedScheduleSE(
      source.joint_se_source,
      qbiYearConfig(taxYear).ssWageBase,
    );
    if (
      owned.deduction !== source.deduction ||
      owned.source.businesses.length !== items.length
    ) {
      throw Error(
        "QBI loss SE deduction must reconcile every proprietor business",
      );
    }
    for (const item of items) {
      const business = owned.source.businesses.find((b) =>
        b.source_reference === item.business_reference
      );
      if (
        !business || business.kind !== "schedule_c" ||
        business.recipient !== item.proprietor_recipient ||
        business.net_profit !==
          computeNetProfit(
            item,
            wotcReductions.get(item.business_reference!) ?? 0,
          ) ||
        business.gross_business_income !== computeGrossIncome(item)
      ) {
        throw Error("QBI loss SE proprietor source differs from Schedule C");
      }
    }
    for (const owner of ["T", "S"] as const) {
      ownerDeductions[owner] = owned.instances.find((row) =>
        row.recipient === owner
      )?.line13 ?? 0;
    }
  }
  const result = items.map(() => 0);
  for (const owner of ["T", "S"] as const) {
    const indices = items.flatMap((item, i) => {
      const recipient = item.proprietor_recipient ??
        (status === FilingStatus.Single ? "T" : undefined);
      if (recipient !== "T" && !(joint && recipient === "S")) {
        throw Error("QBI loss SE allocation needs the permitted proprietor");
      }
      return recipient === owner ? [i] : [];
    });
    const basis = indices.map((i) => {
      const gross = computeGrossIncome(items[i]);
      const cents = Math.round(gross * 100);
      if (
        gross < 0 || !Number.isSafeInteger(cents) ||
        Math.abs(gross * 100 - cents) > 1e-6
      ) {
        throw Error(
          "QBI loss SE allocation needs nonnegative gross income in exact cents",
        );
      }
      return BigInt(cents);
    });
    const total = basis.reduce((sum, amount) => sum + amount, 0n);
    const cents = ownerDeductions[owner] * 100;
    if (!Number.isSafeInteger(cents) || (cents > 0 && total === 0n)) {
      throw Error("QBI loss SE deduction needs its owner's gross income basis");
    }
    const shares = indices.map((index, position) => {
      const numerator = BigInt(cents) * basis[position];
      return {
        index,
        amount: total ? Number(numerator / total) : 0,
        remainder: total ? numerator % total : 0n,
      };
    });
    const ranked = [...shares].sort((a, b) =>
      a.remainder === b.remainder
        ? refs[a.index]! < refs[b.index]! ? -1 : 1
        : a.remainder > b.remainder
        ? -1
        : 1
    );
    const residual = cents - shares.reduce((sum, row) => sum + row.amount, 0);
    for (let i = 0; i < residual; i++) ranked[i].amount++;
    for (const row of shares) result[row.index] = row.amount / 100;
  }
  for (const [i, item] of items.entries()) {
    const review = item.qbi_loss_se_tax_allocation_review;
    if (
      !review || review.deduction_amount !== result[i] ||
      isSeExempt(item) ||
      (item.qbi_wotc_filing_review &&
        !wotcReductions.has(item.business_reference!)) ||
      item.qbi_se_tax_allocation_review || item.at_risk_simplified ||
      (item.line_30_home_office ?? 0) !== 0 || item.home_office_method ||
      (item.line_26_other_employment_credits ?? 0) !== 0
    ) {
      throw Error(
        "QBI loss businesses need matching reviewed gross-income SE allocations",
      );
    }
  }
  return result;
}
