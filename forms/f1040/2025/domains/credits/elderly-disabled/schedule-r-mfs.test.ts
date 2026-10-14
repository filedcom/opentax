import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import inputs from "./schedule-r-mfs.fixture.json" with { type: "json" };
import { f1040_2025 } from "../../../index.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { inputSchema as scheduleRSchema } from "../../../../nodes/inputs/credits/elderly-disabled/schedule_r/index.ts";
import { scheduleR } from "../../../mef/forms/credits/individual/schedule_r.ts";
import { scheduleRPdf } from "../../../pdf/forms/credits/individual/schedule_r.ts";

Deno.test("Schedule R apart-all-year MFS age and disability sources reach final tax and native/PDF", async () => {
  for (const [key, source] of Object.entries(inputs)) {
    const held = structuredClone(source);
    const result = f1040_2025.executeReturn(source);
    assertEquals(result.diagnostics, [], key);
    const pending = buildPending(result.pending);
    const f = pending.f1040!;
    // IRS 2025 Tax Table: MFS $7,500–7,550 => $753.
    // Schedule R: ($3,750 - ($7,500 - $5,000) / 2) * 15% = $375.
    assertEquals(f.line11_agi, 7500);
    assertEquals(f.line15_taxable_income, 7500);
    assertEquals(f.line18_total_tax_before_credits, 753);
    assertEquals(pending.schedule3?.line6d_elderly_disabled_credit, 375);
    assertEquals(f.line20_nonrefundable_credits, 375);
    assertEquals(f.line24_total_tax, 378);
    if (key === "box8") assertEquals(f.line37_amount_owed, 378);
    else assertEquals(f.line35a_refund, 622);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertStringIncludes(
      bundle.xml,
      key === "box8"
        ? "<Age65OrOldrNotLvngTogetherInd>X</Age65OrOldrNotLvngTogetherInd>"
        : "<Under65DidNotLiveTogetherInd>X</Under65DidNotLiveTogetherInd>",
    );
    assertStringIncludes(
      bundle.xml,
      "<CreditForElderlyOrDisabledAmt>375</CreditForElderlyOrDisabledAmt>",
    );
    const fields = scheduleRPdf.projectFields!(
      scheduleRSchema.parse(pending.schedule_r),
      {
        schedule_r: scheduleRSchema.parse(pending.schedule_r),
        f1040: pending.f1040!,
        schedule3: pending.schedule3!,
      },
    );
    assertEquals(fields[key], "yes");
    assertEquals(fields.line10, 3750);
    assertEquals(fields.line11, key === "box8" ? 0 : 7500);
    assertEquals(fields.line12, 3750);
    assertEquals(fields.line17, 1250);
    assertEquals(fields.line21, 753);
    assertEquals(fields.line22, 375);
    assertEquals(source, held);
  }
});

Deno.test("Schedule R full MFS return rejects missing residence and physician evidence at native/PDF export", async () => {
  const result = f1040_2025.executeReturn(inputs.box9);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  for (
    const source of [
      {
        ...pending.schedule_r!,
        mfs_lived_apart_all_year_source_reference: undefined,
      },
      { ...pending.schedule_r!, taxpayer_disability_evidence: undefined },
    ]
  ) {
    const candidate = { ...pending, schedule_r: source };
    assertThrows(() => scheduleR.build(source, { pending: candidate, filer }));
    assertThrows(() =>
      scheduleRPdf.projectFields!(source, {
        schedule_r: source,
        f1040: pending.f1040!,
        schedule3: pending.schedule3!,
      })
    );
    await assertRejects(() =>
      buildMefBundle(candidate, { filer, attachments: [] })
    );
  }
});
