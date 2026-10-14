import { assertEquals, assertRejects } from "@std/assert";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { employerPostyearOwnerSource } from "./form8889_employer_postyear_source.fixture.ts";

const root = ".state/research/hsa-postyear-owner-oct6";
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
for (const owner of ["T", "S"] as const) {
  Deno.test(`reviewed ${owner} 2026 owner-paid employer excess affects 2025 income and avoids excise without 2025 distribution`, async () => {
    await Deno.mkdir(root, { recursive: true });
    const inputs = employerPostyearOwnerSource(owner);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const filer = extractFilerIdentity(pending.f1040)!;
    const forms = (pending.form8889 as any).forms;
    const affected = owner === "T" ? 0 : 1;
    assertEquals(forms.length, 2);
    assertEquals(forms[affected].print_line8, 4300);
    assertEquals(forms[affected].print_line9_employer, 5000);
    assertEquals(forms[affected].print_line14a_distributions ?? 0, 0);
    assertEquals(forms[1 - affected].print_line13_deduction, 2000);
    assertEquals(pending.schedule1.line8z_hsa_excess_employer, 700);
    assertEquals(pending.schedule1.line8z_hsa_excess_earnings ?? 0, 0);
    assertEquals(pending.f1040.line1a_wages, 90000);
    assertEquals(pending.f1040.line8_additional_income, 700);
    assertEquals(pending.f1040.line10_adjustments, 2000);
    assertEquals(pending.f1040.line24_total_tax, 6390);
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
        inputs.form8889.retained_employer_postyear_evidence,
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
Deno.test("post-year employer owner payment rejects absent, late, misdirected and 2025 code-2 claims", async () => {
  const source = employerPostyearOwnerSource("T");
  const initial = f1040_2025.executeReturn(source);
  const filer = extractFilerIdentity(initial.pending.f1040)!;
  const mutations: Array<(input: any) => void> = [
    (input) => {
      delete input.form8889.retained_employer_postyear_evidence;
    },
    (input) => {
      input.form8889.retained_employer_postyear_evidence.filed_2025_w2.sha256 =
        "0".repeat(64);
    },
    (input) => {
      input.form8889.retained_employer_postyear_evidence.trustee_2026_payment
        .bytes_base64 += "A";
    },
    (input) => {
      input.w2[0].box12_entries[0].amount = 4900;
    },
  ];
  for (const mutate of mutations) {
    const altered = structuredClone(source) as any;
    mutate(altered);
    const result = f1040_2025.executeReturn(altered);
    await assertRejects(() => f1040_2025.prepareReturn(result.pending, filer));
  }
  for (
    const [kind, field, value] of [
      ["trustee_2026_payment", "paid_to", "employer"],
      ["trustee_2026_payment", "transaction_date", "2026-04-16"],
      ["trustee_2026_payment", "earnings", 49],
      ["trustee_2026_payment", "principal", 699],
      ["trustee_2026_payment", "transaction_type", "ordinary_distribution"],
      ["owner_2026_receipt", "owner_ssn", "999887777"],
    ] as const
  ) {
    const altered = structuredClone(source) as any;
    const record = altered.form8889.retained_employer_postyear_evidence[kind];
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
    const [index, mutate] of [
      (pending: any) => {
        pending.form8889.forms[0].print_line14a_distributions = 750;
      },
      (pending: any) => {
        pending.schedule1.line8z_hsa_excess_earnings = 50;
      },
      (pending: any) => {
        pending.schedule1.line8z_hsa_excess_employer = 0;
      },
      (pending: any) => {
        pending.f1040.line8_additional_income = 750;
      },
      (pending: any) => {
        pending.form8889.forms.pop();
      },
      (pending: any) => {
        pending.form8889.form1099_sa_distributions = [{
          tax_year: 2025,
          recipient_ssn: "111223333",
          box1_gross_distribution: 750,
          box2_earnings_on_excess: 50,
          box3_distribution_code: "2",
          source_reference: "false-2025-code2",
          hsa_account_reference: "HSA-T-2025",
        }];
      },
      (pending: any) => {
        pending.form8889.employer_excess_treatment.timely_withdrawal
          .form1099_sa_source_reference = "false-2025-code2";
      },
    ].entries()
  ) {
    const pending = structuredClone(initial.pending) as any;
    mutate(pending);
    try {
      await f1040_2025.prepareReturn(pending, filer);
      throw new Error(`accepted mutation ${index}`);
    } catch (error) {
      if (
        error instanceof Error && error.message === `accepted mutation ${index}`
      ) throw error;
    }
    await assertRejects(() => buildPdfBytes(pending, filer, ".pdf-cache"));
  }
});
