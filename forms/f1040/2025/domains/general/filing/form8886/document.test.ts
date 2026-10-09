import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  buildForm8886Document,
  buildForm8886Documents,
  form8886Narrative,
  form8886NativeNarrative,
} from "./document.ts";
import { disclosureFixture } from "./source.fixture.ts";
import { ReportableCategory, TaxBenefit } from "./source.ts";

const schema = new URL(
  "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Common/IRS8886/IRS8886.xsd",
  import.meta.url,
);

async function validate(
  xml: string,
  root = "IRS8886",
  schemaUrl = schema,
): Promise<void> {
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(
      path,
      xml.replace(
        `<${root}`,
        `<${root} xmlns="http://www.irs.gov/efile"${
          xml.includes('documentId="') ? "" : ' documentId="IRS8886Test"'
        }`,
      ),
    );
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schemaUrl.pathname, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
}

Deno.test("Form 8886 disclosure preserves lifetime benefit, identity and statement numbering in XSD-valid native XML", async () => {
  const xml = buildForm8886Document(disclosureFixture, "111223333", 2, 3);
  assertStringIncludes(
    xml,
    "<StatementCnt>2</StatementCnt><TotalStatementCnt>3</TotalStatementCnt>",
  );
  assertStringIncludes(
    xml,
    "<InitialParticipatedYr>2024</InitialParticipatedYr>",
  );
  assertStringIncludes(xml, "<InitialYearFilerInd>X</InitialYearFilerInd>");
  assertStringIncludes(xml, "<TotalTaxBenefitAmt>2000000</TotalTaxBenefitAmt>");
  assertStringIncludes(xml, "<SSN>222334444</SSN>");
  await validate(xml);
});

Deno.test("Form 8886 native continuation retains every narrative word and links its dedicated XSD root", async () => {
  const source = {
    ...disclosureFixture,
    transaction_steps:
      "Purchased assets and borrowed to finance them. ".repeat(100) +
      "FINAL TRANSACTION SENTENCE.",
  };
  const before = JSON.stringify(source);
  const narrative = form8886NativeNarrative(source);
  assertEquals(
    [narrative.initial, ...narrative.continuations].join(" "),
    `Disclosure taxpayer SSN ${source.taxpayer_ssn}. ${
      form8886Narrative(source)
    }`,
  );
  assertEquals(narrative.initial.length <= 1000, true);
  const documents = buildForm8886Documents(source, "111223333", 2, 3);
  assertEquals(documents.continuationId, "F8886Expected2");
  assertStringIncludes(
    documents.formXml,
    'referenceDocumentId="F8886Expected2"',
  );
  assertStringIncludes(
    documents.continuationXml!,
    'documentId="F8886Expected2"',
  );
  assertStringIncludes(
    documents.continuationXml!,
    "FINAL TRANSACTION SENTENCE.",
  );
  assertEquals(documents.continuationXml!.includes("<EIN>111223333"), false);
  assertEquals(JSON.stringify(source), before);
  await validate(documents.formXml);
  await validate(
    documents.continuationXml!,
    "ContF8886ExpctTaxBnftExpln",
    new URL("ContinuationOfForm8886ExpectedTaxBenefitsExplanation.xsd", schema),
  );
});

Deno.test("Form 8886 continuation boundary does not add an empty statement or lose multi-entry narrative text", async () => {
  const source = { ...disclosureFixture, transaction_steps: "Brief steps." };
  const remainingLength = 1000 - form8886NativeNarrative(source).initial.length;
  const exact = {
    ...source,
    transaction_steps: source.transaction_steps + "x".repeat(remainingLength),
  };
  assertEquals(form8886NativeNarrative(exact).initial.length, 1000);
  assertEquals(
    buildForm8886Documents(exact, "111223333", 1, 1).continuationXml,
    undefined,
  );
  const large = {
    ...source,
    transaction_steps: "Asset steps. ".repeat(7000),
    expected_tax_treatment: "Reviewed treatment. ".repeat(4000),
  };
  const narrative = form8886NativeNarrative(large);
  assertEquals(narrative.continuations.length, 2);
  assertEquals(
    narrative.continuations.every((part) => part.length <= 100000),
    true,
  );
  assertEquals(
    [narrative.initial, ...narrative.continuations].join(" "),
    `Disclosure taxpayer SSN ${large.taxpayer_ssn}. ${
      form8886Narrative(large)
    }`,
  );
  const documents = buildForm8886Documents(large, "111223333", 1, 1);
  await validate(
    documents.continuationXml!,
    "ContF8886ExpctTaxBnftExpln",
    new URL("ContinuationOfForm8886ExpectedTaxBenefitsExplanation.xsd", schema),
  );
  assertThrows(() =>
    buildForm8886Document(disclosureFixture, "111223333", 1, 1, "unused")
  );
  assertThrows(() =>
    buildForm8886Document(large, "111223333", 1, 1, "invalid id")
  );
});

Deno.test("Form 8886 simultaneous category and tax-credit/other flags retain IRS element order", async () => {
  const xml = buildForm8886Document(
    {
      ...disclosureFixture,
      categories: Object.values(ReportableCategory),
      published_guidance: "Reviewed identifying guidance",
      confidentiality_description:
        "Contract limits disclosure of the tax structure.",
      contractual_protection_description:
        "Fees may be refunded if the tax result is not sustained.",
      benefits: [...disclosureFixture.benefits, {
        ...disclosureFixture.benefits[0],
        kind: TaxBenefit.Credit,
        anticipated_amount: 100,
      }, {
        ...disclosureFixture.benefits[0],
        kind: TaxBenefit.Other,
        description: "Other benefit",
        anticipated_amount: 200,
      }],
    },
    "111223333",
    1,
    1,
  );
  assertStringIncludes(
    xml,
    '<OtherInd otherTaxBenefitDesc="Other benefit">X</OtherInd><TaxCreditsInd>X</TaxCreditsInd>',
  );
  await validate(xml);
});

