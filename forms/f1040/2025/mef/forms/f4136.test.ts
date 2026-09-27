import { assertStringIncludes, assertThrows } from "@std/assert";
import { form4136 } from "./f4136.ts";
import { form4136DieselGovernmentSalesStatement } from "./f4136_diesel_government_sales_statement.ts";
import { form4136EmulsionBlendingStatement } from "./f4136_emulsion_blending_statement.ts";
const certifications = {
  undyed_fuel_confirmed: true,
  right_to_claim_not_waived: true,
  credit_card_issuer_certificate_not_provided: true,
  not_highway_vehicle: true,
  not_noncommercial_motorboat: true,
  aviation_gasoline_outside_propulsion_confirmed: true,
  export_proof: {
    kind: "carrier_bill_of_lading",
    record_reference: "Export file 2025-001",
  },
  commercial_aviation_nonforeign_trade_confirmed: true,
  foreign_trade_lust_tax_paid_confirmed: true,
  train_use_confirmed: true,
  certain_intercity_or_local_bus_use_confirmed: true,
  emulsion_water_percentage: 14,
  emulsion_epa_additive_record_reference: "EPA additive record 2025-1",
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

Deno.test("Form 4136 XML separates emulsion use, reduced-rate bus use, and export", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: [
      {
        ...certifications,
        line: "14a",
        type_of_use: "02",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 250,
      },
      {
        ...certifications,
        line: "14a",
        type_of_use: "05",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 250,
      },
      {
        ...certifications,
        line: "14b",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 250,
      },
    ],
  }, { pending: { schedule3: { line12_fuel_tax_credit: 51.9 } } });
  assertStringIncludes(xml, "<BusNontxUseDieselWtrEmlsnGrp>");
  assertStringIncludes(xml, "<CreditRt>0.124</CreditRt>");
  assertStringIncludes(xml, "<NontxUseDieselWaterEmulsionGrp>");
  assertStringIncludes(
    xml,
    "<ExpNontxUseDslWtrEmulsionQty>100</ExpNontxUseDslWtrEmulsionQty>",
  );
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>52</TotalFuelTaxCreditAmt>",
  );
});

Deno.test("Form 4136 XML links registered-blender line 15a to its certification", () => {
  const blender = {
    ...activityContext,
    business: {
      qualifying_business_activity: true as const,
      business_name: "Example Emulsion Blender",
      principal_activity_code: "324110",
      equipment_make: "Example",
      equipment_model: "Mixer",
      equipment_type: "fuel blender",
      production_records_confirmed: true as const,
      no_duplicate_excise_claim: true as const,
    },
    claims: [{
      line: "15a" as const,
      unit: "gallons" as const,
      qualified_quantity: 1_000,
      actual_fuel_cost: 2_500,
      undyed_fuel_confirmed: true as const,
      excise_tax_rate_per_gallon: 0.244,
      blender_registration_number: "M123456789",
      blender_produced_confirmed: true as const,
      blender_input_diesel_gallons: 1_000,
      blender_trade_or_business_disposition: "used_in_business" as const,
      emulsion_water_percentage: 14,
      emulsion_epa_additive_record_reference: "EPA additive record 2025-1",
    }],
  };
  const xml = form4136.build(blender, {
    pending: { schedule3: { line12_fuel_tax_credit: 46 } },
    documentIdsByPendingKey: {
      f4136_emulsion_blending_statement: ["blender-statement-1"],
    },
  });
  assertStringIncludes(
    xml,
    "<DieselWtrBlndgRegistrationNum>M123456789</DieselWtrBlndgRegistrationNum>",
  );
  assertStringIncludes(
    xml,
    "<BlndrCrUseDslWtrEmulsionQty>1000</BlndrCrUseDslWtrEmulsionQty>",
  );
  assertStringIncludes(
    xml,
    'referenceDocumentId="blender-statement-1" referenceDocumentName="DieselWaterFuelEmulsionBlendingStatement"',
  );
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>46</TotalFuelTaxCreditAmt>",
  );
  const [statement] = form4136EmulsionBlendingStatement.build(undefined, {
    pending: { f4136: blender },
  });
  assertStringIncludes(statement, "<DslWaterFuelEmulsionBlndgStmt>");
  assertStringIncludes(statement, "at least 14% water");
  assertStringIncludes(statement, "EPA under Clean Air Act section 211");
  assertStringIncludes(statement, "taxed at $0.244 per gallon");
  assertStringIncludes(
    statement,
    "used in the blender&apos;s trade or business",
  );
  assertThrows(
    () =>
      form4136.build(blender, {
        pending: { schedule3: { line12_fuel_tax_credit: 46 } },
        documentIdsByPendingKey: {},
      }),
    Error,
    "needs a blending statement",
  );
});

