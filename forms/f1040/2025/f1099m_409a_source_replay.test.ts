import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { registry } from "./registry.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";

const general = {
  filing_status: "single",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  digital_assets: false,
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

function filing() {
  return execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "10 Work St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: "111-22-3333",
      box1_wages: 50_000,
      box2_fed_withheld: 5_000,
    }],
    f1099m: [{
      payer_name: "Deferred Compensation Payer",
      payer_tin: "123456789",
      recipient_tin: "111223333",
      source_document_reference: "issued 2025 1099-MISC",
      box3_other_income: 1_000,
      box3_other_income_routing: "other_income",
      box3_other_income_description: "Section 409A deferred compensation",
      box15_nqdc: 1_000,
      box15_409a_review: {
        included_in_box3: true,
        interest_amount: 7,
        interest_workpaper_reference: "reviewed section 409A interest",
      },
    }],
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("1099-MISC box 15 taxes reviewed box 3 income once through 1040, native and PDF", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8z_nqdc, undefined);
  assertEquals(result.pending.f1040?.line8_additional_income, 1_000);
  assertEquals(result.pending.schedule2?.line17h_nqdc_tax, 207);
  assertEquals(result.pending.f1040?.line23_other_taxes, 207);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(native.xml, "Section 409A deferred compensation");
  assertStringIncludes(
    native.xml,
    "<IncmNonqlfyDefrdCompPlanAmt>207</IncmNonqlfyDefrdCompPlanAmt>",
  );
  const pdf = await buildPdfBytes(pending, filer, ".pdf-cache", native);
  const extracted = new Deno.Command("pdftotext", {
    args: ["-", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = extracted.stdin.getWriter();
  await writer.write(pdf);
  await writer.close();
  const text = new TextDecoder().decode((await extracted.output()).stdout);
  assertStringIncludes(text, "Section 409A deferred compensation");
});

Deno.test("409A direct Schedule 1 deposit or changed interest rejects in both exports", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const changes = [{
    ...pending,
    schedule1: { ...pending.schedule1!, line8z_nqdc: 1_000 },
  }, {
    ...pending,
    schedule2: { ...pending.schedule2!, line17h_nqdc_tax: 200 },
  }, {
    ...pending,
    f1099m: {
      f1099ms: [{
        ...((pending as unknown as { f1099m: { f1099ms: Array<Record<string, unknown>> } }).f1099m)
          .f1099ms[0],
        box15_409a_review: {
          included_in_box3: true,
          interest_amount: 8,
          interest_workpaper_reference: "reviewed section 409A interest",
        },
      }],
    },
  }];
  for (const changed of changes) {
    await assertRejects(() =>
      buildMefBundle(changed, { filer, attachments: [] })
    );
    await assertRejects(() => buildPdfBytes(changed, filer));
  }
});
