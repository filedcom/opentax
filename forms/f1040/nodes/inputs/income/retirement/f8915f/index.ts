import { z } from "zod";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import { inputSchema as f1099rInputSchema } from "../f1099r/index.ts";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => {
    const millis = Date.parse(`${value}T00:00:00Z`);
    return !Number.isNaN(millis) &&
      new Date(millis).toISOString().slice(0, 10) === value;
  },
  "Form 8915-F needs a real calendar date",
);
const referenceSchema = z.string().trim().min(1);

/** One 2025 disaster, one fully taxable distribution, one 1099-R. */
export const itemSchema = z.object({
  retirement_source_kind: z.enum(["plan", "traditional_ira"]),
  owner: z.enum(["T", "S"]),
  recipient_ssn: z.string().regex(/^\d{9}$/),
  fema_number: z.string().regex(/^DR-\d{4}-[A-Z]{2}$/),
  disaster_begin_date: dateSchema,
  disaster_declaration_date: dateSchema,
  distribution_date: dateSchema,
  qualified_area_home_review_reference: referenceSchema,
  economic_loss_review_reference: referenceSchema,
  eligible_retirement_source_review_reference: referenceSchema,
  no_ira_basis_review_reference: referenceSchema.optional(),
  no_prior_distributions_review_reference: referenceSchema,
  repayment: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("none"), review_reference: referenceSchema })
      .strict(),
    z.object({
      kind: z.literal("timely"),
      amount: z.number().int().positive(),
      date: dateSchema,
      receiving_plan_review_reference: referenceSchema,
      repayment_record_reference: referenceSchema,
      return_filing_date: dateSchema,
      filing_date_review_reference: referenceSchema,
      filing_deadline: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("ordinary") }).strict(),
        z.object({
          kind: z.literal("automatic_extension"),
          accepted_on: dateSchema,
          acceptance_reference: referenceSchema,
        }).strict(),
      ]),
    }).strict(),
  ]),
  source_1099r_document_reference: referenceSchema,
  source_1099r_payer_ein: z.string().regex(/^\d{9}$/),
  source_1099r_account_number: referenceSchema,
  other_distribution_nonqualified_review_reference: referenceSchema.optional(),
  gross_distribution: z.number().int().positive().max(22_000),
  taxable_distribution: z.number().int().positive().max(22_000),
  full_inclusion_elected: z.boolean(),
}).strict().superRefine((item, context) => {
  const begin = Date.parse(`${item.disaster_begin_date}T00:00:00Z`);
  const declaration = Date.parse(`${item.disaster_declaration_date}T00:00:00Z`);
  const distribution = Date.parse(`${item.distribution_date}T00:00:00Z`);
  const last = Math.max(begin, declaration) + 179 * 24 * 60 * 60 * 1000;
  if (
    item.disaster_begin_date.slice(0, 4) !== "2025" ||
    declaration < begin || distribution < begin || distribution > last ||
    item.distribution_date.slice(0, 4) !== "2025"
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["distribution_date"],
      message:
        "Form 8915-F distribution must be within this 2025 disaster's qualified period",
    });
  }
  if (item.taxable_distribution !== item.gross_distribution) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["taxable_distribution"],
      message:
        "Form 8915-F current-year path needs a fully taxable distribution",
    });
  }
  if (item.repayment.kind === "timely") {
    const currentIncome = item.full_inclusion_elected
      ? item.gross_distribution
      : Math.round(item.gross_distribution / 3);
    const ordinaryDeadline = "2026-04-15";
    const deadline = item.repayment.filing_deadline.kind === "ordinary"
      ? ordinaryDeadline
      : "2026-10-15";
    const extension = item.repayment.filing_deadline;
    if (
      item.repayment.date < item.distribution_date ||
      item.repayment.return_filing_date.slice(0, 4) !== "2026" ||
      item.repayment.date >= item.repayment.return_filing_date ||
      item.repayment.date > deadline ||
      item.repayment.return_filing_date > deadline ||
      (extension.kind === "automatic_extension" &&
        (extension.accepted_on < "2026-01-01" ||
          extension.accepted_on > ordinaryDeadline ||
          extension.accepted_on > item.repayment.return_filing_date)) ||
      item.repayment.amount > currentIncome
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repayment"],
        message:
          "Form 8915-F repayment must precede filing and the reviewed 2025 return deadline, follow the distribution, and fit current-year income",
      });
    }
  }
  if (
    item.retirement_source_kind === "traditional_ira" &&
    item.no_ira_basis_review_reference === undefined
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["no_ira_basis_review_reference"],
      message:
        "Form 8915-F traditional IRA needs reviewed Form 8606 basis history",
    });
  }
  if (
    item.retirement_source_kind === "plan" &&
    item.no_ira_basis_review_reference !== undefined
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["no_ira_basis_review_reference"],
      message: "Form 8915-F plan distribution cannot claim IRA basis review",
    });
  }
});

