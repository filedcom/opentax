import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { combinedInvestmentInputs } from "./eic_combined_investment.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";

Deno.test("combined investment categories calculate the EIC boundary but keep the unreconciled royalty/PAL filing guarded", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const artifactRoot = flag < 0 ? undefined : Deno.args[flag + 1];
  for (const above of [false, true]) {
    const inputs = combinedInvestmentInputs(above);
    const result = f1040_2025.executeReturn(inputs);
    const p = normalizeAllPending(result.pending);
    assertEquals(result.diagnostics, []);
    // Independent source arithmetic, with a real 5,000 allowed farm loss.
    assertEquals(p.f1040.line2b_taxable_interest, 200);
    assertEquals(p.f1040.line2a_tax_exempt, 7000 + Number(above));
    assertEquals(p.f1040.line3b_ordinary_dividends, 300);
    assertEquals(p.f1040.line7a_cap_gain_distrib, 400);
    assertEquals(p.schedule1.line8z_form8814, 1400);
    assertEquals(p.schedule1.line8l_personal_property_rent, 900);
    assertEquals(p.schedule1.line24b_personal_property_expenses, 300);
    assertEquals(p.schedule1.line5_schedule_e, 1900);
    assertEquals(p.form8582.current_income, 6000);
    assertEquals(p.form8582.current_loss, 5000);
    assertEquals(result.carryforwards.suspended_pal_8582 ?? 0, 0);
    assertEquals(p.eitc.investment_income_floor, 11950 + Number(above));
    assertEquals(p.f1040.line11_agi, 9800);
    assertEquals(p.f1040.line27_eitc ?? 0, above ? 0 : 384);
    assertEquals(p.f1040.line16_income_tax, 135);
    assertEquals(p.f1040.line35a_refund ?? 0, above ? 0 : 249);
    assertEquals(p.f1040.line37_amount_owed ?? 0, above ? 135 : 0);
    const pending = buildPending(result.pending);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const guard = "Form 8582 K-1 gross Schedule E income differs";
    await assertRejects(
      () => buildMefBundle(pending, { filer, attachments: [] }),
      Error,
      guard,
    );
    await assertRejects(
      () => buildPdfBytes(pending, filer),
      Error,
      guard,
    );
    if (artifactRoot) {
      const path = `${artifactRoot}/combined-${above ? 11951 : 11950}.json`;
      const handle = await Deno.open(path, {
        write: true,
        createNew: true,
        mode: 0o600,
      });
      try {
        await handle.write(new TextEncoder().encode(JSON.stringify(
          {
            inputs,
            pending: p,
            carryforwards: result.carryforwards,
            expected: {
              investment: 11950 + Number(above),
              agi: 9800,
              eic: above ? 0 : 384,
              allowedLoss: 5000,
              suspendedLoss: 0,
            },
            nativeGuard: guard,
            pdfGuard: guard,
            filingReady: false,
            issuerVerified: false,
          },
          null,
          2,
        )));
      } finally {
        handle.close();
      }
    }
  }
});

Deno.test("combined royalty and retained passive sale preserve the per-property reconciliation guard", () => {
  const result = f1040_2025.executeReturn(
    combinedInvestmentInputs(false, true),
  );
  const diagnostics = result.diagnostics.filter((d) =>
    d.nodeType === "schedule_e"
  );
  assertEquals(diagnostics.length, 1);
  assertStringIncludes(
    diagnostics[0].message,
    "property royalties and 1099-MISC passthrough royalties need per-property reconciliation",
  );
});
