import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { w2 } from "../../nodes/inputs/income/wages/w2/index.ts";
import {
  computeScheduleHAmounts,
  schedule_h,
} from "../../nodes/intermediate/forms/taxes/household-employment/schedule_h/index.ts";
import {
  SCENARIO_1040_01_ASSUMPTIONS,
  scenario104001Input,
  SCENARIO_1040_01_RECONCILIATION,
} from "./scenario_1040_01_input.ts";
import { SCENARIO_1040_01_FACTS } from "./ty2025_cases.ts";
import {
  exportAtsReturn,
  validateReturn1040Xsd,
  xmlAmount,
  xmlValues,
  xsdAvailable,
} from "./ty2025-export.ts";

test("ATS 1040 Scenario 1 retains two distinct W-2s and Schedule H", () => {
  const input = scenario104001Input();
  const wageForms = input.w2 as Record<string, unknown>[];
  const household = input.schedule_h as Record<string, unknown>;
  assertEquals(Object.keys(input).sort(), [
    "f5695",
    "general",
    "schedule_h",
    "w2",
  ]);
  assertEquals(wageForms.map((form) => form.employer_name), [
    "The Green Ladies",
    "C&R",
  ]);
  assertEquals(wageForms.map((form) => form.employer_ein), [
    "000000007",
    "000000007",
  ]);
  assertEquals(wageForms.map((form) => form.source_document_reference), [
    "irs-ty2025-ats-1040-01-w2-page-4",
    "irs-ty2025-ats-1040-01-w2-page-5",
  ]);
  assertEquals(household.employer_ein, "000000029");
  assertEquals(household.cash_wages_over_2025_limit, true);
  assertEquals(household.cash_wages_over_quarter_limit, false);
  assertEquals(household.ss_wages, 3_100);
  assertEquals(household.medicare_wages, 3_100);
});

test("ATS 1040 Scenario 1 W-2 and household tax source slices reconcile", () => {
  const input = scenario104001Input();
  const context = { taxYear: 2025, formType: "f1040" };
  const wageResult = w2.compute(
    context,
    w2.inputSchema.parse({ w2s: input.w2 }),
  );
  const wageOutput = wageResult.outputs.find((item) =>
    item.nodeType === "f1040"
  )?.fields;
  assertEquals(wageOutput?.line1a_wages, 42_470);
  assertEquals(wageOutput?.line25a_w2_withheld, 2_713);
  assertThrows(
    () =>
      w2.compute(
        context,
        w2.inputSchema.parse({
          w2s: (input.w2 as Record<string, unknown>[]).map((form) => ({
            ...form,
            source_document_reference: undefined,
          })),
        }),
      ),
    Error,
    "distinct issued references",
  );

  const household = schedule_h.inputSchema.parse(input.schedule_h);
  const amounts = computeScheduleHAmounts(household, 2025);
  assertEquals(
    amounts.socialSecurityTax,
    SCENARIO_1040_01_RECONCILIATION.scheduleH.socialSecurityTax,
  );
  assertEquals(
    amounts.medicareTax,
    SCENARIO_1040_01_RECONCILIATION.scheduleH.medicareTax,
  );
  assertEquals(
    amounts.totalTax,
    SCENARIO_1040_01_RECONCILIATION.scheduleH.line8TotalTax,
  );
  const householdOutput = schedule_h.compute(context, household).outputs.find(
    (item) => item.nodeType === "schedule2",
  )?.fields;
  assertEquals(
    householdOutput?.line9_household_employment,
    SCENARIO_1040_01_RECONCILIATION.scheduleH.schedule2Line9,
  );
});

test("ATS 1040 Scenario 1 records each assumption once and keeps printed door facts", () => {
  const input = scenario104001Input();
  const fields = SCENARIO_1040_01_ASSUMPTIONS.map((item) => item.field);
  assertEquals(new Set(fields).size, fields.length);
  const form5695 = input.f5695 as {
    part_ii_section_a: { exterior_doors: { cost: number; qmid: string }[] };
  };
  const doors = form5695.part_ii_section_a.exterior_doors;
  assertEquals(doors.slice(0, 3), [...SCENARIO_1040_01_FACTS.form5695.exteriorDoors]);
  assertEquals(
    doors.slice(3).reduce((sum, door) => sum + door.cost, 0),
    SCENARIO_1040_01_FACTS.form5695.line19eOtherDoorsCost,
  );
  assertEquals(doors.slice(3).every((door) => door.cost < 800), true);
});