export const inputSchema = z.object({
  f8915fs: z.array(itemSchema).optional(),
}).strict().superRefine((input, context) => {
  try {
    distributionOwnerGroups(input.f8915fs ?? []);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error
        ? error.message
        : "Invalid Form 8915-F inventory",
    });
  }
});

export type Form8915FItem = z.infer<typeof itemSchema>;

/** First-year values shared by MeF, PDF and Form 1040 reconciliation. */
export function currentYearDistributionLines(
  raw: Form8915FItem,
  other: { planGross: number; iraGross: number },
) {
  const item = itemSchema.parse(raw);
  const amount = item.gross_distribution;
  const plan = item.retirement_source_kind === "plan";
  const thisYear = item.full_inclusion_elected
    ? amount
    : Math.round(amount / 3);
  const repayment = item.repayment.kind === "timely"
    ? item.repayment.amount
    : 0;
  return {
    line1e_available: 22_000,
    line2a_plan_distributions: (plan ? amount : 0) + other.planGross,
    line2b_qualified_plan_distributions: plan ? amount : 0,
    line3a_ira_distributions: (plan ? 0 : amount) + other.iraGross,
    line3b_qualified_ira_distributions: plan ? 0 : amount,
    line5a_nonqualified_distributions: other.planGross + other.iraGross,
    line5b_qualified_distributions: amount,
    line6_total_qualified: amount,
    line8_plan_qualified: plan ? amount : 0,
    line9_cost: 0,
    line10_taxable: plan ? amount : 0,
    line11_current_income: plan ? thisYear : 0,
    line13_total_income: plan ? thisYear : 0,
    line14_plan_repayment: plan ? repayment : 0,
    line15_form1040_line5b: plan ? thisYear - repayment : 0,
    line20_ira_qualified: plan ? 0 : amount,
    line21_ira_taxable: plan ? 0 : amount,
    line22_current_ira_income: plan ? 0 : thisYear,
    line24_total_ira_income: plan ? 0 : thisYear,
    line25_ira_repayment: plan ? 0 : repayment,
    line26_form1040_line4b: plan ? 0 : thisYear - repayment,
  } as const;
}

