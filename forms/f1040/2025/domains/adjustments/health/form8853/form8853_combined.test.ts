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
import { combinedPackets } from "./form8853_combined.fixture.ts";

function evidenceRoot() {
  try {
    return Deno.env.get("FORM8853_COMBINED_DIR");
  } catch (e) {
    if (e instanceof Deno.errors.NotCapable) return undefined;
    throw e;
  }
}

for (const entry of combinedPackets) {
  Deno.test(`Form 8853 combined Archer contribution/LTC complete return: ${entry.id}`, async () => {
    const result = f1040_2025.executeReturn(entry.inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.schedule1.line8e_archer_msa_dist ?? 0, entry.income);
    assertEquals(
      pending.schedule1.line23_archer_msa_deduction ?? 0,
      entry.deduction,
    );
    assertEquals(
      pending.schedule1.line8z_archer_excess_employer ?? 0,
      entry.excessIncome,
    );
    assertEquals(
      pending.f1040.line8_additional_income ?? 0,
      entry.income + entry.excessIncome,
    );
    assertEquals(pending.f1040.line10_adjustments ?? 0, entry.deduction);
    assertEquals(pending.f1040.line11_agi, entry.agi);
    assertEquals(
      pending.f1040.line15_taxable_income,
      entry.agi - (entry.joint ? 31500 : 15750),
    );
    assertEquals(pending.f1040.line23_other_taxes ?? 0, entry.excise);
    assertEquals(Math.round(Number(pending.f1040.line24_total_tax)), entry.tax);
    assertEquals(
      Math.round(Number(pending.f1040.line35a_refund)),
      35000 - entry.tax,
    );
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const xml = prepared.bundle.xml;
    assertEquals(xml.match(/<IRS8853 documentId=/g)?.length, 1);
    assertStringIncludes(
      xml,
      `<MSAHolderSSN>${entry.inputs.form8853.archer_contribution_ledger.holder_ssn}</MSAHolderSSN>`,
    );
    assertStringIncludes(
      xml,
      `<LTCInsurancePolicyHolderSSN>${
        entry.inputs.form8853.ltc_ledger.insureds[0].filing_policyholders[0].ssn
      }</LTCInsurancePolicyHolderSSN>`,
    );
    assertStringIncludes(
      xml,
      `<LTCTaxablePaymentsAmt>${entry.income}</LTCTaxablePaymentsAmt>`,
    );
    assertStringIncludes(
      xml,
      `<ArcherMSADeductionAmt>${entry.deduction}</ArcherMSADeductionAmt>`,
    );
    const statement = entry.id === "multiple-payees-with-deduction";
    assertEquals(
      (xml.match(/<MultiplePayeesStatement documentId=/g) ?? []).length,
      statement ? 1 : 0,
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
      statement ? 3 : 2,
    );

    const mutations: Array<(p: typeof pending) => void> = [
      (p) => {
        p.schedule1.line8e_archer_msa_dist = entry.income + 1;
      },
      (p) => {
        p.schedule1.line23_archer_msa_deduction = entry.deduction + 1;
      },
      (p) => {
        p.schedule1.line8z_archer_excess_employer = entry.excessIncome + 1;
      },
      (p) => {
        p.f1040.line8_additional_income = entry.income + entry.excessIncome + 1;
      },
      (p) => {
        p.f1040.line10_adjustments = entry.deduction + 1;
      },
      (p) => {
        p.f1040.line23_other_taxes = entry.excise + 1;
      },
      (p) => {
        delete p.form8853;
      },
      (p) => {
        delete p.form8853.archer_contribution_ledger;
      },
      (p) => {
        delete p.form8853.ltc_ledger;
      },
      (p) => {
        delete p.schedule1.ltc_archer_contribution_ledger;
      },
      (p) => {
        delete p.schedule1.ltc_source_ledger;
      },
      (p) => {
        const s = inputSchema.parse(p.form8853);
        s.archer_contribution_ledger!.personal_contributions[0]
          .source_reference += " changed";
        p.form8853 = s;
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
              income: entry.income,
              deduction: entry.deduction,
              excessIncome: entry.excessIncome,
              excise: entry.excise,
              agi: entry.agi,
              tax: entry.tax,
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

Deno.test("Form 8853 combined activity needs an exclusive sourced review and complete ledgers", () => {
  const base = combinedPackets[0].inputs;
  const rejects = (input: Parameters<typeof f1040_2025.executeReturn>[0]) => {
    let result;
    try {
      result = f1040_2025.executeReturn(input);
    } catch {
      return;
    }
    assertEquals(result.diagnostics.some((d) => d.severity === "error"), true);
  };
  const mutations: Array<(i: typeof base) => void> = [
    (i) => {
      delete i.form8853.archer_contribution_ledger.ltc_activity_review;
    },
    (i) => {
      i.form8853.archer_contribution_ledger
        .no_other_form8853_activity_review_reference =
          "Contradictory no LTC review";
    },
    (i) => {
      i.form8853.archer_contribution_ledger.ltc_activity_review!
        .source_reference = "";
    },
    (i) => {
      i.form8853.archer_contribution_ledger.ltc_activity_review = {
        ...i.form8853.archer_contribution_ledger.ltc_activity_review!,
        no_msa_distributions_confirmed: false as never,
      };
    },
    (i) => {
      i.form8853.ltc_ledger.insureds[0].sources[0].form1099ltc_box1 += 1;
    },
    (i) => {
      i.form8853.archer_contribution_ledger.months.pop();
    },
  ];
  for (const mutate of mutations) {
    const input = structuredClone(base);
    mutate(input);
    rejects(input);
  }
  const { ltc_ledger: _ltc, ...withoutLtc } = base.form8853;
  rejects({ ...base, form8853: withoutLtc });
  for (
    const key of [
      "archer_msa_distributions",
      "medicare_advantage_distributions",
      "ltc_gross_payments",
    ]
  ) {
    rejects({ ...base, form8853: { ...base.form8853, [key]: 1 } });
  }
});
