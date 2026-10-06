import { PDFDocument } from "pdf-lib";
import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { form4972 as native } from "./mef/forms/f4972.ts";
import { form4972Pdf } from "./pdf/forms/f4972.ts";
import {
  fractionalBeneficiaryCases,
  fractionalBeneficiaryInputs,
} from "./pdf/review-4972-fractional.fixture.ts";

// Two independent source inventories preserve actual recipient and participant
// identities; public elections cannot supply replacement issued boxes.
export function pairedInputs(
  tSpec = fractionalBeneficiaryCases.find((c) =>
    c.id === "two-death-estate-nua-annuity"
  )!,
  sSpec = fractionalBeneficiaryCases.find((c) => c.id === "three-all-625")!,
) {
  const t = fractionalBeneficiaryInputs(tSpec);
  const s = fractionalBeneficiaryInputs(sSpec);
  const spouseSSN = "987654321";
  const participantSSN = "555667777";
  const e = s.form4972.elections[0];
  const spouseSources = s.f1099r.map((r) => ({ ...r, ts: "S" as const }));
  for (const [i, r] of spouseSources.entries()) {
    r.recipient_ssn = spouseSSN;
    r.source_document_reference = `spouse-issued-${i + 1}`;
    r.form4972_plan.participant_name = "Robin Participant";
    r.form4972_plan.participant_ssn = participantSSN;
    r.form4972_plan.plan_reference = "Robin-qualified-plan";
    r.form4972_plan.full_balance_statement_reference = "Robin-full-balance";
  }
  e.source_document_references = spouseSources.map((r) =>
    r.source_document_reference
  );
  e.participant_name = "Robin Participant";
  e.participant_ssn = participantSSN;
  e.plan_reference = "Robin-qualified-plan";
  if (e.death_benefit_allocation) {
    e.death_benefit_allocation.participant_ssn = participantSSN;
    e.death_benefit_allocation.elected_recipient_ssn = spouseSSN;
    e.death_benefit_allocation.recipients[0].recipient_ssn = spouseSSN;
    e.death_benefit_allocation.recipients[1].recipient_ssn = "444556666";
    e.death_benefit_exclusion_source_reference =
      "Robin-reviewed-death-allocation";
  }
  if (e.partial_estate_tax_source) {
    e.partial_estate_tax_source.administrator_statement_reference =
      "Robin-estate-allocation";
    e.partial_estate_tax_source.estate_tax_return_reference =
      "Robin-706-workpaper";
  }
  return {
    ...t,
    general: {
      ...t.general,
      filing_status: "mfj",
      spouse_first_name: "Blair",
      spouse_last_name: "Taxpayer",
      spouse_ssn: spouseSSN,
      spouse_dob: "1970-01-01",
    },
    f1099r: [...t.f1099r, ...spouseSources],
    form4972: { elections: [t.form4972.elections[0], e] },
  };
}
Deno.test("independent spouse beneficiary source inventories calculate their separate elections once", () => {
  const input = pairedInputs();
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  assertEquals((result.pending.form4972?.forms as unknown[]).length, 2);
  assertEquals(result.pending.f1040?.form4972_tax, 2616 + 3923);
  assertEquals(result.pending.f1040?.line5b_pension_taxable ?? 0, 0);
  const filer = extractFilerIdentity(input.general)!;
  const pending = result.pending;
  const xml = native.build(pending.form4972!, { filer, pending });
  assertEquals(xml.length, 2);
  assertEquals(xml[0].includes("<SSN>123456789</SSN>"), true);
  assertEquals(xml[1].includes("<SSN>987654321</SSN>"), true);
  const printed = form4972Pdf.instances!(pending.form4972!, filer, pending);
  assertEquals(printed.length, 2);
  assertEquals(printed.map((form) => form.line30), [2616, 3923]);
  const changed = structuredClone(pending);
  (changed.f1099r!.f1099rs as Record<string, unknown>[])[2].recipient_ssn =
    "123456789";
  assertThrows(() =>
    native.build(changed.form4972!, { filer, pending: changed })
  );
  assertThrows(() => form4972Pdf.instances!(changed.form4972!, filer, changed));
});

