import { roundWholeDollars } from "../../../../whole-dollars.ts";
import { z } from "zod";
import {
  ownedScheduleSE,
  ownerSourcesSchema,
} from "../schedule_se/owner-calculation.ts";
import {
  calculateSingleScheduleCForm7206,
  premiumMonthSchema,
  type SingleScheduleCPlan,
} from "./single-source.ts";
import { TS } from "../../../types.ts";
const identity = z.object({
  name: z.string().trim().min(1),
  ssn: z.string().regex(/^\d{9}$/),
}).strict();
export const independentOwnerHealthSourceSchema = z.object({
  taxpayer_identity: identity,
  spouse_identity: identity,
  plans: z.array(
    z.object({
      business_reference: z.string().trim().min(1),
      recipient: z.enum(["T", "S"]),
      plan_identifier: z.string().trim().min(1),
      establishment_source_reference: z.string().trim().min(1),
      plan_established_under_business: z.literal(true),
      issued_policy_record: z.object({
        issuer_name: z.string().trim().min(1),
        issuer_ein: z.string().regex(/^\d{9}$/),
        policy_number: z.string().trim().min(1),
        policyholder_ssn: z.string().regex(/^\d{9}$/),
        source_document_reference: z.string().trim().min(1),
      }).strict().optional(),
      issued_premium_records: z.array(
        z.object({
          month: z.number().int().min(1).max(12),
          issuer_ein: z.string().regex(/^\d{9}$/),
          policy_number: z.string().trim().min(1),
          policyholder_ssn: z.string().regex(/^\d{9}$/),
          payer_ssn: z.string().regex(/^\d{9}$/),
          covered_person: z.enum(["taxpayer", "spouse"]),
          paid_premium: z.number().nonnegative(),
          paid_on: z.string().regex(/^2025-\d{2}-\d{2}$/),
          policy_source_reference: z.string().trim().min(1),
          payment_source_reference: z.string().trim().min(1),
        }).strict(),
      ).length(12).optional(),
      premium_months: z.array(premiumMonthSchema).length(12).refine(
        (m) => m.every((x, i) => x.month === i + 1),
        "Independent plans need every month in order",
      ),
    }).strict(),
  ).min(1).max(2),
  business_plan_reviews: z.array(
    z.object({
      business_reference: z.string().trim().min(1),
      recipient: z.enum(["T", "S"]),
      plan_identifiers: z.array(z.string().trim().min(1)).max(1),
      review_source_reference: z.string().trim().min(1),
      no_other_plans_confirmed: z.literal(true),
    }).strict(),
  ).length(2),
}).strict();
export type IndependentOwnerHealthSource = z.infer<
  typeof independentOwnerHealthSourceSchema
