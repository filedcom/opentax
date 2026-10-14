import {
  assert,
  assertEquals,
  assertExists,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { paymentPackets } from "./form6252_payments.fixture.ts";

function evidenceRoot() {
  try {
    return Deno.env.get("FORM6252_PAYMENTS_DIR");
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}

for (const entry of paymentPackets) {
  Deno.test(`Form 6252 principal and interest complete return: ${entry.id}`, async () => {
    const result = f1040_2025.executeReturn(entry.inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const gain = entry.gains.reduce((sum, amount) => sum + amount, 0);
    assertEquals(pending.f1040.line2b_taxable_interest, entry.interest);
    assertEquals(pending.f1040.line7_capital_gain ?? 0, gain);
    assertEquals(pending.f1040.line11_agi, 150000 + entry.interest + gain);
    assertEquals(
      pending.f1040.line15_taxable_income,
      134250 + entry.interest + gain,
    );
    assertEquals(pending.f1040.line24_total_tax, entry.tax);
    assertEquals(pending.f1040.line37_amount_owed, entry.tax - 25000);
    assertEquals(pending.schedule_d?.gain_form6252_st ?? 0, entry.shortTerm);
    assertEquals(pending.schedule_d?.gain_form6252_lt ?? 0, entry.longTerm);
    assertEquals(pending.form4797?.gain_form6252 ?? 0, entry.business);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const xml = prepared.bundle.xml;
    assertEquals(
      xml.match(/<IRS6252 documentId=/g)?.length,
      entry.gains.length,
    );
    assertEquals(
      [...xml.matchAll(
        /<InstalSaleLessOrdnryIncmAmt>(\d+)<\/InstalSaleLessOrdnryIncmAmt>/g,
      )].map((match) => Number(match[1])),
      entry.gains,
    );
    assertStringIncludes(
      xml,
      `<TaxableInterestAmt>${entry.interest}</TaxableInterestAmt>`,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(
      origins.filter((origin) => origin.formKey === "form6252").length,
      entry.gains.length,
    );

    const first = entry.inputs.form6252[0];
    const remaining = entry.inputs.form6252.slice(1);
    const invalidSource = [
      { ...first, date_sold: "2025-02-30" },
      { ...first, date_sold: "2019-01-01" },
      { ...first, payments_received: -1 },
      { ...first, payments_received: 200000 },
      ...(gain > 0
        ? [{ ...first, is_long_term: first.date_acquired === "2025-01-01" }]
        : []),
      { ...first, depreciation_allowed: 1 },
      ...(first.prior_year_form6252_source
        ? [
          { ...first, prior_year_form6252_source: undefined },
          {
            ...first,
            prior_year_form6252_source: {
              ...first.prior_year_form6252_source,
              line26_gain: 29999,
            },
          },
        ]
        : []),
    ];
    for (const sale of invalidSource) {
      assert(
        f1040_2025.executeReturn({
          ...entry.inputs,
          form6252: [sale, ...remaining],
        }).diagnostics.length > 0,
      );
    }
    const changedSource = [
      { ...first, payments_received: (first.payments_received ?? 0) + 1000 },
      { ...first, mortgage_assumed: (first.mortgage_assumed ?? 0) + 1000 },
      { ...first, cost_basis: (first.cost_basis ?? 0) + 1000 },
      { ...first, sold_to_related_party: true },
      { ...first, selling_price_determinable: false },
      { ...first, depreciation_allowed: 1 },
      { ...first, depreciation_recapture: 1 },
      { ...first, is_long_term: first.date_acquired === "2025-01-01" },
      ...(first.prior_year_form6252_source
        ? [
          { ...first, prior_year_form6252_source: undefined },
          {
            ...first,
            prior_year_form6252_source: {
              ...first.prior_year_form6252_source,
              line19_gross_profit_ratio: 0.6,
            },
          },
          {
            ...first,
            prior_year_form6252_source: {
              ...first.prior_year_form6252_source,
              line20_year_of_sale_payment: 19000,
            },
          },
        ]
        : []),
    ];
    for (const sale of changedSource) {
      const changed = {
        ...pending,
        form6252: { f6252s: [sale, ...remaining] },
      };
      await assertRejects(
        () => f1040_2025.prepareReturn(changed, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(changed, filer), Error);
    }
    if (gain === 0) {
      // Deferred: the zero-payment public node returns before this check;
      // native and fresh-PDF export still reject the same inconsistent flag.
      assertEquals(
        f1040_2025.executeReturn({
          ...entry.inputs,
          form6252: [{ ...first, is_long_term: false }, ...remaining],
        }).diagnostics,
        [],
      );
    }
    const root = evidenceRoot();
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, xml);
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs: entry.inputs,
            pending,
            filer,
            origins,
            expected: {
              gains: entry.gains,
              interest: entry.interest,
              tax: entry.tax,
            },
            rejectedPublic: invalidSource.length,
            rejectedNative: changedSource.length,
            rejectedFreshPdf: changedSource.length,
            acceptedPublicHoldingPeriodConflict: gain === 0,
            sourceAuthenticityVerified: false,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
  });
}
