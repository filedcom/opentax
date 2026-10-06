import { printSchema as form8606PrintSchema } from "../nodes/intermediate/forms/form8606/index.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { createHash } from "node:crypto";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { rothCases, rothReturnSource } from "./form4852_roth.fixture.ts";
import { assertForm4852RetainedEvidence } from "./form4852_retained_evidence.ts";
import { reviewedRothActivity } from "../nodes/intermediate/forms/form8606/roth-activity.ts";

const root = ".state/research/form4852-roth-source-checkbox-corrected";
const schema =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";

Deno.test("retained Form4852 Roth J/T account contribution and age records derive full1040/8606/5329 native XSD PDF returns", async () => {
  await Deno.mkdir(root, { recursive: true });
  for (const [index, row] of rothCases.entries()) {
    const source = await rothReturnSource(row, 101 + index);
    const result = f1040_2025.executeReturn(source.inputs);
    assertEquals(result.diagnostics, [], row.id);
    const pending = normalizeAllPending(result.pending);
    const facts = reviewedRothActivity(source.review);
    const qualified = "qualified" in row && row.qualified;

    assertEquals(pending.f1040.line1a_wages, 125000, row.id);
    assertEquals(pending.f1040.line4a_ira_gross, facts.gross, row.id);
    assertEquals(pending.f1040.line4b_ira_taxable ?? 0, row.taxable, row.id);
    assertEquals(pending.f1040.line11_agi, 125000 + row.taxable, row.id);
    assertEquals(pending.f1040.line23_other_taxes ?? 0, row.early, row.id);
    assertEquals(pending.f1040.line24_total_tax, row.tax, row.id);
    assertEquals(pending.f1040.line25b_withheld_1099, 1000, row.id);
    assertEquals(pending.f1040.line35a_refund, 21000 - row.tax, row.id);
    assertEquals(pending.form8606 !== undefined, !qualified, row.id);
    assertEquals(pending.form5329 !== undefined, row.early > 0, row.id);
    if (!qualified) {
      assertEquals(
        pending.form8606.print_roth_line22_contribution_basis,
        facts.basis,
      );
      assertEquals(pending.form8606.print_roth_line25c_taxable, row.taxable);
    }
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      source.filer,
      [],
      source.retained.documents,
    );
    assertEquals(prepared.bundle.attachments, []);
    // Ordinary Roth account records require an unmarked native IRA/SEP/SIMPLE box.
    assertEquals(prepared.bundle.xml.includes("<IRASEPSIMPLEInd>"), false);
    assertEquals((prepared.bundle.xml.match(/<IRS1099R /g) ?? []).length, 1);
    assertEquals(
      (prepared.bundle.xml.match(/<IRS8606 /g) ?? []).length,
      qualified ? 0 : 1,
    );
    assertStringIncludes(prepared.bundle.xml, "<StandardOrNonStandardCd>N</");
    await Deno.writeTextFile(`${root}/${row.id}.xml`, prepared.bundle.xml);
    const xsd = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, `${root}/${row.id}.xml`],
    }).output();
    assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      source.filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    await Deno.writeFile(`${root}/${row.id}.pdf`, pdf);
    await Deno.writeTextFile(
      `${root}/${row.id}.origins.json`,
      JSON.stringify(origins, null, 2),
    );
    await Deno.writeTextFile(
      `${root}/${row.id}.source.json`,
      JSON.stringify(
        { inputs: source.inputs, filer: source.filer, pending },
        null,
        2,
      ),
    );
    await Deno.mkdir(`${root}/${row.id}-retained`, { recursive: true });
    const documents = [];
    for (const [index, document] of source.retained.documents.entries()) {
      const path = `${row.id}-retained/document-${index + 1}.bin`;
      await Deno.writeFile(`${root}/${path}`, document.bytes);
      documents.push({
        document_reference: document.document_reference,
        path,
        sha256: createHash("sha256").update(document.bytes).digest("hex"),
      });
    }
    await Deno.writeTextFile(
      `${root}/${row.id}.documents.json`,
      JSON.stringify(documents, null, 2),
    );
    for (const field of ["line4a_ira_gross", "line4b_ira_taxable"] as const) {
      const changed = structuredClone(prepared.bundle.pending);
      changed.f1040![field] = Number(changed.f1040![field] ?? 0) + 1;
      await assertRejects(() =>
        f1040_2025.prepareReturn(
          changed,
          source.filer,
          [],
          source.retained.documents,
        )
      );
      await assertRejects(() =>
        buildPdfBytes(changed, source.filer, ".pdf-cache", {
          ...prepared.bundle,
          pending: changed,
        })
      );
    }
    const changedBirth = structuredClone(prepared.bundle.pending);
    changedBirth.general![
      source.item.subject_ts === "S" ? "spouse_dob" : "taxpayer_dob"
    ] = "1970-01-01";
    await assertRejects(() =>
      f1040_2025.prepareReturn(
        changedBirth,
        source.filer,
        [],
        source.retained.documents,
      )
    );
    await assertRejects(() =>
      buildPdfBytes(changedBirth, source.filer, ".pdf-cache", {
        ...prepared.bundle,
        pending: changedBirth,
      })
    );
    if (!qualified) {
      const changed = structuredClone(prepared.bundle.pending);
      const fields = form8606PrintSchema.parse(changed.form8606);
      fields.print_roth_line22_contribution_basis =
        (fields.print_roth_line22_contribution_basis ?? 0) + 1;
      changed.form8606 = fields;
      await assertRejects(() =>
        f1040_2025.prepareReturn(
          changed,
          source.filer,
          [],
          source.retained.documents,
        )
      );
      await assertRejects(() =>
        buildPdfBytes(changed, source.filer, ".pdf-cache", {
          ...prepared.bundle,
          pending: changed,
        })
      );
    }
    // A rehashed document still needs its parsed source facts, not only matching bytes/digest.
    const changed = structuredClone(prepared.bundle.pending);
    const reference =
      source.review.contributions[0].receipts[0].source_document_reference;
    const docs = source.retained.documents.map((document) => ({
      ...document,
      bytes: Uint8Array.from(document.bytes),
    }));
    const document = docs.find((row) => row.document_reference === reference)!;
    const receipt = JSON.parse(new TextDecoder().decode(document.bytes));
    receipt.amount += 1;
    document.bytes = new TextEncoder().encode(JSON.stringify(receipt));
    changed.f4852!.reviewed_source!.records[0].treatment_documents!.find((
      row: { document_reference: string },
    ) => row.document_reference === reference)!.sha256 = createHash("sha256")
      .update(document.bytes).digest("hex");
    await assertRejects(
      () => assertForm4852RetainedEvidence(changed, source.filer, docs),
      Error,
      "parsed source facts differ",
    );
    await assertRejects(() =>
      f1040_2025.prepareReturn(changed, source.filer, [], docs)
    );
    await assertRejects(() =>
      buildPdfBytes(changed, source.filer, ".pdf-cache", {
        ...prepared.bundle,
        pending: changed,
        retainedSourceDocuments: docs,
      })
    );
  }
});

