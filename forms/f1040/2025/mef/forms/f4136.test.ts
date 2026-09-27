import { assertStringIncludes, assertThrows } from "@std/assert";
import { form4136 } from "./f4136.ts";

const fields = {
  business: {
    qualifying_business_activity: true as const,
    activity_count: 1 as const,
    business_name: "Example Farm",
    principal_activity_code: "111000",
    equipment_make: "Example",
    equipment_model: "Tractor",
    equipment_type: "farm tractor",
    purchase_records_confirmed: true as const,
    no_duplicate_excise_claim: true as const,
  },
  claims: [
    { line: "1a" as const, qualified_gallons: 100, actual_fuel_cost: 300 },
    { line: "3b" as const, qualified_gallons: 100, actual_fuel_cost: 400 },
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

Deno.test("Form 4136 XML carries variable-use aviation, kerosene, and alternative fuel groups", () => {
  const xml = form4136.build({
    business: fields.business,
    claims: [
      {
        line: "2b",
        type_of_use: "01",
        qualified_gallons: 100,
        actual_fuel_cost: 300,
      },
      {
        line: "4a",
        type_of_use: "02",
        qualified_gallons: 100,
        actual_fuel_cost: 300,
      },
      {
        line: "5c",
        type_of_use: "01",
        qualified_gallons: 100,
        actual_fuel_cost: 300,
      },
      {
        line: "5d",
        type_of_use: "01",
        qualified_gallons: 100,
        actual_fuel_cost: 300,
      },
      {
        line: "11a",
        type_of_use: "02",
        qualified_gallons: 100,
        actual_fuel_cost: 300,
      },
      {
        line: "11c",
        type_of_use: "02",
        qualified_gallons: 100,
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
        claims: [{ line: "1a", qualified_gallons: 100, actual_fuel_cost: 0 }],
      }, {
        pending: { schedule3: { line12_fuel_tax_credit: 18.3 } },
      }),
  );
});
