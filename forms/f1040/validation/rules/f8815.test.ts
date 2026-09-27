import { assertEquals } from "@std/assert";
import { createReturnContext } from "../../../../core/validation/context.ts";
import { FIELD_REGISTRY } from "../field-registry.ts";
import { F8815_RULES } from "./f8815.ts";

function rulePasses(
  ruleNumber: string,
  filingStatus: number,
  magi: number,
): boolean {
  const context = createReturnContext(
    { form8815: { line9: magi } },
    { primarySSN: "123456789", filingStatus },
    FIELD_REGISTRY,
  );
  const rule = F8815_RULES.find((entry) => entry.ruleNumber === ruleNumber);
  if (!rule?.check) throw new Error(`Missing rule ${ruleNumber}`);
  return rule.check(context);
}

Deno.test("Form 8815 MFJ MAGI must be below $179,250", () => {
  assertEquals(rulePasses("F8815-001-14", 2, 179_249), true);
  assertEquals(rulePasses("F8815-001-14", 2, 179_250), false);
  assertEquals(rulePasses("F8815-001-14", 1, 100_000), true);
});

for (const status of [1, 4, 5]) {
  Deno.test(`Form 8815 status ${status} MAGI must be below $114,500`, () => {
    assertEquals(rulePasses("F8815-002-14", status, 114_499), true);
    assertEquals(rulePasses("F8815-002-14", status, 114_500), false);
    assertEquals(rulePasses("F8815-001-14", status, 100_000), true);
  });
}
