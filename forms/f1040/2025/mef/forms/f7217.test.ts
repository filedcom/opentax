import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { SCENARIO_1040_12_FACTS } from "../../../e2e/ats/ty2025_cases.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { buildMefXml } from "../builder.ts";
import { form7217 } from "./f7217.ts";

const source = SCENARIO_1040_12_FACTS.form7217;
const filer: FilerIdentity = {
  primarySSN: SCENARIO_1040_12_FACTS.taxpayer.ssn,
  nameLine1: "Sam Gardenia",
  nameControl: "GARD",
  fullName: "Sam Gardenia",
  address: SCENARIO_1040_12_FACTS.taxpayer.address,
  filingStatus: FilingStatus.Single,
};
const item = {
  partnership_name: source.partnershipName,
  partnership_ein: source.partnershipEin,
  distribution_date: source.distributionDate,
  complete_liquidation: source.completeLiquidation,
  section_751b_sale_or_exchange: source.section751bSaleOrExchange,
  partner_adjusted_basis_before_distribution:
    source.partnerAdjustedBasisBeforeDistribution,
  cash_received: source.cashReceived,
  distributed_properties: source.distributedProperties.map((property) => ({
    description: property.description,
    partnership_basis_before_distribution:
      property.partnershipBasisBeforeDistribution,
    section_734b_basis_adjustment: property.section734bBasisAdjustment,
    partner_basis_after_section_732: property.partnerBasisAfterSection732,
  })),
};

Deno.test("Form 7217 emits the sourced ATS Scenario 12 distribution", () => {
  const [xml] = form7217.build({ form7217s: [item] }, { filer });
  assertStringIncludes(xml, "<PartnerPersonNm>Sam Gardenia</PartnerPersonNm>");
  assertStringIncludes(
    xml,
    "<DistributingPartnershipEIN>001040012</DistributingPartnershipEIN>",
  );
  assertStringIncludes(
    xml,
    "<PropertyDistributedDt>2025-03-01</PropertyDistributedDt>",
  );
  assertStringIncludes(
    xml,
    "<DistriLiqdtPrtnrIntPrtshpInd>false</DistriLiqdtPrtnrIntPrtshpInd>",
  );
  assertStringIncludes(
    xml,
    "<TotPrtshpBasisPropBfrDistriAmt>32507</TotPrtshpBasisPropBfrDistriAmt>",
  );
  assertStringIncludes(xml, "<RecognizedGainAmt>0</RecognizedGainAmt>");
  assertStringIncludes(
    xml,
    "<TotPrtnrBssAllocDistriPropAmt>6000</TotPrtnrBssAllocDistriPropAmt>",
  );
  assertStringIncludes(xml, "<PropertyDesc>CASH</PropertyDesc>");
  assertStringIncludes(xml, "<Sect734bBasisAdjInd>X</Sect734bBasisAdjInd>");
  assertStringIncludes(
    xml,
    "<TotPrtnrBssPropAftrSect732Amt>4000</TotPrtnrBssPropAftrSect732Amt>",
  );
});

Deno.test("Form 7217 produces one MeF document per distribution", () => {
  const xml = buildMefXml({ f7217: { form7217s: [item, item] } }, filer);
  assertStringIncludes(xml, 'documentCnt="3"');
  assertStringIncludes(xml, '<IRS7217 documentId="IRS72171">');
  assertStringIncludes(xml, '<IRS7217 documentId="IRS72172">');
});

Deno.test("Form 7217 omits absent input and requires identity", () => {
  assertEquals(form7217.build({}), []);
  assertThrows(
    () => form7217.build({ form7217s: [item] }),
    Error,
    "filer identity",
  );
});
