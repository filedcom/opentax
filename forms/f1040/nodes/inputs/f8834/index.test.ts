import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { f8834 } from "./index.ts";

const source = {
  source_form: "8582-CR" as const,
  source_activity_id: "rental-a",
  allowed_passive_activity_credit: 600,
};

Deno.test("Form 8834 takes only current-year allowed Form 8582-CR passive credits", () => {
  const result = f8834.compute({ taxYear: 2025, formType: "f1040" }, {
    f8834s: [source],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.form8834_source_credit, 600);
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.form8834_source_credit_pending,
    true,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule3)
      ?.line6i_qualified_electric_vehicle_credit,
    undefined,
  );
  assertEquals(fieldsOf(result.outputs, form6251)?.must_file_for_credit, true);
});

Deno.test("Form 8834 sums distinct Form 8582-CR activities", () => {
  const result = f8834.compute({ taxYear: 2025, formType: "f1040" }, {
    f8834s: [source, {
      ...source,
      source_activity_id: "rental-b",
      allowed_passive_activity_credit: 150,
    }],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.form8834_source_credit, 750);
});

Deno.test("Form 8834 rejects duplicate sources and obsolete vehicle-cost input", () => {
  assertEquals(
    f8834.inputSchema.safeParse({ f8834s: [source, source] }).success,
    false,
  );
  assertEquals(
    f8834.inputSchema.safeParse({ f8834s: [{ cost: 25_000 }] }).success,
    false,
  );
  assertThrows(() =>
    f8834.compute({ taxYear: 2025, formType: "f1040" }, {
      f8834s: [{ ...source, allowed_passive_activity_credit: -1 }],
    }), Error);
});
