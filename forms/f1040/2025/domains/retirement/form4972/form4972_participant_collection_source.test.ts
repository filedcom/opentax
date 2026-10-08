import { assert, assertEquals, assertRejects } from "@std/assert";
import { projectedFields } from "../../../pdf/forms/retirement/f4972.ts";
import { reconcileForm4972Collection } from "./form4972_collection_reconciliation.ts";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
import {
  participantCollectionCases,
  participantCollectionInputs,
} from "./form4972_participant_collection.fixture.ts";
import expectations from "./form4972_participant_collection.expected.json" with {
  type: "json",
};

Deno.test("complete recipient/participant collections retain independent elections and full source/native/PDF parity", async () => {
  const evidence = Deno.args[0];
  if (evidence) await Deno.mkdir(evidence, { recursive: true });
  for (const id of participantCollectionCases) {
    const input = participantCollectionInputs(id);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, [], id);
    const pending: any = normalizeAllPending(result.pending);
    const expected = expectations[id];
    assertEquals(pending.form4972.forms.length, expected.forms.length, id);
    for (let i = 0; i < expected.forms.length; i++) {
      for (const [key, value] of Object.entries(expected.forms[i])) {
        assertEquals(
          pending.form4972.forms[i][key] ?? 0,
          value,
          `${id}/${i}/${key}`,
        );
      }
      assertEquals(
        pending.form4972.forms[i].source_document_references,
        input.form4972.elections[i].source_document_references,
      );
    }
    assertEquals(pending.f1040.form4972_tax, expected.specialTax, id);
    assertEquals(
      pending.f1040.line16_income_tax,
      expected.specialTax + expected.regularTax,
      id,
    );
    assertEquals(
      pending.f1040.line24_total_tax,
      expected.specialTax + expected.regularTax,
      id,
    );
    assertEquals(
      pending.f1040.line5b_pension_taxable ?? 0,
      expected.ordinaryPension,
      id,
    );
    const filer = extractFilerIdentity(pending.f1040)!;
    if (expected.forms.length > 2) {
      await assertRejects(
        () => f1040_2025.prepareReturn!(result.pending, filer),
        Error,
        "at most two participant documents",
      );
      await assertRejects(
        () => buildPdfBytes(result.pending, filer),
        Error,
        "at most two participant documents",
      );
      if (evidence) {
        await Deno.writeTextFile(
          `${evidence}/${id}.staged.json`,
          JSON.stringify(
            {
              input,
              pending,
              carry: result.carryforwards,
              filer,
              expected,
              nativeFilingSupported: false,
            },
            null,
            2,
          ),
        );
      }
      console.log(id, {
        forms: expected.forms.length,
        sources: input.f1099r.length,
        specialTax: expected.specialTax,
        nativeFilingSupported: false,
      });
      continue;
    }
    const prepared = await f1040_2025.prepareReturn!(result.pending, filer);
    assertEquals(
      (prepared.bundle.xml.match(/<IRS4972\b/g) ?? []).length,
      expected.forms.length,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS1099R\b/g) ?? []).length,
      input.f1099r.length,
    );
    const dir = evidence ?? await Deno.makeTempDir();
    const origins: PdfPageOrigin[] = [];
    const bytes = await buildPdfBytes(
      f1040_2025.buildPending!(result.pending),
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const pdf = await PDFDocument.load(bytes);
    assertEquals(pdf.getForm().getFields().length, 0);
    assertEquals(origins.length, pdf.getPageCount());
    assertEquals(
      new Set(
        origins.filter((p) => p.formKey === "form4972").map((p) => p.formCopy),
      ).size,
      expected.forms.length,
    );
    await Deno.writeTextFile(`${dir}/${id}.xml`, prepared.bundle.xml);
    const xsd = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${dir}/${id}.xml`,
      ],
      stderr: "piped",
    }).output();
    assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
    if (evidence) {
      await Deno.writeFile(`${dir}/${id}.pdf`, bytes);
      await Deno.writeTextFile(
        `${dir}/${id}.json`,
        JSON.stringify(
          {
            input,
            pending,
            preparedPending: f1040_2025.buildPending!(result.pending),
            carry: result.carryforwards,
            filer,
            origins,
            expected,
          },
          null,
          2,
        ),
      );
    } else await Deno.remove(dir, { recursive: true });
    for (
      const mutate of [
        (p: any) => p.form4972.forms[0].line30++,
        (p: any) => p.f1040.line16_income_tax++,
        (p: any) => p.f1099r.f1099rs[0].recipient_ssn = "111223333",
        (p: any) => p.f1099r.f1099rs[0].box6_nua++,
        (p: any) => p.f1099r.f1099rs.pop(),
        (p: any) =>
          p.form4972.forms[0].participant_collection_review
            .participant_birth_date = "1936-01-02",
        (p: any) =>
          p.form4972.forms[0].participant_collection_review
            .source_document_references.pop(),
      ]
    ) {
      const changed: any = structuredClone(result.pending);
      mutate(changed);
      await assertRejects(() => f1040_2025.prepareReturn!(changed, filer));
      await assertRejects(() => buildPdfBytes(changed, filer));
    }
    const synchronized: any = structuredClone(result.pending);
    const target = Math.max(
      0,
      synchronized.form4972.forms.findIndex((f: any) =>
        f.beneficiary_distribution
      ),
    );
    synchronized.form4972.forms[target].participant_collection_review
      .participant_birth_date = "1936-01-02";
    synchronized.form4972.elections[target].participant_collection_review
      .participant_birth_date = "1936-01-02";
    await assertRejects(() => f1040_2025.prepareReturn!(synchronized, filer));
    await assertRejects(() => buildPdfBytes(synchronized, filer));
    const scoped = reconcileForm4972Collection(
      pending.form4972,
      pending,
      filer,
    );
    const selected: any = structuredClone(scoped[target]);
    selected.fields.participant_collection_review.participant_birth_date =
      "1936-01-02";
    let directRejected = false;
    try {
      projectedFields(selected.fields, selected.pending);
    } catch {
      directRejected = true;
    }
    assert(directRejected, `${id}: direct PDF eligibility bypass`);
    console.log(id, {
      forms: expected.forms.length,
      sources: input.f1099r.length,
      specialTax: expected.specialTax,
      pages: pdf.getPageCount(),
      xsd: xsd.code,
    });
  }
});

Deno.test("participant collection rejects contradictory eligibility, reviewed inventory and issued owner facts", () => {
  for (
    const mutate of [
      (p: any) => delete p.form4972.elections[0].participant_collection_review,
      (p: any) =>
        p.form4972.elections[0].participant_collection_review
          .participant_birth_date = "1936-01-02",
      (p: any) =>
        p.form4972.elections[0].participant_collection_review
          .participant_death_date = "2026-01-01",
      (p: any) =>
        p.form4972.elections[0].participant_collection_review
          .entitlement_record_reference = "",
      (p: any) =>
        p.form4972.elections[0].participant_collection_review
          .no_prior_election_after_1986 = false,
      (p: any) =>
        p.form4972.elections[0].participant_collection_review
          .attributable_federal_estate_tax++,
      (p: any) =>
        p.form4972.elections[0].participant_collection_review
          .source_document_references.pop(),
      (p: any) => p.f1099r[0].recipient_ssn = "111223333",
      (p: any) =>
        p.f1099r[0].form4972_plan.all_qualified_distributions_included = false,
      (p: any) => p.f1099r[0].exclude_4972 = false,
    ]
  ) {
    const input: any = participantCollectionInputs("two-inherited");
    mutate(input);
    assert(
      f1040_2025.executeReturn(input).diagnostics.length > 0,
      mutate.toString(),
    );
  }
});
