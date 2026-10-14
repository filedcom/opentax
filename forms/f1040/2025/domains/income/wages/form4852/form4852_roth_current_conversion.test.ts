import { form8606 } from "../../../../mef/forms/income/retirement/f8606.ts";
import { form8606Pdf } from "../../../../pdf/forms/income/retirement/f8606.ts";
import { reviewedRothOwnerInventory } from "../../../../../nodes/intermediate/forms/income/retirement/form8606/roth-inventory.ts";
import {
  calculateOwnerForms,
  inputSchema as form5329InputSchema,
} from "../../../../../nodes/intermediate/forms/taxes/retirement/form5329/index.ts";
import { form5329 } from "../../../../mef/forms/taxes/retirement/f5329.ts";
import { createHash } from "node:crypto";
import { printSchema } from "../../../../../nodes/intermediate/forms/income/retirement/form8606/index.ts";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import {
  rothCurrentConversionCases,
  rothCurrentConversionReturnSource,
} from "./form4852_roth_current_conversion.fixture.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { PDFDocument } from "pdf-lib";
const root =
  ".state/research/form4852-roth-current-conversion-checkbox-corrected";
Deno.test("actual current2025 conversion sources derive same owner8606 PartsII/III and5329/1040", async () => {
  await Deno.mkdir(root, { recursive: true });
  for (const [n, row] of rothCurrentConversionCases.entries()) {
    const source = await rothCurrentConversionReturnSource(row, 601 + n);
    const result = f1040_2025.executeReturn(source.inputs);
    assertEquals(result.diagnostics, [], row.id);
    if ("blocked" in row) {
      const pending = normalizeAllPending(result.pending);
      const fields = printSchema.parse(pending.form8606).owner_forms![0];
      assertEquals(fields.print_line17_nontaxable_conversion, 15000);
      assertEquals(fields.print_line18_taxable_conversion, -5000);
      assertEquals(pending.f1040.line4b_ira_taxable, 0);
      await assertRejects(
        () =>
          f1040_2025.prepareReturn(
            result.pending,
            source.filer,
            [],
            source.retained.documents,
          ),
        Error,
        "signed Form8606 line18",
      );
      assertThrows(
        () => form8606Pdf.instances!(pending.form8606, source.filer, pending),
        Error,
        "signed Form8606 line18",
      );
      continue;
    }
    const pending = normalizeAllPending(result.pending);

    assertEquals(
      pending.f1040.line4a_ira_gross,
      "joint" in row ? 17500 + 15000 : 9000 + Math.floor(row.converted + .5),
    );
    assertEquals(
      pending.f1040.line4b_ira_taxable,
      row.conversionTax + row.rothTax,
    );
    assertEquals(pending.f1040.line23_other_taxes ?? 0, row.early);
    assertEquals(pending.f1040.line24_total_tax, row.total);
    assertEquals(
      printSchema.parse(pending.form8606).owner_forms!.length,
      ("joint" in row) ? 2 : 1,
    );
    const owner = printSchema.parse(pending.form8606).owner_forms![0];
    assertEquals(
      owner.print_roth_line22_contribution_basis,
      "qualified" in row
        ? undefined
        : "regular" in row
        ? 1000
        : "firstConversion" in row
        ? 500
        : 0,
    );
    assertEquals(
      owner.print_roth_line24_conversion_basis,
      "qualified" in row
        ? undefined
        : (row.base === 9 || "firstConversion" in row || "currentOnly" in row
          ? 0
          : row.base === 10
          ? 4000
          : 3000) +
          Math.floor(row.converted + .5),
    );
    assertEquals(owner.print_line16_converted, Math.floor(row.converted + .5));
    assertEquals(owner.print_line17_nontaxable_conversion, row.currentBasis);
    assertEquals(
      owner.print_line18_taxable_conversion,
      row.conversionTax - ("joint" in row ? 5000 : 0),
    );
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      source.filer,
      [],
      source.retained.documents,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS8606 /g) ?? []).length,
      ("joint" in row) ? 2 : 1,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS5329 /g) ?? []).length,
      ("joint" in row) ? 2 : row.early > 0 ? 1 : 0,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS1099R /g) ?? []).length,
      ("joint" in row) ? 7 : "split" in row ? 5 : 4,
    );
    assertEquals(prepared.bundle.attachments, []);
    const nativeOwners = [
      ...prepared.bundle.xml.matchAll(/<IRS8606 [^>]*>([\s\S]*?)<\/IRS8606>/g),
    ].map((match) => match[1]);
    for (const [ownerIndex, review] of source.reviews.entries()) {
      const xml = nativeOwners.find((xml) =>
        xml.includes(
          `<NondedIRATxpyrWithIRASSN>${review.owner_identity.owner_ssn}</NondedIRATxpyrWithIRASSN>`,
        )
      )!;
      assertEquals(
        xml.includes("<TotNonQlfyDistriFromRothIRAAmt>"),
        !("qualified" in row),
      );
      assertEquals(
        xml.includes("<NondedIRABasisForPYAmt>"),
        !ownerIndex && row.priorBasis > 0 && row.yearEnd > 0,
      );
      const gross = ownerIndex ? 5000 : Math.floor(row.converted + .5);
      const basis = ownerIndex ? 0 : row.currentBasis;
      assertEquals(
        xml.includes(
          `<TotalIRAConvertedToRothAmt>${gross}</TotalIRAConvertedToRothAmt>`,
        ),
        true,
      );
      assertEquals(
        xml.includes(
          `<TraditionalIRABasisAmt>${basis}</TraditionalIRABasisAmt>`,
        ),
        true,
      );
      assertEquals(
        xml.includes(
          `<TaxableIRAConversionAmt>${gross - basis}</TaxableIRAConversionAmt>`,
        ),
        true,
      );
    }
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
        (p: any) =>
          p.form8606.owner_forms[0].print_line17_nontaxable_conversion += 1,
        (p: any) =>
          p.f1099r.f1099rs.find((i: any) => i.rollover_code === "C")
            .box1_gross_distribution += 1,
        (p: any) =>
          p.f1099r.f1099rs.find((i: any) => i.rollover_code === "C")
            .recipient_ssn = "999887777",
        (p: any) =>
          p.f1099r.f1099rs.find((i: any) => i.rollover_code === "C")
            .account_number += "-wrong",
        (p: any) =>
          p.f1099r.f1099rs.find((i: any) => i.rollover_code === "C")
            .box2b_not_determined = false,
        (p: any) =>
          p.f1099r.f1099rs = p.f1099r.f1099rs.filter((i: any) =>
            i.rollover_code !== "C"
          ),
        (p: any) =>
          p.form8606.roth_owner_inventory_reviews[0].current_conversion
            .year_end_statements.pop(),
        (p: any) => p.form8606.roth_owner_inventory_reviews[0].payments.pop(),
      ]
    ) {
      if (
        (("joint" in row) ? 2 : 1) < 2 && mutate.toString().includes("reverse")
      ) {
        continue;
      }
      if (
        (row.early === 0 && mutate.toString().includes("form5329")) ||
        ("qualified" in row && mutate.toString().includes("print_roth_line"))
      ) continue;
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

Deno.test("current conversion inventory and actual retained prior-basis/debit facts reject conflicting filing sources", async () => {
  const source = await rothCurrentConversionReturnSource(
    rothCurrentConversionCases[1],
    901,
  );
  for (
    const mutate of [
      (r: any) => r.current_conversion.year_end_statements.pop(),
      (r: any) => r.current_conversion.prior_form8606.filed_part_i.line2 += 1,
      (r: any) =>
        r.current_conversion.year_end_statements[0].owner_ssn = "999887777",
      (r: any) =>
        r.current_conversion.accounts[0].form5498.box3_roth_conversion_amount +=
          1,
      (r: any) =>
        r.current_conversion.accounts[0].transfers[0].receipt.amount += 1,
      (r: any) =>
        r.current_conversion.accounts[0].transfers[0].issued_form1099r
          .owner_ssn = "999887777",
      (r: any) =>
        r.current_conversion.accounts[0].transfers[0].issued_form1099r
          .distributed_on = "2024-02-10",
      (r: any) =>
        r.current_conversion.accounts[0].transfers[0].issued_form1099r
          .federal_withheld = 1,
      (r: any) =>
        r.current_conversion.accounts[0].transfers[0].issued_form1099r
          .state_tax_withheld = 1,
      (r: any) =>
        r.current_conversion.accounts[0].transfers[0].issued_form1099r
          .local_tax_withheld = 1,
      (r: any) =>
        r.current_conversion.inventory.no_current_traditional_contributions =
          undefined,
      (r: any) =>
        r.current_conversion.inventory
          .all_current_traditional_distributions_are_listed_conversions =
            undefined,
      (r: any) =>
        r.current_conversion.accounts[0].transfers.push(
          r.current_conversion.accounts[0].transfers[0],
        ),
    ]
  ) {
    const changed = structuredClone(source.reviews[0]);
    mutate(changed);
    assertThrows(() => reviewedRothOwnerInventory(changed));
  }
  const result = f1040_2025.executeReturn(source.inputs);
  assertEquals(result.diagnostics, []);
  const currentFields = structuredClone(
    printSchema.parse(normalizeAllPending(result.pending).form8606)
      .owner_forms![0],
  );
  delete currentFields.roth_owner_inventory_review;
  currentFields.print_line18_taxable_conversion = -1;
  assertThrows(
    () =>
      form8606.build(currentFields, {
        pending: normalizeAllPending(result.pending),
        filer: source.filer,
      }),
    Error,
    "current conversion fields require actual retained current source inventory",
  );
  const prior = source.reviews[0].current_conversion!.prior_form8606;
  const issued = source.reviews[0].current_conversion!.accounts[0].transfers[0]
    .issued_form1099r;
  for (
    const mutation of [
      {
        reference: prior.source_document_reference,
        field: "f1_23",
        error: "prior filed Form8606 parsed owner/basis",
      },
      {
        reference: prior.source_document_reference,
        field: "f1_10",
        error: "prior filed8606 parsed PartI operands",
      },
      {
        reference: issued.source_document_reference,
        field: undefined,
        error: "retirement treatment parsed source facts",
      },
    ]
  ) {
    const { reference, field, error } = mutation;
    const documents = source.retained.documents.map((d) => ({
      ...d,
      bytes: d.bytes.slice(),
    }));
    const document = documents.find((d) => d.document_reference === reference)!;
    if (field) {
      const pdf = await PDFDocument.load(document.bytes);
      pdf.getForm().getTextField(`topmostSubform[0].Page1[0].${field}[0]`)
        .setText(
          "3999",
        );
      document.bytes = new Uint8Array(await pdf.save());
    } else {
      const facts = JSON.parse(new TextDecoder().decode(document.bytes));
      facts.box1_gross_distribution += 1;
      document.bytes = new TextEncoder().encode(JSON.stringify(facts));
    }
    const review = structuredClone(source.retained.reviewed_source);
    for (const record of review.records) {
      const binding = record.treatment_documents.find((d) =>
        d.document_reference === reference
      );
      if (binding) {
        binding.sha256 = createHash("sha256").update(document.bytes).digest(
          "hex",
        );
      }
    }
    const pending = normalizeAllPending(result.pending);
    const changed = {
      ...pending,
      f4852: { ...pending.f4852, reviewed_source: review },
      f4852_reviewed_source: { reviewed_source: review },
    };
    await assertRejects(
      () => f1040_2025.prepareReturn(changed, source.filer, [], documents),
      Error,
      error,
    );
  }
});
