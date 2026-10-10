import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as HeaderStatus } from "../../../../../mef/header.ts";
import { FilingStatus as NodeStatus } from "../../../../../nodes/types.ts";
import {
  form8959 as form8959Node,
  type Form8959PrintFields,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/taxes/employment/form8959/index.ts";
import type { MefBuildContext } from "../../../form-descriptor.ts";
import { form8959 } from "./f8959.ts";
import { form8959Pdf } from "../../../../pdf/forms/taxes/employment/f8959.ts";
import { assertForm8959Absent } from "../../../../domains/taxes/employment/form8959/form8959-source.ts";

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

Deno.test("Form8959 replays both owners' Medicare tips after below-20 exclusions", () => {
  const form4137 = {
    taxpayer_ssn: "123456789",
    spouse_ssn: "987654321",
    w2_tip_sources: [
      {
        employee_ssn: "123456789",
        employer_name: "Cafe",
        employer_ein: "123456789",
        allocated_tips: 0,
        ss_wages_and_tips: 0,
      },
      {
        employee_ssn: "987654321",
        employer_name: "Restaurant",
        employer_ein: "234567890",
        allocated_tips: 0,
        ss_wages_and_tips: 0,
      },
    ],
    forms: [
      {
        recipient: "taxpayer",
        ss_wages_from_w2: 0,
        employers: [{
          name: "Cafe",
          ein: "123456789",
          tips_received: 5000,
          tips_reported: 1000,
        }],
        below_20_tip_months: [{
          employer_index: 1,
          month: 1,
          tips_received: 15,
          tips_reported: 0,
        }],
      },
      {
        recipient: "spouse",
        ss_wages_from_w2: 0,
        employers: [{
          name: "Restaurant",
          ein: "234567890",
          tips_received: 3000,
          tips_reported: 1000,
        }],
      },
    ],
  };
  const correct = fixture(NodeStatus.MFJ, {
    w2_medicare_wages: 250000,
    unreported_tips: 5985,
  });
  const context = {
    ...correct.context,
    pending: { ...correct.context.pending, form4137 },
  };
  assertStringIncludes(
    form8959.build(correct.fields, context),
    "<TotalUnreportedMedicareTipsAmt>5985</TotalUnreportedMedicareTipsAmt>",
  );
  assertEquals(
    form8959Pdf.projectFields!(correct.fields, { form4137 })
      .line2_unreported_tips,
    5985,
  );
  // A self-consistent recalculated Form8959 still cannot substitute full tip
  // income, one owner's amount, or an arbitrary amount for Medicare tips.
  for (const amount of [6000, 3985, 5986]) {
    const changed = fixture(NodeStatus.MFJ, {
      w2_medicare_wages: 250000,
      unreported_tips: amount,
    });
    assertThrows(
      () =>
        form8959.build(changed.fields, {
          ...changed.context,
          pending: { ...changed.context.pending, form4137 },
        }),
      Error,
      "unreported_tips differs from original source records",
    );
    assertThrows(
      () => form8959Pdf.projectFields!(changed.fields, { form4137 }),
      Error,
      "unreported_tips differs from original source records",
    );
  }
  assertForm8959Absent({}, {
    form4137,
    f1040: { filing_status: NodeStatus.Single },
  });
  const reclassified = (wages: number) => ({
    taxpayer_ssn: "123456789",
    forms: [{
      recipient: "taxpayer",
      employers: [{
        name: "Employer",
        tin_type: "ein",
        tin: "345678901",
        reason_code: "G",
        ss8_filed_date: "2025-04-01",
        ss8_filing_reference: "Synthetic SS8 review",
        form1099_received: false,
        wages,
      }],
    }],
  });
  assertForm8959Absent({}, {
    form4137,
    form8919: reclassified(240000),
    f1040: { filing_status: NodeStatus.MFJ },
  });
  // Each source separately is below the joint threshold; together they cross it.
  assertThrows(
    () =>
      assertForm8959Absent({}, {
        form4137,
        form8919: reclassified(249000),
        f1040: { filing_status: NodeStatus.MFJ },
      }),
    Error,
    "filing trigger exists without print lines",
  );
  assertThrows(
    () => assertForm8959Absent({}, { form4137 }),
    Error,
    "filing_status",
  );
});

Deno.test("Form8959 replays both owners' Form8919 wages without the Social Security cap", () => {
  const firm = {
    name: "Employer",
    tin_type: "ein",
    tin: "123456789",
    reason_code: "G",
    ss8_filed_date: "2025-04-01",
    ss8_filing_reference: "Synthetic SS8 review",
    form1099_received: false,
  };
  const form8919 = {
    taxpayer_ssn: "123456789",
    spouse_ssn: "987654321",
    forms: [
      { recipient: "taxpayer", employers: [{ ...firm, wages: 200000 }] },
      { recipient: "spouse", employers: [{ ...firm, wages: 30000 }] },
    ],
  };
  const correct = fixture(NodeStatus.MFJ, {
    w2_medicare_wages: 100000,
    wages_8919: 230000,
  });
  assertStringIncludes(
    form8959.build(correct.fields, {
      ...correct.context,
      pending: { ...correct.context.pending, form8919 },
    }),
    "<TotalWagesWithNoWithholdingAmt>230000</TotalWagesWithNoWithholdingAmt>",
  );
  assertEquals(
    form8959Pdf.projectFields!(correct.fields, { form8919 }).line3_wages_8919,
    230000,
  );
  for (const amount of [206100, 200000, 230001]) {
    const changed = fixture(NodeStatus.MFJ, {
      w2_medicare_wages: 100000,
      wages_8919: amount,
    });
    assertThrows(
      () =>
        form8959.build(changed.fields, {
          ...changed.context,
          pending: { ...changed.context.pending, form8919 },
        }),
      Error,
      "wages_8919 differs from original source records",
    );
    assertThrows(
      () => form8959Pdf.projectFields!(changed.fields, { form8919 }),
      Error,
      "wages_8919 differs from original source records",
    );
  }
  assertForm8959Absent({}, {
    form8919,
    f1040: { filing_status: NodeStatus.MFJ },
  });
  assertThrows(
    () =>
      assertForm8959Absent({}, {
        form8919,
        f1040: { filing_status: NodeStatus.Single },
      }),
    Error,
    "filing trigger exists without print lines",
  );
  assertThrows(
    () =>
      form8959Pdf.projectFields!({}, {
        form8919,
        f1040: { filing_status: NodeStatus.Single },
      }),
    Error,
    "filing trigger exists without print lines",
  );
  assertThrows(
    () => assertForm8959Absent({}, { form8919 }),
    Error,
    "filing_status",
  );
});

Deno.test("Form8959 replays Schedule SE scalar, farm-optional and both-owner deposits", () => {
  const cases = [
    {
      status: NodeStatus.Single,
      schedule_se: {
        net_profit_schedule_c: 300000,
        net_profit_schedule_f: -10000,
      },
      earnings: 267815,
      tax: 610,
    },
    {
      status: NodeStatus.Single,
      schedule_se: {
        net_profit_schedule_c: 300000,
        net_profit_schedule_f: -1000,
        gross_farm_income: 3000,
        farm_optional_method_elected: true,
      },
      earnings: 279050,
      tax: 711,
    },
    {
      status: NodeStatus.MFJ,
      schedule_se: {
        owner_identity: { primary_ssn: "123456789", spouse_ssn: "987654321" },
        owner_business_sources: [
          {
            recipient: "T",
            kind: "schedule_c",
            source_reference: "primary-profit",
            net_profit: 300000,
          },
          {
            recipient: "T",
            kind: "schedule_c",
            source_reference: "primary-loss",
            net_profit: -50000,
          },
          {
            recipient: "S",
            kind: "schedule_f",
            source_reference: "spouse-farm",
            net_profit: 100000,
          },
        ],
      },
      earnings: 323225,
      tax: 659,
    },
  ];
  for (const c of cases) {
    const correct = fixture(c.status, { se_income: c.earnings });
    const pending = { ...correct.context.pending, schedule_se: c.schedule_se };
    form8959.build(correct.fields, { ...correct.context, pending });
    assertEquals(
      form8959Pdf.projectFields!(correct.fields, pending).line18_total_tax,
      c.tax,
    );
    // Both a coordinated whole-dollar substitution and a hidden fractional
    // change must fail against the retained Schedule SE calculation.
    for (const amount of [c.earnings + 1000, c.earnings + 0.01]) {
      const changed = fixture(c.status, { se_income: amount });
      assertThrows(
        () => form8959.build(changed.fields, { ...changed.context, pending }),
        Error,
        "se_income differs from original source records",
      );
      assertThrows(
        () => form8959Pdf.projectFields!(changed.fields, pending),
        Error,
        "se_income differs from original source records",
      );
    }
    assertThrows(
      () =>
        assertForm8959Absent({}, {
          schedule_se: c.schedule_se,
          f1040: { filing_status: c.status },
        }),
      Error,
      "filing trigger exists without print lines",
    );
  }
  const combinedSources = {
    f1040: { filing_status: NodeStatus.MFJ },
    schedule_se: { net_profit_schedule_c: 200000 },
    form8919: {
      taxpayer_ssn: "123456789",
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "Employer",
          tin_type: "ein",
          tin: "123456789",
          reason_code: "G",
          ss8_filed_date: "2025-04-01",
          ss8_filing_reference: "Synthetic SS8 review",
          form1099_received: false,
          wages: 100000,
        }],
      }],
    },
  };
  assertForm8959Absent({}, {
    f1040: combinedSources.f1040,
    schedule_se: combinedSources.schedule_se,
  });
  assertForm8959Absent({}, {
    f1040: combinedSources.f1040,
    form8919: combinedSources.form8919,
  });
  assertThrows(
    () => assertForm8959Absent({}, combinedSources),
    Error,
    "filing trigger exists without print lines",
  );
  for (const net of [-1000, 100, 60000]) {
    assertForm8959Absent({}, {
      schedule_se: { net_profit_schedule_c: net },
      f1040: { filing_status: NodeStatus.Single },
    });
  }
});
