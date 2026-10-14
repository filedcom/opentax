import { assertEquals, assertStringIncludes } from "@std/assert";
import cases from "./schedule-r-credit-limit.fixture.json" with {
  type: "json",
};
import { f1040_2025 } from "../../../index.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { scheduleRPdf } from "../../../pdf/forms/credits/individual/schedule_r.ts";
import { inputSchema } from "../../../../nodes/inputs/credits/elderly-disabled/schedule_r/calculation.ts";

Deno.test("Schedule R public returns settle zero and partial limits before retirement credits", async () => {
  for (const [id, c] of Object.entries(cases)) {
    const held = structuredClone(c.inputs);
    const result = f1040_2025.executeReturn(c.inputs);
    assertEquals(result.diagnostics, [], id);
    const pending = buildPending(result.pending), f = pending.f1040!;
    assertEquals(f.line18_total_tax_before_credits, c.expected.taxBefore, id);
    assertEquals(
      pending.schedule3?.line6d_elderly_disabled_credit ?? 0,
      c.expected.credit,
      id,
    );
    assertEquals(f.line24_total_tax, c.expected.tax, id);
    assertEquals(
      f.line20_nonrefundable_credits,
      c.expected.taxBefore - c.expected.tax,
      id,
    );
    if ("retirement" in c.expected) {
      assertEquals(
        pending.schedule3?.line4_retirement_savings_credit ?? 0,
        c.expected.retirement,
        id,
      );
    }
    const source = inputSchema.parse(pending.schedule_r);
    const fields = scheduleRPdf.projectFields!(source, {
      schedule_r: source,
      f1040: f,
      schedule3: pending.schedule3 ?? {},
    });
    assertEquals(fields.line22 ?? 0, c.expected.credit, id);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    if (c.expected.credit === 0) {
      assertEquals(bundle.xml.includes("<IRS1040ScheduleR"), false, id);
    } else {assertStringIncludes(
        bundle.xml,
        `<CreditForElderlyOrDisabledAmt>${c.expected.credit}</CreditForElderlyOrDisabledAmt>`,
      );}
    assertEquals(c.inputs, held, id);
  }
});
