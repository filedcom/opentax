import { z } from "zod";
import { FilingStatus, filingStatusSchema } from "../../../../../types.ts";

const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const money = z.number().finite().min(0).max(1_000_000_000).refine(
  (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.0001,
  "LTC source amounts must be dollars and cents",
);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const value = new Date(`${s}T00:00:00Z`);
  return Number.isFinite(value.getTime()) &&
    value.toISOString().slice(0, 10) === s;
}, "LTC source needs a real calendar date");
const name = z.string().trim().min(1).max(35).regex(
  /^([A-Za-z0-9'\-] ?)*[A-Za-z0-9'\-]$/,
);
export enum LtcPeriodMethod {
  Contract = "contract_period",
  EqualRate = "equal_payment_rate",
}
export enum LtcOwner {
  Taxpayer = "taxpayer",
  Spouse = "spouse",
}
const holder = z.object({
  ssn,
  name,
}).strict();
const source = z.object({
  source_reference: reference,
  payer_ein: z.string().regex(/^\d{9}$/),
  contract_reference: reference,
  policyholder: holder,
  insured_ssn: ssn,
  gross_ltc_per_diem: money,
  accelerated_chronic_per_diem: money,
  accelerated_terminal_per_diem: money,
  qualified_contract_review_reference: reference,
  period_allocation_review_reference: reference,
  form1099ltc_box1: money,
  form1099ltc_box2: money,
  per_diem_box3_confirmed: z.literal(true),
  only_per_diem_payments_reported_confirmed: z.literal(true),
  all_ltc_payments_from_qualified_contracts_confirmed: z.literal(true),
  no_business_relationship_exclusion_limit_confirmed: z.literal(true),
}).strict().superRefine((s, ctx) => {
  if (
    s.form1099ltc_box1 !== s.gross_ltc_per_diem ||
    Math.round(s.form1099ltc_box2 * 100) !==
      Math.round(s.accelerated_chronic_per_diem * 100) +
        Math.round(s.accelerated_terminal_per_diem * 100) ||
    s.form1099ltc_box1 + s.form1099ltc_box2 <= 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "LTC period amounts must reconcile to complete annual Forms 1099-LTC",
    });
  }
});
const illness = z.object({
  certification_date: date,
  practitioner_source_reference: reference,
  annual_chronic_eligibility_confirmed: z.literal(true),
  prescribed_care_plan_reference: reference,
}).strict();
const expense = z.object({ source_reference: reference, qualified_cost: money })
  .strict();
