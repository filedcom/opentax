import { assertEquals, assertRejects } from "@std/assert";
import {
  passiveInventoryCases,
  passiveInventoryFixture,
} from "./form8582cr_overflow.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { buildCurrentYearCarryforwardLedger } from "../../../../../nodes/intermediate/forms/credits/business/form8582cr/carryforward-ledger.ts";
import { inputSchema as form8582crInputSchema } from "../../../../../nodes/intermediate/forms/credits/business/form8582cr/index.ts";
import { preparedSourceSha256 } from "../../../../return-processing/prepared-source.ts";

for (const c of passiveInventoryCases) {
  Deno.test(`Complete passive credit inventory and continuations: ${c.count}`, async () => {
    const { id, input, expected } = passiveInventoryFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const filer = extractFilerIdentity(result.pending.f1040);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const pending = prepared.bundle.pending;
    const ledger = buildCurrentYearCarryforwardLedger(
      form8582crInputSchema.parse(pending.form8582cr),
    );
    assertEquals(ledger.rows.length, c.count);
    assertEquals(ledger.total_credit, expected.total);
    assertEquals(ledger.allowed_credit, expected.allowed);
    assertEquals(ledger.unallowed_credit, expected.unused);
    assertEquals(pending.f1040?.line24_total_tax, expected.tax);
    assertEquals(pending.f1040?.line20_nonrefundable_credits, expected.allowed);
    assertEquals(
      prepared.bundle.form3800Parts?.passiveCurrentDetails.length,
      c.count,
    );
    assertEquals(
      [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
      c.count,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(
      origins.filter((o) => o.formKey === "f3800").length,
      8 + Math.ceil(c.count / 15),
    );
    const mutations: Array<(p: any) => void> = [
      (p) =>
        p.k1_partnership.k1_partnerships.at(-1).recipient_tin = "999887777",
      (p) => p.k1_s_corp.k1_s_corps.at(-1).box13_code_ad_new_markets_credit++,
      (p) => p.k1_partnership.k1_partnerships.pop(),
      (p) => p.form8582cr.credit_sources.at(-1).current_year_credit++,
      (p) =>
        p.form8582cr.credit_sources.at(-1).source_document_reference =
          "Missing source",
      (p) => p.form8582cr.line6_ordinary_worksheet.tax_without_passive++,
      (p) => p.schedule_e.schedule_es[0].rent_income++,
      (p) => p.f1040.line20_nonrefundable_credits++,
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate(changed);
      await assertRejects(() => f1040_2025.prepareReturn(changed, filer));
      const sourceSha256 = await preparedSourceSha256(changed, filer);
      await assertRejects(() =>
        buildPdfBytes(changed, filer, ".pdf-cache", {
          ...prepared.bundle,
          pending: changed,
          sourceSha256,
        })
      );
    }
    let root: string | undefined;
    try {
      root = Deno.env.get("FORM8582CR_OVERFLOW_EVIDENCE");
    } catch { /* Optional local evidence. */ }
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${id}.json`,
        JSON.stringify(
          {
            input,
            pending,
            expected,
            ledger,
            origins,
            nativeRejections: mutations.length,
            pdfRejections: mutations.length,
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${root}/${id}.xml`, prepared.bundle.xml);
      await Deno.writeFile(`${root}/${id}.pdf`, pdf);
    }
  });
}
