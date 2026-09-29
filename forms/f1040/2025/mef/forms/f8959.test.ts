import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as HeaderStatus } from "../../../mef/header.ts";
import { FilingStatus as NodeStatus } from "../../../nodes/types.ts";
import {
  form8959 as form8959Node,
  type Form8959PrintFields,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8959/index.ts";
import type { MefBuildContext } from "../form-descriptor.ts";
import { form8959 } from "./f8959.ts";

const headerStatus: Readonly<Record<NodeStatus, HeaderStatus>> = {
  [NodeStatus.Single]: HeaderStatus.Single,
  [NodeStatus.MFJ]: HeaderStatus.MarriedFilingJointly,
  [NodeStatus.MFS]: HeaderStatus.MarriedFilingSeparately,
  [NodeStatus.HOH]: HeaderStatus.HeadOfHousehold,
  [NodeStatus.QSS]: HeaderStatus.QualifyingSurvivingSpouse,
};

function fixture(
  status: NodeStatus,
  source: Record<string, unknown>,
): { fields: Form8959PrintFields; context: MefBuildContext } {
  const result = form8959Node.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({ filing_status: status, ...source }),
  );
  const form = result.outputs.find((output) => output.nodeType === "form8959");
  if (!form) throw new Error("Expected calculated Form 8959 print lines");
  const schedule2 = result.outputs.find((output) =>
    output.nodeType === "schedule2"
  );
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040");
  const pending: Record<string, unknown> = { f1040: f1040?.fields ?? {} };
  if (schedule2) pending.schedule2 = schedule2.fields;
  return {
    fields: {
      filing_status: status,
      ...source,
      ...form.fields,
    } as unknown as Form8959PrintFields,
    context: {
      filer: {
        primarySSN: "123456789",
        nameLine1: "SMITH JOHN",
        nameControl: "SMIT",
        fullName: "John Smith",
        address: {
          line1: "1 MAIN ST",
          city: "AUSTIN",
          state: "TX",
          zip: "78701",
        },
        filingStatus: headerStatus[status],
      },
      pending,
    },
  };
}

Deno.test("Form 8959 accepts only a complete calculated print record", () => {
  assertEquals(form8959.build([]), "");
  assertEquals(
    form8959.build({
      filing_status: NodeStatus.Single,
      w2_medicare_wages: 100,
    }),
    "",
  );
  assertThrows(
    () =>
      form8959.build({
        filing_status: NodeStatus.Single,
        w2_medicare_wages: 250_000,
      }),
    Error,
    "filing trigger exists without print lines",
  );
  assertThrows(
    () =>
      form8959.build({
        filing_status: NodeStatus.MFJ,
        w2_medicare_wages: 220_000,
        w2_single_over_withholding_threshold: true,
      }),
    Error,
    "filing trigger exists without print lines",
  );
  assertThrows(
    () => form8959.build({ medicare_wages: 250_000 }),
    Error,
  );
  assertThrows(
    () => form8959.build({ medicare_wages_box5: 250_000 }),
    Error,
  );
  assertThrows(
    () =>
      form8959.build({
        filing_status: NodeStatus.Single,
        line4_total_medicare_wages: 250_000,
      }),
    Error,
  );
});

Deno.test("Form 8959 source-only omission checks original W-2 and substitute triggers", () => {
  const w2 = {
    w2s: [{
      box1_wages: 210_000,
      box2_fed_withheld: 0,
      box5_medicare_wages: 210_000,
      box6_medicare_withheld: 3_045,
    }],
  };
  assertThrows(
    () =>
      form8959.build({ filing_status: NodeStatus.MFJ }, {
        pending: { w2 },
      }),
    Error,
    "original source records",
  );
  assertThrows(
    () => form8959.build({}, { pending: { w2 } }),
    Error,
    "original source records",
  );
  assertThrows(
    () => form8959.build([], { pending: { w2 } }),
    Error,
    "original source records",
  );
  const f4852 = {
    f4852s: [{
      form_type: "W2",
      payer_name: "Employer",
      wages: 210_000,
      medicare_wages: 210_000,
      medicare_withheld: 3_045,
    }],
  };
  assertThrows(
    () =>
      form8959.build({ filing_status: NodeStatus.MFJ }, {
        pending: { f4852 },
      }),
    Error,
    "original source records",
  );
  assertEquals(
    form8959.build({
      filing_status: NodeStatus.Single,
      w2_medicare_wages: 100,
      w2_medicare_withheld: 1.45,
    }, {
      pending: {
        w2: {
          w2s: [{
            box1_wages: 100,
            box2_fed_withheld: 0,
            box5_medicare_wages: 100,
            box6_medicare_withheld: 1.45,
          }],
        },
      },
    }),
    "",
  );
});

