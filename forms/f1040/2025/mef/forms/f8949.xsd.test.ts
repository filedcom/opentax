import { assertEquals, assertStringIncludes } from "@std/assert";
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
  // The IRS schema bundle is optional in CI.
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
  name:
    "XSD: TY2025 Form 8949 keeps all twelve paper boxes in separate MeF groups",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const parts = ["A", "B", "C", "G", "H", "I", "D", "E", "F", "J", "K", "L"];
  const xml = buildMefXml({
    form8949: parts.map((part, index) => ({
      part,
      description: `Asset ${part}`,
      date_acquired: index < 6 ? "2025-01-01" : "2023-01-01",
      date_sold: "2025-06-01",
      proceeds: 1000 + index,
      cost_basis: 500,
      gain_loss: 500 + index,
      is_long_term: index >= 6,
    })),
  }, filer);
  assertStringIncludes(
    xml,
    "<TransRptOn1099DAThatShowBssInd>X</TransRptOn1099DAThatShowBssInd>",
  );
  assertStringIncludes(
    xml,
    "<NonDATransNotRptOn1099BOrDAInd>X</NonDATransNotRptOn1099BOrDAInd>",
  );
  assertStringIncludes(
    xml,
    "<DATransNotRptOn1099DAOrBInd>X</DATransNotRptOn1099DAOrBInd>",
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
