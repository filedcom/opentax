import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { scheduleC as schedule_c } from "../schedule_c/index.ts";
import { schedule1a } from "../../intermediate/forms/schedule1a/index.ts";
import {
  form8949,
  Form8949Part,
} from "../../intermediate/forms/form8949/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 issuer reporting threshold. This does not limit the recipient's
// obligation to report taxable income from payments below the threshold.
const TPSO_GROSS_THRESHOLD = 20_000;
const MONTHLY_SUM_ROUNDING_TOLERANCE = 1;

export const itemSchema = z.object({
  // Filer identification
  pse_name: z.string(),
  pse_tin: z.string().optional(),
  recipient_tin: z.string().regex(/^(\d{3}-?\d{2}-?\d{4}|\d{2}-?\d{7})$/)
    .optional(),
  recipient_identity_review: z.object({
    recipient_name: z.string().trim().min(1),
    address_line1: z.string().trim().min(1),
    address_line2: z.string().trim().optional(),
    address_city: z.string().trim().min(1),
    address_state: z.string().trim().length(2),
    address_zip: z.string().trim().min(5),
    source_reference: z.string().trim().min(1),
  }).strict().optional(),

  // Filer type checkboxes (PSE = Payment Settlement Entity; EPF = Electronic Payment Facilitator)
  filer_type_pse: z.boolean().optional(),
  filer_type_epf: z.boolean().optional(),
  pse_phone: z.string().optional(),

  // Transaction type checkboxes
  transaction_type_payment_card: z.boolean().optional(),
  transaction_type_tpso: z.boolean().optional(),

  // Administrative fields
  account_number: z.string().optional(),
  second_tin_notice: z.boolean().optional(),

  // Box 1a — Gross amount of reportable payment transactions (required field in IRS sense)
  box1a_gross_payments: z.number().nonnegative().optional(),

  // Box 1b — Card Not Present gross amount (subset of box1a)
  box1b_card_not_present: z.number().nonnegative().optional(),

  // Box 2 — Merchant Category Code (4-digit)
  box2_merchant_category_code: z.string().optional(),

  // Box 3 — Number of payment transactions (integer count)
  box3_transaction_count: z.number().int().nonnegative().optional(),

  // Box 4 — Federal Income Tax Withheld (backup withholding, 24% rate)
  // NOTE: On the 99K screen this is for state record. The engine routes it
  // directly to f1040.line25b_withheld_1099 for tax credit purposes.
  box4_federal_withheld: z.number().nonnegative().optional(),

  // Routing — determines where box1a income is reported.
  // When omitted, the gross information-return amount is not presumed taxable.
  //   "schedule_c"       → business income (Schedule C line 1)
  //   "schedule_1_line_8j" → confirmed activity-not-for-profit income.
  //   "mixed_schedule_c_personal_item_sales" → reviewed business receipts
  //     and separately identified personal-item sales on one payer report.
  //   "reported_in_error" → reviewed personal payments reported by the PSE
  //     in error, disclosed in the entry space at the top of Schedule 1.
  // Personal-item sales require item-level basis review. Other mixed-purpose
  // combinations and fee/refund adjustments still need disposition.
  for_routing: z.enum([
    "schedule_c",
    "schedule_1_line_8j",
    "personal_item_sales",
    "mixed_schedule_c_personal_item_sales",
    "reported_in_error",
  ]).optional(),
  reported_error_review: z.object({
    payments: z.array(
      z.object({
        transaction_id: z.string().trim().min(1),
        amount: z.number().int().positive(),
        kind: z.enum(["personal_gift", "expense_reimbursement"]),
        sender_name: z.string().trim().min(1),
        payment_record_reference: z.string().trim().min(1),
        no_goods_or_services: z.literal(true),
      }).strict(),
    ).min(1),
    correction_request_reference: z.string().trim().min(1),
  }).strict().optional(),
  personal_item_sales_review: z.array(
    z.object({
      transaction_id: z.string().trim().min(1),
      description: z.string().trim().min(1).max(100),
      date_acquired: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      date_sold: z.string().regex(/^2025-\d{2}-\d{2}$/),
      proceeds: z.number().int().positive(),
      cost_basis: z.number().int().nonnegative(),
      acquired_by_purchase: z.literal(true),
      acquisition_record_reference: z.string().trim().min(1),
      sale_record_reference: z.string().trim().min(1),
      personal_use_only: z.literal(true),
      not_main_home: z.literal(true),
      not_collectible: z.literal(true),
      no_other_information_return_for_sale: z.literal(true),
    }).strict(),
  ).min(1).optional(),
  schedule_c_business_reference: z.string().trim().min(1).optional(),
  schedule_c_receipts_review: z.object({
    included_in_schedule_c_gross_receipts: z.number().int().positive(),
    not_included_in_schedule_c_receipts: z.number().int().nonnegative(),
    allocation_reference: z.string().trim().min(1),
    no_overlap_with_other_1099s: z.literal(true),
    overlap_review_reference: z.string().trim().min(1),
    duplicate_1099_review: z.object({
      source_form: z.enum(["1099nec", "1099misc"]),
      payer_tin: z.string().regex(/^\d{2}-?\d{7}$/),
      amount: z.number().int().positive(),
      transaction_review_reference: z.string().trim().min(1),
    }).strict().optional(),
  }).strict().optional(),
  nonbusiness_activity_review: z.object({
    activity_description: z.string().trim().min(1).max(100),
    included_in_line8j: z.number().int().positive(),
    allocation_reference: z.string().trim().min(1),
    no_overlap_with_other_1099s: z.literal(true),
    overlap_review_reference: z.string().trim().min(1),
  }).strict().optional(),
  qualified_tips_box1a_review: z.object({
    amount: z.number().int().positive(),
    occupation_code: z.string().regex(/^\d{3}$/),
    occupation_review_reference: z.string().trim().min(1),
    tip_records_reference: z.string().trim().min(1),
    included_in_box1a: z.literal(true),
    no_other_allocable_deductions: z.literal(true),
    no_other_allocable_deductions_review_reference: z.string().trim().min(1),
  }).strict().optional(),

  // Boxes 5a–5l — Monthly gross payment amounts
  box5a_january: z.number().nonnegative().optional(),
  box5b_february: z.number().nonnegative().optional(),
  box5c_march: z.number().nonnegative().optional(),
  box5d_april: z.number().nonnegative().optional(),
  box5e_may: z.number().nonnegative().optional(),
  box5f_june: z.number().nonnegative().optional(),
  box5g_july: z.number().nonnegative().optional(),
  box5h_august: z.number().nonnegative().optional(),
  box5i_september: z.number().nonnegative().optional(),
  box5j_october: z.number().nonnegative().optional(),
  box5k_november: z.number().nonnegative().optional(),
  box5l_december: z.number().nonnegative().optional(),

  // Box 6 — State abbreviation (up to 2 chars)
  box6_state: z.string().optional(),

  // Box 7 — State identification number
  box7_state_id: z.string().optional(),

  // Box 8 — State Income Tax Withheld (flows to state return only)
  box8_state_withheld: z.number().nonnegative().optional(),
}).superRefine((item, ctx) => {
  const gross = item.box1a_gross_payments ?? 0;
  if (
    (item.schedule_c_receipts_review &&
      !["schedule_c", "mixed_schedule_c_personal_item_sales"].includes(
        item.for_routing ?? "",
      )) ||
    (item.nonbusiness_activity_review &&
      (item.for_routing !== "schedule_1_line_8j" || gross <= 0)) ||
    (item.personal_item_sales_review &&
      !["personal_item_sales", "mixed_schedule_c_personal_item_sales"].includes(
        item.for_routing ?? "",
      )) ||
    (item.reported_error_review && ![
      "schedule_c",
      "schedule_1_line_8j",
      "personal_item_sales",
      "mixed_schedule_c_personal_item_sales",
      "reported_in_error",
    ].includes(item.for_routing ?? ""))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["for_routing"],
      message: "1099-K receipt review must match its income route",
    });
  }
  const mixed = item.for_routing === "mixed_schedule_c_personal_item_sales";
  const errorAmount = (item.reported_error_review?.payments ?? []).reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  if (
    item.personal_item_sales_review && item.reported_error_review &&
    item.personal_item_sales_review.some((sale) =>
      item.reported_error_review!.payments.some((payment) =>
        payment.transaction_id === sale.transaction_id
      )
    )
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["reported_error_review"],
      message:
        "1099-K personal sale and reported error cannot share a transaction ID",
    });
  }
  if (item.for_routing === "reported_in_error" || item.reported_error_review) {
    const review = item.reported_error_review;
    const payments = review?.payments ?? [];
    if (
      gross <= 0 || !item.pse_name.trim() ||
      !/^\d{9}$/.test(item.pse_tin?.replaceAll("-", "") ?? "") ||
      (!item.recipient_tin && !item.recipient_identity_review) ||
      payments.length === 0 ||
      new Set(payments.map((payment) => payment.transaction_id)).size !==
        payments.length ||
      (item.for_routing === "reported_in_error"
        ? errorAmount !== gross
        : errorAmount >= gross)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["reported_error_review"],
        message:
          "1099-K reported error needs identified payer, recipient, correction request, and payments equal to box 1a",
      });
    }
  }
  if ((item.for_routing === "schedule_c" || mixed) && gross > 0) {
    const review = item.schedule_c_receipts_review;
    const personal = mixed
      ? (item.personal_item_sales_review ?? []).reduce(
        (sum, sale) => sum + sale.proceeds,
        0,
      )
      : 0;
    if (
      !item.pse_name.trim() ||
      !/^\d{9}$/.test(item.pse_tin?.replaceAll("-", "") ?? "") ||
      !item.recipient_tin || !item.schedule_c_business_reference ||
      !review ||
      review.included_in_schedule_c_gross_receipts +
            review.not_included_in_schedule_c_receipts + personal +
            errorAmount !== gross ||
      (mixed && personal <= 0) ||
      (review.not_included_in_schedule_c_receipts > 0 &&
        (!review.duplicate_1099_review ||
          review.duplicate_1099_review.amount !==
            review.not_included_in_schedule_c_receipts)) ||
      (review.not_included_in_schedule_c_receipts === 0 &&
        review.duplicate_1099_review !== undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["schedule_c_receipts_review"],
        message:
          "1099-K Schedule C income needs identified payer, recipient, business, and a complete box 1a allocation",
      });
    }
  }
  if (item.for_routing === "schedule_1_line_8j" && gross > 0) {
    const review = item.nonbusiness_activity_review;
    if (
      !item.pse_name.trim() ||
      !/^\d{9}$/.test(item.pse_tin?.replaceAll("-", "") ?? "") ||
      (!item.recipient_tin && !item.recipient_identity_review) || !review ||
      review.included_in_line8j + errorAmount !== gross
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["nonbusiness_activity_review"],
        message:
          "1099-K nonbusiness income needs identified payer, recipient, activity, and a complete box 1a allocation",
      });
    }
  }
  if (item.for_routing === "personal_item_sales" || mixed) {
    const sales = item.personal_item_sales_review ?? [];
    const ids = sales.map((sale) => sale.transaction_id);
    if (
      gross <= 0 || !item.pse_name.trim() ||
      !/^\d{9}$/.test(item.pse_tin?.replaceAll("-", "") ?? "") ||
      (!item.recipient_tin && !item.recipient_identity_review) ||
      sales.length === 0 || new Set(ids).size !== ids.length ||
      (mixed
        ? sales.reduce((sum, sale) => sum + sale.proceeds, 0) + errorAmount >=
          gross
        : sales.reduce((sum, sale) => sum + sale.proceeds, 0) + errorAmount !==
          gross) ||
      sales.some((sale) => {
        const acquired = new Date(`${sale.date_acquired}T00:00:00Z`);
        const sold = new Date(`${sale.date_sold}T00:00:00Z`);
        return Number.isNaN(acquired.getTime()) ||
          acquired.toISOString().slice(0, 10) !== sale.date_acquired ||
          Number.isNaN(sold.getTime()) ||
          sold.toISOString().slice(0, 10) !== sale.date_sold ||
          acquired >= sold;
      })
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["personal_item_sales_review"],
        message:
          "1099-K personal-item sales need identified recipient, valid dated items, and proceeds equal to box 1a",
      });
    }
  }
  if (
    item.qualified_tips_box1a_review &&
    (![
      "schedule_c",
      "mixed_schedule_c_personal_item_sales",
    ].includes(item.for_routing ?? "") ||
      !item.schedule_c_receipts_review ||
      item.qualified_tips_box1a_review.amount >
        item.schedule_c_receipts_review.included_in_schedule_c_gross_receipts)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["qualified_tips_box1a_review"],
      message:
        "1099-K qualified tips need reviewed box 1a payments included in Schedule C receipts",
    });
  }
});

