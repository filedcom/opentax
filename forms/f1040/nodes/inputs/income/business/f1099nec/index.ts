import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../../outputs/general/return-assembly/f1040/index.ts";
import { schedule1 } from "../../../../outputs/general/return-assembly/schedule1/index.ts";
import { agi_aggregator } from "../../../../intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";
import { schedule2 } from "../../../../intermediate/aggregation/taxes/other/schedule2/index.ts";
import { scheduleC as schedule_c } from "../schedule_c/index.ts";
import { schedule1a } from "../../../../intermediate/forms/deductions/additional/schedule1a/index.ts";
import { schedule_f } from "../../../../intermediate/forms/income/business/schedule_f/index.ts";
import { form8919 } from "../../../../intermediate/forms/taxes/employment/form8919/index.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";

export const itemSchema = z.object({
  payer_name: z.string(),
  payer_tin: z.string(),
  recipient_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
  account_number: z.string().trim().min(1).optional(),
  source_document_reference: z.string().trim().min(1).optional(),
  box1_nec: z.number().nonnegative().optional(),
  box2_direct_sales: z.boolean().optional(),
  box3_golden_parachute: z.number().nonnegative().optional(),
  box4_federal_withheld: z.number().nonnegative().optional(),
  for_routing: z
    .enum(["schedule_c", "schedule_f", "form_8919", "schedule_1_line_8j"])
    .optional(),
  schedule_c_business_reference: z.string().trim().min(1).optional(),
  qualified_tips_review: z.object({
    amount: z.number().int().positive(),
    occupation_code: z.string().regex(/^\d{3}$/),
    occupation_review_reference: z.string().trim().min(1),
    tip_records_reference: z.string().trim().min(1),
    included_in_box1: z.literal(true),
    no_other_allocable_deductions: z.literal(true),
    allocable_health_plan_identifiers: z.array(z.string().trim().min(1)).max(1)
      .optional(),
    no_other_allocable_deductions_review_reference: z.string().trim().min(1),
  }).strict().optional(),
  nonbusiness_activity_description: z.string().trim().min(1).max(100)
    .optional(),
  farm_id: z.string().min(1).optional(),
}).superRefine((item, ctx) => {
  if (
    item.qualified_tips_review &&
    (item.for_routing !== "schedule_c" ||
      item.qualified_tips_review.amount > (item.box1_nec ?? 0))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["qualified_tips_review"],
      message:
        "1099-NEC qualified tips need Schedule C income included in box 1",
    });
  }
  if ((item.box3_golden_parachute ?? 0) > (item.box1_nec ?? 0)) {
    ctx.addIssue({
      code: "custom",
      path: ["box3_golden_parachute"],
      message: "1099-NEC box 3 excess must be included in box 1 compensation",
    });
  }
  if ((item.box4_federal_withheld ?? 0) > 0 && !item.recipient_ssn) {
    ctx.addIssue({
      code: "custom",
      path: ["recipient_ssn"],
      message: "1099-NEC box 4 withholding needs the issued recipient SSN",
    });
  }
  if (
    ((item.box1_nec ?? 0) > 0 || (item.box3_golden_parachute ?? 0) > 0 ||
      (item.box4_federal_withheld ?? 0) > 0) &&
    (!item.payer_name.trim() ||
      !/^\d{9}$/.test(item.payer_tin.replaceAll("-", "")))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["payer_tin"],
      message:
        "1099-NEC positive amounts need an identified payer name and TIN",
    });
  }
  if ((item.box1_nec ?? 0) <= 0) return;
  if (!item.for_routing) {
    ctx.addIssue({
      code: "custom",
      path: ["for_routing"],
      message: "Positive 1099-NEC box 1 needs an explicit income route",
    });
  }
  if (
    item.for_routing === "schedule_c" &&
    (!item.schedule_c_business_reference || !item.recipient_ssn)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["schedule_c_business_reference"],
      message: "1099-NEC Schedule C income needs a business and recipient TIN",
    });
  }
  if (
    item.for_routing === "schedule_f" &&
    (!item.farm_id || !item.recipient_ssn || !item.payer_name.trim() ||
      !/^\d{9}$/.test(item.payer_tin.replaceAll("-", "")))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["farm_id"],
      message:
        "1099-NEC farm income needs a farm, payer, and recipient identity",
    });
  }
  if (
    item.for_routing === "schedule_1_line_8j" &&
    (!item.recipient_ssn || !item.nonbusiness_activity_description ||
      !item.payer_name.trim() ||
      !/^\d{9}$/.test(item.payer_tin.replaceAll("-", "")))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["nonbusiness_activity_description"],
      message:
        "1099-NEC nonbusiness activity needs a description, recipient, and payer identity",
    });
  }
  if (
    item.for_routing === "schedule_c" &&
    (!item.payer_name.trim() ||
      !/^\d{9}$/.test(item.payer_tin.replaceAll("-", "")))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["payer_tin"],
      message:
        "1099-NEC Schedule C income needs a payer name and nine-digit TIN",
    });
  }
});

