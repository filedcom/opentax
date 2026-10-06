import { type PdfReviewFixture, pdfReviewFixtures } from "./review-fixtures.ts";
/** Synthetic independently owned books and employer payroll reviews. Expected
 * filing values are calculated independently in the source-return test. */
export function independentPatronFixture(
  kind: "below" | "phase" | "phase-unbound" | "above" | "cap",
): PdfReviewFixture {
  const base = pdfReviewFixtures.find((f) =>
    f.id === "joint-form8995a-patron-farm"
  )!;
  const single = structuredClone(base.inputs) as any;
  const farms: any[] = [], reviews: any[] = [], copies: any[] = [];
  const profits = kind === "below"
    ? [150000, 180000]
    : kind === "phase" || kind === "phase-unbound"
    ? [230000, 260000]
    : kind === "above"
    ? [350000, 280000]
    : [180000, 200000];
  for (let i = 0; i < 2; i++) {
    const farm = structuredClone(single.schedule_f.schedule_fs[0]);
    const review = structuredClone(single.qbi_patron),
      coop = structuredClone(single.f1099patr[0]);
    const suffix = i === 0 ? "-T" : "-S",
      owner = i === 0 ? "111223333" : "444556666";
    farm.farm_id += suffix;
    farm.proprietor_recipient = i === 0 ? "T" : "S";
    farm.line_c_farm_name = i === 0
      ? "Primary Independent Patron Farm"
      : "Spouse Independent Patron Farm";
    farm.line_d_ein = i === 0 ? "123456789" : "345678901";
    farm.qbi_no_other_adjustments_confirmed = true;
    farm.line36_at_risk = "a";
    const payroll = i === 0 ? kind === "phase-unbound" ? 100000 : 40000 : 60000;
    const payments = kind === "cap" ? 3000000 : 150000;
    coop.payer_name += suffix;
    coop.payer_tin = i === 0 ? "234567890" : "456789012";
    coop.recipient_tin = owner;
    coop.account_number += suffix;
    coop.source_document_reference += suffix;
    coop.box1_patronage_dividends = payments / 2;
    coop.box3_per_unit_retain = payments / 2;
    coop.box7_qualified_payments = payments;
    coop.box8_section199aa_qualified_items = payments;
    coop.box6_section199ag_deduction = kind === "cap" ? 270000 : 5000.49;
    coop.distribution_treatment = {
      kind: "farm",
      farm_id: farm.farm_id,
      verified_taxable_amount: payments,
    };
    farm.line2_sales_products_raised = kind === "cap"
      ? 0
      : profits[i] + payroll - payments;
    farm.line3a_cooperative_distributions = payments;
    farm.line3b_cooperative_distributions_taxable = payments;
    farm.line22_labor_hired = payroll;
    farm.qbi_w2_wages = payroll;
    farm.line16_feed = kind === "cap" ? payments - payroll - profits[i] : 0;
    review.business = { kind: "schedule_f", farm_id: farm.farm_id };
    review.source_1099patr = coop;
    delete review.no_other_business_or_aggregation_confirmed;
    delete review.spouse_w2_sources;
    review.no_aggregation_confirmed = true;
    review.payroll_source_reference += suffix;
    review.allocation_worksheet_reference += suffix;
    review.employee_w2_records.forEach((w: any) => {
      w.employee_reference += suffix;
      w.source_document_reference += suffix;
      w.ssa_filing_record_reference += suffix;
      w.box1_wages = payroll;
      w.eligible_199a_wages = payroll;
    });
    review.box6_written_notice_review.notice_reference += suffix;
    review.box6_written_notice_review.recipient_tin = owner;
    review.box6_written_notice_review.designated_199ag_amount =
      coop.box6_section199ag_deduction;
    farms.push(farm);
    reviews.push(review);
    copies.push(coop);
  }
  return {
    ...base,
    id: `joint-independent-patron-${kind}`,
    inputs: {
      general: single.general,
      schedule_f: { schedule_fs: farms },
      f1099patr: copies,
      qbi_patron: {
        independent_farm_reviews: reviews,
        no_other_businesses_confirmed: true,
      },
    },
    reviewFocus: [
      "Separate primary/spouse farms and ScheduleSE",
      "Two patron parent and ScheduleD columns",
      "Combined199A(g) deduction after ordinary QBI income limit",
    ],
  };
}
