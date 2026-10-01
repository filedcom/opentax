import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";

// Form 3921 supplies the exercise-date spread. The extra facts establish the
// narrow Form 6251 line 2i case where that spread is recognized in this year.
export const itemSchema = z.object({
  source_document_reference: z.string().trim().min(1),
  corporation_name: z.string().trim().min(1),
  corporation_ein: z.string().regex(/^\d{2}-?\d{7}$/),
  employee_tin: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  box1_date_option_granted: z.string().date(),
  box2_date_option_exercised: z.string().date(),
  box3_exercise_price_per_share: z.number().finite().nonnegative(),
  box4_fmv_per_share: z.number().finite().nonnegative(),
  box5_shares_transferred: z.number().int().positive(),
  rights_transferable_and_not_subject_to_substantial_risk_on_exercise: z
    .literal(true),
  shares_disposed_during_exercise_year: z.literal(0),
  amount_paid_for_option: z.literal(0),
}).strict().superRefine((item, ctx) => {
  if (item.box1_date_option_granted >= item.box2_date_option_exercised) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box1_date_option_granted"],
      message: "Form 3921 option grant must precede its exercise",
    });
  }
});

export const inputSchema = z.object({ f3921s: z.array(itemSchema).min(1) })
  .superRefine(({ f3921s }, ctx) => {
    const references = new Set<string>();
    f3921s.forEach((item, index) => {
      if (references.has(item.source_document_reference)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["f3921s", index, "source_document_reference"],
          message: "The same issued Form 3921 copy cannot be entered twice",
        });
      }
      references.add(item.source_document_reference);
    });
  });

export interface IsoAmtBasisLot {
  readonly tax_year: 2025;
  readonly source_document_reference: string;
  readonly corporation_ein: string;
  readonly employee_tin: string;
  readonly exercise_date: string;
  readonly shares_remaining: number;
  readonly regular_basis_cents: number;
  readonly amt_adjustment_cents: number;
  readonly amt_basis_cents: number;
}

/** Retained 2025 exercise lots for a later-year regular/AMT basis comparison. */
export function buildIsoAmtBasisLedger(
  source: unknown,
): readonly IsoAmtBasisLot[] {
  const parsed = inputSchema.parse(source);
  return parsed.f3921s.map((item) => {
    if (!item.box2_date_option_exercised.startsWith("2025-")) {
      throw new Error("Form 3921 line 2i exercise must occur in 2025");
    }
    const regularBasisCents = Math.round(
      item.box3_exercise_price_per_share * item.box5_shares_transferred * 100,
    );
    const fairValueCents = Math.round(
      item.box4_fmv_per_share * item.box5_shares_transferred * 100,
    );
    if (
      !Number.isSafeInteger(regularBasisCents) ||
      !Number.isSafeInteger(fairValueCents)
    ) {
      throw new Error("Form 3921 ISO lot basis exceeds cent-precision range");
    }
    const adjustmentCents = Math.max(0, fairValueCents - regularBasisCents);
    return {
      tax_year: 2025 as const,
      source_document_reference: item.source_document_reference,
      corporation_ein: item.corporation_ein.replaceAll("-", ""),
      employee_tin: item.employee_tin.replaceAll("-", ""),
      exercise_date: item.box2_date_option_exercised,
      shares_remaining: item.box5_shares_transferred,
      regular_basis_cents: regularBasisCents,
      amt_adjustment_cents: adjustmentCents,
      amt_basis_cents: regularBasisCents + adjustmentCents,
    };
  });
}

function isoSpread(source: z.infer<typeof inputSchema>): number {
  const totalCents = buildIsoAmtBasisLedger(source).reduce(
    (sum, lot) => sum + lot.amt_adjustment_cents,
    0,
  );
  if (!Number.isSafeInteger(totalCents)) {
    throw new Error("Form 3921 line 2i total exceeds cent-precision range");
  }
  const adjustment = Math.round(totalCents / 100);
  if (!Number.isSafeInteger(adjustment)) {
    throw new Error("Form 3921 line 2i total exceeds whole-dollar range");
  }
  return adjustment;
}

export function assertForm3921IsoSource(
  source: unknown,
  claimedAdjustment: number,
  recipientTins: readonly string[],
): void {
  if (claimedAdjustment <= 0) return;
  if (source === undefined) {
    throw new Error("Form 6251 line 2i needs issued Form 3921 source copies");
  }
  const parsed = inputSchema.parse(source);
  const ledger = (source as { iso_amt_basis_ledger?: unknown })
    .iso_amt_basis_ledger;
  if (
    !Array.isArray(ledger) ||
    JSON.stringify(ledger) !== JSON.stringify(buildIsoAmtBasisLedger(parsed))
  ) {
    throw new Error(
      "Form 6251 line 2i needs its prepared Form 3921 AMT basis ledger",
    );
  }
  const allowed = new Set(recipientTins.map((tin) => tin.replaceAll("-", "")));
  if (
    parsed.f3921s.some((item) =>
      !allowed.has(item.employee_tin.replaceAll("-", ""))
    )
  ) {
    throw new Error(
      "Form 6251 line 2i Form 3921 employee must match the taxpayer or joint-filing spouse",
    );
  }
  if (isoSpread(parsed) !== claimedAdjustment) {
    throw new Error(
      "Form 6251 line 2i must equal the issued Form 3921 exercise spreads",
    );
  }
}

class F3921Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f3921";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form6251]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const parsed = inputSchema.parse(rawInput);
    const ledger = buildIsoAmtBasisLedger(parsed);
    const adjustment = isoSpread(parsed);
    return {
      outputs: [
        ...(adjustment > 0
          ? [this.outputNodes.output(form6251, { iso_adjustment: adjustment })]
          : []),
        { nodeType: this.nodeType, fields: { iso_amt_basis_ledger: ledger } },
      ],
    };
  }
}

export const f3921 = new F3921Node();
