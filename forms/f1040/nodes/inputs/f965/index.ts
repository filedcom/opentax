import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";

// Form 965-A is a cumulative report, not just a current-year installment.
// A 2017 inclusion's regular eighth installment was in 2024. A payment on
// that liability in 2025 must be sourced as an actual payment, not inferred
// from the eight-year percentage schedule.

const amount = z.number().finite().nonnegative();
const signedAmount = z.number().finite();
const year = z.number().int().min(2017).max(2025);
const taxId = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ein"), value: z.string().regex(/^\d{9}$/) }),
  z.object({ kind: z.literal("ssn"), value: z.string().regex(/^\d{9}$/) }),
]);
const agreementFileName = z.string().max(64).regex(
  /^(?!.*\.\.)[A-Za-z0-9_.-]+\.pdf$/,
);
function validIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

const transferAgreementSchema = z.object({
  agreement_type: z.enum(["965-C", "965-D", "965-E"]),
  file_name: agreementFileName,
  signed_pdf_base64: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/),
  source_document_reference: z.string().trim().min(1),
});

export const sCorpCalculationSchema = z.object({
  inclusion_year: z.number().int().min(2017).max(2020),
  source_document_reference: z.string().trim().min(1),
  corporation_name: z.string().trim().min(1),
  corporation_ein: z.string().regex(/^\d{9}$/),
  net_tax_with_965: amount,
  net_tax_without_965: amount,
  deferral_election: z.boolean(),
}).refine((row) => row.net_tax_with_965 >= row.net_tax_without_965, {
  message:
    "Form 965-A Part III net tax with section 965 cannot be less than tax without it",
});

export const sCorpDeferredRowSchema = z.object({
  election_or_transfer_year: year,
  source_document_reference: z.string().trim().min(1),
  corporation_name: z.string().trim().min(1),
  corporation_ein: z.string().regex(/^\d{9}$/),
  beginning_deferred_liability: amount,
  triggered_liability: amount,
  transferred_liability: signedAmount,
  counterparty_tax_id: taxId.optional(),
  transfer_agreement_links: z.array(z.object({
    counterparty_tax_id: taxId,
    file_name: agreementFileName,
  })).optional(),
  multiple_transferees: z.array(z.object({
    tax_id: taxId,
    transferred_amount: amount.positive(),
  })).min(2).optional(),
}).superRefine((row, ctx) => {
  if (row.transferred_liability !== 0 && !row.counterparty_tax_id) {
    ctx.addIssue({
      code: "custom",
      message: "Form 965-A Part IV transfer needs the counterparty tax ID",
    });
  }
  if (
    row.transferred_liability > 0 &&
    (row.beginning_deferred_liability !== 0 || row.triggered_liability !== 0)
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 965-A transfer-in row must leave beginning and triggered liability blank",
    });
  }
  if (row.transferred_liability !== 0) {
    const counterparties = row.multiple_transferees?.map((item) =>
      item.tax_id
    ) ??
      (row.counterparty_tax_id ? [row.counterparty_tax_id] : []);
    const links = row.transfer_agreement_links ?? [];
    const taxIdKey = (id: z.infer<typeof taxId>) => `${id.kind}:${id.value}`;
    if (
      links.length !== counterparties.length ||
      new Set(counterparties.map(taxIdKey)).size !== counterparties.length ||
      new Set(links.map((link) => link.file_name)).size !== links.length ||
      new Set(links.map((link) => taxIdKey(link.counterparty_tax_id))).size !==
        links.length ||
      links.some((link) =>
        !counterparties.some((id) =>
          taxIdKey(id) === taxIdKey(link.counterparty_tax_id)
        )
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Form 965-D needs one distinct signed agreement for each transfer counterparty",
      });
    }
  } else if (row.transfer_agreement_links?.length) {
    ctx.addIssue({
      code: "custom",
      message: "Form 965-D agreements require a Part IV transfer",
    });
  }
  if (
    row.beginning_deferred_liability -
        row.triggered_liability + row.transferred_liability < 0
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 965-A Part IV ending deferred liability cannot be negative",
    });
  }
  if (row.multiple_transferees) {
    const total = row.multiple_transferees.reduce(
      (sum, transferee) => sum + transferee.transferred_amount,
      0,
    );
    if (
      row.transferred_liability >= 0 ||
      Math.abs(total + row.transferred_liability) > 0.005 ||
      !row.counterparty_tax_id ||
      !row.multiple_transferees.some((transferee) =>
        transferee.tax_id.kind === row.counterparty_tax_id?.kind &&
        transferee.tax_id.value === row.counterparty_tax_id?.value
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Form 965-A multiple transferees must reconcile to Part IV transfer and listed counterparty",
      });
    }
  }
});