Deno.test("Form 8959 emits exact Part I, II, III, IV and V print lines", () => {
  const { fields, context } = fixture(NodeStatus.Single, {
    w2_medicare_wages: 210_000,
    unreported_tips: 4_000,
    wages_8919: 2_000,
    se_income: 30_000,
    w2_rrta_wages: 250_000,
    w2_medicare_withheld: 3_500,
    w2_rrta_medicare_withheld: 60,
  });
  const xml = form8959.build(fields, context);
  assertStringIncludes(
    xml,
    "<FilingStatusThresholdCd>200000</FilingStatusThresholdCd>",
  );
  assertStringIncludes(
    xml,
    "<TotalW2MedicareWagesAndTipsAmt>210000</TotalW2MedicareWagesAndTipsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnreportedMedicareTipsAmt>4000</TotalUnreportedMedicareTipsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalWagesWithNoWithholdingAmt>2000</TotalWagesWithNoWithholdingAmt>",
  );
  assertStringIncludes(
    xml,
    `<TotalMedicareWagesAndTipsAmt>${fields.line4_total_medicare_wages}</TotalMedicareWagesAndTipsAmt>`,
  );
  assertStringIncludes(
    xml,
    `<AdditionalMedicareTaxAmt>${fields.line7_wage_tax}</AdditionalMedicareTaxAmt>`,
  );
  assertStringIncludes(
    xml,
    `<MedcrWagesTipsBelowThrshldAmt>${fields.line11_reduced_se_threshold}</MedcrWagesTipsBelowThrshldAmt>`,
  );
  assertStringIncludes(
    xml,
    `<SEIncomeSubjToAddSETaxAmt>${fields.line12_se_excess}</SEIncomeSubjToAddSETaxAmt>`,
  );
  assertStringIncludes(
    xml,
    `<AddlSelfEmploymentTaxAmt>${fields.line13_se_tax}</AddlSelfEmploymentTaxAmt>`,
  );
  assertStringIncludes(
    xml,
    `<RRTCompSubjToAddRRTTaxAmt>${fields.line16_rrta_excess}</RRTCompSubjToAddRRTTaxAmt>`,
  );
  assertStringIncludes(
    xml,
    `<AddlRailroadRetirementTaxAmt>${fields.line17_rrta_tax}</AddlRailroadRetirementTaxAmt>`,
  );
  assertStringIncludes(
    xml,
    `<TotalAMRRTTaxAmt>${fields.line18_total_tax}</TotalAMRRTTaxAmt>`,
  );
  assertStringIncludes(
    xml,
    `<TotalMedicareTaxAmt>${fields.line21_regular_medicare_tax}</TotalMedicareTaxAmt>`,
  );
  assertStringIncludes(
    xml,
    `<AddnlMedicareTaxWithholdingAmt>${fields.line22_additional_withheld}</AddnlMedicareTaxWithholdingAmt>`,
  );
  assertStringIncludes(
    xml,
    `<TotalW2AddlRRTTaxAmt>${fields.line23_rrta_withheld}</TotalW2AddlRRTTaxAmt>`,
  );
  assertStringIncludes(
    xml,
    `<AddlMedcrRRTTaxWithholdingAmt>${fields.line24_total_withheld}</AddlMedcrRRTTaxWithholdingAmt>`,
  );
  assertEquals(
    xml.indexOf("<AdditionalTaxGrp>") <
      xml.indexOf("<TotalW2MedicareTaxWithheldAmt>"),
    true,
  );
});

Deno.test("Form 8959 files a zero-tax joint return for a single W-2 trigger", () => {
  const { fields, context } = fixture(NodeStatus.MFJ, {
    w2_medicare_wages: 220_000,
    w2_single_over_withholding_threshold: true,
    w2_medicare_withheld: 3_190,
  });
  const xml = form8959.build(fields, context);
  assertEquals(fields.line18_total_tax, 0);
  assertStringIncludes(
    xml,
    "<FilingStatusThresholdCd>250000</FilingStatusThresholdCd>",
  );
  assertStringIncludes(xml, "<TotalAMRRTTaxAmt>0</TotalAMRRTTaxAmt>");
});

Deno.test("Form 8959 files additional withholding with zero tax", () => {
  const { fields, context } = fixture(NodeStatus.Single, {
    w2_medicare_wages: 150_000,
    w2_medicare_withheld: 2_200,
  });
  const xml = form8959.build(fields, context);
  assertEquals(fields.line18_total_tax, 0);
  assertEquals(fields.line24_total_withheld, 25);
  assertStringIncludes(
    xml,
    "<AddlMedcrRRTTaxWithholdingAmt>25</AddlMedcrRRTTaxWithholdingAmt>",
  );
});

Deno.test("Form 8959 rounds aggregate source cents once before native projection", () => {
  const { fields, context } = fixture(NodeStatus.Single, {
    w2_medicare_wages: 367_934.84,
    w2_medicare_withheld: 6_846.47,
  });
  assertEquals(fields.line1_medicare_wages, 367_935);
  assertEquals(fields.line7_wage_tax, 1_511);
  assertEquals(fields.line18_total_tax, 1_511);
  assertEquals(fields.line24_total_withheld, 1_511);
  const xml = form8959.build(fields, context);
  assertStringIncludes(xml, "<TotalAMRRTTaxAmt>1511</TotalAMRRTTaxAmt>");
  assertEquals(xml.includes("367934.84"), false);
});