Deno.test("Form 8886 refuses a different taxpayer, invalid numbering and truncating disclosure narratives", () => {
  assertThrows(() =>
    buildForm8886Document(disclosureFixture, "444556666", 1, 1)
  );
  assertThrows(() =>
    buildForm8886Document(disclosureFixture, "111223333", 2, 1)
  );
  assertThrows(
    () =>
      buildForm8886Document(
        {
          ...disclosureFixture,
          transaction_steps: "Long disclosure ".repeat(100),
        },
        "111223333",
        1,
        1,
      ),
    Error,
    "refusing to truncate",
  );
});

Deno.test("Form 8886 general continuations preserve long names, involvement and original additional RTNs in line order", async () => {
  const source = {
    ...disclosureFixture,
    transactions: [{
      ...disclosureFixture.transactions[0],
      name: "Reviewed asset acquisition and disposal ".repeat(5).trim(),
      reportable_transaction_numbers: ["MA123456789", "MA987654321"],
    }],
    parties: [{
      ...disclosureFixture.parties[0],
      name: "Advisor Named Example ".repeat(3).trim(),
      involvement_description:
        "Participated in financing. ".repeat(260).trim() +
        " INVOLVEMENT FINAL SENTENCE.",
    }],
    benefits: [...disclosureFixture.benefits, {
      ...disclosureFixture.benefits[0],
      kind: TaxBenefit.Other,
      description:
        "Additional income tax consequence over the transaction life.",
      anticipated_amount: 10,
    }],
  };
  const before = JSON.stringify(source);
  const documents = buildForm8886Documents(source, "111223333", 1, 1);
  assertStringIncludes(
    documents.formXml,
    'referenceDocumentName="GeneralDependencySmall"',
  );
  assertStringIncludes(
    documents.formXml,
    "<TransactionOrTaxShelterNum>MA123456789</TransactionOrTaxShelterNum>",
  );
  const extra = documents.generalContinuations.map((row) => row.xml).join("");
  assertStringIncludes(extra, "MA987654321");
  assertStringIncludes(extra, "INVOLVEMENT FINAL SENTENCE.");
  const labels = documents.generalContinuations.map((row) =>
    row.xml.match(
      /<FormLineOrInstructionRefTxt>(.*?)<\/FormLineOrInstructionRefTxt>/,
    )![1]
  );
  const order = labels.map((label) => Number(label.charAt(5)));
  assertEquals(order, [...order].sort((a, b) => a - b));
  const initial =
    documents.formXml.match(/<InvolvementDesc>(.*?)<\/InvolvementDesc>/)![1];
  const continued = documents.generalContinuations.filter((row) =>
    row.xml.includes("Line 8 party 1 involvement")
  ).map((row) =>
    row.xml.match(
      /<AttachmentInformationSmllDesc>(.*?)<\/AttachmentInformationSmllDesc>/,
    )![1]
  );
  assertEquals(
    [initial, ...continued].join(" "),
    source.parties[0].involvement_description,
  );
  for (const row of documents.generalContinuations) {
    assertStringIncludes(documents.formXml, row.documentId);
    await validate(
      row.xml,
      "GeneralDependencySmall",
      new URL("../Dependencies/GeneralDependencySmall.xsd", schema),
    );
  }
  await validate(documents.formXml);
  assertEquals(JSON.stringify(source), before);
  assertThrows(
    () =>
      buildForm8886Documents(
        {
          ...source,
          transactions: [{
            ...source.transactions[0],
            reportable_transaction_numbers: ["MA-123456789"],
          }],
        },
        "111223333",
        1,
        1,
      ),
    Error,
    "no workaround applied",
  );
});

Deno.test("Form 8886 lifetime benefit aggregation stays within the native fifteen-digit amount", async () => {
  const source = {
    ...disclosureFixture,
    benefits: [{
      ...disclosureFixture.benefits[0],
      anticipated_amount: 999_999_999_999_998,
    }, {
      ...disclosureFixture.benefits[0],
      kind: TaxBenefit.Credit,
      anticipated_amount: 1,
    }],
  };
  const xml = buildForm8886Documents(source, "111223333", 1, 1).formXml;
  assertStringIncludes(
    xml,
    "<TotalTaxBenefitAmt>999999999999999</TotalTaxBenefitAmt>",
  );
  await validate(xml);
  assertThrows(
    () =>
      buildForm8886Documents(
        {
          ...source,
          benefits: [source.benefits[0], {
            ...source.benefits[1],
            anticipated_amount: 2,
          }],
        },
        "111223333",
        1,
        1,
      ),
    Error,
    "exceeds the native amount field",
  );
});

Deno.test("Form 8886 native copies explicitly identify primary and spouse taxpayers without using an EIN or changing printable narrative", async () => {
  for (const taxpayer of ["111223333", "444556666"]) {
    const source = { ...disclosureFixture, taxpayer_ssn: taxpayer };
    const narrative = form8886Narrative(source);
    const documents = buildForm8886Documents(source, taxpayer, 1, 1);
    assertStringIncludes(
      documents.formXml,
      `<ExpectedTaxBenefitsExplnTxt>Disclosure taxpayer SSN ${taxpayer}. `,
    );
    assertEquals(documents.formXml.includes(`<EIN>${taxpayer}</EIN>`), false);
    assertEquals(form8886Narrative(source), narrative);
    await validate(documents.formXml);
  }
});
