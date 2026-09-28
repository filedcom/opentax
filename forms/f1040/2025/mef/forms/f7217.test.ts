import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { SCENARIO_1040_12_FACTS } from "../../../e2e/ats/ty2025_cases.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { buildMefXml } from "../builder.ts";
import { form7217 } from "./f7217.ts";
import {
  Form7217PropertyTreatment,
  section731Form8949Transaction,
} from "../../../nodes/inputs/f7217/index.ts";
import { form7217Pdf } from "../../pdf/forms/f7217.ts";

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
const fileableItem = {
  ...item,
  distributed_properties: [{
    ...item.distributed_properties[0],
    description: "EQUIPMENT",
    property_treatment: Form7217PropertyTreatment.Section732Property,
    fair_market_value: 9_000,
    partner_basis_after_section_732: 6_000,
  }],
};

const gainItem = {
  ...fileableItem,
  cash_received: 15_000,
  us_tax_required_on_gain: true,
  distributed_properties: [{
    ...fileableItem.distributed_properties[0],
    partner_basis_after_section_732: 0,
  }],
  section_731_capital_gain_source: {
    k1_document_reference: "2025-orchid-k1",
    k1_box19_statement_reference: "2025-orchid-k1-march-01",
    k1_box19_statement_distribution_date: fileableItem.distribution_date,
    k1_partner_ssn: filer.primarySSN,
    k1_partnership_ein: fileableItem.partnership_ein,
    k1_box19_code_a_cash: 14_000,
    k1_box19_code_d_deemed_cash: 1_000,
    k1_box19_code_c_property_basis: 32_507,
    k1_box19_code_c_property_fmv: 9_000,
    k1_box19_code_b_section737_property: 0 as const,
    k1_box19_code_f_service_cash: 0 as const,
    k1_box19_code_g_service_property: 0 as const,
    outside_basis_workpaper_reference: "2025-orchid-outside-basis",
    outside_basis_workpaper_as_of_date: fileableItem.distribution_date,
    opening_outside_basis: 8_000,
    increases_before_distribution: 4_000,
    decreases_before_distribution: 2_000,
    partnership_interest_acquired_date: "2020-01-01",
    entire_interest_has_one_holding_period: true as const,
    not_section707_disguised_sale: true as const,
  },
};

Deno.test("Form 7217 section 731 cash gain matches the filed Form 8949 row in MeF and PDF", () => {
  const transaction = section731Form8949Transaction(gainItem);
  const pending = { form8949: [transaction] };
  const [xml] = form7217.build({ form7217s: [gainItem] }, { filer, pending });
  assertStringIncludes(xml, "<RecognizedGainAmt>5000</RecognizedGainAmt>");
  assertStringIncludes(xml, "<TotPrtnrBssAllocDistriPropAmt>0</TotPrtnrBssAllocDistriPropAmt>");
  const [pdf] = form7217Pdf.instances({ form7217s: [gainItem] }, filer, pending);
  assertEquals(pdf?.line7, 5_000);
  assertEquals(pdf?.line10, 0);
  assertThrows(
    () => form7217.build({ form7217s: [gainItem] }, { filer }),
    Error,
    "exactly one sourced Form 8949 capital-gain row",
  );
  assertThrows(
    () => form7217Pdf.instances?.({ form7217s: [gainItem] }, filer),
    Error,
    "exactly one sourced Form 8949 capital-gain row",
  );
});

Deno.test("Form 7217 gain rejects a wrong K-1 owner or tampered Form 8949 row", () => {
  const transaction = section731Form8949Transaction(gainItem)!;
  assertThrows(
    () => form7217.build({ form7217s: [{ ...gainItem, section_731_capital_gain_source: {
      ...gainItem.section_731_capital_gain_source,
      k1_partner_ssn: "111223333",
    } }] }, { filer, pending: { form8949: [transaction] } }),
    Error,
    "matching owner",
  );
  assertThrows(
    () => form7217.build({ form7217s: [gainItem] }, {
      filer,
      pending: { form8949: [{ ...transaction, gain_loss: 4_999 }] },
    }),
    Error,
    "exactly one sourced Form 8949 capital-gain row",
  );
});

Deno.test("Form 7217 emits a reconciled variant of the ATS Scenario 12 distribution", () => {
  const [xml] = form7217.build({ form7217s: [fileableItem] }, { filer });
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
  assertStringIncludes(xml, "<PropertyDesc>EQUIPMENT</PropertyDesc>");
  assertStringIncludes(xml, "<Sect734bBasisAdjInd>X</Sect734bBasisAdjInd>");
  assertStringIncludes(
    xml,
    "<TotPrtnrBssPropAftrSect732Amt>6000</TotPrtnrBssPropAftrSect732Amt>",
  );
});

Deno.test("Form 7217 produces one MeF document per distinct distribution date", () => {
  const xml = buildMefXml({
    f7217: {
      form7217s: [fileableItem, {
        ...fileableItem,
        distribution_date: "2025-04-01",
      }],
    },
  }, filer);
  assertStringIncludes(xml, 'documentCnt="3"');
  assertStringIncludes(xml, '<IRS7217 documentId="IRS72171">');
  assertStringIncludes(xml, '<IRS7217 documentId="IRS72172">');
});

Deno.test("Form 7217 native output reconciles section 731(c) security FMV to line 5b", () => {
  const security = {
    ...fileableItem,
    marketable_securities_fmv: 2_000,
    distributed_properties: [
      {
        ...fileableItem.distributed_properties[0],
        partner_basis_after_section_732: 5_000,
      },
      {
        description: "Listed shares",
        property_treatment:
          Form7217PropertyTreatment.Section731cMarketableSecurityTreatedAsMoney,
        section_731c_reduction_amount: 0,
        partnership_basis_before_distribution: 1_000,
        fair_market_value: 2_000,
        partner_basis_after_section_732: 1_000,
      },
    ],
  };
  const [xml] = form7217.build({ form7217s: [security] }, { filer });
  assertStringIncludes(xml, "<FMVMrktblSecRcvdAmt>2000</FMVMrktblSecRcvdAmt>");
  assertStringIncludes(
    xml,
    "<DistributedPropertyFMVAmt>2000</DistributedPropertyFMVAmt>",
  );
});

Deno.test("Form 7217 direct MeF export rejects incomplete or duplicate date records", () => {
  assertThrows(
    () => form7217.build({ form7217s: [item] }, { filer }),
    Error,
    "Part II needs classified property",
  );
  assertThrows(
    () =>
      form7217.build({ form7217s: [fileableItem, fileableItem] }, { filer }),
    Error,
    "one aggregate filing record",
  );
});

Deno.test("Form 7217 omits absent input and requires identity", () => {
  assertEquals(form7217.build({}), []);
  assertThrows(
    () => form7217.build({ form7217s: [fileableItem] }),
    Error,
    "filer identity",
  );
});
