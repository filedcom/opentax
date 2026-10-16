import {
  retirementCopy2026,
  retirementGraph2026,
  retirementSource2026,
} from "./retirement.fixture.ts";
import { DistributionCode as Code } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
export function earlyRetirementSource2026(simple = false, amount = 10000) {
  const copy = retirementCopy2026("early", true);
  copy.box7a_distribution_codes = [simple ? Code.CodeS : Code.Code1];
  copy.box1_gross_distribution = amount;
  copy.box2a_taxable_amount = amount;
  copy.box4_federal_withheld = 0;
  const s = retirementSource2026([copy]);
  s.taxpayer_dob = "1990-01-01";
  s.claim.reviews[0].plan_type = simple ? "simple_ira" : "traditional_ira";
  s.claim.reviews[0].early_distribution = {
    record_reference: "early-payment-ledger",
    complete_payment_inventory_verified: true,
    no_additional_tax_exception_applies_verified: true,
    ...(simple ? { simple_first_contribution_date: "2025-01-01" } : {}),
    payments: [{
      record_reference: "payment-one",
      payment_date: "2026-09-01",
      gross: amount,
      taxable: amount,
    }],
  };
  return s;
}
export function earlyRetirementGraph2026(simple = false, amount = 10000) {
  const s = earlyRetirementSource2026(simple, amount),
    graph = retirementGraph2026(s.claim.copies);
  graph.general.taxpayer_dob = s.taxpayer_dob;
  graph.f1099r.claim = s.claim;
  return graph;
}
