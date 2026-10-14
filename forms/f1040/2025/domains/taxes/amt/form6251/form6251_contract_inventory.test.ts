import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { withSyntheticForm1098Copy } from "../../../../pdf/reviews/deductions/mortgage/review-1098-copy.fixture.ts";
import { contractInventoryCases } from "./form6251_contract_inventory.fixture.ts";

for (const entry of contractInventoryCases) {
  Deno.test(`Complete first-year AMT contract inventory: ${entry.id}`, async () => {
    const inputs = {
      ...entry.inputs,
      ...(entry.inputs.f1098
        ? {
          f1098: await Promise.all(entry.inputs.f1098.map(async (source) => {
            assertExists(source.lender_name);
            assertExists(source.recipient_tin);
            assertExists(source.source_document_reference);
            return await withSyntheticForm1098Copy(entry.id, {
              ...source,
              lender_name: source.lender_name,
              recipient_tin: source.recipient_tin,
              source_document_reference: source.source_document_reference,
            });
          })),
        }
        : {}),
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    assertEquals(pending.schedule1.line3_schedule_c, 0);
    assertEquals(pending.form6251.line2p_long_term_contracts, entry.adjustment);
    assertEquals(pending.form6251.amti, 200000 + entry.adjustment);
    assertEquals(pending.f1040.line11_agi, 200000);
    assertEquals(pending.f1040.line16_income_tax, entry.regularTax);
    assertEquals(
      pending.schedule2.line2_amt,
      entry.totalTax - entry.regularTax,
    );
    assertEquals(pending.f1040.line24_total_tax, entry.totalTax);
    assertEquals(pending.f1040.line37_amount_owed, entry.totalTax - 35000);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const root = (() => {
      try {
        return Deno.env.get("FORM6251_CONTRACT_INVENTORY_DIR");
      } catch (error) {
        if (error instanceof Deno.errors.NotCapable) return undefined;
        throw error;
      }
    })();
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            filer,
            origins,
            carryforwards: result.carryforwards,
            expected: {
              adjustment: entry.adjustment,
              regularTax: entry.regularTax,
              totalTax: entry.totalTax,
            },
            sourceAuthenticityVerified: false,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      for (const source of inputs.f1098 ?? []) {
        assertExists(source.issuer_copy);
        await Deno.writeFile(
          `${root}/${entry.id}-source-1098.pdf`,
          source.issuer_copy.bytes,
        );
      }
    }
    const first = inputs.schedule_c[0];
    const papers = first.amt_long_term_contract_workpapers ??
      [first.amt_long_term_contract_workpaper!];
    const plural = {
      ...first,
      amt_long_term_contract_workpaper: undefined,
      amt_long_term_contract_workpapers: papers,
    };
    const changes = [
      { ...plural, amt_long_term_contract_workpapers: papers.slice(1) },
      { ...plural, amt_long_term_contract_workpaper: papers[0] },
      { ...plural, amt_long_term_contract_workpapers: [...papers, papers[0]] },
      {
        ...plural,
        amt_long_term_contract_workpapers: papers.map((p, i) =>
          i ? p : { ...p, fixed_contract_price: p.fixed_contract_price + 1000 }
        ),
      },
      {
        ...plural,
        amt_long_term_contract_workpapers: papers.map((p, i) =>
          i ? p : { ...p, cost_records_reference: p.signed_contract_reference }
        ),
      },
      { ...plural, line_1_gross_receipts: 1 },
    ];
    for (const [index, changed] of changes.entries()) {
      const businesses = [changed, ...inputs.schedule_c.slice(1)];
      const altered = f1040_2025.executeReturn({
        ...inputs,
        schedule_c: businesses,
      });
      if (
        [1, 2, 4, 5].includes(index) || (index === 0 && papers.length === 1)
      ) {
        assert(
          altered.diagnostics.length > 0,
          `invalid contract source ${index}`,
        );
      }
      const mutated = {
        ...pending,
        schedule_c: { ...pending.schedule_c, schedule_cs: businesses },
      };
      await assertRejects(
        () => f1040_2025.prepareReturn(mutated, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(mutated, filer), Error);
    }
    for (
      const mutated of [
        {
          ...pending,
          form6251: {
            ...pending.form6251,
            line2p_long_term_contracts: entry.adjustment + 1,
          },
        },
        {
          ...pending,
          f1040: {
            ...pending.f1040,
            line17_additional_taxes: entry.totalTax - entry.regularTax + 1,
          },
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
