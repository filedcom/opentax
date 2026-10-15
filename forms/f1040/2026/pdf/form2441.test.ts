import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildForm2441PdfBytes2026 } from "./form2441.ts";
import { dependentCareFixture2026 } from "../inputs/dependent-care.fixture.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import type { calculateCareCredit2026 } from "../nodes/f2441.ts";
async function text(bytes: Uint8Array) {
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(r.code, 0);
    return new TextDecoder().decode(r.stdout).split("\f");
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 care bundle orders one-page credit form and reconciles Schedule 3 and child credit", async () => {
  const r = await buildDraftReturnPdf2026(dependentCareFixture2026(30000));
  const forms = r.attachments.map((a) => a.form);
  assert(forms.indexOf("schedule3") < forms.indexOf("form2441"));
  assert(forms.indexOf("form2441") < forms.indexOf("schedule8812"));
  const a = r.attachments.find((a) => a.form === "form2441")!;
  assertEquals(a.formPages.length, 1);
  assertEquals(a.statementPages.length, 0);
  const pages = await text(r.bytes), s = pages[a.formPages[0] - 1];
  for (
    const value of [
      "Synthetic Childcare",
      "123 Example Road",
      "Boston",
      "02110",
      "120000099",
      "30000",
      "1260",
    ]
  ) assertStringIncludes(s, value);
  assert(/8\s+X\.\s+42/.test(s));
  assert(!r.unfinishedReceivers.includes("form2441"));
  assert(!r.unfinishedReceivers.includes("f2441"));
  const pdf = await PDFDocument.load(r.bytes);
  assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
  assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
});
Deno.test("2026 care benefits attach both printed pages with taxable benefits and zero credit", async () => {
  const r = await buildDraftReturnPdf2026(
    dependentCareFixture2026(50000, 9000, 9000),
  );
  const a = r.attachments.find((a) => a.form === "form2441")!;
  assertEquals(a.formPages.length, 2);
  const pages = await text(r.bytes);
  const page2 = pages[a.formPages[1] - 1];
  for (const v of ["9000", "7500", "1500", "50000"]) {
    assertStringIncludes(page2, v);
  }
  assertStringIncludes(pages[0], "1500");
  assert(!r.attachments.some((a) => a.form === "schedule3"));
});
export function careOverflowFixture2026(count = 25) {
  const input = dependentCareFixture2026(500000, 0, 10000);
  const child = input.general.dependents[0];
  input.general.dependents = Array.from(
    { length: count },
    (_, i) => ({
      ...child,
      first_name: `Child${i + 1}`,
      ssn: `22233${4444 + i}`,
    }),
  );
  const c = input.form2441.claim;
  const provider = c.providers[0];
  assert(provider.kind === "business");
  c.providers = Array.from(
    { length: count },
    (_, i) => ({
      ...provider,
      kind: "business",
      name: `Provider ${i + 1}`,
      ein: `12000${1000 + i}`,
      amount_paid: 400 + i,
    }),
  );
  c.qualifying_people = input.general.dependents.map((d) => ({
    kind: "dependent_child",
    review_reference: "care-person-review",
    tin: d.ssn,
    care_only_while_under_13: true,
    custodial_parent_and_dependency_requirements_met: true,
  }));
  c.expenses = c.qualifying_people.map((d, i) => ({
    person_tin: d.tin,
    incurred_start_date: "2026-01-01",
    incurred_end_date: "2026-12-31",
    paid_date: "2026-12-31",
    provider_index: i,
    receipt_reference: `receipt-${i}`,
    qualified_amount_incurred_and_paid_in_2026: 400 + i,
  }));
  return input;
}
Deno.test("2026 care retains all 25 providers and children and checks PDF destinations", async () => {
  const input = careOverflowFixture2026();
  const r = execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    input,
    { taxYear: 2026, formType: "f1040" },
  );
  assertEquals(r.diagnostics, []);
  const care = r.pending.f2441.calculation_2026 as ReturnType<
    typeof calculateCareCredit2026
  >;
  const destinations = {
    form1040_line1e: care.lines!.line26,
    form1040_line11b: care.lines!.line7,
    form1040_line18: care.lines!.line10,
    schedule3_line2: care.lines!.line11,
  };
  const filer = { name: "Synthetic Investor", ssn: input.general.taxpayer_ssn };
  const bytes = await buildForm2441PdfBytes2026(
    care.source_input,
    destinations,
    filer,
  );
  const pages = await text(bytes);
  assertStringIncludes(pages[0], "Provider 25");
  assertStringIncludes(pages[0], "Child25");
  const all = pages.join(" ");
  for (let i = 1; i <= 25; i++) {
    assertStringIncludes(all, `Provider ${i}`);
    assertStringIncludes(all, `Child${i}`);
  }
  assert(pages.length >= 4);
  await assertRejects(
    () =>
      buildForm2441PdfBytes2026(care.source_input, {
        ...destinations,
        schedule3_line2: destinations.schedule3_line2 + 1,
      }, filer),
    Error,
    "destinations disagree",
  );
  await assertRejects(
    () =>
      buildForm2441PdfBytes2026(care.source_input, destinations, {
        ...filer,
        ssn: "999887777",
      }),
    Error,
    "matching filer",
  );
});