Deno.test("Roth public source rejects incomplete historical inventory, conversions, owner/account/code/date and copy conflicts", async () => {
  const source = await rothReturnSource(rothCases[1], 150);
  for (
    const mutate of [
      (item: any) => item.retirement_source.box2b_not_determined = false,
      (item: any) => item.taxable_amount_not_determined = false,
      (item: any) => item.retirement_source.box2a_taxable_amount = 2000,
    ]
  ) {
    const inputs = structuredClone(source.inputs);
    mutate(inputs.f4852[0]);
    inputs.f4852_reviewed_source.reviewed_source.records[0]
      .reviewed_substitute = structuredClone(inputs.f4852[0]);
    assertEquals(f1040_2025.executeReturn(inputs).diagnostics.length > 0, true);
  }
  for (
    const mutate of [
      (review: any) =>
        review.inventory.no_conversions_or_qualified_plan_rollovers = false,
      (review: any) =>
        review.inventory.no_prior_distributions_or_returned_contributions =
          false,
      (review: any) =>
        review.inventory.all_owned_roth_iras_and_activity_included = false,
      (review: any) => review.contributions[0].form5498.owner_ssn = "444556666",
      (review: any) => review.contributions[0].receipts[0].amount += 1,
      (review: any) => review.payment.account_number = "OTHER-ACCOUNT",
      (review: any) => review.payment.distribution_code = "T",
      (review: any) => review.payment.distributed_on = "2025-02-30",
      (review: any) => review.owner_identity.date_of_birth = "2026-01-01",
      (review: any) =>
        review.contributions.push(structuredClone(review.contributions[0])),
    ]
  ) {
    const inputs = structuredClone(source.inputs);
    mutate(inputs.f4852[0].retirement_source!.roth_activity_review!);
    inputs.f4852_reviewed_source.reviewed_source.records[0]
      .reviewed_substitute = structuredClone(inputs.f4852[0]);
    assertEquals(f1040_2025.executeReturn(inputs).diagnostics.length > 0, true);
  }
});
