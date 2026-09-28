import { assertEquals } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import { buildMefXml } from "../builder.ts";
import { LanguagePreferenceCode } from "../../../nodes/inputs/schedule_lep/index.ts";

const xsdPath = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
let xsdAvailable = false;
try {
  Deno.statSync(xsdPath);
  xsdAvailable = true;
} catch {
  // The IRS schema bundle is local-only.
}

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "Ada Lovelace",
  nameControl: "LOVE",
  firstName: "Ada",
  lastName: "Lovelace",
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.MarriedFilingJointly,
  spouse: {
    ssn: "987654321",
    firstName: "Grace",
    lastName: "Hopper",
    nameControl: "HOPP",
  },
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test({
  name: "TY2025 XSD: separate Schedule LEP taxpayer and spouse preferences",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({ schedule_lep: { requests: [
    { person: "taxpayer", language_preference_code: LanguagePreferenceCode.Spanish },
    { person: "spouse", language_preference_code: LanguagePreferenceCode.Cancel },
  ] } }, filer);
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
});
