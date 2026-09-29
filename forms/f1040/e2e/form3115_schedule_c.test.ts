import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { scheduleC } from "../2025/mef/forms/schedule_c.ts";
import { scheduleCPdf } from "../2025/pdf/forms/schedule_c.ts";
import { testFiler } from "../2025/mef/test-filer.ts";
import { inputSchema as form3115InputSchema } from "../nodes/inputs/f3115/index.ts";
import { inputSchema as scheduleCInputSchema } from "../nodes/inputs/schedule_c/model.ts";

Deno.test("Form 3115 source reaches one Schedule C profit and both projections", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Gardenia",
      taxpayer_ssn: "400001212",
    },
    schedule_c: [{
        business_reference: "DESIGN",
        line_a_principal_business: "DESIGNER",
        line_b_business_code: "541310",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_i_made_1099_payments: false,
        line_1_gross_receipts: 20_000,
      }],
    f3115: [{
        business_reference: "DESIGN",
        designated_change_number: "222",
        filing_type: "automatic",
        reporting_schedule: "schedule_c",
        year_of_change: 2025,
        section_481_adjustment: 12_000,
      }],
  }, { taxYear: 2025, formType: "f1040" });

  assertEquals(result.diagnostics, []);
  const source = form3115InputSchema.parse(result.pending.f3115);
  const scheduleCFields = scheduleCInputSchema.parse(result.pending.schedule_c);
  assertEquals(source.f3115s[0].section_481_adjustment, 12_000);
  assertEquals(scheduleCFields.section481a_adjustments?.[0].amount, 3_000);
  assertEquals(result.pending.schedule1?.line3_schedule_c, 23_000);

  const [xml] = scheduleC.build(scheduleCFields, {
    filer: testFiler(),
    pending: result.pending,
  });
  assertStringIncludes(xml, "<OtherIncomeAmt>3000</OtherIncomeAmt>");
  assertStringIncludes(xml, "<NetProfitOrLossAmt>23000</NetProfitOrLossAmt>");

  const projected = scheduleCPdf.projectFields?.(
    result.pending.schedule_c,
    result.pending,
  ) ?? {};
  const [copy] = scheduleCPdf.instances?.(projected) ?? [];
  assertEquals(copy.line6, 3_000);
  assertEquals(copy.line31, 23_000);
});
