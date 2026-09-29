import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { inputSchema as scheduleFInputSchema } from "../nodes/intermediate/forms/schedule_f/index.ts";
import { scheduleF } from "../2025/mef/forms/schedule_f.ts";
import { testFiler } from "../2025/mef/test-filer.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import type { MefFormsPending } from "../2025/mef/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

function farm(line4a: number) {
  return {
    farm_id: "north",
    line_a_principal_crop_activity: "GRAIN FARMING",
    line_b_agricultural_activity_code: "111100" as const,
    line_e_material_participation: true,
    accounting_method: "cash" as const,
    line1_sales_livestock_resale: 0,
    line4a_ag_program_payments: line4a,
    line4b_ag_program_payments_taxable: 4_100,
    ccc_loan_election_in_effect: false,
    line6a_crop_insurance: 7_500,
    line6b_crop_insurance_taxable: 7_500,
    line8_other_income: 8_000,
    line10_car_truck: 3_500,
  };
}

function sourceInputs(line4a: number) {
  return {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Farmer",
      taxpayer_ssn: "123-45-6789",
    },
    schedule_f: { schedule_fs: [farm(line4a)] },
    f1099g: [{
      farm_id: "north",
      box_7_agriculture: 3_500,
      box_9_market_gain: 600,
    }],
    f1099m: [{
      farm_id: "north",
      payer_name: "Crop Insurer",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      box9_crop_insurance: 7_500,
    }],
    f1099nec: [{
      farm_id: "north",
      payer_name: "Farm Customer",
      payer_tin: "123456789",
      box1_nec: 8_000,
      for_routing: "schedule_f",
    }],
    auto_expense: [{
      farm_id: "north",
      vehicle_description: "Farm truck",
      placed_in_service_date: "2024-01-01",
      business_miles: 5_000,
      total_miles: 10_000,
      method: "standard",
      purpose: "SCHEDULE_F",
    }],
  };
}

Deno.test("Schedule F sources reconcile through execution without double-counting", () => {
  const result = execute(plan, registry, sourceInputs(4_100), ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line6_schedule_f, 16_100);
  const pending = scheduleFInputSchema.parse(result.pending.schedule_f);
  assertEquals(pending.farm_sources?.length, 5);
  const [xml] = scheduleF.build(pending, { filer: testFiler() });
  assertStringIncludes(
    xml,
    "<AgriculturalProgramPymtAmt>4100</AgriculturalProgramPymtAmt>",
  );
  assertStringIncludes(xml, "<GrossIncomeAmt>19600</GrossIncomeAmt>");
  assertStringIncludes(
    xml,
    "<NetFarmProfitLossAmt>16100</NetFarmProfitLossAmt>",
  );
  const returnXml = buildMefXml(result.pending as MefFormsPending, testFiler());
  assertStringIncludes(returnXml, "<IRS1040ScheduleF documentId=");
});

Deno.test("accrual Schedule F reconciles farm source forms to Part III", () => {
  const inputs = sourceInputs(4_100);
  const result = execute(plan, registry, {
    ...inputs,
    schedule_f: {
      schedule_fs: [{
        farm_id: "north",
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_e_material_participation: true,
        accounting_method: "accrual",
        ccc_loan_election_in_effect: false,
        part_iii: {
          line37_sales_products: 20_000,
          line39a_ag_program_payments: 4_100,
          line39b_ag_program_payments_taxable: 4_100,
          line41_crop_insurance: 7_500,
          line43_other_income: 8_000,
          line45_beginning_inventory: 5_000,
          line46_products_purchased: 2_000,
          line48_ending_inventory: 3_000,
          inventory_method: "cost",
        },
        line10_car_truck: 3_500,
        line17_fertilizers: 20_000,
      }],
    },
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line6_schedule_f, 12_100);
  const xml = buildMefXml(result.pending as MefFormsPending, testFiler());
  assertStringIncludes(
    xml,
    "<MethodOfAccountingAccrualInd>X</MethodOfAccountingAccrualInd>",
  );
  assertStringIncludes(
    xml,
    "<CostOfProductsSoldAmt>4000</CostOfProductsSoldAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmProfitLossAmt>12100</NetFarmProfitLossAmt>",
  );
});

Deno.test("Schedule F refuses an underreported farm source", () => {
  const result = execute(plan, registry, sourceInputs(3_500), ctx);
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "schedule_f" && entry.message.includes("line 4a")
    ),
    true,
  );
});

