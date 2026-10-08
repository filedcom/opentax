import { z } from "zod";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { form2210BoxEInputSchema } from "./form2210_box_e.ts";
import { stageForm2210BoxEPage1 } from "./form2210_box_e_staged_chain.ts";
import {
  calculateForm2210Payments,
  form2210PaymentInputSchema,
} from "./form2210_payments.ts";

export const form2210BoxEPaymentLedgerSchema = form2210PaymentInputSchema
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
export async function stageForm2210BoxEPaymentReturn(
  rawReturnInputs: Readonly<Record<string, unknown>>,
  rawPaymentLedger: unknown,
  priorReturnDocuments: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
) {
  // Snapshot before the first await, so source bytes and facts cannot change
  // while digest verification is in progress.
  const inputs = structuredClone(rawReturnInputs);
  const claim = enteredClaim.parse(inputs.f2210);
  const ledger = form2210BoxEPaymentLedgerSchema.parse(rawPaymentLedger);
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
  const worksheet = calculateForm2210Payments({
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
  });
  return {
    ...page1,
    current_form1040: pending.f1040,
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
