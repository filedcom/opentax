import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { sha256Hex } from "./prepared-source.ts";
import { fixture, packageFacts } from "./form8801_reviewed_return.fixture.ts";
import {
  inspectForm8801PriorReturnBytes,
  stageForm8801PriorBoundReturn,
} from "./form8801_prior_return_bytes.ts";
import { assertAttachmentCoverage } from "./attachment-coverage.ts";

// Constructed source copy using independently reviewed 2024 IRS field names.
// It is not an accepted return and has no issuer-authentication evidence.
const xml =
  `<Return xmlns="http://www.irs.gov/efile"><ReturnHeader><TaxYr>2024</TaxYr><TaxPeriodBeginDt>2024-01-01</TaxPeriodBeginDt><TaxPeriodEndDt>2024-12-31</TaxPeriodEndDt><ReturnTypeCd>1040</ReturnTypeCd><Filer><PrimarySSN>111223333</PrimarySSN></Filer></ReturnHeader><ReturnData><IRS1040 documentId="Prior1040"><IndividualReturnFilingStatusCd>1</IndividualReturnFilingStatusCd></IRS1040><IRS6251 documentId="Prior6251"><AGIOrAGILessDeductionAmt>100000</AGIOrAGILessDeductionAmt><ScheduleATaxesAmt>20000</ScheduleATaxesAmt><TotalRefundReceivedAmt>0</TotalRefundReceivedAmt><InvestmentInterestAmt>0</InvestmentInterestAmt><DepletionAmt>0</DepletionAmt><NetOperatingLossDeductionAmt>0</NetOperatingLossDeductionAmt><ExemptPrivateActivityBondsAmt>0</ExemptPrivateActivityBondsAmt><Section1202ExclusionAmt>0</Section1202ExclusionAmt><AdjustedRegularTaxAmt>8000</AdjustedRegularTaxAmt><AlternativeMinimumTaxAmt>5000</AlternativeMinimumTaxAmt></IRS6251><IRS8801 documentId="Prior8801"><AMTCrCarryforwardToNextYearAmt>1000</AMTCrCarryforwardToNextYearAmt></IRS8801></ReturnData></Return>`;

async function source(copy = xml) {
  const bytes = new TextEncoder().encode(copy);
  const binding = {
    reference: "retained-2024.xml",
    sha256: await sha256Hex(bytes),
    form6251_document_id: "Prior6251",
    form8801_document_id: "Prior8801",
  };
  return { binding, documents: [{ reference: binding.reference, bytes }] };
}
function amount(copy: string, tag: string, value: string) {
  return copy.replace(
    new RegExp(`<${tag}>[^<]*</${tag}>`),
    `<${tag}>${value}</${tag}>`,
  );
}

Deno.test("8801 prior copy joins exact 2024 forms to locally settled current credit without marking acceptance", async () => {
  const f = await fixture();
  const p = await source();
  const r = await stageForm8801PriorBoundReturn(
    f.inputs,
    f.binding,
    f.documents,
    p.binding,
    p.documents,
  );
  assertEquals(r.lines[25], 5182);
  assertEquals(r.priorReturnBytesVerified, true);
  assertEquals(r.priorForm6251AndCarryBytesReconciled, true);
  assertEquals([
    r.priorAcceptanceVerified,
    r.workpaperAuthenticityVerified,
    r.finalizedReturnReconciled,
    r.filingReady,
  ], [false, false, false, false]);
  assertEquals(r.prior_return_manifest, [{
    reference: p.binding.reference,
    sha256: p.binding.sha256,
  }]);
  for (const kind of ["mef", "pdf"] as const) {
    assertThrows(
      () => assertAttachmentCoverage(r.projected_pending, kind),
      Error,
      "Form 8801",
    );
  }
});

Deno.test("8801 prior copy reconciles every exclusion source line rather than only aggregate AMT", async () => {
  for (
    const [tag, original] of [
      ["AGIOrAGILessDeductionAmt", 100000],
      ["ScheduleATaxesAmt", 20000],
      ["TotalRefundReceivedAmt", 0],
      ["InvestmentInterestAmt", 0],
      ["DepletionAmt", 0],
      ["NetOperatingLossDeductionAmt", 0],
      ["ExemptPrivateActivityBondsAmt", 0],
      ["Section1202ExclusionAmt", 0],
      ["AdjustedRegularTaxAmt", 8000],
      ["AlternativeMinimumTaxAmt", 5000],
    ] as const
  ) {
    const p = await source(amount(xml, tag, String(original + 1)));
    await assertRejects(
      () =>
        inspectForm8801PriorReturnBytes(packageFacts(), p.binding, p.documents),
      Error,
      "differs",
    );
  }
});