>;
const canonical = (value: unknown) =>
  JSON.stringify(
    value,
    (_k, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
        : v,
  );
export function calculateIndependentOwnerHealth(
  raw: unknown,
  rawOwned: unknown,
  ssWageBase: number,
) {
  const source = independentOwnerHealthSourceSchema.parse(raw),
    owned = ownedScheduleSE(rawOwned, ssWageBase);
  if (
    source.taxpayer_identity.ssn !== owned.source.identity.primary_ssn ||
    source.spouse_identity.ssn !== owned.source.identity.spouse_ssn ||
    owned.source.businesses.length !== 2 || owned.instances.length !== 2 ||
    !owned.source.businesses.some((b) => b.kind === "schedule_c") ||
    ["T", "S"].some((recipient) =>
      owned.source.businesses.filter((b) =>
        b.recipient === recipient &&
        ["schedule_c", "schedule_f"].includes(b.kind) && b.net_profit > 0 &&
        b.farm_optional_method_elected !== true
      ).length !== 1
    )
  ) {
    throw new Error(
      "Independent health plans need the two actual profitable regular sole C/F owners and distinct joint identities",
    );
  }
  const reviews = new Set<string>(),
    plans = new Set<string>(),
    payments = new Set<string>();
  for (const review of source.business_plan_reviews) {
    const business = owned.source.businesses.find((b) =>
      b.source_reference === review.business_reference
    );
    if (
      !business || business.recipient !== review.recipient ||
      reviews.has(review.business_reference)
    ) {
      throw new Error(
        "Health plan review must independently inventory each actual owned business",
      );
    }
    reviews.add(review.business_reference);
    const actual = source.plans.filter((p) =>
      p.business_reference === review.business_reference
    ).map((p) => p.plan_identifier).sort();
    if (canonical(actual) !== canonical([...review.plan_identifiers].sort())) {
      throw new Error(
        "Independent owned plan inventory is missing, duplicated or detached",
      );
    }
  }
  const rows = source.plans.map((plan) => {
    if (plans.has(plan.plan_identifier)) {
      throw new Error("Independent health plan identifier is reused");
    }
    plans.add(plan.plan_identifier);
    const business = owned.source.businesses.find((b) =>
        b.source_reference === plan.business_reference
      ),
      owner = owned.instances.find((o) => o.recipient === plan.recipient);
    if (!business || !owner || business.recipient !== plan.recipient) {
      throw new Error(
        "Health plan must use its actual establishing business and proprietor",
      );
    }
    if (owned.source.businesses.some((b) => b.kind === "schedule_f")) {
      const policy = plan.issued_policy_record,
        records = plan.issued_premium_records;
      const ssn = plan.recipient === "T"
        ? source.taxpayer_identity.ssn
        : source.spouse_identity.ssn;
      if (
        !policy || !records || policy.policyholder_ssn !== ssn ||
        records.some((record, index) => {
          const month = plan.premium_months[index],
            date = new Date(record.paid_on + "T00:00:00Z");
          return record.month !== month.month ||
            !Number.isFinite(date.valueOf()) ||
            date.toISOString().slice(0, 10) !== record.paid_on ||
            record.issuer_ein !== policy.issuer_ein ||
            record.policy_number !== policy.policy_number ||
            record.policyholder_ssn !== ssn || record.payer_ssn !== ssn ||
            record.covered_person !== month.covered_person ||
            record.paid_premium !== month.paid_premium ||
            record.policy_source_reference !== month.policy_source_reference ||
            month.policy_source_reference !==
              policy.source_document_reference ||
            record.payment_source_reference !== month.payment_source_reference;
        })
      ) {
        throw new Error(
          "Mixed C/F health needs actual owned issuer policy and monthly issued/payment records",
        );
      }
    }
    for (const month of plan.premium_months) {
      if (payments.has(month.payment_source_reference)) {
        throw new Error(
          "Independent plans cannot reuse the same payment evidence",
        );
      }
      payments.add(month.payment_source_reference);
    }
    // These operands are derived from one actual business within this owner;
    // no return-wide sole-business or externally supplied income assertion is used.
    const calculationPlan: SingleScheduleCPlan = {
      business_reference: plan.business_reference,
      recipient: plan.recipient as TS,
      plan_identifier: plan.plan_identifier,
      taxpayer_identity: source.taxpayer_identity,
      ...(plan.recipient === "S" ||
          plan.premium_months.some((m) => m.covered_person === "spouse")
        ? { spouse_identity: source.spouse_identity }
        : {}),
      premium_months: plan.premium_months,
      schedule_c_line31_net_profit: business.net_profit,
      schedule1_line15_se_tax_deduction: owner.line13,
      schedule1_line16_retirement_deduction: 0,
      plan_established_under_business: true,
      sole_positive_business_verified: true,
      no_form2555: true,
      no_schedule_se_optional_method: true,
      no_other_earned_income: true,
    };
    const rawLines = calculateSingleScheduleCForm7206(calculationPlan);
    // Each filed copy settles its finalized lines before the return sums deductions.
    const lines = Object.fromEntries(
      Object.entries(rawLines).map((
        [key, value],
      ) => [key, key === "line6" ? value : roundWholeDollars(value)]),
    ) as typeof rawLines;
    const recipient = plan.recipient === "T"
      ? source.taxpayer_identity
      : source.spouse_identity;
    return {
      business_reference: plan.business_reference,
      plan_identifier: plan.plan_identifier,
      recipient: plan.recipient,
      recipient_name: recipient.name,
      recipient_ssn: recipient.ssn,
      independent_plan_required: true,
      ...lines,
      calculation_plan: calculationPlan,
    };
  }).sort((a, b) => a.business_reference.localeCompare(b.business_reference));
  return {
    source,
    owned,
    rows,
    deduction: rows.reduce((n, r) => n + r.line14, 0),
  };
}
export function reconcileIndependentOwnerHealthGraph(
  fields: {
    schedule_c_source?: unknown;
    schedule_f_source?: unknown;
    schedule_se_source?: unknown;
    schedule1_line16_source?: unknown;
    marketplace_ptc_premium_overlap?: unknown;
  },
  result: ReturnType<typeof calculateIndependentOwnerHealth>,
) {
  const c = fields.schedule_c_source as {
    unadjusted_source?: boolean;
    reviewed_wotc_source?: boolean;
    businesses?: Array<
      {
        business_reference?: string;
        proprietor_recipient?: string;
        line31_net_profit: number;
      }
    >;
  } | undefined;
  const se = fields.schedule_se_source as {
    net_profit_schedule_c: number;
    net_profit_schedule_f: number;
    farm_optional_method_elected: boolean;
    line13_deduction: number;
    owner_source?: unknown;
  } | undefined;
  const expected = result.owned.source.businesses.filter((b) =>
    b.kind === "schedule_c"
  ).map((b) => ({
    business_reference: b.source_reference,
    proprietor_recipient: b.recipient,
    line31_net_profit: b.net_profit,
  })).sort((a, b) => a.business_reference.localeCompare(b.business_reference));
  const actual = [...(c?.businesses ?? [])].sort((a, b) =>
    (a.business_reference ?? "").localeCompare(b.business_reference ?? "")
  );
  const farms = fields.schedule_f_source as {
    regular_source?: boolean;
    businesses?: Array<
      {
        farm_id?: string;
        proprietor_recipient?: string;
        line34_net_profit: number;
      }
    >;
  } | undefined;
  const expectedF = result.owned.source.businesses.filter((b) =>
    b.kind === "schedule_f"
  ).map((b) => ({
    farm_id: b.source_reference,
    proprietor_recipient: b.recipient,
    line34_net_profit: b.net_profit,
  })).sort((a, b) => a.farm_id.localeCompare(b.farm_id));
  const actualF = [...(farms?.businesses ?? [])].sort((a, b) =>
    (a.farm_id ?? "").localeCompare(b.farm_id ?? "")
  );
  if (
    fields.marketplace_ptc_premium_overlap !== false ||
    (c?.unadjusted_source !== true && c?.reviewed_wotc_source !== true) ||
    canonical(actual) !== canonical(expected) || !se ||
    se.net_profit_schedule_c !==
      expected.reduce((n, b) => n + b.line31_net_profit, 0) ||
    (expectedF.length > 0 && farms?.regular_source !== true) ||
    canonical(actualF) !== canonical(expectedF) ||
    se.net_profit_schedule_f !==
      expectedF.reduce((sum, f) => sum + f.line34_net_profit, 0) ||
    se.farm_optional_method_elected ||
    se.line13_deduction !== result.owned.deduction ||
    canonical(ownerSourcesSchema.parse(se.owner_source)) !==
      canonical(result.owned.source) ||
    Number(fields.schedule1_line16_source ?? 0) !== 0
  ) {
    throw new Error(
      "Independent health source must match its actual C/F inventory, owned SE and zero retirement adjustments",
    );
  }
}
