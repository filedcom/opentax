import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { registry } from "../registry.ts";
import { pdfReviewFixtures } from "../pdf/review-fixtures.ts";
import { buildMefBundle, buildMefXml as rawBuildMefXml } from "./builder.ts";
import { FilingStatus } from "./types.ts";
import type { FilerIdentity } from "./types.ts";
import { additionalQmidLines } from "./forms/f5695_qmid_attachment.ts";
import { FilingStatus as NodeFilingStatus, TS } from "../../nodes/types.ts";
import { calculateOwnerForms } from "../../nodes/intermediate/forms/form5329/index.ts";
import {
  form4972 as form4972Node,
  inputSchema as form4972InputSchema,
} from "../../nodes/intermediate/forms/form4972/index.ts";
import { DistributionCode } from "../../nodes/inputs/f1099r/index.ts";
import {
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
} from "../../nodes/intermediate/forms/form_1116/index.ts";

const sampleForm1116 = {
  foreign_tax_paid: 800,
  total_income: 50_000,
  worldwide_gross_income: 100_000,
  general_deductions: 0,
  standard_or_itemized_deduction: 0,
  us_tax_before_credits: 5_000,
  category_summaries: [{
    category: IncomeCategory.Passive,
    items: [{
      foreign_tax_paid: 800,
      foreign_gross_income: 10_000,
      income_category: IncomeCategory.Passive,
      irs_country_code: "CA",
      tax_paid_or_accrued_date: "2025-11-01",
      tax_kind: ForeignTaxKind.Interest,
      tax_credit_method: ForeignTaxCreditMethod.Paid,
    }],
    foreignTaxPaid: 800,
    foreignGrossIncome: 10_000,
    includedForeignIncome: 10_000,
    directlyAllocableDeductions: 0,
    explicitlyApportionedDeductions: 0,
    automaticallyApportionedDeductions: 0,
    foreignTaxableIncome: 10_000,
    allowedCredit: 800,
    currentYearExcessTax: 0,
  }],
};

const sampleScheduleF = {
  schedule_fs: [{
    line_a_principal_crop_activity: "GRAIN FARMING",
    line_b_agricultural_activity_code: "111100" as const,
    line_e_material_participation: true,
    accounting_method: "cash" as const,
    line1_sales_livestock_resale: 0,
    line2_sales_products_raised: 2_000,
  }],
};

const sampleForm8889 = {
  forms: [{
    owner: "primary" as const,
    beneficiary_name: "John A Smith",
    beneficiary_ssn: "123456789",
    print_line1_coverage: "self_only",
    print_line2_taxpayer_contributions: 3_600,
    print_line3_limit: 4_300,
    print_line5: 4_300,
    print_line6: 4_300,
    print_line8: 4_300,
    print_line12: 4_300,
    print_line13_deduction: 3_600,
  }],
};

// Complete graph print output for one single-filer $250,000 Medicare W-2.
// Form 8959 no longer accepts a sparse summary in native XML tests.
const sampleForm8959 = {
  filing_status: NodeFilingStatus.Single,
  w2_medicare_wages: 250_000,
  medicare_wages: 250_000,
  line1_medicare_wages: 250_000,
  line2_unreported_tips: 0,
  line3_wages_8919: 0,
  line4_total_medicare_wages: 250_000,
  line5_threshold: 200_000,
  line6_wage_excess: 50_000,
  line7_wage_tax: 450,
  line8_se_income: 0,
  line9_threshold: 200_000,
  line10_medicare_wages: 250_000,
  line11_reduced_se_threshold: 0,
  line12_se_excess: 0,
  line13_se_tax: 0,
  line14_rrta_wages: 0,
  line15_threshold: 200_000,
  line16_rrta_excess: 0,
  line17_rrta_tax: 0,
  line18_total_tax: 450,
  line19_medicare_withheld: 0,
  line20_medicare_wages: 250_000,
  line21_regular_medicare_tax: 3_625,
  line22_additional_withheld: 0,
  line23_rrta_withheld: 0,
  line24_total_withheld: 0,
};

const sampleForm5329 = {
  owner_entries: [{ owner: TS.T, early_distribution: 5_000 }],
  owner_forms: calculateOwnerForms({
    owner_entries: [{ owner: TS.T, early_distribution: 5_000 }],
  }).forms,
};

const sampleForm2441 = {
  dep_care_benefits: 5000,
  agi: 50_000,
  filing_details: {
    filing_status: NodeFilingStatus.Single,
    care_providers: [{
      kind: "business" as const,
      name: "Daycare Center",
      name_control: "DAYC",
      ein: "123456789",
      us_address: {
        line1: "1 Child Care Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      household_employee: false,
      amount_paid: 5000,
    }],
    qualifying_people: [{
      first_name: "Child",
      last_name: "Smith",
      name_control: "SMIT",
      ssn: "123456789",
      credit_expenses_paid: 0,
    }],
    taxpayer_earned_income: 50_000,
    tax_liability_limit: 5000,
    dependent_care_plan_limit: 5000,
    total_qualified_expenses_incurred: 5000,
  },
};

const sampleForm8839 = {
  children: [{
    first_name: "Maya",
    last_name: "Smith",
    birth_year: 2020,
    ssn: "123456780",
    final_decree: {
      source_document_id: "decree-maya-2025",
      finalization_date: "2025-07-15",
      issuing_jurisdiction: "TX",
      child_origin: "US" as const,
    },
    expenses: [{
      source_document_id: "invoice-maya-2025",
      paid_date: "2025-03-12",
      category: "attorney_fee" as const,
      payee: "Adoption Counsel",
      amount: 15_000,
      reimbursed_amount: 0,
    }],
  }],
  filing_status: NodeFilingStatus.Single,
};

function sampleFiler(): FilerIdentity {
  return {
    primarySSN: "123456789",
    fullName: "John A Smith",
    nameLine1: "SMITH JOHN A",
    nameControl: "SMIT",
    address: {
      line1: "123 MAIN ST",
      city: "SPRINGFIELD",
      state: "IL",
      zip: "62701",
    },
    filingStatus: FilingStatus.Single,
  };
}

const qualifiedForm4972Input = {
  recipient: TS.T,
  born_before_1936: true,
  beneficiary_distribution: false,
  entire_balance_distributed: true,
  rolled_over_any: false,
  participant_five_year_member: true,
  prior_election_after_1986: false,
  lump_sum_amount: 30_000,
  capital_gain_amount: 5_000,
  elect_capital_gain: true,
  elect_10yr_averaging: true,
};
const qualifiedForm4972 = form4972Node.compute(
  { taxYear: 2025, formType: "f1040" },
  form4972InputSchema.parse(qualifiedForm4972Input),
).outputs[0].fields;
const qualifiedForm4972Source = {
  f1099r: {
    f1099rs: [{
      payer_name: "Qualified Plan",
      payer_ein: "123456789",
      box1_gross_distribution: 30_000,
      box2a_taxable_amount: 30_000,
      box3_capital_gain: 5_000,
      box7_distribution_code: DistributionCode.CodeA,
      ts: TS.T,
      exclude_4972: true,
    }],
  },
  f1040: {
    form4972_tax: qualifiedForm4972.line30 as number,
    line16_income_tax: qualifiedForm4972.line30 as number,
  },
};

const sampleForm8919 = {
  taxpayer_ssn: "123-45-6789",
  forms: [{
    recipient: "taxpayer" as const,
    employers: [{
      name: "Employer Inc",
      tin_type: "ein" as const,
      tin: "12-3456789",
      reason_code: "G" as const,
      ss8_filed_date: "2025-03-01",
      ss8_filing_reference: "SS-8 delivery receipt",
      form1099_received: false,
      wages: 45_000,
    }],
  }],
};

function buildMefXml(...args: Parameters<typeof rawBuildMefXml>): string {
  return rawBuildMefXml(
    args[0],
    args[1] ?? sampleFiler(),
    args[2],
    args[3],
    args[4],
  );
}

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(
    actual.includes(expected),
    false,
    `Expected NOT to include: ${expected}`,
  );
}