test("ATS 1040 Scenario 1 exports without force, XSD-valid, with the packet values", async () => {
  const exported = await exportAtsReturn(scenario104001Input());
  assertEquals(exported.diagnostics, []);
  assertEquals(exported.rejects, []);
  assertEquals(exported.attachments, ["AdditionalQMIDStatement.pdf"]);
  if (xsdAvailable()) {
    const { success, stderr } = await validateReturn1040Xsd(exported.xml);
    assertEquals(success, true, stderr);
  }
  const { xml } = exported;
  const printed = SCENARIO_1040_01_RECONCILIATION.printed;
  const derived = SCENARIO_1040_01_RECONCILIATION.form5695;
  const household = SCENARIO_1040_01_RECONCILIATION.scheduleH;
  const amount = (root: string, tag: string) => xmlAmount(xml, root, tag);
  assertEquals(amount("IRS1040", "WagesAmt"), printed.line1aWages);
  assertEquals(amount("IRS1040", "FormW2WithheldTaxAmt"), printed.line25aW2Withholding);
  assertEquals(xmlValues(xml, "StateIncomeTaxAmt"), ["320", "416"]);
  assertEquals(amount("IRS1040ScheduleH", "SocialSecurityTaxCashWagesAmt"), 3_100);
  assertEquals(amount("IRS1040ScheduleH", "MedicareTaxCashWagesAmt"), 3_100);
  assertEquals(amount("IRS1040ScheduleH", "SocialSecurityTaxAmt"), household.socialSecurityTax);
  assertEquals(amount("IRS1040ScheduleH", "MedicareTaxWithheldAmt"), household.medicareTax);
  assertEquals(amount("IRS1040ScheduleH", "TotSocSecMedcrAndFedIncmTaxAmt"), household.line8TotalTax);
  assertEquals(amount("IRS1040Schedule2", "HouseholdEmploymentTaxAmt"), household.schedule2Line9);
  assertEquals(amount("IRS5695", "MostExpnsExtrDoorCostAmt"), printed.form5695Line19a);
  assertEquals(xmlValues(xml, "MostExpnsExtrDoorQMID"), ["A1B2"]);
  assertEquals(amount("IRS5695", "MostExpnsExtrDoorsStdPctCrAmt"), derived.line19c);
  assertEquals(amount("IRS5695", "NextMostExpnsExtrDoorCostAmt"), printed.form5695Line19d);
  assertEquals(amount("IRS5695", "OtherQlfyExtrDoorsCostAmt"), printed.form5695Line19e);
  assertEquals(amount("IRS5695", "TotalOtherQlfyExtrDoorsCostAmt"), derived.line19f);
  assertEquals(amount("IRS5695", "OtherQlfyExtrDoorsStdPctCrAmt"), derived.line19g);
  assertEquals(amount("IRS5695", "TotalExtrDoorsCreditAmt"), derived.line19h);
  assertEquals(amount("IRS5695", "MostExpnsExtrWndwSkyltCostAmt"), printed.form5695Line20a);
  assertEquals(amount("IRS5695", "ExtrWndwSkylightStdPctCrAmt"), derived.line20d);
  assertEquals(amount("IRS5695", "MostExpnsCentralAirCondCostAmt"), printed.form5695Line22a);
  assertEquals(amount("IRS5695", "OthCentralAirCondCostAmt"), printed.form5695Line22b);
  assertEquals(amount("IRS5695", "CentralAirCondCostAmt"), derived.line22c);
  assertEquals(amount("IRS5695", "CentralAirCondCostStdPctCrAmt"), derived.line22d);
  assertEquals(amount("IRS5695", "EgyEffcntImprvCreditSubtlAmt"), derived.line27);
  assertEquals(amount("IRS5695", "EnergyEffcntImprvAllwblCostAmt"), derived.line28);
  assertEquals(amount("IRS5695", "TaxesLessCreditsAmt"), derived.line31TaxLimit);
  assertEquals(amount("IRS5695", "EgyEffcntHmImprvCrAmt"), derived.line32);
  assertEquals(amount("IRS1040", "TaxAmt"), derived.line31TaxLimit);
  assertEquals(amount("IRS1040Schedule3", "EgyEffcntHmImprvCrAmt"), derived.line32);
}, 120_000);
