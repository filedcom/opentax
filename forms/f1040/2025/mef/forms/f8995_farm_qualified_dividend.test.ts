import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../registry.ts";
import { form8995Pdf } from "../../pdf/forms/f8995.ts";
import { buildMefXml } from "../builder.ts";
import { testFiler } from "../test-filer.ts";
import { form8995 } from "./f8995.ts";

const dividend = {
  recipient_tin: "123456789",
  payerName: "Farm Investment Fund",
  source_document_reference: "2025 issued Farm Investment Fund 1099-DIV",
  isNominee: false,
  box11: false,
  box1a: 1_000,
  box1b: 600,
};

function filedFarm() {
  return execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      digital_assets: false,
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Farmer",
      taxpayer_ssn: "123-45-6789",
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_f: {
      schedule_fs: [{
        farm_id: "north",
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_c_farm_name: "North Farm",
        line_d_ein: "123456789",
        line_e_material_participation: true,
        accounting_method: "cash",
        line1_sales_livestock_resale: 0,
        line2_sales_products_raised: 80_000,
        ccc_loan_election_in_effect: false,
        qbi_no_other_adjustments_confirmed: true,
      }],
    },
    f1099div: [dividend],
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("farm QBI and one qualified-dividend copy reach Form 1040, Form 8995, MeF and PDF", () => {
  const result = filedFarm();
  assertEquals(result.diagnostics, []);
  const { pending } = result;
  const fields = pending.form8995;
  assertEquals(pending.schedule1?.line6_schedule_f, 80_000);
  assertEquals(pending.f1040?.line3a_qualified_dividends, 600);
  assertEquals(pending.f1040?.line3b_ordinary_dividends, 1_000);
  assertEquals(fields?.line12, 600);
  assertEquals(fields?.line13, Math.max(0, (fields?.line11 as number) - 600));
  assertEquals(fields?.line15, pending.f1040?.line13_qbi_deduction);
  const xml = form8995.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<BusinessNameLine1Txt>North Farm</BusinessNameLine1Txt>",
  );
  assertStringIncludes(xml, "<NetCapitalGainAmt>600</NetCapitalGainAmt>");
  const returnXml = buildMefXml(pending, testFiler());
  assertStringIncludes(returnXml, "<IRS8995 documentId=");
  const pdf = form8995Pdf.projectFields?.(fields, pending);
  assertEquals(pdf?.line12, 600);
  assertEquals(pdf?.line15, fields?.line15);
});

Deno.test("farm QBI export rejects altered qualified-dividend source and return", () => {
  const { pending } = filedFarm();
  const fields = pending.form8995;
  for (
    const item of [
      { ...dividend, box1b: 599 },
      { ...dividend, box1a: 999 },
      { ...dividend, source_document_reference: undefined },
      { ...dividend, box5: 100 },
      { ...dividend, box2a: 100 },
    ]
  ) {
    const changed = { ...pending, f1099div: { f1099divs: [item] } };
    assertThrows(() => form8995.build(fields, { pending: changed }), Error);
    assertThrows(() => form8995Pdf.projectFields?.(fields, changed), Error);
  }
  const changedReturn = {
    ...pending,
    f1040: { ...pending.f1040, line3a_qualified_dividends: 599 },
  };
  assertThrows(() => form8995.build(fields, { pending: changedReturn }), Error);
  assertThrows(() => form8995Pdf.projectFields?.(fields, changedReturn), Error);
  assertThrows(
    () =>
      form8995.build(
        Object.assign({}, fields, { line12: 599 }) as Parameters<
          typeof form8995.build
        >[0],
        { pending },
      ),
    Error,
  );
});