Deno.test("CCC market gain follows the farm's loan election status", () => {
  const inputs = sourceInputs(4_100);
  const elected = execute(plan, registry, {
    ...inputs,
    schedule_f: {
      schedule_fs: [{
        ...farm(4_100),
        ccc_loan_election_in_effect: true,
        line4b_ag_program_payments_taxable: 3_500,
      }],
    },
  }, ctx);
  assertEquals(elected.diagnostics, []);
  assertEquals(elected.pending.schedule1?.line6_schedule_f, 15_500);

  const incorrectlyTaxed = execute(plan, registry, {
    ...inputs,
    schedule_f: {
      schedule_fs: [{
        ...farm(4_100),
        ccc_loan_election_in_effect: true,
      }],
    },
  }, ctx);
  assertEquals(
    incorrectlyTaxed.diagnostics.some((entry) =>
      entry.nodeType === "schedule_f" &&
      entry.message.includes("nontaxable CCC market gain")
    ),
    true,
  );
});

Deno.test("Schedule F refuses an unassigned source or duplicate farm identity", () => {
  const unassigned = sourceInputs(4_100);
  const unassignedResult = execute(plan, registry, {
    ...unassigned,
    f1099g: [{ box_7_agriculture: 3_500 }],
  }, ctx);
  assertEquals(
    unassignedResult.diagnostics.some((entry) =>
      entry.nodeType === "f1099g" && entry.message.includes("farm_id")
    ),
    true,
  );

  const duplicated = sourceInputs(4_100);
  const duplicateResult = execute(plan, registry, {
    ...duplicated,
    schedule_f: { schedule_fs: [farm(4_100), farm(4_100)] },
  }, ctx);
  assertEquals(
    duplicateResult.diagnostics.some((entry) =>
      entry.nodeType === "schedule_f" && entry.message.includes("duplicated")
    ),
    true,
  );
});

Deno.test("deferred 1099-MISC crop insurance reaches Schedule F line 6a and its linked statement", () => {
  const inputs = sourceInputs(4_100);
  const result = execute(plan, registry, {
    ...inputs,
    schedule_f: {
      schedule_fs: [{
        ...farm(4_100),
        line6a_crop_insurance: 5_000,
        line6b_crop_insurance_taxable: 0,
        line6c_defer_crop_insurance: true,
        line6c_crop_insurance_deferral_details: {
          cash_method: true,
          normal_practice_next_year_percent: 80,
          damaged_crops: [{
            crop: "CORN",
            damage_date: "2025-08-01",
            cause: "HAIL",
          }],
          payments: [{
            crop: "CORN",
            received_date: "2025-10-01",
            amount: 5_000,
            carrier: "FARM INSURER",
          }],
        },
      }],
    },
    f1099m: [{
      farm_id: "north",
      payer_name: "Crop Insurer",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      box9_crop_insurance: 5_000,
      box9_crop_insurance_deferred: true,
    }],
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line6_schedule_f, 8_600);
  const xml = buildMefXml(result.pending as MefFormsPending, testFiler());
  assertStringIncludes(
    xml,
    "<CropInsProcAndDsstrPymtAmt>5000</CropInsProcAndDsstrPymtAmt>",
  );
  assertStringIncludes(
    xml,
    "<CropInsProcAndDsstrPymtTxblAmt>0</CropInsProcAndDsstrPymtTxblAmt>",
  );
  assertStringIncludes(
    xml,
    '<ElectionDeferCropInsProcInd referenceDocumentId="PostponementCropInsDsstrStmt',
  );
});
