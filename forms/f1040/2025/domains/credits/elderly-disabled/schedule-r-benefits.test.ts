import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import cases from "./schedule-r-benefits.fixture.json" with { type: "json" };
import { f1040_2025 } from "../../../index.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { scheduleRPdf } from "../../../pdf/forms/credits/individual/schedule_r.ts";
import { inputSchema } from "../../../../nodes/inputs/credits/elderly-disabled/schedule_r/calculation.ts";

for (const [id, c] of Object.entries(cases)) {
  Deno.test(`Schedule R benefits and single disability: ${id}`, async () => {
    const held = structuredClone(c.inputs);
    const result = f1040_2025.executeReturn(c.inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending), f = pending.f1040!;
    assertEquals(f.line18_total_tax_before_credits, c.expected.taxBefore);
    assertEquals(
      pending.schedule3?.line6d_elderly_disabled_credit ?? 0,
      c.expected.credit,
    );
    assertEquals(f.line24_total_tax, c.expected.tax);
    assertEquals(f.line27_eitc ?? 0, c.expected.eitc);
    assertEquals(f.line35a_refund ?? 0, c.expected.refund);
    assertEquals(f.line37_amount_owed ?? 0, c.expected.owed);
    const source = inputSchema.parse(pending.schedule_r);
    const fields = scheduleRPdf.projectFields!(source, {
      schedule_r: source,
      f1040: f,
      schedule3: pending.schedule3 ?? {},
    });
    assertEquals(fields.line22 ?? 0, c.expected.credit);
    if (c.expected.credit > 0) {
      assertEquals(fields.line13a ?? 0, source.nontaxable_ssa ?? 0);
      assertEquals(
        fields.line13b ?? 0,
        (source.nontaxable_pension ?? 0) + (source.nontaxable_va ?? 0),
      );
      assertEquals(
        fields.priorYearStatement,
        id === "single-disability-17000" ? "yes" : undefined,
      );
    }
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(
      bundle.xml.includes("<IRS1040ScheduleR"),
      c.expected.credit > 0,
    );
    if (c.expected.credit > 0) {
      assertStringIncludes(
        bundle.xml,
        `<CreditForElderlyOrDisabledAmt>${c.expected.credit}</CreditForElderlyOrDisabledAmt>`,
      );
    }
    if ("ssa1099" in c.inputs) {
      assertEquals(f.line6a_ss_gross, c.inputs.ssa1099[0].box5_net_benefits);
      assertEquals(f.line6b_ss_taxable ?? 0, 0);
    }
    assertEquals(c.inputs, held);
  });
}

Deno.test("Schedule R benefit exports reject missing reviews and conflicting finalized SSA", async () => {
  const result = f1040_2025.executeReturn(cases["mfs-mixed-benefits"].inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending),
    filer = extractFilerIdentity(result.pending.f1040)!;
  const source = inputSchema.parse(pending.schedule_r);
  const changes = [
    { ...source, nontaxable_ssa_source_reference: undefined },
    { ...source, nontaxable_pension_source_reference: undefined },
    { ...source, nontaxable_pension_line13b_eligible_verified: undefined },
    { ...source, nontaxable_va_source_reference: undefined },
    { ...source, nontaxable_va_veterans_pension_verified: undefined },
    { ...source, nontaxable_ssa: 999 },
  ];
  for (const changed of changes) {
    await assertRejects(
      () =>
        buildMefBundle({ ...pending, schedule_r: changed }, {
          filer,
          attachments: [],
        }),
      Error,
    );
    assertThrows(
      () =>
        scheduleRPdf.projectFields!(changed, {
          schedule_r: changed,
          f1040: pending.f1040!,
          schedule3: pending.schedule3!,
        }),
      Error,
    );
  }
});