export const inputSchema = z.object({
  f1099necs: z.array(itemSchema).min(1),
});

type NECItem = z.infer<typeof itemSchema>;

/** One issued payer copy may contribute to the return only once. */
export function assertDistinct1099NecCopies(items: readonly NECItem[]): void {
  const seenReferences = new Set<string>();
  const seenAccounts = new Set<string>();
  const seenOwners = new Set<string>();
  const unidentifiedCopies = new Set<string>();
  for (const item of items) {
    const payer = item.payer_tin.replace(/\D/g, "");
    const recipient = item.recipient_ssn?.replace(/\D/g, "") ?? null;
    const account = item.account_number?.trim() ?? null;
    const owner = JSON.stringify([payer, recipient]);
    if (account) {
      const key = JSON.stringify([payer, recipient, account]);
      if (seenAccounts.has(key)) {
        throw new Error(
          "1099-NEC repeats the same payer, recipient, and account; corrected copies need one reviewed current row",
        );
      }
      seenAccounts.add(key);
    }
    if (item.source_document_reference) {
      const key = item.source_document_reference;
      if (seenReferences.has(key)) {
        throw new Error(
          "1099-NEC repeats the same issued-copy source reference; corrected copies need one reviewed current row",
        );
      }
      seenReferences.add(key);
    }
    if (
      (item.box1_nec ?? 0) <= 0 &&
      (item.box3_golden_parachute ?? 0) <= 0 &&
      (item.box4_federal_withheld ?? 0) <= 0
    ) continue;
    if (!account && !item.source_document_reference) {
      if (seenOwners.has(owner)) {
        throw new Error(
          "1099-NEC has multiple positive payer copies without account or issued source reference",
        );
      }
      unidentifiedCopies.add(owner);
    } else if (unidentifiedCopies.has(owner)) {
      throw new Error(
        "1099-NEC has multiple positive payer copies without account or issued source reference",
      );
    }
    seenOwners.add(owner);
  }
}

export function necBox3ExciseFromSources(
  source: unknown,
  recipientSsns: readonly string[],
): number {
  if (source === undefined) {
    throw new Error("Schedule 2 1099-NEC box 3 needs its payer source");
  }
  const items = inputSchema.parse(source).f1099necs;
  const allowed = new Set(recipientSsns.map((ssn) => ssn.replaceAll("-", "")));
  return items.reduce((tax, item) => {
    const excess = item.box3_golden_parachute ?? 0;
    if (excess <= 0) return tax;
    if (
      !item.recipient_ssn ||
      !allowed.has(item.recipient_ssn.replaceAll("-", ""))
    ) {
      throw new Error(
        "Schedule 2 1099-NEC box 3 recipient must match the taxpayer or joint-filing spouse",
      );
    }
    return tax + excess * 0.20;
  }, 0);
}

function necIncomeOutput(item: NECItem): NodeOutput[] {
  const box1 = item.box1_nec ?? 0;
  if (box1 <= 0) return [];
  switch (item.for_routing) {
    case "schedule_c":
      return [];
    case "schedule_f": {
      if (!item.farm_id) {
        throw new Error("1099-NEC farm income requires farm_id");
      }
      return [output(schedule_f, {
        farm_sources: [{
          farm_id: item.farm_id,
          kind: "1099nec_farm_income",
          amount: box1,
          payer_name: item.payer_name,
          payer_tin: item.payer_tin.replaceAll("-", ""),
          recipient_tin: item.recipient_ssn!.replaceAll("-", ""),
          ...(item.source_document_reference
            ? { source_document_reference: item.source_document_reference }
            : {}),
        }],
      })];
    }
    case "form_8919":
      if (!item.recipient_ssn) {
        throw new Error("1099-NEC routed to Form 8919 needs recipient_ssn");
      }
      return [output(form8919, {
        form1099_sources: [{
          kind: "1099nec",
          recipient_ssn: item.recipient_ssn,
          payer_name: item.payer_name,
          payer_tin: item.payer_tin,
          amount: box1,
        }],
      })];
    case "schedule_1_line_8j":
      return [];
    default:
      return [];
  }
}