const reimbursement = z.object({
  source_reference: reference,
  amount: money,
  // A reviewed pre-August 1996 unmodified contract is excluded from line 24.
  excluded_pre_august_1996_unmodified_contract: z.object({
    issued_on: date,
    no_increasing_exchange_or_modification_confirmed: z.literal(true),
    contract_review_reference: reference,
  }).strict().optional(),
}).strict();
const insured = z.object({
  insured: holder.extend({
    name_control: z.string().regex(/^[A-Z][A-Z\- ]{0,3}$/),
    identity_source_reference: reference,
  }).strict(),
  filing_policyholders: z.array(
    z.object({ owner: z.nativeEnum(LtcOwner), ssn }).strict(),
  ).min(1).max(2),
  insured_joint_spouse: z.object({
    ssn,
    joint_return_review_reference: reference,
  }).strict().optional(),
  joint_priority_allocation: z.object({
    review_reference: reference,
    shares: z.array(
      z.object({
        ssn,
        limitation: money.refine(
          Number.isInteger,
          "LTC allocation must use whole dollars",
        ),
      }).strict(),
    ).length(
      2,
    ),
  }).strict().optional(),
  period: z.object({
    start_date: date,
    end_date: date,
    method: z.nativeEnum(LtcPeriodMethod),
    source_reference: reference,
    all_contracts_and_rates_unchanged_for_period_confirmed: z.literal(true),
    all_payees_agreed_equal_rate_period: z.literal(true).optional(),
    common_contract_period_confirmed: z.literal(true).optional(),
  }).strict(),
  chronic_illness: illness.optional(),
  terminal_illness: z.object({
    certification_date: date,
    physician_source_reference: reference,
    death_expected_within_24_months_confirmed: z.literal(true),
  }).strict().optional(),
  all_payees_contracts_and_periods_review_reference: reference,
  no_other_ltc_periods_confirmed: z.literal(true),
  sources: z.array(source).min(1),
  expenses: z.array(expense),
  reimbursements: z.array(reimbursement),
}).strict().superRefine((s, ctx) => {
  const fail = (message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  const { start_date: start, end_date: end, method } = s.period;
  if (!start.startsWith("2025-") || !end.startsWith("2025-") || start > end) {
    fail("LTC period must be ordered within 2025");
  }
  if (
    method === LtcPeriodMethod.EqualRate &&
    !s.period.all_payees_agreed_equal_rate_period
  ) fail("LTC equal-rate period needs every payee's agreement");
  if (
    method === LtcPeriodMethod.Contract &&
    !s.period.common_contract_period_confirmed
  ) fail("LTC contract period needs a common contract-period review");
  if (s.sources.some((r) => r.insured_ssn !== s.insured.ssn)) {
    fail("LTC source insured must match the reviewed insured");
  }
  const owners = s.filing_policyholders;
  if (
    new Set(owners.map((o) => o.owner)).size !== owners.length ||
    new Set(owners.map((o) => o.ssn)).size !== owners.length ||
    owners.some((o) => !s.sources.some((r) => r.policyholder.ssn === o.ssn))
  ) {
    fail(
      "LTC filing policyholders must be distinct recipients in the source inventory",
    );
  }
  const recipients = [...new Set(s.sources.map((r) => r.policyholder.ssn))];
  if (
    new Set(
      s.sources.map((r) =>
        `${r.payer_ein}:${r.contract_reference}:${r.policyholder.ssn}`
      ),
    ).size !== s.sources.length
  ) fail("LTC annual inventory repeats a policyholder's contract");
  if (
    recipients.some((id) =>
      new Set(
        s.sources.filter((r) => r.policyholder.ssn === id).map((r) =>
          r.policyholder.name
        ),
      ).size !== 1
    )
  ) fail("LTC policyholder names conflict across sources");
  if (s.insured_joint_spouse?.ssn === s.insured.ssn) {
    fail("LTC insured and joint spouse must differ");
  }
  if (
    s.sources.some((r) =>
      r.gross_ltc_per_diem + r.accelerated_chronic_per_diem > 0
    )
  ) {
    const c = s.chronic_illness;
    const yearLater = c
      ? new Date(`${c.certification_date}T00:00:00Z`)
      : undefined;
    yearLater?.setUTCFullYear(yearLater.getUTCFullYear() + 1);
    if (
      !c || c.certification_date > start || !yearLater ||
      yearLater.toISOString().slice(0, 10) <= end
    ) {
      fail(
        "LTC period needs a current annual chronic-illness certification and care plan",
      );
    }
  }
  if (s.terminal_illness && s.terminal_illness.certification_date > end) {
    fail("LTC terminal-illness certification is after this period");
  }
  if (
    s.sources.some((r) => r.accelerated_terminal_per_diem > 0) &&
    (!s.terminal_illness || s.terminal_illness.certification_date > start)
  ) {
    fail(
      "LTC terminal benefits need a physician certification covering their period",
    );
  }
  if (
    s.terminal_illness &&
    s.sources.some((r) => r.accelerated_chronic_per_diem > 0)
  ) {
    fail(
      "LTC redesignation requires separate chronic and terminal benefit periods",
    );
  }
  if (
    s.reimbursements.some((r) =>
      r.excluded_pre_august_1996_unmodified_contract &&
      r.excluded_pre_august_1996_unmodified_contract.issued_on >= "1996-08-01"
    )
  ) {
    fail(
      "LTC reimbursement exclusion needs a pre-August 1996 unmodified contract",
    );
  }
});

export const ltcLedgerSchema = z.object({
  tax_year: z.literal(2025),
  insureds: z.array(insured).min(1),
}).strict().superRefine((s, ctx) => {
  const refs = s.insureds.flatMap((
    i,
  ) => [
    ...i.sources.map((r) => r.source_reference),
    ...i.expenses.map((r) => r.source_reference),
    ...i.reimbursements.map((r) => r.source_reference),
  ]);
  if (
    new Set(refs).size !== refs.length ||
    new Set(s.insureds.map((i) => i.insured.ssn)).size !== s.insureds.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "LTC insureds and source/expense/reimbursement references must be unique",
    });
  }
});
export type LtcLedger = z.infer<typeof ltcLedgerSchema>;
type Insured = LtcLedger["insureds"][number];
const sum = (values: readonly number[]) => {
  const cents = values.reduce((a, b) => a + Math.round(b * 100), 0);
  if (!Number.isSafeInteger(cents)) {
    throw new Error("LTC source total exceeds the supported cent range");
  }
  return cents / 100;
};
const filed = (values: readonly number[]) => Math.round(sum(values));

