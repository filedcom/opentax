import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { DistributionCode } from "../nodes/inputs/f1099r/index.ts";
import { FilingStatus } from "../mef/header.ts";
import { registry } from "./registry.ts";
import { form4972 as native } from "./mef/forms/f4972.ts";
import { form4972Pdf } from "./pdf/forms/f4972.ts";

const people = {
  T: { name: "Alex Taxpayer", ssn: "123456789", amount: 30_000, nua: 5_000 },
  S: { name: "Blair Taxpayer", ssn: "987654321", amount: 40_000, nua: 0 },
} as const;
const plan = (owner: "T" | "S") => ({
  participant_name: people[owner].name,
  participant_ssn: people[owner].ssn,
  plan_reference: `stock-plan-${owner}`,
  full_balance_statement_reference: `final-balance-${owner}`,
  all_qualified_distributions_included: true as const,
});
const source = (owner: "T" | "S") => ({
  payer_name: `Plan administrator ${owner}`,
  payer_ein: owner === "T" ? "123456789" : "987654321",
  source_document_reference: `1099-R-stock-${owner}`,
  form4972_plan: plan(owner),
  box1_gross_distribution: people[owner].amount + people[owner].nua,
  box2a_taxable_amount: people[owner].amount,
  ...(owner === "T" ? { box3_capital_gain: 6_000 } : {}),
  ...(owner === "T" ? { box6_nua: people.T.nua } : {}),
  box9a_pct_total: 100,
  box7_distribution_code: DistributionCode.CodeA,
  ts: owner,
  exclude_4972: true,
});
const election = (owner: "T" | "S") => ({
  source_document_references: [`1099-R-stock-${owner}`],
  participant_name: plan(owner).participant_name,
  participant_ssn: plan(owner).participant_ssn,
  plan_reference: plan(owner).plan_reference,
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: false,
  participant_five_year_member: true,
  prior_election_after_1986: false,
  elect_include_nua: owner === "T",
  elect_capital_gain: owner === "T",
  elect_10yr_averaging: true,
});
const general = {
  filing_status: "mfj",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: people.T.ssn,
  taxpayer_dob: "1930-01-01",
  spouse_first_name: "Blair",
  spouse_last_name: "Taxpayer",
  spouse_ssn: people.S.ssn,
  spouse_dob: "1931-01-01",
};
const filer = {
  primarySSN: people.T.ssn,
  fullName: people.T.name,
  nameLine1: people.T.name,
  nameControl: "TAXP",
  spouse: {
    firstName: "Blair",
    lastName: "Taxpayer",
    ssn: people.S.ssn,
    nameControl: "TAXP",
  },
  filingStatus: FilingStatus.MarriedFilingJointly,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function jointReturn() {
  return execute(buildExecutionPlan(registry), registry, {
    general,
    f1099r: [source("T"), source("S")],
    form4972: { elections: [election("T"), election("S")] },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("one spouse's NUA capital election and both ten-year elections remain separate", () => {
  const result = jointReturn();
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const forms = pending.form4972?.forms as Record<string, unknown>[];
  assertEquals(forms.map((form) => form.recipient), ["T", "S"]);
  assertEquals(forms[0].line6_nua_capital_gain, 1_000);
  assertEquals(forms[0].line6, 7_000);
  assertEquals(forms[0].line7, 1_400);
  assertEquals(forms[0].line8_nua_included, 4_000);
  assertEquals(forms[0].line8, 28_000);
  assertEquals(forms[1].line8, 40_000);
  assertEquals(pending.f1040?.line5b_form4972_ordinary ?? 0, 0);
  assertEquals(
    pending.f1040?.form4972_tax,
    Number(forms[0].line30) + Number(forms[1].line30),
  );
  assertEquals(pending.f1040?.line16_income_tax, pending.f1040?.form4972_tax);
  const xml = native.build(pending.form4972!, { filer, pending });
  assertEquals(xml.length, 2);
  assertEquals(xml[0].includes("<CapitalGainElectionAmt"), true);
  assertEquals(xml[0].includes(">7000</CapitalGainElectionAmt>"), true);
  assertEquals(xml[1].includes("<CapitalGainElectionAmt"), false);
  const pdf = form4972Pdf.instances?.(pending.form4972!, filer, pending);
  assertEquals(pdf?.map((form) => form.recipient_ssn), [
    people.T.ssn,
    people.S.ssn,
  ]);
  assertEquals(pdf?.[0]?.line6, 7_000);
  assertEquals(pdf?.[0]?.line8_nua_included, 4_000);
  assertEquals(
    pdf?.map((form) => form.line30),
    forms.map((form) => form.line30),
  );
});

Deno.test("spouse NUA capital route rejects changed gain, plan, printed capital, and combined tax", () => {
  const pending = jointReturn().pending;
  const forms = pending.form4972?.forms as Record<string, unknown>[];
  const changed = [{
    ...pending,
    f1099r: {
      f1099rs: [{ ...source("T"), box3_capital_gain: 5_000 }, source("S")],
    },
  }, {
    ...pending,
    f1099r: {
      f1099rs: [{
        ...source("T"),
        form4972_plan: {
          ...plan("T"),
          plan_reference: plan("S").plan_reference,
        },
      }, source("S")],
    },
  }, {
    ...pending,
    f1040: { ...pending.f1040, form4972_tax: 1 },
  }];
  for (const altered of changed) {
    assertThrows(() =>
      native.build(pending.form4972!, { filer, pending: altered })
    );
    assertThrows(() =>
      form4972Pdf.instances?.(pending.form4972!, filer, altered)
    );
  }
  const changedForms = {
    ...pending.form4972,
    forms: [{ ...forms[0], line6: 6_999 }, forms[1]],
  };
  assertThrows(() => native.build(changedForms, { filer, pending }));
  assertThrows(() => form4972Pdf.instances?.(changedForms, filer, pending));
});
