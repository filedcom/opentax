import { scheduleJNonfarmW2Inputs } from "./schedule_j_nonfarm_w2.fixture.ts";
import { participantCollectionInputs } from "./form4972_participant_collection.fixture.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

/** Reviewed child box 2a facts added to the retained Ada source inventory. */
export function form8814CapitalScheduleJInputs(
  withSale = false,
  withParentDistribution = false,
): Record<string, unknown> {
  const input: any = scheduleJNonfarmW2Inputs();
  const groups = participantCollectionInputs("two-inherited");
  const child: any = structuredClone(
    (pdfReviewFixtures.find((f) =>
      f.id === "single-form8814-child-dividends-adjustments"
    )!.inputs as any).f8814[0],
  );
  child.source_review.electing_parent_ssn = input.general.taxpayer_ssn;
  child.capital_gain_distributions = 1000;
  child.source_review.income.capital_gain_distributions = 1000;
  child.source_review.source_document_reference =
    "reviewed-Ada-child-capital-distribution-2025";
  child.source_review.capital_gain_distribution_review = {
    source_document_reference: "reviewed-Ada-child-1099div-box2-2025",
    payer_name: "Reviewed Child Fund",
    payer_tin: "987654320",
    box2a: 1000,
    box2b: 0,
    box2c: 0,
    box2d: 0,
    box2e: 0,
    box2f: 0,
  };
  input.f8814 = [child];
  input.form4972 = groups.form4972;
  input.f1099r = groups.f1099r;
  input.schedule_j.tax_treatment.year2025.has_net_capital_gain = true;
  if (withParentDistribution) {
    input.f1099div[0].box2a = 1200;
    input.f1099div[0].source_document_reference =
      "reviewed-parent-2025-dividend-capital-variant";
  }
  if (withSale) {
    input.f8949 = [{
      part: "D",
      description: "Reviewed held investment shares",
      source_transaction_id: "ADA-SALE-2025",
      broker_statement_reference: "reviewed-Ada-broker-2025",
      date_acquired: "2022-01-01",
      date_sold: "2025-06-30",
      proceeds: 5000,
      cost_basis: 4000,
      amt_cost_basis: 4000,
    }];
  }
  return input;
}