function calculateInsured(s: Insured) {
  const days = Math.round(
    (Date.parse(s.period.end_date) - Date.parse(s.period.start_date)) /
      86400000,
  ) + 1;
  const recipients = [...new Set(s.sources.map((r) => r.policyholder.ssn))].map(
    (id) => {
      const sources = s.sources.filter((r) => r.policyholder.ssn === id);
      const line18 = filed(sources.map((r) => r.gross_ltc_per_diem));
      const line19 = filed(sources.map((r) => r.accelerated_chronic_per_diem));
      return {
        policyholder: sources[0].policyholder,
        line17: line18,
        line18,
        line19,
        line20: line18 + line19,
        terminalOnly: sources.every((r) =>
          r.gross_ltc_per_diem === 0 && r.accelerated_chronic_per_diem === 0
        ),
      };
    },
  );
  const line18 = recipients.reduce((n, r) => n + r.line18, 0);
  const line19 = recipients.reduce((n, r) => n + r.line19, 0);
  const line20 = line18 + line19;
  const line21 = 420 * days;
  const line22 = filed(s.expenses.map((r) => r.qualified_cost));
  const line23 = Math.max(line21, line22);
  const line24 = filed(
    s.reimbursements.filter((r) =>
      !r.excluded_pre_august_1996_unmodified_contract
    ).map((r) => r.amount),
  );
  if (line24 > line23) {
    throw new Error(
      "LTC reimbursements exceed the period's reviewed cost/per-diem limit",
    );
  }
  const line25 = line23 - line24;
  const priorityIds = [s.insured.ssn, s.insured_joint_spouse?.ssn];
  const priority = recipients.filter((r) =>
    priorityIds.includes(r.policyholder.ssn)
  );
  const priorityPayments = priority.reduce((n, r) => n + r.line20, 0);
  const remainder = Math.max(0, line25 - priorityPayments);
  const otherPayments = line20 - priorityPayments;
  const jointShares = s.joint_priority_allocation?.shares;
  if (
    priority.length > 1 && (!jointShares ||
      new Set(jointShares.map((a) => a.ssn)).size !== priority.length ||
      jointShares.some((a) =>
        !priority.some((r) =>
          r.policyholder.ssn === a.ssn && a.limitation <= r.line20
        )
      ) ||
      jointShares.reduce((n, a) => n + a.limitation, 0) !==
        Math.min(line25, priorityPayments))
  ) {
    throw new Error(
      "LTC joint insured/spouse priority needs a reviewed allocation of their combined exclusion",
    );
  }
  if (priority.length < 2 && jointShares) {
    throw new Error(
      "LTC joint priority allocation has no matching insured/spouse recipient pair",
    );
  }
  const allocated = recipients.map((r) => {
    const multiplePayees = recipients.length > 1;
    const allocation = !multiplePayees
      ? line25
      : priorityIds.includes(r.policyholder.ssn)
      ? priority.length > 1
        ? jointShares!.find((a) => a.ssn === r.policyholder.ssn)!.limitation
        : Math.min(line25, r.line20)
      : otherPayments > 0
      ? remainder * r.line20 / otherPayments
      : 0;
    const own25 = Math.round(allocation);
    return {
      ...r,
      multiplePayees,
      line21,
      line22,
      line23,
      line24,
      line25: r.terminalOnly ? undefined : own25,
      line26: r.terminalOnly ? 0 : Math.max(0, r.line20 - own25),
      terminallyIll: s.terminal_illness !== undefined,
    };
  });
  return {
    source: s,
    days,
    aggregate: {
      line18,
      line19,
      line20,
      line21,
      line22,
      line23,
      line24,
      line25,
      line26: Math.max(0, line20 - line25),
    },
    recipients: allocated,
    forms: s.filing_policyholders.map((owner) => ({
      owner,
      ...allocated.find((r) => r.policyholder.ssn === owner.ssn)!,
      insured: s.insured,
      period: s.period,
    })),
  };
}
export function calculateLtcLedger(raw: LtcLedger) {
  const ledger = ltcLedgerSchema.parse(raw);
  const insureds = ledger.insureds.map(calculateInsured);
  const forms = insureds.flatMap((i) => i.forms);
  return { insureds, forms, taxable: forms.reduce((n, f) => n + f.line26, 0) };
}

