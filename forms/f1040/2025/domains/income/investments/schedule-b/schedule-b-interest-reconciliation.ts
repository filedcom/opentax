import {
  inputSchema as scheduleBSchema,
  line4TaxableInterest,
  schedule_b as scheduleBNode,
  totalTaxableInterest,
} from "../../../../../nodes/intermediate/aggregation/income/investments/schedule_b/index.ts";
import { inputSchema as intSchema } from "../../../../../nodes/inputs/income/investments/f1099int/index.ts";
import { inputSchema as oidSchema } from "../../../../../nodes/inputs/income/investments/f1099oid/index.ts";
import { inputSchema as brokerSchema } from "../../../../../nodes/inputs/income/investments/f1099b/index.ts";
import { inputSchema as transactionSchema } from "../../../../../nodes/inputs/income/investments/f8949/index.ts";
import { inputSchema as partnershipSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import { inputSchema as sCorpSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import { inputSchema as trustSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_trust/index.ts";
import {
  inputSchema as form8912Schema,
  interestRowsFromItem,
} from "../../../../../nodes/inputs/credits/individual/f8912/index.ts";

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

function assertMarketDiscountSources(
  pending: Readonly<Record<string, unknown>>,
  scheduleB: ReturnType<typeof scheduleBSchema.parse> | undefined,
): void {
  const expected: { payer: string; amount: number }[] = [];
  if (pending.f1099b !== undefined) {
    for (const row of brokerSchema.parse(pending.f1099b).f1099bs) {
      const amount = Math.min(
        Math.max(0, row.proceeds - row.cost_basis),
        row.box1f_accrued_market_discount ?? 0,
      );
      if (amount > 0) {
        expected.push({ payer: row.market_discount_payer_name ?? "", amount });
      }
    }
  }
  if (pending.f8949 !== undefined) {
    for (const row of transactionSchema.parse(pending.f8949).f8949s) {
      const amount = row.accrued_market_discount ?? 0;
      if (amount > 0) {
        expected.push({ payer: row.market_discount_payer_name ?? "", amount });
      }
    }
  }
  if (expected.length === 0) return;
  const amounts = scheduleB?.taxable_interest_net === undefined
    ? []
    : Array.isArray(scheduleB.taxable_interest_net)
    ? scheduleB.taxable_interest_net
    : [scheduleB.taxable_interest_net];
  const names = scheduleB?.payer_name === undefined
    ? []
    : Array.isArray(scheduleB.payer_name)
    ? scheduleB.payer_name
    : [scheduleB.payer_name];
  if (names.length !== amounts.length) {
    throw new Error(
      "Schedule B market-discount payer names and amounts must pair",
    );
  }
  const remaining = amounts.map((amount, index) => ({
    payer: names[index],
    amount,
  }));
  for (const row of expected) {
    const index = remaining.findIndex((actual) =>
      actual.payer === row.payer &&
      Math.abs(actual.amount - row.amount) < 0.01
    );
    if (index < 0) {
      throw new Error(
        "Schedule B market discount differs from retained broker and Form 8949 sources",
      );
    }
    remaining.splice(index, 1);
  }
}

function assertGenericInterestSources(
  pending: Readonly<Record<string, unknown>>,
  scheduleB: ReturnType<typeof scheduleBSchema.parse> | undefined,
): void {
  const expected: { payer: string; amount: number }[] = [];
  const add = (payer: string, amount: number) => {
    if (amount > 0) expected.push({ payer, amount });
  };
  if (pending.f1099b !== undefined) {
    for (const row of brokerSchema.parse(pending.f1099b).f1099bs) {
      add(
        row.market_discount_payer_name ?? "",
        Math.min(
          Math.max(0, row.proceeds - row.cost_basis),
          row.box1f_accrued_market_discount ?? 0,
        ),
      );
    }
  }
  if (pending.f8949 !== undefined) {
    for (const row of transactionSchema.parse(pending.f8949).f8949s) {
      add(
        row.market_discount_payer_name ?? "",
        row.accrued_market_discount ?? 0,
      );
    }
  }
  if (pending.k1_partnership !== undefined) {
    for (
      const row of partnershipSchema.parse(pending.k1_partnership)
        .k1_partnerships
    ) {
      add(row.partnership_name, row.box5_interest ?? 0);
    }
  }
  if (pending.k1_s_corp !== undefined) {
    for (const row of sCorpSchema.parse(pending.k1_s_corp).k1_s_corps) {
      add(row.corporation_name, row.box4_interest ?? 0);
    }
  }
  if (pending.k1_trust !== undefined) {
    for (const row of trustSchema.parse(pending.k1_trust).k1_trusts) {
      add(row.estate_trust_name, row.box1_interest ?? 0);
    }
  }
  if (pending.f8912 !== undefined) {
    for (const item of form8912Schema.parse(pending.f8912).f8912s) {
      for (const row of interestRowsFromItem(item)) {
        add(
          row.payerName,
          row.interest.taxableInterest - row.taxableInterestReportedElsewhere,
        );
      }
    }
  }
  const amounts = scheduleB?.taxable_interest_net === undefined
    ? []
    : Array.isArray(scheduleB.taxable_interest_net)
    ? scheduleB.taxable_interest_net
    : [scheduleB.taxable_interest_net];
  const names = scheduleB?.payer_name === undefined
    ? []
    : Array.isArray(scheduleB.payer_name)
    ? scheduleB.payer_name
    : [scheduleB.payer_name];
  if (names.length !== amounts.length || names.some((name) => !name.trim())) {
    throw new Error(
      "Schedule B generic interest payer names and amounts must pair",
    );
  }
  const remaining = amounts.map((amount, index) => ({
    payer: names[index],
    amount,
  }));
  for (const row of expected) {
    const index = remaining.findIndex((actual) =>
      actual.payer === row.payer && Math.abs(actual.amount - row.amount) < 0.01
    );
    if (index < 0) {
      throw new Error(
        "Schedule B generic interest differs from retained source records",
      );
    }
    remaining.splice(index, 1);
  }
  if (remaining.length > 0) {
    throw new Error(
      "Schedule B generic interest lacks a retained source record",
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
  assertMarketDiscountSources(pending, scheduleB);
  assertGenericInterestSources(pending, scheduleB);
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

const scheduleBPreparedKeys = new Set([
  "interest_rows",
  "seller_financed_rows",
  "dividend_rows",
  "dividend_line5_subtotal",
  "dividend_nominee",
  "interest_line1_subtotal",
  "interest_nominee",
  "interest_accrued",
  "interest_oid_adjustment",
  "interest_bond_premium",
  "foreign_country_codes",
  "foreign_country_names",
]);

function isScheduleBPreparedKey(key: string): boolean {
  return key.startsWith("print_") || scheduleBPreparedKeys.has(key);
}

/** Replay every retained Schedule B print/native field from its source inputs. */
export function assertScheduleBPreparedProjection(
  pending: Readonly<Record<string, unknown>>,
): void {
  if (pending.schedule_b === undefined) return;
  const input = scheduleBSchema.parse(pending.schedule_b);
  const expected = scheduleBNode.compute(
    { taxYear: 2025, formType: "f1040" },
    input,
  ).outputs.find((row) => row.nodeType === "schedule_b")?.fields;
  const actual = pending.schedule_b as Record<string, unknown>;
  if (expected === undefined) {
    if (Object.keys(actual).some(isScheduleBPreparedKey)) {
      throw new Error("Schedule B has prepared fields without a filing route");
    }
    return;
  }
  for (const key of Object.keys(actual)) {
    if (isScheduleBPreparedKey(key) && !(key in expected)) {
      throw new Error(`Schedule B has an unsourced prepared field at ${key}`);
    }
  }
  for (const [key, value] of Object.entries(expected)) {
    if (JSON.stringify(actual[key]) !== JSON.stringify(value)) {
      throw new Error(`Schedule B prepared projection differs at ${key}`);
    }
  }
}
