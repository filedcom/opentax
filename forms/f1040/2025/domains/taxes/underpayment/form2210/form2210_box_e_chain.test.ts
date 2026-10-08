import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";
import {
  calculateForm2210BoxEPage1,
  type Form2210BoxEInput,
} from "./form2210_box_e.ts";
import { inspectForm2210BoxEPriorReturnBytes } from "./form2210_box_e_prior_bytes.ts";
import { stageForm2210BoxEPage1 } from "./form2210_box_e_staged_chain.ts";
import { buildForm2210BoxEPage1 } from "../../../../mef/forms/taxes/underpayment/f2210_box_e.ts";
import {
  form2210BoxEPage1Fields,
  projectForm2210BoxEPage1,
} from "../../../../pdf/forms/taxes/underpayment/f2210_box_e.ts";

const identity = { taxpayer_ssn: "111223333", spouse_ssn: "444556666" };
const finalized1040 = {
  filing_status: "mfj",
  line22_tax_after_credits: 10_000,
  line23_other_taxes: 0,
  line25c_total: 0,
  line25d_total_withholding: 2_000,
  line32_refundable_credits_total: 0,
};

function priorXml(ssn: string, agi: number, tax: number): Uint8Array {
  return new TextEncoder().encode(
    `<Return xmlns="http://www.irs.gov/efile"><ReturnHeader><TaxYr>2024</TaxYr><TaxPeriodBeginDt>2024-01-01</TaxPeriodBeginDt><TaxPeriodEndDt>2024-12-31</TaxPeriodEndDt><ReturnTypeCd>1040</ReturnTypeCd><Filer><PrimarySSN>${ssn}</PrimarySSN></Filer></ReturnHeader><ReturnData><IRS1040><IndividualReturnFilingStatusCd>3</IndividualReturnFilingStatusCd><AdjustedGrossIncomeAmt>${agi}</AdjustedGrossIncomeAmt><TaxLessCreditsAmt>${tax}</TaxLessCreditsAmt><TotalOtherTaxesAmt>0</TotalOtherTaxesAmt><TotalTaxAmt>${tax}</TotalTaxAmt><RefundableCreditsAmt>0</RefundableCreditsAmt></IRS1040></ReturnData></Return>`,
  );
}

async function fixture() {
  const taxpayer = priorXml(identity.taxpayer_ssn, 55_000, 3_000);
  const spouse = priorXml(identity.spouse_ssn, 45_000, 2_000);
  const source: Form2210BoxEInput = {
    current_filing_status: "married_filing_jointly",
    current_return_reference: "final-2025",
    current_line22_tax_after_credits: 10_000,
    current_withholding_taxes: 2_000,
    current_included_other_taxes: 0,
    current_included_refundable_credits: 0,
    current_schedule3_line11_withholding: 0,
    current_section965_exclusion: 0,
    prior_separate_returns: [
      {
        owner: "taxpayer",
        tax_year: 2024,
        filing_status: "married_filing_separately",
        full_twelve_months: true,
        filed_return_reference: "taxpayer-2024.xml",
        filed_return_sha256: await sha256Hex(taxpayer),
        adjusted_gross_income: 55_000,
        line22_tax_after_credits: 3_000,
        included_other_taxes: 0,
        included_refundable_credits: 0,
      },
      {
        owner: "spouse",
        tax_year: 2024,
        filing_status: "married_filing_separately",
        full_twelve_months: true,
        filed_return_reference: "spouse-2024.xml",
        filed_return_sha256: await sha256Hex(spouse),
        adjusted_gross_income: 45_000,
        line22_tax_after_credits: 2_000,
        included_other_taxes: 0,
        included_refundable_credits: 0,
      },
    ],
  };
  return {
    source,
    documents: [
      { reference: "taxpayer-2024.xml", bytes: taxpayer },
      { reference: "spouse-2024.xml", bytes: spouse },
    ],
  };
}

Deno.test("Form 2210 box E retained prior returns drive complete page-1 MeF and PDF fields", async () => {
  const { source, documents } = await fixture();
  const filed_lines = calculateForm2210BoxEPage1(source);
  const record = { source, filed_lines };
  const staged = await stageForm2210BoxEPage1(
    source,
    identity,
    documents,
    finalized1040,
  );
  const xml = staged.native_xml;
  assert(xml.startsWith("<IRS2210>"));
  assert(
    xml.includes(
      "<CurrentYearTaxAfterCreditsAmt>10000</CurrentYearTaxAfterCreditsAmt>",
    ),
  );
  assert(
    xml.includes(
      "<AnnualPaymentBasedOnPriorYrAmt>5000</AnnualPaymentBasedOnPriorYrAmt>",
    ),
  );
  assert(
    xml.includes("<RequiredAnnualPaymentAmt>5000</RequiredAnnualPaymentAmt>"),
  );
  assert(xml.includes("<JointReturnInd>X</JointReturnInd>"));
  assert(!xml.includes("<RequiredInstallmentAAmt>"));
  assertEquals(staged.pdf_fields, filed_lines);
  assertEquals(projectForm2210BoxEPage1(record, finalized1040), filed_lines);
  assertEquals(form2210BoxEPage1Fields.length, 10);
  assertEquals(
    form2210BoxEPage1Fields[9].pdfField,
    "topmostSubform[0].Page1[0].c1_6[0]",
  );
});

Deno.test("Form 2210 box E rejects changed prior bytes, filer, status, and tax", async () => {
  const { source, documents } = await fixture();
  await assertRejects(() =>
    inspectForm2210BoxEPriorReturnBytes(
      source,
      identity,
      [{
        ...documents[0],
        bytes: priorXml(identity.taxpayer_ssn, 55_000, 3_001),
      }, documents[1]],
    )
  );
  await assertRejects(() =>
    inspectForm2210BoxEPriorReturnBytes(
      source,
      { ...identity, taxpayer_ssn: "999887777" },
      documents,
    )
  );
  const changedStatus = documents[0].bytes.map((byte) => byte);
  const xml = new TextDecoder().decode(changedStatus).replace(
    "<IndividualReturnFilingStatusCd>3</IndividualReturnFilingStatusCd>",
    "<IndividualReturnFilingStatusCd>2</IndividualReturnFilingStatusCd>",
  );
  const changed = new TextEncoder().encode(xml);
  const withChangedDigest = {
    ...source,
    prior_separate_returns: [
      {
        ...source.prior_separate_returns[0],
        filed_return_sha256: await sha256Hex(changed),
      },
      source.prior_separate_returns[1],
    ],
  };
  await assertRejects(() =>
    inspectForm2210BoxEPriorReturnBytes(
      withChangedDigest,
      identity,
      [{ ...documents[0], bytes: changed }, documents[1]],
    )
  );
  assertThrows(() =>
    buildForm2210BoxEPage1(
      {
        source,
        filed_lines: { ...calculateForm2210BoxEPage1(source), line8: 5_001 },
      },
      finalized1040,
    )
  );
  assertThrows(() =>
    projectForm2210BoxEPage1(
      { source, filed_lines: calculateForm2210BoxEPage1(source) },
      { ...finalized1040, line22_tax_after_credits: 9_999 },
    )
  );
});