Deno.test("MeF export rejects Form 3800 credit without finalized source facts", () => {
  assertThrows(
    () => buildMefXml({ f3800: { allowed_credit: 0 } }),
    Error,
    "finalized Part II tax context",
  );
  assertThrows(
    () => buildMefXml({ f3800: { f3800s: [{ research_credit: 100 }] } }),
    Error,
    "legacy credit cannot be exported",
  );
});

Deno.test("MeF export rejects source-only Schedule R, Form 7203, and Form 9465", () => {
  for (
    const [pending, formName] of [
      [{
        schedule_r: { filing_status: "single", taxpayer_age_65_or_older: true },
      }, "Schedule R"],
      [
        { form7203: { stock_basis_beginning: 1000, ordinary_loss: 500 } },
        "Form 7203",
      ],
      [{ f9465: { monthly_payment: 100 } }, "Form 9465"],
    ] as const
  ) {
    assertThrows(
      () =>
        buildMefXml(pending as unknown as Parameters<typeof buildMefXml>[0]),
      Error,
      formName,
    );
  }
});

async function sampleAttachmentBytes(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  page.drawText("Form 5695 additional QMID statement", { x: 72, y: 720 });
  return pdf.save();
}

Deno.test("MeF bundle pairs a readable PDF with one BinaryAttachment document", async () => {
  const bytes = await sampleAttachmentBytes();
  const bundle = await buildMefBundle({}, {
    filer: sampleFiler(),
    attachments: [{
      fileName: "AdditionalQMIDStatement.pdf",
      description: "Additional QMID Statement",
      bytes,
    }],
  });
  assertStringIncludes(bundle.xml, 'binaryAttachmentCnt="1"');
  assertStringIncludes(bundle.xml, 'documentCnt="2"');
  assertStringIncludes(
    bundle.xml,
    '<BinaryAttachment documentId="BinaryAttachment1">',
  );
  assertStringIncludes(bundle.xml, "<DocumentTypeCd>PDF</DocumentTypeCd>");
  assertStringIncludes(bundle.xml, "<Desc>Additional QMID Statement</Desc>");
  assertStringIncludes(
    bundle.xml,
    "<AttachmentLocationTxt>AdditionalQMIDStatement.pdf</AttachmentLocationTxt>",
  );
  assertEquals(bundle.attachments.length, 1);
  assertEquals(bundle.attachments[0].bytes, bytes);
  assertEquals(bundle.attachments[0].bytes === bytes, false);
  assertStringIncludes(buildMefXml({}), 'binaryAttachmentCnt="0"');
});

Deno.test("MeF bundle rejects invalid PDFs and duplicate metadata", async () => {
  const bytes = await sampleAttachmentBytes();
  const valid = {
    fileName: "AdditionalQMIDStatement.pdf",
    description: "Additional QMID Statement",
    bytes,
  };
  await assertRejects(
    () =>
      buildMefBundle({}, {
        attachments: [{ ...valid, bytes: new Uint8Array([1, 2, 3]) }],
      }),
    Error,
    "not a complete PDF",
  );
  await assertRejects(
    () =>
      buildMefBundle({}, {
        attachments: [{ ...valid, fileName: "../bad.pdf" }],
      }),
    Error,
    "Invalid or duplicate MeF PDF filename",
  );
  await assertRejects(
    () => buildMefBundle({}, { attachments: [valid, valid] }),
    Error,
    "Invalid or duplicate MeF PDF filename",
  );
});

Deno.test("Form 5695 overflow generates its PDF in the MeF bundle", async () => {
  const filer = {
    ...sampleFiler(),
    fullName: "John Smith",
  };
  const pending = {
    form5695: {
      part_ii_section_a: {
        main_home_in_us: true,
        original_user: true,
        five_year_use: true,
        home_address: filer.address,
        related_to_new_home: false,
        exterior_doors: [
          { cost: 1_000, qmid: "A1B2" },
          { cost: 900, qmid: "C3D4" },
          { cost: 800, qmid: "E5F6" },
          { cost: 700, qmid: "G7H8" },
        ],
        windows: [
          { cost: 500, qmid: "J9K0" },
          { cost: 400, qmid: "L1M2" },
          { cost: 300, qmid: "N3P4" },
          { cost: 200, qmid: "R5S6" },
          { cost: 100, qmid: "T7U8" },
        ],
      },
      part_ii_tax_limit: 1_000,
    },
  };
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "AdditionalQMIDStatement.pdf bundle attachment",
  );
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(bundle.attachments.length, 1);
  assertEquals(bundle.attachments[0].fileName, "AdditionalQMIDStatement.pdf");
  assertStringIncludes(bundle.xml, 'binaryAttachmentCnt="1"');
  assertStringIncludes(bundle.xml, 'documentCnt="3"');
  assertStringIncludes(
    bundle.xml,
    "<OtherQlfyExtrDoorsCostAmt>700</OtherQlfyExtrDoorsCostAmt>",
  );
  const pdf = await PDFDocument.load(bundle.attachments[0].bytes);
  assertEquals(pdf.getPageCount(), 1);
});

