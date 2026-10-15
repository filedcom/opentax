import type { z } from "zod";
import { estimatedPaymentClaim2026Schema } from "./estimated-payments.ts";
import { refundAllocationGraph2026 } from "./refund-allocation.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  agreedJointPayment,
  agreedMfsJointPayment,
} from "../../nodes/inputs/payments/estimated/f1040es/agreed-payment.fixture.ts";

export function estimatedPaymentClaim2026(): z.input<
  typeof estimatedPaymentClaim2026Schema
> {
  return {
    claim: {
      tax_year: 2026,
      record_reference: "synthetic-payment-review",
      as_of: "2027-04-15",
      no_name_change_since_payments_verified: true,
      payments: [1000.49, 500.49].map((amount, i) => ({
        tax_year: 2026 as const,
        quarter: "q1" as const,
        amount,
        payer_tin: "400001037",
        payment_date: "2026-04-15",
        payment_record_reference: `receipt-${i}`,
        irs_account_record_reference: "2026-tax-account",
        transaction_reference: `estimated-transaction-${i}`,
        status: "posted" as const,
        payment_category: "estimated_tax" as const,
        processing_fee: 2.49,
      })),
      prior_year_credits: [{
        prior_return: {
          tax_year: 2025,
          form: "1040",
          record_reference: "accepted-2025-return",
          acceptance_reference: "2025-acknowledgment",
          filing_status: FilingStatus.Single,
          primary_tin: "400001037",
          line34_overpayment: 500,
          line35a_refund: 200,
          line36_applied_to_2026: 300,
          line38_underpayment_penalty: 0,
          no_amendments_or_adjustments_verified: true,
        },
        account_credit: {
          tax_year: 2026,
          account_tin: "400001037",
          amount: 300,
          effective_date: "2026-04-15",
          irs_account_record_reference: "2026-tax-account",
          transaction_reference: "2025-credit-transaction",
          originating_return_reference: "accepted-2025-return",
          no_reversals_offsets_or_transfers_verified: true,
        },
      }],
    },
  };
}

export function estimatedPaymentGraph2026(
  kind: "ordinary" | "divorced" | "mfs" = "ordinary",
) {
  const base = refundAllocationGraph2026();
  const payments = estimatedPaymentClaim2026();
  if (kind === "ordinary") return { ...base, estimated_payments: payments };
  const old = kind === "divorced"
    ? agreedJointPayment.joint_estimated_payment_allocation
    : agreedMfsJointPayment.joint_estimated_payment_allocation;
  const common = {
    allocation_method: "signed_mutual_agreement" as const,
    taxpayer_ssn: "400001037",
    agreement_signed_by_both_verified: true as const,
    signed_agreement_reference: "synthetic-signed-2026-agreement",
    signed_agreement_pdf_sha256: old.signed_agreement_pdf_sha256,
    signed_agreement_pdf_base64: old.signed_agreement_pdf_base64,
    both_calendar_year_taxpayers_verified: true as const,
    neither_nonresident_alien_at_payment_verified: true as const,
    no_divorce_or_separate_maintenance_decree_at_payment_verified:
      true as const,
  };
  const row = {
    tax_year: 2026 as const,
    quarter: "q1" as const,
    joint_payment_amount: 500,
    taxpayer_allocated_amount: 300,
    payment_date: "2026-04-15",
    payment_record_reference: "joint-receipt",
    irs_account_record_reference: "joint-tax-account",
    transaction_reference: "joint-transaction",
    status: "posted" as const,
    payment_category: "estimated_tax" as const,
  };
  payments.claim.joint_allocation = kind === "divorced"
    ? {
      ...common,
      divorce_date_2026: "2026-08-01",
      former_spouse_ssn: "400001038",
      not_remarried_in_2026_verified: true,
      no_name_change_since_payment_verified: true,
      payments: [{ ...row, former_spouse_allocated_amount: 200 }],
    }
    : {
      ...common,
      filing_context: "married_filing_separately",
      spouse_ssn: "400001038",
      payments: [{ ...row, spouse_allocated_amount: 200 }],
    };
  payments.claim.payments = [];
  payments.claim.prior_year_credits = [];
  return {
    ...base,
    estimated_payments: payments,
    general: {
      ...base.general,
      ...(kind === "mfs"
        ? {
          filing_status: FilingStatus.MFS,
          spouse_first_name: "Pat",
          spouse_last_name: "Wheat",
          spouse_ssn: "400001038",
          spouse_dob: "1985-01-01",
          spouse_blind: false,
          spouse_can_be_claimed_as_dependent: false,
          mfs_spouse_itemizing: false,
          mfs_spouse_lived_with_taxpayer: false,
        }
        : {}),
    },
  };
}