const common = z.object({
  source_document_reference: z.string().trim().min(1),
  // Original/assumed rows: inclusion-liability year. Triggered S-corp rows:
  // triggering-event year reported in Part I column (a), not the original
  // S-corporation deferral year still carried in Part IV column (a).
  tax_year_of_inclusion: year,
  // Part I col (j): signed transfer or subsequent adjustment.
  net_tax_adjustment: signedAmount,
  transfer_agreement_file_name: agreementFileName.optional(),
  net_tax_adjustment_kind: z.enum([
    "subsequent_adjustment",
    "transfer_out",
    "netted_adjustment_and_transfer",
  ]).optional(),
  netted_adjustment_and_transfer: z.object({
    adjustment_amount: signedAmount,
    transferred_out_amount: z.number().finite().negative(),
    explanation: z.string().trim().min(1).max(9000),
    source_document_reference: z.string().trim().min(1),
  }).optional(),
  counterparty_tax_id: taxId.optional(),
  // Part II cols (b)-(i), cumulative actual payments on installments 1-8.
  paid_by_installment_year: z.array(amount).length(8),
  // Part II col (k), actual payments during this reporting year only.
  current_year_payment: amount,
  current_year_payment_reference: z.string().trim().min(1).optional(),
});

const originalLiability = common.extend({
  entry_type: z.literal("original"),
  installment_election: z.boolean(),
  net_tax_with_965: amount,
  net_tax_without_965: amount,
});
const assumedLiability = common.extend({
  entry_type: z.literal("assumed"),
  assumed_liability: amount.positive(),
  counterparty_tax_id: taxId,
});
const triggeredLiability = common.extend({
  entry_type: z.literal("triggered_s_corp"),
  triggering_event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  installment_election: z.boolean(),
  triggered_liability: amount.positive(),
  requires_965e_consent: z.boolean(),
  consent_agreement_file_name: agreementFileName.optional(),
  separate_965h_election_reference: z.string().trim().min(1).optional(),
});

export const itemSchema = z.discriminatedUnion("entry_type", [
  originalLiability,
  assumedLiability,
  triggeredLiability,
]);