Deno.test("Form 5695 Section B overflow preserves every QMID and cost", async () => {
  const filer = { ...sampleFiler(), fullName: "John Smith" };
  const form5695 = {
    part_ii_section_b: {
      home_in_us: true,
      originally_placed_in_service: true,
      home_addresses: [filer.address],
      central_air_conditioner: { cost: 700, qmid: "A1B2" },
      other_central_air_conditioners: [{ cost: 2_000, qmid: "C3D4" }],
      water_heaters: [
        { cost: 1_000, qmid: "E5F6" },
        { cost: 900, qmid: "G7H8" },
        { cost: 1_200, qmid: "J9K0" },
      ],
      furnace_or_boiler: { cost: 800, qmid: "L1M2" },
      other_furnaces_or_boilers: [{ cost: 1_500, qmid: "N3P4" }],
      heat_pump: { cost: 1_000, qmid: "R5S6" },
      other_heat_pumps: [{ cost: 1_200, qmid: "T7U8" }],
      heat_pump_water_heater: { cost: 900, qmid: "V9W0" },
      other_heat_pump_water_heaters: [{ cost: 1_100, qmid: "X1Y2" }],
      biomass_stove_or_boiler: { cost: 700, qmid: "Z3A4" },
      other_biomass_stoves_or_boilers: [{ cost: 1_300, qmid: "B5C6" }],
    },
    part_ii_tax_limit: 5_000,
  };
  const lines = additionalQmidLines(form5695);
  assertEquals(lines.map((line) => [line.formLine, line.items[0].qmid]), [
    ["22b", "A1B2"],
    ["23b", "G7H8"],
    ["24b", "L1M2"],
    ["29b", "R5S6"],
    ["29d", "V9W0"],
    ["29f", "Z3A4"],
  ]);
  assertThrows(
    () => buildMefXml({ form5695 }, filer),
    Error,
    "AdditionalQMIDStatement.pdf bundle attachment",
  );
  const bundle = await buildMefBundle({ form5695 }, {
    filer,
    attachments: [],
  });
  assertEquals(bundle.attachments.length, 1);
  assertStringIncludes(bundle.xml, 'binaryAttachmentCnt="1"');
  assertStringIncludes(
    bundle.xml,
    "<MostExpnsCentralAirCondCostAmt>2000</MostExpnsCentralAirCondCostAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<OthCentralAirCondCostAmt>700</OthCentralAirCondCostAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<OthNatGasPrpnOilWtrHtrCostAmt>900</OthNatGasPrpnOilWtrHtrCostAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<OthFrncHotWtrBlrCostAmt>800</OthFrncHotWtrBlrCostAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<OthElecGasHtPumpCostAmt>1000</OthElecGasHtPumpCostAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<OthElecGasHtPumpWtrHtCostAmt>900</OthElecGasHtPumpWtrHtCostAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<OthBmssStoveBlrCostAmt>700</OthBmssStoveBlrCostAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<EgyEffcntHmImprvCrAmt>3060</EgyEffcntHmImprvCrAmt>",
  );
  const pdf = await PDFDocument.load(bundle.attachments[0].bytes);
  assertEquals(pdf.getPageCount(), 1);
});

// ─── 1. Root element ──────────────────────────────────────────────────────────

Deno.test("root element tag", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, "<Return");
});

Deno.test("root returnVersion attribute", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, 'returnVersion="2025v5.4"');
});

Deno.test("root xmlns attribute", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, 'xmlns="http://www.irs.gov/efile"');
});

Deno.test("root returnVersion appears before xmlns", () => {
  const xml = buildMefXml({});
  const rvIdx = xml.indexOf("returnVersion");
  const nsIdx = xml.indexOf("xmlns");
  assertEquals(
    rvIdx < nsIdx,
    true,
    "returnVersion must appear before xmlns in root element",
  );
});

// ─── 2. ReturnHeader always present ──────────────────────────────────────────

Deno.test("ReturnHeader present", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, "<ReturnHeader");
});

Deno.test("ReturnType is 1040", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, "<ReturnTypeCd>1040</ReturnTypeCd>");
});

Deno.test("TaxPeriodBeginDate is 2025-01-01", () => {
  const xml = buildMefXml({});
  assertStringIncludes(
    xml,
    "<TaxPeriodBeginDt>2025-01-01</TaxPeriodBeginDt>",
  );
});

Deno.test("TaxPeriodEndDate is 2025-12-31", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, "<TaxPeriodEndDt>2025-12-31</TaxPeriodEndDt>");
});

// ─── 3. ReturnData always present ─────────────────────────────────────────────

Deno.test("ReturnData present when pending is empty", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, "<ReturnData");
});

Deno.test("ReturnData present when only f1040 has data", () => {
  const xml = buildMefXml({ f1040: { line1a_wages: 50000 } });
  assertStringIncludes(xml, "<ReturnData");
});

Deno.test("ReturnData present when both forms have data", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
  });
  assertStringIncludes(xml, "<ReturnData");
});

// ─── 4. documentCnt — IRS1040 always-emit behavior ───────────────────────────
// IRS1040 always emits required XSD fields (IndividualReturnFilingStatusCd,
// VirtualCurAcquiredDurTYInd, RefundProductCd) regardless of income data.
// documentCnt is always at least 1 because IRS1040 is always built.

Deno.test("documentCnt=1 when pending is empty", () => {
  // IRS1040 always emits required fields even with no income data
  const xml = buildMefXml({});
  assertStringIncludes(xml, 'documentCnt="1"');
});

Deno.test("documentCnt=1 when f1040 has only unknown keys", () => {
  // IRS1040 always emits required fields even with junk income data
  const xml = buildMefXml({ f1040: { junk: 999 } });
  assertStringIncludes(xml, 'documentCnt="1"');
});

Deno.test("documentCnt=1 when schedule1 has only unknown keys", () => {
  // IRS1040 always emits; schedule1 is empty → total documentCnt=1
  const xml = buildMefXml({ schedule1: { junk: 999 } });
  assertStringIncludes(xml, 'documentCnt="1"');
});

// ─── 5. documentCnt — only f1040 ─────────────────────────────────────────────