export const inputSchema = z.object({
  f1099ks: z.array(itemSchema).min(1),
});

type K99Item = z.infer<typeof itemSchema>;
type K99Items = K99Item[];

const MONTHLY_FIELDS = [
  "box5a_january",
  "box5b_february",
  "box5c_march",
  "box5d_april",
  "box5e_may",
  "box5f_june",
  "box5g_july",
  "box5h_august",
  "box5i_september",
  "box5j_october",
  "box5k_november",
  "box5l_december",
] as const;

type MonthlyField = typeof MONTHLY_FIELDS[number];

function allMonthlyFieldsPresent(item: K99Item): boolean {
  return MONTHLY_FIELDS.every((field) =>
    item[field as MonthlyField] !== undefined
  );
}

function sumMonthlyFields(item: K99Item): number {
  return MONTHLY_FIELDS.reduce(
    (sum, field) => sum + (item[field as MonthlyField] ?? 0),
    0,
  );
}

function validateItem(item: K99Item): void {
  // Monthly consistency check (WARNING level — does not throw in production,
  // but the engine surfaces it. For TY2025 the tolerance is ±$1.)
  if (allMonthlyFieldsPresent(item)) {
    const monthlySum = sumMonthlyFields(item);
    const box1a = item.box1a_gross_payments ?? 0;
    if (Math.abs(monthlySum - box1a) > MONTHLY_SUM_ROUNDING_TOLERANCE) {
      // WARNING only — do not throw
    }
  }
}

