import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus, type FilerIdentity } from "../types.ts";
import { buildMefXml } from "../builder.ts";
import { scheduleJ, type ScheduleJFields } from "./schedule_j.ts";

const lines: ScheduleJFields = {
  line1: 100_000,
  line2a: 30_000,
  line2b: 0,
  line2c: 0,
  line3: 70_000,
  line4: 10_000,
  line5: 20_000,
  line6: 10_000,
  line7: 30_000,
  line8: 3_000,
  line9: 40_000,
  line10: 10_000,
  line11: 50_000,
  line12: 5_000,
  line13: 60_000,
  line14: 10_000,
  line15: 70_000,
  line16: 7_000,
  line17: 25_000,
  line18: 25_000,
  line19: 2_000,
  line20: 4_000,
  line21: 6_000,
  line22: 12_000,
  line23: 13_000,
};

const pending = {
  f1040: {
    filing_status: "single" as const,
    line15_taxable_income: 100_000,
    line16_income_tax: 13_000,
  },
};

Deno.test("Schedule J maps every native line in TY2025 schema order", () => {
  const xml = scheduleJ.build(lines, { pending });
  const tags = [
    "TaxableIncomeAmt", "ElectedFarmIncomeAmt",
    "ExcessNetLongTermCapGainAmt", "UnrecapturedPropertyGainAmt",
    "NetIncomeAmt", "CurrentTaxAmt", "ThirdPYTxblFarmIncmDetail",
    "SecondPYTxblFarmIncmDetail", "FirstPYTxblFarmIncmDetail",
    "TotalTaxTableAmt", "TentativeTax3rdPYRtnAmt",
    "TentativeTax2ndPYRtnAmt", "TentativeTax1stPYRtnAmt",
    "GrossFarmIncomeTaxAmt", "AverageFarmIncomeTaxAmt",
  ];
  for (let index = 1; index < tags.length; index++) {
    assertEquals(xml.indexOf(`<${tags[index - 1]}>`) < xml.indexOf(`<${tags[index]}>`), true);
  }
  assertStringIncludes(xml, "<AverageIncomeAmt>10000</AverageIncomeAmt>");
  assertStringIncludes(xml, "<AverageFarmIncomeTaxAmt>13000</AverageFarmIncomeTaxAmt>");
  assertEquals((xml.match(/<AverageIncomeAmt>/g) ?? []).length, 1);
  assertEquals((xml.match(/<TotalTaxTableAmt>/g) ?? []).length, 1);
});

Deno.test("Schedule J rejects incomplete, inconsistent, or unfiled lines", () => {
  assertEquals(scheduleJ.build([], { pending }), "");
  assertThrows(() => scheduleJ.build({ ...lines, line12: undefined } as unknown as ScheduleJFields, { pending }), Error, "line12 needs");
  assertThrows(() => scheduleJ.build({ ...lines, line17: 25_001 }, { pending }), Error, "do not reconcile");
  assertThrows(() => scheduleJ.build({ ...lines, line6: 10_000.5 }, { pending }), Error, "line6 needs");
  assertThrows(() => scheduleJ.build(lines, { pending: { f1040: { ...pending.f1040, line16_income_tax: 12_999 } } }), Error, "reconcile to Form 1040");
  assertThrows(() => scheduleJ.build(lines, { pending: { f1040: { ...pending.f1040, line16_income_tax: 13_001 } } }), Error, "reconcile to Form 1040");
  assertThrows(() => scheduleJ.build(lines), Error, "finalized Form 1040");
});

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
  name: "XSD: Schedule J native document follows H and precedes LEP",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({ ...pending, schedule_j: lines }, filer);
  assertStringIncludes(xml, "<IRS1040ScheduleJ documentId=");
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
