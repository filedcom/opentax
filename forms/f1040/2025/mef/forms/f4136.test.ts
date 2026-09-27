import { assertStringIncludes, assertThrows } from "@std/assert";
import { form4136 } from "./f4136.ts";
const certifications = {
  undyed_fuel_confirmed: true,
  right_to_claim_not_waived: true,
  credit_card_issuer_certificate_not_provided: true,
  not_highway_vehicle: true,
  not_noncommercial_motorboat: true,
  exported_fuel_confirmed: true,
} as const;
const activityContext = {
  claimant_context: "business" as const,
  additional_activities: [],
  primary_activity_has_most_credit: true as const,
};

const fields = {
  ...activityContext,
  business: {
    qualifying_business_activity: true as const,
    claimant_is_ultimate_purchaser: true as const,
    business_name: "Example Farm",
    principal_activity_code: "111000",
    equipment_make: "Example",
    equipment_model: "Tractor",
    equipment_type: "farm tractor",
    purchase_records_confirmed: true as const,
    no_duplicate_excise_claim: true as const,
  },
  claims: [
    {
      ...certifications,
      line: "1a" as const,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    },
    {
      ...certifications,
      line: "3b" as const,
      unit: "gallons",
      qualified_quantity: 100,
      actual_fuel_cost: 400,
    },
  ],
};

Deno.test("Form 4136 XML emits business and source-backed fuel groups", () => {
  const xml = form4136.build(fields, {
    pending: { schedule3: { line12_fuel_tax_credit: 42.6 } },
  });
  assertStringIncludes(xml, "<IRS4136>");
  assertStringIncludes(
    xml,
    "<QlfyUsageFuelsEligFTCInd>true</QlfyUsageFuelsEligFTCInd>",
  );
  assertStringIncludes(
    xml,
    "<OffHwyBusUseGasolineGalsQty>100</OffHwyBusUseGasolineGalsQty>",
  );
  assertStringIncludes(
    xml,
    "<FarmPrpsUndyedDslFuelGalsQty>100</FarmPrpsUndyedDslFuelGalsQty>",
  );
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>43</TotalFuelTaxCreditAmt>",
  );
});

Deno.test("Form 4136 XML rejects a Schedule 3 source mismatch", () => {
  assertThrows(
    () =>
      form4136.build(fields, {
        pending: { schedule3: { line12_fuel_tax_credit: 40 } },
      }),
    Error,
    "does not match Schedule 3",
  );
});

Deno.test("Form 4136 XML separates other-use and exported gasoline", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: [
      {
        ...certifications,
        line: "1c",
        type_of_use: "05",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "1d",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
    ],
  }, { pending: { schedule3: { line12_fuel_tax_credit: 36.7 } } });
  assertStringIncludes(xml, "<OtherNontaxableUseGasolineDtl>");
  assertStringIncludes(
    xml,
    "<NontaxableUseOfFuelTypeCd>05</NontaxableUseOfFuelTypeCd>",
  );
  assertStringIncludes(xml, "<ExportedNontaxableUseGasGrp>");
  assertStringIncludes(
    xml,
    '<ExportedNontxUseOfGasCrAmt creditReferenceNum="411">18</ExportedNontxUseOfGasCrAmt>',
  );
});

Deno.test("Form 4136 XML carries variable-use aviation, kerosene, and alternative fuel groups", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: [
      {
        ...certifications,
        line: "2b",
        type_of_use: "01",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "4a",
        type_of_use: "02",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "5c",
        type_of_use: "01",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "5d",
        type_of_use: "01",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "11a",
        type_of_use: "02",
        unit: "GGE",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "11c",
        type_of_use: "02",
        unit: "GGE",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
    ],
  }, {
    pending: { schedule3: { line12_fuel_tax_credit: 126.3 } },
  });
  assertStringIncludes(xml, "<OthNontaxableAviationGasGrp>");
  assertStringIncludes(xml, "<NontaxableUseUndyedKeroseneDtl>");
  assertStringIncludes(xml, "<NontxKrsnUsedAvnTxd244Grp>");
  assertStringIncludes(xml, "<NontxKrsnUsedAvnTxd219Grp>");
  assertStringIncludes(xml, "<NontxLiquefiedPetroleumGasGrp>");
  assertStringIncludes(xml, "<NontxCompressedNaturalGasGrp>");
});

Deno.test("Form 4136 XML requires the 2025 business and actual-cost facts", () => {
  assertThrows(
    () =>
      form4136.build({ claims: fields.claims }, {
        pending: { schedule3: { line12_fuel_tax_credit: 42.6 } },
      }),
  );
  assertThrows(
    () =>
      form4136.build({
        ...fields,
        claims: [{
          line: "1a",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 0,
        }],
      }, {
        pending: { schedule3: { line12_fuel_tax_credit: 18.3 } },
      }),
  );
});