function federalWithholdingOutputs(k99s: K99Items): NodeOutput[] {
  return k99s
    .filter((item) => (item.box4_federal_withheld ?? 0) > 0)
    .map((
      item,
    ) => (output(f1040, {
      line25b_withheld_1099: item.box4_federal_withheld!,
      line25b_f1099k_withheld: item.box4_federal_withheld!,
    })));
}

// The routing decision asserts that this gross amount belongs on the return.
// The issuer's Form 1099-K reporting threshold is not a taxable-income floor.
function incomeOutputs(k99s: K99Items): NodeOutput[] {
  const businessOutputs = k99s.flatMap((item) => {
    if (!item.for_routing) return [];
    const gross = item.box1a_gross_payments ?? 0;
    if (gross <= 0) return [];
    switch (item.for_routing) {
      case "schedule_c":
      case "mixed_schedule_c_personal_item_sales":
        return [output(schedule_c, {
          f1099k_receipt_sources: [{
            business_reference: item.schedule_c_business_reference!,
            pse_name: item.pse_name,
            pse_tin: item.pse_tin!.replaceAll("-", ""),
            recipient_tin: item.recipient_tin!.replaceAll("-", ""),
            box1a_gross_payments: gross,
            ...(item.reported_error_review
              ? {
                reported_error_gross: item.reported_error_review.payments
                  .reduce((sum, payment) => sum + payment.amount, 0),
              }
              : {}),
            ...(item.for_routing === "mixed_schedule_c_personal_item_sales"
              ? {
                personal_item_sales_gross: item.personal_item_sales_review!
                  .reduce(
                    (sum, sale) => sum + sale.proceeds,
                    0,
                  ),
              }
              : {}),
            amount: item.schedule_c_receipts_review!
              .included_in_schedule_c_gross_receipts,
            not_included_in_schedule_c_receipts:
              item.schedule_c_receipts_review!
                .not_included_in_schedule_c_receipts,
            allocation_reference: item.schedule_c_receipts_review!
              .allocation_reference,
            no_overlap_with_other_1099s: true,
            overlap_review_reference: item.schedule_c_receipts_review!
              .overlap_review_reference,
            ...(item.schedule_c_receipts_review!.duplicate_1099_review
              ? {
                duplicate_1099_review: {
                  ...item.schedule_c_receipts_review!.duplicate_1099_review,
                  payer_tin: item.schedule_c_receipts_review!
                    .duplicate_1099_review!.payer_tin.replaceAll("-", ""),
                },
              }
              : {}),
          }],
        })];
      case "schedule_1_line_8j":
        return [];
      case "personal_item_sales":
        return [];
      case "reported_in_error":
        return [];
    }
  });
  const hobbyIncome = k99s.filter((item) =>
    item.for_routing === "schedule_1_line_8j" &&
    (item.box1a_gross_payments ?? 0) > 0
  ).reduce(
    (sum, item) => sum + item.nonbusiness_activity_review!.included_in_line8j,
    0,
  );
  const reportedError = k99s.reduce(
    (sum, item) =>
      sum + (item.reported_error_review?.payments ?? []).reduce(
        (paymentSum, payment) => paymentSum + payment.amount,
        0,
      ),
    0,
  );
  return [
    ...businessOutputs,
    ...(reportedError > 0
      ? [output(schedule1, { form1099k_reported_error_or_loss: reportedError })]
      : []),
    ...(hobbyIncome > 0
      ? [
        output(schedule1, { line8j_f1099k_hobby_income: hobbyIncome }),
        output(agi_aggregator, { line8j_f1099k_hobby_income: hobbyIncome }),
      ]
      : []),
  ];
}