Deno.test("documentCnt=1 when only f1040 has data", () => {
  const xml = buildMefXml({ f1040: { line1a_wages: 50000 } });
  assertStringIncludes(xml, 'documentCnt="1"');
});

// ─── 6. documentCnt — only schedule1 ─────────────────────────────────────────

Deno.test("documentCnt=2 when only schedule1 has data", () => {
  // IRS1040 always emits (documentCnt=1) + schedule1 (documentCnt=2)
  const xml = buildMefXml({ schedule1: { line7_unemployment: 4800 } });
  assertStringIncludes(xml, 'documentCnt="2"');
});

// ─── 7. documentCnt — both forms ─────────────────────────────────────────────

Deno.test("documentCnt=2 when both f1040 and schedule1 have data", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
  });
  assertStringIncludes(xml, 'documentCnt="2"');
});

// ─── 8. f1040 routing ─────────────────────────────────────────────────────────

Deno.test("IRS1040 present when f1040 has data", () => {
  const xml = buildMefXml({ f1040: { line1a_wages: 50000 } });
  assertStringIncludes(xml, "<IRS1040 ");
});

Deno.test("Form 1040 MeF preserves the digital-asset answer", () => {
  const yes = buildMefXml({
    f1040: { filing_status: "single", digital_assets: true },
  }, sampleFiler());
  const no = buildMefXml({
    f1040: { filing_status: "single", digital_assets: false },
  }, sampleFiler());
  assertStringIncludes(
    yes,
    "<VirtualCurAcquiredDurTYInd>true</VirtualCurAcquiredDurTYInd>",
  );
  assertStringIncludes(
    no,
    "<VirtualCurAcquiredDurTYInd>false</VirtualCurAcquiredDurTYInd>",
  );
});

Deno.test("Form 1040 MeF rejects a filing status that conflicts with the header", () => {
  assertThrows(
    () => buildMefXml({ f1040: { filing_status: "mfj" } }, sampleFiler()),
    Error,
    "differs from the return header",
  );
});

Deno.test("IRS1040 absent when f1040 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040>");
});

Deno.test("IRS1040 absent when f1040 has only unknown keys", () => {
  const xml = buildMefXml({ f1040: { junk: 999 } });
  assertNotIncludes(xml, "<IRS1040>");
});

// ─── 9. schedule1 routing ─────────────────────────────────────────────────────

Deno.test("IRS1040Schedule1 present when schedule1 has data", () => {
  const xml = buildMefXml({ schedule1: { line7_unemployment: 4800 } });
  assertStringIncludes(xml, "<IRS1040Schedule1 ");
});

Deno.test("IRS1040Schedule1 absent when schedule1 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040Schedule1>");
});

Deno.test("IRS1040Schedule1 absent when schedule1 has only unknown keys", () => {
  const xml = buildMefXml({ schedule1: { junk: 999 } });
  assertNotIncludes(xml, "<IRS1040Schedule1>");
});

// ─── 10. Form order ───────────────────────────────────────────────────────────

Deno.test("IRS1040 appears before IRS1040Schedule1 when both present", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
  });
  const f1040Idx = xml.indexOf("<IRS1040 ");
  const sched1Idx = xml.indexOf("<IRS1040Schedule1 ");
  assertEquals(
    f1040Idx < sched1Idx,
    true,
    "IRS1040 must appear before IRS1040Schedule1 in output",
  );
});

// ─── 11. Filer block ─────────────────────────────────────────────────────────
// Production export requires a real filer identity.

Deno.test("MeF export rejects a missing filer instead of inventing one", () => {
  assertThrows(
    () => rawBuildMefXml({}),
    Error,
    "requires a real filer identity",
  );
});

Deno.test("MeF bundle also rejects a missing filer", async () => {
  await assertRejects(
    () => buildMefBundle({}, { attachments: [] }),
    Error,
    "requires a real filer identity",
  );
});

Deno.test("Filer block always present when identity is supplied", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, "<Filer>");
});

Deno.test("no FilingStatusCd in ReturnHeader when filer undefined", () => {
  // FilingStatusCd lives in ReturnHeader, not IRS1040
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<FilingStatusCd>");
});

// ─── 12. Filer present ────────────────────────────────────────────────────────

Deno.test("Filer block present when filer provided", () => {
  const xml = buildMefXml({}, sampleFiler());
  assertStringIncludes(xml, "<Filer>");
});

Deno.test("FilingStatusCd present when filer provided", () => {
  const xml = buildMefXml({}, sampleFiler());
  assertStringIncludes(
    xml,
    "<IndividualReturnFilingStatusCd>1</IndividualReturnFilingStatusCd>",
  );
});

// ─── 13. No XML declaration ───────────────────────────────────────────────────

Deno.test("no XML declaration in output", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<?xml");
});

Deno.test("output starts with Return element not XML declaration", () => {
  const xml = buildMefXml({});
  const trimmed = xml.trimStart();
  assertEquals(
    trimmed.startsWith("<Return"),
    true,
    "Output must start with <Return",
  );
});

// ─── 14. f1040 field pass-through ─────────────────────────────────────────────

Deno.test("f1040 WagesAmt value appears in output", () => {
  const xml = buildMefXml({ f1040: { line1a_wages: 72500 } });
  assertStringIncludes(xml, "<WagesAmt>72500</WagesAmt>");
});

Deno.test("f1040 QualifiedDividendsAmt value appears in output", () => {
  const xml = buildMefXml({ f1040: { line3a_qualified_dividends: 1500 } });
  assertStringIncludes(
    xml,
    "<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>",
  );
});

// ─── 15. schedule1 field pass-through ────────────────────────────────────────

Deno.test("schedule1 UnemploymentCompAmt value appears in output", () => {
  const xml = buildMefXml({ schedule1: { line7_unemployment: 4800 } });
  assertStringIncludes(xml, "<UnemploymentCompAmt>4800</UnemploymentCompAmt>");
});

Deno.test("schedule1 BusinessIncomeLossAmt negative value appears in output", () => {
  const xml = buildMefXml({ schedule1: { line3_schedule_c: -5000 } });
  assertStringIncludes(
    xml,
    "<BusinessIncomeLossAmt>-5000</BusinessIncomeLossAmt>",
  );
});

// ─── 16. schedule2 routing ───────────────────────────────────────────────────

Deno.test("IRS1040Schedule2 present when schedule2 has data", () => {
  const xml = buildMefXml({ schedule2: { line2_amt: 5000 } });
  assertStringIncludes(xml, "<IRS1040Schedule2 ");
});

