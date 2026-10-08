import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { DistributionCode } from "../../../../nodes/inputs/f1099r/index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { f1040_2025 } from "../../../index.ts";
import { registry } from "../../../registry.ts";
import { form4972 as native } from "../../../mef/forms/retirement/f4972.ts";
import { form4972Pdf } from "../../../pdf/forms/retirement/f4972.ts";

const people = {
  T: {
    name: "Alex Taxpayer",
    ssn: "123456789",
    taxable: 30_000,
    gain: 6_000,
    nua: 5_000,
  },
  S: {
    name: "Blair Taxpayer",
    ssn: "987654321",
    taxable: 40_000,
    gain: 8_000,
    nua: 8_000,
  },
} as const;
type Owner = keyof typeof people;
const plan = (owner: Owner) => ({
  participant_name: people[owner].name,
  participant_ssn: people[owner].ssn,
  plan_reference: `capital-nua-plan-${owner}`,
  full_balance_statement_reference: `final-balance-${owner}`,
  all_qualified_distributions_included: true as const,
});
const copy = (owner: Owner) => ({
  payer_name: `Plan administrator ${owner}`,
  payer_ein: owner === "T" ? "123456789" : "987654321",
  source_document_reference: `1099-R-capital-nua-${owner}`,
  recipient_ssn: people[owner].ssn,
  form4972_plan: plan(owner),
  box1_gross_distribution: people[owner].taxable + people[owner].nua,
  box2a_taxable_amount: people[owner].taxable,
  box3_capital_gain: people[owner].gain,
  box6_nua: people[owner].nua,
  box9a_pct_total: 100,
  box7_distribution_code: DistributionCode.CodeA,
  ts: owner,
  exclude_4972: true,
});
const election = (owner: Owner) => ({
  source_document_references: [`1099-R-capital-nua-${owner}`],
  participant_name: plan(owner).participant_name,
  participant_ssn: plan(owner).participant_ssn,
  plan_reference: plan(owner).plan_reference,
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: false,
  participant_five_year_member: true,
  prior_election_after_1986: false,
  elect_include_nua: true,
  elect_capital_gain: true,
  elect_10yr_averaging: true,
});
const general = {
  filing_status: "mfj" as const,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: people.T.ssn,
  taxpayer_dob: "1930-01-01",
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
  spouse_first_name: "Blair",
  spouse_last_name: "Taxpayer",
  spouse_ssn: people.S.ssn,
  spouse_dob: "1931-01-01",
  spouse_ssn_valid_for_employment: true,
  spouse_ssn_issued_before_due_date: true,
  spouse_tin_issued_by_due_date: true,
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
  taxpayer_can_be_claimed_as_dependent: false,
};

function jointReturn() {
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    f1099r: [copy("T"), copy("S")],
    schedule1a: {
      senior_zero_exclusions_review: {
        no_section933_puerto_rico_excluded_income: true,
        section933_review_source_reference: "2025 residency and income review",
        no_form2555_filed: true,
        form2555_review_source_reference: "2025 foreign-income return review",
        no_form4563_filed: true,
        form4563_review_source_reference: "2025 Samoa-source income review",
      },
    },
    form4972: { elections: [election("T"), election("S")] },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return { pending: result.pending, filer: extractFilerIdentity(general) };
}

Deno.test("both spouses independently elect NUA capital gain and ten-year tax", async () => {
  const { pending, filer } = jointReturn();
  const forms = pending.form4972?.forms as Record<string, unknown>[];
  assertEquals(forms.map((form) => form.recipient), ["T", "S"]);
  assertEquals(forms.map((form) => form.line6_nua_capital_gain), [
    1_000,
    1_600,
  ]);
  assertEquals(forms.map((form) => form.line6), [7_000, 9_600]);
  assertEquals(forms.map((form) => form.line8_nua_included), [4_000, 6_400]);
  assertEquals(forms.map((form) => form.line8), [28_000, 38_400]);
  assertEquals(forms.map((form) => form.line30), [3_630, 5_840]);
  assertEquals(pending.f1040?.line5b_form4972_ordinary ?? 0, 0);
  assertEquals(
    pending.f1040?.form4972_tax,
    Number(forms[0].line30) + Number(forms[1].line30),
  );
  assertEquals(pending.f1040?.line16_income_tax, pending.f1040?.form4972_tax);
  assertEquals(pending.f1040?.line16_income_tax, 9_470);
  const xml = native.build(pending.form4972!, { filer, pending });
  assertEquals(xml.length, 2);
  assertStringIncludes(xml[0], ">7000</CapitalGainElectionAmt>");
  assertStringIncludes(xml[1], ">9600</CapitalGainElectionAmt>");
  const pdf = form4972Pdf.instances?.(pending.form4972!, filer, pending);
  assertEquals(pdf?.map((form) => form.recipient_ssn), [
    people.T.ssn,
    people.S.ssn,
  ]);
  assertEquals(pdf?.map((form) => form.line6), [7_000, 9_600]);
  const prepared = await f1040_2025.prepareReturn(pending, filer);
  assertEquals((prepared.bundle.xml.match(/<IRS4972\b/g) ?? []).length, 2);
  const filledPdf = await prepared.renderPdf();
  assertEquals(new TextDecoder().decode(filledPdf.slice(0, 5)), "%PDF-");
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
    await Deno.writeFile(`${evidenceDir}/filled-return.pdf`, filledPdf);
  }
});

Deno.test("two NUA capital elections reject one owner's changed source or combined tax", () => {
  const { pending, filer } = jointReturn();
  const changed = [
    {
      ...pending,
      f1099r: { f1099rs: [copy("T"), { ...copy("S"), box6_nua: 8_001 }] },
    },
    {
      ...pending,
      f1099r: {
        f1099rs: [copy("T"), { ...copy("S"), box3_capital_gain: 7_999 }],
      },
    },
    { ...pending, f1040: { ...pending.f1040, form4972_tax: 1 } },
  ];
  for (const altered of changed) {
    assertThrows(() =>
      native.build(pending.form4972!, { filer, pending: altered })
    );
    assertThrows(() =>
      form4972Pdf.instances?.(pending.form4972!, filer, altered)
    );
  }
});
