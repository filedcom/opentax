import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import {
  type Form8853Input,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/index.ts";
import { fixture, ledger } from "./form8853_contributions.fixture.ts";
import { combinedPackets } from "./form8853_combined.fixture.ts";

const cases = [
  "personal",
  "all-medical",
  "employer-excess",
  "spouse",
  "disability",
  "ltc-personal",
  "ltc-employer-excess",
  "ltc-spouse",
];
function pairedInput(id: string) {
  const contribution = ledger();
  const spouse = id.includes("spouse"), employer = id.includes("employer");
  const ltc = id.startsWith("ltc-");
  contribution.compensation.service_wages = spouse ? 220000 : 120000;
  contribution.personal_contributions[0].amount = 2000;
  if (employer) contribution.personal_contributions = [];
  if (spouse) {
    contribution.owner = "spouse";
    contribution.filing_status = "mfj";
    contribution.holder_ssn = "222334444";
    contribution.personal_contributions[0].payer_ssn = contribution.holder_ssn;
  }
  delete contribution.no_other_form8853_activity_review_reference;
  contribution.paired_archer_activity_review = {
    source_reference:
      "Synthetic complete annual Archer contribution and distribution inventory",
    includes_ltc: ltc,
    no_other_msa_activity_confirmed: true,
    medical_expenses_separate_from_ltc_costs_and_reimbursements_confirmed: true,
  };
  const distribution: NonNullable<Form8853Input["archer_distribution_ledger"]> =
    {
      all_distributions_identified_confirmed: true,
      no_rollover_or_excess_contribution_withdrawal_confirmed: true,
      paired_archer_activity_review: {
        ...contribution.paired_archer_activity_review,
      },
      source: {
        kind: "normal",
        holder_ssn: contribution.holder_ssn,
        holder_date_of_birth: spouse ? "1981-04-15" : "1980-04-15",
        holder_identity_source_reference: "Synthetic holder birth certificate",
        ...(id === "disability"
          ? {
            disability: {
              onset_date: "2025-06-15",
              source_reference: "Synthetic disability certification",
              unable_to_engage_in_substantial_gainful_activity_confirmed:
                true as const,
              condition_expected_to_result_in_death_or_continue_indefinitely_confirmed:
                true as const,
            },
          }
          : {}),
        distributions: ["14", "16"].map((day) => ({
          distribution_reference: `Synthetic June ${day} payment`,
          distribution_date: `2025-06-${day}`,
          gross_amount: 1000,
          form1099sa_distribution_code: "1" as const,
          form1099sa_source_reference: "Synthetic issued 1099-SA",
          distribution_date_source_reference:
            `Synthetic June ${day} custodian ledger`,
          unreimbursed_qualified_expenses: id === "all-medical" ? 1000 : 250,
          qualified_expense_source_references: [
            `Synthetic June ${day} separate medical receipt`,
          ],
          qualified_expense_eligibility_and_no_schedule_a_double_deduction_confirmed:
            true as const,
        })),
      },
    };
  const base = fixture(contribution, employer ? 4000 : 0);
  base.w2[0].box2_fed_withheld = 35000;
  base.w2[0].box3_ss_wages = Math.min(base.w2[0].box3_ss_wages, 176100);
  base.w2[0].box4_ss_withheld =
    Math.round(base.w2[0].box3_ss_wages * .062 * 100) / 100;
  const form8853: Form8853Input = {
    ...base.form8853,
    archer_distribution_ledger: distribution,
    ...(ltc
      ? {
        ltc_ledger: structuredClone(
          combinedPackets[0].inputs.form8853.ltc_ledger,
        ),
      }
      : {}),
  };
  return { ...base, form8853 };
}
function expected(id: string) {
  const spouse = id.includes("spouse"), employer = id.includes("employer");
  const deduction = employer ? 0 : 2000;
  const employerIncome = employer ? 1400 : 0;
  const distributionIncome = id === "all-medical" ? 0 : 1500;
  const ltcIncome = id.startsWith("ltc-") ? 7400 : 0;
  const distributionTax = id === "all-medical"
    ? 0
    : id === "disability"
    ? 150
    : 300;
  const excise = employer ? 84 : 0;
  const agi = (spouse ? 220000 : 120000) + employerIncome + distributionIncome +
    ltcIncome - deduction;
  const taxable = agi - (spouse ? 31500 : 15750);
  // Independent IRS 2025 Tax Computation Worksheet brackets.
  const regular = Math.round(
    spouse
      ? taxable * .22 - 10172
      : taxable <= 103350
      ? taxable * .22 - 5086
      : taxable * .24 - 7153,
  );
  return {
    deduction,
    employerIncome,
    distributionIncome,
    ltcIncome,
    distributionTax,
    excise,
    agi,
    taxable,
    regular,
    tax: regular + distributionTax + excise,
  };
}
function evidenceRoot() {
  try {
    return Deno.env.get("ARCHER_PAIRED_EVIDENCE");
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}
for (const id of cases) {
  Deno.test(`Archer paired contributions/distributions complete return: ${id}`, async () => {
    const input = pairedInput(id), target = expected(id);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(
      pending.schedule1.line23_archer_msa_deduction ?? 0,
      target.deduction,
    );
    assertEquals(
      pending.schedule1.line8e_archer_msa_dist ?? 0,
      target.distributionIncome + target.ltcIncome,
    );
    assertEquals(
      pending.schedule1.line8z_archer_excess_employer ?? 0,
      target.employerIncome,
    );
    assertEquals(
      pending.schedule2?.line17e_archer_msa_tax ?? 0,
      target.distributionTax,
    );
    assertEquals(pending.f1040.line11_agi, target.agi);
    assertEquals(pending.f1040.line24_total_tax, target.tax);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const prepared = await f1040_2025.prepareReturn(pending, filer);
    assertEquals(
      (prepared.bundle.xml.match(/<IRS8853 documentId=/g) ?? []).length,
      1,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const changeable = () => ({
      ...structuredClone(pending),
      schedule1: structuredClone(pending.schedule1),
      f1040: structuredClone(pending.f1040),
      form8853: inputSchema.parse(structuredClone(pending.form8853)),
    });
    const mutations: Array<(p: ReturnType<typeof changeable>) => void> = [
      (p) => {
        Reflect.deleteProperty(p, "form8853");
      },
      (p) => {
        delete p.form8853.archer_contribution_ledger;
      },
      (p) => {
        delete p.form8853.archer_distribution_ledger;
      },
      (p) => {
        delete p.form8853.archer_contribution_ledger!
          .paired_archer_activity_review;
      },
      (p) => {
        p.form8853.archer_distribution_ledger!.paired_archer_activity_review!
          .source_reference += " changed";
      },
      (p) => {
        const source = p.form8853.archer_distribution_ledger!.source;
        if (source.kind === "normal") source.holder_ssn = "999887777";
      },
      (p) => {
        const source = p.form8853.archer_distribution_ledger!.source;
        if (source.kind === "normal") {
          source.holder_date_of_birth = "1985-01-01";
        }
      },
      (p) => {
        const source = p.form8853.archer_distribution_ledger!.source;
        if (source.kind === "normal") source.distributions[0].gross_amount += 1;
      },
      (p) => {
        delete p.schedule1.paired_archer_distribution_ledger;
      },
      (p) => {
        p.schedule1.line8e_archer_msa_dist = target.distributionIncome +
          target.ltcIncome + 1;
      },
      (p) => {
        p.f1040.line23_other_taxes = target.distributionTax + target.excise + 1;
      },
    ];
    for (const mutate of mutations) {
      const p = changeable();
      mutate(p);
      await assertRejects(() => f1040_2025.prepareReturn(p, filer), Error);
      await assertRejects(() => buildPdfBytes(p, filer), Error);
    }
    const root = evidenceRoot();
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${id}.json`,
        JSON.stringify(
          {
            input,
            pending,
            expected: target,
            origins,
            rejectedNative: mutations.length,
            rejectedPdf: mutations.length,
          },
          null,
          2,
        ),
      );
    }
  });
}

Deno.test("Archer paired public source rejects incomplete and conflicting annual inventories", () => {
  for (const id of cases) {
    const mutations: Array<(p: ReturnType<typeof pairedInput>) => void> = [
      (p) => {
        delete p.form8853.archer_contribution_ledger;
      },
      (p) => {
        delete p.form8853.archer_distribution_ledger;
      },
      (p) => {
        delete p.form8853.archer_distribution_ledger!
          .paired_archer_activity_review;
      },
      (p) => {
        p.form8853.archer_distribution_ledger!.paired_archer_activity_review!
          .source_reference += " different";
      },
      (p) => {
        const s = p.form8853.archer_distribution_ledger!.source;
        if (s.kind === "normal") s.holder_ssn = "999887777";
      },
      (p) => {
        p.form8853.archer_distribution_ledger!
          .no_other_form8853_activity_confirmed = true;
      },
      (p) => {
        p.form8853.archer_contribution_ledger!.paired_archer_activity_review!
          .includes_ltc = !id.startsWith("ltc-");
      },
    ];
    if (id.startsWith("ltc-")) {
      mutations.push((p) => {
        const source = p.form8853.archer_distribution_ledger!.source;
        if (source.kind === "normal") {
          source.distributions[0].qualified_expense_source_references[0] =
            p.form8853.ltc_ledger!.insureds[0].expenses[0].source_reference;
        }
      });
    }
    for (const mutate of mutations) {
      const input = pairedInput(id);
      mutate(input);
      assert(
        f1040_2025.executeReturn(input).diagnostics.some((d) =>
          d.severity === "error"
        ),
      );
    }
  }
});
