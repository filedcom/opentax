import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import {
  fieldName,
  filer,
  fixture,
  reference,
} from "./trust-k1-issued-copy.fixture.ts";
import { reviewTrustK1NativeCopies } from "./trust-k1-native-copy-review.ts";

const recipient = {
  pdf_reference: reference,
  person_name: "Test Taxpayer",
  address: {
    kind: "us",
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};

function changedFields(
  values: Record<string, string>,
  flags: readonly string[] = [],
) {
  return (pdf: PDFDocument) => {
    const form = pdf.getForm();
    for (const [key, value] of Object.entries(values)) {
      form.getTextField(fieldName(key)).setText(value);
    }
    for (const flag of flags) form.getCheckBox(fieldName(flag)).check();
    form.updateFieldAppearances(form.getDefaultFont());
  };
}

async function validateNative(xml: string) {
  const schema = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/EstateTrustIncomeTax/1041/IRS1041ScheduleK1/IRS1041ScheduleK1.xsd",
    import.meta.url,
  ).pathname;
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(
      path,
      xml.replace(
        "<IRS1041ScheduleK1>",
        '<IRS1041ScheduleK1 xmlns="http://www.irs.gov/efile" documentId="K1Review1">',
      ),
    );
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
}

Deno.test("trust K-1 native review projects all scalar and coded rows in IRS sequence and validates standalone XSD", async () => {
  const values: Record<string, string> = {};
  for (let n = 12; n <= 22; n++) values[`f1_${n}[0]`] = String(100 + n);
  values["f1_19[0]"] = "(123.50)";
  values["f1_13[0]"] = "200";
  values["f1_16[0]"] = "1000";
  values["f1_29[0]"] = "1,234.56";
  values["f1_9[0]"] = "03/01/2026";
  for (
    const [start, codes] of [
      [23, ["A", "B*", "C"]],
      [30, ["A", "B", "C*", "D", "F"]],
      [40, ["A", "B", "C", "D*", "J"]],
      [50, ["B", "A", "ZZ"]],
      [56, ["A", "B", "C", "D", "E", "ZZ"]],
    ] as const
  ) {
    for (const [i, code] of codes.entries()) {
      values[`f1_${start + i * 2}[0]`] = code;
      values[`f1_${start + i * 2 + 1}[0]`] = code === "B" && start === 50
        ? "125.25"
        : String(200 + start + i);
    }
  }
  const { source, documents } = await fixture(
    changedFields(values, ["c1_1[1]", "c1_2[0]", "c1_3[0]", "c1_4[0]"]),
  );
  const [copy] = await reviewTrustK1NativeCopies(source, filer, documents, [
    recipient,
  ]);
  const xml = copy.nativeXml;
  assertStringIncludes(
    xml,
    "<BeneficiaryPersonNm>Test Taxpayer</BeneficiaryPersonNm>",
  );
  assertStringIncludes(xml, "<SSN>111223333</SSN>");
  for (
    const expected of [
      "<InterestIncomeAmt>112</InterestIncomeAmt>",
      "<OrdinaryDividendsAmt>200</OrdinaryDividendsAmt>",
      "<QualifiedDividendsAmt>114</QualifiedDividendsAmt>",
      "<NetSTCapitalGainAmt>115</NetSTCapitalGainAmt>",
      "<NetLTCapitalGainAmt>1000</NetLTCapitalGainAmt>",
      "<Collectibles28PercentGainAmt>117</Collectibles28PercentGainAmt>",
      "<UnrecapturedSection1250GainAmt>118</UnrecapturedSection1250GainAmt>",
      "<OrdinaryBusinessIncomeAmt>120</OrdinaryBusinessIncomeAmt>",
      "<NetRentalIncomeRealEstateAmt>121</NetRentalIncomeRealEstateAmt>",
      "<OtherRentalIncomeAmt>122</OtherRentalIncomeAmt>",
      "<FinalK1Ind>X</FinalK1Ind>",
      "<AmendedK1Ind>X</AmendedK1Ind>",
      "<Form1041TFiledInd>X</Form1041TFiledInd>",
      "<FutureFilingNotRequiredInd>X</FutureFilingNotRequiredInd>",
      "<DomesticBeneficiaryInd>X</DomesticBeneficiaryInd>",
      "<DirectlyApprtnDeductionsCd>B*</DirectlyApprtnDeductionsCd><DirectlyApprtnDeductionsAmt>224</DirectlyApprtnDeductionsAmt>",
      "<FinalYearDeductionsCd>C*</FinalYearDeductionsCd><FinalYearDeductionsAmt>232</FinalYearDeductionsAmt>",
      "<AMTAdjustmentCd>D*</AMTAdjustmentCd><AMTAdjustmentAmt>243</AMTAdjustmentAmt>",
      "<CreditsAndRecaptureCd>B</CreditsAndRecaptureCd><CreditsAndRecaptureAmt>125</CreditsAndRecaptureAmt>",
      "<F1041K1OtherCd>ZZ</F1041K1OtherCd><F1041K1OtherAmt>261</F1041K1OtherAmt>",
    ]
  ) assertStringIncludes(xml, expected);
  assertStringIncludes(
    xml,
    "<OtherPortfolioIncomeLossAmt>-124</OtherPortfolioIncomeLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<EstateTaxDeductionAmt>1235</EstateTaxDeductionAmt>",
  );
  assertStringIncludes(xml, "<Form1041TFiledDt>2026-03-01</Form1041TFiledDt>");
  assertEquals((xml.match(/<BenefDirectlyApprtnDedGrp>/g) ?? []).length, 3);
  assertEquals((xml.match(/<BenefFinalYearDeductionGrp>/g) ?? []).length, 5);
  assertEquals((xml.match(/<AMTAdjustmentGrp>/g) ?? []).length, 5);
  assertEquals((xml.match(/<BenefCrAndCreditRecaptureGrp>/g) ?? []).length, 3);
  assertEquals((xml.match(/<BenefOtherInformationGrp>/g) ?? []).length, 6);
  assertEquals(
    copy.canonicalFields["f1_8[0]"],
    "Synthetic Fiduciary, 2 Test Way, Austin TX 78701",
  );
  assertEquals(copy.filingReady, false);
  assertEquals(copy.issuerVerified, false);
  await validateNative(xml);
});

