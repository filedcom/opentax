import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { DistributionCode } from "../nodes/inputs/f1099r/index.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { f1040_2025 } from "./index.ts";
import { registry } from "./registry.ts";
import { form4972 as native } from "./mef/forms/f4972.ts";
import { form4972Pdf } from "./pdf/forms/f4972.ts";

const general = {
  filing_status: "single" as const,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "123456789",
  taxpayer_dob: "1970-01-01",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
  taxpayer_can_be_claimed_as_dependent: false,
};
const source = {
  payer_name: "Qualified Stock Bonus Plan",
  payer_ein: "123456789",
  recipient_ssn: "123456789",
  source_document_reference: "2025-issued-1099-R-beneficiary",
  form4972_plan: {
    participant_name: "Pat Participant",
    participant_ssn: "444556666",
    plan_reference: "stock-bonus-plan-2025",
    full_balance_statement_reference: "full-plan-balance-2025",
    all_qualified_distributions_included: true,
  },
  box1_gross_distribution: 24_000,
  box2a_taxable_amount: 20_000,
  box3_capital_gain: 4_000,
  box6_nua: 4_000,
  box7_distribution_code: DistributionCode.CodeA,
  box9a_pct_total: 50,
  ts: "T" as const,
  exclude_4972: true,
};
const election = {
  source_document_references: [source.source_document_reference],
  participant_name: source.form4972_plan.participant_name,
  participant_ssn: source.form4972_plan.participant_ssn,
  plan_reference: source.form4972_plan.plan_reference,
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: true,
  participant_five_year_member: false,
  participant_died_before_1996_08_21: true,
  prior_beneficiary_election_after_1986: false,
  elect_include_nua: true,
  elect_capital_gain: true,
  elect_10yr_averaging: true,
  death_benefit_exclusion: 5_000,
  death_benefit_recipient_allocated_amount: 2_500,
  death_benefit_exclusion_source_reference: "death-benefit-plan-allocation",
  death_benefit_allocation: {
    participant_ssn: source.form4972_plan.participant_ssn,
    elected_recipient_ssn: general.taxpayer_ssn,
    recipients: [
      {
        recipient_ssn: general.taxpayer_ssn,
        share_pct: 50,
        excluded_amount: 2_500,
      },
      { recipient_ssn: "987654321", share_pct: 50, excluded_amount: 2_500 },
    ],
  },
  federal_estate_tax: 2_000,
  partial_estate_tax_source: {
    administrator_statement_reference: "estate-administrator-allocation",
    estate_tax_return_reference: "filed-Form-706-workpaper",
    full_distribution_taxable_amount: 48_000,
    full_distribution_federal_estate_tax: 2_000,
    recipient_allocated_federal_estate_tax: 1_000,
  },
};

function returnCase(changedElection = election) {
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    f1099r: [source],
    form4972: { elections: [changedElection] },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return { pending: result.pending, filer: extractFilerIdentity(general) };
}

Deno.test("partial beneficiary combines NUA, death exclusion, and estate tax", async () => {
  const { pending, filer } = returnCase();
  const form = (pending.form4972?.forms as Record<string, unknown>[])[0];
  assertEquals(form.line6_nua_capital_gain, 800);
  assertEquals(form.line6, 4_100);
  assertEquals(form.line7, 820);
  assertEquals(form.line8, 38_400);
  assertEquals(form.line9, 4_000);
  assertEquals(form.line18, 1_600);
  assertEquals(form.line29, 1_510);
  assertEquals(form.line30, 2_330);
  assertEquals(pending.f1040?.line5b_pension_taxable ?? 0, 0);
  assertEquals(pending.f1040?.form4972_tax, form.line30);
  assertEquals(pending.f1040?.line16_income_tax, 2_330);
  const xml = native.build(pending.form4972!, { filer, pending })[0];
  assertStringIncludes(xml, ">4100</CapitalGainElectionAmt>");
  assertStringIncludes(
    xml,
    "<LumpSumDistriDeathBnftExclAmt>4000</LumpSumDistriDeathBnftExclAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpDistribFederalEstateTaxAmt>1600</LumpDistribFederalEstateTaxAmt>",
  );
  assertEquals(
    form4972Pdf.instances?.(pending.form4972!, filer, pending)?.[0].line6,
    4_100,
  );
  const prepared = await f1040_2025.prepareReturn(pending, filer);
  assertEquals((prepared.bundle.xml.match(/<IRS4972\b/g) ?? []).length, 1);
  const pdf = await prepared.renderPdf();
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  const evidencePermission = await Deno.permissions.query({
    name: "env",
    variable: "FORM4972_EVIDENCE_DIR",
  });
  const evidenceDir = evidencePermission.state === "granted"
    ? Deno.env.get("FORM4972_EVIDENCE_DIR")
    : undefined;
  if (evidenceDir) {
    await Deno.mkdir(evidenceDir, { recursive: true });
    await Deno.writeTextFile(
      `${evidenceDir}/full-return.xml`,
      prepared.bundle.xml,
    );
    await Deno.writeFile(`${evidenceDir}/filled-return.pdf`, pdf);
  }
});

Deno.test("combined beneficiary route rejects allocation, issued-copy, and tax changes", () => {
  const { pending, filer } = returnCase();
  assertThrows(() =>
    returnCase({
      ...election,
      death_benefit_recipient_allocated_amount: 2_499,
    })
  );
  assertThrows(() =>
    returnCase({
      ...election,
      partial_estate_tax_source: {
        ...election.partial_estate_tax_source,
        recipient_allocated_federal_estate_tax: 999,
      },
    })
  );
  assertThrows(() =>
    returnCase({
      ...election,
      partial_estate_tax_source: {
        ...election.partial_estate_tax_source,
        administrator_statement_reference:
          election.death_benefit_exclusion_source_reference,
      },
    })
  );
  for (
    const changed of [
      { ...pending, f1099r: { f1099rs: [{ ...source, box6_nua: 3_999 }] } },
      { ...pending, f1040: { ...pending.f1040, form4972_tax: 1 } },
    ]
  ) {
    assertThrows(() =>
      native.build(pending.form4972!, { filer, pending: changed })
    );
    assertThrows(() =>
      form4972Pdf.instances?.(pending.form4972!, filer, changed)
    );
  }
});