Deno.test("Form 4136 XML covers all non-bus line 11 alternative fuels", () => {
  const lines = [
    "11a",
    "11b",
    "11c",
    "11d",
    "11e",
    "11f",
    "11g",
    "11h",
  ] as const;
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: lines.map((line) => ({
      ...certifications,
      line,
      type_of_use: "02",
      unit: line === "11a" || line === "11c"
        ? "GGE" as const
        : line === "11g"
        ? "DGE" as const
        : "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    })),
  }, { pending: { schedule3: { line12_fuel_tax_credit: 164.4 } } });
  for (
    const tag of [
      "NontxLiquefiedPetroleumGasGrp",
      "NontxPSeriesFuelsGrp",
      "NontxCompressedNaturalGasGrp",
      "NontxLiquefiedHydrogenGrp",
      "NontxLiqfdFuelFromCoalGrp",
      "NontxLiqfdFuelDerBiomassGrp",
      "NontxLiquefiedNaturalGasGrp",
      "NontxLiqfdGasDerBiomassGrp",
    ]
  ) {
    assertStringIncludes(xml, `<${tag}>`);
  }
});

Deno.test("Form 4136 XML separates reduced-rate bus use from standard use", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: [
      {
        ...certifications,
        line: "11a",
        type_of_use: "05",
        unit: "GGE",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "11a",
        type_of_use: "02",
        unit: "GGE",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
    ],
  }, { pending: { schedule3: { line12_fuel_tax_credit: 29.2 } } });
  assertStringIncludes(xml, "<BusNontxLiquifiedPetroleumGas>");
  assertStringIncludes(xml, "<FuelTaxLocalBusCd>BUS</FuelTaxLocalBusCd>");
  assertStringIncludes(xml, "<CreditRt>0.109</CreditRt>");
  assertStringIncludes(xml, "<NontxLiquefiedPetroleumGasGrp>");
  assertStringIncludes(
    xml,
    '<NontxLiquefiedPtrlmGasCrAmt creditReferenceNum="419">29</NontxLiquefiedPtrlmGasCrAmt>',
  );
});

Deno.test("Form 4136 XML combines two activities and links both Schedule A PDFs", () => {
  const multi = {
    ...fields,
    business: { ...fields.business, business_ein: "123456789" },
    claims: [{
      ...certifications,
      line: "1a" as const,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    }],
    additional_activities: [{
      business: {
        ...fields.business,
        business_name: "Second Activity",
        business_ein: "987654321",
      },
      claims: [{
        ...certifications,
        line: "1a" as const,
        unit: "gallons" as const,
        qualified_quantity: 50,
        actual_fuel_cost: 150,
      }],
    }],
  };
  const xml = form4136.build(multi, {
    pending: { schedule3: { line12_fuel_tax_credit: 27.45 } },
    documentIdsByPendingKey: { f4136: ["IRS4136_1"] },
    documentIdsByAttachmentFileName: {
      "Form4136ScheduleA1.pdf": "BinaryAttachment1",
      "Form4136ScheduleA2.pdf": "BinaryAttachment2",
    },
  });
  assertStringIncludes(
    xml,
    "<QlfyBusinessActivitiesCnt>2</QlfyBusinessActivitiesCnt>",
  );
  assertStringIncludes(
    xml,
    "<OffHwyBusUseGasolineGalsQty>150</OffHwyBusUseGasolineGalsQty>",
  );
  assertStringIncludes(
    xml,
    'referenceDocumentId="BinaryAttachment1 BinaryAttachment2"',
  );
  assertStringIncludes(
    xml,
    'referenceDocumentName="BinaryAttachment GeneralDependencySmall"',
  );
  assertThrows(
    () =>
      form4136.build(multi, {
        pending: { schedule3: { line12_fuel_tax_credit: 27.45 } },
        documentIdsByPendingKey: { f4136: ["IRS4136_1"] },
        documentIdsByAttachmentFileName: {},
      }),
    Error,
    "Schedule A",
  );
});

Deno.test("Form 4136 XML omits business fields for home-use kerosene", () => {
  const xml = form4136.build({
    claimant_context: "home_kerosene",
    claimant_is_ultimate_purchaser: true,
    home_purchase_outside_blocked_pump: true,
    home_use_heating_lighting_or_cooking: true,
    purchase_records_confirmed: true,
    no_duplicate_excise_claim: true,
    claims: [{
      line: "4a",
      type_of_use: "08",
      unit: "gallons",
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      undyed_fuel_confirmed: true,
    }],
  }, { pending: { schedule3: { line12_fuel_tax_credit: 24.3 } } });
  assertStringIncludes(
    xml,
    "<QlfyUsageFuelsEligFTCInd>true</QlfyUsageFuelsEligFTCInd>",
  );
  assertStringIncludes(
    xml,
    "<NontaxableUseOfFuelTypeCd>08</NontaxableUseOfFuelTypeCd>",
  );
  assertStringIncludes(xml, "<FarmPrpsUndyedKeroseneCrAmt");
  if (
    xml.includes("<QlfyBusinessActivitiesCnt>") ||
    xml.includes("<BusinessName>")
  ) {
    throw new Error("Home-use kerosene must skip Form 4136 business lines B-F");
  }
});
