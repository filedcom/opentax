import { TS } from "../../../../../nodes/types.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { circulationPoolFixtures } from "./form6251_circulation_pools.fixture.ts";

for (const fixture of circulationPoolFixtures) {
  Deno.test(`owned circulation pools reconcile the complete return: ${fixture.id}`, async () => {
    const result = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending), f = p.f1040!, a = p.form6251!;
    const filer = extractFilerIdentity(f)!;
    assertEquals(p.schedule1?.line3_schedule_c, 0);
    assertEquals(a.line2o_circulation_costs ?? 0, fixture.difference);
    assertEquals(a.amti, 440000 + fixture.difference);
    // IRS 2025 worksheet: MFJ 168,500 × 22% − 10,172 = 26,898.
    assertEquals(f.line16_income_tax, fixture.regularTax);
    assertEquals(p.schedule2?.line2_amt, fixture.totalTax - fixture.regularTax);
    assertEquals(f.line24_total_tax, fixture.totalTax);
    assertEquals(f.line37_amount_owed, fixture.totalTax - 35000);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertStringIncludes(
      prepared.bundle.xml,
      `<TotalTaxAmt>${fixture.totalTax}</TotalTaxAmt>`,
    );
    assertEquals(
      prepared.bundle.xml.match(/<IRS1040ScheduleC /g)?.length,
      fixture.inputs.schedule_c.length,
    );
    const copies = [...prepared.bundle.xml.matchAll(
      /<IRS1040ScheduleC\b[^>]*>[\s\S]*?<\/IRS1040ScheduleC>/g,
    )].map((match) => match[0]);
    for (const business of fixture.inputs.schedule_c) {
      const copy = copies.find((xml) =>
        xml.includes(
          `<PrincipalBusinessActivityDesc>${business.line_a_principal_business}</PrincipalBusinessActivityDesc>`,
        )
      ) ?? "";
      const spouse = business.proprietor_recipient === TS.S;
      assertStringIncludes(
        copy,
        `<SSN>${spouse ? "444556666" : "123456789"}</SSN>`,
      );
      assertStringIncludes(
        copy,
        `<ProprietorNm>${spouse ? "Sam" : "Alex"} Taxpayer</ProprietorNm>`,
      );
      assertStringIncludes(
        copy,
        `<TotalOtherExpensesAmt>${business.line_1_gross_receipts}</TotalOtherExpensesAmt>`,
      );
      assertStringIncludes(copy, "<NetProfitOrLossAmt>0</NetProfitOrLossAmt>");
    }
    for (
      const change of [
        (x: typeof p) => {
          const costs = x.f59e!.f59es;
          x.f59e!.f59es[1].circulation_cost_schedule!.cost_records[0]
            .source_reference =
              costs[0].circulation_cost_schedule!.cost_records[0]
                .source_reference;
        },
        (x: typeof p) => {
          x.f59e!.f59es[0].circulation_cost_schedule!.owner_tin = "999999999";
        },
        (x: typeof p) => {
          x.f59e!.f59es.pop();
        },
        (x: typeof p) => {
          x.f59e!.f59es[1].amt_deduction = 1;
        },
      ]
    ) {
      const altered = structuredClone(p);
      change(altered);
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
    }
  });
}
