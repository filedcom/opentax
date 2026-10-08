import { createHash } from "node:crypto";
import { printSchema } from "../../../../nodes/intermediate/forms/form8606/index.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import {
  rothInventoryCases,
  rothInventoryReturnSource,
} from "./form4852_roth_inventory.fixture.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
const root = ".state/research/form4852-roth-inventory-checkbox-corrected";
Deno.test("complete source-owned Roth current inventories aggregate basis once and file separate owner8606/5329 copies", async () => {
  await Deno.mkdir(root, { recursive: true });
  for (const [n, row] of rothInventoryCases.entries()) {
    const source = await rothInventoryReturnSource(row, 301 + n);
    const result = f1040_2025.executeReturn(source.inputs);
    assertEquals(result.diagnostics, [], row.id);
    const pending = normalizeAllPending(result.pending);

    assertEquals(pending.f1040.line4a_ira_gross, row.gross);
    assertEquals(pending.f1040.line4b_ira_taxable, row.taxable);
    assertEquals(pending.f1040.line23_other_taxes ?? 0, row.early);
    assertEquals(pending.f1040.line24_total_tax, row.totalTax);
    assertEquals(
      printSchema.parse(pending.form8606).owner_forms!.length,
      row.copies,
    );
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      source.filer,
      [],
      source.retained.documents,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS8606 /g) ?? []).length,
      row.copies,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS5329 /g) ?? []).length,
      "earlySpouse" in row ? 2 : row.early > 0 ? 1 : 0,
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
        (p: any) => p.form8606.nondeductible_contributions = 1,
        (p: any) => p.form8606.roth_owner_inventory_reviews[0].payments.pop(),
      ]
    ) {
      if (row.copies < 2 && mutate.toString().includes("reverse")) continue;
      if (row.copies === 0 && mutate.toString().includes("owner_forms[0]")) {
        continue;
      }
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

Deno.test("complete Roth current source rejects missing copies, repeated lineage, conflicting owner history and undisclosed other IRA activity", async () => {
  const source = await rothInventoryReturnSource(rothInventoryCases[1], 401);
  for (
    const mutate of [
      (i: any) => i.f4852.pop(),
      (i: any) => i.f4852.push(structuredClone(i.f4852[0])),
      (i: any) =>
        i.f4852[0].retirement_source.roth_owner_inventory_review
          .contributions[0].form5498.box10_roth_contributions += 1,
      (i: any) =>
        i.f4852[0].retirement_source.roth_owner_inventory_review.inventory
          .all_current_roth_payments_included = false,
      (i: any) => i.f1099r[0].box4_federal_withheld += 1,
      (i: any) =>
        i.f1099r.push({
          ...i.f1099r[0],
          roth_owner_inventory_review: undefined,
          source_document_reference: "other-current-IRA",
          account_number: "other-IRA-account",
          box7_distribution_code: "7",
          box7_ira_simple_indicator: true,
          box2a_taxable_amount: 2000,
          box2b_not_determined: false,
          exclude_8606_roth: undefined,
        }),
      (i: any) => i.f1099r[0].payer_address_zip = "00000",
      (i: any) => i.f1099r[0].roth_owner_inventory_review.owner = "S",
      (i: any) =>
        i.f1099r[0].roth_owner_inventory_review.payments[0]
          .distribution_reference =
            i.f1099r[0].roth_owner_inventory_review.payments[1]
              .distribution_reference,
    ]
  ) {
    const inputs = structuredClone(source.inputs);
    mutate(inputs);
    assertEquals(
      f1040_2025.executeReturn(inputs).diagnostics.length > 0,
      true,
      mutate.toString(),
    );
  }
});

Deno.test("complete Roth inventories require actual retained owner/account/payment bytes even after hashes are updated", async () => {
  const source = await rothInventoryReturnSource(rothInventoryCases[1], 451);
  const result = f1040_2025.executeReturn(source.inputs);
  assertEquals(result.diagnostics, []);
  const review = structuredClone(source.retained.reviewed_source);
  const reference = source.reviews[0].payments[0].source_document_reference;
  const documents = source.retained.documents.map((document) => ({
    ...document,
    bytes: document.bytes.slice(),
  }));
  const document = documents.find((document) =>
    document.document_reference === reference
  )!;
  const facts = JSON.parse(new TextDecoder().decode(document.bytes));
  facts.account_number = "wrong-owned-account";
  document.bytes = new TextEncoder().encode(JSON.stringify(facts));
  for (const record of review.records) {
    for (const binding of record.treatment_documents) {
      if (binding.document_reference === reference) {
        binding.sha256 = createHash("sha256").update(document.bytes).digest(
          "hex",
        );
      }
    }
  }
  const pending = normalizeAllPending(result.pending);
  pending.f4852_reviewed_source = { reviewed_source: review };
  await assertRejects(() =>
    f1040_2025.prepareReturn(pending, source.filer, [], documents)
  );
});
