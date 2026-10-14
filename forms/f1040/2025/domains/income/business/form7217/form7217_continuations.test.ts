import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { distributionPackets } from "./form7217_continuations.fixture.ts";

function evidenceRoot() {
  try {
    return Deno.env.get("FORM7217_CONTINUATIONS_DIR");
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}

for (const entry of distributionPackets) {
  Deno.test(`Form 7217 complete property inventory: ${entry.id}`, async () => {
    const result = f1040_2025.executeReturn(entry.inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    assertEquals(pending.f1040.line7_capital_gain ?? 0, entry.gain);
    assertEquals(pending.f1040.line11_agi, 150000 + entry.gain);
    assertEquals(pending.f1040.line24_total_tax, entry.tax);
    assertEquals(pending.f1040.line37_amount_owed, entry.tax - 25000);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const items = entry.inputs.f7217.form7217s;
    assertEquals(
      prepared.bundle.xml.match(/<AllocationBssDistriPropGrp>/g)?.length,
      items.reduce((sum, item) => sum + item.distributed_properties.length, 0),
    );
    const origins: PdfPageOrigin[] = [];
    const root = evidenceRoot();
    if (root) await Deno.mkdir(root, { recursive: true });
    let pdfError: string | undefined;
    let freshPdfError: string | undefined;
    if (entry.gain > 0) {
      // Deferred126: native canonical rows are wrapped before PDF source replay.
      const message = "matching owner and exactly one sourced Form 8949";
      const error = await assertRejects(
        () =>
          buildPdfBytes(
            prepared.bundle.pending,
            filer,
            ".pdf-cache",
            prepared.bundle,
          ),
        Error,
        message,
      );
      const fresh = await assertRejects(
        () => buildPdfBytes(pending, filer),
        Error,
        items.length === 1
          ? "Form 8949 PDF needs prepared transaction rows"
          : message,
      );
      pdfError = error.message;
      freshPdfError = fresh.message;
    } else {
      const pdf = await buildPdfBytes(
        prepared.bundle.pending,
        filer,
        ".pdf-cache",
        prepared.bundle,
        origins,
      );
      assertEquals(
        origins.length,
        2 +
          items.reduce(
            (sum, item) =>
              sum + 1 + Math.ceil(item.distributed_properties.length / 30),
            0,
          ),
      );
      if (root) await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
    }
    if (root) {
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs: entry.inputs,
            pending,
            filer,
            origins,
            expectedGain: entry.gain,
            expectedTax: entry.tax,
            completePacket: entry.gain === 0,
            pdfError,
            freshPdfError,
            sourceAuthenticityVerified: false,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
    const first = items[0];
    const properties = first.distributed_properties;
    const variants = [
      {
        ...first,
        distributed_properties: [{
          ...properties[0],
          partner_basis_after_section_732:
            properties[0].partner_basis_after_section_732! + 1,
        }, ...properties.slice(1)],
      },
      {
        ...first,
        distributed_properties: [{
          ...properties[0],
          fair_market_value: undefined,
        }, ...properties.slice(1)],
      },
      {
        ...first,
        distributed_properties: [{
          ...properties[0],
          property_treatment: undefined,
        }, ...properties.slice(1)],
      },
      { ...first, distribution_date: "2025-02-30" },
      { ...first, section_751b_sale_or_exchange: true },
      ...(properties.some((p) =>
          p.partner_basis_after_section_732 !==
            p.partnership_basis_before_distribution
        )
        ? [
          { ...first, section_732c_allocation_workpaper_reference: undefined },
          {
            ...first,
            distributed_properties: [{
              ...properties[0],
              section_732c_class: undefined,
            }, ...properties.slice(1)],
          },
        ]
        : []),
    ];
    for (const item of variants) {
      const f7217 = { form7217s: [item, ...items.slice(1)] };
      assert(
        f1040_2025.executeReturn({ ...entry.inputs, f7217 }).diagnostics
          .length > 0,
      );
      const changed = { ...pending, f7217 };
      await assertRejects(
        () => f1040_2025.prepareReturn(changed, filer),
        Error,
      );
      if (entry.gain === 0) {
        await assertRejects(() => buildPdfBytes(changed, filer), Error);
      }
    }
    if (first.section_731_capital_gain_source) {
      const source = first.section_731_capital_gain_source;
      for (
        const changedSource of [
          { ...source, k1_box19_code_a_cash: source.k1_box19_code_a_cash + 1 },
          {
            ...source,
            opening_outside_basis: source.opening_outside_basis + 1,
          },
          { ...source, k1_box19_statement_reference: "" },
          { ...source, k1_box19_statement_distribution_date: "2025-08-31" },
        ]
      ) {
        const f7217 = {
          form7217s: [{
            ...first,
            section_731_capital_gain_source: changedSource,
          }, ...items.slice(1)],
        };
        assert(
          f1040_2025.executeReturn({ ...entry.inputs, f7217 }).diagnostics
            .length > 0,
        );
        await assertRejects(
          () => f1040_2025.prepareReturn({ ...pending, f7217 }, filer),
          Error,
        );
      }
      await assertRejects(
        () =>
          f1040_2025.prepareReturn({
            ...pending,
            f7217: {
              form7217s: [{
                ...first,
                section_731_capital_gain_source: {
                  ...source,
                  k1_partner_ssn: "999887777",
                },
              }, ...items.slice(1)],
            },
          }, filer),
        Error,
        "matching owner",
      );
    }
  });
}