Deno.test("8801 prior copy preserves signed amounts and converts refund magnitude to the printed negative", async () => {
  const facts = packageFacts();
  facts.prior_form6251.line1 = -2000;
  facts.prior_form6251.line2b = -250;
  facts.prior_form6251.line2c = -100;
  let copy = amount(xml, "AGIOrAGILessDeductionAmt", "-2000");
  copy = amount(copy, "TotalRefundReceivedAmt", "250");
  copy = amount(copy, "InvestmentInterestAmt", "-100");
  copy = copy.replace(
    "<TotalRefundReceivedAmt>",
    '<TotalRefundReceivedAmt referenceDocumentId="RefundStmt">',
  );
  const p = await source(copy);
  const r = await inspectForm8801PriorReturnBytes(
    facts,
    p.binding,
    p.documents,
  );
  assertEquals(r.review.prior_form6251.line2b, -250);
  const invalid = await source(
    copy.replace(
      ">250</TotalRefundReceivedAmt>",
      ">-250</TotalRefundReceivedAmt>",
    ),
  );
  await assertRejects(
    () =>
      inspectForm8801PriorReturnBytes(
        facts,
        invalid.binding,
        invalid.documents,
      ),
    Error,
    "invalid dollars",
  );
});

Deno.test("8801 prior copy rejects changed carry, missing positive source and conflicting document IDs", async () => {
  for (
    const copy of [
      amount(xml, "AMTCrCarryforwardToNextYearAmt", "1001"),
      xml.replace(/<IRS8801[\s\S]*?<\/IRS8801>/, ""),
      xml.replace('documentId="Prior6251"', 'documentId="Other6251"'),
      xml.replace('documentId="Prior8801"', 'documentId="Prior6251"'),
      xml.replace("</IRS6251>", '</IRS6251><IRS6251 documentId="Second6251"/>'),
    ]
  ) {
    const p = await source(copy);
    await assertRejects(() =>
      inspectForm8801PriorReturnBytes(packageFacts(), p.binding, p.documents)
    );
  }
});

Deno.test("8801 prior copy binds actual header primary identity, status and complete period", async () => {
  for (
    const copy of [
      xml.replace(">2024<", ">2025<"),
      xml.replace("2024-01-01", "2024-02-01"),
      xml.replace("2024-12-31", "2024-11-30"),
      xml.replace(">1040<", ">1041<"),
      xml.replace("111223333", "444556666"),
      xml.replace(
        ">1</IndividualReturnFilingStatusCd>",
        ">2</IndividualReturnFilingStatusCd>",
      ),
      xml.replace(
        "<PrimarySSN>111223333</PrimarySSN>",
        "<PrimarySSN>444556666</PrimarySSN><SpouseSSN>111223333</SpouseSSN>",
      ),
    ]
  ) {
    const p = await source(copy);
    await assertRejects(
      () =>
        inspectForm8801PriorReturnBytes(packageFacts(), p.binding, p.documents),
      Error,
      "differs",
    );
  }
  for (
    const [status, code] of [
      ["married_filing_jointly", "2"],
      ["married_filing_separately", "3"],
      ["head_of_household", "4"],
      ["qualifying_surviving_spouse", "5"],
    ] as const
  ) {
    const p = await source(
      xml.replace(
        ">1</IndividualReturnFilingStatusCd>",
        `>${code}</IndividualReturnFilingStatusCd>`,
      ),
    );
    await inspectForm8801PriorReturnBytes(
      { ...packageFacts(), prior_filing_status: status },
      p.binding,
      p.documents,
    );
  }
});

Deno.test("8801 prior copy supports IRS prefixes and rejects namespace substitution and duplicate leaves", async () => {
  const prefixed = xml.replace(
    'xmlns="http://www.irs.gov/efile"',
    'xmlns:r="http://www.irs.gov/efile"',
  ).replace(/<(\/?)([A-Za-z][A-Za-z0-9]*)/g, "<$1r:$2");
  const p = await source(prefixed);
  await inspectForm8801PriorReturnBytes(packageFacts(), p.binding, p.documents);
  for (
    const copy of [
      xml.replace("http://www.irs.gov/efile", "urn:other"),
      xml.replace("<IRS6251 ", '<IRS6251 xmlns="urn:other" '),
      xml.replace(
        "<ScheduleATaxesAmt>20000</ScheduleATaxesAmt>",
        "<ScheduleATaxesAmt>20000</ScheduleATaxesAmt><ScheduleATaxesAmt>0</ScheduleATaxesAmt>",
      ),
    ]
  ) {
    const p = await source(copy);
    await assertRejects(() =>
      inspectForm8801PriorReturnBytes(packageFacts(), p.binding, p.documents)
    );
  }
});