export function assertLtcOwners(ledger: LtcLedger, rawGeneral: unknown): void {
  const general = z.object({
    taxpayer_ssn: z.string(),
    spouse_ssn: z.string().optional(),
    filing_status: filingStatusSchema,
  }).parse(rawGeneral);
  for (const insured of ledger.insureds) {
    if (
      insured.insured_joint_spouse &&
      [general.taxpayer_ssn, general.spouse_ssn].some((id) =>
        id?.replace(/\D/g, "") === insured.insured.ssn
      )
    ) {
      const other =
        general.taxpayer_ssn.replace(/\D/g, "") === insured.insured.ssn
          ? general.spouse_ssn
          : general.taxpayer_ssn;
      if (
        general.filing_status !== FilingStatus.MFJ ||
        insured.insured_joint_spouse.ssn !== other?.replace(/\D/g, "")
      ) {
        throw new Error(
          "LTC joint insured/spouse priority conflicts with the current filing status",
        );
      }
    }
    const currentOwners = [
      general.taxpayer_ssn.replace(/\D/g, ""),
      ...(general.filing_status === FilingStatus.MFJ && general.spouse_ssn
        ? [general.spouse_ssn.replace(/\D/g, "")]
        : []),
    ];
    const expectedRecipients = [
      ...new Set(insured.sources.map((s) => s.policyholder.ssn)),
    ].filter((id) => currentOwners.includes(id));
    if (
      expectedRecipients.length !== insured.filing_policyholders.length ||
      expectedRecipients.some((id) =>
        !insured.filing_policyholders.some((h) => h.ssn === id)
      )
    ) {
      throw new Error(
        "LTC filing inventory must include every current-return policyholder",
      );
    }
    for (const holder of insured.filing_policyholders) {
      const expected = holder.owner === LtcOwner.Taxpayer
        ? general.taxpayer_ssn
        : general.filing_status === FilingStatus.MFJ
        ? general.spouse_ssn
        : undefined;
      if (holder.ssn !== expected?.replace(/\D/g, "")) {
        throw new Error(
          "LTC policyholder must match the current taxpayer or joint-filing spouse",
        );
      }
    }
  }
}
