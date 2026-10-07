import { reviewedRothOwnerInventory } from "../nodes/intermediate/forms/form8606/roth-inventory.ts";
import {
  calculateOwnerForms,
  inputSchema as form5329InputSchema,
} from "../nodes/intermediate/forms/form5329/index.ts";
import { form5329 } from "./mef/forms/f5329.ts";
import { createHash } from "node:crypto";
import { printSchema } from "../nodes/intermediate/forms/form8606/index.ts";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import {
  rothHistoryCases,
  rothHistoryReturnSource,
} from "./form4852_roth_history.fixture.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { PDFDocument } from "pdf-lib";
const root = ".state/research/form4852-roth-history-checkbox-corrected";
Deno.test("actual prior Roth payment and filed-form history derives remaining owner basis and current8606/5329/1040", async () => {
  await Deno.mkdir(root, { recursive: true });
  for (const [n, row] of rothHistoryCases.entries()) {
    const source = await rothHistoryReturnSource(row, 601 + n);
    const result = f1040_2025.executeReturn(source.inputs);
    assertEquals(result.diagnostics, [], row.id);
    const pending = normalizeAllPending(result.pending);

    assertEquals(
      pending.f1040.line4a_ira_gross,
      row.base === 4 ? 17500 : row.base === 5 ? 9001 : 9000,
    );
    assertEquals(pending.f1040.line4b_ira_taxable, row.taxable);
    assertEquals(pending.f1040.line23_other_taxes ?? 0, row.early);
    assertEquals(pending.f1040.line24_total_tax, row.tax);
    assertEquals(
      printSchema.parse(pending.form8606).owner_forms!.length,
      (row.base === 4) ? 2 : 1,
    );
    const owner = printSchema.parse(pending.form8606).owner_forms![0];
    assertEquals(owner.print_roth_line22_contribution_basis, row.basis);
    assertEquals(owner.print_roth_line24_conversion_basis, row.converted);
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      source.filer,
      [],
      source.retained.documents,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS8606 /g) ?? []).length,
      (row.base === 4) ? 2 : 1,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS5329 /g) ?? []).length,
      (row.base === 4) ? 2 : row.early > 0 ? 1 : 0,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS1099R /g) ?? []).length,
      (row.base === 4) ? 5 : 3,
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
      if (
        ((row.base === 4) ? 2 : 1) < 2 && mutate.toString().includes("reverse")
      ) {
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

Deno.test("retained Roth consumed history rejects prior source, filed basis, recapture and rehashed PDF conflicts", async () => {
  const source = await rothHistoryReturnSource(
    rothHistoryCases.find((row) =>
      row.id === "prior-taxable-conversion-consumed"
    )!,
    801,
  );
  for (
    const mutate of [
      (review: any) =>
        review.prior_distributions[0].payments[0].issued_form1099r
          .box1_gross_distribution += 1,
      (review: any) =>
        review.prior_distributions[0].payments[0].owner_ssn = "999887777",
      (review: any) =>
        review.prior_distributions[0].prior_form8606
          .filed_line22_regular_basis += 1,
      (review: any) =>
        review.prior_distributions[0].prior_form5329
          .filed_line4_additional_tax += 1,
      (review: any) =>
        review.inventory.all_prior_roth_payments_included = undefined,
      (review: any) =>
        review.inventory.no_returned_contributions_confirmed = undefined,
      (review: any) =>
        review.prior_distributions.push(review.prior_distributions[0]),
      (review: any) =>
        review.prior_distributions[0].payments[0].distributed_on = "2024-10-10",
    ]
  ) {
    const review = structuredClone(source.reviews[0]);
    mutate(review);
    assertThrows(() => reviewedRothOwnerInventory(review));
  }
  const result = f1040_2025.executeReturn(source.inputs);
  assertEquals(result.diagnostics, []);
  for (const type of ["8606", "5329"] as const) {
    const prior = type === "8606"
      ? source.reviews[0].prior_distributions![0].prior_form8606
      : source.reviews[0].prior_distributions![0].prior_form5329!;
    const documents = source.retained.documents.map((document) => ({
      ...document,
      bytes: document.bytes.slice(),
    }));
    const document = documents.find((document) =>
      document.document_reference === prior.source_document_reference
    )!;
    const pdf = await PDFDocument.load(document.bytes);
    const field = type === "8606"
      ? "topmostSubform[0].Page2[0].f2_7[0]"
      : "topmostSubform[0].Page1[0].f1_13[0]";
    pdf.getForm().getTextField(field).setText("999");
    document.bytes = new Uint8Array(await pdf.save());
    const pending = normalizeAllPending(result.pending);
    const retainedReview = structuredClone(source.retained.reviewed_source);
    for (const record of retainedReview.records) {
      const treatment = record.treatment_documents.find((row) =>
        row.document_reference === document.document_reference
      );
      if (treatment) {
        treatment.sha256 = createHash("sha256").update(document.bytes).digest(
          "hex",
        );
      }
    }
    const changed = {
      ...pending,
      f4852: { ...pending.f4852, reviewed_source: retainedReview },
      f4852_reviewed_source: { reviewed_source: retainedReview },
    };
    await assertRejects(
      () => f1040_2025.prepareReturn(changed, source.filer, [], documents),
      Error,
      `prior filed${type}`,
    );
  }
  const combined = await rothHistoryReturnSource(
    rothHistoryCases.find((row) =>
      row.id === "same-annual-filed-conversion-and-consumption"
    )!,
    802,
  );
  const changed = structuredClone(combined.reviews[0]);
  changed.prior_distributions![0].prior_form8606.source_document_reference +=
    "-distinct";
  assertThrows(
    () => reviewedRothOwnerInventory(changed),
    Error,
    "one actual annual filed8606",
  );
});
