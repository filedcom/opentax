import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import { testFiler } from "../2025/mef/test-filer.ts";
import type { MefFormsPending } from "../2025/mef/types.ts";

const source = {
  payer_name: "Casino Inc",
  payer_ein: "12-3456789",
  source_document_reference: "issued-2025-casino-w2g-1",
  winner_name: "Taxpayer Test",
  winner_us_address: testFiler().address,
  box9_winner_tin: "123456789",
  box1_winnings: 1_000,
  box4_federal_withheld: 0,
};

Deno.test("identified non-withheld W-2G reaches the full return and resists payer-copy tampering", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Taxpayer",
      taxpayer_last_name: "Test",
      taxpayer_ssn: "123-45-6789",
      digital_assets: false,
    },
    w2g: [source],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8b_gambling_winnings, 1_000);
  assertEquals(result.pending.f1040?.line8_additional_income, 1_000);
  const pending = result.pending as MefFormsPending;
  const filer = {
    ...testFiler(),
    firstName: "Taxpayer",
    firstNameWithInitial: "Taxpayer",
    lastName: "Test",
    fullName: "Taxpayer Test",
  };
  assertStringIncludes(
    buildMefXml(pending, filer),
    "<GamblingReportableWinningAmt>1000</GamblingReportableWinningAmt>",
  );
  assertEquals(
    (await buildPdfBytes(pending, filer)).subarray(0, 5),
    new TextEncoder().encode("%PDF-"),
  );
  const raw = result.pending.w2g as { w2gs: Record<string, unknown>[] };
  for (
    const changed of [
      { payer_ein: undefined },
      { source_document_reference: undefined },
    ]
  ) {
    const tampered = {
      ...pending,
      w2g: { w2gs: [{ ...raw.w2gs[0], ...changed }] },
    };
    assertThrows(
      () => buildMefXml(tampered, filer),
      Error,
      "issued-copy reference and identified payer",
    );
    await assertRejects(
      () => buildPdfBytes(tampered, filer),
      Error,
      "issued-copy reference and identified payer",
    );
  }
});
