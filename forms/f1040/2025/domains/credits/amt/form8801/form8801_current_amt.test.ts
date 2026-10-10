import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { fixture, packageFacts } from "./form8801_reviewed_return.fixture.ts";
import {
  reconcileForm8801CarryRecord,
  stageForm8801CarryRecord,
} from "./form8801_carry_record.ts";
import { stageForm8801PriorBoundReturn } from "./form8801_prior_return_bytes.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";
import { assertAttachmentCoverage } from "../../../../return-processing/attachment-coverage.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";

// Constructed prior-copy fields; this is not an accepted prior return.
const priorXml =
  `<Return xmlns="http://www.irs.gov/efile"><ReturnHeader><TaxYr>2024</TaxYr><TaxPeriodBeginDt>2024-01-01</TaxPeriodBeginDt><TaxPeriodEndDt>2024-12-31</TaxPeriodEndDt><ReturnTypeCd>1040</ReturnTypeCd><Filer><PrimarySSN>111223333</PrimarySSN></Filer></ReturnHeader><ReturnData><IRS1040 documentId="Prior1040"><IndividualReturnFilingStatusCd>1</IndividualReturnFilingStatusCd></IRS1040><IRS6251 documentId="Prior6251"><AGIOrAGILessDeductionAmt>100000</AGIOrAGILessDeductionAmt><ScheduleATaxesAmt>20000</ScheduleATaxesAmt><TotalRefundReceivedAmt>0</TotalRefundReceivedAmt><InvestmentInterestAmt>0</InvestmentInterestAmt><DepletionAmt>0</DepletionAmt><NetOperatingLossDeductionAmt>0</NetOperatingLossDeductionAmt><ExemptPrivateActivityBondsAmt>0</ExemptPrivateActivityBondsAmt><Section1202ExclusionAmt>0</Section1202ExclusionAmt><AdjustedRegularTaxAmt>8000</AdjustedRegularTaxAmt><AlternativeMinimumTaxAmt>5000</AlternativeMinimumTaxAmt></IRS6251><IRS8801 documentId="Prior8801"><AMTCrCarryforwardToNextYearAmt>100000</AMTCrCarryforwardToNextYearAmt></IRS8801></ReturnData></Return>`;

// Independent printed-form expectations: regular taxable income 104,250 gives
// 17,867 tax; AMTI is 120,000 + PAB, less 88,100 exemption, at 26%.
// Prior exclusion tax is (120,000 - 85,700)*26% - 8,000 = 918;
// credit available is 5,000 - 918 + 100,000 + 100 = 104,182.
// https://www.irs.gov/pub/irs-pdf/f6251.pdf
// https://www.irs.gov/pub/irs-prior/f8801--2025.pdf
for (
  const [pab, tmt, credit, amt, carry] of [
    [0, 8294, 9573, 0, 94609],
    [20000, 13494, 4373, 0, 99809],
    [36800, 17862, 5, 0, 104177],
    [36850, 17875, 0, 8, 104182],
    [40000, 18694, 0, 827, 104182],
    [100000, 34294, 0, 16427, 104182],
  ]
) {
  Deno.test(`Form 8801 current PAB ${pab} reconciles AMT, credit, balance and retained carry`, async () => {
    const facts = packageFacts();
    facts.prior_credit_carryforward.amount = 100000;
    const f = await fixture(facts);
    f.inputs.schedule_b_part_iii = {
      foreign_accounts_question: false,
      fincen_form114_required: false,
      foreign_trust_question: false,
    };
    f.inputs.f1099int = [{
      payer_name: "Reviewed bond payer",
      recipient_tin: "111223333",
      box8: pab,
      box9: pab,
    }];
    const priorBytes = new TextEncoder().encode(priorXml);
    const priorBinding = {
      reference: "prior-2024.xml",
      sha256: await sha256Hex(priorBytes),
      form6251_document_id: "Prior6251",
      form8801_document_id: "Prior8801",
    };
    const priorDocuments = [{
      reference: priorBinding.reference,
      bytes: priorBytes,
    }];
    const r = await stageForm8801CarryRecord(
      f.inputs,
      f.binding,
      f.documents,
      priorBinding,
      priorDocuments,
      `carry-${pab}.json`,
    );
    assertEquals(r.record.form8801_lines[21], 104182);
    assertEquals(r.record.form8801_lines[22], 17867);
    assertEquals(r.record.form8801_lines[23], tmt);
    assertEquals([r.record.credit_used, r.record.credit_carryforward], [
      credit,
      carry,
    ]);
    const settled = await stageForm8801PriorBoundReturn(
      f.inputs,
      f.binding,
      f.documents,
      priorBinding,
      priorDocuments,
    );
    assertEquals(settled.final_form1040.line16_income_tax, 17867);
    assertEquals(
      settled.final_form1040.line18_total_tax_before_credits,
      17867 + amt,
    );
    assertEquals(
      settled.final_schedule3.line6b_prior_year_min_tax_credit,
      credit,
    );
    assertEquals(settled.final_form1040.line24_total_tax, tmt);
    assertEquals(
      settled.final_form1040.line35a_refund ?? 0,
      Math.max(0, 20000 - tmt),
    );
    assertEquals(
      settled.final_form1040.line37_amount_owed ?? 0,
      Math.max(0, tmt - 20000),
    );
    const read = await reconcileForm8801CarryRecord(
      f.inputs,
      f.binding,
      f.documents,
      priorBinding,
      priorDocuments,
      r.binding,
      [{ reference: r.binding.reference, bytes: r.bytes }],
    );
    assertEquals(read.local_opening_preview.prior_credit_carryforward, carry);
    assertEquals(read.nextYearFilingImportAllowed, false);
    // Preserve the observed final-export boundary; do not patch projected headers
    // to make this unregistered route reach a later check (future_todo 152).
    assertEquals(
      settled.public_pending_before_credit.f1040.digital_assets,
      false,
    );
    assertEquals(settled.final_form1040.digital_assets, undefined);
    // Positive available carry requires Form 8801 even with zero allowed credit.
    for (const format of ["mef", "pdf"] as const) {
      assertThrows(
        () => assertAttachmentCoverage(settled.projected_pending, format),
        Error,
        "Form 8801",
      );
    }
    const filer = pdfReviewFixtures[0].filer;
    await assertRejects(
      () => f1040_2025.prepareReturn(settled.projected_pending, filer),
      Error,
      "needs the digital-assets answer",
    );
    await assertRejects(
      () => buildPdfBytes(settled.projected_pending, filer, ".pdf-cache"),
      Error,
      "needs the digital-assets answer",
    );
    const changed = structuredClone(f.inputs);
    changed.f1099int[0].box8 += 100;
    changed.f1099int[0].box9 += 100;
    await assertRejects(
      () =>
        reconcileForm8801CarryRecord(
          changed,
          f.binding,
          f.documents,
          priorBinding,
          priorDocuments,
          r.binding,
          [{ reference: r.binding.reference, bytes: r.bytes }],
        ),
      Error,
      "differs from recomputed",
    );
  });
}