Deno.test("Form 4136 XML combines line 16a fuel kinds and separates dyed kerosene", () => {
  const exporter = {
    ...activityContext,
    business: {
      ...fields.business,
      claimant_is_ultimate_purchaser: undefined,
      purchase_records_confirmed: undefined,
      export_records_confirmed: true as const,
    },
    claims: [
      {
        ...certifications,
        line: "16a" as const,
        exported_fuel_kind: "dyed_diesel" as const,
        exporter_of_record_confirmed: true as const,
        excise_tax_rate_per_gallon: 0.001,
        unit: "gallons" as const,
        qualified_quantity: 1_000,
        actual_fuel_cost: 2_500,
      },
      {
        ...certifications,
        line: "16a" as const,
        exported_fuel_kind: "gasoline_blendstock" as const,
        exporter_of_record_confirmed: true as const,
        excise_tax_rate_per_gallon: 0.001,
        unit: "gallons" as const,
        qualified_quantity: 1_000,
        actual_fuel_cost: 2_500,
      },
      {
        ...certifications,
        line: "16b" as const,
        exported_fuel_kind: "dyed_kerosene" as const,
        exporter_of_record_confirmed: true as const,
        excise_tax_rate_per_gallon: 0.001,
        unit: "gallons" as const,
        qualified_quantity: 1_000,
        actual_fuel_cost: 2_500,
      },
    ],
  };
  const xml = form4136.build(exporter, {
    pending: { schedule3: { line12_fuel_tax_credit: 3 } },
  });
  assertStringIncludes(
    xml,
    "<ExportedDyedDieselFuelGalsQty>2000</ExportedDyedDieselFuelGalsQty>",
  );
  assertStringIncludes(
    xml,
    "<ExportedDyedKeroseneGallonsQty>1000</ExportedDyedKeroseneGallonsQty>",
  );
  assertStringIncludes(xml, "<TotalFuelTaxCreditAmt>3</TotalFuelTaxCreditAmt>");
});

Deno.test("Form 4136 XML and buyer statement reconcile registered vendor line 6a", () => {
  const vendor = {
    ...activityContext,
    business: {
      qualifying_business_activity: true as const,
      business_name: "Example Fuel Vendor",
      principal_activity_code: "457100",
      equipment_make: "Example",
      equipment_model: "Pump",
      equipment_type: "diesel dispenser",
      sales_records_confirmed: true as const,
      no_duplicate_excise_claim: true as const,
    },
    claims: [{
      line: "6a" as const,
      unit: "gallons" as const,
      qualified_quantity: 150,
      actual_fuel_cost: 400,
      undyed_fuel_confirmed: true as const,
      vendor_registration_number: "UV123456789",
      vendor_tax_settlement: "tax_excluded_price" as const,
      government_sales: [{
        sale_date: "2025-06-12",
        buyer_name: "Example City",
        buyer_ein: "123456789",
        gallons: 150,
        certificate_p_record_reference: "Certificate P-2025-1",
        certificate_information_believed_true: true as const,
        exclusive_government_use_confirmed: true as const,
      }],
    }],
  };
  const xml = form4136.build(vendor, {
    pending: { schedule3: { line12_fuel_tax_credit: 36.45 } },
  });
  assertStringIncludes(
    xml,
    "<UndyedDieselRegistrationNum>UV123456789</UndyedDieselRegistrationNum>",
  );
  assertStringIncludes(
    xml,
    "<SlsUndyedDslStLclGovtGalsQty>150</SlsUndyedDslStLclGovtGalsQty>",
  );
  assertStringIncludes(
    xml,
    '<SlsUndyedDslUseStLclGovtCrAmt creditReferenceNum="360">36</SlsUndyedDslUseStLclGovtCrAmt>',
  );
  const statement = form4136DieselGovernmentSalesStatement.build(undefined, {
    pending: { f4136: vendor },
  });
  assertStringIncludes(statement, "<ToWhomDieselFuelSoldStatement>");
  assertStringIncludes(
    statement,
    "<BusinessNameLine1Txt>Example City</BusinessNameLine1Txt>",
  );
  assertStringIncludes(statement, "<EIN>123456789</EIN>");
  assertStringIncludes(statement, "<GallonsBoughtQty>150</GallonsBoughtQty>");
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

Deno.test("Form 4136 XML maps commercial, exported, and foreign-trade aviation gasoline", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: (["2a", "2c", "2d"] as const).map((line) => ({
      ...certifications,
      line,
      unit: "gallons" as const,
      qualified_quantity: 1_000,
      actual_fuel_cost: 3_000,
    })),
  }, { pending: { schedule3: { line12_fuel_tax_credit: 345 } } });
  assertStringIncludes(xml, "<CommercialAviationUseGasGrp>");
  assertStringIncludes(
    xml,
    "<AviationGasolineGallonsQty>1000</AviationGasolineGallonsQty>",
  );
  assertStringIncludes(xml, "<ExportedNontaxAviationGasGrp>");
  assertStringIncludes(xml, "<LUSTTxAvnFuelFrgnTradeGrp>");
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>345</TotalFuelTaxCreditAmt>",
  );
});

