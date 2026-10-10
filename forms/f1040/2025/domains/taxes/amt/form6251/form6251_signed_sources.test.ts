import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
  assertRejects,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { signedSourceCases } from "./form6251_signed_sources.fixture.ts";

function evidenceRoot() {
  try {
    return Deno.env.get("FORM6251_SIGNED_SOURCES_DIR");
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}
for (const entry of signedSourceCases) {
  Deno.test(`Complete signed AMT source review: ${entry.id}`, async () => {
    const result = f1040_2025.executeReturn(entry.inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const root = evidenceRoot();
    if (root) await Deno.mkdir(root, { recursive: true });
    const expected = {
      trust: entry.trust,
      depletion: entry.depletion,
      regularTax: entry.regularTax,
      amt: entry.amt,
      totalTax: entry.totalTax,
    };
    const snapshot = {
      inputs: entry.inputs,
      pending,
      filer,
      expected,
      sourceAuthenticityVerified: false,
      acceptanceVerified: false,
    };
    if (entry.id.endsWith("-no-form")) {
      // Deferred source/omission boundary: keep the entered negative sources.
      assertEquals(pending.form6251.amti, undefined);
      assertEquals(
        pending.form6251.must_file_for_negative_adjustments,
        undefined,
      );
      assertEquals(pending.f1040.line24_total_tax, entry.totalTax);
      const nativeError = await assertRejects(
        () => f1040_2025.prepareReturn(result.pending, filer),
        Error,
        entry.trust
          ? "beneficiary-owned trust"
          : "property-level AMT depletion",
      );
      const pdfError = await assertRejects(
        () => buildPdfBytes(pending, filer),
        Error,
        entry.trust
          ? "beneficiary-owned trust"
          : "property-level AMT depletion",
      );
      if (root) {
        await Deno.writeTextFile(
          `${root}/${entry.id}.json`,
          JSON.stringify(
            {
              ...snapshot,
              unresolved: "unrequired AMT source export",
              nativeError: nativeError.message,
              pdfError: pdfError.message,
            },
            null,
            2,
          ),
        );
      }
      return;
    }
    const qualifiedBoundary = entry.id === "trust-qualified-dividends";
    if (qualifiedBoundary) {
      // Retain the correct expected tax separately; these are observed defects.
      assertEquals(pending.f1040.line3a_qualified_dividends, 10000);
      assertEquals(
        pending.income_tax_calculation.qualified_dividends,
        undefined,
      );
      assertEquals(pending.form8960.line2_ordinary_dividends, 0);
      assertEquals(pending.f1040.line16_income_tax, 39467);
      assertEquals(pending.f1040.line24_total_tax, 82550);
      assertNotEquals(pending.f1040.line16_income_tax, entry.regularTax);
      assertNotEquals(pending.f1040.line24_total_tax, entry.totalTax);
    } else {
      assertEquals(pending.f1040.line16_income_tax, entry.regularTax);
      assertEquals(pending.form6251.line11_amt, entry.amt);
      assertEquals(pending.schedule2.line2_amt, entry.amt);
      assertEquals(pending.f1040.line24_total_tax, entry.totalTax);
      assertEquals(pending.f1040.line37_amount_owed, entry.totalTax - 35000);
    }
    assertEquals(pending.form6251.line2j_estates_and_trusts ?? 0, entry.trust);
    assertEquals(pending.form6251.line2d_depletion ?? 0, entry.depletion);
    assertEquals(pending.f1040.line11_agi, qualifiedBoundary ? 210000 : 200000);
    assertEquals(
      pending.form6251.amti,
      (qualifiedBoundary ? 210000 : 200000) + entry.trust + entry.depletion,
    );
    if (entry.inputs.schedule_c.length > 0) {
      assertEquals(pending.schedule1.line3_schedule_c, 0);
    }
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    if (root) {
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            ...snapshot,
            origins,
            reconciled: !qualifiedBoundary,
            ...(qualifiedBoundary
              ? { unresolved: "qualified-dividend tax and NIIT source routing" }
              : {}),
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
    }
    if (qualifiedBoundary) return;
    const trusts = entry.inputs.k1_trust;
    if (trusts.length > 0) {
      const first = trusts[0];
      const variants = [
        [{
          ...first,
          box12_code_a_amt_adjustment: first.box12_code_a_amt_adjustment! + 1,
        }, ...trusts.slice(1)],
        [{ ...first, beneficiary_ssn: "999887777" }, ...trusts.slice(1)],
        [
          { ...first, source_document_reference: undefined },
          ...trusts.slice(1),
        ],
        [
          { ...first, box12_codes_b_through_f_absent: undefined },
          ...trusts.slice(1),
        ],
        [...trusts, first],
        trusts.slice(0, -1),
      ];
      for (const [index, copies] of variants.entries()) {
        if ([2, 3].includes(index)) {
          assert(
            f1040_2025.executeReturn({ ...entry.inputs, k1_trust: copies })
              .diagnostics.length > 0,
          );
        }
        const mutated = { ...pending, k1_trust: { k1_trusts: copies } };
        await assertRejects(
          () => f1040_2025.prepareReturn(mutated, filer),
          Error,
        );
        await assertRejects(() => buildPdfBytes(mutated, filer), Error);
      }
    }
    const businesses = entry.inputs.schedule_c;
    if (businesses.length > 0) {
      const first = businesses[0];
      const paper = first.amt_depletion_worksheet!;
      const variants = [
        [{
          ...first,
          amt_depletion_worksheet: {
            ...paper,
            properties: paper.properties.map((p, i) =>
              i
                ? p
                : { ...p, amt_allowed_depletion: p.amt_allowed_depletion + 1 }
            ),
          },
        }, ...businesses.slice(1)],
        [{
          ...first,
          amt_depletion_worksheet: {
            ...paper,
            properties: [...paper.properties, paper.properties[0]],
          },
        }, ...businesses.slice(1)],
        [
          { ...first, amt_depletion_worksheet: undefined },
          ...businesses.slice(1),
        ],
        [
          { ...first, line_12_depletion: first.line_12_depletion! + 1 },
          ...businesses.slice(1),
        ],
        [{
          ...first,
          amt_depletion_worksheet: {
            ...paper,
            no_at_risk_or_basis_limitation_verified: undefined,
          },
        }, ...businesses.slice(1)],
        businesses.slice(0, -1),
      ];
      for (const [index, copies] of variants.entries()) {
        if ([3, 4].includes(index)) {
          assert(
            f1040_2025.executeReturn({ ...entry.inputs, schedule_c: copies })
              .diagnostics.length > 0,
          );
        }
        const mutated = {
          ...pending,
          schedule_c: { ...pending.schedule_c, schedule_cs: copies },
        };
        await assertRejects(
          () => f1040_2025.prepareReturn(mutated, filer),
          Error,
        );
        await assertRejects(() => buildPdfBytes(mutated, filer), Error);
      }
    }
    for (
      const mutated of [
        {
          ...pending,
          form6251: {
            ...pending.form6251,
            ...(entry.trust
              ? { line2j_estates_and_trusts: entry.trust + 1 }
              : { line2d_depletion: entry.depletion + 1 }),
          },
        },
        {
          ...pending,
          f1040: { ...pending.f1040, line17_additional_taxes: entry.amt + 1 },
        },
      ]
    ) {
      await assertRejects(
        () => f1040_2025.prepareReturn(mutated, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(mutated, filer), Error);
    }
  });
}
