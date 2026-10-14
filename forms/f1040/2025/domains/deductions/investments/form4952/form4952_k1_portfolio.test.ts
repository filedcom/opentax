import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import {
  k1PortfolioCases,
  k1PortfolioInputs,
} from "./form4952_k1_portfolio.fixture.ts";
for (const entry of k1PortfolioCases) {
  Deno.test(`K-1 code H joins the complete interest and dividend portfolio: ${entry.id}`, async () => {
    const inputs = await k1PortfolioInputs(entry);
    const wages = entry.joint ? 200000 : 160000;
    const mortgage = inputs.f1098[0];
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const interest = entry.bank + entry.treasury + entry.oid;
    assertEquals(pending.form4952.line1, entry.paid);
    assertEquals(pending.form4952.line4a, interest + entry.div);
    assertEquals(pending.form4952.line4b, entry.qualified);
    assertEquals(pending.form4952.line8, entry.allowed);
    assertEquals(pending.form4952.line7, entry.paid - entry.allowed);
    assertEquals(
      result.carryforwards.investment_interest_excess_4952 ?? 0,
      entry.paid - entry.allowed,
    );
    assertEquals(
      result.carryforwards.amt_investment_interest_excess_4952 ?? 0,
      entry.paid - entry.allowed,
    );
    assertEquals(pending.schedule_a.line_9_investment_interest, entry.allowed);
    assertEquals(
      pending.f1040.line12e_itemized_deductions,
      40000 + entry.allowed,
    );
    assertEquals(pending.f1040.line11_agi, wages + interest + entry.div);
    assertEquals(pending.f1040.line24_total_tax, entry.tax);
    assertEquals(pending.f1040.line35a_refund, 30000 - entry.tax);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const root = Deno.env.get("OPENTAX_K1_PORTFOLIO_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      await Deno.writeFile(
        `${root}/${entry.id}-source.pdf`,
        mortgage.issuer_copy.bytes,
      );
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            filer,
            expected: { ...entry, wages, interest },
            origins,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
    const changes = [
      {
        ...pending,
        form4952: { ...pending.form4952, line8: entry.allowed + 1 },
      },
      {
        ...pending,
        form4952: { ...pending.form4952, line4b: entry.qualified + 1 },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line2b_taxable_interest: interest + 1 },
      },
      {
        ...pending,
        f1040: {
          ...pending.f1040,
          line3a_qualified_dividends: entry.qualified + 1,
        },
      },
      {
        ...pending,
        schedule_a: {
          ...pending.schedule_a,
          line_9_investment_interest: entry.allowed + 1,
        },
      },
      {
        ...pending,
        k1_partnership: {
          k1_partnerships: inputs.k1_partnership.map((row, i) =>
            i ? { ...row, recipient_tin: "999887777" } : row
          ),
        },
      },
      {
        ...pending,
        f1099int: {
          f1099ints: inputs.f1099int.map((row, i) =>
            i ? { ...row, recipient_tin: "999887777" } : row
          ),
        },
      },
      {
        ...pending,
        f1099oid: {
          f1099oids: inputs.f1099oid.map((row) => ({
            ...row,
            box1_oid: entry.oid + 1,
          })),
        },
      },
      {
        ...pending,
        f1099div: {
          f1099divs: inputs.f1099div.map((row, i) =>
            i ? { ...row, source_document_reference: "bank" } : row
          ),
        },
      },
      {
        ...pending,
        f1099int: {
          f1099ints: inputs.f1099int.map((row) => ({
            ...row,
            box6: 10,
            box7: "Canada",
          })),
        },
      },
    ];
    for (const changed of changes) {
      await assertRejects(
        () => f1040_2025.prepareReturn(changed, filer),
        Error,
      );
      await assertRejects(
        () => buildPdfBytes(changed, filer, ".pdf-cache", prepared.bundle),
        Error,
      );
    }
    for (
      const bad of [
        {
          ...inputs,
          f1099int: inputs.f1099int.map((row) => ({
            ...row,
            investment_property_for_form4952: false,
          })),
        },
        {
          ...inputs,
          f1099div: inputs.f1099div.map((row) => ({
            ...row,
            recipient_tin: "999887777",
          })),
        },
        {
          ...inputs,
          k1_partnership: inputs.k1_partnership.map((row) => ({
            ...row,
            source_document_reference: "duplicate",
          })),
        },
      ]
    ) {
      await assertRejects(async () => {
        const changed = f1040_2025.executeReturn(bad);
        if (changed.diagnostics.length) throw new Error("Rejected source");
        await f1040_2025.prepareReturn(changed.pending, filer);
      }, Error);
    }
  });
}
