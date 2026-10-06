import { type PdfReviewFixture, pdfReviewFixtures } from "./review-fixtures.ts";

/** Reviewed direct-owner stores: actual current-year acquisitions and annual event inventory. */
export function ownedAggregationElectionFixture(
  count: 3 | 4,
): PdfReviewFixture {
  const base = pdfReviewFixtures.find((f) =>
    f.id === "single-form8995a-two-business-aggregation"
  )!;
  const fixture = structuredClone(base);
  const businesses = fixture.inputs.schedule_c as Record<string, any>[];
  const source =
    (fixture.inputs.qbi_aggregation as any).aggregation_filing_details;
  const extra = [{
    name: "East Store",
    ein: "234567890",
    ref: "east-2025",
    receipts: 75000,
    wages: 15000,
    date: "2025-02-01",
    half: 804,
  }, {
    name: "West Store",
    ein: "123456789",
    ref: "west-2025",
    receipts: 45000,
    wages: 5000,
    date: "2025-03-01",
    half: 536,
  }];
  source.group_description =
    "Commonly owned retail stores selling the same goods with centralized personnel and purchasing";
  source.operational_factors[0].explanation =
    "All stores sell the same catalog of merchandise";
  source.operational_factors[1].explanation =
    "All stores share centralized purchasing, accounting and payroll staff";
  source.members[0].qbi_adjustments.deductible_se_tax = 1339;
  source.members[0].qbi = 98661;
  source.members[1].qbi_adjustments.deductible_se_tax = 1071;
  source.members[1].qbi = 78929;
  for (const item of extra.slice(0, count - 2)) {
    const business: Record<string, any> = {
      ...structuredClone(businesses[0]),
      line_c_business_name: item.name,
      line_h_new_business: true,
      line_d_ein: item.ein,
      business_reference: item.ref,
      line_1_gross_receipts: item.receipts,
      line_26_wages: item.wages,
      qbi_w2_wages: item.wages,
    };
    businesses.push(business);
    source.members.push({
      ...structuredClone(source.members[0]),
      business_reference: item.ref,
      business_name: item.name,
      ein: item.ein,
      qbi: item.receipts - item.wages - item.half,
      w2_wages: item.wages,
      ownership_start_date: item.date,
      ownership_source_reference: `${item.ref}-purchase-agreement`,
      source_schedule_c: business,
      qbi_adjustments: {
        ...structuredClone(source.members[0].qbi_adjustments),
        deductible_se_tax: item.half,
        allocation_method_description:
          "Filed owner half-SE allocated by each store net-profit share; final dollar reconciliation retained",
        allocation_worksheet_reference:
          `owner-se-allocation-${count}-stores-2025`,
      },
    });
    source.annual_disclosure.businesses.push({
      business_reference: item.ref,
      business_description: business.line_a_principal_business,
      entity_name: item.name,
      entity_ein: item.ein,
      events: [{
        event: "acquired",
        date: item.date,
        source_reference: `${item.ref}-purchase-agreement`,
      }],
    });
  }
  for (const member of source.members) {
    member.qbi_adjustments.allocation_worksheet_reference =
      `owner-se-allocation-${count}-stores-2025`;
  }
  (fixture.inputs.qbi_aggregation as any).aggregation_groups[0].business_names =
    source.members.map((m: any) => m.business_name);
  source.annual_disclosure.disclosure_source_reference =
    `complete-${count}-stores-event-inventory-2025`;
  return {
    ...fixture,
    id: `single-form8995a-owned-${count}-business-election`,
    expectedPdfForms: [...base.expectedPdfForms],
    reviewFocus: [
    `All ${count} direct-owner businesses, actual acquisition dates and complete annual disclosure`,
    "Grouped wage limit and filed owner half-SE reach 1040",
    "Canonical third Schedule B row and fourth-member continuation retain exact amounts",
    ],
  };
}