Deno.test("IRS1040Schedule2 absent when schedule2 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040Schedule2>");
});

Deno.test("IRS1040Schedule2 absent when schedule2 has only unknown keys", () => {
  const xml = buildMefXml({ schedule2: { junk: 999 } });
  assertNotIncludes(xml, "<IRS1040Schedule2>");
});

// ─── 17. schedule3 routing ───────────────────────────────────────────────────

Deno.test("IRS1040Schedule3 present when schedule3 has data", () => {
  const xml = buildMefXml({ schedule3: { line2_childcare_credit: 1200 } });
  assertStringIncludes(xml, "<IRS1040Schedule3 ");
});

Deno.test("IRS1040Schedule3 absent when schedule3 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040Schedule3>");
});

Deno.test("IRS1040Schedule3 absent when schedule3 has only unknown keys", () => {
  const xml = buildMefXml({ schedule3: { junk: 999 } });
  assertNotIncludes(xml, "<IRS1040Schedule3>");
});

// ─── 18. documentCnt with new forms ──────────────────────────────────────────

Deno.test("documentCnt=2 when only schedule2 has data", () => {
  // IRS1040 always emits + schedule2 = documentCnt=2
  const xml = buildMefXml({ schedule2: { line2_amt: 5000 } });
  assertStringIncludes(xml, 'documentCnt="2"');
});

Deno.test("documentCnt=2 when only schedule3 has data", () => {
  // IRS1040 always emits + schedule3 = documentCnt=2
  const xml = buildMefXml({ schedule3: { line2_childcare_credit: 1200 } });
  assertStringIncludes(xml, 'documentCnt="2"');
});

Deno.test("documentCnt=2 when f1040 + schedule2 have data", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule2: { line2_amt: 5000 },
  });
  assertStringIncludes(xml, 'documentCnt="2"');
});

Deno.test("documentCnt=3 when f1040 + schedule1 + schedule2 have data", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
    schedule2: { line2_amt: 5000 },
  });
  assertStringIncludes(xml, 'documentCnt="3"');
});

Deno.test("documentCnt=4 when all four forms have data", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
    schedule2: { line2_amt: 5000 },
    schedule3: { line2_childcare_credit: 1200 },
  });
  assertStringIncludes(xml, 'documentCnt="4"');
});

// ─── 19. Form order ───────────────────────────────────────────────────────────

Deno.test("IRS1040 appears before IRS1040Schedule2 when both present", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule2: { line2_amt: 5000 },
  });
  const f1040Idx = xml.indexOf("<IRS1040 ");
  const sched2Idx = xml.indexOf("<IRS1040Schedule2 ");
  assertEquals(
    f1040Idx < sched2Idx,
    true,
    "IRS1040 must appear before IRS1040Schedule2",
  );
});

Deno.test("IRS1040Schedule1 appears before IRS1040Schedule2 when both present", () => {
  const xml = buildMefXml({
    schedule1: { line7_unemployment: 4800 },
    schedule2: { line2_amt: 5000 },
  });
  const sched1Idx = xml.indexOf("<IRS1040Schedule1 ");
  const sched2Idx = xml.indexOf("<IRS1040Schedule2 ");
  assertEquals(
    sched1Idx < sched2Idx,
    true,
    "IRS1040Schedule1 must appear before IRS1040Schedule2",
  );
});

Deno.test("IRS1040Schedule2 appears before IRS1040Schedule3 when both present", () => {
  const xml = buildMefXml({
    schedule2: { line2_amt: 5000 },
    schedule3: { line2_childcare_credit: 1200 },
  });
  const sched2Idx = xml.indexOf("<IRS1040Schedule2 ");
  const sched3Idx = xml.indexOf("<IRS1040Schedule3 ");
  assertEquals(
    sched2Idx < sched3Idx,
    true,
    "IRS1040Schedule2 must appear before IRS1040Schedule3",
  );
});

// ─── 20. Field pass-through ───────────────────────────────────────────────────

Deno.test("schedule2 AlternativeMinimumTaxAmt value appears in assembled output", () => {
  const xml = buildMefXml({ schedule2: { line2_amt: 5000 } });
  assertStringIncludes(
    xml,
    "<AlternativeMinimumTaxAmt>5000</AlternativeMinimumTaxAmt>",
  );
});

Deno.test("schedule3 CreditForChildAndDepdCareAmt value appears in assembled output", () => {
  const xml = buildMefXml({ schedule3: { line2_childcare_credit: 1200 } });
  assertStringIncludes(
    xml,
    "<CreditForChildAndDepdCareAmt>1200</CreditForChildAndDepdCareAmt>",
  );
});

Deno.test("schedule2 aggregated UncollSSMedcrRRTAGrpInsTxAmt appears in assembled output", () => {
  const xml = buildMefXml({
    schedule2: { uncollected_fica: 3000, uncollected_fica_gtl: 500 },
  });
  assertStringIncludes(
    xml,
    "<UncollSSMedcrRRTAGrpInsTxAmt>3500</UncollSSMedcrRRTAGrpInsTxAmt>",
  );
});

// ─── 21. New forms: routing ───────────────────────────────────────────────────

Deno.test("IRS1040ScheduleD present when schedule_d has data", () => {
  const xml = buildMefXml({ schedule_d: { line_4_other_st: 1000 } });
  assertStringIncludes(xml, "<IRS1040ScheduleD ");
});

Deno.test("IRS1040ScheduleD absent when schedule_d missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040ScheduleD>");
});

Deno.test("IRS1040ScheduleD absent when schedule_d has only unknown keys", () => {
  const xml = buildMefXml({ schedule_d: { junk: 999 } });
  assertNotIncludes(xml, "<IRS1040ScheduleD>");
});

Deno.test("IRS8889 present when form8889 has data", () => {
  const xml = buildMefXml({ form8889: sampleForm8889 });
  assertStringIncludes(xml, "<IRS8889 ");
});

Deno.test("IRS8889 absent when form8889 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8889>");
});

Deno.test("IRS2441 present when form2441 has data", () => {
  const xml = buildMefXml({ form2441: sampleForm2441 });
  assertStringIncludes(xml, "<IRS2441 ");
});

Deno.test("IRS2441 absent when form2441 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS2441>");
});