export function verifyCurrentYearDistributionSource(
  raw: Form8915FItem,
  pending1099R: unknown,
  filer: FilerIdentity | undefined,
): { planGross: number; iraGross: number } {
  const item = itemSchema.parse(raw);
  const expectedSSN = item.owner === "T"
    ? filer?.primarySSN
    : filer?.spouse?.ssn;
  if (
    expectedSSN?.replaceAll("-", "") !== item.recipient_ssn
  ) {
    throw new Error("Form 8915-F recipient must match the filer or spouse");
  }
  const parsed = f1099rInputSchema.safeParse(pending1099R);
  const matches = parsed.success
    ? parsed.data.f1099rs.filter((source) =>
      source.source_document_reference ===
        item.source_1099r_document_reference &&
      source.payer_ein.replaceAll("-", "") ===
        item.source_1099r_payer_ein &&
      source.account_number === item.source_1099r_account_number &&
      (source.ts ?? "T") === item.owner &&
      source.box13_date_of_payment === item.distribution_date &&
      source.box1_gross_distribution === item.gross_distribution &&
      source.box2a_taxable_amount === item.taxable_distribution &&
      source.form8915f_treatment ===
        (item.full_inclusion_elected ? "full" : "three_years") &&
      (source.form8915f_repayment_amount ?? 0) ===
        (item.repayment.kind === "timely" ? item.repayment.amount : 0) &&
      (source.box7_ira_simple_indicator === true) ===
        (item.retirement_source_kind === "traditional_ira") &&
      ["1", "2", "7"].includes(source.box7_distribution_code) &&
      source.exclude_4972 !== true &&
      source.exclude_8606_roth !== true &&
      source.rollover_code === undefined &&
      source.ira_rollover === undefined &&
      (source.prior_ira_basis ?? 0) === 0 &&
      source.box11_first_year_roth === undefined &&
      source.qcd_full !== true &&
      (source.qcd_partial_amount ?? 0) === 0 &&
      (source.pso_premium ?? 0) === 0 &&
      source.simplified_method_flag !== true &&
      source.disability_as_wages !== true &&
      source.altered_or_handwritten !== true &&
      source.nonstandard_document_review === undefined &&
      source.no_distribution_received !== true
    )
    : [];
  if (matches.length !== 1 || !parsed.success) {
    throw new Error(
      "Form 8915-F needs one matching fully taxable Form 1099-R source",
    );
  }
  const other = parsed.data.f1099rs.filter((source) => source !== matches[0]);
  if (
    other.length > 1 ||
    (other.length === 0) !==
      (item.other_distribution_nonqualified_review_reference === undefined) ||
    other.some((source) =>
      (source.ts ?? "T") !== item.owner ||
      source.form8915f_treatment !== undefined ||
      source.form8915f_repayment_amount !== undefined ||
      source.box1_gross_distribution !== source.box2a_taxable_amount ||
      source.box7_distribution_code !== "7" ||
      source.exclude_4972 === true ||
      source.exclude_8606_roth === true ||
      source.rollover_code !== undefined ||
      source.ira_rollover !== undefined ||
      (source.prior_ira_basis ?? 0) !== 0 ||
      source.box11_first_year_roth !== undefined ||
      source.qcd_full === true ||
      (source.qcd_partial_amount ?? 0) !== 0 ||
      (source.pso_premium ?? 0) !== 0 ||
      source.simplified_method_flag === true ||
      source.disability_as_wages === true ||
      source.altered_or_handwritten === true ||
      source.nonstandard_document_review !== undefined ||
      source.no_distribution_received === true
    )
  ) {
    throw new Error(
      "Form 8915-F other Form 1099-R needs one reviewed ordinary nonqualified distribution",
    );
  }
  return {
    planGross: other[0]?.box7_ira_simple_indicator === true
      ? 0
      : (other[0]?.box1_gross_distribution ?? 0),
    iraGross: other[0]?.box7_ira_simple_indicator === true
      ? other[0].box1_gross_distribution
      : 0,
  };
}

/** Prevent a linked 1099-R from reducing taxable income without its form. */
export function assertForm8915FSourceLinks(
  pending: Readonly<Record<string, unknown>>,
): void {
  const source = f1099rInputSchema.safeParse(pending.f1099r);
  if (!source.success) {
    const raw = pending.f1099r as { f1099rs?: unknown } | undefined;
    if (
      Array.isArray(raw?.f1099rs) &&
      raw.f1099rs.some((item) =>
        item !== null && typeof item === "object" &&
        "form8915f_treatment" in item
      )
    ) {
      throw new Error("Form 1099-R Form 8915-F treatment has invalid source");
    }
    return;
  }
  const linked = source.data.f1099rs.filter((item) =>
    item.form8915f_treatment !== undefined
  );
  if (linked.length === 0) return;
  const form = inputSchema.safeParse(pending.f8915f);
  if (
    !form.success ||
    form.data.f8915fs?.length !== linked.length
  ) {
    throw new Error(
      "Form 1099-R Form 8915-F treatment needs one matching Form 8915-F",
    );
  }
}

class F8915FNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8915f";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    if ((input.f8915fs?.length ?? 0) > 0) {
      for (const group of distributionOwnerGroups(input.f8915fs!)) {
        currentYearDistributionGroupLines(group, { planGross: 0, iraGross: 0 });
      }
    }
    return { outputs: [] };
  }
}