export const inputSchema = z.object({
  reporting_year: year,
  amended_report: z.boolean(),
  f965s: z.array(itemSchema).min(1).max(28),
  s_corp_calculations: z.array(sCorpCalculationSchema),
  s_corp_deferred_rows: z.array(sCorpDeferredRowSchema),
  transfer_agreements: z.array(transferAgreementSchema),
}).superRefine((input, ctx) => {
  const agreementFiles = new Set<string>();
  for (const [index, agreement] of input.transfer_agreements.entries()) {
    if (agreementFiles.has(agreement.file_name)) {
      ctx.addIssue({
        code: "custom",
        path: ["transfer_agreements", index],
        message: "Form 965-A transfer agreement file names must be unique",
      });
    }
    agreementFiles.add(agreement.file_name);
  }
  const agreementMatches = (
    fileName: string | undefined,
    type: "965-C" | "965-D" | "965-E",
  ) =>
    fileName !== undefined &&
    input.transfer_agreements.some((agreement) =>
      agreement.file_name === fileName && agreement.agreement_type === type
    );
  const triggeredInPartI = input.f965s
    .filter((row) => row.entry_type === "triggered_s_corp")
    .reduce((sum, row) => sum + row.triggered_liability, 0);
  const triggeredInPartIV = input.s_corp_deferred_rows.reduce(
    (sum, row) => sum + row.triggered_liability,
    0,
  );
  if (Math.abs(triggeredInPartI - triggeredInPartIV) > 0.005) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 965-A triggered S corporation liability must match Parts I and IV",
    });
  }
  for (
    const corp of input.s_corp_calculations.filter((row) =>
      row.deferral_election
    )
  ) {
    if (
      !input.s_corp_deferred_rows.some((row) =>
        row.corporation_ein === corp.corporation_ein
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Form 965-A elected S corporation deferral needs its Part IV annual row",
      });
    }
  }
  for (const [index, row] of input.f965s.entries()) {
    if (
      row.entry_type === "triggered_s_corp" &&
      (!validIsoDate(row.triggering_event_date) ||
        Number(row.triggering_event_date.slice(0, 4)) !==
          row.tax_year_of_inclusion)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index, "triggering_event_date"],
        message:
          "Form 965-A Part I year must match the S corporation triggering event date",
      });
    }
    if (
      (row.entry_type === "assumed" ||
        row.net_tax_adjustment_kind === "transfer_out" ||
        row.net_tax_adjustment_kind === "netted_adjustment_and_transfer") &&
      !agreementMatches(row.transfer_agreement_file_name, "965-C")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index],
        message:
          "Form 965-A installment transfer needs the signed Form 965-C copy",
      });
    }
    if (
      row.entry_type === "triggered_s_corp" &&
      row.requires_965e_consent &&
      !agreementMatches(row.consent_agreement_file_name, "965-E")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index],
        message:
          "Form 965-A consent-triggered installment needs the signed Form 965-E copy",
      });
    }
    if (
      row.entry_type === "triggered_s_corp" &&
      row.requires_965e_consent &&
      (!row.installment_election || !row.separate_965h_election_reference)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index],
        message:
          "Form 965-E consent does not replace the separate section 965(h) election",
      });
    }
    if (
      row.entry_type === "triggered_s_corp" &&
      !row.requires_965e_consent && row.consent_agreement_file_name
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index],
        message:
          "Form 965-E consent copy requires a consent-triggered installment",
      });
    }
    if (
      row.entry_type !== "assumed" &&
      ((row.net_tax_adjustment !== 0 && !row.net_tax_adjustment_kind) ||
        (row.net_tax_adjustment === 0 &&
          row.net_tax_adjustment_kind !== undefined &&
          row.net_tax_adjustment_kind !== "netted_adjustment_and_transfer"))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index],
        message:
          "Form 965-A Part I column j needs an explicit adjustment or transfer kind",
      });
    }
    if (
      row.net_tax_adjustment_kind === "transfer_out" &&
      (row.net_tax_adjustment >= 0 || !row.counterparty_tax_id)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index],
        message:
          "Form 965-A transferred-out liability needs a negative amount and transferee tax ID",
      });
    }
    if (row.net_tax_adjustment_kind === "netted_adjustment_and_transfer") {
      const details = row.netted_adjustment_and_transfer;
      if (
        !details || !row.counterparty_tax_id ||
        Math.abs(
            details.adjustment_amount + details.transferred_out_amount -
              row.net_tax_adjustment,
          ) > 0.005
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["f965s", index],
          message:
            "Form 965-A netted adjustment and transfer need reconciling statement facts",
        });
      }
    } else if (row.netted_adjustment_and_transfer) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index],
        message:
          "Form 965-A netted statement facts require a netted column j transaction",
      });
    }
    if (row.tax_year_of_inclusion > input.reporting_year) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index],
        message: "Form 965-A liability year cannot follow the reporting year",
      });
    }
    if (
      row.entry_type === "assumed" &&
      (row.net_tax_adjustment !== 0 || row.net_tax_adjustment_kind)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index],
        message:
          "Assumed liability belongs in Part I column j without a second adjustment",
      });
    }
    if (row.current_year_payment > 0 && !row.current_year_payment_reference) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index],
        message:
          "Form 965-A reporting-year payment needs its payment-record reference",
      });
    }
    const deferred = input.s_corp_calculations
      .filter((corp) =>
        corp.inclusion_year === row.tax_year_of_inclusion &&
        corp.deferral_election
      )
      .reduce(
        (sum, corp) => sum + corp.net_tax_with_965 - corp.net_tax_without_965,
        0,
      );
    const base = row.entry_type === "original"
      ? row.net_tax_with_965 - row.net_tax_without_965 - deferred
      : row.entry_type === "triggered_s_corp"
      ? row.triggered_liability
      : 0;
    const adjustment = row.entry_type === "assumed"
      ? row.assumed_liability
      : row.net_tax_adjustment;
    const paid = row.paid_by_installment_year.reduce(
      (sum, payment) => sum + payment,
      0,
    );
    if (base < 0 || base + adjustment - paid < -0.005) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index],
        message:
          "Form 965-A liability, deferral, adjustment, and cumulative payments do not reconcile",
      });
    }
    if (row.current_year_payment - paid > 0.005) {
      ctx.addIssue({
        code: "custom",
        path: ["f965s", index],
        message: "Reporting-year payment exceeds cumulative actual payments",
      });
    }
  }
  input.s_corp_deferred_rows.forEach((row, index) => {
    if (
      row.transferred_liability !== 0 &&
      row.transfer_agreement_links?.some((link) =>
        !agreementMatches(link.file_name, "965-D")
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["s_corp_deferred_rows", index],
        message:
          "Form 965-A S corporation transfer needs the signed Form 965-D copy",
      });
    }
  });
  const referencedAgreements = new Set([
    ...input.f965s.flatMap((row) => [
      row.transfer_agreement_file_name,
      row.entry_type === "triggered_s_corp" && row.requires_965e_consent
        ? row.consent_agreement_file_name
        : undefined,
    ]),
    ...input.s_corp_deferred_rows.flatMap((row) =>
      row.transferred_liability !== 0
        ? (row.transfer_agreement_links ?? []).map((link) => link.file_name)
        : []
    ),
  ].filter((name): name is string => name !== undefined));
  input.transfer_agreements.forEach((agreement, index) => {
    if (!referencedAgreements.has(agreement.file_name)) {
      ctx.addIssue({
        code: "custom",
        path: ["transfer_agreements", index],
        message:
          "Form 965-A agreement PDF is not linked to a transfer or consent",
      });
    }
  });
});

