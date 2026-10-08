import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { FilingStatus } from "../../../../nodes/types.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { form6251 as mef6251 } from "../../../mef/forms/taxes/f6251.ts";
import { form6251Pdf } from "../../../pdf/forms/taxes/f6251.ts";
import {
  priorIsoSaleFixture,
  priorIsoSaleLossFixture,
} from "./form6251_prior_iso_sale.fixture.ts";
import { assertPriorIsoSaleCalculation } from "./form6251_prior_iso_sale.ts";

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Test",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Test Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

Deno.test("prior ISO sale replays 2024 lot and 2025 Form 8949 into native/PDF Form 6251", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    ...priorIsoSaleFixture(general.taxpayer_ssn),
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const filed = result.pending.form6251!;
  const filer = extractFilerIdentity(general);
  if (!filer) throw new Error("Expected synthetic filer identity");
  assertEquals(filed.line2k_disposition, -15_000);
  assertEquals(result.pending.f1040?.line7_capital_gain, 30_000);
  assertStringIncludes(
    mef6251.build(filed, { pending: result.pending, filer }),
    "<PropertyDispositionAmt>-15000</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, result.pending)?.line2k_disposition,
    -15_000,
  );
  assertEquals(
    form6251Pdf.instances?.(filed, filer, result.pending)?.length,
    1,
  );
  const changedSale = {
    ...result.pending,
    f8949: {
      f8949s: [{
        ...priorIsoSaleFixture().f8949[0],
        date_acquired: "2024-06-02",
      }],
    },
  };
  assertThrows(
    () => mef6251.build(filed, { pending: changedSale, filer }),
    Error,
    "raw 2025 broker/Form 8949 row",
  );
  assertThrows(
    () => form6251Pdf.instances?.(filed, filer, changedSale),
    Error,
    "raw 2025 broker/Form 8949 row",
  );
  const changedPrior = {
    ...filed,
    prior_iso_sale_review: {
      ...priorIsoSaleFixture().form6251_prior_iso_sale.prior_iso_sale_review,
      prior_2024_form6251_line2i: 15_001,
    },
  };
  assertThrows(
    () => mef6251.build(changedPrior, { pending: result.pending, filer }),
    Error,
    "retained reviewed lot",
  );
  const missingPrintedReview = { ...filed };
  delete missingPrintedReview.prior_iso_sale_review;
  assertThrows(
    () =>
      mef6251.build(missingPrintedReview, { pending: result.pending, filer }),
    Error,
    "retained and printed reviewed lot",
  );
  assertThrows(
    () => form6251Pdf.projectFields?.(missingPrintedReview, result.pending),
    Error,
    "retained and printed reviewed lot",
  );
  assertThrows(
    () => form6251Pdf.instances?.(missingPrintedReview, filer, result.pending),
    Error,
    "retained and printed reviewed lot",
  );
  assertThrows(
    () =>
      form6251Pdf.instances?.(
        filed,
        { ...filer, primarySSN: "999887777" },
        result.pending,
      ),
    Error,
    "matching filer",
  );
});

Deno.test("prior ISO lot rejects a mismatched 2024 AMT spread and disqualifying sale date", () => {
  const source = priorIsoSaleFixture();
  const review = source.form6251_prior_iso_sale.prior_iso_sale_review;
  const row = {
    source_transaction_id: "broker-lot-A",
    part: "E",
    proceeds: 40_000,
    regular_basis: 10_000,
    amt_basis: 25_000,
    regular_gain: 30_000,
    amt_gain: 15_000,
  };
  assertThrows(
    () =>
      assertPriorIsoSaleCalculation({
        ...review,
        prior_2024_form6251_line2i: 14_999,
      }, row),
    Error,
    "exact 2024 Form 3921 and Form 6251 bases",
  );
  assertThrows(
    () =>
      assertPriorIsoSaleCalculation(
        { ...review, sale_date: "2025-05-31" },
        row,
      ),
    Error,
    "one qualifying full-lot",
  );
});

Deno.test("prior ISO loss sale caps regular and AMT Schedule D losses separately", () => {
  const source = priorIsoSaleLossFixture(general.taxpayer_ssn);
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    ...source,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const filed = result.pending.form6251!;
  const filer = extractFilerIdentity(general);
  if (!filer) throw new Error("Expected synthetic filer identity");
  // The $1,000 regular loss is fully deductible; the $16,000 AMT loss is
  // limited to $3,000, leaving a $2,000 negative line 2k adjustment.
  assertEquals(result.pending.f1040?.line7_capital_gain, -1_000);
  assertEquals(filed.line2k_disposition, -2_000);
  assertStringIncludes(
    mef6251.build(filed, { pending: result.pending, filer }),
    "<PropertyDispositionAmt>-2000</PropertyDispositionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, result.pending)?.line2k_disposition,
    -2_000,
  );
  assertEquals(
    form6251Pdf.instances?.(filed, filer, result.pending)?.length,
    1,
  );
  const changedSale = {
    ...result.pending,
    f8949: {
      f8949s: [{ ...source.f8949[0], proceeds: 9_001 }],
    },
  };
  assertThrows(
    () => mef6251.build(filed, { pending: changedSale, filer }),
    Error,
    "every AMT basis row to match",
  );
  assertThrows(
    () => form6251Pdf.instances?.(filed, filer, changedSale),
    Error,
    "raw 2025 broker/Form 8949 row",
  );
});
