import { landGraphFixture2026 } from "./land-graph.fixture.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import { educationFixture2026 } from "./education.fixture.ts";
import { energyClaimFixture2026 } from "./energy.fixture.ts";
import type { z } from "zod";
import type { extensionPaymentClaim2026Schema } from "./extension-payments.ts";
import { form1062PdfFixture2026 } from "../pdf/form1062.fixture.ts";
import { form1062TaxFixture2026 } from "./form1062-tax.fixture.ts";
import type { Form1062InstallmentSource2026 } from "./form1062-installments.ts";

export async function form1062GraphFixture2026(
  graph?: Record<string, unknown>,
) {
  const base = form1062TaxFixture2026(graph);
  const pdf = await form1062PdfFixture2026();
  const records: Form1062InstallmentSource2026 = {
    tax_year: 2026,
    record_reference: "synthetic-graph-installments",
    election_reference: pdf.election.record_reference,
    taxpayer_tin: "123456789",
    as_of: "2027-03-01",
    filing: { kind: "planned", on: "2027-04-15" },
    review: {
      record_reference: "synthetic-graph-payment-review",
      domestic_calendar_year_individual: true,
      no_special_deadline_relief_or_state_holiday_adjustment: true,
      no_death_revocation_deficiency_or_addition_to_tax: true,
      payment_and_event_records_complete_through_as_of: true,
    },
    payments: [],
  };
  return {
    graph: {
      ...base.graph,
      form1062: {
        claim: {
          election: pdf.election,
          review: base.input.review,
          installment_records: records,
        },
      },
    },
    documents: pdf.documents,
    baseline: base.execution,
  };
}

export function form1062CreditsGraph2026() {
  const land = landGraphFixture2026(45000, [], 40000);
  const care = dependentCareFixture2026(40000),
    education = educationFixture2026("aotc", 40000);
  const energy = energyClaimFixture2026(997);
  const {
    no_nonrefundable_credits_other_than_dependent_care_and_education: _review,
    ...child
  } = care.f8812;
  return {
    ...land,
    general: care.general,
    w2s: care.w2s,
    form2441: care.form2441,
    f8863: education.f8863,
    f5695: energy,
    f8812: {
      ...child,
      energy_inventory_reference: energy.claim.record_reference,
    },
  };
}

export function form1062ExtensionReceipt2026(
  amount = 1000,
): z.input<typeof extensionPaymentClaim2026Schema> {
  return {
    claim: {
      record_reference: "extension-payment-inventory",
      payments: [{
        account_record_reference: "tax-account",
        evidence: {
          tax_year: 2026,
          primary_ssn: "123456789",
          payment_date: "2027-04-15",
          amount,
          payment_confirmation_reference: "first-payment",
          extension_request_reference: "extension",
          extension_request_accepted_confirmed: true,
        },
      }],
    },
  };
}
