import { assertEquals, assertThrows } from "@std/assert";
import { w2 } from "../../nodes/inputs/w2/index.ts";
import {
  computeScheduleHAmounts,
  schedule_h,
} from "../../nodes/intermediate/forms/schedule_h/index.ts";
import {
  scenario104001Input,
  SCENARIO_1040_01_RECONCILIATION,
} from "./scenario_1040_01_input.ts";

Deno.test("ATS 1040 Scenario 1 retains two distinct W-2s and a partial Schedule H", () => {
  const input = scenario104001Input();
  const wageForms = input.w2 as Record<string, unknown>[];
  const household = input.schedule_h as Record<string, unknown>;
  assertEquals(Object.keys(input).sort(), ["general", "schedule_h", "w2"]);
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

Deno.test("ATS 1040 Scenario 1 W-2 and household tax source slices reconcile", () => {
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

Deno.test("ATS 1040 Scenario 1 keeps Form 5695 packet conflicts outside filing input", () => {
  const input = scenario104001Input();
  const source = SCENARIO_1040_01_RECONCILIATION.form5695;
  assertEquals("f5695" in input, false);
  assertEquals("form5695" in input, false);
  assertEquals(source.individuallyListedDoorCosts, [1_020, 920, 800]);
  assertEquals(
    source.individuallyListedDoorCosts.reduce((sum, cost) => sum + cost, 0),
    source.printedLine19eOtherDoorsCost,
  );
  assertEquals(source.otherDoorItemsProvided, false);
  assertEquals(source.secondAirConditionerCost, 400);
  assertEquals(source.secondAirConditionerQmidProvided, false);
});
