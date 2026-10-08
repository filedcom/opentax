import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { registry } from "../../../registry.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { FilingStatus } from "../../../../nodes/types.ts";
import { inputSchema } from "../../../../nodes/inputs/f8858/index.ts";

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Test",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Test Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const source = {
  activities: [{
    filing_category: "1_direct_owner_or_operator" as const,
    activity_kind: "foreign_branch" as const,
    activity_reference: "Swedish branch 2025",
    individual_tin: "111223333",
    source_document_reference: "2025 branch books and ownership review",
    related_party_transactions: true,
  }],
};

Deno.test("directly operated foreign branch remains a retained graph source", () => {
  assertEquals(inputSchema.parse(source), source);
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    f8858: source,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.pending.f8858, source);
  assertEquals(result.diagnostics, []);
  assertEquals(
    inputSchema.safeParse({
      activities: [source.activities[0], source.activities[0]],
    }).success,
    false,
  );
});

Deno.test("native and PDF final exports reject a retained individual Form 8858 filing source", async () => {
  const filer = extractFilerIdentity(general);
  for (
    const activity of [
      source.activities[0],
      {
        ...source.activities[0],
        activity_kind: "foreign_disregarded_entity" as const,
        activity_reference: "Swedish FDE 2025",
        related_party_transactions: false,
      },
    ]
  ) {
    const pending = { general, f8858: { activities: [activity] } };
    assertThrows(
      () => buildMefXml(pending, filer),
      Error,
      "Individual Form 8858 filing source",
    );
    await assertRejects(
      () => buildPdfBytes(pending, filer),
      Error,
      "Individual Form 8858 filing source",
    );
  }
});
