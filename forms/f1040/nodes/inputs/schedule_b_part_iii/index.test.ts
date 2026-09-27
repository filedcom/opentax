import { assertEquals } from "@std/assert";
import { inputSchema, schedule_b_part_iii } from "./index.ts";

Deno.test("Schedule B Part III input requires the separate FBAR decision", () => {
  assertEquals(
    inputSchema.safeParse({
      foreign_accounts_question: true,
      foreign_trust_question: false,
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      foreign_accounts_question: true,
      fincen_form114_required: true,
      foreign_trust_question: false,
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      foreign_accounts_question: true,
      fincen_form114_required: true,
      foreign_countries: [{ irs_code: "CA", name: "Canada" }],
      foreign_trust_question: false,
    }).success,
    true,
  );
  // An elected child's account may supply the affirmative account answer.
  assertEquals(
    inputSchema.safeParse({
      foreign_accounts_question: false,
      fincen_form114_required: true,
      foreign_countries: [{ irs_code: "CA", name: "Canada" }],
      foreign_trust_question: false,
    }).success,
    true,
  );
});

Deno.test("Schedule B Part III input routes explicit answers without tax", () => {
  const result = schedule_b_part_iii.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      foreign_accounts_question: true,
      fincen_form114_required: false,
      foreign_trust_question: true,
    },
  );
  assertEquals(result.outputs, [{
    nodeType: "schedule_b",
    fields: {
      foreign_accounts_question: true,
      fincen_form114_required: false,
      foreign_trust_question: true,
    },
  }]);
});
