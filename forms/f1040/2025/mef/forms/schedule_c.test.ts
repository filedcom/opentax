import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import type { ScheduleCItem } from "../../../nodes/inputs/schedule_c/index.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { buildMefXml } from "../builder.ts";
import { scheduleC } from "./schedule_c.ts";

const filer: FilerIdentity = {
  primarySSN: "400001212",
  nameLine1: "Sam Gardenia",
  nameControl: "GARD",
  fullName: "Sam Gardenia",
  address: {
    line1: "231 Red Run Street",
    city: "Anytown",
    state: "KY",
    zip: "41011",
  },
  filingStatus: FilingStatus.Single,
};

function item(overrides: Partial<ScheduleCItem> = {}): ScheduleCItem {
  return {
    line_a_principal_business: "DESIGNER",
    line_b_business_code: "541310",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_1_gross_receipts: 35_235,
    ...overrides,
  };
}

Deno.test("Schedule C emits sourced income and expense totals as its own MeF document", () => {
  const [xml] = scheduleC.build({
    schedule_cs: [item({
      line_15_insurance: 550,
      line_17_professional_services: 125,
      line_18_office_expense: 1_000,
      line_20b_rent_other: 2_500,
      line_22_supplies: 6_532,
      line_23_taxes_licenses: 200,
    })],
  }, { filer });
  assertStringIncludes(xml, "<ProprietorNm>Sam Gardenia</ProprietorNm>");
  assertStringIncludes(
    xml,
    "<TotalGrossReceiptsAmt>35235</TotalGrossReceiptsAmt>",
  );
  assertStringIncludes(xml, "<TotalExpensesAmt>10907</TotalExpensesAmt>");
  assertStringIncludes(xml, "<NetProfitOrLossAmt>24328</NetProfitOrLossAmt>");
});

Deno.test("Schedule C MeF wages match gross payroll less employment credits", () => {
  const [xml] = scheduleC.build({
    schedule_cs: [item({
      business_reference: "CONSULTING",
      line_26_wages: 10_000,
      line_26_other_employment_credits: 500,
    })],
    wotc_wage_reductions: [{
      business_reference: "CONSULTING",
      credit_amount: 2_400,
    }],
  }, { filer });
  assertStringIncludes(
    xml,
    "<WagesLessEmploymentCreditsAmt>7100</WagesLessEmploymentCreditsAmt>",
  );
  assertStringIncludes(xml, "<NetProfitOrLossAmt>28135</NetProfitOrLossAmt>");
});

Deno.test("Schedule C rejects an unsourced WOTC wage reduction in a return bundle", () => {
  const fields = {
    schedule_cs: [item({
      business_reference: "CONSULTING",
      line_26_wages: 10_000,
    })],
    wotc_wage_reductions: [{
      business_reference: "CONSULTING",
      credit_amount: 2_400,
    }],
  };
  assertThrows(() =>
    scheduleC.build(fields, {
      filer,
      pending: { schedule_c: fields },
    })
  );
});

Deno.test("Schedule C emits inventory, cost of goods sold, and separate documents", () => {
  const xml = buildMefXml({
    schedule_c: {
      schedule_cs: [
        item({
          line_1_gross_receipts: 60_000,
          line_33_inventory_method: "cost",
          line_35_cogs_beginning_inventory: 7_650,
          line_36_purchases: 8_550,
          line_37_cost_of_labor: 11_900,
          line_38_materials_supplies_cogs: 16_300,
          line_41_cogs_ending_inventory: 21_450,
          line_8_advertising: 2_352,
          line_11_contract_labor: 3_560,
          line_18_office_expense: 1_725,
          line_21_repairs: 560,
        }),
        item({ line_1_gross_receipts: 1_000 }),
      ],
    },
  }, filer);
  assertStringIncludes(xml, 'documentCnt="3"');
  assertStringIncludes(
    xml,
    '<IRS1040ScheduleC documentId="IRS1040ScheduleC1">',
  );
  assertStringIncludes(
    xml,
    '<IRS1040ScheduleC documentId="IRS1040ScheduleC2">',
  );
  assertStringIncludes(xml, "<CostOfGoodsSoldAmt>22950</CostOfGoodsSoldAmt>");
  assertStringIncludes(xml, "<TotalExpensesAmt>8197</TotalExpensesAmt>");
});

Deno.test("Schedule C emits the vehicle substantiation fields", () => {
  const [xml] = scheduleC.build({
    schedule_cs: [item({
      line_44b_business_miles: 665,
      line_44c_commuting_miles: 710,
      line_44d_other_miles: 15_151,
      line_45_personal_use: true,
      line_46_another_vehicle: false,
      line_47a_evidence: true,
      line_47b_written_evidence: true,
    })],
  }, { filer });
  assertStringIncludes(xml, "<BusinessMilesCnt>665</BusinessMilesCnt>");
  assertStringIncludes(xml, "<CommutingMilesCnt>710</CommutingMilesCnt>");
  assertStringIncludes(xml, "<OtherMilesCnt>15151</OtherMilesCnt>");
  assertStringIncludes(
    xml,
    "<VehicleAvailableOffDutyHrsInd>true</VehicleAvailableOffDutyHrsInd>",
  );
  assertStringIncludes(
    xml,
    "<AnotherVehicleForPrsnlUseInd>false</AnotherVehicleForPrsnlUseInd>",
  );
});

Deno.test("Schedule C emits a structured business address and rejects missing statements", () => {
  const [addressXml] = scheduleC.build({
    schedule_cs: [item({
      line_e_business_address: {
        line1: "654 W 3rd St",
        city: "Anytown",
        state: "KY",
        zip: "41011",
      },
    })],
  }, { filer });
  assertStringIncludes(
    addressXml,
    "<BusinessUSAddress><AddressLine1Txt>654 W 3rd St</AddressLine1Txt>",
  );
  assertThrows(
    () =>
      scheduleC.build({
        schedule_cs: [item({ line_33_inventory_method: "other" })],
      }, { filer }),
    Error,
    "inventory statement",
  );
  assertEquals(scheduleC.build({}, { filer }), []);
});