Deno.test("8801 prior copy rejects malformed or ambiguous amounts, wrong byte set and digest tampering", async () => {
  for (
    const value of [
      " 100000",
      "0100000",
      "100000.0",
      "1e5",
      "9007199254740993",
      "-0",
    ]
  ) {
    const p = await source(amount(xml, "AGIOrAGILessDeductionAmt", value));
    await assertRejects(() =>
      inspectForm8801PriorReturnBytes(packageFacts(), p.binding, p.documents)
    );
  }
  for (
    const copy of [
      '<!DOCTYPE Return [<!ENTITY x "1">]>' + xml,
      xml.replace("100000", "<![CDATA[100000]]>"),
      xml + "<Return/>",
      xml.replace("</Return>", ""),
    ]
  ) {
    const p = await source(copy);
    await assertRejects(() =>
      inspectForm8801PriorReturnBytes(packageFacts(), p.binding, p.documents)
    );
  }
  const p = await source();
  await assertRejects(() =>
    inspectForm8801PriorReturnBytes(packageFacts(), p.binding, [])
  );
  await assertRejects(() =>
    inspectForm8801PriorReturnBytes(packageFacts(), p.binding, [
      ...p.documents,
      ...p.documents,
    ])
  );
  p.documents[0].bytes[0] ^= 1;
  await assertRejects(
    () =>
      inspectForm8801PriorReturnBytes(packageFacts(), p.binding, p.documents),
    Error,
    "SHA-256",
  );
});

Deno.test("8801 prior copy absent forms prove only zero claimed AMT and carry", async () => {
  const facts = packageFacts();
  for (const key of Object.keys(facts.prior_form6251)) {
    if (key !== "reference") (facts.prior_form6251 as any)[key] = 0;
  }
  facts.prior_credit_carryforward.amount = 0;
  const p = await source(
    xml.replace(/<IRS6251[\s\S]*?<\/IRS6251>/, "").replace(
      /<IRS8801[\s\S]*?<\/IRS8801>/,
      "",
    ),
  );
  await inspectForm8801PriorReturnBytes(facts, {
    reference: p.binding.reference,
    sha256: p.binding.sha256,
  }, p.documents);
  facts.prior_credit_carryforward.amount = 1;
  await assertRejects(
    () =>
      inspectForm8801PriorReturnBytes(facts, {
        reference: p.binding.reference,
        sha256: p.binding.sha256,
      }, p.documents),
    Error,
    "carry differs",
  );
});

Deno.test("8801 prior-bound staging rejects caller acceptance flags and reused review references", async () => {
  const f = await fixture();
  const p = await source();
  await assertRejects(() =>
    stageForm8801PriorBoundReturn(f.inputs, f.binding, f.documents, {
      ...p.binding,
      acceptanceVerified: true,
    }, p.documents)
  );
  await assertRejects(
    () =>
      stageForm8801PriorBoundReturn(f.inputs, f.binding, f.documents, {
        ...p.binding,
        reference: f.binding.reference,
      }, p.documents),
    Error,
    "must be distinct",
  );
});

Deno.test("8801 reviewed no-Form-1116 election binds MTFTCE to retained Schedule 3 and recomputes current credit", async () => {
  const facts = packageFacts();
  const review = {
    ...facts,
    minimum_tax_foreign_credit_exclusion_workpaper: {
      ...facts.minimum_tax_foreign_credit_exclusion_workpaper,
      amount: 125,
      method: "without_form1116_election",
    },
  };
  const f = await fixture(review);
  const copy = xml.replace(
    "</ReturnData>",
    '<IRS1040Schedule3 documentId="PriorSchedule3"><ForeignTaxCreditAmt>125</ForeignTaxCreditAmt></IRS1040Schedule3></ReturnData>',
  );
  const p = await source(copy);
  const r = await stageForm8801PriorBoundReturn(
    f.inputs,
    f.binding,
    f.documents,
    { ...p.binding, schedule3_document_id: "PriorSchedule3" },
    p.documents,
  );
  assertEquals(r.minimumTaxForeignCreditAmountReconciled, true);
  assertEquals(r.lines[12], 125);
  assertEquals(r.lines[15], 793);
  assertEquals(r.lines[25], 5307);
  assertEquals(r.final_schedule3.line6b_prior_year_min_tax_credit, 5307);
  assertEquals(r.final_form1040.line22_tax_after_credits, 12560);
  assertEquals([
    r.priorAcceptanceVerified,
    r.workpaperAuthenticityVerified,
    r.filingReady,
  ], [false, false, false]);
});

