import { assertEquals, assertRejects } from "@std/assert";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { employerReturnedExcessSource } from "./form8889_employer_return_source.fixture.ts";

const root = ".state/research/hsa-employer-recoup-oct6";
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

for (const owner of ["T", "S"] as const) {
  Deno.test(`reviewed ${owner} employer correction and trustee-paid-employer source reaches net 8889 and full filing`, async () => {
    await Deno.mkdir(root, { recursive: true });
    const inputs = employerReturnedExcessSource(owner);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const filer = extractFilerIdentity(pending.f1040)!;
    const forms = (pending.form8889 as any).forms;
    const affected = owner === "T" ? 0 : 1;
    assertEquals(forms.length, 2);
    assertEquals(forms[affected].print_line8, 4300);
    assertEquals(forms[affected].print_line9_employer, 4300);
    assertEquals(forms[affected].print_line14a_distributions ?? 0, 0);
    assertEquals(forms[1 - affected].print_line13_deduction, 2000);
    assertEquals(pending.f1040.line1a_wages, 90000);
    assertEquals(pending.f1040.line8_additional_income ?? 0, 0);
    assertEquals(pending.f1040.line10_adjustments, 2000);
    assertEquals(pending.f1040.line24_total_tax, 6306);
    assertEquals((pending.form5329 as any)?.owner_forms?.length ?? 0, 0);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals((prepared.bundle.xml.match(/<IRS8889 /g) ?? []).length, 2);
    assertEquals((prepared.bundle.xml.match(/<IRS5329 /g) ?? []).length, 0);
    await Deno.writeTextFile(`${root}/${owner}.xml`, prepared.bundle.xml);
    const xsd = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${root}/${owner}.xml`,
      ],
    }).output();
    assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
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
    const docs = [];
    for (
      const [kind, row] of Object.entries(
        inputs.form8889.retained_employer_return_evidence,
      )
    ) {
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
        documents: docs.length,
      }),
    );
  });
}

Deno.test("employer-returned excess rejects absent, changed, misdirected and unlinked source records", async () => {
  const source = employerReturnedExcessSource("T");
  const initial = f1040_2025.executeReturn(source);
  const filer = extractFilerIdentity(initial.pending.f1040)!;
  const mutations: Array<(input: any) => void> = [
    (input) => {
      delete input.form8889.retained_employer_return_evidence;
    },
    (input) => {
      input.form8889.retained_employer_return_evidence.filed_w2.sha256 = "0"
        .repeat(64);
    },
    (input) => {
      input.form8889.retained_employer_return_evidence.trustee_5498sa
        .bytes_base64 += "A";
    },
    (input) => {
      input.w2[0].box12_entries[0].amount = 5000;
    },
    (input) => {
      input.form8889.retained_employer_return_evidence.trustee_5498sa
        .source_document_reference =
          input.form8889.retained_employer_return_evidence.filed_w2
            .source_document_reference;
    },
    (input) => {
      input.form8889.hsa_distributions = 750;
    },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const altered = structuredClone(source) as any;
    mutate(altered);
    const result = f1040_2025.executeReturn(altered);
    try {
      await f1040_2025.prepareReturn(result.pending, filer);
      throw new Error(`accepted mutation ${index}`);
    } catch (error) {
      if (
        error instanceof Error && error.message === `accepted mutation ${index}`
      ) throw error;
    }
  }
  for (
    const [kind, field, value] of [
      ["trustee_remittance", "paid_to", "hsa_owner"],
      ["trustee_remittance", "returned_principal", 699],
      ["trustee_remittance", "paid_on", "2026-01-15"],
      ["trustee_remittance", "trustee_ein", "999999999"],
      ["employer_correction", "error_kind", "eligibility_ceased"],
      ["employer_correction", "annual_223b_limit", 4200],
      ["trustee_5498sa", "box2_total_2025_contributions", 5000],
    ] as const
  ) {
    const altered = structuredClone(source) as any;
    const record = altered.form8889.retained_employer_return_evidence[kind];
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
  for (
    const mutate of [
      (pending: any) => {
        pending.form8889.w2_code_w_entries[0].amount = 5000;
      },
      (pending: any) => {
        pending.form8889.forms[0].print_line9_employer = 5000;
      },
      (pending: any) => {
        pending.f1040.line1a_wages = 90001;
      },
      (pending: any) => {
        pending.schedule1.line8z_hsa_excess_earnings = 50;
      },
      (pending: any) => {
        pending.form8889.forms.pop();
      },
    ]
  ) {
    const pending = structuredClone(initial.pending) as any;
    mutate(pending);
    await assertRejects(() => f1040_2025.prepareReturn(pending, filer));
    await assertRejects(() => buildPdfBytes(pending, filer, ".pdf-cache"));
  }
});
