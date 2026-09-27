import { assertEquals } from "@std/assert";
import { createReturnContext } from "../../../../core/validation/context.ts";
import { FIELD_REGISTRY } from "../field-registry.ts";
import { SB_RULES } from "./sb.ts";

function check(ruleNumber: string, fields: Record<string, unknown>): boolean {
  const context = createReturnContext(
    { schedule_b: fields },
    { primarySSN: "123456789", filingStatus: 1 },
    FIELD_REGISTRY,
  );
  const rule = SB_RULES.find((entry) => entry.ruleNumber === ruleNumber);
  if (!rule?.check) throw new Error(`Missing rule ${ruleNumber}`);
  return rule.check(context);
}

Deno.test("Schedule B FBAR business rules use MeF booleans and nonempty countries", () => {
  assertEquals(
    check("SB-F1040-006-02", {
      fincen_form114_required: true,
      foreign_country_codes: [],
    }),
    false,
  );
  assertEquals(
    check("SB-F1040-006-02", {
      fincen_form114_required: true,
      foreign_country_codes: ["CA"],
    }),
    true,
  );
  assertEquals(
    check("SB-F1040-007-02", {
      fincen_form114_required: false,
      foreign_country_codes: ["CA"],
    }),
    false,
  );
  assertEquals(
    check("SB-F1040-007-02", {
      fincen_form114_required: true,
      foreign_country_codes: ["CA"],
    }),
    true,
  );
});
