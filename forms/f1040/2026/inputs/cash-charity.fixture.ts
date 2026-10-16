import type { z } from "zod";
import type { cashGift2026Schema } from "./cash-charity.ts";
/** Synthetic issued-payment facts shared by source and graph tests. */
export const syntheticCashGift2026: z.input<typeof cashGift2026Schema> = {
  tax_year: 2026,
  contribution_id: "gift-one",
  donor_ssn: "111223333",
  contribution_date: "2026-09-15",
  donee_name: "Example Public Charity",
  donee_ein: "123456789",
  recipient_class: "section170b1A",
  organization_classification_reference: "synthetic-classification-record",
  payment_method: "check",
  amount_paid: 600,
  goods_or_services_value: 100,
  payment_record_reference: "synthetic-payment-record",
  from_ira_qualified_charitable_distribution: false,
  state_local_credit_or_reimbursement_amount: 0,
  acknowledgment: {
    record_reference: "synthetic-acknowledgment",
    received_by_earlier_of_filing_or_extended_due_date: true,
    goods_services_or_intangible_religious_benefits_described: true,
  },
};