Deno.test("8801 elected MTFTCE rejects detached totals, missing Schedule 3 binding and retained Form 1116", async () => {
  const facts = packageFacts();
  const review = {
    ...facts,
    minimum_tax_foreign_credit_exclusion_workpaper: {
      ...facts.minimum_tax_foreign_credit_exclusion_workpaper,
      amount: 125,
      method: "without_form1116_election",
    },
  };
  const schedule3 =
    '<IRS1040Schedule3 documentId="PriorSchedule3"><ForeignTaxCreditAmt>125</ForeignTaxCreditAmt></IRS1040Schedule3>';
  for (
    const suffix of [
      schedule3.replace(">125<", ">124<"),
      schedule3.replace(">125<", ">-125<"),
      schedule3 + '<IRS1116 documentId="Prior1116"/>',
      schedule3 + '<IRS1116ScheduleB documentId="Prior1116B"/>',
      schedule3 + schedule3.replace("PriorSchedule3", "OtherSchedule3"),
    ]
  ) {
    const p = await source(
      xml.replace("</ReturnData>", suffix + "</ReturnData>"),
    );
    await assertRejects(() =>
      inspectForm8801PriorReturnBytes(review, {
        ...p.binding,
        schedule3_document_id: "PriorSchedule3",
      }, p.documents)
    );
  }
  const p = await source(
    xml.replace("</ReturnData>", schedule3 + "</ReturnData>"),
  );
  await assertRejects(
    () => inspectForm8801PriorReturnBytes(review, p.binding, p.documents),
    Error,
    "binding differs",
  );
  const missing = await source();
  await assertRejects(
    () =>
      inspectForm8801PriorReturnBytes(
        review,
        missing.binding,
        missing.documents,
      ),
    Error,
    "differs from prior Schedule 3",
  );
});

Deno.test("8801 ordinary prior copy does not promote Schedule 3 foreign credit to general MTFTCE proof", async () => {
  const p = await source(
    xml.replace(
      "</ReturnData>",
      '<IRS1040Schedule3 documentId="PriorSchedule3"><ForeignTaxCreditAmt>125</ForeignTaxCreditAmt></IRS1040Schedule3></ReturnData>',
    ),
  );
  const r = await inspectForm8801PriorReturnBytes(
    packageFacts(),
    p.binding,
    p.documents,
  );
  assertEquals(r.minimumTaxForeignCreditAmountReconciled, false);
  await assertRejects(
    () =>
      inspectForm8801PriorReturnBytes(packageFacts(), {
        ...p.binding,
        schedule3_document_id: "PriorSchedule3",
      }, p.documents),
    Error,
    "requires the reviewed",
  );
  const facts = packageFacts();
  const general = {
    ...facts,
    minimum_tax_foreign_credit_exclusion_workpaper: {
      ...facts.minimum_tax_foreign_credit_exclusion_workpaper,
      method: "refigured_exclusion_items",
    },
  };
  const stillUnproved = await inspectForm8801PriorReturnBytes(
    general,
    p.binding,
    p.documents,
  );
  assertEquals(stillUnproved.minimumTaxForeignCreditAmountReconciled, false);
});

Deno.test("8801 reviewed zero elected MTFTCE reconciles absent Schedule 3 only to zero", async () => {
  const p = await source();
  const facts = packageFacts();
  const review = {
    ...facts,
    minimum_tax_foreign_credit_exclusion_workpaper: {
      ...facts.minimum_tax_foreign_credit_exclusion_workpaper,
      method: "without_form1116_election",
    },
  };
  const r = await inspectForm8801PriorReturnBytes(
    review,
    p.binding,
    p.documents,
  );
  assertEquals(r.minimumTaxForeignCreditAmountReconciled, true);
  await assertRejects(() =>
    inspectForm8801PriorReturnBytes(
      {
        ...review,
        minimum_tax_foreign_credit_exclusion_workpaper: {
          ...review.minimum_tax_foreign_credit_exclusion_workpaper,
          method: "invented",
        },
      },
      p.binding,
      p.documents,
    )
  );
});

Deno.test("8801 prior-bound staging copies all review/prior facts before awaits", async () => {
  const f = await fixture();
  const p = await source();
  const promise = stageForm8801PriorBoundReturn(
    f.inputs,
    f.binding,
    f.documents,
    p.binding,
    p.documents,
  );
  f.inputs.w2[0].box1_wages = 0;
  f.binding.sha256 = "0".repeat(64);
  f.documents[0].bytes.fill(0);
  p.binding.sha256 = "0".repeat(64);
  p.documents[0].bytes.fill(0);
  const r = await promise;
  assertEquals(r.lines[25], 5182);
  assertEquals(r.priorReturnBytesVerified, true);
});