Deno.test("trust K-1 native review preserves foreign recipient address separately from the current return", async () => {
  const { source, documents } = await fixture(
    changedFields({
      "f1_11[0]": "Test Taxpayer, 8 Test Road, London SW1A 1AA United Kingdom",
    }, ["c1_4[1]"]),
  );
  const [copy] = await reviewTrustK1NativeCopies(source, filer, documents, [{
    pdf_reference: reference,
    person_name: "Test Taxpayer",
    address: {
      kind: "foreign",
      line1: "8 Test Road",
      city: "London",
      country: "UK",
      postal_code: "SW1A 1AA",
      printed_country_name: "United Kingdom",
    },
  }]);
  assertStringIncludes(copy.nativeXml, "<CountryCd>UK</CountryCd>");
  assertStringIncludes(
    copy.nativeXml,
    "<ForeignPostalCd>SW1A 1AA</ForeignPostalCd>",
  );
  await validateNative(copy.nativeXml);
});

Deno.test("trust K-1 native review joins the spouse-owned copy to its own beneficiary", async () => {
  const { source, documents } = await fixture(changedFields({
    "f1_10[0]": "444-55-6666",
    "f1_11[0]": "Sam Taxpayer, 1 Test Way, Austin TX 78701",
  }));
  source.k1_trusts[0].beneficiary_ssn = "444556666";
  source.k1_trusts[0].box13_code_b_issued_copy_review.beneficiary_ssn =
    "444556666";
  const joint = {
    ...filer,
    filingStatus: 2,
    spouse: {
      ssn: "444556666",
      firstName: "Sam",
      lastName: "Taxpayer",
      nameControl: "TAXP",
    },
  };
  const [copy] = await reviewTrustK1NativeCopies(source, joint, documents, [{
    ...recipient,
    person_name: "Sam Taxpayer",
  }]);
  assertStringIncludes(copy.nativeXml, "<SSN>444556666</SSN>");
  assertStringIncludes(
    copy.nativeXml,
    "<BeneficiaryPersonNm>Sam Taxpayer</BeneficiaryPersonNm>",
  );
  await validateNative(copy.nativeXml);
  await assertRejects(() =>
    reviewTrustK1NativeCopies(source, joint, documents, [recipient])
  );
});

