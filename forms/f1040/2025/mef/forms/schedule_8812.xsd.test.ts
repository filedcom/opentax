import { assert, assertEquals, assertThrows } from "@std/assert";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { schedule8812 } from "./schedule_8812.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

const worksheet = {
  schedule3_line1: 0,
  schedule3_line2: 0,
  schedule3_line3: 0,
  schedule3_line4: 0,
  schedule3_line5b: 0,
  schedule3_line6d: 0,
  schedule3_line6f: 0,
  schedule3_line6l: 0,
  schedule3_line6m: 0,
  worksheet_b_applies: false,
};

const basicFields = {
  f8812s: [{
    qualifying_children_count: 1,
    other_dependents_count: 1,
    agi: 50_000,
    filing_status: NodeFilingStatus.Single,
    income_tax_liability: 1_000,
    earned_income: 10_000,
  }],
  credit_limit_worksheet: worksheet,
  line18a_earned_income: 10_000,
};

const matchedContext = {
  filer,
  pending: {
    f1040: {
      line11_agi: 50_000,
      line18_total_tax_before_credits: 1_000,
      line19_child_tax_credit: 1_000,
      line28_actc: 1_125,
    },
  },
};

async function validateXsd(xml: string): Promise<void> {
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, xml);
    const output = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
}

Deno.test("Schedule 8812 XML uses paper lines and direct 1040 credits", () => {
  const xml = schedule8812.build(basicFields, matchedContext);
  assert(
    xml.includes(
      "<QlfyChildUnderAgeSSNLimtAmt>2200</QlfyChildUnderAgeSSNLimtAmt>",
    ),
  );
  assert(
    xml.includes("<OtherDependentCreditAmt>500</OtherDependentCreditAmt>"),
  );
  assert(xml.includes("<CTCODCAmt>1000</CTCODCAmt>"));
  assert(
    xml.includes(
      "<AdditionalChildTaxCreditAmt>1125</AdditionalChildTaxCreditAmt>",
    ),
  );
});

Deno.test("Schedule 8812 MeF rejects explicit AGI or tax limit that differs from return-derived sources", () => {
  assertThrows(
    () =>
      schedule8812.build({
        ...basicFields,
        auto_qualifying_children: 1,
        auto_other_dependents: 1,
        auto_filing_status: NodeFilingStatus.Single,
        auto_agi: 250_000,
        auto_income_tax_liability: 1_000,
      }),
    Error,
    "AGI differs from Form 1040 line 11a",
  );
  assertThrows(
    () =>
      schedule8812.build({
        ...basicFields,
        auto_qualifying_children: 1,
        auto_other_dependents: 1,
        auto_filing_status: NodeFilingStatus.Single,
        auto_agi: 50_000,
        auto_income_tax_liability: 500,
      }),
    Error,
    "tax limit differs from Form 1040 line 18",
  );
});

Deno.test("Schedule 8812 MeF requires finalized return facts for a positive credit", () => {
  assertThrows(
    () => schedule8812.build(basicFields),
    Error,
    "needs finalized Form 1040 AGI, line 18 tax, and filer status",
  );
  assertThrows(
    () => schedule8812.build(basicFields, { filer, pending: {} }),
    Error,
    "needs finalized Form 1040 AGI, line 18 tax, and filer status",
  );
  assertThrows(
    () => schedule8812.build(basicFields, {
      ...matchedContext,
      pending: {
        f1040: {
          line11_agi: 50_000,
          line19_child_tax_credit: 1_000,
          line28_actc: 1_125,
        },
      },
    }),
    Error,
    "needs finalized Form 1040 AGI, line 18 tax, and filer status",
  );
});

