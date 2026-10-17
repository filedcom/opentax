import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { sstbZeroCases } from "./form8995a_sstb_zero_fixture.ts";
import {
  sstbZeroExpected,
  sstbZeroExpectedNiit,
} from "./form8995a_sstb_zero_expected.ts";
import {
  sstbServiceZeroFixture,
  sstbServiceZeroSources,
} from "./form8995a_sstb_service_zero_fixture.ts";

// Persisted pending data are an untrusted boundary, so mutations deliberately
// bypass input types and change every retained copy of the source together.
type Row = Record<string, any>;

for (const endpoint of sstbZeroCases) {
  test(`SSTB service zero ${endpoint.name}: all reviewed source classifications`, async () => {
    assertEquals(sstbServiceZeroSources.length, 39);
    assertEquals(new Set(sstbServiceZeroSources.map((s) => s.name)).size, 39);
    const root = process.env.SSTB_SERVICE_ZERO_EVIDENCE;
    const dir = root ? `${root}/${endpoint.name}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      for (const source of sstbServiceZeroSources) {
        const label = `${endpoint.name}/${source.name}`;
        const input = sstbServiceZeroFixture(source, endpoint);
        const result = f1040_2025.executeReturn(input);
        assertEquals(result.diagnostics, [], label);
        const f = result.pending.f1040;
        const actual = [
          f.line13_qbi_deduction,
          f.line15_taxable_income,
          f.line16_income_tax,
          Math.round(Number(f.line24_total_tax)),
          f.line35a_refund ?? f.line37_amount_owed,
        ];
        const delta = actual.map((v, i) =>
          Number(v) - sstbZeroExpected[endpoint.name][i]
        );
        assertEquals(delta, [0, 0, 0, 0, 0], label);
        assertEquals(
          Math.round(Number(result.pending.form8960?.line17_niit ?? 0)),
          sstbZeroExpectedNiit[endpoint.name],
          label,
        );
        const filer = extractFilerIdentity(f)!;
        const prepared = await f1040_2025.prepareReturn(result.pending, filer);
        const pending: Row = prepared.bundle.pending;
        const original = input.schedule_c[0];
        const classification =
          original.qbi_sstb_filing_review.service_classification_review;
        assertEquals(
          pending.schedule_c.schedule_cs[0].qbi_sstb_filing_review
            .service_classification_review,
          classification,
          label,
        );
        for (const key of ["form8995a", "form8995a_schedule_a"]) {
          const retained = pending[key].single_sstb_schedule_c_source.business
            .source_schedule_c;
          assertEquals(
            retained.qbi_sstb_filing_review.service_classification_review,
            classification,
            label,
          );
          assertEquals(
            retained.qbi_sstb_filing_review.owner_ssn,
            original.qbi_sstb_filing_review.owner_ssn,
            label,
          );
        }
        assert(
          prepared.bundle.xml.includes(
            `<PrincipalBusinessActivityCd>${original.line_b_business_code}</PrincipalBusinessActivityCd>`,
          ),
          label,
        );
        assert(
          prepared.bundle.xml.includes(
            "<QualifiedBusinessIncomeDedAmt>0</QualifiedBusinessIncomeDedAmt>",
          ),
          label,
        );
        const file = `${dir}/${source.name}`;
        await fs.writeFile(`${file}.xml`, prepared.bundle.xml);
        await fs.writeFile(
          `${file}.json`,
          JSON.stringify(
            { input, filer, pending, independentTaxDelta: delta },
            null,
            2,
          ),
        );
        const xsd = await new sys.Command("xmllint", {
          args: [
            "--noout",
            "--schema",
            new URL(
              "../../../../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
              import.meta.url,
            ).pathname,
            `${file}.xml`,
          ],
          stdout: "piped",
          stderr: "piped",
        }).output();
        await fs.writeFile(`${file}.xsd.log`, xsd.stderr);
        assertEquals(
          xsd.code,
          0,
          `${label}: ${new TextDecoder().decode(xsd.stderr)}`,
        );

        const mutations = [
          "missing-classification",
          "receipt-total",
          "excluded-activity",
          "mixed-accounting",
          ...(classification.field === "financial_services"
            ? ["financial-kind"]
            : []),
          ...(classification.professional_role ? ["wrong-role"] : []),
          ...(classification.field === "reputation_or_skill"
            ? ["identity-owner", "identity-kind"]
            : []),
        ];
        for (const kind of mutations) {
          const changed = structuredClone(pending);
          const business = changed.schedule_c.schedule_cs[0];
          const review = business.qbi_sstb_filing_review;
          const service = review.service_classification_review;
          if (kind === "missing-classification") {
            delete review.service_classification_review;
          }
          if (kind === "receipt-total") service.revenue_records[0].amount++;
          if (kind === "excluded-activity") {
            service[Object.keys(service).find((k) => k.startsWith("no_"))!] =
              false;
          }
          if (kind === "mixed-accounting") {
            review.accounting_sstb_confirmed = true;
          }
          if (kind === "financial-kind") {
            service.service_kind = service.service_kind === "financial_advice"
              ? "loan_arrangement"
              : "financial_advice";
          }
          if (kind === "wrong-role") {
            service.professional_role = "facility_operator";
          }
          if (kind === "identity-owner") service.individual_ssn = "999001234";
          if (kind === "identity-kind") {
            service.income_kind = "ordinary_product_sales";
          }
          for (const key of ["form8995a", "form8995a_schedule_a"]) {
            changed[key].single_sstb_schedule_c_source.business
              .source_schedule_c = structuredClone(business);
          }
          await assertRejects(
            () => f1040_2025.prepareReturn(changed, filer),
            Error,
            "",
            `${label}/${kind}/native`,
          );
          // Rejections occur before PDF authoring; this is a source-guard audit,
          // not a new filled-PDF review or a complete-packet count.
          await assertRejects(
            () => buildPdfBytes(changed, filer, ".pdf-cache"),
            Error,
            "",
            `${label}/${kind}/pdf`,
          );
        }
        await fs.writeFile(
          `${file}.checks.json`,
          JSON.stringify(
            {
              label,
              xsdPasses: 1,
              nativeRejections: mutations.length,
              pdfRejections: mutations.length,
              independentTaxDelta: delta,
            },
            null,
            2,
          ),
        );
      }
    } finally {
      if (!root) await sys.remove(dir, { recursive: true });
    }
  });
}
