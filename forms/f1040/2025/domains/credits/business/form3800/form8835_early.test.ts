import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { earlyCases, earlyFixture } from "./form8835_early.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { form8835Pdf } from "../../../../pdf/forms/credits/business/f8835.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

for (const c of earlyCases) {
  Deno.test(`Form 8835 reviewed early construction complete return: ${c.id}`, async () => {
    const fixture = await earlyFixture(c);
    const { input, attachments, expected } = fixture;
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
    assertEquals(prepared.bundle.attachments.length, c.count);
    assertEquals(
      [...prepared.bundle.xml.matchAll(
        /<FcltyConstrBeganBfrSpcfdDtInd>X<\/FcltyConstrBeganBfrSpcfdDtInd>/g,
      )].length,
      c.count,
    );
    const sources = input.f8835;
    const fields = form8835Pdf.instances!(
      pending.f8835!,
      filer,
      normalizeAllPending(pending),
      prepared.bundle.form3800Parts,
    );
    assertEquals(fields.length, c.count);
    for (let i = 0; i < c.count; i++) {
      const gross = Math.round(sources[i].kwh_sold * .006);
      assertEquals(fields[i].under_one_mw, false);
      assertEquals(fields[i].early_construction, true);
      assertEquals(fields[i].no_increased_credit, false);
      assertEquals(fields[i].line8, gross);
      assertEquals(fields[i].line9, gross * 5);
      assertEquals(fields[i].line15, gross * 5);
      assertStringIncludes(
        prepared.bundle.xml,
        `<QualifiedFacilitiesIncrCrAmt>${
          gross * 5
        }</QualifiedFacilitiesIncrCrAmt>`,
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
      origins.filter((o) => o.formKey === "f8835").length,
      c.count * 3,
    );
    assertEquals(
      origins.filter((o) => o.formKey === "f8835_increased_credit_statement")
        .length,
      c.count,
    );
    const rendered = await PDFDocument.load(pdf);
    assertEquals(rendered.getForm().getFields().length, 0);
    for (
      const origin of origins.filter((o) =>
        o.formKey === "f8835_increased_credit_statement"
      )
    ) {
      assertEquals(
        rendered.getPage(origin.pageNumber - 1).node.Annots()?.size() ?? 0,
        0,
      );
    }
    const mutateSource = (p: typeof pending) =>
      (p.f8835!.f8835s as any[])[0].early_construction_source;
    const mutations: Array<(p: typeof pending) => void> = [
      (p) => {
        (p.f8835!.f8835s as any[])[0].early_construction_source = undefined;
      },
      (p) => {
        mutateSource(p).construction_began_on = "2023-01-29";
      },
      (p) => {
        mutateSource(p).placed_in_service_on = "2023-12-31";
      },
      (p) => {
        mutateSource(p).metered_kwh++;
      },
      (p) => {
        mutateSource(p).invoiced_kwh++;
      },
      (p) => {
        mutateSource(p).taxpayer_tin = "999999999";
      },
      (p) => {
        mutateSource(p).facility_latitude = 40;
      },
      (p) => {
        mutateSource(p).signed_on = "2025-01-01";
      },
      (p) => {
        mutateSource(p).signed_perjury_declaration_reviewed = false;
      },
      (p) => {
        mutateSource(p).statement_sha256 = "a".repeat(64);
      },
      (p) => {
        mutateSource(p).earliest_qualifying_start_verified = false;
      },
      (p) => {
        mutateSource(p).independent_single_facility_reviewed = false;
      },
      (p) => {
        mutateSource(p).capacity_record_reference =
          mutateSource(p).construction_record_reference;
      },
      (p) => {
        mutateSource(p).ac_nameplate_kw++;
      },
    ];
    if (c.cost) {
      mutations.push(
        (p) => {
          mutateSource(p).beginning.costs[0].eligible_cost_cents--;
        },
        (p) => {
          mutateSource(p).beginning.costs[1].paid_or_incurred_on = "2023-01-29";
        },
        (p) => {
          mutateSource(p).beginning.costs[1].record_reference =
            mutateSource(p).beginning.costs[0].record_reference;
        },
      );
    } else {
      mutations.push(
        (p) => {
          mutateSource(p).beginning.work_began_on = "2023-01-29";
        },
        (p) => {
          mutateSource(p).beginning.binding_contract_signed_on = c.start;
        },
        (p) => {
          mutateSource(p).beginning
            .excludes_preliminary_and_inventory_work_verified = false;
        },
      );
    }
    if (c.facts) {
      mutations.push(
        (p) => {
          mutateSource(p).continuity.history.pop();
        },
        (p) => {
          mutateSource(p).continuity.history[1].period_start = "2016-01-02";
        },
        (p) => {
          mutateSource(p).continuity = {
            method: "safe_harbor",
            review_reference: "Expired safe harbor",
          };
        },
      );
    } else {
      mutations.push(
        (p) => {
          mutateSource(p).continuity.review_reference =
            mutateSource(p).construction_record_reference;
        },
      );
    }
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate(changed);
      await assertRejects(() =>
        f1040_2025.prepareReturn(changed, filer, attachments)
      );
      await assertRejects(() =>
        buildPdfBytes(changed, filer, ".pdf-cache", prepared.bundle)
      );
    }
    await assertRejects(() => f1040_2025.prepareReturn(pending, filer, []));
    await assertRejects(() => buildPdfBytes(pending, filer, ".pdf-cache"));
    // A self-consistent new digest must not hide changed statement contents.
    for (
      const key of [
        "TaxpayerTIN",
        "FacilityDescription",
        "Declaration",
        "PerjuryDeclaration",
      ]
    ) {
      const alteredPdf = await PDFDocument.load(attachments[0].bytes);
      alteredPdf.getForm().getTextField(`Form8835Increase.${key}`).setText(
        "CHANGED",
      );
      const bytes = await alteredPdf.save();
      const changed = structuredClone(pending);
      (changed.f8835!.f8835s as any[])[0].early_construction_source
        .statement_sha256 = await sha256Hex(bytes);
      const swapped = [{ ...attachments[0], bytes }, ...attachments.slice(1)];
      await assertRejects(
        () => f1040_2025.prepareReturn(changed, filer, swapped),
        Error,
        key,
      );
    }
    const tmp = await Deno.makeTempFile({ suffix: ".xml" });
    await Deno.writeTextFile(tmp, prepared.bundle.xml);
    try {
      const xsd =
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
      const checked = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, tmp],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    } finally {
      await Deno.remove(tmp);
    }
    let root: string | undefined;
    try {
      root = Deno.env.get("FORM8835_EARLY_EVIDENCE");
    } catch (e) {
      if (!(e instanceof Deno.errors.NotCapable)) throw e;
    }
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${c.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${c.id}.xml`, prepared.bundle.xml);
      for (let i = 0; i < attachments.length; i++) {
        await Deno.writeFile(
          `${root}/${c.id}-statement-${i + 1}.pdf`,
          attachments[i].bytes,
        );
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
            nativeRejections: mutations.length + 5,
            pdfRejections: mutations.length + 1,
          },
          null,
          2,
        ),
      );
    }
  });
}
