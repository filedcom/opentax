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
  payer_name: "Texas RTAA Agency",
  payer_tin: "123456789",
  recipient_tin: "111223333",
  source_document_reference: "2025 issued RTAA 1099-G A",
  account_number: "RTAA-A",
  box_5_rtaa: 400,
}, {
  payer_name: "Oklahoma RTAA Agency",
  payer_tin: "987654321",
  recipient_tin: "111223333",
  source_document_reference: "2025 issued RTAA 1099-G B",
  account_number: "RTAA-B",
  box_5_rtaa: 600,
}];

function filing(f1099g: Record<string, unknown>[] = issued) {
  return execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      box1_wages: 50_000,
      box2_fed_withheld: 5_000,
    }],
    f1099g,
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("two issued RTAA copies reach Schedule 1 line 8z, Form 1040, native statement and PDF", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8z_rtaa, 1_000);
  assertEquals(result.pending.f1040?.line8_additional_income, 1_000);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(bundle.xml, "RTAA payments 123456789");
  assertStringIncludes(bundle.xml, "RTAA payments 987654321");
  assertStringIncludes(bundle.xml, "<OtherIncomeTotalAmt");
  const [projected] = schedule1Pdf.instances!(
    pending.schedule1!,
    filer,
    pending,
  );
  assertEquals(projected.line8z_other, 1_000);
  assertStringIncludes(String(projected.line8z_description), "123456789");
  assertStringIncludes(String(projected.line8z_description), "987654321");
  await buildPdfBytes(pending, filer, ".pdf-cache", bundle);
});

Deno.test("RTAA export rejects changed rows, source copies, line total and recipient", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const schedule = pending.schedule1!;
  const sourceRows = schedule.f1099g_rtaa_sources as Array<
    Record<string, unknown>
  >;
  const changes = [
    {
      ...pending,
      schedule1: {
        ...schedule,
        f1099g_rtaa_sources: [
          { ...sourceRows[0], amount: 401 },
          sourceRows[1],
        ],
      },
    },
    {
      ...pending,
      schedule1: { ...schedule, line8z_rtaa: 999 },
    },
    {
      ...pending,
      f1099g: {
        f1099gs: [{ ...issued[0], box_5_rtaa: 401 }, issued[1]],
      },
    },
    {
      ...pending,
      f1099g: {
        f1099gs: [
          { ...issued[0], recipient_tin: "999887777" },
          issued[1],
        ],
      },
    },
  ];
  for (const changed of changes) {
    await assertRejects(
      () => buildMefBundle(changed, { filer, attachments: [] }),
      Error,
    );
    assertThrows(
      () => schedule1Pdf.instances!(changed.schedule1!, filer, changed),
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
  const missingIdentity = filing([{ box_5_rtaa: 400 }]);
  assertEquals(
    missingIdentity.diagnostics.some((entry) => entry.nodeType === "f1099g"),
    true,
  );
});