export type F965Input = z.infer<typeof inputSchema>;
export type F965Item = F965Input["f965s"][number];

export function deferredSCoTax(
  input: F965Input,
  inclusionYear: number,
): number {
  return input.s_corp_calculations
    .filter((row) =>
      row.inclusion_year === inclusionYear && row.deferral_election
    )
    .reduce(
      (sum, row) => sum + row.net_tax_with_965 - row.net_tax_without_965,
      0,
    );
}

export function eligibleLiability(input: F965Input, row: F965Item): number {
  if (row.entry_type === "original") {
    return row.net_tax_with_965 - row.net_tax_without_965 -
      deferredSCoTax(input, row.tax_year_of_inclusion);
  }
  return row.entry_type === "triggered_s_corp" ? row.triggered_liability : 0;
}

export function adjustedLiability(input: F965Input, row: F965Item): number {
  return eligibleLiability(input, row) +
    (row.entry_type === "assumed"
      ? row.assumed_liability
      : row.net_tax_adjustment);
}

export function unpaidLiability(input: F965Input, row: F965Item): number {
  return adjustedLiability(input, row) -
    row.paid_by_installment_year.reduce((sum, payment) => sum + payment, 0);
}

export function currentYear965Payment(input: F965Input): number {
  return input.f965s.reduce(
    (sum, row) => sum + row.current_year_payment,
    0,
  );
}

class F965Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f965";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(ctx: NodeContext, rawInput: F965Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.reporting_year !== ctx.taxYear) {
      throw new Error("Form 965-A reporting year must match the return year");
    }
    const payment = currentYear965Payment(input);
    return {
      outputs: payment > 0
        ? [output(schedule2, { line20_965_tax_installment: payment })]
        : [],
    };
  }
}

export const f965 = new F965Node();
