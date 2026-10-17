import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import type { MefFormsPending } from "../../../../mef/types.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import type { sstbServiceFixture } from "./form8995a_sstb_services_fixture.ts";
// Mutations deliberately cross the untrusted saved-data boundary.
type Row = Record<string, any>;
// Independently reconciled investment cases retain their amounts for each reviewed field.
const expected: Record<string, number[]> = {
  "hoh-owner-only": [
    1561,
    219364,
    44959,
    46293,
    3707,
  ],
  "mfs-payroll": [
    1934,
    226866,
    49099,
    51108,
    1108,
  ],
  "primary-capped-owner-only": [
    2872,
    420178,
    88022,
    90796,
    40796,
  ],
  "primary-partial-payroll": [
    3811,
    417611,
    87201,
    93231,
    43231,
  ],
  "qss-payroll": [
    3711,
    209339,
    35652,
    36739,
    13261,
  ],
  "single-income-cap": [
    2474,
    211698,
    25490,
    30644,
    30644,
  ],
  "single-payroll": [
    1934,
    226866,
    49099,
    50433,
    433,
  ],
  "spouse-capped-payroll": [
    3890,
    419160,
    87696,
    90470,
    40470,
  ],
  "spouse-partial-owner-only": [
    2830,
    418592,
    87514,
    93544,
    43544,
  ],
};

const mutations = [
  "wrong-code",
  "wrong-description",
  "receipt-total",
  "duplicate-invoice",
  "missing-engagement",
  "excluded-activity",
  "mixed-accounting",
  "missing-classification",
  "other-income",
  "returns-allowances",
] as const;
function alter(
  business: Row,
  kind:
    | typeof mutations[number]
    | "financial-kind"
    | "wrong-role"
    | "identity-owner"
    | "identity-kind",
) {
  const review = business.qbi_sstb_filing_review;
  const service = review.service_classification_review;
  if (kind === "identity-owner") service.individual_ssn = "999001234";
  if (kind === "identity-kind") service.income_kind = "ordinary_product_sales";
  if (kind === "wrong-role") service.professional_role = "facility_operator";
  if (kind === "financial-kind") {
    service.service_kind = service.service_kind === "financial_advice"
      ? "loan_arrangement"
      : "financial_advice";
  }
  if (kind === "wrong-code") business.line_b_business_code = "541330";
  if (kind === "wrong-description") {
    review.business_activity_description = "Different activity";
  }
  if (kind === "receipt-total") service.revenue_records[0].amount++;
  if (kind === "duplicate-invoice") {
    service.revenue_records[1].invoice_reference =
      service.revenue_records[0].invoice_reference;
  }
  if (kind === "missing-engagement") service.engagement_records_reference = "";
  if (kind === "excluded-activity") {
    const key = Object.keys(service).find((k) => k.startsWith("no_"))!;
    service[key] = false;
  }
  if (kind === "mixed-accounting") review.accounting_sstb_confirmed = true;
  if (kind === "missing-classification") {
    delete review.service_classification_review;
  }
  if (kind === "other-income") business.line_6_other_income = 100;
  if (kind === "returns-allowances") business.line_2_returns_allowances = 100;
}
export function registerSstbServiceCases<
  T extends { name: string; code: string; base: string },