Deno.test("all reviewed fractional source families retain each spouse's independent worksheet tax", async () => {
  const { default: expected } = await import(
    "./pdf/review-4972-fractional.expected.json",
    { with: { type: "json" } }
  );
  for (const [index, first] of fractionalBeneficiaryCases.entries()) {
    const second =
      fractionalBeneficiaryCases[fractionalBeneficiaryCases.length - 1 - index];
    const input = pairedInputs(first, second);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, [], first.id);
    const pending = result.pending;
    const filer = extractFilerIdentity(input.general)!;
    const a = (expected as Record<string, { line30: number }>)[first.id].line30;
    const b =
      (expected as Record<string, { line30: number }>)[second.id].line30;
    assertEquals(pending.f1040?.form4972_tax, a + b);
    assertEquals(native.build(pending.form4972!, { filer, pending }).length, 2);
    assertEquals(
      form4972Pdf.instances!(pending.form4972!, filer, pending).map((form) =>
        form.line30
      ),
      [a, b],
    );
  }
});

Deno.test("paired beneficiary public returns preserve both native copies and complete four-page PDFs", async () => {
  const dir = ".state/research/2026-10-06-form4972-paired-beneficiaries";
  const xsd =
    ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
  await Deno.mkdir(dir, { recursive: true });
  for (const [index, first] of fractionalBeneficiaryCases.entries()) {
    const second =
      fractionalBeneficiaryCases[fractionalBeneficiaryCases.length - 1 - index];
    const input = pairedInputs(first, second);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const prepared = await f1040_2025.prepareReturn!(
      result.pending,
      extractFilerIdentity(input.general)!,
    );
    const xml = prepared.bundle.xml;
    assertEquals((xml.match(/<IRS4972\b/g) ?? []).length, 2);
    assertEquals((xml.match(/<IRS1099R\b/g) ?? []).length, input.f1099r.length);
    const path = `${dir}/${first.id}-paired`;
    await Deno.writeTextFile(
      `${path}.json`,
      JSON.stringify({ input, pending: result.pending }, null, 2),
    );
    await Deno.writeTextFile(`${path}.xml`, xml);
    const pdf = await prepared.renderPdf();
    await Deno.writeFile(`${path}.pdf`, pdf);
    const document = await PDFDocument.load(pdf);
    assertEquals(document.getPageCount(), 4);
    assertEquals(document.getForm().getFields().length, 0);
    const schema = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, `${path}.xml`],
      stderr: "piped",
    }).output();
    assertEquals(schema.code, 0, new TextDecoder().decode(schema.stderr));
    const text = await new Deno.Command("pdftotext", {
      args: ["-layout", `${path}.pdf`, `${path}.txt`],
      stderr: "piped",
    }).output();
    assertEquals(text.code, 0, new TextDecoder().decode(text.stderr));
  }
});

Deno.test("paired beneficiary final projections reject contradictory source and election inventories", () => {
  const input = pairedInputs();
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const filer = extractFilerIdentity(input.general)!;
  type Row = Record<string, unknown>;
  type Inventory = { forms: Row[]; elections: Row[]; source_forms: Row[] };
  const changes: [string, (p: typeof result.pending) => void][] = [
    ["spouse source assigned to taxpayer", (p) => {
      (p.f1099r!.f1099rs as Row[])[2].ts = "T";
    }],
    ["spouse issued amount changed", (p) => {
      const row = (p.f1099r!.f1099rs as Row[])[2];
      row.box2a_taxable_amount = Number(row.box2a_taxable_amount) + 1;
    }],
    ["spouse source reference duplicates taxpayer", (p) => {
      const rows = p.f1099r!.f1099rs as Row[];
      rows[2].source_document_reference = rows[0].source_document_reference;
    }],
    ["spouse election changes participant", (p) => {
      (p.form4972 as unknown as Inventory).elections[1].participant_ssn =
        "111223333";
    }],
    ["spouse computed owner changes", (p) => {
      (p.form4972 as unknown as Inventory).forms[1].recipient = "T";
    }],
    ["spouse computed tax changes", (p) => {
      const row = (p.form4972 as unknown as Inventory).forms[1];
      row.line30 = Number(row.line30) + 1;
    }],
    ["one source group omitted", (p) => {
      (p.form4972 as unknown as Inventory).source_forms.pop();
    }],
    ["Form1040 special tax changes", (p) => {
      p.f1040!.form4972_tax = Number(p.f1040!.form4972_tax) + 1;
    }],
  ];
  for (const [label, change] of changes) {
    const changed = structuredClone(result.pending);
    change(changed);
    assertThrows(
      () => native.build(changed.form4972!, { filer, pending: changed }),
      Error,
      undefined,
      label,
    );
    assertThrows(
      () => form4972Pdf.instances!(changed.form4972!, filer, changed),
      Error,
      undefined,
      label,
    );
  }
});
