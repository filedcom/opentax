import { form8941FiledFixture } from "../../../../../nodes/inputs/credits/health/f8941/fixture.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import type { PdfReviewFixture } from "../../../review-fixtures.ts";

/** Synthetic first-year employer records; no prior IRS acceptance asserted. */
export function form8941OwnedInputs(receipts = 250_000) {
  const source = form8941FiledFixture();
  return {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Jane",
      taxpayer_last_name: "Soleproprietor",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Example Way",
      address_city: "Albany",
      address_state: "NY",
      address_zip: "12207",
      digital_assets: false,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    f8941: source.f8941,
    schedule_c: source.schedule_c.schedule_cs.map((business) => ({
      ...business,
      line_1_gross_receipts: receipts,
    })),
  };
}

export function form8941OwnedReviewFixture(): PdfReviewFixture {
  const inputs = form8941OwnedInputs();
  return {
    id: "single-shop-health-premium-credit",
    inputs,
    filer: extractFilerIdentity(inputs.general)!,
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule3",
      "schedule_c",
      "schedule_se",
      "f3800",
      "form6251",
      "form8995",
      "f8941",
    ],
    reviewFocus: [
      "Owned employer/payroll/employee records and twelve monthly SHOP invoices/payments derive Form8941 credit11698",
      "Gross benefits26000 retain source; section280C(h) reduces deduction by full determined credit11698 to14302 before SE/QBI",
      "First-year 2025 credit reaches Form3800 PartIII4h, prepared source allocation, Schedule3 and Form1040 without asserted prior acceptance",
    ],
  };
}
