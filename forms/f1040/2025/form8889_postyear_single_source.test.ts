import { assertEquals, assertRejects } from "@std/assert";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { employerPostyearOwnerSource } from "./form8889_employer_postyear_source.fixture.ts";

const root = ".state/research/hsa-postyear-sole-oct6";
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
function soleSource(owner: "T" | "S", single = false) {
  const inputs: any = employerPostyearOwnerSource(owner);
  const source = inputs.form8889;
  const chosen = owner === "T" ? source : source.spouse_hsa;
  inputs.form8889 = {
    ...chosen,
    spouse_has_separate_hsa: false,
    married_at_year_end: !single,
    w2_code_w_entries: source.w2_code_w_entries,
    retained_employer_postyear_evidence:
      source.retained_employer_postyear_evidence,
  };
  delete inputs.form8889.spouse_hsa;
  if (single) {
    inputs.general.filing_status = "single";
    for (const key of Object.keys(inputs.general)) {
      if (key.startsWith("spouse_")) delete inputs.general[key];
    }
  }
  return inputs;
}
for (
  const [id, owner, single] of [["T", "T", false], ["S", "S", false], [
    "single",
    "T",
    true,
  ]] as const
) {
  Deno.test(`reviewed sole ${id} 2026 owner-paid employer excess affects 2025 income and avoids excise without 2025 distribution`, async () => {
    await Deno.mkdir(root, { recursive: true });
    const inputs = soleSource(owner, single);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const filer = extractFilerIdentity(pending.f1040)!;
    const forms = (pending.form8889 as any).forms;
    const affected = 0;
    assertEquals(forms.length, 1);
    assertEquals(forms[affected].print_line8, 4300);
    assertEquals(forms[affected].print_line9_employer, 5000);
    assertEquals(forms[affected].print_line14a_distributions ?? 0, 0);
    assertEquals(forms[0].print_line13_deduction, 0);
    assertEquals(pending.schedule1.line8z_hsa_excess_employer, 700);
    assertEquals(pending.schedule1.line8z_hsa_excess_earnings ?? 0, 0);
    assertEquals(pending.f1040.line1a_wages, 90000);
    assertEquals(pending.f1040.line8_additional_income, 700);
    assertEquals(pending.f1040.line10_adjustments, 0);
    assertEquals(pending.f1040.line24_total_tax, single ? 11409 : 6630);
    assertEquals((pending.form5329 as any)?.owner_forms?.length ?? 0, 0);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals((prepared.bundle.xml.match(/<IRS8889 /g) ?? []).length, 1);
    assertEquals((prepared.bundle.xml.match(/<IRS5329 /g) ?? []).length, 0);
    await Deno.writeTextFile(`${root}/${id}.xml`, prepared.bundle.xml);
    const xsd = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${root}/${id}.xml`,
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
      ["schedule1", 1],
      ["form8889", 1],
    ]);
    await Deno.writeFile(`${root}/${id}.pdf`, pdf);
    await Deno.writeTextFile(
      `${root}/${id}.origins.json`,
      JSON.stringify(origins, null, 2),
    );
    await Deno.writeTextFile(
      `${root}/${id}.source-pending.json`,
      JSON.stringify({ inputs, filer, pending }, null, 2),
    );
    const docs = [];
    for (
      const [kind, row] of Object.entries(
        inputs.form8889.retained_employer_postyear_evidence,
      )
    ) {
      const bytes = Buffer.from((row as any).bytes_base64, "base64");
      assertEquals(hash(bytes), (row as any).sha256);
      const path = `${id}-${kind}.bin`;
      await Deno.writeFile(`${root}/${path}`, bytes);
      docs.push({
        kind,
        reference: (row as any).source_document_reference,
        path,
        sha256: hash(bytes),
      });
    }
    await Deno.writeTextFile(
      `${root}/${id}.documents.json`,
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

Deno.test("sole postyear source rejects owner, date, absent records, copy and finalized income conflicts in native and PDF", async () => {
  for (const owner of ["T", "S"] as const) {
    const source = soleSource(owner);
    const initial = f1040_2025.executeReturn(source);
    assertEquals(initial.diagnostics, []);
    const filer = extractFilerIdentity(initial.pending.f1040)!;
    await f1040_2025.prepareReturn(initial.pending, filer);
    const mutations: Array<(p: any) => void> = [
      (p) => {
        delete p.form8889;
      },
      (p) => {
        p.form8889.forms = [];
      },
      (p) => {
        p.form8889.forms[0].beneficiary_ssn = "999887777";
      },
      (p) => {
        p.form8889.forms[0].print_line14a_distributions = 750;
      },
      (p) => {
        p.form8889.forms[0].print_line9_employer = 4900;
      },
      (p) => {
        delete p.form8889.retained_employer_postyear_evidence;
      },
      (p) => {
        p.schedule1.line8z_hsa_excess_earnings = 50;
      },
      (p) => {
        p.schedule1.line8z_hsa_excess_employer = 0;
      },
      (p) => {
        p.f1040.line24_total_tax += 1;
      },
      (p) => {
        p.form8889.employer_excess_treatment.timely_withdrawal
          .form1099_sa_source_reference = "fake-2025-copy";
      },
      (p) => {
        p.form8889.eligible_hdhp_coverage_by_month[0] = "none";
      },
      (p) => {
        p.form8889.retained_employer_postyear_evidence.filed_2025_w2.sha256 =
          "0".repeat(64);
      },
    ];
    for (const mutate of mutations) {
      const pending = structuredClone(initial.pending);
      mutate(pending);
      await assertRejects(() => f1040_2025.prepareReturn(pending, filer));
      await assertRejects(() => buildPdfBytes(pending, filer, ".pdf-cache"));
    }
    for (
      const [kind, field, value] of [
        ["trustee_2026_payment", "transaction_date", "2026-04-16"],
        ["owner_2026_receipt", "owner_ssn", "999887777"],
        ["trustee_2026_payment", "principal", 699],
      ] as const
    ) {
      const pending: any = structuredClone(initial.pending);
      const record = pending.form8889.retained_employer_postyear_evidence[kind];
      const facts = JSON.parse(
        Buffer.from(record.bytes_base64, "base64").toString(),
      );
      facts[field] = value;
      const bytes = Buffer.from(JSON.stringify(facts));
      record.bytes_base64 = bytes.toString("base64");
      record.sha256 = hash(bytes);
      await assertRejects(() => f1040_2025.prepareReturn(pending, filer));
      await assertRejects(() => buildPdfBytes(pending, filer, ".pdf-cache"));
    }
  }
});