Deno.test("Form 8959 rejects changed print lines and return joins", () => {
  const { fields, context } = fixture(NodeStatus.Single, {
    w2_medicare_wages: 250_000,
    w2_medicare_withheld: 4_075,
  });
  for (
    const key of [
      "line4_total_medicare_wages",
      "line11_reduced_se_threshold",
      "line18_total_tax",
      "line21_regular_medicare_tax",
      "line24_total_withheld",
    ] as const
  ) {
    assertThrows(
      () => form8959.build({ ...fields, [key]: fields[key] + 1 }, context),
      Error,
      key,
    );
  }
  assertThrows(
    () => form8959.build({ ...fields, line7_wage_tax: 450.5 }, context),
    Error,
  );
  assertThrows(
    () => form8959.build({ ...fields, medicare_wages: 249_999 }, context),
    Error,
    "medicare_wages",
  );
  assertThrows(
    () =>
      form8959.build(fields, {
        ...context,
        pending: {
          ...context.pending,
          schedule2: { line11_additional_medicare: 0 },
        },
      }),
    Error,
    "Schedule 2 line 11",
  );
  assertThrows(
    () =>
      form8959.build(fields, {
        ...context,
        pending: {
          ...context.pending,
          f1040: { line25c_additional_medicare_withheld: 0 },
        },
      }),
    Error,
    "Form 1040 line 25c",
  );
  assertThrows(
    () => form8959.build(fields, { ...context, filer: undefined }),
    Error,
    "finalized filer",
  );
});

Deno.test("Form 8959 rejects changed upstream source deposits", () => {
  const { fields, context } = fixture(NodeStatus.Single, {
    w2_medicare_wages: 160_000,
    f4852_medicare_wages: 20_000,
    household_medicare_wages: 25_000,
    unreported_tips: 1_000,
    wages_8919: 2_000,
    se_income: 5_000,
    w2_rrta_wages: 210_000,
    ct2_rrta_wages: 10_000,
    taxpayer_ssn: "123456789",
    ct2_taxpayer_ssn: "123456789",
    w2_medicare_withheld: 2_400,
    f4852_medicare_withheld: 300,
    household_medicare_withheld: 400,
    w2_rrta_medicare_withheld: 90,
    ct2_rrta_medicare_tax_paid: 90,
  });
  for (
    const sourceKey of [
      "w2_medicare_wages",
      "f4852_medicare_wages",
      "household_medicare_wages",
      "unreported_tips",
      "wages_8919",
      "se_income",
      "w2_rrta_wages",
      "ct2_rrta_wages",
      "w2_medicare_withheld",
      "f4852_medicare_withheld",
      "household_medicare_withheld",
      "w2_rrta_medicare_withheld",
      "ct2_rrta_medicare_tax_paid",
    ] as const
  ) {
    assertThrows(
      () =>
        form8959.build(
          {
            ...fields,
            [sourceKey]:
              (fields as Record<string, unknown>)[sourceKey] as number +
              1,
          },
          context,
        ),
      Error,
      "upstream source deposits",
    );
  }
  assertThrows(
    () => form8959.build({ ...fields, line2_unreported_tips: 1_001 }, context),
    Error,
    "upstream source deposits",
  );
});

Deno.test("Form 8959 rejects substitute and household source-record drift", () => {
  const { fields, context } = fixture(NodeStatus.Single, {
    f4852_medicare_wages: 210_000,
    household_medicare_wages: 10_000,
    f4852_medicare_withheld: 3_100,
    household_medicare_withheld: 150,
    f4852_single_over_withholding_threshold: true,
  });
  const f4852 = {
    f4852s: [{
      form_type: "W2",
      payer_name: "Employer",
      wages: 210_000,
      medicare_wages: 210_000,
      medicare_withheld: 3_100,
    }],
  };
  const household = {
    household_wages: [{
      wages_received: 10_000,
      medicare_wages: 10_000,
      medicare_tax_withheld: 150,
    }],
  };
  const pending = { ...context.pending, f4852, household_wages: household };
  form8959.build(fields, { ...context, pending });
  assertThrows(
    () =>
      form8959.build(fields, {
        ...context,
        pending: {
          ...pending,
          f4852: {
            f4852s: [{ ...f4852.f4852s[0], medicare_wages: 209_999 }],
          },
        },
      }),
    Error,
    "original source records",
  );
  assertThrows(
    () =>
      form8959.build(fields, {
        ...context,
        pending: {
          ...pending,
          household_wages: {
            household_wages: [{
              ...household.household_wages[0],
              medicare_tax_withheld: 149,
            }],
          },
        },
      }),
    Error,
    "original source records",
  );
});
