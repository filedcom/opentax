import {
  assertEquals,
  assertExists,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { inputSchema } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/index.ts";
import { distributionLtcPackets } from "./form8853_distribution_ltc.fixture.ts";

// Independent 2025 tax-computation worksheet amounts plus MSA additional taxes.
const expectedTax: { [key: string]: number } = {
  "archer-cents": 39503,
  "archer-all-medical": 37067,
  "archer-age65": 40043,
  "archer-disability": 40523,
  "archer-death-beneficiary": 39803,
  "medicare-new-account": 41803,
  "medicare-prior-account": 42351,
  "medicare-partial-disability": 41371,
  "medicare-spouse-ltc-primary": 31406,
  "medicare-death-beneficiary": 39803,
  "joint-medicare-prior-and-ltc-payees": 37227,
  "joint-medicare-cents-ltc-spouse": 29822,
  "joint-medicare-all-medical": 26898,
  "joint-medicare-partial-disability": 33486,
};
function evidenceRoot() {
  try {
    return Deno.env.get("FORM8853_DISTRIBUTION_LTC_DIR");
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}
for (const entry of distributionLtcPackets) {
  Deno.test(`Form8853 distribution/LTC complete packet: ${entry.id}`, async () => {
    const result = f1040_2025.executeReturn(entry.inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const income = entry.msaIncome + entry.ltcIncome;
    assertEquals(pending.schedule1.line8e_archer_msa_dist ?? 0, income);
    assertEquals(pending.f1040.line8_additional_income ?? 0, income);
    assertEquals(pending.f1040.line11_agi, 200000 + income);
    assertEquals(
      pending.f1040.line15_taxable_income,
      200000 + income - (entry.joint ? 31500 : entry.senior ? 17750 : 15750),
    );
    assertEquals(pending.f1040.line23_other_taxes ?? 0, entry.additionalTax);
    assertEquals(
      Math.round(Number(pending.f1040.line24_total_tax)),
      expectedTax[entry.id],
    );
    assertEquals(
      Math.round(Number(pending.f1040.line35a_refund)),
      45000 - expectedTax[entry.id],
    );
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const xml = prepared.bundle.xml;
    assertEquals(xml.match(/<IRS8853 documentId=/g)?.length, 1);
    assertEquals(xml.match(/<SectCLTCInsuranceCntrctGrp>/g)?.length, 1);
    assertStringIncludes(
      xml,
      `<LTCTaxablePaymentsAmt>${entry.ltcIncome}</LTCTaxablePaymentsAmt>`,
    );
    const archer = !!entry.source.archer_distribution_ledger;
    const joint = !!entry.source.medicare_joint_distribution_ledgers;
    const body = /<IRS8853\b[^>]*>(.*?)<\/IRS8853>/.exec(xml)?.[1];
    assertExists(body);
    assertStringIncludes(
      body,
      archer
        ? `<TaxableArcherMSADistriAmt>${entry.msaIncome}</TaxableArcherMSADistriAmt>`
        : `<TaxableMedicareMSADistriAmt>${entry.msaIncome}</TaxableMedicareMSADistriAmt>`,
    );
    for (
      const tag of [
        "PrimaryTaxpayerMedicareMSAStmt",
        "SpouseTaxpayerMedicareMSAStmt",
      ]
    ) {
      assertEquals(
        (xml.match(new RegExp(`<${tag} documentId=`, "g")) ?? []).length,
        joint ? 1 : 0,
      );
    }
    assertEquals(
      (xml.match(/<MultiplePayeesStatement documentId=/g) ?? []).length,
      entry.ltcMultiple ? 1 : 0,
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
      origins.filter((p) => p.formKey === "form8853").length,
      (joint ? 4 : 2) + (entry.ltcMultiple ? 1 : 0),
    );
    const key = archer
      ? "archer_distribution_ledger"
      : joint
      ? "medicare_joint_distribution_ledgers"
      : "medicare_distribution_ledger";
    const mutations: Array<(p: typeof pending) => void> = [
      (p) => {
        p.schedule1.line8e_archer_msa_dist = income + 1;
      },
      (p) => {
        p.schedule2 = {
          ...p.schedule2,
          line17e_archer_msa_tax: (archer ? entry.additionalTax : 0) + 1,
        };
      },
      (p) => {
        p.schedule2 = {
          ...p.schedule2,
          line17f_medicare_advantage_msa_tax:
            (archer ? 0 : entry.additionalTax) + 1,
        };
      },
      (p) => {
        p.f1040.line8_additional_income = income + 1;
      },
      (p) => {
        p.f1040.line23_other_taxes = entry.additionalTax + 1;
      },
      (p) => {
        delete p.form8853;
      },
      (p) => {
        delete p.form8853.ltc_ledger;
      },
      (p) => {
        delete p.form8853[key];
      },
      (p) => {
        delete p.schedule1.ltc_source_ledger;
      },
      (p) => {
        delete p.schedule1[`ltc_${key}`];
      },
      (p) => {
        const source = inputSchema.parse(p.form8853);
        const ledgers = source.archer_distribution_ledger
          ? [source.archer_distribution_ledger]
          : source.medicare_distribution_ledger
          ? [source.medicare_distribution_ledger]
          : source.medicare_joint_distribution_ledgers!;
        ledgers[0].ltc_activity_review!.source_reference += " changed";
        p.form8853 = source;
      },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate(changed);
      await assertRejects(
        () => f1040_2025.prepareReturn(changed, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(changed, filer), Error);
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
              msaIncome: entry.msaIncome,
              ltcIncome: entry.ltcIncome,
              additionalTax: entry.additionalTax,
              tax: expectedTax[entry.id],
              joint: entry.joint ?? false,
              senior: entry.senior ?? false,
            },
            rejectedNative: mutations.length,
            rejectedFreshPdf: mutations.length,
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
Deno.test("Distribution/LTC public sources require exclusive complete activity and separate medical costs", () => {
  let rejected = 0;
  for (const original of distributionLtcPackets) {
    for (
      const mode of [
        "missing-review",
        "contradictory-review",
        "missing-ltc",
        "duplicate-medical",
      ]
    ) {
      const input = structuredClone(original.inputs);
      const source = input.form8853;
      const ledgers = source.archer_distribution_ledger
        ? [source.archer_distribution_ledger]
        : source.medicare_distribution_ledger
        ? [source.medicare_distribution_ledger]
        : source.medicare_joint_distribution_ledgers!;
      if (mode === "missing-review") delete ledgers[0].ltc_activity_review;
      if (mode === "contradictory-review") {
        ledgers[0].no_other_form8853_activity_confirmed = true;
      }
      if (mode === "missing-ltc") {
        const { ltc_ledger: _ltc, ...withoutLtc } = source;
        Object.assign(input, { form8853: withoutLtc });
      }
      if (mode === "duplicate-medical") {
        const distribution = ledgers[0].source;
        const ref = distribution.kind === "normal"
          ? distribution.distributions[0].qualified_expense_source_references[0]
          : distribution.expenses[0].source_reference;
        source.ltc_ledger.insureds[0].expenses.push({
          source_reference: ref,
          qualified_cost: 1,
        });
      }
      let result;
      try {
        result = f1040_2025.executeReturn(input);
      } catch {
        rejected++;
        continue;
      }
      assertEquals(
        result.diagnostics.some((d) => d.severity === "error"),
        true,
        `${original.id} ${mode}`,
      );
      rejected++;
    }
  }
  assertEquals(rejected, 56);
});
