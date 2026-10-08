import {
  assertEquals,
  assertExists,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../2025/registry.ts";
import { buildMefXml } from "../../../../2025/mef/builder.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../2025/pdf/builder.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import {
  type ArcherContributionLedger,
  calculateArcherContributions,
} from "../../../../nodes/intermediate/forms/adjustments/health/form8853/archer_contributions.ts";

export function ledger(): ArcherContributionLedger {
  return {
    owner: "taxpayer",
    filing_status: "single",
    holder_ssn: "111223333",
    identity_source_reference: "Synthetic holder identity",
    sole_archer_msa_holder_on_return_confirmed: true,
    eligibility: {
      kind: "participating_employer",
      employer_ein: "123456789",
      source_reference: "Synthetic participating employer Archer policy",
    },
    employer_ein: "123456789",
    small_employer: {
      calendar_year: 2024,
      average_employee_count: 20,
      source_reference: "Synthetic employer workforce record",
    },
    months: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      source_reference: `Synthetic first day month ${i + 1} coverage review`,
      all_holder_and_spouse_hdhps_on_first_day_identified_confirmed: true,
      other_coverage_holder_and_spouse_review_reference:
        `Synthetic household health policies review month ${i + 1}`,
      medicare_enrolled: false,
      dependent_of_another: false,
      nonpermitted_other_health_coverage: false,
      employer_hdhp_coverage: true,
      plans: [{
        coverage: "self_only",
        deductible: 4000,
        maximum_out_of_pocket: 5000,
        policy_source_reference: "Synthetic HDHP policy",
      }],
    })),
    personal_contributions: [{
      amount: 2000.49,
      payer_ssn: "111223333",
      payment_source_reference: "Synthetic holder bank payment",
      personal_cash_not_employer_rollover_or_transfer_confirmed: true,
      deposit_date: "2025-04-15",
      designated_tax_year: 2025,
      source_reference: "Synthetic custodian deposit",
    }],
    compensation: {
      w2_source_reference: "issued2025w2",
      service_wages: 50000,
      payroll_source_reference: "Synthetic current-services payroll",
      all_box1_other_than_reported_employer_excess_is_current_service_compensation_confirmed:
        true,
      employer_excess_already_in_box1: 0,
      employer_excess_box1_review_reference: "Synthetic W2 box1 review",
    },
    no_spouse_archer_contributions_or_other_archer_accounts_review_reference:
      "Synthetic all return owners/accounts review",
    no_2026_employer_contributions_for_2025_review_reference:
      "Synthetic custodian/employer no following-year funding review",
    no_hsa_contributions_review_reference: "Synthetic no HSA funding review",
    no_other_form8853_activity_review_reference:
      "Synthetic no distributions/LTC/Medicare MSA review",
    no_prior_excess_or_withdrawals_review_reference:
      "Synthetic prior return/custodian no excess or withdrawals review",
    december_31: {
      value: 10000.49,
      source_reference: "Synthetic December31 custodian all-account value",
      all_holder_archer_accounts_included_confirmed: true,
    },
  };
}
export function fixture(source: ArcherContributionLedger, employer = 0) {
  return {
    general: {
      filing_status: source.filing_status,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1980-04-15",
      ...(source.months[0].dependent_of_another
        ? { dependent_earned_income: source.compensation.service_wages }
        : {}),
      taxpayer_can_be_claimed_as_dependent: source.owner === "taxpayer" &&
        source.months[0].dependent_of_another,
      spouse_can_be_claimed_as_dependent: source.owner === "spouse" &&
        source.months[0].dependent_of_another,
      ...((source.filing_status === "mfj" || source.filing_status === "mfs")
        ? {
          spouse_first_name: "Casey",
          spouse_last_name: "Example",
          spouse_ssn: "222-33-4444",
          spouse_dob: "1981-04-15",
        }
        : {}),
      address_line1: "1 Example Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    },
    w2: [{
      employee_ssn: source.holder_ssn,
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "10 Employer Road",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      source_document_reference: "issued2025w2",
      box1_wages: source.compensation.service_wages +
        source.compensation.employer_excess_already_in_box1,
      box2_fed_withheld: 5000,
      box3_ss_wages: source.compensation.service_wages,
      box4_ss_withheld:
        Math.round(source.compensation.service_wages * .062 * 100) / 100,
      box5_medicare_wages: source.compensation.service_wages,
      box6_medicare_withheld:
        Math.round(source.compensation.service_wages * .0145 * 100) / 100,
      box12_entries: employer ? [{ code: "R", amount: employer }] : [],
    }],
    form8853: { archer_contribution_ledger: source },
  };
}
export function run(source: ArcherContributionLedger, employer = 0) {
  return execute(
    buildExecutionPlan(registry),
    registry,
    fixture(source, employer),
    { taxYear: 2025, formType: "f1040" },
  );
}
const monthly = ledger();
monthly.personal_contributions[0].amount = 4500.49;
monthly.months.slice(6).forEach((m) => {
  m.plans = [{
    coverage: "family",
    deductible: 8000,
    maximum_out_of_pocket: 10000,
    policy_source_reference: "Synthetic family HDHP July onward",
  }];
});
const lowPay = ledger();
lowPay.compensation.service_wages = 1500.49;
lowPay.personal_contributions[0].amount = 3000;
const employerOnly = ledger();
employerOnly.personal_contributions = [];
const employerExcess = structuredClone(employerOnly);
const both = ledger();
both.personal_contributions[0].amount = 500;
const included = structuredClone(employerOnly);
included.compensation.employer_excess_already_in_box1 = 900;
const medicare = ledger();
medicare.medicare_enrollment_date = "2025-07-15";
medicare.medicare_enrollment_source_reference =
  "Synthetic Medicare July enrollment";
medicare.months.slice(6).forEach((m) => m.medicare_enrolled = true);
medicare.personal_contributions = [{
  ...medicare.personal_contributions[0],
  amount: 1000,
}, {
  ...medicare.personal_contributions[0],
  amount: 1000,
  deposit_date: "2025-08-15",
  source_reference: "Synthetic post-Medicare deposit",
  payment_source_reference: "Synthetic holder post-Medicare bank payment",
}];
const spouse = ledger();
spouse.owner = "spouse";
spouse.filing_status = "mfj";
spouse.holder_ssn = "222334444";
spouse.personal_contributions[0].payer_ssn = "222334444";
const zeroValue = ledger();
zeroValue.personal_contributions[0].amount = 3000;
zeroValue.december_31!.value = 0;
const ineligible = ledger();
ineligible.months.forEach((m) => m.dependent_of_another = true);
const firstHalf = ledger();
firstHalf.months.slice(6).forEach((m) =>
  m.nonpermitted_other_health_coverage = true
);
const grandfather = ledger();
grandfather.eligibility = {
  kind: "active_before_2008",
  active_tax_year: 2007,
  source_reference: "Synthetic 2007 filed Archer participation",
};
const separately = ledger();
separately.filing_status = "mfs";
separately.personal_contributions[0].amount = 3500;
separately.months.forEach((m) =>
  m.plans = [{
    coverage: "family",
    deductible: 8000,
    maximum_out_of_pocket: 10000,
    policy_source_reference: "Synthetic family HDHP",
  }]
);
const followingYear = ledger();
followingYear.personal_contributions[0].amount = 3000;
followingYear.personal_contributions[0].deposit_date = "2026-04-15";
followingYear.december_31!.value = 0;
export const cases = [
  ["personal-cents", ledger(), 0, 2000, 0, 0],
  ["grandfather-participation", grandfather, 0, 2000, 0, 0],
  ["mfs-family-default-share", separately, 0, 3000, 0, 30],
  ["zero-year-end-value", zeroValue, 0, 2600, 0, 0],
  ["following-year-deposit", followingYear, 0, 2600, 0, 24],
  ["dependent-ineligible", ineligible, 0, 0, 0, 120],
  ["partial-other-coverage", firstHalf, 0, 1300, 0, 42],
  ["monthly-family", monthly, 0, 4300, 0, 12],
  ["compensation-cap", lowPay, 0, 1500, 0, 90],
  ["employer", employerOnly, 2500, 0, 0, 0],
  ["employer-excess", employerExcess, 3500.49, 0, 900, 54],
  ["employer-personal", both, 2500, 0, 0, 30],
  ["employer-excess-in-wages", included, 3500, 0, 0, 54],
  ["medicare-cutoff", medicare, 0, 1000, 0, 60],
  ["spouse-personal", spouse, 0, 2000, 0, 0],
] as const;
for (const [name, source, employer, deduction, income, tax] of cases) {
  Deno.test(`Archer ${name}: public source→worksheet→Schedule1/5329/2/1040→full XSD/PDF`, async () => {
    const result = run(source, employer);
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.form8853?.archer_contribution_ledger, source);
    assertEquals(
      result.pending.schedule1?.line23_archer_msa_deduction ?? 0,
      deduction,
    );
    assertEquals(
      result.pending.schedule1?.line8z_archer_excess_employer ?? 0,
      income,
    );
    assertEquals(result.pending.f1040?.line10_adjustments ?? 0, deduction);
    assertEquals(result.pending.f1040?.line8_additional_income ?? 0, income);
    assertEquals(result.pending.f1040?.line23_other_taxes ?? 0, tax);
    assertEquals(
      ((result.pending.form8853?.w2_code_r_entries ?? []) as {
        amount: number;
      }[]).map((e) => e.amount),
      employer ? [employer] : [],
    );
    const wages = source.compensation.service_wages +
      source.compensation.employer_excess_already_in_box1;
    assertEquals(
      Math.round(Number(result.pending.f1040?.line9_total_income ?? 0)),
      Math.round(wages + income),
    );
    assertEquals(
      Math.round(Number(result.pending.f1040?.line11_agi ?? 0)),
      Math.round(wages + income - deduction),
    );
    const filer = extractFilerIdentity(result.pending.f1040)!;
    assertExists(filer);
    const xml = buildMefXml(buildPending(result.pending), filer);
    assertStringIncludes(
      xml,
      `<MSAHolderSSN>${source.holder_ssn}</MSAHolderSSN>`,
    );
    assertStringIncludes(
      xml,
      `<ArcherMSADeductionAmt>${deduction}</ArcherMSADeductionAmt>`,
    );
    const lines = calculateArcherContributions(
      source,
      employer
        ? [{
          employee_ssn: source.holder_ssn,
          employer_ein: "12-3456789",
          source_document_reference: "issued2025w2",
          amount: employer,
        }]
        : [],
    );
    assertEquals(xml.includes("ArcherMSAContriLimitationAmt"), employer === 0);
    if (employer === 0) {
      assertStringIncludes(
        xml,
        `<ArcherMSAContriLimitationAmt>${lines.line3}</ArcherMSAContriLimitationAmt>`,
      );
    }
    if (lines.currentExcess) {
      assertStringIncludes(
        xml,
        `<ArcherMSAExcessContriCYAmt>${lines.currentExcess}</ArcherMSAExcessContriCYAmt>`,
      );
      assertStringIncludes(
        xml,
        `<MSAExcessContribTaxAmt>${tax}</MSAExcessContribTaxAmt>`,
      );
      assertEquals(xml.includes("ArcherMSAExcessContriCreditAmt"), false);
    }
    const dir = new URL(
      "../../../../../../.state/research/2026-10-06-form8853-contributions/",
      import.meta.url,
    ).pathname;
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(dir + name + ".xml", xml);
    await Deno.writeTextFile(
      dir + name + ".json",
      JSON.stringify({ source, lines, pending: result.pending }, null, 2),
    );
    const xsd = new URL(
      "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const valid = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, dir + name + ".xml"],
      stderr: "piped",
    }).output();
    assertEquals(valid.code, 0, new TextDecoder().decode(valid.stderr));
    await Deno.writeFile(
      dir + name + ".pdf",
      await buildPdfBytes(result.pending, filer),
    );
    const text = await new Deno.Command("pdftotext", {
      args: ["-layout", dir + name + ".pdf", "-"],
      stdout: "piped",
    }).output();
    assertEquals(text.code, 0);
    const pages = new TextDecoder().decode(text.stdout).split("\f");
    const copy = pages.find((p) => p.includes("Archer MSAs and"))!;
    assertExists(copy);
    assertStringIncludes(copy, source.holder_ssn);
    assertStringIncludes(
      copy,
      source.filing_status === "mfj"
        ? "Alex Example & Casey Example"
        : "Alex Example",
    );
    assertEquals(new RegExp(`\\b5\\s+${deduction}\\b`).test(copy), true, copy);
    if (lines.currentExcess) {
      const partVI = pages.find((p) =>
        p.includes("Excess Contributions to Archer")
      )!;
      assertExists(partVI);
      for (
        const [line, value] of [
          [34, 0],
          [39, lines.currentExcess],
          [40, lines.currentExcess],
          [41, tax],
        ]
      ) {
        assertEquals(
          new RegExp(`\\b${line}\\s+${value}\\b`).test(partVI),
          true,
          `${name} line${line}\n${partVI}`,
        );
      }
    }
  });
}
Deno.test("Archer contribution actual export rejects wrong owner, compensation/codeR/HSA conflicts and filed tampering", async () => {
  const result = run(employerExcess, 3500),
    filer = extractFilerIdentity(result.pending.f1040)!;
  // These invalid facts enter through the public return input and fail calculation;
  // exporting the retained invalid source must also reject in both formats.
  for (
    const kind of ["hdhp", "month", "payer", "grandfather", "employer_owner"]
  ) {
    const source = ledger();
    if (kind === "hdhp") source.months[0].plans[0].deductible = 2000;
    if (kind === "month") source.months[1].month = 1;
    if (kind === "payer") {
      source.personal_contributions[0].payer_ssn = "999887777";
    }
    if (kind === "grandfather") {
      source.eligibility = {
        kind: "active_before_2008",
        active_tax_year: 2008,
        source_reference: "Invalid 2008 claim",
      };
    }
    const input = fixture(source, 3500);
    if (kind === "employer_owner") input.w2[0].employee_ssn = "999887777";
    const invalid = execute(buildExecutionPlan(registry), registry, input, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(
      invalid.diagnostics.some((d) => d.severity === "error"),
      true,
      `${kind}: ${JSON.stringify(invalid.diagnostics)}`,
    );
    await Deno.writeTextFile(
      new URL(
        `../../../.state/research/2026-10-06-form8853-contributions/public-negative-${kind}.json`,
        import.meta.url,
      ),
      JSON.stringify(
        {
          input,
          diagnostics: invalid.diagnostics,
          pendingKeys: Object.keys(invalid.pending),
        },
        null,
        2,
      ),
    );
    if (!extractFilerIdentity(invalid.pending.f1040)) {
      assertEquals(extractFilerIdentity(invalid.pending.f1040), undefined);
      continue;
    }
    assertThrows(() => buildMefXml(buildPending(invalid.pending), filer));
    await assertRejects(() => buildPdfBytes(invalid.pending, filer));
  }
  const invalids: typeof result.pending[] = [];
  for (
    const kind of [
      "owner",
      "grandfather",
      "compensation",
      "hdhp",
      "month",
      "medicare",
      "personaldup",
      "codeR",
      "dependency",
      "ineligible",
      "payer",
      "paymentdup",
      "crosspaymentdup",
      "medicareundated",
    ]
  ) {
    const pending = structuredClone(result.pending);
    const source = pending.form8853!
      .archer_contribution_ledger as ArcherContributionLedger;
    if (kind === "owner") source.holder_ssn = "999887777";
    if (kind === "grandfather") {
      source.eligibility = {
        kind: "active_before_2008",
        active_tax_year: 2008,
        source_reference: "Invalid grandfather eligibility",
      };
    }
    if (kind === "compensation") source.compensation.service_wages = 99999;
    if (kind === "hdhp") source.months[0].plans[0].deductible = 2000;
    if (kind === "month") source.months[1].month = 1;
    if (kind === "medicare") source.medicare_enrollment_date = "2025-07-01";
    if (kind === "personaldup") {
      source.personal_contributions = [
        ledger().personal_contributions[0],
        ledger().personal_contributions[0],
      ];
    }
    if (kind === "codeR") pending.form8853!.w2_code_r_entries = [];
    if (kind === "dependency") {
      pending.f1040!.taxpayer_can_be_claimed_as_dependent = true;
    }
    if (kind === "ineligible") {
      source.months[0].nonpermitted_other_health_coverage = true;
    }
    if (kind === "payer") {
      source.personal_contributions = [{
        ...ledger().personal_contributions[0],
        payer_ssn: "999887777",
      }];
    }
    if (kind === "paymentdup") {
      source.personal_contributions = [ledger().personal_contributions[0], {
        ...ledger().personal_contributions[0],
        source_reference: "another deposit",
      }];
    }
    if (kind === "crosspaymentdup") {
      source.personal_contributions = [ledger().personal_contributions[0], {
        ...ledger().personal_contributions[0],
        source_reference: "another deposit",
        payment_source_reference:
          ledger().personal_contributions[0].source_reference,
      }];
    }
    if (kind === "medicareundated") source.months[11].medicare_enrolled = true;
    invalids.push(pending);
  }
  const extraPay = structuredClone(result.pending);
  const rows = extraPay.w2!.w2s as {
    source_document_reference: string;
    box12_entries: { code: string; amount: number }[];
  }[];
  rows.push({
    ...structuredClone(rows[0]),
    source_document_reference: "additional HDHP employer payroll",
    box12_entries: [],
  });
  invalids.push(extraPay);
  const hsa = structuredClone(result.pending);
  (hsa.w2!.w2s as { box12_entries: { code: string; amount: number }[] }[])[0]
    .box12_entries.push({ code: "W", amount: 100 });
  invalids.push(hsa);
  for (
    const key of [
      "line23_archer_msa_deduction",
      "line8z_archer_excess_employer",
    ]
  ) {
    const pending = structuredClone(result.pending);
    pending.schedule1![key] = 999;
    invalids.push(pending);
  }
  const excess = structuredClone(result.pending);
  (excess.form5329!.owner_entries as {
    archer_part_vi: { line39_current_year_excess: number };
  }[])[0].archer_part_vi.line39_current_year_excess = 901;
  invalids.push(excess);
  for (
    const key of [
      "line8_additional_income",
      "line10_adjustments",
      "line23_other_taxes",
    ]
  ) {
    const pending = structuredClone(result.pending);
    pending.f1040![key] = 999;
    invalids.push(pending);
  }
  const totals = structuredClone(result.pending);
  totals.schedule1!.line10_total_additional_income = 901;
  totals.f1040!.line8_additional_income = 901;
  invalids.push(totals);
  const orphan: Record<string, Record<string, unknown>> = structuredClone(
    result.pending,
  );
  delete orphan.form8853;
  delete orphan.form5329;
  delete orphan.schedule2;
  orphan.f1040!.line23_other_taxes = 0;
  invalids.push(orphan);
  const funded = run(employerOnly, 2500);
  const missingContribution: Record<string, Record<string, unknown>> =
    structuredClone(funded.pending);
  delete missingContribution.form8853;
  invalids.push(missingContribution);
  for (const pending of invalids) {
    assertThrows(() => buildMefXml(buildPending(pending), filer));
    await assertRejects(() => buildPdfBytes(pending, filer));
  }
});
