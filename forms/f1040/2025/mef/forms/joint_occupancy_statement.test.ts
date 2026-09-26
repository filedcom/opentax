import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { HomeImprovementKind } from "../../../nodes/intermediate/forms/joint_occupancy_statement/index.ts";
import { jointOccupancyStatement } from "./joint_occupancy_statement.ts";

Deno.test("joint occupancy statement emits schema-order groups and a decimal share", () => {
  const [xml] = jointOccupancyStatement.build({
    statements: [{
      home_improvements: [
        {
          kind: HomeImprovementKind.CentralAirConditioners,
          explanation: "Shared A/C & installation",
          maximum_credit_allowed: 600,
          paid: 400,
          total_joint_occupants_paid: 1000,
        },
        {
          kind: HomeImprovementKind.ExteriorDoors,
          maximum_credit_allowed: 500,
          paid: 100,
          total_joint_occupants_paid: 400,
        },
      ],
    }],
  });
  assertEquals(
    xml.indexOf("<ExteriorDoorsGrp>") <
      xml.indexOf("<CentralAirConditionersGrp>"),
    true,
  );
  assertStringIncludes(xml, "<CalculatedPct>0.4</CalculatedPct>");
  assertStringIncludes(xml, "<CalculatedCreditAmt>120</CalculatedCreditAmt>");
  assertStringIncludes(xml, "<CalculatedCreditAmt>30</CalculatedCreditAmt>");
  assertStringIncludes(xml, "Shared A/C &amp; installation");
});

Deno.test("joint occupancy statement rejects an impossible allocation", () => {
  assertThrows(() =>
    jointOccupancyStatement.build({
      statements: [{
        home_improvements: [{
          kind: HomeImprovementKind.Insulation,
          maximum_credit_allowed: 1200,
          paid: 1001,
          total_joint_occupants_paid: 1000,
        }],
      }],
    })
  );
});

Deno.test("joint occupancy statement allocates a binding property cap", () => {
  const [xml] = jointOccupancyStatement.build({
    statements: [{
      home_improvements: [{
        kind: HomeImprovementKind.CentralAirConditioners,
        maximum_credit_allowed: 600,
        paid: 2000,
        total_joint_occupants_paid: 4000,
      }],
    }],
  });
  assertStringIncludes(xml, "<CalculatedPct>0.5</CalculatedPct>");
  assertStringIncludes(xml, "<CalculatedCreditAmt>300</CalculatedCreditAmt>");
});

Deno.test("joint occupancy statement rejects a property cap above the IRS limit", () => {
  assertThrows(() =>
    jointOccupancyStatement.build({
      statements: [{
        home_improvements: [{
          kind: HomeImprovementKind.CentralAirConditioners,
          maximum_credit_allowed: 601,
          paid: 2000,
          total_joint_occupants_paid: 4000,
        }],
      }],
    })
  );
});

Deno.test("joint occupancy statement rejects a share that rounds to one", () => {
  assertThrows(() =>
    jointOccupancyStatement.build({
      statements: [{
        home_improvements: [{
          kind: HomeImprovementKind.Insulation,
          maximum_credit_allowed: 1200,
          paid: 99_999,
          total_joint_occupants_paid: 100_000,
        }],
      }],
    })
  );
});

Deno.test("joint occupancy fuel-cell cost follows the IRS allocation example", () => {
  const [xml] = jointOccupancyStatement.build({
    statements: [{
      fuel_cell_properties: [{
        kw_capacity: 5,
        paid: 12_000,
        total_joint_occupants_paid: 20_000,
      }],
    }],
  });
  assertStringIncludes(xml, "<FuelCellPropKWCapNum>5</FuelCellPropKWCapNum>");
  assertStringIncludes(
    xml,
    "<TotalAllocableCostAmt>16670</TotalAllocableCostAmt>",
  );
  assertStringIncludes(xml, "<CalculatedPct>0.6</CalculatedPct>");
  assertStringIncludes(
    xml,
    "<AllocatedFuelCellPropCostAmt>10002</AllocatedFuelCellPropCostAmt>",
  );
});

Deno.test("joint occupancy statement rejects fractional fuel-cell increments", () => {
  assertThrows(() =>
    jointOccupancyStatement.build({
      statements: [{
        fuel_cell_properties: [{
          kw_capacity: 0.75,
          paid: 500,
          total_joint_occupants_paid: 1000,
        }],
      }],
    })
  );
});