Deno.test("IRS8949 present when form8949 has transactions", () => {
  const xml = buildMefXml({
    form8949: [{
      part: "A",
      description: "AAPL",
      date_acquired: "2024-01-15",
      date_sold: "2025-06-01",
      proceeds: 5000,
      cost_basis: 3000,
      gain_loss: 2000,
      is_long_term: false,
    }],
  });
  assertStringIncludes(xml, "<IRS8949 ");
});

Deno.test("IRS8949 absent when form8949 is empty array", () => {
  const xml = buildMefXml({ form8949: [] });
  assertNotIncludes(xml, "<IRS8949>");
});

Deno.test("IRS8949 absent when form8949 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8949>");
});

Deno.test("IRS8959 present when form8959 has data", () => {
  const xml = buildMefXml({
    f1040: {},
    schedule2: { line11_additional_medicare: 450 },
    form8959: sampleForm8959,
  });
  assertStringIncludes(xml, "<IRS8959 ");
});

Deno.test("IRS8959 absent when form8959 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "IRS8959");
});

Deno.test("IRS8960 present when form8960 has data", () => {
  const xml = buildMefXml({ form8960: { line1_taxable_interest: 1200 } });
  assertStringIncludes(xml, "<IRS8960 ");
});

Deno.test("IRS8960 absent when form8960 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8960>");
});

// ─── 22. documentCnt with all 10 forms ───────────────────────────────────────

Deno.test("documentCnt=10 when all 10 forms have data", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
    schedule2: { line2_amt: 5000, line11_additional_medicare: 450 },
    schedule3: { line2_childcare_credit: 0 },
    schedule_d: { line_4_other_st: 1000 },
    form8889: sampleForm8889,
    form2441: sampleForm2441,
    form8949: [{
      part: "A",
      description: "AAPL",
      date_acquired: "2024-01-15",
      date_sold: "2025-06-01",
      proceeds: 5000,
      cost_basis: 3000,
      gain_loss: 2000,
      is_long_term: false,
    }],
    form8959: sampleForm8959,
    form8960: { line1_taxable_interest: 1200 },
  });
  assertStringIncludes(xml, 'documentCnt="10"');
});

Deno.test("all 10 forms populated: XML contains all 10 document tags", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
    schedule2: { line2_amt: 5000, line11_additional_medicare: 450 },
    schedule3: { line2_childcare_credit: 0 },
    schedule_d: { line_4_other_st: 1000 },
    form8889: sampleForm8889,
    form2441: sampleForm2441,
    form8949: [{
      part: "A",
      description: "AAPL",
      date_acquired: "2024-01-15",
      date_sold: "2025-06-01",
      proceeds: 5000,
      cost_basis: 3000,
      gain_loss: 2000,
      is_long_term: false,
    }],
    form8959: sampleForm8959,
    form8960: { line1_taxable_interest: 1200 },
  });
  assertStringIncludes(xml, "IRS1040");
  assertStringIncludes(xml, "IRS1040Schedule1");
  assertStringIncludes(xml, "IRS1040Schedule2");
  assertStringIncludes(xml, "IRS1040Schedule3");
  assertStringIncludes(xml, "IRS1040ScheduleD");
  assertStringIncludes(xml, "IRS8889");
  assertStringIncludes(xml, "IRS2441");
  assertStringIncludes(xml, "IRS8949");
  assertStringIncludes(xml, "IRS8959");
  assertStringIncludes(xml, "IRS8960");
});

Deno.test("only f1040 and form8889 populated: documentCnt=2", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    form8889: sampleForm8889,
  });
  assertStringIncludes(xml, 'documentCnt="2"');
});

Deno.test("only f1040 and form8889 populated: only IRS1040 and IRS8889 present", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    form8889: sampleForm8889,
  });
  assertStringIncludes(xml, "<IRS1040 ");
  assertStringIncludes(xml, "<IRS8889 ");
  assertNotIncludes(xml, "<IRS1040Schedule1>");
  assertNotIncludes(xml, "<IRS1040ScheduleD>");
  assertNotIncludes(xml, "<IRS8949>");
});

// ─── 23. New form field pass-through ──────────────────────────────────────────

Deno.test("schedule_d STGainOrLossFromFormsAmt value appears in assembled output", () => {
  const xml = buildMefXml({ schedule_d: { line_4_other_st: 1000 } });
  assertStringIncludes(
    xml,
    "<STGainOrLossFromFormsAmt>1000</STGainOrLossFromFormsAmt>",
  );
});

Deno.test("form8889 HSAContributionAmt value appears in assembled output", () => {
  const xml = buildMefXml({ form8889: sampleForm8889 });
  assertStringIncludes(xml, "<HSAContributionAmt>3600</HSAContributionAmt>");
});

Deno.test("form2441 DependentCareBenefitsAmt value appears in assembled output", () => {
  const xml = buildMefXml({ form2441: sampleForm2441 });
  assertStringIncludes(
    xml,
    "<DependentCareBenefitsAmt>5000</DependentCareBenefitsAmt>",
  );
});

Deno.test("form8959 emits XML with TotalW2MedicareWagesAndTipsAmt", () => {
  const xml = buildMefXml({
    f1040: {},
    schedule2: { line11_additional_medicare: 450 },
    form8959: sampleForm8959,
  });
  assertStringIncludes(xml, "<IRS8959 ");
  assertStringIncludes(xml, "TotalW2MedicareWagesAndTipsAmt");
});

Deno.test("form8960 TaxableInterestAmt value appears in assembled output", () => {
  const xml = buildMefXml({ form8960: { line1_taxable_interest: 1200 } });
  assertStringIncludes(xml, "<TaxableInterestAmt>1200</TaxableInterestAmt>");
});

// ─── 24. New forms (plans 11-01 through 11-05): routing ───────────────────────

const form4137W2 = {
  employer_name: "CAFE",
  employer_ein: "123456789",
  employer_address_line1: "100 Main St",
  employer_address_city: "Austin",
  employer_address_state: "TX",
  employer_address_zip: "78701",
  box1_wages: 0,
  box2_fed_withheld: 0,
  box3_ss_wages: 0,
};

Deno.test("IRS4137 present when form4137 has data", () => {
  const xml = buildMefXml({
    w2: { w2s: [form4137W2] },
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "123456789",
          tips_received: 500,
          tips_reported: 0,
        }],
        ss_wages_from_w2: 0,
      }],
      w2_tip_sources: [{
        employer_name: "CAFE",
        employer_ein: "123456789",
        allocated_tips: 0,
        ss_wages_and_tips: 0,
      }],
    },
  }, sampleFiler());
  assertStringIncludes(xml, "<IRS4137 ");
});

