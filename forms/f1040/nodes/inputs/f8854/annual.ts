import { z } from "zod";
import {
  dateSchema,
  ExpatriateType,
  partISchema,
  taxStatus2025Schema,
} from "./index.ts";
import { ReportedFormCode } from "./section-c.ts";

const documentId = z.string().regex(/^[A-Za-z0-9:.\-]{1,30}$/);
const dollars = z.number().int().nonnegative().refine(
  Number.isSafeInteger,
  "Annual Form 8854 amounts must be safe whole dollars",
);
const positiveDollars = dollars.refine((amount) => amount > 0);
const cents = z.number().finite().nonnegative().refine(
  (amount) =>
    Number.isSafeInteger(Math.round(amount * 100)) &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
  "Annual Form 8854 distributions must have safe cent precision",
);
const positiveCents = cents.refine((amount) => amount > 0);
const annualDate = dateSchema.refine(
  (date) => date.startsWith("2025-"),
  "Annual Form 8854 distribution or disposition date must be in 2025",
);

const distributionSchema = z.object({
  distribution_date: annualDate,
  gross_distribution_amount: positiveCents,
  amount_includible_if_us_resident: cents,
  tax_withheld_amount: cents,
  source_document_id: documentId,
}).strict().superRefine((distribution, ctx) => {
  if (
    distribution.amount_includible_if_us_resident >
      distribution.gross_distribution_amount
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Includible distribution cannot exceed the gross distribution",
      path: ["amount_includible_if_us_resident"],
    });
  }
});

const source1042SSchema = z.object({
  document_id: documentId,
  income_code: z.enum(["38", "39"]),
  payer_name: z.string().trim().min(1),
  gross_income_amount: positiveDollars,
  federal_tax_withheld_amount: dollars,
}).strict();

function roundedDistributionAmount(values: readonly number[]): number {
  const cents = values.reduce(
    (total, value) => total + BigInt(Math.round(value * 100)),
    0n,
  );
  const dollars = (cents + 50n) / 100n;
  if (dollars > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Annual Form 8854 distribution total exceeds safe dollars");
  }
  return Number(dollars);
}

const deferredPropertySchema = z.object({
  item_id: z.string().trim().min(1),
  description: z.string().trim().min(1),
  prior_form8854_document_id: documentId,
  prior_mark_to_market_gain_or_loss_amount: dollars,
  prior_deferred_tax_amount: positiveDollars,
  disposition: z.discriminatedUnion("disposed_in_2025", [
    z.object({ disposed_in_2025: z.literal(false) }).strict(),
    z.object({
      disposed_in_2025: z.literal(true),
      entire_deferred_property_disposed_confirmed: z.literal(true),
      disposition_date: annualDate,
      reported_form_code: z.nativeEnum(ReportedFormCode),
      reported_transaction_id: z.string().trim().min(1),
      actual_sale_proceeds: dollars,
      adjusted_basis_at_disposition: dollars,
      actual_sale_adjustment_codes: z.string().trim().min(1).optional(),
      actual_sale_adjustment_amount: z.number().int().refine(
        Number.isSafeInteger,
      ).optional(),
      deferred_tax_paid_amount: positiveDollars,
      interest_paid_amount: positiveCents,
      payment_date: dateSchema,
      payment_by_unextended_due_date_confirmed: z.literal(true),
      payment_confirmation_attachment_file_name: z.string().trim().min(1),
    }).strict(),
  ]).superRefine((disposition, ctx) => {
    if (!disposition.disposed_in_2025) return;
    if (
      (disposition.actual_sale_adjustment_codes === undefined) !==
        (disposition.actual_sale_adjustment_amount === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Annual Form 8854 sale adjustment needs both code and amount",
        path: ["actual_sale_adjustment_amount"],
      });
    }
    if (disposition.payment_date < disposition.disposition_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deferred-tax payment cannot predate the disposition",
        path: ["payment_date"],
      });
    }
  }),
}).strict().superRefine((property, ctx) => {
  if (
    property.disposition.disposed_in_2025 &&
    property.disposition.deferred_tax_paid_amount !==
      property.prior_deferred_tax_amount
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Fully disposed Form 8854 property must pay its prior deferred tax",
      path: ["disposition", "deferred_tax_paid_amount"],
    });
  }
});

const annualItemSchema = z.object({
  item_id: z.string().trim().min(1),
  description: z.string().trim().min(1),
  prior_form8854_document_id: documentId,
  distributions: z.array(distributionSchema),
}).strict();

const annualEligibleCompensationSchema = annualItemSchema.extend({
  irrevocable_treaty_reduction_waiver_confirmed: z.literal(true),
}).strict();

const annualTrustSchema = annualItemSchema.extend({
  no_prior_full_value_election_confirmed: z.literal(true),
  treaty_reduction_waiver_confirmed: z.literal(true),
}).strict();

