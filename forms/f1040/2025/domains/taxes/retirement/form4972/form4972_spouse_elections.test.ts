import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../registry.ts";
import { DistributionCode } from "../../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { form4972 as mef } from "../../../../mef/forms/taxes/retirement/f4972.ts";
import { form4972Pdf } from "../../../../pdf/forms/taxes/retirement/f4972.ts";

const plan = buildExecutionPlan(registry);
const payer = { payer_name: "Old Plan", payer_ein: "123456789" };
const planFacts = (owner: "T" | "S") => ({
  participant_name: owner === "T" ? "Alex Taxpayer" : "Blair Taxpayer",
  participant_ssn: owner === "T" ? "123456789" : "987654321",
  plan_reference: `plan-${owner}`,
  full_balance_statement_reference: `full-balance-${owner}`,
  all_qualified_distributions_included: true as const,
});
const source = (owner: "T" | "S", amount: number) => ({
  ...payer,
  source_document_reference: `1099-R-${owner}`,
  form4972_plan: planFacts(owner),
  box1_gross_distribution: amount,
  box2a_taxable_amount: amount,
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
  elect_10yr_averaging: true,
});
const filer = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "Alex Taxpayer",
  nameControl: "TAXP",
  spouse: {
    firstName: "Blair",
    lastName: "Taxpayer",
    ssn: "987654321",
    nameControl: "TAXP",
  },
  filingStatus: FilingStatus.MarriedFilingJointly,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};
const general = {
  filing_status: "mfj",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "123456789",
  taxpayer_dob: "1930-01-01",
  spouse_first_name: "Blair",
  spouse_last_name: "Taxpayer",
  spouse_ssn: "987654321",
  spouse_dob: "1931-01-01",
};

function pairedReturn() {
  return execute(plan, registry, {
    general,
    f1099r: [source("T", 30_000), source("S", 40_000)],
    form4972: { elections: [election("T"), election("S")] },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("Form 4972 joint spouses retain separate tax and native/PDF forms", () => {
  const result = pairedReturn();
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const forms = pending.form4972?.forms as Record<string, unknown>[];
  assertEquals((pending.form4972?.elections as unknown[]).length, 2);
  assertEquals((pending.form4972?.source_forms as unknown[]).length, 2);
  assertEquals(forms.length, 2);
  assertEquals(forms.map((form) => form.recipient), ["T", "S"]);
  assertEquals(
    pending.f1040?.form4972_tax,
    (forms[0].line30 as number) + (forms[1].line30 as number),
  );
  assertEquals(pending.f1040?.line5b_pension_taxable ?? 0, 0);
  const xml = mef.build(pending.form4972!, { filer, pending });
  assertEquals(xml.length, 2);
  assertEquals(xml[0].includes("<SSN>123456789</SSN>"), true);
  assertEquals(xml[1].includes("<SSN>987654321</SSN>"), true);
  const pdf = form4972Pdf.instances?.(pending.form4972!, filer, pending);
  assertEquals(pdf?.length, 2);
  assertEquals(pdf?.map((form) => form.recipient_ssn), [
    "123456789",
    "987654321",
  ]);
  assertEquals(
    pdf?.map((form) => form.line30),
    forms.map((form) => form.line30),
  );
});

Deno.test("Form 4972 joint spouse collection rejects source, plan, and return tampering", () => {
  const result = pairedReturn();
  const pending = result.pending;
  assertThrows(() =>
    mef.build(pending.form4972!, {
      filer,
      pending: {
        ...pending,
        f1040: { ...pending.f1040, form4972_tax: 1 },
      },
    })
  );
  assertThrows(() =>
    form4972Pdf.instances?.(pending.form4972!, filer, {
      ...pending,
      f1099r: {
        f1099rs: [source("T", 30_000), {
          ...source("S", 40_000),
          form4972_plan: { ...planFacts("S"), participant_ssn: "123456789" },
        }],
      },
    })
  );
  assertThrows(() =>
    mef.build({
      ...pending.form4972,
      elections: [
        (pending.form4972?.elections as Record<string, unknown>[])[0],
        {
          ...(pending.form4972?.elections as Record<string, unknown>[])[1],
          participant_ssn: "123456789",
        },
      ],
    }, { filer, pending })
  );
  assertThrows(() =>
    mef.build(pending.form4972!, {
      filer,
      pending: {
        ...pending,
        f1099r: { f1099rs: [source("T", 30_000)] },
      },
    })
  );
});

function pairedNuaReturn() {
  return execute(plan, registry, {
    general,
    f1099r: [
      {
        ...source("T", 30_000),
        box1_gross_distribution: 35_000,
        box6_nua: 5_000,
      },
      source("S", 40_000),
    ],
    form4972: {
      elections: [
        { ...election("T"), elect_include_nua: true },
        election("S"),
      ],
    },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("Form 4972 spouse pair keeps one full-share NUA election on its own Part III form", () => {
  const result = pairedNuaReturn();
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const forms = pending.form4972?.forms as Record<string, unknown>[];
  assertEquals(forms.map((form) => form.recipient), ["T", "S"]);
  assertEquals(forms[0].line8, 35_000);
  assertEquals(forms[0].line8_nua_included, 5_000);
  assertEquals(forms[1].line8, 40_000);
  assertEquals(pending.f1040?.line5b_form4972_ordinary ?? 0, 0);
  assertEquals(
    pending.f1040?.form4972_tax,
    Number(forms[0].line30) + Number(forms[1].line30),
  );
  const native = mef.build(pending.form4972!, { filer, pending });
  assertEquals(native.length, 2);
  assertEquals(
    native[0].includes(
      'netUnrealizedAppreciationAmt="5000"',
    ),
    true,
  );
  const pdf = form4972Pdf.instances?.(pending.form4972!, filer, pending);
  assertEquals(pdf?.map((form) => form.recipient_ssn), [
    "123456789",
    "987654321",
  ]);
  assertEquals(pdf?.[0].line8_nua_included, 5_000);
  assertEquals(pdf?.[1].line8_nua_included, undefined);
});

Deno.test("Form 4972 spouse NUA pair rejects altered source, form, and combined tax", () => {
  const pending = pairedNuaReturn().pending;
  const changedSource = {
    ...pending,
    f1099r: {
      f1099rs: [
        {
          ...source("T", 30_000),
          box1_gross_distribution: 35_000,
          box6_nua: 4_999,
        },
        source("S", 40_000),
      ],
    },
  };
  assertThrows(() =>
    mef.build(pending.form4972!, { filer, pending: changedSource })
  );
  assertThrows(() =>
    form4972Pdf.instances?.(pending.form4972!, filer, changedSource)
  );
  const forms = pending.form4972?.forms as Record<string, unknown>[];
  assertThrows(() =>
    mef.build({
      ...pending.form4972,
      forms: [{ ...forms[0], line8: 34_999 }, forms[1]],
    }, { filer, pending })
  );
  assertThrows(() =>
    form4972Pdf.instances?.(pending.form4972!, filer, {
      ...pending,
      f1040: { ...pending.f1040, form4972_tax: 1 },
    })
  );
});
