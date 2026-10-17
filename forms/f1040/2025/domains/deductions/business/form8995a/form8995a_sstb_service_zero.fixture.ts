import {
  sstbServiceCases,
  sstbServiceFixture,
} from "./form8995a_sstb_services.fixture.ts";
import {
  sstbFinancialCases,
  sstbFinancialFixture,
} from "./form8995a_sstb_financial.fixture.ts";
import {
  sstbProfessionalCases,
  sstbProfessionalFixture,
} from "./form8995a_sstb_professional.fixture.ts";
import {
  sstbIdentityCases,
  sstbIdentityFixture,
} from "./form8995a_sstb_identity.fixture.ts";
import {
  type sstbZeroCases,
  sstbZeroFixture,
} from "./form8995a_sstb_zero.fixture.ts";

// All previously reviewed classifications, codes, roles and income kinds.
export const sstbServiceZeroSources = [
  ...sstbServiceCases.map((c) => ({
    name: c.name,
    input: sstbServiceFixture(c),
  })),
  ...sstbFinancialCases.map((c) => ({
    name: c.name,
    input: sstbFinancialFixture(c),
  })),
  ...sstbProfessionalCases.map((c) => ({
    name: c.name,
    input: sstbProfessionalFixture(c),
  })),
  ...sstbIdentityCases.map((c) => ({
    name: c.name,
    input: sstbIdentityFixture(c),
  })),
];

export function sstbServiceZeroFixture(
  source: typeof sstbServiceZeroSources[number],
  endpoint: typeof sstbZeroCases[number],
) {
  const input = sstbZeroFixture(endpoint);
  const business = input.schedule_c[0];
  const template = source.input.schedule_c[0];
  for (
    const key of [
      "line_a_principal_business",
      "line_b_business_code",
      "line_c_business_name",
    ]
  ) {
    business[key] = template[key];
  }
  const review = business.qbi_sstb_filing_review;
  delete review.accounting_sstb_confirmed;
  review.business_activity_description = business.line_a_principal_business;
  review.classification_source_reference =
    `Synthetic ${source.name}/${endpoint.name} classification`;
  const service = structuredClone(
    template.qbi_sstb_filing_review.service_classification_review,
  );
  service.engagement_records_reference =
    `Synthetic ${source.name}/${endpoint.name} engagements`;
  // Endpoint cases change gross receipts; allocate their actual total to two
  // distinct synthetic invoices rather than retaining the positive-case fees.
  const first = Math.floor(business.line_1_gross_receipts / 2);
  service.revenue_records = [first, business.line_1_gross_receipts - first].map(
    (amount, i) => ({
      invoice_reference: `${source.name}/${endpoint.name}/${i + 1}`,
      service_description: business.line_a_principal_business,
      amount,
    }),
  );
  if (service.field === "reputation_or_skill") {
    service.individual_ssn = review.owner_ssn;
  }
  review.service_classification_review = service;
  return input;
}
