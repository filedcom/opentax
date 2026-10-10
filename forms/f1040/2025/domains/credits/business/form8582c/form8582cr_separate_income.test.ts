// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "@std/assert";
import {
  separateIncomeCases,
  separateIncomeFixture,
} from "./form8582cr_separate_income.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { buildCurrentYearCarryforwardLedger } from "../../../../../nodes/intermediate/forms/credits/business/form8582cr/carryforward-ledger.ts";
import { inputSchema as form8582crInputSchema } from "../../../../../nodes/intermediate/forms/credits/business/form8582cr/index.ts";
import { preparedSourceSha256 } from "../../../../return-processing/prepared-source.ts";
import { scheduleEPdf } from "../../../../pdf/forms/income/rental-passthrough/schedule_e.ts";

for (const c of separateIncomeCases) {
  Deno.test(`Separate K-1 rental income and credit inventory: ${c.id}`, async () => {
    const { id, input, expected } = separateIncomeFixture(c);
    const count = input.form8582cr.credit_sources.length;
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const filer = extractFilerIdentity(result.pending.f1040);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const pending = prepared.bundle.pending;
    const ledger = buildCurrentYearCarryforwardLedger(
      form8582crInputSchema.parse(pending.form8582cr),
    );
    assertEquals(ledger.rows.length, count);
    assertEquals(ledger.total_credit, expected.total);
    assertEquals(ledger.allowed_credit, expected.allowed);
    assertEquals(ledger.unallowed_credit, expected.unused);
    assertEquals(pending.f1040?.line24_total_tax, expected.tax);
    assertEquals(pending.f1040?.line20_nonrefundable_credits, expected.allowed);
    assertEquals(
      prepared.bundle.form3800Parts?.passiveCurrentDetails.length,
      count,
    );
    assertEquals(
      [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
      count > 1 ? count : 0,
    );
    assertEquals(
      prepared.bundle.xml.includes(
        "<PriorYearsLossesInd>false</PriorYearsLossesInd>",
      ),
      true,
    );
    assertEquals(
      scheduleEPdf.projectFields?.(
        pending.schedule_e ?? {},
        pending as unknown as Record<string, Record<string, unknown>>,
      )
        ?.k1_prior_year_losses,
      false,
    );
    const origins: PdfPageOrigin[] = [];
    const pdfSupported = true;
    let pdf: Uint8Array | undefined;
    if (pdfSupported) {
      pdf = await buildPdfBytes(
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
    } else {
      await assertRejects(
        () => buildPdfBytes(pending, filer, ".pdf-cache", prepared.bundle),
        Error,
        "Schedule E PDF Part II needs up to four sourced K-1 rows",
      );
    }
    assertEquals(pending.schedule1?.line5_schedule_e, 20000);
    assertEquals(pending.f1040?.line16_income_tax, 17867);
    const mutations: Array<(p: any) => void> = [
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source
          .issued_k1_reference = "Missing issued K-1",
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source
          .participation_workpaper_reference = "Different participation record",
      (p) => p.k1_partnership.k1_partnerships[0].box2_rental_re++,
      (p) =>
        p.form8582cr.line6_ordinary_worksheet.passive_income_sources[0].tsj =
          "S",
      (p) =>
        p.form8582cr.line6_ordinary_worksheet.passive_income_sources[0]
          .passive_income_source_document_reference =
            "Different activity statement",
      (p) =>
        p.form8582cr.line6_ordinary_worksheet.passive_income_sources[0]
          .activity_id = "Unclaimed activity",
      (p) => delete p.k1_partnership.k1_partnerships[0].passive_income_source,
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source
          .recipient_tin = "999887777",
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source.issuer_ein =
          "999887777",
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source.activities[0]
          .current_income++,
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source
          .entity_status_record.publicly_traded_partnership = true,
      (p) =>
        p.k1_partnership.k1_partnerships[0].eic_passive_activity_review.box2 =
          "nonpassive",
      (p) => p.form8582cr.line6_ordinary_worksheet.passive_income_sources.pop(),
      (p) =>
        p.form8582cr.line6_ordinary_worksheet.passive_income_sources[0]
          .source_origin.ein = "999887777",
      (p) =>
        p.form8582cr.line6_ordinary_worksheet.passive_income_sources[0]
          .net_passive_income++,
      (p) => p.form8582cr.line6_ordinary_worksheet.tax_without_passive++,
      (p) => p.form8582cr.credit_sources[0].current_year_credit++,
      (p) => p.f1040.line20_nonrefundable_credits++,
    ];
    const incomeOnlyKey = c.incomeOnly === "partnership"
      ? "k1_partnership"
      : "k1_s_corp";
    const incomeOnlyRows = c.incomeOnly === "partnership"
      ? "k1_partnerships"
      : "k1_s_corps";
    const creditKey = c.incomeOnly === "partnership"
      ? "box15_code_ad_new_markets_credit"
      : "box13_code_ad_new_markets_credit";
    mutations.push(
      (p) => p[incomeOnlyKey][incomeOnlyRows][0][creditKey] = 100,
      (p) =>
        p[incomeOnlyKey][incomeOnlyRows][0]
          .new_markets_credit_subject_to_passive_activity_limit = true,
      (p) => p[incomeOnlyKey][incomeOnlyRows][0].box1_ordinary_business = 100,
      (p) => p[incomeOnlyKey][incomeOnlyRows].pop(),
    );
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate(changed);
      await assertRejects(() => f1040_2025.prepareReturn(changed, filer));
      if (!pdfSupported) continue;
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
      root = Deno.env.get("FORM8582CR_SEPARATE_INCOME_EVIDENCE");
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
            pdfRejections: pdfSupported ? mutations.length : 0,
            pdfSupported,
            pdfBlock: pdfSupported
              ? undefined
              : "Schedule E Part II exceeds four sourced K-1 rows",
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${root}/${id}.xml`, prepared.bundle.xml);
      if (pdf) await Deno.writeFile(`${root}/${id}.pdf`, pdf);
    }
  });
}
