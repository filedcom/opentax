import {
  inputSchema as scheduleBSchema,
  line4TaxableInterest,
  totalTaxableInterest,
} from "../nodes/intermediate/aggregation/schedule_b/index.ts";
import { inputSchema as intSchema } from "../nodes/inputs/f1099int/index.ts";
import { inputSchema as oidSchema } from "../nodes/inputs/f1099oid/index.ts";

type InterestDetail = {
  payer_name: string;
  gross: number;
  net: number;
  nominee: number;
  accrued: number;
  oid_adjustment: number;
  bond_premium: number;
};

function sourcedInterestDetails(
  pending: Readonly<Record<string, unknown>>,
): InterestDetail[] {
  const expected: InterestDetail[] = [];
  if (pending.f1099int !== undefined) {
    for (const row of intSchema.parse(pending.f1099int).f1099ints) {
      const gross = (row.box1 ?? 0) + (row.box3 ?? 0) + (row.box10 ?? 0);
      const bondPremium =
        (row.elect_bond_premium_amortization === true ? row.box11 ?? 0 : 0) +
        (row.box12 ?? 0);
      const nominee = row.nominee_interest ?? 0;
      const accrued = row.accrued_interest_paid ?? 0;
      const oidAdjustment = row.non_taxable_oid_adjustment ?? 0;
      expected.push({
        payer_name: row.payer_name,
        gross,
        net: gross - bondPremium - nominee - accrued - oidAdjustment,
        nominee,
        accrued,
        oid_adjustment: oidAdjustment,
        bond_premium: bondPremium,
      });
    }
  }
  if (pending.f1099oid !== undefined) {
    for (const row of oidSchema.parse(pending.f1099oid).f1099oids) {
      const gross = (row.box1_oid ?? 0) + (row.box2_other_interest ?? 0) +
        (row.box8_oid_treasury ?? 0) +
        (row.box5_included_in_income_currently === true
          ? row.box5_market_discount ?? 0
          : 0);
      if (gross <= 0) continue;
      const nominee = row.nominee_oid ?? 0;
      const oidAdjustment = row.box6_applies_to === "taxable_oid"
        ? row.box6_acquisition_premium ?? 0
        : 0;
      const bondPremium = row.box10_applies_to === "taxable_stated_interest"
        ? row.box10_bond_premium ?? 0
        : 0;
      expected.push({
        payer_name: row.payer_name,
        gross,
        net: gross - nominee - oidAdjustment - bondPremium,
        nominee,
        accrued: 0,
        oid_adjustment: oidAdjustment,
        bond_premium: bondPremium,
      });
    }
  }
  return expected;
}

function assertIssuedInterestDetails(
  pending: Readonly<Record<string, unknown>>,
  filed: readonly InterestDetail[],
): void {
  const remaining = [...filed];
  const amounts: readonly (keyof Omit<InterestDetail, "payer_name">)[] = [
    "gross",
    "net",
    "nominee",
    "accrued",
    "oid_adjustment",
    "bond_premium",
  ];
  for (const expected of sourcedInterestDetails(pending)) {
    const index = remaining.findIndex((row) =>
      row.payer_name === expected.payer_name &&
      amounts.every((key) => Math.abs(row[key] - expected[key]) < 0.01)
    );
    if (index < 0) {
      throw new Error(
        "Schedule B interest payer detail differs from issued Forms 1099-INT or 1099-OID",
      );
    }
    remaining.splice(index, 1);
  }
  if (remaining.length > 0) {
    throw new Error(
      "Schedule B interest payer detail lacks an issued Form 1099-INT or 1099-OID",
    );
  }
}

/** Reconcile finalized Schedule B taxable interest to Form 1040 and AGI. */
export function assertScheduleBInterestJoin(
  pending: Readonly<Record<string, unknown>>,
): void {
  const scheduleB = pending.schedule_b === undefined
    ? undefined
    : scheduleBSchema.parse(pending.schedule_b);
  const details = scheduleB?.interest_detail;
  assertIssuedInterestDetails(
    pending,
    details === undefined ? [] : Array.isArray(details) ? details : [details],
  );
  const form1040 = pending.f1040 as Record<string, unknown> | undefined;
  const agi = pending.agi_aggregator as Record<string, unknown> | undefined;
  const line2b = form1040?.line2b_taxable_interest ?? 0;
  const line4 = scheduleB === undefined ? 0 : line4TaxableInterest(scheduleB);
  const line2 = scheduleB === undefined ? 0 : totalTaxableInterest(scheduleB);
  if (scheduleB && (scheduleB.ee_bond_exclusion ?? 0) > line2) {
    throw new Error("Schedule B savings bond exclusion exceeds interest");
  }
  if (
    typeof line2b !== "number" || !Number.isFinite(line2b) || line2b < 0 ||
    typeof line4 !== "number" || !Number.isFinite(line4) || line4 < 0 ||
    Math.abs(line2b - line4) >= 0.01
  ) {
    throw new Error(
      "Form 1040 line 2b must equal Schedule B line 4 taxable interest",
    );
  }
  if (line4 > 0 && agi?.line2b_taxable_interest === undefined) {
    throw new Error(
      "Retained AGI taxable interest must equal Schedule B line 4",
    );
  }
  if (agi?.line2b_taxable_interest !== undefined) {
    const agiInterest = agi.line2b_taxable_interest;
    if (
      typeof agiInterest !== "number" || !Number.isFinite(agiInterest) ||
      Math.abs(agiInterest - line4) >= 0.01
    ) {
      throw new Error(
        "Retained AGI taxable interest must equal Schedule B line 4",
      );
    }
  }
}
