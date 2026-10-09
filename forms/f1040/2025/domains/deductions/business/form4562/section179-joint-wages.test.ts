import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { inputSchema as w2Schema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { filedCurrentYearSchema } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/current-year.ts";
import { reconcileInventorySection179Income } from "../../../../mef/forms/deductions/business/f4562_section179.ts";
import {
  section179JointWageCases,
  section179JointWageInput,
} from "./section179-joint-wages.fixture.ts";

Deno.test("Section179 joint wage owners reconcile depreciation, health, SE, QBI and final credit tax", async () => {
  for (const scenario of section179JointWageCases) {
    const input = section179JointWageInput(scenario);
    const before = JSON.stringify(input);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const f = result.pending.f1040;
    assertEquals([f.line1a_wages, f.line25a_w2_withheld], [50000, 7000]);
    assertEquals(result.pending.schedule1.line3_schedule_c, 10000);
    assertEquals(result.pending.schedule1.line15_se_deduction, 707);
    assertEquals(
      result.pending.schedule1.line17_se_health_insurance ?? 0,
      scenario.health ? 6000 : 0,
    );
    assertEquals([f.line11_agi, f.line12a_standard_deduction], [
      scenario.health ? 53293 : 59293,
      31500,
    ]);
    assertEquals([
      f.line13_qbi_deduction,
      f.line15_taxable_income,
      f.line16_income_tax,
    ], [scenario.qbi, scenario.taxable, scenario.regularTax]);
    assertEquals([f.line24_total_tax, f.line35a_refund], [
      scenario.tax,
      scenario.refund,
    ]);
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      extractFilerIdentity(f),
    );
    assertStringIncludes(
      prepared.bundle.xml,
      `<BusinessIncomeLimitationAmt>${scenario.limit}</BusinessIncomeLimitationAmt>`,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      `<Section179ExpenseDeductionAmt>${
        scenario.large ? 20000 : 2000
      }</Section179ExpenseDeductionAmt>`,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      "<SelfEmploymentTaxAmt>1413</SelfEmploymentTaxAmt>",
    );
    assertEquals(
      [...prepared.bundle.xml.matchAll(/<IRSW2\b/g)].length,
      scenario.split ? 2 : 1,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      "<EmployeeSSN>222334444</EmployeeSSN>",
    );
    assertEquals(JSON.stringify(input), before);
  }
});

Deno.test("Section179 joint income rejects unidentified owners, duplicate employer-owner pairs, wrong status and unreconciled wages", () => {
  const result = f1040_2025.executeReturn(
    section179JointWageInput(section179JointWageCases[2]),
  );
  const filed = filedCurrentYearSchema.parse(result.pending.form4562);
  const verify = (pending: typeof result.pending) =>
    reconcileInventorySection179Income(filed, pending);
  verify(result.pending);
  const p = result.pending;
  const wages = w2Schema.parse(p.w2);
  const { spouse_ssn: _spouse, ...withoutSpouse } = p.f1040;
  const wrongWageRows = [
    { ...wages.w2s[1], employee_ssn: "999887777" },
    { ...wages.w2s[1], employee_ssn: wages.w2s[0].employee_ssn },
    { ...wages.w2s[1], employer_ein: "bad" },
    { ...wages.w2s[1], box13_statutory_employee: true },
    { ...wages.w2s[1], box1_wages: wages.w2s[1].box1_wages + 1 },
  ];
  const invalid = [
    { ...p, f1040: { ...p.f1040, spouse_ssn: "999887777" } },
    { ...p, f1040: withoutSpouse },
    { ...p, f1040: { ...p.f1040, spouse_ssn: p.f1040.taxpayer_ssn } },
    { ...p, f1040: { ...p.f1040, filing_status: "single" } },
    { ...p, f1040: { ...p.f1040, line1a_wages: 20000 } },
    ...wrongWageRows.map((row) => ({
      ...p,
      w2: { ...wages, w2s: [wages.w2s[0], row] },
    })),
  ];
  for (const changed of invalid) assertThrows(() => verify(changed));
  assertThrows(
    () =>
      reconcileInventorySection179Income({
        ...filed,
        current_year_inventory: {
          ...filed.current_year_inventory,
          section179_election: {
            ...filed.current_year_inventory.section179_election!,
            taxpayer_active_business_income: 50000,
          },
        },
      }, result.pending),
    Error,
    "active income must reconcile",
  );
});