function nonbusinessOtherIncome(items: readonly NECItem[]): number {
  return items.filter((item) => item.for_routing === "schedule_1_line_8j")
    .reduce((sum, item) => sum + (item.box1_nec ?? 0), 0);
}

class F1099necNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099nec";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_c,
    schedule1a,
    schedule_f,
    form8919,
    schedule1,
    agi_aggregator,
    schedule2,
    f1040,
  ]);

  processItem(item: NECItem): NodeOutput[] {
    const box3 = item.box3_golden_parachute ?? 0;
    const box4 = item.box4_federal_withheld ?? 0;
    return [
      ...necIncomeOutput(item),
      ...(box3 > 0
        ? [
          output(schedule2, { line17k_golden_parachute_excise: box3 * 0.20 }),
        ]
        : []),
      ...(box4 > 0 ? [output(f1040, { line25b_withheld_1099: box4 })] : []),
    ];
  }

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    assertDistinct1099NecCopies(parsed.f1099necs);
    const nonbusinessIncome = nonbusinessOtherIncome(parsed.f1099necs);
    const nonbusinessSources = parsed.f1099necs.flatMap((item) =>
      item.for_routing === "schedule_1_line_8j" &&
        (item.box1_nec ?? 0) > 0
        ? [{
          payer_name: item.payer_name,
          payer_tin: item.payer_tin.replaceAll("-", ""),
          recipient_tin: item.recipient_ssn!.replaceAll("-", ""),
          description: item.nonbusiness_activity_description!,
          amount: item.box1_nec!,
        }]
        : []
    );
    const scheduleCSources = parsed.f1099necs.flatMap((item) =>
      item.for_routing === "schedule_c" && (item.box1_nec ?? 0) > 0
        ? [{
          business_reference: item.schedule_c_business_reference!,
          payer_name: item.payer_name,
          payer_tin: item.payer_tin.replaceAll("-", ""),
          recipient_tin: item.recipient_ssn!.replaceAll("-", ""),
          amount: item.box1_nec!,
        }]
        : []
    );
    const qualifiedTips = parsed.f1099necs.flatMap((item) =>
      item.qualified_tips_review
        ? [{
          source_form: "1099nec" as const,
          business_reference: item.schedule_c_business_reference!,
          recipient_ssn: item.recipient_ssn!,
          payer_name: item.payer_name,
          payer_tin: item.payer_tin.replaceAll("-", ""),
          source_amount: item.box1_nec!,
          amount: item.qualified_tips_review.amount,
          occupation_code: item.qualified_tips_review.occupation_code,
          occupation_review_reference:
            item.qualified_tips_review.occupation_review_reference,
          tip_records_reference:
            item.qualified_tips_review.tip_records_reference,
          included_in_source_amount:
            item.qualified_tips_review.included_in_box1,
          no_other_allocable_deductions:
            item.qualified_tips_review.no_other_allocable_deductions,
          ...(item.qualified_tips_review.allocable_health_plan_identifiers !==
              undefined
            ? {
              allocable_health_plan_identifiers:
                item.qualified_tips_review.allocable_health_plan_identifiers,
            }
            : {}),
          no_other_allocable_deductions_review_reference:
            item.qualified_tips_review
              .no_other_allocable_deductions_review_reference,
        }]
        : []
    );
    return {
      outputs: [
        ...parsed.f1099necs.flatMap((item) => this.processItem(item)),
        ...(scheduleCSources.length > 0
          ? [output(schedule_c, { f1099nec_receipt_sources: scheduleCSources })]
          : []),
        ...(qualifiedTips.length > 0
          ? [
            output(schedule1a, {
              qualified_trade_business_tips: qualifiedTips,
            }),
          ]
          : []),
        ...(nonbusinessIncome > 0
          ? [
            output(schedule1, {
              f1099nec_nonbusiness_sources: nonbusinessSources,
            }),
            output(agi_aggregator, {
              line8j_f1099nec_nonbusiness: nonbusinessIncome,
            }),
          ]
          : []),
      ],
    };
  }
}

export const f1099nec = new F1099necNode();
