import { assertEquals, assertRejects } from "@std/assert";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { employerCode2ReturnSource } from "./form8889_employer_code2_source.fixture.ts";
const root = ".state/research/hsa-code2-source-oct6";
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
for (const owner of ["T", "S"] as const) {
  Deno.test(`reviewed ${owner} employer owner-paid code-2 actual W-2/trustee/payment source reaches 1040, two8889, XSD and PDF`, async () => {
    await Deno.mkdir(root, { recursive: true });
    const inputs = employerCode2ReturnSource(owner);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const filer = extractFilerIdentity(pending.f1040)!;
    const forms = (pending.form8889 as any).forms;
    assertEquals(forms.length, 2);
    const affected = owner === "T" ? 0 : 1;
    assertEquals(forms[affected].print_line9_employer, 5000);
    assertEquals(forms[affected].print_line14a_distributions, 750);
    assertEquals(forms[affected].print_line14b_excluded_distributions, 750);
    assertEquals(forms[affected].print_line14c, 0);
    assertEquals(forms[1 - affected].print_line13_deduction, 2000);
    assertEquals(pending.schedule1.line8z_hsa_excess_employer, 700);
    assertEquals(pending.schedule1.line8z_hsa_excess_earnings, 50);
    assertEquals(pending.f1040.line1a_wages, 90000);
    assertEquals(pending.f1040.line8_additional_income, 750);
    assertEquals(pending.f1040.line10_adjustments, 2000);
    assertEquals(pending.f1040.line24_total_tax, 6396);
    assertEquals((pending.form5329 as any)?.owner_forms?.length ?? 0, 0);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals((prepared.bundle.xml.match(/<IRS8889 /g) ?? []).length, 2);
    assertEquals((prepared.bundle.xml.match(/<IRS5329 /g) ?? []).length, 0);
    await Deno.writeTextFile(`${root}/${owner}.xml`, prepared.bundle.xml);
    const validated = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${root}/${owner}.xml`,
      ],
    }).output();
    assertEquals(validated.code, 0, new TextDecoder().decode(validated.stderr));
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(origins.map(({ formKey, formCopy }) => [formKey, formCopy]), [
      ["f1040", 1],
      ["f1040", 1],
      ["schedule1", 1],
      ["schedule1", 1],
      ["schedule1", 1],
      ["form8889", 1],
      ["form8889", 2],
    ]);
    await Deno.writeFile(`${root}/${owner}.pdf`, pdf);
    await Deno.writeTextFile(
      `${root}/${owner}.origins.json`,
      JSON.stringify(origins, null, 2),
    );
    await Deno.writeTextFile(
      `${root}/${owner}.source-pending.json`,
      JSON.stringify({ inputs, filer, pending }, null, 2),
    );
    const evidence = inputs.form8889.retained_employer_code2_evidence;
    const docs = [];
    for (const [kind, row] of Object.entries(evidence)) {
      const bytes = Buffer.from((row as any).bytes_base64, "base64");
      assertEquals(hash(bytes), (row as any).sha256);
      const path = `${owner}-${kind}.bin`;
      await Deno.writeFile(`${root}/${path}`, bytes);
      docs.push({
        kind,
        reference: (row as any).source_document_reference,
        path,
        sha256: hash(bytes),
      });
    }
    await Deno.writeTextFile(
      `${root}/${owner}.documents.json`,
      JSON.stringify(docs, null, 2),
    );
    console.log(
      JSON.stringify({
        owner,
        pages: (await PDFDocument.load(pdf)).getPageCount(),
        pdf_sha256: hash(pdf),
        source_documents: docs.length,
      }),
    );
  });
}
Deno.test("retained employer code-2 W-2, trustee and timely owner payment conflicts reject final filing", async () => {
  const source = employerCode2ReturnSource("T");
  const base = f1040_2025.executeReturn(source);
  const filer = extractFilerIdentity(base.pending.f1040)!;
  const mutations: Array<(input: any) => void> = [
    (input) => {
      delete input.form8889.retained_employer_code2_evidence;
    },
    (input) => {
      input.form8889.retained_employer_code2_evidence.w2.sha256 = "0".repeat(
        64,
      );
    },
    (input) => {
      input.form8889.retained_employer_code2_evidence.trustee_1099sa
        .bytes_base64 += "A";
    },
    (input) => {
      input.w2[0].box1_wages = 89999;
    },
    (input) => {
      input.form8889.form1099_sa_distributions[0].box2_earnings_on_excess = 49;
    },
    (input) => {
      input.form8889.retained_employer_code2_evidence.paid_owner_return
        .source_document_reference =
          input.form8889.retained_employer_code2_evidence.trustee_1099sa
            .source_document_reference;
    },
  ];
  for (const mutate of mutations) {
    const altered = structuredClone(source) as any;
    mutate(altered);
    const result = f1040_2025.executeReturn(altered);
    await assertRejects(() => f1040_2025.prepareReturn(result.pending, filer));
  }
  for (
    const [field, value] of [
      ["paid_to", "employer"],
      ["paid_on", "2026-01-01"],
      ["principal", 699],
      ["owner_ssn", "999887777"],
    ] as const
  ) {
    const altered = structuredClone(source) as any;
    const record =
      altered.form8889.retained_employer_code2_evidence.paid_owner_return;
    const facts = JSON.parse(
      Buffer.from(record.bytes_base64, "base64").toString(),
    );
    facts[field] = value;
    const bytes = Buffer.from(JSON.stringify(facts));
    record.bytes_base64 = bytes.toString("base64");
    record.sha256 = hash(bytes);
    const result = f1040_2025.executeReturn(altered);
    await assertRejects(() => f1040_2025.prepareReturn(result.pending, filer));
  }
});
