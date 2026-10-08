import { reviewedRothOwnerInventory } from "../../../../nodes/intermediate/forms/form8606/roth-inventory.ts";
import {
  calculateOwnerForms,
  inputSchema as form5329InputSchema,
} from "../../../../nodes/intermediate/forms/form5329/index.ts";
import { form5329 } from "../../../mef/forms/retirement/f5329.ts";
import { createHash } from "node:crypto";
import { printSchema } from "../../../../nodes/intermediate/forms/form8606/index.ts";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import {
  rothConversionCases,
  rothConversionReturnSource,
} from "./form4852_roth_conversion.fixture.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
const root = ".state/research/form4852-roth-conversion-checkbox-corrected";
Deno.test("actual prior filed Roth conversions reconcile FIFO and five-year recapture through owner8606/5329 and1040", async () => {
  await Deno.mkdir(root, { recursive: true });
  for (const [n, row] of rothConversionCases.entries()) {
    const source = await rothConversionReturnSource(row, 301 + n);
    const result = f1040_2025.executeReturn(source.inputs);
    assertEquals(result.diagnostics, [], row.id);
    const pending = normalizeAllPending(result.pending);

    assertEquals(
      pending.f1040.line4a_ira_gross,
      "gross" in row
        ? row.gross
        : row.joint
        ? 17500
        : row.amounts.reduce((sum, value) => sum + value, 0),
    );
    assertEquals(pending.f1040.line4b_ira_taxable, row.taxable);
    assertEquals(pending.f1040.line23_other_taxes ?? 0, row.early);
    assertEquals(pending.f1040.line24_total_tax, row.tax);
    assertEquals(
      printSchema.parse(pending.form8606).owner_forms!.length,
      row.joint ? 2 : 1,
    );
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      source.filer,
      [],
      source.retained.documents,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS8606 /g) ?? []).length,
      row.joint ? 2 : 1,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS5329 /g) ?? []).length,
      row.joint ? 2 : row.early > 0 ? 1 : 0,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS1099R /g) ?? []).length,
      row.joint ? 5 : 3,
    );
    assertEquals(prepared.bundle.xml.includes("<IRASEPSIMPLEInd>"), false);
    await Deno.writeTextFile(`${root}/${row.id}.xml`, prepared.bundle.xml);
    const xsd = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${root}/${row.id}.xml`,
      ],
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
    for (
      const mutate of [
        (p: any) => p.f1040.line4b_ira_taxable += 1,
        (p: any) =>
          p.form8606.owner_forms[0].print_roth_line22_contribution_basis += 1,
        (p: any) => p.form8606.owner_forms.reverse(),
        (p: any) => p.general.taxpayer_dob = "1970-01-01",
        (p: any) => p.f1099r.f1099rs[0].box4_federal_withheld += 1,
        (p: any) => p.form8606.source_roth_distribution = 1,
        (p: any) =>
          p.form8606.owner_forms[0].print_roth_line24_conversion_basis += 1,
        (p: any) => p.form5329.owner_forms[0].early_distribution += 1,
        (p: any) => p.form8606.nondeductible_contributions = 1,
        (p: any) => p.form8606.roth_owner_inventory_reviews[0].payments.pop(),
      ]
    ) {
      if ((row.joint ? 2 : 1) < 2 && mutate.toString().includes("reverse")) {
        continue;
      }
      if (row.early === 0 && mutate.toString().includes("form5329")) continue;
      const changed = structuredClone(prepared.bundle.pending);
      mutate(changed);
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
  }
});

Deno.test("Roth conversion FIFO rejects changed historical source facts and retained prior8606 bytes", async () => {
  const source = await rothConversionReturnSource(rothConversionCases[0], 501);
  const result = f1040_2025.executeReturn(source.inputs);
  assertEquals(result.diagnostics, []);
  for (
    const mutate of [
      (i: any) =>
        i.f4852[0].retirement_source.roth_owner_inventory_review.conversions[0]
          .prior_form8606.filed_line18_taxable += 1,
      (i: any) =>
        i.f4852[0].retirement_source.roth_owner_inventory_review.conversions[0]
          .accounts[0].transfers[0].receipt.amount += 1,
      (i: any) =>
        i.f4852[0].retirement_source.roth_owner_inventory_review.inventory
          .all_prior_roth_conversion_records_included = undefined,
      (i: any) =>
        i.f4852[0].retirement_source.roth_owner_inventory_review.inventory
          .no_prior_distributions_or_returned_contributions = false,
    ]
  ) {
    const inputs = structuredClone(source.inputs);
    mutate(inputs);
    assertEquals(f1040_2025.executeReturn(inputs).diagnostics.length > 0, true);
  }
  const annual = structuredClone(source.reviews[0]);
  annual.conversions![0].accounts[0].form5498.box10_roth_contributions = 0;
  assertThrows(
    () => reviewedRothOwnerInventory(annual),
    Error,
    "one actual annual issued5498",
  );
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    source.filer,
    [],
    source.retained.documents,
  );
  const entries = form5329InputSchema.parse({
    owner_entries: prepared.bundle.pending.form5329!.owner_entries,
  })
    .owner_entries!;
  for (const owner of entries) {
    owner.roth_owner_inventory_review!.owner_identity
      .source_document_reference = "forged-owner-record";
  }
  const forged = {
    owner_entries: entries,
    owner_forms: calculateOwnerForms({ owner_entries: entries }).forms,
  };
  assertThrows(
    () =>
      form5329.build(forged, {
        filer: source.filer,
        pending: prepared.bundle.pending,
      }),
    Error,
    "actual retained owner/source inventory",
  );
  const review = structuredClone(source.retained.reviewed_source),
    documents = source.retained.documents.map((document) => ({
      ...document,
      bytes: document.bytes.slice(),
    }));
  const reference =
    source.reviews[0].conversions![0].prior_form8606.source_document_reference;
  const document = documents.find((row) =>
    row.document_reference === reference
  )!;
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(document.bytes);
  pdf.getForm().getTextField("topmostSubform[0].Page2[0].f2_3[0]").setText(
    "14999",
  );
  document.bytes = new Uint8Array(await pdf.save());
  for (const record of review.records) {
    for (const binding of record.treatment_documents) {
      if (binding.document_reference === reference) {
        binding.sha256 = createHash("sha256").update(document.bytes).digest(
          "hex",
        );
      }
    }
  }
  const pending = structuredClone(prepared.bundle.pending);
  const altered = {
    ...pending,
    f4852: { ...pending.f4852, reviewed_source: review },
    f4852_reviewed_source: { reviewed_source: review },
  };
  await assertRejects(
    () => f1040_2025.prepareReturn(altered, source.filer, [], documents),
    Error,
    "prior filed conversion8606 actual PDF",
  );
});
