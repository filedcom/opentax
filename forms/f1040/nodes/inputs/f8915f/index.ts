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

/** One 2025 disaster, one fully taxable non-IRA distribution, one 1099-R. */
export const itemSchema = z.object({
  owner: z.enum(["T", "S"]),
  recipient_ssn: z.string().regex(/^\d{9}$/),
  fema_number: z.string().regex(/^DR-\d{4}-[A-Z]{2}$/),
  disaster_begin_date: dateSchema,
  disaster_declaration_date: dateSchema,
  distribution_date: dateSchema,
  qualified_area_home_review_reference: referenceSchema,
  economic_loss_review_reference: referenceSchema,
  eligible_plan_review_reference: referenceSchema,
  no_prior_distributions_review_reference: referenceSchema,
  no_repayments_review_reference: referenceSchema,
  source_1099r_document_reference: referenceSchema,
  source_1099r_payer_ein: z.string().regex(/^\d{9}$/),
  source_1099r_account_number: referenceSchema,
  gross_distribution: z.number().int().positive().max(22_000),
  taxable_distribution: z.number().int().positive().max(22_000),
  full_inclusion_elected: z.literal(true),
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
        "Form 8915-F full-inclusion path needs a fully taxable distribution",
    });
  }
});

export const inputSchema = z.object({
  f8915fs: z.array(itemSchema).max(1).optional(),
}).strict();

export type Form8915FItem = z.infer<typeof itemSchema>;

/** Values shared by the future MeF, PDF and Form 1040 reconciliation. */
export function currentYearPlanLines(raw: Form8915FItem) {
  const item = itemSchema.parse(raw);
  const amount = item.gross_distribution;
  return {
    line1e_available: 22_000,
    line2a_plan_distributions: amount,
    line2b_qualified_plan_distributions: amount,
    line5b_qualified_distributions: amount,
    line6_total_qualified: amount,
    line8_plan_qualified: amount,
    line9_cost: 0,
    line10_taxable: amount,
    line11_current_income: amount,
    line13_total_income: amount,
    line15_form1040_line5b: amount,
  } as const;
}

export function verifyCurrentYearPlanSource(
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
      source.box7_ira_simple_indicator !== true &&
      ["2", "7"].includes(source.box7_distribution_code) &&
      source.exclude_4972 !== true &&
      source.exclude_8606_roth !== true &&
      source.rollover_code === undefined &&
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
      "Form 8915-F needs one matching fully taxable non-IRA Form 1099-R source",
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
      // The pending source is not a filed route until Form 8915-F and the
      // matched 1099-R/1040/PDF documents can be emitted together.
      currentYearPlanLines(input.f8915fs![0]);
      throw new Error(
        "TY2025 Form 8915-F needs its source-matched native and PDF filing route",
      );
    }
    return { outputs: [] };
  }
}

export const f8915f = new F8915FNode();
