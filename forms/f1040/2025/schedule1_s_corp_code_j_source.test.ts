import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { registry } from "./registry.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { schedule1Pdf } from "./pdf/forms/schedule1.ts";

const general = {
  filing_status: "single",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

const issued = [{
  corporation_name: "First S Corp",
  corporation_ein: "123456789",
  source_document_reference: "2025 issued K-1 A",
  recipient_tin: "111223333",
  box10_code_j_recovery: 500,
  box10_code_j_taxable_recovery: 400,
  box10_code_j_tax_benefit_workpaper_reference: "2024 benefit review A",
  box10_code_j_prior_year_tax_benefit_reviewed: true as const,
}, {
  corporation_name: "Second S Corp",
  corporation_ein: "987654321",
  source_document_reference: "2025 issued K-1 B",
  recipient_tin: "111223333",
  box10_code_j_recovery: 700,
  box10_code_j_taxable_recovery: 600,
  box10_code_j_tax_benefit_workpaper_reference: "2024 benefit review B",
  box10_code_j_prior_year_tax_benefit_reviewed: true as const,
}];

function filing(k1_s_corps: Record<string, unknown>[] = issued) {
  return execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      box1_wages: 50_000,
      box2_fed_withheld: 5_000,
    }],
    k1_s_corp: k1_s_corps,
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("two S corporation code J sources reach line 8z, 1040, native statement and PDF", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.schedule1?.line8z_k1_s_corp_tax_benefit_recovery,
    1_000,
  );
  assertEquals(result.pending.f1040?.line8_additional_income, 1_000);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    bundle.xml,
    "S corporation K-1 code J recovery 123456789",
  );
  assertStringIncludes(
    bundle.xml,
    "S corporation K-1 code J recovery 987654321",
  );
  const [projected] = schedule1Pdf.instances!(
    pending.schedule1!,
    filer,
    pending as unknown as Record<string, Record<string, unknown>>,
  );
  assertEquals(projected.line8z_other, 1_000);
  assertStringIncludes(String(projected.line8z_description), "123456789");
  assertStringIncludes(String(projected.line8z_description), "987654321");
  await buildPdfBytes(pending, filer, ".pdf-cache", bundle);
});

Deno.test("S corporation code J rejects changed rows, K-1 copy, total and owner", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const schedule = pending.schedule1!;
  const rows = schedule.k1_s_corp_box10_code_j_sources as Array<
    Record<string, unknown>
  >;
  const changed = [
    {
      ...pending,
      schedule1: {
        ...schedule,
        k1_s_corp_box10_code_j_sources: [
          { ...rows[0], taxable_amount: 401 },
          rows[1],
        ],
      },
    },
    {
      ...pending,
      schedule1: { ...schedule, line8z_k1_s_corp_tax_benefit_recovery: 999 },
    },
    {
      ...pending,
      k1_s_corp: {
        k1_s_corps: [
          { ...issued[0], box10_code_j_taxable_recovery: 401 },
          issued[1],
        ],
      },
    },
    {
      ...pending,
      k1_s_corp: {
        k1_s_corps: [{ ...issued[0], recipient_tin: "999887777" }, issued[1]],
      },
    },
  ];
  for (const altered of changed) {
    await assertRejects(
      () => buildMefBundle(altered, { filer, attachments: [] }),
      Error,
    );
    assertThrows(
      () =>
        schedule1Pdf.instances!(
          altered.schedule1!,
          filer,
          altered as unknown as Record<string, Record<string, unknown>>,
        ),
      Error,
    );
  }
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f1040: { ...pending.f1040, line8_additional_income: 999 },
      }, { filer, attachments: [] }),
    Error,
  );
  assertEquals(
    filing([{ ...issued[0], recipient_tin: undefined }]).diagnostics.some((
      entry,
    ) => entry.nodeType === "k1_s_corp"),
    true,
  );
});
