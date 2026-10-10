import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { domesticCases, domesticFixture } from "./form8835_domestic.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { form8835Pdf } from "../../../../pdf/forms/credits/business/f8835.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import {
  preparedSourceSha256,
  sha256Hex,
} from "../../../../return-processing/prepared-source.ts";
import {
  calculateForm8835,
  inputSchema,
} from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import { domesticManufacturedCosts } from "../../../../../nodes/inputs/credits/business/f8835/domestic-source.ts";

for (const c of domesticCases) {
  Deno.test(`Form 8835 reviewed domestic content complete return: ${c.id}`, async () => {
    const { input, attachments, expected } = await domesticFixture(c);
    const execution = f1040_2025.executeReturn(input);
    assertEquals(execution.diagnostics, []);
    const filer = extractFilerIdentity(execution.pending.f1040);
    const prepared = await f1040_2025.prepareReturn(
      execution.pending,
      filer,
      attachments,
    );
    const pending = prepared.bundle.pending;
    assertEquals(pending.f1040?.line16_income_tax, 25067);
    assertEquals(
      pending.f1040?.line20_nonrefundable_credits,
      2001 + expected.productionUsed,
    );
    assertEquals(pending.f1040?.line24_total_tax, expected.tax);
    assertEquals(pending.f1040?.line35a_refund, 30000 - expected.tax);
    assertEquals(
      prepared.bundle.attachments.length,
      c.count * (c.reason === "none" ? 1 : 2),
    );
    const fields = form8835Pdf.instances!(
      pending.f8835!,
      filer,
      normalizeAllPending(pending),
      prepared.bundle.form3800Parts,
    );
    for (let i = 0; i < c.count; i++) {
      const base = Math.round(input.f8835[i].kwh_sold * .006) *
        (c.reason === "none" ? 1 : 5);
      assertEquals(fields[i].domestic_bonus, true);
      assertEquals(fields[i].no_domestic_bonus, false);
      assertEquals(fields[i].line9, base);
      assertEquals(fields[i].line10, Math.round(base * .1));
      assertEquals(fields[i].line15, base + Math.round(base * .1));
      assertStringIncludes(
        prepared.bundle.xml,
        `<DomesticContentBonusCreditAmt>${
          Math.round(base * .1)
        }</DomesticContentBonusCreditAmt>`,
      );
      const id = [
        ...prepared.bundle.xml.matchAll(
          /<BinaryAttachment documentId="([^"]+)">([\s\S]*?)<\/BinaryAttachment>/g,
        ),
      ]
        .find((m) =>
          m[2].includes(
            `<AttachmentLocationTxt>Domestic${
              i + 1
            }.pdf</AttachmentLocationTxt>`,
          )
        )?.[1];
      assertStringIncludes(
        prepared.bundle.xml,
        `<PropertyQualifyDomBonusCrInd referenceDocumentId="${id}" referenceDocumentName="BinaryAttachment">true</PropertyQualifyDomBonusCrInd>`,
      );
    }
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(
      origins.filter((p) => p.formKey === "f8835_domestic_content_statement")
        .length,
      c.count * 2,
    );
    const rendered = await PDFDocument.load(pdf);
    assertEquals(rendered.getForm().getFields().length, 0);
    for (
      const origin of origins.filter((p) =>
        p.formKey === "f8835_domestic_content_statement"
      )
    ) {
      assertEquals(
        rendered.getPage(origin.pageNumber - 1).node.Annots()?.size() ?? 0,
        0,
      );
    }
    const source = (p: typeof pending) =>
      (p.f8835!.f8835s as any[])[0].domestic_content_source;
    const mutations: Array<(p: typeof pending) => void> = [
      (p) => {
        delete (p.f8835!.f8835s as any[])[0].domestic_content_source;
      },
      (p) => {
        source(p).manufactured_products.at(-1).total_direct_cost_cents *= 100;
      },
      (p) => {
        source(p).manufactured_products[0].components[0]
          .manufacturer_direct_cost_cents = 1000000000;
      },
      (p) => {
        source(p).steel_iron[0]
          .all_manufacturing_processes_us_except_metallurgical_additives =
            false;
      },
      (p) => {
        source(p).complete_project_component_inventory_verified = false;
      },
      (p) => {
        source(p).manufactured_products[0]
          .complete_component_inventory_verified = false;
      },
      (p) => {
        source(p).installation_costs_excluded_verified = false;
      },
      (p) => {
        source(p).manufacturer_paid_or_incurred_direct_costs_reviewed = false;
      },
      (p) => {
        source(p).manufactured_products[0].components.push(
          source(p).manufactured_products[0].components[0],
        );
      },
      (p) => {
        source(p).facility_city = "Other city";
      },
      (p) => {
        source(p).taxpayer_tin = "999999999";
      },
      (p) => {
        source(p).metered_kwh++;
      },
      (p) => {
        source(p).invoiced_kwh++;
      },
      (p) => {
        source(p).certification_year--;
      },
      (p) => {
        source(p).placed_in_service_on = "2022-01-01";
      },
      (p) => {
        source(p).signed_on = "2022-01-01";
      },
      (p) => {
        source(p).signed_perjury_declaration_reviewed = false;
      },
      (p) => {
        source(p).statement_sha256 = "0".repeat(64);
      },
      (p) => {
        source(p).first_year_bonus_credit++;
      },
      (p) => {
        if (source(p).prior_certification) delete source(p).prior_certification;
        else {source(p).prior_certification = {
            filed_return_reference: "unexpected",
            originally_submitted_sha256: source(p).statement_sha256,
            original_certification_and_filing_reviewed: true,
          };}
      },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate(changed);
      await assertRejects(() =>
        f1040_2025.prepareReturn(changed, filer, attachments)
      );
      // Recompute the outer pending hash to exercise the PDF content gate.
      const awaitHash = await preparedSourceSha256(changed, filer);
      await assertRejects(() =>
        buildPdfBytes(changed, filer, ".pdf-cache", {
          ...prepared.bundle,
          pending: changed,
          sourceSha256: awaitHash,
        })
      );
    }
    // Re-hashed PDF edits must not be accepted as merely new authorized bytes.
    for (
      const key of [
        "FacilityDescription",
        "TaxpayerTIN",
        "FirstYearBonusCredit",
        "PerjuryDeclaration",
      ]
    ) {
      const changed = structuredClone(pending);
      const copies = attachments.map((a) => ({ ...a }));
      const a = copies.find((a) =>
        a.fileName === source(changed).statement_file_name
      )!;
      const altered = await PDFDocument.load(a.bytes);
      altered.getForm().getTextField(`Form8835Domestic.${key}`).setText(
        "ALTERED",
      );
      a.bytes = await altered.save();
      source(changed).statement_sha256 = await sha256Hex(a.bytes);
      if (source(changed).prior_certification) {
        source(changed).prior_certification.originally_submitted_sha256 =
          source(changed).statement_sha256;
      }
      await assertRejects(() =>
        f1040_2025.prepareReturn(changed, filer, copies)
      );
    }
    await assertRejects(
      () => buildPdfBytes(pending, filer, ".pdf-cache"),
      Error,
      "distinct retained bytes",
    );
    let root: string | undefined;
    try {
      root = Deno.env.get("FORM8835_DOMESTIC_EVIDENCE_DIR");
    } catch { /* Full runner does not export private evidence. */ }
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${c.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${c.id}.xml`, prepared.bundle.xml);
      for (const a of attachments) {
        await Deno.writeFile(`${root}/${c.id}-${a.fileName}`, a.bytes);
      }
      await Deno.writeTextFile(
        `${root}/${c.id}.json`,
        JSON.stringify(
          {
            input,
            pending,
            expected,
            origins,
            fields,
            nativeRejections: mutations.length + 4,
            pdfSourceRejections: mutations.length,
            freshPdfRejections: 1,
          },
          null,
          2,
        ),
      );
    }
  });
}

Deno.test("Form 8835 actual costs: IRS example, product labor and exact 40-percent boundary", async () => {
  const exact = await domesticFixture(domesticCases[0]);
  const item = inputSchema.parse({ f8835s: exact.input.f8835 }).f8835s[0];
  assertEquals(domesticManufacturedCosts(item.domestic_content_source!), {
    domestic: 400000n,
    total: 1000000n,
  });
  const components =
    item.domestic_content_source!.manufactured_products[0].components;
  components[0].manufacturer_direct_cost_cents--;
  components[1].manufacturer_direct_cost_cents++;
  assertThrows(() => calculateForm8835(item), Error, "40-percent");
  const example = await domesticFixture(domesticCases[1]);
  const other = inputSchema.parse({ f8835s: example.input.f8835 }).f8835s[0];
  assertEquals(domesticManufacturedCosts(other.domestic_content_source!), {
    domestic: 18000n,
    total: 30000n,
  });
  other.domestic_content_source!.manufactured_products[0]
    .all_manufacturing_processes_us = false;
  assertEquals(domesticManufacturedCosts(other.domestic_content_source!), {
    domestic: 15500n,
    total: 30000n,
  });
});
