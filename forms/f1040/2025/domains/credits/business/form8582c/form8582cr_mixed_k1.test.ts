import { assertEquals, assertRejects } from "@std/assert";
import {
  mixedCreditCases,
  mixedCreditFixture,
} from "./form8582cr_mixed_k1.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { buildCurrentYearCarryforwardLedger } from "../../../../../nodes/intermediate/forms/credits/business/form8582cr/carryforward-ledger.ts";
import { inputSchema as form8582crInputSchema } from "../../../../../nodes/intermediate/forms/credits/business/form8582cr/index.ts";
import { preparedSourceSha256 } from "../../../../return-processing/prepared-source.ts";

for (const c of mixedCreditCases) {
  Deno.test(`Mixed passive/nonpassive K-1 credit inventory: ${c.id}`, async () => {
    const { id, input, expected } = mixedCreditFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const filer = extractFilerIdentity(result.pending.f1040);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const pending = prepared.bundle.pending;
    const ledger = buildCurrentYearCarryforwardLedger(
      form8582crInputSchema.parse(pending.form8582cr),
    );
    assertEquals(ledger.total_credit, expected.total);
    assertEquals(ledger.allowed_credit, expected.allowed);
    assertEquals(ledger.unallowed_credit, expected.unused);
    assertEquals(pending.f1040?.line24_total_tax, expected.tax);
    assertEquals(
      pending.f1040?.line20_nonrefundable_credits,
      expected.totalAllowed,
    );
    assertEquals(pending.schedule1?.line5_schedule_e, 20000);
    assertEquals(pending.f1040?.line16_income_tax, 17867);
    const count = input.form8582cr.credit_sources.length + c.nonpassiveCount;
    assertEquals(
      [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
      count,
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
      8 + Math.ceil(count / 15),
    );
    const nonpassive = (p: any) =>
      p.k1_partnership.k1_partnerships.find((k: any) =>
        k.new_markets_credit_subject_to_passive_activity_limit === false
      );
    const mutations: Array<(p: any) => void> = [
      (p) => nonpassive(p).recipient_tin = "999887777",
      (p) => nonpassive(p).partnership_ein = "999887777",
      (p) => nonpassive(p).source_document_reference = "Wrong issued K-1",
      (p) => nonpassive(p).box15_code_ad_new_markets_credit++,
      (p) =>
        nonpassive(p).new_markets_credit_subject_to_passive_activity_limit =
          true,
      (p) =>
        delete nonpassive(p)
          .new_markets_credit_subject_to_passive_activity_limit,
      (p) => nonpassive(p).box1_ordinary_business = 100,
      (p) => p.f3800.f8874_k1_credit_entries.pop(),
      (p) =>
        p.f3800.f8874_k1_credit_entries.push({
          ...p.f3800.f8874_k1_credit_entries[0],
        }),
      (p) => p.f3800.f8874_k1_credit_entries[0].credit_amount++,
      (p) =>
        p.f3800.f8874_k1_credit_entries[0].subject_to_passive_activity_limit =
          true,
      (p) => p.form8582cr.credit_sources[0].current_year_credit++,
      (p) => p.form8582cr.line6_ordinary_worksheet.tax_without_passive++,
      (p) => p.f3800.allowed_credit++,
      (p) => p.f1040.line20_nonrefundable_credits++,
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source.activities[0]
          .current_income++,
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
      root = Deno.env.get("FORM8582CR_MIXED_K1_EVIDENCE");
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
            pdfSupported: true,
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
