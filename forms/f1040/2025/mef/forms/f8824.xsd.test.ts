import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildMefBundle, buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import type { MefFormsPending } from "../types.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // Local IRS schema bundle is optional.
}

const filer: FilerIdentity = {
  fullName: "Test Taxpayer",
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test({
  name: "XSD: Form 8824 pure exchange validates in TY2025 return",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form8824: {
      relinquished_description: "Investment land in Austin Texas",
      received_description: "Investment land in Dallas Texas",
      date_acquired: "2020-01-15",
      date_transferred: "2025-04-01",
      date_identified: "2025-04-20",
      date_received: "2025-06-01",
      return_due_date_including_extensions: "2026-04-15",
      related_party: false,
      recapture_applies: false,
      multiple_like_kind_properties: false,
      installment_method_applies: false,
      property_used_as_home: false,
      replacement_property_category: "nondepreciable_land",
      relinquished_basis: 100_000,
      received_fmv: 200_000,
    },
  }, filer);
  assertStringIncludes(xml, "<IRS8824 ");
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
});

Deno.test({
  name:
    "XSD: Form 8824 business exchange reaches linked MeF documents through the graph",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    filing_status: "single",
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    address_line1: "1 Test Way",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    form8824: {
      relinquished_description: "Business land in Austin Texas",
      received_description: "Business land in Dallas Texas",
      date_acquired: "2020-01-15",
      date_transferred: "2025-04-01",
      date_identified: "2025-04-20",
      date_received: "2025-06-01",
      return_due_date_including_extensions: "2026-04-15",
      related_party: false,
      recapture_applies: false,
      multiple_like_kind_properties: false,
      installment_method_applies: false,
      property_used_as_home: false,
      replacement_property_category: "nondepreciable_land",
      relinquished_basis: 100_000,
      received_fmv: 150_000,
      cash_received: 50_000,
      gain_type: "section_1231",
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const bundle = await buildMefBundle(
    result.pending as MefFormsPending,
    { filer: extractFilerIdentity(general), attachments: [] },
  );
  assertStringIncludes(
    bundle.xml,
    "<GainLossForm8824Amt>50000</GainLossForm8824Amt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<RealizedGainOrLossAmt>100000</RealizedGainOrLossAmt>",
  );
  assertEquals(bundle.attachments.length, 1);
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
});

Deno.test({
  name:
    "XSD: Form 8824 business boot links its PDF statement and Form 4797 line 5",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const bundle = await buildMefBundle({
    form8824: {
      relinquished_description: "Business land in Austin Texas",
      received_description: "Business land in Dallas Texas",
      date_acquired: "2020-01-15",
      date_transferred: "2025-04-01",
      date_identified: "2025-04-20",
      date_received: "2025-06-01",
      return_due_date_including_extensions: "2026-04-15",
      related_party: false,
      recapture_applies: false,
      multiple_like_kind_properties: false,
      installment_method_applies: false,
      property_used_as_home: false,
      replacement_property_category: "nondepreciable_land",
      relinquished_basis: 100_000,
      received_fmv: 150_000,
      cash_received: 50_000,
      gain_type: "section_1231",
    },
    form4797: {
      section_1231_gain: 50_000,
      gain_form8824: 50_000,
    },
  }, { filer, attachments: [] });
  assertEquals(bundle.attachments.length, 1);
  assertEquals(bundle.attachments[0].bytes[0], 0x25);
  assertStringIncludes(
    bundle.xml,
    "<GainLossForm8824Amt>50000</GainLossForm8824Amt>",
  );
  assertStringIncludes(bundle.xml, 'gainInMultiAssetExchStmtInd="true"');
  assertStringIncludes(
    bundle.xml,
    'referenceDocumentName="BinaryAttachment GeneralDependencySmall RealizedAndRecognizedGainInMultiAssetExchangesStmt"',
  );
  assertEquals(bundle.xml.includes("<CashFMVNetLiabRedByExpnssAmt>"), false);
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, bundle.xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
});

Deno.test({
  name:
    "XSD: Form 8824 investment land boot links its PDF statement and Schedule D",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const bundle = await buildMefBundle({
    form8824: {
      relinquished_description: "Investment land in Austin Texas",
      received_description: "Investment land in Dallas Texas",
      date_acquired: "2020-01-15",
      date_transferred: "2025-04-01",
      date_identified: "2025-04-20",
      date_received: "2025-06-01",
      return_due_date_including_extensions: "2026-04-15",
      related_party: false,
      recapture_applies: false,
      multiple_like_kind_properties: false,
      installment_method_applies: false,
      property_used_as_home: false,
      replacement_property_category: "nondepreciable_land",
      relinquished_basis: 100_000,
      received_fmv: 150_000,
      cash_received: 50_000,
      gain_type: "capital",
    },
    schedule_d: {
      line_11_form2439: 50_000,
      gain_form8824_lt: 50_000,
    },
  }, { filer, attachments: [] });
  assertStringIncludes(
    bundle.xml,
    "<LTGainOrLossFromFormsAmt>50000</LTGainOrLossFromFormsAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<RecognizedGainAmt>50000</RecognizedGainAmt>",
  );
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
});
