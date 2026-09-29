import { assertEquals } from "@std/assert";
import { buildForm8820Document } from "./f8820.ts";
import { form8820ControlledGroupStatement } from "./f8820_controlled_group_statement.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Common/IRS8820/IRS8820.xsd",
  import.meta.url,
).pathname;
const STATEMENT_XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Common/Dependencies/ControlledGroupMembersStatement.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

Deno.test({
  name: "XSD: Form 8820 source document maps Part I and orphan-drug details",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildForm8820Document({
    f8820s: [{
      generic_name: "Test Orphan Drug",
      designation_application_number: "FDA-123",
      designation_date: "2024-03-15",
      qualified_clinical_testing_expenses: 100_000,
      qualifying_testing_confirmed: true,
      expenses_exclude_third_party_funding: true,
      expenses_not_used_for_research_credit: true,
    }],
    reduced_section280c_credit_election: true,
    form8932_overlapping_wage_credit: 1_250,
    subject_to_passive_activity_limit: false,
  }).replace(
    "<IRS8820>",
    '<IRS8820 xmlns="http://www.irs.gov/efile" documentId="IRS88201">',
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

Deno.test({
  name: "XSD: Form 8820 controlled-group allocation and linked statement",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const source = {
    f8820s: [{
      generic_name: "Test Orphan Drug",
      designation_application_number: "FDA-123",
      designation_date: "2024-03-15",
      qualified_clinical_testing_expenses: 100_000,
      qualifying_testing_confirmed: true,
      expenses_exclude_third_party_funding: true,
      expenses_not_used_for_research_credit: true,
    }],
    controlled_group: {
      group_classification_document_reference: "Section 41(f)(1)(B) analysis",
      taxpayer_member_ein: "123456789",
      members: [{
        ein: "123456789",
        business_name: "Taxpayer business",
        qualified_clinical_testing_expenses: 100_000,
      }, {
        ein: "987654321",
        business_name: "Related business",
        qualified_clinical_testing_expenses: 200_000,
      }],
    },
    reduced_section280c_credit_election: true,
    form8932_overlapping_wage_credit: 0,
    subject_to_passive_activity_limit: false,
  };
  const documents = [{
    xml: buildForm8820Document(source, ["ControlledGroupMembersStmt1"]),
    schema: XSD_PATH,
    root: "IRS8820",
  }, {
    xml: form8820ControlledGroupStatement.build({}, {
      pending: { f8820: source },
    })[0],
    schema: STATEMENT_XSD_PATH,
    root: "ControlledGroupMembersStmt",
  }];
  for (const { xml, schema, root } of documents) {
    const path = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(
        path,
        xml.replace(
          `<${root}>`,
          `<${root} xmlns="http://www.irs.gov/efile" documentId="${root}1">`,
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
});

Deno.test({
  name: "XSD: Form 8820 keeps a zero-credit reduced election",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildForm8820Document({
    f8820s: [{
      generic_name: "Test Orphan Drug",
      designation_application_number: "FDA-123",
      designation_date: "2024-03-15",
      qualified_clinical_testing_expenses: 0,
      qualifying_testing_confirmed: true,
      expenses_exclude_third_party_funding: true,
      expenses_not_used_for_research_credit: true,
    }],
    reduced_section280c_credit_election: true,
    form8932_overlapping_wage_credit: 0,
    subject_to_passive_activity_limit: false,
  }).replace(
    "<IRS8820>",
    '<IRS8820 xmlns="http://www.irs.gov/efile" documentId="IRS88201">',
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

Deno.test({
  name: "XSD: Form 8820 reports mixed pass-through line 3 and line 4",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildForm8820Document({
    f8820s: [{
      generic_name: "Test Orphan Drug",
      designation_application_number: "FDA-123",
      designation_date: "2024-03-15",
      qualified_clinical_testing_expenses: 100_000,
      qualifying_testing_confirmed: true,
      expenses_exclude_third_party_funding: true,
      expenses_not_used_for_research_credit: true,
    }],
    pass_through_credits: [{
      source_type: "partnership",
      entity_ein: "123456789",
      source_document_reference: "2025 Schedule K-1 orphan-drug credit",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    }],
    reduced_section280c_credit_election: true,
    form8932_overlapping_wage_credit: 0,
    subject_to_passive_activity_limit: false,
  }).replace(
    "<IRS8820>",
    '<IRS8820 xmlns="http://www.irs.gov/efile" documentId="IRS88201">',
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
