import { assertEquals, assertStringIncludes } from "@std/assert";
import { calculateForm8814 } from "../../../nodes/inputs/f8814/index.ts";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test({
  name: "XSD: 2025 Form 8814 child election, 1040 indicator, and line 16",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: {
      filing_status: "single",
      line16_income_tax: 135,
      form8814_tax: 135,
    },
    form8814: {
      items: [calculateForm8814({
        child_name: "Alex Rivera",
        child_name_control: "RIVE",
        child_ssn: "987654321",
        child_age_eligible: true,
        child_required_to_file: true,
        child_income_only_permitted_types: true,
        child_no_joint_return: true,
        child_no_estimated_payments: true,
        child_no_withholding: true,
        parent_eligible_to_elect: true,
        interest_income: 3700,
      })],
    },
  }, filer);
  assertStringIncludes(xml, "<IRS8814");
  assertStringIncludes(xml, "<Form8814Ind");
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test({
  name: "XSD: Form 8814 child interest statement links only the adjusted child",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const child = {
    child_name: "Alex Rivera",
    child_name_control: "RIVE",
    child_ssn: "987654321",
    child_age_eligible: true,
    child_required_to_file: true,
    child_income_only_permitted_types: true,
    child_no_joint_return: true,
    child_no_estimated_payments: true,
    child_no_withholding: true,
    parent_eligible_to_elect: true,
    interest_income: 3000,
  } as const;
  const xml = buildMefXml({
    f1040: {
      filing_status: "single",
      form8814_tax: 270,
      line16_income_tax: 270,
    },
    form8814: {
      items: [
        calculateForm8814(child),
        calculateForm8814({
          ...child,
          child_name: "Jamie Rivera",
          child_ssn: "987654322",
          interest_adjustments: {
            nominee_distribution: 500,
            accrued_interest: 100,
            abp_adjustment: 50,
            oid_adjustment: 25,
          },
          dividend_income: 300,
          dividend_nominee_distribution: 200,
          capital_gain_distributions: 100,
          capital_gain_nominee_distribution: 50,
          child_had_foreign_account: true,
          child_foreign_trust_part_iii_event: true,
        }),
      ],
    },
    schedule_b: {
      form8814_foreign_account: true,
      foreign_accounts_question: true,
      fincen_form114_required: false,
      form8814_foreign_trust: true,
      foreign_trust_question: true,
    },
  }, filer);
  assertStringIncludes(xml, "<ChildTaxableInterestStmt documentId=");
  assertStringIncludes(
    xml,
    "<NomineeDistributionCd>ND</NomineeDistributionCd>",
  );
  assertStringIncludes(
    xml,
    "<ChildNonTaxableInterestTypeCd>ABP ADJUSTMENT</ChildNonTaxableInterestTypeCd>",
  );
  const forms = [
    ...xml.matchAll(/<IRS8814 documentId="[^"]+">([\s\S]*?)<\/IRS8814>/g),
  ];
  assertEquals(forms.length, 2);
  assertEquals(
    forms[0][1].includes(
      'referenceDocumentName="ChildTaxableInterestStatement"',
    ),
    false,
  );
  assertStringIncludes(
    forms[1][1],
    'referenceDocumentName="ChildTaxableInterestStatement"',
  );
  assertStringIncludes(
    forms[1][1],
    'nomineeDistributionCd="ND" nomineeDistributionAmt="200"',
  );
  assertStringIncludes(
    forms[1][1],
    'nomineeDistributionCd="ND" nomineeDistributionAmt="50"',
  );
  assertStringIncludes(xml, "<Form8814LiteralCd>FORM8814</Form8814LiteralCd>");
  assertStringIncludes(
    xml,
    "<ForeignAccountsQuestionInd>true</ForeignAccountsQuestionInd>",
  );
  assertStringIncludes(xml, "<FinCENForm114Ind>false</FinCENForm114Ind>");
  assertStringIncludes(
    xml,
    "<TrustFormLiteralCd>FORM8814</TrustFormLiteralCd>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTrustQuestionInd>true</ForeignTrustQuestionInd>",
  );
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});
