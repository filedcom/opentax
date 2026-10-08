import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { irs1040 } from "../../../mef/forms/identity/f1040.ts";
import { irs1040Pdf } from "../../../pdf/forms/identity/f1040.ts";
import { FilingStatus } from "../../../../nodes/types.ts";
import { PDFDocument } from "pdf-lib";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";

const general = {
  filing_status: FilingStatus.MFJ,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  taxpayer_blind: false,
  spouse_first_name: "Sam",
  spouse_last_name: "Example",
  spouse_ssn: "444-55-6666",
  spouse_dob: "1987-03-10",
  spouse_blind: false,
  spouse_can_be_claimed_as_dependent: true,
  dependent_earned_income: 800,
  mfj_dependent_refund_only_review: {
    review_reference: "2025 spouse dependent refund-only review",
    joint_return_only_for_withholding_or_estimated_refund_verified: true,
  },
  digital_assets: false,
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const w2 = [{
  employer_ein: "12-3456789",
  employer_name: "Summer Employer",
  employee_ssn: general.spouse_ssn,
  box1_wages: 800,
  box2_fed_withheld: 100,
}];

function filed() {
  const result = f1040_2025.executeReturn({ general, w2 });
  assertEquals(result.diagnostics, []);
  return normalizeAllPending(result.pending);
}

Deno.test("MFJ claimable spouse uses dependent worksheet and only refunds withholding", () => {
  const pending = filed();
  const fields = pending.f1040;
  assertEquals(fields.spouse_can_be_claimed_as_dependent, true);
  assertEquals(fields.line12a_standard_deduction, 1_350);
  assertEquals(fields.line27_eitc ?? 0, 0);
  assertEquals(fields.line24_total_tax ?? 0, 0);
  assertEquals(fields.line35a_refund, 100);
  const xml = irs1040.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<SpouseClaimAsDependentInd>X</SpouseClaimAsDependentInd>",
  );
  const projected = irs1040Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.spouse_can_be_claimed_as_dependent, true);
  assertEquals(projected.line12a_standard_deduction, 1_350);
});

Deno.test("MFJ claimable spouse rejects missing review, non-MFJ, and other W-2 owner", () => {
  for (
    const changed of [
      { ...general, mfj_dependent_refund_only_review: undefined },
      { ...general, filing_status: FilingStatus.MFS },
    ]
  ) {
    const result = f1040_2025.executeReturn({ general: changed, w2 });
    if (result.diagnostics.length === 0) {
      throw new Error("Claimable spouse must fail source validation");
    }
  }
  const pending = filed();
  const changed = {
    ...pending,
    w2: { w2s: [{ ...w2[0], employee_ssn: "999-99-9999" }] },
  };
  assertThrows(() => irs1040.build(pending.f1040, { pending: changed }), Error);
  assertThrows(() => irs1040Pdf.projectFields?.(pending.f1040, changed), Error);
  const changedWithholding = {
    ...pending,
    w2: { w2s: [{ ...w2[0], box2_fed_withheld: 99 }] },
  };
  assertThrows(
    () => irs1040.build(pending.f1040, { pending: changedWithholding }),
    Error,
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(pending.f1040, changedWithholding),
    Error,
  );
});

Deno.test("MFJ claimable spouse rejects worksheet, EIC, tax, and payment tampering", () => {
  const pending = filed();
  for (
    const delta of [
      { line12a_standard_deduction: 31_500 },
      { line27_eitc: 1 },
      { line24_total_tax: 1 },
      { line35a_refund: 99 },
      { spouse_can_be_claimed_as_dependent: false },
    ]
  ) {
    const changed = { ...pending.f1040, ...delta };
    assertThrows(() => irs1040.build(changed, { pending }), Error);
    assertThrows(() => irs1040Pdf.projectFields?.(changed, pending), Error);
  }
});

Deno.test("MFJ claimable spouse review fixture produces native XML and a filled Form 1040", async () => {
  const fixture = pdfReviewFixtures.find((entry) =>
    entry.id === "mfj-spouse-dependent-refund-only"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const bundle = await buildMefBundle(buildPending(result.pending), {
    filer: fixture.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<SpouseClaimAsDependentInd>X</SpouseClaimAsDependentInd>",
  );
  const bytes = await buildPdfBytes(
    bundle.pending,
    fixture.filer,
    ".pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 2);
});
