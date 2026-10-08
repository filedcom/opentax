import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import { registry } from "../../registry.ts";
import { buildMefBundle, buildMefXml } from "../builder.ts";
import { buildPending } from "../execution/pending.ts";

Deno.test("invalid reviewed address cannot enter native return or prepared bundle", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Tester",
      taxpayer_ssn: "123456789",
      address_line1: "1 Main St\u0001",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  assertEquals(filer.address.line1, "1 Main St\u0001");
  assertThrows(() => buildMefXml(pending, filer), Error, "invalid character");
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "invalid character",
  );
});

Deno.test("raw root returnVersion cannot inject XML or enter a prepared bundle", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Tester",
      taxpayer_ssn: "123456789",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  for (
    const schemaVersion of [
      '2025v5.4" injected="true',
      "2025v5.4\u0001",
      "2025v3.0",
    ]
  ) {
    assertThrows(
      () => buildMefXml(pending, filer, schemaVersion),
      Error,
      "reviewed MeF schema version",
    );
    await assertRejects(
      () => buildMefBundle(pending, { filer, attachments: [], schemaVersion }),
      Error,
      "reviewed MeF schema version",
    );
  }
});
