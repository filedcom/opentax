import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // IRS schema bundle is optional in CI.
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

Deno.test("Form 6781 requires Part I account rows for MeF", () => {
  assertThrows(
    () => buildMefXml({ form6781: { net_section_1256_gain: 100 } }, filer),
    Error,
    "account rows",
  );
});

Deno.test({
  name: "XSD: Form 6781 Part I gain and loss rows validate in TY2025 return",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form6781: {
      accounts: [
        { account_identification: "Broker A Form 1099-B", gain_loss: 12_000 },
        { account_identification: "Broker B Form 1099-B", gain_loss: -2_000 },
      ],
    },
  }, filer);
  assertStringIncludes(xml, "<Section1256CntrctsAcctInfoGrp>");
  assertStringIncludes(
    xml,
    "<ShortTermCapitalGainAmt>4000</ShortTermCapitalGainAmt>",
  );
  assertStringIncludes(
    xml,
    "<LongTermCapitalGainAmt>6000</LongTermCapitalGainAmt>",
  );
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
    "XSD: Form 6781 account inputs reach Schedule D lines 4 and 11 through the graph",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Test Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    form6781: {
      accounts: [
        { account_identification: "Broker A Form 1099-B", gain_loss: 12_000 },
        { account_identification: "Broker B Form 1099-B", gain_loss: -2_000 },
      ],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(
    xml,
    "<STGainOrLossFromFormsAmt>4000</STGainOrLossFromFormsAmt>",
  );
  assertStringIncludes(
    xml,
    "<LTGainOrLossFromFormsAmt>6000</LTGainOrLossFromFormsAmt>",
  );
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, xml);
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
