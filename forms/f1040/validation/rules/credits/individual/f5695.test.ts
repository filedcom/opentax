import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "../../../../../../core/validation/context.ts";
import { F5695_RULES } from "./f5695.ts";

function passes(id: string, fields: Record<string, unknown>): boolean {
  const check = F5695_RULES.find((item) => item.ruleNumber === id)?.check;
  if (!check) throw new Error(`Missing rule ${id}`);
  return check(
    createReturnContext(
      { form5695: fields },
      { primarySSN: "400001032", filingStatus: 1 },
      new Map(),
    ),
  );
}

test("F5695 percentage rules accept the per-line caps printed on Form 5695", () => {
  assertEquals(
    passes("F5695-039-02", {
      MostExpnsExtrDoorCostAmt: 1_020,
      MostExpnsExtrDoorsStdPctCrAmt: 250,
    }),
    true,
  );
  assertEquals(
    passes("F5695-039-02", {
      MostExpnsExtrDoorCostAmt: 600,
      MostExpnsExtrDoorsStdPctCrAmt: 250,
    }),
    false,
  );
  assertEquals(
    passes("F5695-046-02", {
      CentralAirCondCostAmt: 2_500,
      CentralAirCondCostStdPctCrAmt: 600,
    }),
    true,
  );
});

test("F5695-040-02 takes 30% of line 19f, the total of lines 19d and 19e", () => {
  const doors = {
    NextMostExpnsExtrDoorCostAmt: 1_720,
    OtherQlfyExtrDoorsCostAmt: 2_740,
    TotalOtherQlfyExtrDoorsCostAmt: 4_460,
  };
  assertEquals(
    passes("F5695-040-02", { ...doors, OtherQlfyExtrDoorsStdPctCrAmt: 1_338 }),
    true,
  );
  assertEquals(
    passes("F5695-040-02", { ...doors, OtherQlfyExtrDoorsStdPctCrAmt: 822 }),
    false,
  );
});
