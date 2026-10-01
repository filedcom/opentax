import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "./registry.ts";
import { DistributionCode } from "../nodes/inputs/f1099r/index.ts";
import { FilingStatus } from "../mef/header.ts";
import { form4972 as mef } from "./mef/forms/f4972.ts";
import { form4972Pdf } from "./pdf/forms/f4972.ts";

const plan = buildExecutionPlan(registry);
const payer = { payer_name: "Old Plan", payer_ein: "123456789" };
const planFacts = (owner: "T" | "S") => ({
  participant_name: owner === "T" ? "Alex Taxpayer" : "Blair Taxpayer",
  participant_ssn: owner === "T" ? "123456789" : "987654321",
  plan_reference: `plan-${owner}`,
  full_balance_statement_reference: `full-balance-${owner}`,
  all_qualified_distributions_included: true as const,
});
const source = (owner: "T" | "S", number: number, amount: number) => ({
  ...payer,
  source_document_reference: `1099-R-${owner}-${number}`,
  form4972_plan: planFacts(owner),
  box1_gross_distribution: amount,
  box2a_taxable_amount: amount,
  box9a_pct_total: 100,
  box7_distribution_code: DistributionCode.CodeA,
  ts: owner,
  exclude_4972: true,
});
const election = (owner: "T" | "S", references: string[]) => ({
  source_document_references: references,
  participant_name: planFacts(owner).participant_name,
  participant_ssn: planFacts(owner).participant_ssn,
  plan_reference: planFacts(owner).plan_reference,
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: false,
  participant_five_year_member: true,
  prior_election_after_1986: false,
  elect_10yr_averaging: true,
});
const filer = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "Alex Taxpayer",
  nameControl: "TAXP",
  spouse: { firstName: "Blair", lastName: "Taxpayer", ssn: "987654321" },
  filingStatus: FilingStatus.MarriedFilingJointly,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};
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

function threeSourceReturn(pairOwner: "T" | "S") {
  const singleOwner = pairOwner === "T" ? "S" : "T";
  return execute(plan, registry, {
    general,
    f1099r: [
      source(pairOwner, 1, 20_000),
      source(pairOwner, 2, 25_000),
      source(singleOwner, 1, 30_000),
    ],
    form4972: {
      elections: [
        election(pairOwner, [
          `1099-R-${pairOwner}-1`,
          `1099-R-${pairOwner}-2`,
        ]),
        election(singleOwner, [`1099-R-${singleOwner}-1`]),
      ],
    },
  }, { taxYear: 2025, formType: "f1040" });
}

for (const pairOwner of ["T", "S"] as const) {
  Deno.test(`Form 4972 joint ${pairOwner} two-copy plan and other spouse one-copy plan`, () => {
    const result = threeSourceReturn(pairOwner);
    assertEquals(result.diagnostics, []);
    const pending = result.pending;
    const forms = pending.form4972?.forms as Record<string, unknown>[];
    assertEquals(forms.length, 2);
    assertEquals(
      pending.f1040?.form4972_tax,
      forms.reduce((sum, form) => sum + (form.line30 as number), 0),
    );
    assertEquals(pending.f1040?.line5b_pension_taxable ?? 0, 0);
    const xml = mef.build(pending.form4972!, { filer, pending });
    const pdf = form4972Pdf.instances?.(pending.form4972!, filer, pending);
    assertEquals(xml.length, 2);
    assertEquals(pdf?.length, 2);
    assertEquals(
      xml.some((form) => form.includes("<SSN>123456789</SSN>")),
      true,
    );
    assertEquals(
      xml.some((form) => form.includes("<SSN>987654321</SSN>")),
      true,
    );
    assertEquals(
      pdf?.map((form) => form.line30),
      forms.map((form) => form.line30),
    );
    assertThrows(() =>
      mef.build(pending.form4972!, {
        filer,
        pending: {
          ...pending,
          f1099r: {
            f1099rs: (pending.f1099r?.f1099rs as Record<string, unknown>[])
              .map((item) =>
                item.source_document_reference === `1099-R-${pairOwner}-2`
                  ? { ...item, box2a_taxable_amount: 24_999 }
                  : item
              ),
          },
        },
      })
    );
    assertThrows(() =>
      form4972Pdf.instances?.(pending.form4972!, filer, {
        ...pending,
        f1040: { ...pending.f1040, form4972_tax: 1 },
      })
    );
  });
}