export const f8915f = new F8915FNode();

/** One annual election and $22,000 limit per owner; every issued source stays distinct. */
export function distributionOwnerGroups(items: readonly Form8915FItem[]) {
  const references = items.map((i) => i.source_1099r_document_reference);
  const accounts = items.map((i) =>
    `${i.owner}:${i.source_1099r_payer_ein}:${i.source_1099r_account_number}`
  );
  const repayments = items.flatMap((i) =>
    i.repayment.kind === "timely"
      ? [i.repayment.repayment_record_reference]
      : []
  );
  if (
    new Set(references).size !== references.length ||
    new Set(accounts).size !== accounts.length ||
    new Set(repayments).size !== repayments.length
  ) {
    throw new Error(
      "Form 8915-F inventory repeats an issued account, source or repayment",
    );
  }
  const filings = items.flatMap((i) =>
    i.repayment.kind === "timely"
      ? [
        JSON.stringify([
          i.repayment.return_filing_date,
          i.repayment.filing_deadline,
        ]),
      ]
      : []
  );
  if (new Set(filings).size > 1) {
    throw new Error(
      "Form 8915-F repayments disagree on the return filing/deadline",
    );
  }
  return (["T", "S"] as const).flatMap((owner) => {
    const group = items.filter((i) => i.owner === owner);
    if (!group.length) return [];
    const first = group[0];
    const key = (i: Form8915FItem) =>
      JSON.stringify([
        i.recipient_ssn,
        i.fema_number,
        i.disaster_begin_date,
        i.disaster_declaration_date,
        i.full_inclusion_elected,
      ]);
    if (
      group.some((i) => key(i) !== key(first)) ||
      group.reduce((n, i) => n + i.gross_distribution, 0) > 22_000
    ) {
      throw new Error(
        "Form 8915-F owner needs one consistent disaster/election and a combined amount within $22,000",
      );
    }
    return [group];
  });
}

export function currentYearDistributionGroupLines(
  items: readonly Form8915FItem[],
  other: { planGross: number; iraGross: number },
) {
  const first = items[0];
  if (!first || distributionOwnerGroups(items).length !== 1) {
    throw new Error("Form 8915-F calculation needs one owner group");
  }
  const plan = items.filter((i) => i.retirement_source_kind === "plan");
  const ira = items.filter((i) =>
    i.retirement_source_kind === "traditional_ira"
  );
  const gross = (rows: readonly Form8915FItem[]) =>
    rows.reduce((n, i) => n + i.gross_distribution, 0);
  const repaid = (rows: readonly Form8915FItem[]) =>
    rows.reduce(
      (n, i) => n + (i.repayment.kind === "timely" ? i.repayment.amount : 0),
      0,
    );
  const planAmount = gross(plan), iraAmount = gross(ira);
  const planIncome = first.full_inclusion_elected
    ? planAmount
    : Math.round(planAmount / 3);
  const iraIncome = first.full_inclusion_elected
    ? iraAmount
    : Math.round(iraAmount / 3);
  if (repaid(plan) > planIncome || repaid(ira) > iraIncome) {
    throw new Error(
      "Form 8915-F grouped repayments need later-year/carryback allocation",
    );
  }
  return {
    line1e_available: 22_000,
    line2a_plan_distributions: planAmount + other.planGross,
    line2b_qualified_plan_distributions: planAmount,
    line3a_ira_distributions: iraAmount + other.iraGross,
    line3b_qualified_ira_distributions: iraAmount,
    line5a_nonqualified_distributions: other.planGross + other.iraGross,
    line5b_qualified_distributions: planAmount + iraAmount,
    line6_total_qualified: planAmount + iraAmount,
    line8_plan_qualified: planAmount,
    line9_cost: 0,
    line10_taxable: planAmount,
    line11_current_income: planIncome,
    line13_total_income: planIncome,
    line14_plan_repayment: repaid(plan),
    line15_form1040_line5b: planIncome - repaid(plan),
    line20_ira_qualified: iraAmount,
    line21_ira_taxable: iraAmount,
    line22_current_ira_income: iraIncome,
    line24_total_ira_income: iraIncome,
    line25_ira_repayment: repaid(ira),
    line26_form1040_line4b: iraIncome - repaid(ira),
  };
}

