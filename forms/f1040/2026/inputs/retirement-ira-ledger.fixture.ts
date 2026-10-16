import {
  retirementIraGraph2026,
  retirementIraSource2026,
} from "./retirement-ira.fixture.ts";
import { itemizedClaim2026 } from "../schedule-a.fixture.ts";
export function retirementIraLedgerSource2026() {
  const s = retirementIraSource2026(true), c = s.claim.copies[0];
  const o = s.claim.ira_basis!.owners[0], d = o.distributions[0];
  c.state_information = [{
    state: "MA",
    payer_state_id: "MA-TRUST",
    box14_state_withheld: 200,
    box16_state_distribution: 16000,
  }];
  c.local_information = [{
    locality: "Test locality",
    box17_local_withheld: 100,
    box19_local_distribution: 16000,
  }];
  o.statement_payment_ledgers = [{
    source_document_reference: c.source_document_reference,
    record_reference: "custodian-annual-payment-ledger",
    complete_payment_inventory_verified: true,
    no_substantially_equal_payment_modification_or_recapture_verified: true,
    payments: [
      {
        record_reference: "ira-payment-may",
        distributed_on: "2026-05-31",
        gross: 10000,
        cash_paid_to_owner: 3215,
        federal_withheld: 600,
        state_withholding: [{ state: "MA", withheld: 125 }],
        local_withholding: [{ locality: "Test locality", withheld: 60 }],
        conversion: {
          ...d.conversion!,
          receipt: {
            ...d.conversion!.receipt,
            source_document_reference: "conversion-receipt-may",
            received_on: "2026-06-01",
            amount: 6000,
          },
        },
      },
      {
        record_reference: "ira-payment-june",
        distributed_on: "2026-06-01",
        gross: 6000,
        cash_paid_to_owner: 1485,
        federal_withheld: 400,
        state_withholding: [{ state: "MA", withheld: 75 }],
        local_withholding: [{ locality: "Test locality", withheld: 40 }],
        conversion: {
          ...d.conversion!,
          receipt: {
            ...d.conversion!.receipt,
            source_document_reference: "conversion-receipt-june",
            received_on: "2026-06-02",
            amount: 4000,
          },
        },
      },
    ],
  }];
  o.distributions = [];
  s.claim.reviews[0].early_distribution!.payments = [
    {
      record_reference: "ira-payment-may",
      payment_date: "2026-05-31",
      gross: 4000,
    },
    {
      record_reference: "ira-payment-june",
      payment_date: "2026-06-01",
      gross: 2000,
    },
  ];
  return s;
}
export function retirementIraLedgerGraph2026() {
  const graph = retirementIraGraph2026(true),
    s = retirementIraLedgerSource2026();
  graph.f1099r.claim = s.claim;
  graph.general.taxpayer_dob = s.taxpayer_dob;
  return { ...graph, schedule_a: structuredClone(itemizedClaim2026) };
}
