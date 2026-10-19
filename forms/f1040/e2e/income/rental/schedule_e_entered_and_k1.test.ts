import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";

// 2025 Instructions for Schedule E, Part I: royalties from a partnership K-1
// box 7 go on Schedule E Part I beside the taxpayer's own rental properties,
// and line 26 (Schedule 1 line 5) is the total of every property.
test("K-1 box 7 royalties join, not replace, an entered Schedule E rental", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_ssn: "123456789",
      digital_assets: false,
    },
    schedule_e: [{
      tsj: "T",
      property_description: "12 Example St, Austin TX",
      activity_type: "A",
      personal_use_days: 0,
      form_1099_payments_made: false,
      property_type: 1,
      fair_rental_days: 365,
      rent_income: 6_000,
    }],
    k1_partnership: [{
      partnership_name: "Royalty Partners",
      partnership_ein: "311111111",
      source_document_reference: "2025 K-1 Royalty Partners",
      recipient_tin: "123456789",
      box7_royalties: 1_000,
      box7_royalty_reporting: {
        tsj: "T",
        property_description: "Royalty Partners mineral royalties",
        portfolio_nonpassive: true,
        form_1099_payments_made: false,
      },
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    result.diagnostics.filter((d) => d.nodeType === "schedule_e"),
    [],
  );
  assertEquals(result.pending.schedule1?.line5_schedule_e, 7_000);
});