export const annualInputSchema = z.object({
  expatriation_date: dateSchema.refine(
    (date) => date >= "2008-06-17" && date < "2025-01-01",
    "2025 annual Form 8854 covers expatriation from June 17, 2008 through 2024",
  ),
  expatriate_type: z.nativeEnum(ExpatriateType),
  part_i: partISchema,
  tax_status_2025: taxStatus2025Schema,
  prior_form8854_obligations_confirmed_complete: z.literal(true),
  original_form8854_mailed_confirmed: z.literal(true),
  attached_form8854_copy_marked_copy_confirmed: z.literal(true),
  source_1042s: z.array(source1042SSchema),
  deferred_properties: z.array(deferredPropertySchema).max(20),
  eligible_deferred_compensation_items: z.array(
    annualEligibleCompensationSchema,
  )
    .max(1000),
  nongrantor_trust_interests: z.array(annualTrustSchema).max(1000),
}).strict().superRefine((input, ctx) => {
  const citizen = input.expatriate_type === ExpatriateType.CITIZEN;
  if (
    citizen !== (input.part_i.notification.kind === "CITIZEN_STATE_DEPARTMENT")
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Annual Form 8854 notification must match expatriate status",
      path: ["part_i", "notification"],
    });
  }
  if (input.part_i.notification.date !== input.expatriation_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Annual Part I notification must match the expatriation date",
      path: ["part_i", "notification", "date"],
    });
  }
  if (
    citizen && (!input.part_i.us_citizenship_acquisition ||
      !input.part_i.citizenships.some((row) => row.country_code === "US"))
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Former citizens need U.S. citizenship details in Part I",
      path: ["part_i", "citizenships"],
    });
  }
  if (
    !citizen &&
    (input.part_i.us_citizenship_acquisition ||
      !input.part_i.lawful_permanent_resident_date)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Former long-term residents need lawful-resident details",
      path: ["part_i", "lawful_permanent_resident_date"],
    });
  }
  const itemGroups = [
    ...input.deferred_properties,
    ...input.eligible_deferred_compensation_items,
    ...input.nongrantor_trust_interests,
  ];
  if (itemGroups.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Annual Form 8854 needs a deferred property, eligible compensation item, or nongrantor trust",
      path: ["deferred_properties"],
    });
  }
  if (
    new Set(itemGroups.map((row) => row.item_id)).size !== itemGroups.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Annual Form 8854 item IDs must be unique",
      path: ["deferred_properties"],
    });
  }
  const dispositionTransactionIds = input.deferred_properties.flatMap(
    (property) =>
      property.disposition.disposed_in_2025
        ? [property.disposition.reported_transaction_id]
        : [],
  );
  if (
    new Set(dispositionTransactionIds).size !== dispositionTransactionIds.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Annual Form 8854 disposition transaction IDs must be unique",
      path: ["deferred_properties"],
    });
  }
  if (
    new Set(input.source_1042s.map((source) => source.document_id)).size !==
      input.source_1042s.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Annual Form 8854 source Form 1042-S IDs must be unique",
      path: ["source_1042s"],
    });
  }
  const reportedDistributions = [
    ...input.eligible_deferred_compensation_items.flatMap((item) =>
      item.distributions.map((distribution) => ({
        incomeCode: "38",
        distribution,
      }))
    ),
    ...input.nongrantor_trust_interests.flatMap((item) =>
      item.distributions.map((distribution) => ({
        incomeCode: "39",
        distribution,
      }))
    ),
  ];
  if (
    input.tax_status_2025 === "FULL_YEAR_US_CITIZEN_OR_RESIDENT" &&
    reportedDistributions.length > 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 1042-S code 38/39 payments cannot use the covered-expatriate withholding route during a full-year U.S. citizen or resident period",
      path: ["tax_status_2025"],
    });
  }
  for (
    const [incomeCode, key] of [
      ["38", "eligible_deferred_compensation_items"],
      ["39", "nongrantor_trust_interests"],
    ] as const
  ) {
    const sourceCount = new Set(
      reportedDistributions.filter((row) => row.incomeCode === incomeCode)
        .map((row) => row.distribution.source_document_id),
    ).size;
    if (sourceCount > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Annual Form 8854 MeF permits at most three Form 1042-S source groups per category",
        path: [key],
      });
    }
  }
  for (const [index, source] of input.source_1042s.entries()) {
    const rows = reportedDistributions.filter((row) =>
      row.distribution.source_document_id === source.document_id
    );
    if (
      rows.length === 0 ||
      rows.some((row) => row.incomeCode !== source.income_code)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Form 1042-S income code must match its annual Form 8854 distributions",
        path: ["source_1042s", index, "income_code"],
      });
      continue;
    }
    if (
      roundedDistributionAmount(
          rows.map((row) => row.distribution.amount_includible_if_us_resident),
        ) !== source.gross_income_amount ||
      roundedDistributionAmount(
          rows.map((row) => row.distribution.tax_withheld_amount),
        ) !== source.federal_tax_withheld_amount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Annual Form 8854 distribution and withholding must match Form 1042-S",
        path: ["source_1042s", index],
      });
    }
  }
  for (const row of reportedDistributions) {
    if (
      !input.source_1042s.some((source) =>
        source.document_id === row.distribution.source_document_id &&
        source.income_code === row.incomeCode
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Annual Form 8854 distribution needs matching Form 1042-S source",
        path: ["source_1042s"],
      });
    }
  }
});

export type F8854AnnualInput = z.infer<typeof annualInputSchema>;