Deno.test("trust K-1 native review rejects reuse of one PDF as two claimed source documents", async () => {
  const { source, documents } = await fixture();
  source.k1_trusts.push({
    ...source.k1_trusts[0],
    source_document_reference: "another claimed copy",
  });
  await assertRejects(
    () =>
      reviewTrustK1NativeCopies(source, filer, documents, [recipient, {
        ...recipient,
        pdf_reference: "extra.pdf",
      }]),
    Error,
    "distinct references and SHA-256 digests",
  );
});

Deno.test("trust K-1 native review retains owner suffix, care-of and second address line", async () => {
  const { source, documents } = await fixture(changedFields({
    "f1_11[0]":
      "Test Taxpayer Jr\n% Jane Taxpayer\n1 Test Way\nApt 1\nAustin TX 78701",
  }));
  const [copy] = await reviewTrustK1NativeCopies(
    source,
    { ...filer, suffix: "Jr" },
    documents,
    [{
      ...recipient,
      person_name: "Test Taxpayer Jr",
      in_care_of_name: "% Jane Taxpayer",
      address: { ...recipient.address, line2: "Apt 1" },
    }],
  );
  assertStringIncludes(
    copy.nativeXml,
    "<BeneficiaryPersonNm>Test Taxpayer Jr</BeneficiaryPersonNm>",
  );
  assertStringIncludes(
    copy.nativeXml,
    "<InCareOfNm>% Jane Taxpayer</InCareOfNm>",
  );
  assertStringIncludes(
    copy.nativeXml,
    "<AddressLine2Txt>Apt 1</AddressLine2Txt>",
  );
  await validateNative(copy.nativeXml);
});

for (
  const [label, values, flags] of [
    ["unknown code", { "f1_52[0]": "U" }, []],
    ["orphan amount", { "f1_52[0]": "" }, []],
    ["statement-only amount", { "f1_53[0]": "STMT" }, []],
    ["malformed grouping", { "f1_12[0]": "12,34" }, []],
    ["negative nonnegative gain", { "f1_15[0]": "-1" }, []],
    ["impossible date", { "f1_9[0]": "02/30/2026" }, ["c1_2[0]"]],
    ["date without indicator", { "f1_9[0]": "03/01/2026" }, []],
    ["conflicting resident marks", {}, ["c1_4[0]", "c1_4[1]"]],
  ] as const
) {
  Deno.test(`trust K-1 native review rejects ${label}`, async () => {
    const { source, documents } = await fixture(changedFields(values, flags));
    await assertRejects(() =>
      reviewTrustK1NativeCopies(source, filer, documents, [recipient])
    );
  });
}

Deno.test("trust K-1 native beneficiary transcription requires exact printed recipient and distinct copy reference", async () => {
  const { source, documents } = await fixture();
  for (
    const transcriptions of [
      [],
      [recipient, recipient],
      [{ ...recipient, pdf_reference: "different.pdf" }],
      [{ ...recipient, person_name: "Other Person" }],
      [{
        ...recipient,
        address: { ...recipient.address, line1: "999 Test Way" },
      }],
      [{ ...recipient, address: { ...recipient.address, state: "ZZ" } }],
    ]
  ) {
    await assertRejects(() =>
      reviewTrustK1NativeCopies(source, filer, documents, transcriptions)
    );
  }
});
