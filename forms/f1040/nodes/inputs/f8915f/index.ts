import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
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
      kind: z.literal("same_year"),
      amount: z.number().int().positive(),
      date: dateSchema,
      receiving_plan_review_reference: referenceSchema,
      repayment_record_reference: referenceSchema,
    }).strict(),
  ]),
  source_1099r_document_reference: referenceSchema,
  source_1099r_payer_ein: z.string().regex(/^\d{9}$/),
  source_1099r_account_number: referenceSchema,
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
  if (item.repayment.kind === "same_year") {
    const currentIncome = item.full_inclusion_elected
      ? item.gross_distribution
      : Math.round(item.gross_distribution / 3);
    if (
      item.repayment.date.slice(0, 4) !== "2025" ||
      item.repayment.date < item.distribution_date ||
      item.repayment.amount > currentIncome
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repayment"],
        message:
          "Form 8915-F same-year repayment must follow the distribution and fit current-year income",
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
  f8915fs: z.array(itemSchema).max(1).optional(),
}).strict();

export type Form8915FItem = z.infer<typeof itemSchema>;

/** First-year values shared by MeF, PDF and Form 1040 reconciliation. */
export function currentYearDistributionLines(raw: Form8915FItem) {
  const item = itemSchema.parse(raw);
  const amount = item.gross_distribution;
  const plan = item.retirement_source_kind === "plan";
  const thisYear = item.full_inclusion_elected
    ? amount
    : Math.round(amount / 3);
  const repayment = item.repayment.kind === "same_year"
    ? item.repayment.amount
    : 0;
  return {
    line1e_available: 22_000,
    line2a_plan_distributions: plan ? amount : 0,
    line2b_qualified_plan_distributions: plan ? amount : 0,
    line3a_ira_distributions: plan ? 0 : amount,
    line3b_qualified_ira_distributions: plan ? 0 : amount,
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
): void {
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
        (item.repayment.kind === "same_year" ? item.repayment.amount : 0) &&
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
      source.no_distribution_received !== true
    )
    : [];
  if (
    matches.length !== 1 ||
    (parsed.success && parsed.data.f1099rs.length !== 1)
  ) {
    throw new Error(
      "Form 8915-F needs one matching fully taxable Form 1099-R source",
    );
  }
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
    linked.length !== 1 || !form.success ||
    form.data.f8915fs?.length !== 1
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
      currentYearDistributionLines(input.f8915fs![0]);
    }
    return { outputs: [] };
  }
}

export const f8915f = new F8915FNode();
