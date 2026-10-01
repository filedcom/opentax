import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "./registry.ts";
import { DistributionCode } from "../nodes/inputs/f1099r/index.ts";
import { FilingStatus } from "../mef/header.ts";
import { form4972 as mef } from "./mef/forms/f4972.ts";
import { form4972Pdf } from "./pdf/forms/f4972.ts";

const plan = buildExecutionPlan(registry);
const general = {
  filing_status: FilingStatus.MarriedFilingJointly,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "123456789",
  taxpayer_dob: "1930-01-01",
  spouse_first_name: "Blair",
  spouse_last_name: "Taxpayer",
  spouse_ssn: "987654321",
  spouse_dob: "1931-01-01",
};
const filer = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "Alex Taxpayer",
  nameControl: "TAXP",
  spouse: { firstName: "Blair", lastName: "Taxpayer", ssn: "987654321" },
  filingStatus: FilingStatus.MarriedFilingJointly,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};
const planFacts = (owner: "T" | "S") => ({
  participant_name: owner === "T" ? "Alex Taxpayer" : "Blair Taxpayer",
  participant_ssn: owner === "T" ? "123456789" : "987654321",
  plan_reference: `plan-${owner}`,
  full_balance_statement_reference: `2025 full-balance-${owner}`,
  all_qualified_distributions_included: true as const,
});
const source = (owner: "T" | "S") => ({
  payer_name: "Old Plan",
  payer_ein: "123456789",
  source_document_reference: `1099-R-${owner}`,
  form4972_plan: planFacts(owner),
  box1_gross_distribution: owner === "T" ? 30_000 : 40_000,
  box2a_taxable_amount: owner === "T" ? 30_000 : 40_000,
  ...(owner === "T" ? { box3_capital_gain: 5_000 } : {}),
  box9a_pct_total: 100,
  box7_distribution_code: DistributionCode.CodeA,
  ts: owner,
  exclude_4972: true,
});
const election = (owner: "T" | "S") => ({
  source_document_references: [`1099-R-${owner}`],
  participant_name: planFacts(owner).participant_name,
  participant_ssn: planFacts(owner).participant_ssn,
  plan_reference: planFacts(owner).plan_reference,
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: false,
  participant_five_year_member: true,
  prior_election_after_1986: false,
  ...(owner === "T"
    ? { elect_capital_gain: true, elect_10yr_averaging: false }
    : { elect_10yr_averaging: true }),
});
function mixedReturn() {
  return execute(plan, registry, {
    general,
    f1099r: [source("T"), source("S")],
    form4972: { elections: [election("T"), election("S")] },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("Form 4972 separate spouse Part II and Part III elections join one Form 1040", () => {
  const result = mixedReturn();
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const forms = pending.form4972?.forms as Record<string, unknown>[];
  assertEquals(forms.map((form) => form.recipient), ["T", "S"]);
  assertEquals(forms[0].line6, 5_000);
  assertEquals(forms[0].line7, 1_000);
  assertEquals(forms[0].line8, undefined);
  assertEquals(forms[1].line6, undefined);
  assertEquals(forms[1].line8, 40_000);
  assertEquals(pending.f1040?.line5b_form4972_ordinary, 25_000);
  assertEquals(pending.f1040?.line5b_pension_taxable, 25_000);
  assertEquals(
    pending.f1040?.form4972_tax,
    1_000 + (forms[1].line30 as number),
  );
  const native = mef.build(pending.form4972!, { filer, pending });
  assertEquals(native.length, 2);
  assertEquals(
    native[0].includes("<CapitalGainElectionAmt>5000</CapitalGainElectionAmt>"),
    true,
  );
  assertEquals(
    native[1].includes(
      "<LumpSumDistriOrdinaryIncmAmt>40000</LumpSumDistriOrdinaryIncmAmt>",
    ),
    true,
  );
  const pdf = form4972Pdf.instances?.(pending.form4972!, filer, pending);
  assertEquals(pdf?.length, 2);
  assertEquals(pdf?.map((form) => form.recipient_ssn), [
    "123456789",
    "987654321",
  ]);
  assertEquals(pdf?.[0].line7, 1_000);
  assertEquals(pdf?.[1].line30, forms[1].line30);
});

Deno.test("mixed spouse elections reject source, ordinary-income, and tax tampering", () => {
  const pending = mixedReturn().pending;
  assertThrows(() =>
    mef.build(pending.form4972!, {
      filer,
      pending: {
        ...pending,
        f1099r: {
          f1099rs: [
            { ...source("T"), box3_capital_gain: 4_999 },
            source("S"),
          ],
        },
      },
    })
  );
  assertThrows(() =>
    form4972Pdf.instances?.(pending.form4972!, filer, {
      ...pending,
      f1040: { ...pending.f1040, line5b_form4972_ordinary: 24_999 },
    })
  );
  assertThrows(() =>
    mef.build(pending.form4972!, {
      filer,
      pending: {
        ...pending,
        f1040: { ...pending.f1040, form4972_tax: 1 },
      },
    })
  );
});
