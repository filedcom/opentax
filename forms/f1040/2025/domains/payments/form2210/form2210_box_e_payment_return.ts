import { z } from "zod";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { form2210BoxEInputSchema } from "./form2210_box_e.ts";
import { stageForm2210BoxEPage1 } from "./form2210_box_e_staged_chain.ts";
import {
  calculateForm2210Payments,
  compareForm2210WithholdingMethods,
  form2210PaymentInputSchema,
} from "./form2210_payments.ts";

const paymentLedgerSchema = form2210PaymentInputSchema
  .omit({
    tax_year: true,
    taxpayer_ssn: true,
    required_annual_payment_dollars: true,
    required_payment_workpaper_reference: true,
    withholding: true,
  }).extend({
    withholding_review: form2210PaymentInputSchema.shape.withholding.omit({
      amount_dollars: true,
    }),
  });
export const form2210BoxEPaymentLedgerSchema = paymentLedgerSchema.extend({
  withholding_method: z.literal("equal_due_dates"),
});
export const form2210BoxEActualWithholdingLedgerSchema = paymentLedgerSchema
  .extend({
    withholding_method: z.literal("actual_dates"),
  });

const enteredClaim = z.object({
  box_e_source: form2210BoxEInputSchema,
  joint_filing_status_change: z.literal(true).optional(),
}).strict();
const identitySchema = z.object({
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/),
});

/** Public calculation → finalized lines → retained prior bytes → payment
 * worksheet. No native/PDF registry uses this staging API. Prior acceptance
 * and payment authenticity remain unverified; no line 38 is inserted. */
async function stagePaymentContext(
  rawReturnInputs: Readonly<Record<string, unknown>>,
  rawPaymentLedger: unknown,
  priorReturnDocuments: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
  actualWithholding: boolean,
) {
  // Snapshot before the first await, so source bytes and facts cannot change
  // while digest verification is in progress.
  const inputs = structuredClone(rawReturnInputs);
  const claim = (actualWithholding
    ? enteredClaim.extend({
      actual_withholding_dates_method: z.literal(true),
    })
    : enteredClaim).parse(inputs.f2210);
  const ledger =
    (actualWithholding
      ? form2210BoxEActualWithholdingLedgerSchema
      : form2210BoxEPaymentLedgerSchema).parse(rawPaymentLedger);
  const documents = priorReturnDocuments.map((document) => ({
    reference: document.reference,
    bytes: new Uint8Array(document.bytes),
  }));
  const execution = f1040_2025.executeReturn(inputs);
  if (execution.diagnostics.length > 0) {
    throw new Error(
      "Form 2210 payment staging needs a successful public return",
    );
  }
  const pending = normalizeAllPending(execution.pending);
  const general = pending.general;
  if (general?.filing_status !== "mfj") {
    throw new Error(
      "Form 2210 box E payment staging needs the actual joint return",
    );
  }
  const identity = identitySchema.parse({
    taxpayer_ssn: String(general.taxpayer_ssn ?? "").replaceAll("-", ""),
    spouse_ssn: String(general.spouse_ssn ?? "").replaceAll("-", ""),
  });
  const page1 = await stageForm2210BoxEPage1(
    claim.box_e_source,
    identity,
    documents,
    pending.f1040,
  );
  const { withholding_review, ...payments } = ledger;
  const worksheetSource = {
    ...payments,
    tax_year: 2025,
    taxpayer_ssn: identity.taxpayer_ssn,
    required_annual_payment_dollars: page1.filed_lines.line9,
    required_payment_workpaper_reference:
      claim.box_e_source.current_return_reference,
    withholding: {
      ...withholding_review,
      amount_dollars: page1.filed_lines.line6,
    },
  };
  return { page1, currentForm1040: pending.f1040, worksheetSource };
}

export async function stageForm2210BoxEPaymentReturn(
  rawReturnInputs: Readonly<Record<string, unknown>>,
  rawPaymentLedger: unknown,
  priorReturnDocuments: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
) {
  const { page1, currentForm1040, worksheetSource } = await stagePaymentContext(
    rawReturnInputs,
    rawPaymentLedger,
    priorReturnDocuments,
    false,
  );
  const worksheet = calculateForm2210Payments(worksheetSource);
  return {
    ...page1,
    current_form1040: currentForm1040,
    payment_worksheet: {
      ...worksheet,
      requiredAnnualPaymentReconciled: true as const,
      withholdingReconciled: true as const,
    },
    filingReady: false as const,
    priorAcceptanceVerified: false as const,
    paymentAuthenticityVerified: false as const,
  };
}

/** Simultaneous boxes D/E source calculation only. No partial page-1 XML/PDF
 * is returned as a box-D filing document; full Part III export remains open. */
export async function stageForm2210BoxEActualWithholdingReturn(
  rawReturnInputs: Readonly<Record<string, unknown>>,
  rawPaymentLedger: unknown,
  priorReturnDocuments: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
) {
  const { page1, currentForm1040, worksheetSource } = await stagePaymentContext(
    rawReturnInputs,
    rawPaymentLedger,
    priorReturnDocuments,
    true,
  );
  const comparison = compareForm2210WithholdingMethods(worksheetSource);
  if (!comparison.box_d_reduces_penalty) {
    throw new Error(
      "Form 2210 box D needs actual withholding to reduce the penalty",
    );
  }
  return {
    filed_lines: page1.filed_lines,
    current_form1040: currentForm1040,
    reasons: { box_d: true as const, box_e: true as const },
    actual_payment_worksheet: {
      ...comparison.actual,
      requiredAnnualPaymentReconciled: true as const,
      withholdingReconciled: true as const,
    },
    equal_payment_worksheet: {
      ...comparison.equal,
      requiredAnnualPaymentReconciled: true as const,
      withholdingReconciled: true as const,
    },
    filingReady: false as const,
    priorAcceptanceVerified: false as const,
    paymentAuthenticityVerified: false as const,
  };
}