/** Validate the complete current return, not a projection with the other owner's sources removed. */
export function verifyGroupedDistributionSources(
  raw: readonly Form8915FItem[],
  pending1099R: unknown,
  filer: FilerIdentity | undefined,
) {
  const items = inputSchema.parse({ f8915fs: raw }).f8915fs!;
  const source = f1099rInputSchema.parse(pending1099R);
  const refs = source.f1099rs.map((r) => r.source_document_reference);
  const accounts = source.f1099rs.map((r) =>
    r.account_number
      ? `${r.ts ?? "T"}:${r.payer_ein.replace(/\D/g, "")}:${r.account_number}`
      : undefined
  );
  if (accounts.some((a) => !a) || new Set(accounts).size !== accounts.length) {
    throw new Error(
      "Form 8915-F inventory requires distinct issued retirement accounts",
    );
  }
  if (refs.some((r) => !r) || new Set(refs).size !== refs.length) {
    throw new Error(
      "Form 8915-F needs unique issued Form 1099-R references for every source",
    );
  }
  const expected = (owner: "T" | "S") =>
    owner === "T"
      ? filer?.primarySSN
      : filer?.filingStatus === 2
      ? filer.spouse?.ssn
      : undefined;
  for (const r of source.f1099rs) {
    if (
      !r.recipient_ssn ||
      r.recipient_ssn.replace(/\D/g, "") !==
        expected(r.ts ?? "T")?.replace(/\D/g, "")
    ) {
      throw new Error(
        "Form 8915-F source recipient conflicts with the current return owner",
      );
    }
  }
  for (const item of items) {
    const match = source.f1099rs.filter((r) =>
      r.source_document_reference === item.source_1099r_document_reference
    );
    // Reuse the single-source qualification checks after selecting the complete issued record.
    verifyCurrentYearDistributionSource(
      { ...item, other_distribution_nonqualified_review_reference: undefined },
      { f1099rs: match },
      filer,
    );
    if (item.recipient_ssn !== expected(item.owner)?.replace(/\D/g, "")) {
      throw new Error(
        "Form 8915-F owner requires the matching current joint return",
      );
    }
  }
  const qualifiedRefs = new Set(
    items.map((i) => i.source_1099r_document_reference),
  );
  const ordinary = source.f1099rs.filter((r) =>
    !qualifiedRefs.has(r.source_document_reference!)
  );
  if (ordinary.some((r) => r.form8915f_treatment !== undefined)) {
    throw new Error(
      "Form 8915-F inventory omits a linked qualified distribution",
    );
  }
  const groups = distributionOwnerGroups(items).map((group) => {
    const ownOther = ordinary.filter((r) => (r.ts ?? "T") === group[0].owner);
    if (
      group.some((i) =>
        (ownOther.length > 0) !==
          (i.other_distribution_nonqualified_review_reference !== undefined)
      )
    ) {
      throw new Error(
        "Form 8915-F ordinary inventory needs every qualified source's nonqualified review",
      );
    }
    for (const r of ownOther) {
      const q = source.f1099rs.find((r) =>
        r.source_document_reference === group[0].source_1099r_document_reference
      )!;
      verifyCurrentYearDistributionSource(group[0], { f1099rs: [q, r] }, filer);
    }
    const other = {
      planGross: ownOther.filter((r) => !r.box7_ira_simple_indicator).reduce(
        (n, r) => n + r.box1_gross_distribution,
        0,
      ),
      iraGross: ownOther.filter((r) => r.box7_ira_simple_indicator).reduce(
        (n, r) => n + r.box1_gross_distribution,
        0,
      ),
    };
    return {
      items: group,
      first: group[0],
      other,
      lines: currentYearDistributionGroupLines(group, other),
    };
  });
  // An unclaimed owner's ordinary distributions still need an explicit reviewed route.
  if (
    ordinary.some((r) => !groups.some((g) => g.first.owner === (r.ts ?? "T")))
  ) {
    throw new Error(
      "Form 8915-F other-owner retirement income needs its reviewed allocation route",
    );
  }
  return groups;
}