Deno.test("Form 4136 XML keeps diesel train, bus, and export credits separate", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: (["3c", "3d", "3e"] as const).map((line) => ({
      ...certifications,
      line,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    })),
  }, { pending: { schedule3: { line12_fuel_tax_credit: 65.7 } } });
  assertStringIncludes(xml, "<TrainsUseUndyedDieselFuelGrp>");
  assertStringIncludes(xml, "<BusesUseUndyedDieselFuelGrp>");
  assertStringIncludes(xml, "<ExportedUndyedDieselFuelGrp>");
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>66</TotalFuelTaxCreditAmt>",
  );
});

Deno.test("Form 4136 XML separates kerosene bus, export, and reduced-tax claims", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: (["4c", "4d", "4e", "4f"] as const).map((line) => ({
      ...certifications,
      line,
      type_of_use: line === "4e" || line === "4f" ? "02" : undefined,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      excise_tax_rate_per_gallon: line === "4e"
        ? 0.044
        : line === "4f"
        ? 0.219
        : undefined,
    })),
  }, { pending: { schedule3: { line12_fuel_tax_credit: 67.5 } } });
  assertStringIncludes(xml, "<BusesUseUndyedKeroseneGrp>");
  assertStringIncludes(xml, "<ExportedUndyedKeroseneGrp>");
  assertStringIncludes(xml, "<NontxUseUndyedKrsnTxdAt044Grp>");
  assertStringIncludes(xml, "<NontxUseUndyedKrsnTxdAt219Grp>");
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>68</TotalFuelTaxCreditAmt>",
  );
});

Deno.test("Form 4136 XML separates aviation kerosene commercial and LUST claims", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: (["5a", "5b", "5e"] as const).map((line) => ({
      ...certifications,
      line,
      unit: "gallons" as const,
      qualified_quantity: 1_000,
      actual_fuel_cost: 3_000,
      excise_tax_rate_per_gallon: line === "5a"
        ? 0.244
        : line === "5b"
        ? 0.219
        : undefined,
    })),
  }, { pending: { schedule3: { line12_fuel_tax_credit: 376 } } });
  assertStringIncludes(xml, "<KrsnUsedInCmrclAvnTxdAt244Grp>");
  assertStringIncludes(xml, "<KrsnUsedInCmrclAvnTxdAt219Grp>");
  assertStringIncludes(xml, "<LUSTTxKrsnAvnFrgnTrdGrp>");
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>376</TotalFuelTaxCreditAmt>",
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
        excise_tax_rate_per_gallon: 0.244,
        type_of_use: "01",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "5d",
        excise_tax_rate_per_gallon: 0.219,
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
