import { form4852Graph2026 } from "./form4852-graph.fixture.ts";
import type { DirectTransferLedger2026 } from "./retirement-direct-transfers.ts";
export function directTransfersGraph2026() {
  const g = form4852Graph2026(true), s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  g.general.taxpayer_dob = "1980-01-01";
  Object.assign(s.amounts, {
    gross_distribution: 16000.25,
    taxable_amount: 4000.25,
    distribution_code: "G",
    federal_withheld: 0,
    state_tax_withheld: 0,
    local_tax_withheld: 0,
    employee_contributions: 2000,
  });
  s.distribution_sources = [0, 1].map((i) => ({
    ...s.distribution_sources[0],
    source_document_reference: `transfer-source-${i}`,
    distribution_reference: `transfer-payment-${i}`,
    paid_on: i ? "2026-06-01" : "2026-05-01",
    gross_distribution: i ? 6000 : 10000.25,
    taxable_amount: i ? 0 : 4000.25,
    employee_contributions: i ? 0 : 2000,
    distribution_code: "G",
    federal_withheld: 0,
    state_tax_withheld: 0,
    local_tax_withheld: 0,
  }));
  const receipt = (
    receipt_reference: string,
    amount: number,
    after_tax_basis: number,
    destination_type: "traditional_ira" | "roth_ira" | "eligible_non_roth_plan",
    received_on: string,
  ) => ({
    receipt_reference,
    amount,
    after_tax_basis,
    destination_type,
    received_on,
    owner_tin: g.general.taxpayer_ssn,
    custodian_tin: "123456780",
    account_number: receipt_reference,
    receiving_account_eligibility_verified: true as const,
  });
  const ledger: DirectTransferLedger2026 = {
    record_reference: "complete-direct-transfer-ledger",
    complete_payment_and_destination_inventory_verified: true,
    eligible_direct_transfer_no_rmd_or_other_ineligible_amount_verified: true,
    no_cash_received_by_filer_verified: true,
    payments: s.distribution_sources.map((p, i) => ({
      payment_reference: p.distribution_reference,
      paid_on: p.paid_on,
      gross: p.gross_distribution,
      after_tax_basis: p.employee_contributions,
      plan_basis_record_reference: `plan-basis-${i}`,
      plan_proportionate_basis_and_simultaneous_destination_allocation_verified:
        true,
      destinations: i
        ? [
          receipt(
            "plan-receipt",
            6000,
            0,
            "eligible_non_roth_plan",
            "2026-06-02",
          ),
        ]
        : [
          receipt("roth-receipt", 6000.25, 2000, "roth_ira", "2026-05-02"),
          receipt("ira-receipt", 4000, 0, "traditional_ira", "2026-05-02"),
        ],
    })),
  };
  g.f1099r!.claim.reviews[0].direct_rollover_payments = ledger;
  return g;
}