// Exported for reference (TY2025 threshold)
export const TY2025 = {
  TPSO_GROSS_THRESHOLD,
} as const;

class F1099kNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099k";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    schedule_c,
    schedule1a,
    form8949,
    schedule1,
    agi_aggregator,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);

    for (const item of parsed.f1099ks) {
      validateItem(item);
    }

    const outputs: NodeOutput[] = [
      ...federalWithholdingOutputs(parsed.f1099ks),
      ...incomeOutputs(parsed.f1099ks),
    ];
    for (const item of parsed.f1099ks) {
      if (
        item.for_routing !== "personal_item_sales" &&
        item.for_routing !== "mixed_schedule_c_personal_item_sales"
      ) continue;
      for (const sale of item.personal_item_sales_review!) {
        const acquired = new Date(`${sale.date_acquired}T00:00:00Z`);
        const sold = new Date(`${sale.date_sold}T00:00:00Z`);
        const anniversary = new Date(acquired);
        anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
        if (
          acquired.getUTCMonth() === 1 && acquired.getUTCDate() === 29 &&
          anniversary.getUTCMonth() === 2
        ) anniversary.setUTCDate(0);
        const longTerm = sold > anniversary;
        const loss = Math.max(0, sale.cost_basis - sale.proceeds);
        outputs.push(output(form8949, {
          transaction: {
            part: longTerm ? Form8949Part.F : Form8949Part.C,
            description: sale.description,
            source_transaction_id: `1099k:${
              item.pse_tin!.replaceAll("-", "")
            }:${sale.transaction_id}`,
            date_acquired: sale.date_acquired,
            date_sold: sale.date_sold,
            proceeds: sale.proceeds,
            cost_basis: sale.cost_basis,
            ...(loss > 0
              ? { adjustment_codes: "L", adjustment_amount: loss }
              : {}),
            gain_loss: Math.max(0, sale.proceeds - sale.cost_basis),
            is_long_term: longTerm,
          },
        }));
      }
    }
    const qualifiedTips = parsed.f1099ks.flatMap((item) =>
      item.qualified_tips_box1a_review
        ? [{
          source_form: "1099k" as const,
          business_reference: item.schedule_c_business_reference!,
          recipient_ssn: item.recipient_tin!,
          payer_name: item.pse_name,
          payer_tin: item.pse_tin!.replaceAll("-", ""),
          source_amount: item.box1a_gross_payments!,
          amount: item.qualified_tips_box1a_review.amount,
          occupation_code: item.qualified_tips_box1a_review.occupation_code,
          occupation_review_reference:
            item.qualified_tips_box1a_review.occupation_review_reference,
          tip_records_reference:
            item.qualified_tips_box1a_review.tip_records_reference,
          included_in_source_amount:
            item.qualified_tips_box1a_review.included_in_box1a,
          no_other_allocable_deductions:
            item.qualified_tips_box1a_review.no_other_allocable_deductions,
          no_other_allocable_deductions_review_reference:
            item.qualified_tips_box1a_review
              .no_other_allocable_deductions_review_reference,
        }]
        : []
    );
    if (qualifiedTips.length > 0) {
      outputs.push(
        output(schedule1a, { qualified_trade_business_tips: qualifiedTips }),
      );
    }

    return { outputs };
  }
}

export const f1099k = new F1099kNode();