Deno.test("IRS4137 absent when form4137 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS4137>");
});

Deno.test("IRS8919 present when form8919 has data", () => {
  const xml = buildMefXml({ form8919: sampleForm8919 });
  assertStringIncludes(xml, "<IRS8919 ");
});

Deno.test("IRS8919 absent when form8919 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8919>");
});

Deno.test("IRS4972 present when form4972 has data", () => {
  const xml = buildMefXml({
    ...qualifiedForm4972Source,
    form4972: qualifiedForm4972,
  });
  assertStringIncludes(xml, "<IRS4972 ");
});

Deno.test("IRS4972 absent when form4972 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS4972>");
});

Deno.test("IRS1040ScheduleSE present when schedule_se has data", () => {
  const xml = buildMefXml({ schedule_se: { net_profit_schedule_c: 30000 } });
  assertStringIncludes(xml, "<IRS1040ScheduleSE ");
});

Deno.test("IRS1040ScheduleSE absent when schedule_se missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040ScheduleSE>");
});

Deno.test("IRS8606 rejects an aggregate-only pending record", () => {
  assertThrows(
    () =>
      buildMefXml(
        {
          form8606: { nondeductible_contributions: 6000 },
        } as unknown as Parameters<typeof buildMefXml>[0],
      ),
    Error,
  );
});

Deno.test("IRS8606 absent when form8606 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8606>");
});

Deno.test("IRS1116 present when form_1116 has data", () => {
  const xml = buildMefXml({
    form_1116: sampleForm1116,
    schedule3: { line1_foreign_tax_credit: 800, line1_total: 800 },
  });
  assertStringIncludes(xml, "<IRS1116 ");
});

Deno.test("IRS1116 aggregate-only data is rejected", () => {
  assertThrows(
    () => buildMefXml({ form_1116: { foreign_tax_paid: 800 } }),
    Error,
    "category calculation details",
  );
});

Deno.test("IRS1116 absent when form_1116 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1116>");
});

Deno.test("IRS8582 aggregate data blocks MeF rather than producing invalid XML", () => {
  assertThrows(
    () => buildMefXml({ form8582: { current_loss: 5000 } }),
    Error,
    "requires per-activity",
  );
});

Deno.test("IRS8582 property loss cannot be filed without its Schedule E property", () => {
  assertThrows(
    () =>
      buildMefXml({
        form8582: {
          activities: [{
            activity_id: "rental-house",
            name: "Rental house",
            activity_type: "A",
            property_type: 1,
            current_net: -1_000,
            prior_unallowed_operating: 0,
            prior_unallowed_4797_part1: 0,
            prior_unallowed_4797_part2: 0,
          }],
          current_loss: 1_000,
          rental_current_loss: 1_000,
          has_active_rental: true,
          active_participation: true,
          modified_agi: 0,
        },
      }),
    Error,
    "do not match their Schedule E and Form 4835 sources",
  );
});

Deno.test("IRS8582 absent when form8582 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8582>");
});

Deno.test("IRS1040ScheduleF present when schedule_f has data", () => {
  const xml = buildMefXml({ schedule_f: sampleScheduleF });
  assertStringIncludes(xml, "<IRS1040ScheduleF ");
});

Deno.test("IRS1040ScheduleF absent when schedule_f missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040ScheduleF>");
});

Deno.test("IRS1040ScheduleB present when schedule_b has data", () => {
  const xml = buildMefXml({
    schedule_b: {
      taxable_interest_net: 1501,
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
  });
  assertStringIncludes(xml, "<IRS1040ScheduleB ");
});

Deno.test("IRS1040ScheduleB absent at the $1,500 threshold", () => {
  const xml = buildMefXml({ schedule_b: { taxable_interest_net: 1500 } });
  assertNotIncludes(xml, "<IRS1040ScheduleB ");
});

Deno.test("IRS1040ScheduleB absent when schedule_b missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040ScheduleB>");
});

Deno.test("IRS4797 present when form4797 has data", () => {
  const xml = buildMefXml({ form4797: { section_1231_gain: 12000 } });
  assertStringIncludes(xml, "<IRS4797 ");
});

Deno.test("IRS4797 absent when form4797 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS4797>");
});

Deno.test("IRS8880 present when form8880 has data", () => {
  const xml = buildMefXml({
    f1040: {
      filing_status: "single",
      line11_agi: 20_000,
      line18_total_tax_before_credits: 1_000,
    },
    schedule3: { line4_retirement_savings_credit: 1_000 },
    form8880: {
      ira_contributions_taxpayer: 1_000,
      elective_deferrals_taxpayer: 1_000,
      agi: 20_000,
      filing_status: NodeFilingStatus.Single,
      print_line1a_ira: 1_000,
      print_line2a_deferrals: 1_000,
      print_line3a_total: 2_000,
      print_line4a_distributions: 0,
      print_line5a: 2_000,
      print_line6a_eligible: 2_000,
      print_line7_total_eligible: 2_000,
      print_line8_agi: 20_000,
      print_line9_rate: "0.5",
      print_line10_raw_credit: 1_000,
      print_line11_tax_liability: 1_000,
      print_line12_credit: 1_000,
      taxpayer_dob: "1980-01-01",
      taxpayer_student_five_months: false,
      taxpayer_claimed_as_dependent: false,
    },
  });
  assertStringIncludes(xml, "<IRS8880 ");
});

Deno.test("IRS8880 absent when form8880 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8880>");
});

Deno.test("IRS8995 positive aggregate-only claim stops the MeF bundle", () => {
  assertThrows(
    () => buildMefXml({ form8995: { qbi: 50000, qbi_deduction: 10000 } }),
    Error,
    "needs one identified Schedule C business and exact Schedule 1/1040 source reconciliation",
  );
});

Deno.test("IRS8995 absent when form8995 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8995>");
});

Deno.test("IRS4562 rejects an aggregate-only pending record", () => {
  assertThrows(
    () =>
      buildMefXml(
        { form4562: { section_179_deduction: 10000 } } as unknown as Parameters<
          typeof buildMefXml
        >[0],
      ),
    Error,
  );
});

Deno.test("IRS4562 absent when form4562 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS4562>");
});

Deno.test("IRS8995A rejects an aggregate-only pending record", () => {
  assertThrows(
    () =>
      buildMefXml(
        { form8995a: { qbi: 75000 } } as unknown as Parameters<
          typeof buildMefXml
        >[0],
      ),
    Error,
  );
});

