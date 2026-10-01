import { assertEquals, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import {
  form8995 as form8995Node,
  inputSchema as form8995InputSchema,
} from "../../../nodes/intermediate/forms/form8995/index.ts";
import { registry } from "../../registry.ts";
import { form8995Pdf } from "../../pdf/forms/f8995.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { form8995 } from "./f8995.ts";

const sourceBusiness = {
  business_reference: "c-cents",
  line_a_principal_business: "Repairs",
  line_b_business_code: "811490",
  line_c_business_name: "Example Repairs",
  line_d_ein: "12-3456789",
  line_f_accounting_method: "cash",
  line_g_material_participation: true,
  qbi_no_other_adjustments_confirmed: true,
} as const;

for (
  const [rawQbi, filedLine1, filedDeduction] of [
    [302.49, 302, 60],
    [302.50, 303, 61],
  ] as const
) {
  Deno.test(`Form 8995 rounds sourced Schedule C $${rawQbi} only at whole-dollar lines`, () => {
    const source = { ...sourceBusiness, line_1_gross_receipts: rawQbi };
    const result = form8995Node.compute({ taxYear: 2025, formType: "f1040" }, {
      qbi_from_schedule_c: rawQbi,
      filing_status: FilingStatus.Single,
      agi: 50_000,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
      schedule_c_qbi_businesses: [{
        business_reference: "c-cents",
        business_name: "Example Repairs",
        ein: "123456789",
        qbi: rawQbi,
        w2_wages: 0,
        ubia: 0,
        no_other_adjustments_confirmed: true,
        source_schedule_c: source,
      }],
    });
    const filed = result.outputs.find((item) => item.nodeType === "form8995");
    assertEquals(filed?.fields.line1_qbi, filedLine1);
    assertEquals(filed?.fields.line5, filedDeduction);
    assertEquals(filed?.fields.line15, filedDeduction);
    assertEquals(
      result.outputs.find((item) => item.nodeType === "f1040")?.fields
        .line13_qbi_deduction,
      filedDeduction,
    );
  });
}

Deno.test("Schedule C cents survive the source graph and reconcile to both Form 8995 exports", () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-schedule-c"
  );
  if (!fixture) throw new Error("missing Schedule C review fixture");
  const original = fixture.inputs.schedule_c;
  if (!Array.isArray(original) || original.length !== 1) {
    throw new Error("expected one Schedule C review source");
  }
  const source = { ...original[0], line_1_gross_receipts: 80_000.49 };
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
    schedule_c: [source],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const { pending } = result;
  const fields = pending.form8995;
  assertEquals(pending.schedule1?.line3_schedule_c, 80_000.49);
  assertEquals(fields?.qbi_from_schedule_c, 80_000.49);
  assertEquals(
    form8995InputSchema.parse(fields).schedule_c_qbi_businesses?.[0].qbi,
    80_000.49,
  );
  const seDeduction = pending.schedule1?.line15_se_deduction;
  if (typeof seDeduction !== "number") {
    throw new Error("Schedule 1 needs a computed self-employment deduction");
  }
  assertEquals(
    fields?.line1_qbi,
    Math.round(80_000.49 - seDeduction),
  );
  assertEquals(fields?.line15, pending.f1040?.line13_qbi_deduction);
  const xml = form8995.build(fields, { pending });
  assertEquals(
    xml.includes(
      `<QlfyBusinessIncomeOrLossAmt>${fields?.line1_qbi}</QlfyBusinessIncomeOrLossAmt>`,
    ),
    true,
  );
  const pdf = form8995Pdf.projectFields?.(fields, pending);
  assertEquals(pdf?.line1_qbi, fields?.line1_qbi);
  assertEquals(pdf?.line15, pending.f1040?.line13_qbi_deduction);

  const alteredPending = {
    ...pending,
    schedule_c: {
      ...pending.schedule_c,
      schedule_cs: [{ ...source, line_1_gross_receipts: 80_000.50 }],
    },
  };
  assertThrows(
    () => form8995.build(fields, { pending: alteredPending }),
    Error,
  );
  assertThrows(
    () => form8995Pdf.projectFields?.(fields, alteredPending),
    Error,
  );
});
