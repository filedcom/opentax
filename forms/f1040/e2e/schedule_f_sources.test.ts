import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { inputSchema as scheduleFInputSchema } from "../nodes/intermediate/forms/schedule_f/index.ts";
import { scheduleF } from "../2025/mef/forms/schedule_f.ts";
import { testFiler } from "../2025/mef/test-filer.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import type { MefFormsPending } from "../2025/mef/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

function farm(line4a: number) {
  return {
    farm_id: "north",
    proprietor_recipient: "T" as const,
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
      digital_assets: false,
    },
    schedule_f: { schedule_fs: [farm(line4a)] },
    f1099g: [{
      farm_id: "north",
      payer_name: "USDA Farm Service Agency",
      payer_tin: "123456789",
      recipient_tin: "123456789",
      source_document_reference: "issued-2025-farm-1099g",
      box_7_agriculture: 3_500,
      box_7_payment_kind: "agricultural_program",
      box_7_review_reference: "USDA payment purpose review",
      box_9_market_gain: 600,
    }],
    f1099m: [{
      farm_id: "north",
      payer_name: "Crop Insurer",
      payer_tin: "123456789",
      recipient_tin: "123456789",
      source_document_reference: "issued-2025-crop-insurance-1099misc",
      box9_crop_insurance: 7_500,
    }],
    f1099nec: [{
      farm_id: "north",
      payer_name: "Farm Customer",
      payer_tin: "123456789",
      box1_nec: 8_000,
      for_routing: "schedule_f",
      recipient_ssn: "123456789",
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

Deno.test("issued 1099-G farm payments bind to the proprietor and retained source in both exports", async () => {
  const result = execute(plan, registry, sourceInputs(4_100), ctx);
  assertEquals(result.diagnostics, []);
  const pending = result.pending as MefFormsPending;
  const filer = {
    ...testFiler(),
    nameLine1: "SAM FARMER",
    nameControl: "FARM",
    firstName: "Sam",
    firstNameWithInitial: "Sam",
    lastName: "Farmer",
    fullName: "Sam Farmer",
  };
  const xml = buildMefXml(pending, filer);
  assertStringIncludes(
    xml,
    "<AgriculturalProgramPymtAmt>4100</AgriculturalProgramPymtAmt>",
  );
  const pdf = await buildPdfBytes(pending, filer);
  assertEquals(pdf.subarray(0, 5), new TextEncoder().encode("%PDF-"));

  const raw = result.pending.f1099g as { f1099gs: Record<string, unknown>[] };
  const wrongOwner = {
    ...pending,
    f1099g: {
      f1099gs: [{ ...raw.f1099gs[0], recipient_tin: "999887777" }],
    },
  };
  assertThrows(
    () => buildMefXml(wrongOwner, filer),
    Error,
    "Schedule F 1099-G farm sources differ from retained payer copies",
  );
  await assertRejects(
    () => buildPdfBytes(wrongOwner, filer),
    Error,
    "Schedule F 1099-G farm sources differ from retained payer copies",
  );
  const farmPending = scheduleFInputSchema.parse(result.pending.schedule_f);
  const changedFarm = {
    ...pending,
    schedule_f: {
      ...farmPending,
      farm_sources: (farmPending.farm_sources ?? []).map((row) =>
        row.kind === "1099g_agriculture"
          ? { ...row, recipient_tin: "999887777" }
          : row
      ),
    },
  };
  assertThrows(
    () => buildMefXml(changedFarm, filer),
    Error,
    "Schedule F 1099-G farm sources differ from retained payer copies",
  );
  const coordinatedWrongOwner = {
    ...wrongOwner,
    schedule_f: {
      ...farmPending,
      farm_sources: (farmPending.farm_sources ?? []).map((row) =>
        row.kind === "1099g_agriculture" ||
          row.kind === "1099g_ccc_market_gain"
          ? { ...row, recipient_tin: "999887777" }
          : row
      ),
    },
  };
  assertThrows(
    () => buildMefXml(coordinatedWrongOwner, filer),
    Error,
    "1099 farm recipient differs from the Schedule F proprietor",
  );
  await assertRejects(
    () => buildPdfBytes(coordinatedWrongOwner, filer),
    Error,
    "1099 farm recipient differs from the Schedule F proprietor",
  );
});

Deno.test("issued 1099-MISC crop insurance binds to the Schedule F proprietor in both exports", async () => {
  const result = execute(plan, registry, sourceInputs(4_100), ctx);
  assertEquals(result.diagnostics, []);
  const pending = result.pending as MefFormsPending;
  const filer = {
    ...testFiler(),
    nameLine1: "SAM FARMER",
    nameControl: "FARM",
    firstName: "Sam",
    firstNameWithInitial: "Sam",
    lastName: "Farmer",
    fullName: "Sam Farmer",
  };
  assertStringIncludes(
    buildMefXml(pending, filer),
    "<CropInsProcAndDsstrPymtAmt>7500</CropInsProcAndDsstrPymtAmt>",
  );
  assertEquals(
    (await buildPdfBytes(pending, filer)).subarray(0, 5),
    new TextEncoder().encode("%PDF-"),
  );
  const raw = result.pending.f1099m as { f1099ms: Record<string, unknown>[] };
  const farmPending = scheduleFInputSchema.parse(pending.schedule_f);
  const changedCopy = {
    ...pending,
    f1099m: { f1099ms: [{ ...raw.f1099ms[0], recipient_tin: "999887777" }] },
  };
  assertThrows(
    () => buildMefXml(changedCopy, filer),
    Error,
    "Schedule F 1099-MISC crop-insurance sources differ from retained payer copies",
  );
  await assertRejects(
    () => buildPdfBytes(changedCopy, filer),
    Error,
    "Schedule F 1099-MISC crop-insurance sources differ from retained payer copies",
  );
  const coordinatedWrongOwner = {
    ...changedCopy,
    schedule_f: {
      ...farmPending,
      farm_sources: (farmPending.farm_sources ?? []).map((row) =>
        row.kind === "1099m_crop_insurance"
          ? { ...row, recipient_tin: "999887777" }
          : row
      ),
    },
  };
  assertThrows(
    () => buildMefXml(coordinatedWrongOwner, filer),
    Error,
    "1099 farm recipient differs from the Schedule F proprietor",
  );
  await assertRejects(
    () => buildPdfBytes(coordinatedWrongOwner, filer),
    Error,
    "1099 farm recipient differs from the Schedule F proprietor",
  );
});

Deno.test("issued 1099-PATR farm distribution binds to its cooperative and proprietor", async () => {
  const inputs = sourceInputs(4_100);
  const result = execute(plan, registry, {
    ...inputs,
    schedule_f: {
      schedule_fs: [{
        ...farm(4_100),
        line3a_cooperative_distributions: 500,
        line3b_cooperative_distributions_taxable: 400,
      }],
    },
    f1099patr: [{
      payer_name: "Farm Cooperative",
      payer_tin: "123456789",
      recipient_tin: "123456789",
      source_document_reference: "issued-2025-farm-1099patr",
      box1_patronage_dividends: 500,
      distribution_treatment: {
        kind: "farm",
        farm_id: "north",
        verified_taxable_amount: 400,
      },
    }],
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line6_schedule_f, 16_500);
  assertEquals(result.pending.f1040?.line8_additional_income, 16_500);
  const pending = result.pending as MefFormsPending;
  const filer = {
    ...testFiler(),
    nameLine1: "SAM FARMER",
    nameControl: "FARM",
    firstName: "Sam",
    firstNameWithInitial: "Sam",
    lastName: "Farmer",
    fullName: "Sam Farmer",
  };
  assertStringIncludes(
    buildMefXml(pending, filer),
    "<CooperativeDistriTxblAmt>400</CooperativeDistriTxblAmt>",
  );
  assertEquals(
    (await buildPdfBytes(pending, filer)).subarray(0, 5),
    new TextEncoder().encode("%PDF-"),
  );
  const raw = pending.f1099patr as { f1099patrs: Record<string, unknown>[] };
  const changedCopy = {
    ...pending,
    f1099patr: {
      f1099patrs: [{ ...raw.f1099patrs[0], recipient_tin: "999887777" }],
    },
  };
  assertThrows(
    () => buildMefXml(changedCopy, filer),
    Error,
    "Schedule F 1099-PATR sources differ from retained cooperative copies",
  );
  await assertRejects(
    () => buildPdfBytes(changedCopy, filer),
    Error,
    "Schedule F 1099-PATR sources differ from retained cooperative copies",
  );
  const farmPending = scheduleFInputSchema.parse(pending.schedule_f);
  const coordinatedWrongOwner = {
    ...changedCopy,
    schedule_f: {
      ...farmPending,
      farm_sources: (farmPending.farm_sources ?? []).map((row) =>
        row.kind === "1099patr_cooperative"
          ? { ...row, recipient_tin: "999887777" }
          : row
      ),
    },
  };
  assertThrows(
    () => buildMefXml(coordinatedWrongOwner, filer),
    Error,
    "1099 farm recipient differs from the Schedule F proprietor",
  );
  await assertRejects(
    () => buildPdfBytes(coordinatedWrongOwner, filer),
    Error,
    "1099 farm recipient differs from the Schedule F proprietor",
  );
});

Deno.test("reviewed current-year-taxable 1099-G crop disaster reaches Schedule F line 6a/6b and Form 1040", async () => {
  const inputs = sourceInputs(600);
  const result = execute(plan, registry, {
    ...inputs,
    schedule_f: {
      schedule_fs: [{
        ...farm(600),
        line4b_ag_program_payments_taxable: 600,
        line6a_crop_insurance: 11_000,
        line6b_crop_insurance_taxable: 11_000,
      }],
    },
    f1099g: [{
      ...inputs.f1099g[0],
      box_7_payment_kind: "crop_disaster_current_taxable",
      box_7_review_reference: "2025 USDA crop loss payment review",
    }],
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line6_schedule_f, 16_100);
  assertEquals(result.pending.f1040?.line8_additional_income, 16_100);
  const farmPending = scheduleFInputSchema.parse(result.pending.schedule_f);
  assertEquals(farmPending.schedule_fs[0].line6a_crop_insurance, 11_000);
  assertEquals(
    farmPending.schedule_fs[0].line6b_crop_insurance_taxable,
    11_000,
  );
  const filer = {
    ...testFiler(),
    nameLine1: "SAM FARMER",
    nameControl: "FARM",
    firstName: "Sam",
    firstNameWithInitial: "Sam",
    lastName: "Farmer",
    fullName: "Sam Farmer",
  };
  const xml = buildMefXml(result.pending as MefFormsPending, filer);
  assertStringIncludes(
    xml,
    "<CropInsProcAndDsstrPymtAmt>11000</CropInsProcAndDsstrPymtAmt>",
  );
  assertStringIncludes(
    xml,
    "<CropInsProcAndDsstrPymtTxblAmt>11000</CropInsProcAndDsstrPymtTxblAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalAdditionalIncomeAmt>16100</TotalAdditionalIncomeAmt>",
  );
  const xsdPath = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  await Deno.stat(xsdPath);
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(result.pending as MefFormsPending, filer);
  assertEquals(pdf.subarray(0, 5), new TextEncoder().encode("%PDF-"));

  const deferred = execute(plan, registry, {
    ...inputs,
    schedule_f: {
      schedule_fs: [{
        ...farm(600),
        line4b_ag_program_payments_taxable: 600,
        line6a_crop_insurance: 11_000,
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
            amount: 11_000,
            carrier: "USDA and crop insurer",
          }],
        },
      }],
    },
    f1099g: [{
      ...inputs.f1099g[0],
      box_7_payment_kind: "crop_disaster_current_taxable",
      box_7_review_reference: "2025 USDA crop loss payment review",
    }],
  }, ctx);
  assertEquals(
    deferred.diagnostics.some((entry) =>
      entry.message.includes(
        "cannot defer a reviewed current-year-taxable crop disaster payment",
      )
    ),
    true,
  );
});

Deno.test("accrual Schedule F reconciles farm source forms to Part III", () => {
  const inputs = sourceInputs(4_100);
  const result = execute(plan, registry, {
    ...inputs,
    schedule_f: {
      schedule_fs: [{
        farm_id: "north",
        proprietor_recipient: "T",
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
      entry.message.includes("1099-G farm payments need farm")
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
      recipient_tin: "123456789",
      source_document_reference: "issued-2025-deferred-crop-insurance-1099misc",
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