Deno.test("IRS8995A absent when form8995a missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8995A>");
});

Deno.test("IRS6251 present when calculated AMT is positive", () => {
  const xml = buildMefXml({
    form6251: {
      regular_tax_income: 80000,
      iso_adjustment: 5000,
      line11_amt: 100,
    },
  });
  assertStringIncludes(xml, "<IRS6251 ");
});

Deno.test("IRS6251 absent when form6251 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS6251>");
});

Deno.test("IRS5329 present when form5329 has data", () => {
  const xml = buildMefXml(
    {
      form5329: sampleForm5329,
      schedule2: { line8_form5329_tax: 500 },
    },
    sampleFiler(),
  );
  assertStringIncludes(xml, "<IRS5329 ");
});

Deno.test("IRS5329 absent when form5329 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS5329>");
});

Deno.test("IRS8853 rejects an employer-only pending record", () => {
  assertThrows(
    () => buildMefXml({ form8853: { employer_archer_msa: 3650 } }),
    Error,
  );
});

Deno.test("IRS8853 absent when form8853 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8853>");
});

Deno.test("IRS8829 rejects a mortgage-interest-only pending record", () => {
  assertThrows(
    () =>
      buildMefXml(
        { form_8829: { mortgage_interest: 12000 } } as unknown as Parameters<
          typeof buildMefXml
        >[0],
      ),
    Error,
  );
});

Deno.test("IRS8829 absent when form_8829 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8829>");
});

Deno.test("IRS8839 rejects a credit without verified adoption sources", () => {
  assertThrows(
    () =>
      buildMefXml({
        form8839: sampleForm8839,
        f1040: { line30_refundable_adoption: 5_000 },
        schedule3: { line6c_adoption_credit: 10_000 },
      }),
    Error,
  );
});

Deno.test("IRS8839 absent when form8839 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8839>");
});

// ─── 25. Full document smoke test ─────────────────────────────────────────────

Deno.test("source-backed Schedule C return emits six reconciled native documents", () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-schedule-c"
  );
  if (!fixture) throw new Error("missing Schedule C review fixture");
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(result.pending, fixture.filer);
  assertStringIncludes(xml, 'documentCnt="6"');
  for (
    const tag of [
      "IRS1040",
      "IRS1040Schedule1",
      "IRS1040Schedule2",
      "IRS1040ScheduleC",
      "IRS1040ScheduleSE",
      "IRS8995",
    ]
  ) {
    assertStringIncludes(xml, `<${tag} documentId=`);
  }
});

Deno.test("empty MefFormsPending: IRS1040 still emits, no other form tags present", () => {
  // IRS1040 always emits required fields → documentCnt=1
  const xml = buildMefXml({});
  assertStringIncludes(xml, 'documentCnt="1"');
  assertNotIncludes(xml, "<IRS4137>");
  assertNotIncludes(xml, "<IRS8919>");
  assertNotIncludes(xml, "<IRS4972>");
  assertNotIncludes(xml, "<IRS1040ScheduleSE>");
  assertNotIncludes(xml, "<IRS8606>");
  assertNotIncludes(xml, "<IRS1116>");
  assertNotIncludes(xml, "<IRS8582>");
  assertNotIncludes(xml, "<IRS1040ScheduleF>");
  assertNotIncludes(xml, "<IRS1040ScheduleB>");
  assertNotIncludes(xml, "<IRS4797>");
  assertNotIncludes(xml, "<IRS8880>");
  assertNotIncludes(xml, "<IRS8995>");
  assertNotIncludes(xml, "<IRS4562>");
  assertNotIncludes(xml, "<IRS8995A>");
  assertNotIncludes(xml, "<IRS6251>");
  assertNotIncludes(xml, "<IRS5329>");
  assertNotIncludes(xml, "<IRS8853>");
  assertNotIncludes(xml, "<IRS8829>");
  assertNotIncludes(xml, "<IRS8839>");
});

Deno.test("multiple W-2s become separate documents with unique IDs and an exact document count", () => {
  const filerIdentity = sampleFiler();
  const baseW2 = {
    employer_ein: "12-3456789",
    employer_name: "ACME CORP",
    employer_address_line1: "500 MARKET ST",
    employer_address_city: "SPRINGFIELD",
    employer_address_state: "IL",
    employer_address_zip: "62701",
    box1_wages: 30_000,
    box2_fed_withheld: 3_000,
  };
  const xml = buildMefXml({
    w2: {
      w2s: [baseW2, { ...baseW2, employer_ein: "98-7654321" }],
    },
  }, filerIdentity);

  assertStringIncludes(xml, 'documentCnt="3"');
  assertStringIncludes(xml, '<IRSW2 documentId="IRSW21">');
  assertStringIncludes(xml, '<IRSW2 documentId="IRSW22">');
});

Deno.test("context-only supporting forms are not emitted", () => {
  const xml = buildMefXml({
    schedule_a: { agi: 30_000 },
    form6251: { regular_tax_income: 14_250, regular_tax: 1_472 },
    form8880: {},
  });

  assertStringIncludes(xml, 'documentCnt="1"');
  assertNotIncludes(xml, "<IRS1040ScheduleA ");
  assertNotIncludes(xml, "<IRS6251 ");
  assertNotIncludes(xml, "<IRS8880 ");
});

Deno.test("joint fuel-cell claim cannot emit an unlinked Form 5695", () => {
  const claim = {
    fuel_cell_cost: 12_000,
    fuel_cell_kw_capacity: 5,
    fuel_cell_home_in_us: true,
    fuel_cell_home_address: {
      line1: "123 Main St",
      city: "Springfield",
      state: "IL",
      zip: "62701",
    },
    fuel_cell_joint_occupancy: true,
    fuel_cell_total_joint_occupants_paid: 20_000,
    part_i_tax_limit: 10_000,
  };
  assertThrows(() =>
    buildMefXml({ form5695: claim }, {
      ...sampleFiler(),
      fullName: "John Smith",
    })
  );
});

Deno.test("joint-occupancy statement cannot be emitted without a form reference", () => {
  assertThrows(() =>
    buildMefXml({
      joint_occupancy_statement: {
        statements: [{
          fuel_cell_properties: [{
            kw_capacity: 5,
            paid: 12_000,
            total_joint_occupants_paid: 20_000,
          }],
        }],
      },
    }, {
      ...sampleFiler(),
      fullName: "John Smith",
    })
  );
});