>(
  cases: readonly T[],
  fixture: (c: T) => ReturnType<typeof sstbServiceFixture>,
  evidenceVariable: string,
) {
  for (const c of cases) {
    test(`SSTB ${c.name}: reviewed service revenue through complete native and PDF return`, async () => {
      const input = fixture(c);
      const result = f1040_2025.executeReturn(input);
      assertEquals(result.diagnostics, []);
      const f = result.pending.f1040;
      assertEquals([
        f.line13_qbi_deduction,
        f.line15_taxable_income,
        f.line16_income_tax,
        Math.round(Number(f.line24_total_tax)),
        f.line35a_refund ?? f.line37_amount_owed,
      ], expected[c.base]);
      const filer = extractFilerIdentity(f)!;
      const prepared = await f1040_2025.prepareReturn(result.pending, filer);
      const pending: Row = prepared.bundle.pending;
      const root = process.env[evidenceVariable];
      const dir = root ? `${root}/${c.name}` : await sys.makeTempDir();
      await fs.mkdir(dir, { recursive: true });
      try {
        await fs.writeFile(
          `${dir}/source.json`,
          JSON.stringify({ input, filer, pending }, null, 2),
        );
        await fs.writeFile(`${dir}/return.xml`, prepared.bundle.xml);
        const origins: Parameters<typeof buildPdfBytes>[4] = [];
        await fs.writeFile(
          `${dir}/return.pdf`,
          await buildPdfBytes(
            pending,
            filer,
            ".pdf-cache",
            prepared.bundle,
            origins,
          ),
        );
        await fs.writeFile(
          `${dir}/origins.json`,
          JSON.stringify(origins, null, 2),
        );
        assert(
          prepared.bundle.xml.includes(
            `<PrincipalBusinessActivityCd>${c.code}</PrincipalBusinessActivityCd>`,
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
            `${dir}/return.xml`,
          ],
          stdout: "piped",
          stderr: "piped",
        }).output();
        await fs.writeFile(`${dir}/xsd.log`, xsd.stderr);
        assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
        const publicOutcomes: {
          kind: string;
          stage: string;
          diagnostics?: unknown;
        }[] = [];
        const caseMutations: Parameters<typeof alter>[1][] =
          input.schedule_c[0].qbi_sstb_filing_review
              .service_classification_review.field === "financial_services"
            ? [...mutations, "financial-kind" as const]
            : [
              ...mutations,
              ...(input.schedule_c[0].qbi_sstb_filing_review
                  .service_classification_review.field === "reputation_or_skill"
                ? ["identity-owner" as const, "identity-kind" as const]
                : []),
              ...(input.schedule_c[0].qbi_sstb_filing_review
                  .service_classification_review.professional_role
                ? ["wrong-role" as const]
                : []),
            ];
        for (const kind of caseMutations) {
          const changed: Row = structuredClone(pending);
          const business = changed.schedule_c.schedule_cs[0];
          alter(business, kind);
          // Mirror the altered source everywhere, so independent reconciliation is exercised.
          for (const key of ["form8995a", "form8995a_schedule_a"]) {
            changed[key].single_sstb_schedule_c_source.business
              .source_schedule_c = structuredClone(business);
          }
          await assertRejects(() =>
            buildMefBundle(changed as MefFormsPending, {
              filer,
              year: 2025,
              returnType: "1040",
              schemaVersion: "2025v5.4",
              attachments: [],
            })
          );
          await assertRejects(() =>
            buildPdfBytes(changed, filer, ".pdf-cache")
          );
          const publicInput = fixture(c);
          alter(publicInput.schedule_c[0], kind);
          let invalid;
          try {
            invalid = f1040_2025.executeReturn(publicInput);
          } catch {
            publicOutcomes.push({ kind, stage: "source-schema-rejected" });
            continue;
          }
          assert(
            invalid.diagnostics.some((d) => d.severity === "error"),
            `${kind}: public source must report an error`,
          );
          try {
            const invalidPrepared = await f1040_2025.prepareReturn(
              invalid.pending,
              filer,
            );
            // Existing deferred161: callers must not prepare a graph with errors.
            // Preserve this outcome; do not count it as an export rejection.
            publicOutcomes.push({
              kind,
              stage: "deferred161-prepared-after-graph-error",
              diagnostics: invalid.diagnostics,
            });
            if (root) {
              await fs.writeFile(
                `${dir}/deferred161-${kind}.xml`,
                invalidPrepared.bundle.xml,
              );
            }
          } catch {
            publicOutcomes.push({
              kind,
              stage: "prepare-rejected-after-graph-error",
            });
          }
        }
        if (root) {
          await fs.writeFile(
            `${dir}/public-outcomes.json`,
            JSON.stringify(publicOutcomes, null, 2),
          );
        }
        assertEquals(publicOutcomes.length, caseMutations.length);
        assertEquals(
          publicOutcomes.filter((o) =>
            o.stage === "deferred161-prepared-after-graph-error"
          ).map((o) => o.kind),
          [
            "wrong-code",
            "wrong-description",
            "receipt-total",
            "duplicate-invoice",
            "other-income",
            "returns-allowances",
            ...(caseMutations.includes("identity-owner")
              ? ["identity-owner"]
              : []),
            ...(caseMutations.includes("financial-kind")
              ? ["financial-kind"]
              : []),
          ],
        );
      } finally {
        if (!root) await sys.remove(dir, { recursive: true });
      }
    });
  }
}
