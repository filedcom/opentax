import { test } from "bun:test";
import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { sha256Hex } from "../../2025/return-processing/prepared-source.ts";
import {
  cliExport,
  exportedReturn,
  validateAgainstXsd,
  xsdAvailable,
} from "./ats-export.ts";
import {
  scenario104004Attachments,
  scenario104004Input,
  SCENARIO_1040_04_ASSUMPTIONS,
  SCENARIO_1040_04_RECONCILIATION,
} from "./scenario_1040_04_input.ts";
import { SCENARIO_1040_04_FACTS, TY2025_ATS_CASES } from "./ty2025_cases.ts";

const recon = SCENARIO_1040_04_RECONCILIATION;
const facts = SCENARIO_1040_04_FACTS;

test("ATS 1040 Scenario 4 calculates the packet's wages, credits and limit", async () => {
  const { result } = await exportedReturn(
    scenario104004Input(),
    scenario104004Attachments(),
  );
  const form = result.pending.f1040;
  assertEquals(form.line1a_wages, recon.form1040Line1aWages);
  assertEquals(form.line25a_w2_withheld, recon.form1040Line25aWithholding);
  assertEquals(form.line15_taxable_income, recon.form1040Line15TaxableIncome);
  assertEquals(form.line16_income_tax, recon.form1040Line16Tax);
  assertEquals(
    result.pending.schedule3.line6a_total,
    recon.schedule3Line6aGeneralBusinessCredit,
  );
  assertEquals(form.line24_total_tax, recon.form1040Line24TotalTax);
  assertEquals(form.line35a_refund, recon.form1040Line25aWithholding);
  assertEquals(
    facts.form8835.solarKilowattHoursProducedAndSold *
      facts.form8835.printedSolarRate * 5,
    recon.printedForm3800SolarCredit,
  );
});

test("ATS 1040 Scenario 4 exports without force, passes the v5.4 XSD and carries the packet values", async () => {
  const { xml, rejects } = await exportedReturn(
    scenario104004Input(),
    scenario104004Attachments(),
  );
  assertEquals(rejects, []);
  if (await xsdAvailable()) await validateAgainstXsd(xml);
  const roots = [...xml.matchAll(/<(IRS[A-Za-z0-9]+) documentId=/g)].map((m) =>
    m[1]
  );
  for (
    const form of [
      "IRS1040",
      "IRSW2",
      "IRS1040Schedule3",
      "IRS3800",
      "IRS8835",
      "IRS8936",
      "IRS8936ScheduleA",
    ]
  ) assertEquals(roots.includes(form), true, form);
  for (
    const fragment of [
      "<WagesAmt>36014</WagesAmt>",
      "<WithholdingAmt>4581</WithholdingAmt>",
      "<CreditTransferElectionInd>true</CreditTransferElectionInd>",
      "<TransferRegistrationNum>PAZ123055555</TransferRegistrationNum>",
      "<TransferCreditEntityEIN>000000029</TransferCreditEntityEIN>",
      "<CreditTransferElectionAmt>13200</CreditTransferElectionAmt>",
      "<CurrentYearCreditAllowedAmt>2195</CurrentYearCreditAllowedAmt>",
      "<FacilityIRSIssdRegistrationNum>PAZ123055555</FacilityIRSIssdRegistrationNum>",
      "<BusinessNameLine1Txt>Texas Solar Energy</BusinessNameLine1Txt>",
      "<FacilityOwnerEIN>000000029</FacilityOwnerEIN>",
      "<AddressLine1Txt>808 Spring Love Lane</AddressLine1Txt>",
      "<FacilityLatitudeNum>+24.778212</FacilityLatitudeNum>",
      "<FacilityLongitudeNum>-103.743636</FacilityLongitudeNum>",
      "<FacilityConstructionStartDt>2017-08-15</FacilityConstructionStartDt>",
      "<FacilityPlacedInServiceDt>2023-09-22</FacilityPlacedInServiceDt>",
      "<ProjectNetOutputUnder1MWInd>X</ProjectNetOutputUnder1MWInd>",
      "<FcltyConstrBeganBfrSpcfdDtInd>X</FcltyConstrBeganBfrSpcfdDtInd>",
      "<FcltyStsfyWgAprntcshpRqrInd>X</FcltyStsfyWgAprntcshpRqrInd>",
      'dCSolarEnergyPropCapKWQty="10000"',
      'aCNameplateCapSolarEgyKWQty="765"',
      "<KwHrsPrdcdAndSoldSolarQty>440000</KwHrsPrdcdAndSoldSolarQty>",
      "<PriorYrMAGIAmountGrp><AdjustedGrossIncomeAmt>0</AdjustedGrossIncomeAmt>",
      "<BusinessInvstUsePartOfCrAmt>130</BusinessInvstUsePartOfCrAmt>",
      "<VehicleModelYr>2024</VehicleModelYr>",
      "<VehicleMakeNameTxt>BMW</VehicleMakeNameTxt>",
      "<VehicleModelNameTxt>i4 Gran Coupe</VehicleModelNameTxt>",
      "<VIN>1HGBH41JXMN108186</VIN>",
      "<VehiclePlacedInServiceDt>2025-01-25</VehiclePlacedInServiceDt>",
      "<Desc>Transfer Election Statement</Desc>",
    ]
  ) assertStringIncludes(xml, fragment);
});

test("ATS 1040 Scenario 4 purchased credit needs its exact transfer election statement", async () => {
  await assertRejects(
    () => exportedReturn(scenario104004Input()),
    Error,
    "needs a bundled PDF statement",
  );
  const [statement] = scenario104004Attachments();
  const altered = new Uint8Array(statement.bytes);
  altered[altered.indexOf(0x24)] = 0x23;
  await assertRejects(
    () => exportedReturn(scenario104004Input(), [{ ...statement, bytes: altered }]),
    Error,
    "transfer statement differs from retained bytes",
  );
  const input = scenario104004Input();
  assertEquals(
    input.f8835[0].purchase_source.statement_sha256,
    await sha256Hex(statement.bytes),
  );
  assertEquals(
    TY2025_ATS_CASES.find((c) => c.id === "1040-04")
      ?.requiredBinaryAttachmentDescriptions,
    [statement.description],
  );
});

test("ATS 1040 Scenario 4 exports through the CLI return store without force", async () => {
  const xml = await cliExport(
    scenario104004Input(),
    scenario104004Attachments(),
  );
  assertStringIncludes(
    xml,
    "<CreditTransferElectionAmt>13200</CreditTransferElectionAmt>",
  );
});

test("ATS 1040 Scenario 4 records every assumption and answer-key conflict", () => {
  assertEquals(SCENARIO_1040_04_ASSUMPTIONS.length > 0, true);
  for (const row of SCENARIO_1040_04_ASSUMPTIONS) {
    assertEquals(row.field.length > 0 && row.why.length > 0, true);
  }
  assertEquals(recon.packetConflicts.length, 8);
});