Deno.test("Schedule 8812 MeF reconciles header, AGI, tax, and both credit lines", () => {
  assertThrows(
    () => schedule8812.build(basicFields, {
      ...matchedContext,
      filer: { ...filer, filingStatus: FilingStatus.MarriedFilingJointly },
    }),
    Error,
    "filing status differs from the return header",
  );
  assertThrows(
    () => schedule8812.build(basicFields, {
      ...matchedContext,
      pending: { f1040: { ...matchedContext.pending.f1040, line11_agi: 51_000 } },
    }),
    Error,
    "AGI differs from finalized Form 1040 line 11a",
  );
  assertThrows(
    () => schedule8812.build(basicFields, {
      ...matchedContext,
      pending: {
        f1040: {
          ...matchedContext.pending.f1040,
          line18_total_tax_before_credits: 500,
        },
      },
    }),
    Error,
    "tax limit differs from finalized Form 1040 line 18",
  );
  assertThrows(
    () => schedule8812.build(basicFields, {
      ...matchedContext,
      pending: {
        f1040: { ...matchedContext.pending.f1040, line19_child_tax_credit: 900 },
      },
    }),
    Error,
    "credits differ from finalized Form 1040 lines 19 and 28",
  );
  assertThrows(
    () => schedule8812.build(basicFields, {
      ...matchedContext,
      pending: { f1040: { ...matchedContext.pending.f1040, line28_actc: 1_000 } },
    }),
    Error,
    "credits differ from finalized Form 1040 lines 19 and 28",
  );
});

Deno.test("Schedule 8812 XML accepts verified line 18a from the input item", () => {
  const xml = schedule8812.build({
    ...basicFields,
    line18a_earned_income: undefined,
    f8812s: [{ ...basicFields.f8812s[0], line18a_earned_income: 10_000 }],
  }, matchedContext);
  assert(xml.includes("<TotalEarnedIncomeAmt>10000</TotalEarnedIncomeAmt>"));
});

Deno.test("Schedule 8812 XML computes line 18a from the full worksheet", () => {
  const xml = schedule8812.build({
    ...basicFields,
    line18a_earned_income: undefined,
    earned_income_worksheet: {
      form1040_line1z_wages: 10_000,
      nontaxable_combat_pay: 0,
      schedule_c_statutory_employee_income: 0,
      nonfarm_schedule_c_and_k1_net: 0,
      farm_schedule_f_and_k1_net: 0,
      farm_optional_method_used: false,
      excluded_medicaid_waiver_payments: 0,
      schedule1_line15_se_deduction: 0,
    },
  }, matchedContext);
  assert(xml.includes("<TotalEarnedIncomeAmt>10000</TotalEarnedIncomeAmt>"));
});

Deno.test("Schedule 8812 XML accepts credit-limit worksheet on input item", () => {
  const xml = schedule8812.build({
    ...basicFields,
    credit_limit_worksheet: undefined,
    f8812s: [{
      ...basicFields.f8812s[0],
      credit_limit_worksheet: worksheet,
    }],
  }, matchedContext);
  assert(xml.includes("<CTCODCAmt>1000</CTCODCAmt>"));
});

Deno.test("Schedule 8812 XML rejects missing worksheet facts", () => {
  assertThrows(
    () =>
      schedule8812.build({
        ...basicFields,
        credit_limit_worksheet: undefined,
      }),
    Error,
    "needs complete Credit Limit Worksheet",
  );
  assertThrows(
    () =>
      schedule8812.build({
        ...basicFields,
        line18a_earned_income: undefined,
      }),
    Error,
    "needs verified line 18a",
  );
  assertThrows(
    () =>
      schedule8812.build({
        ...basicFields,
        f8812s: [{
          ...basicFields.f8812s[0],
          qualifying_children_count: 3,
          income_tax_liability: 0,
        }],
      }),
    Error,
    "Part II-B needs its W-2",
  );
});

Deno.test({
  name: "XSD: Schedule 8812 Part I, II-A and II-B validate in TY2025 return",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: {
      line11_agi: 50_000,
      line18_total_tax_before_credits: 0,
      line28_actc: 3_300,
    },
    f8812: {
      ...basicFields,
      f8812s: [{
        ...basicFields.f8812s[0],
        qualifying_children_count: 3,
        other_dependents_count: 1,
        income_tax_liability: 0,
      }],
      part_iib: {
        line21_w2_withheld_social_security_medicare: 3_000,
        schedule1_line15: 500,
        schedule2_line5: 0,
        schedule2_line6: 0,
        schedule2_line13: 0,
        form1040_line27a_eic: 200,
        schedule3_line11_adoption_credit: 0,
      },
    },
  }, filer);
  assert(xml.includes("<FromTaxReturnAmt>500</FromTaxReturnAmt>"));
  assert(
    xml.includes(
      "<AdditionalChildTaxCreditAmt>3300</AdditionalChildTaxCreditAmt>",
    ),
  );
  await validateXsd(xml);
});
