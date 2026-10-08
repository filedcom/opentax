import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as HeaderFilingStatus } from "../../../../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../../../../nodes/types.ts";
import { form8995a } from "./f8995a.ts";
import { form8995aScheduleD } from "./f8995a_schedule_d.ts";
import {
  calculateOneBusiness8995ALines,
  form8995a as node,
  inputSchema,
} from "../../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { form8995aPdf } from "../../../../../pdf/forms/deductions/business/f8995a.ts";
import { form8995aScheduleDPdf } from "../../../../../pdf/forms/deductions/business/f8995a_schedule_d.ts";

const patron = {
  filing_status: NodeFilingStatus.Single,
  taxable_income: 300_000,
  net_capital_gain: 0,
  qbi: 100_000,
  w2_wages: 40_000,
  unadjusted_basis: 0,
  patron_of_specified_cooperative: true,
  business_filing_details: {
    business_name: "Smith Farm",
    ein: "123456789",
    business_qbi: 100_000,
    business_w2_wages: 40_000,
    business_ubia: 0,
    one_non_sstb_business_confirmed: true as const,
    no_aggregation_confirmed: true as const,
    no_ptp_or_loss_carryforward_confirmed: true as const,
    qualified_dividends_zero_confirmed: true as const,
    qbi_wages_ubia_sources_confirmed: true as const,
    taxable_income_before_qbi_confirmed: true as const,
  },
  patron_filing_details: {
    source_1099patr: {
      payer_name: "Farm Coop",
      payer_tin: "987654321",
      box7_qualified_payments: 60_000,
      box6_section199ag_deduction: 0,
      box13_specified_cooperative: true,
      trade_or_business: true,
    },
    qbi_allocable_to_qualified_payments: 50_000,
    w2_wages_allocable_to_qualified_payments: 10_000,
    one_cooperative_confirmed: true as const,
    allocation_worksheet_reference: "farm-qbi-allocation-2025",
    allocation_worksheet_reviewed_by: "Tax Reviewer",
    allocation_worksheet_review_date: "2026-01-30",
  },
};

const filer = {
  primarySSN: "123456789",
  nameLine1: "SMITH JOHN A",
  nameControl: "SMIT",
  address: { line1: "1 MAIN ST", city: "AUSTIN", state: "TX", zip: "78701" },
  filingStatus: HeaderFilingStatus.Single,
};

const context = {
  filer,
  pending: {
    f1040: { line13_qbi_deduction: 15_500 },
    form8995a: patron,
    form8995a_schedule_d: patron,
    f1099patr: { f1099patrs: [patron.patron_filing_details.source_1099patr] },
  },
};

Deno.test("Form 8995-A patron parent and distinct Schedule D both use the same nonzero reduction", () => {
  const parent = form8995a.build(patron, context);
  const scheduleD = form8995aScheduleD.build(patron, context);
  assertStringIncludes(parent, "<PatronInd>X</PatronInd>");
  assertStringIncludes(parent, "<PatronReductionAmt>4500</PatronReductionAmt>");
  assertStringIncludes(parent, "<QBIComponentAmt>15500</QBIComponentAmt>");
  assertStringIncludes(
    parent,
    "<QualifiedBusinessIncomeDedAmt>15500</QualifiedBusinessIncomeDedAmt>",
  );
  assertStringIncludes(
    scheduleD,
    "<IRS8995AScheduleD><PatronAgricHortCoopGrp>",
  );
  assertStringIncludes(
    scheduleD,
    "<QBIAllcblQlfyCoopPymtAmt>50000</QBIAllcblQlfyCoopPymtAmt>",
  );
  assertStringIncludes(
    scheduleD,
    "<QBIAllcblQlfyCoopPymtPctAmt>4500</QBIAllcblQlfyCoopPymtPctAmt>",
  );
  assertStringIncludes(
    scheduleD,
    "<W2WageAllcblQlfyCoopPymtPctAmt>5000</W2WageAllcblQlfyCoopPymtPctAmt>",
  );
  assertStringIncludes(
    scheduleD,
    "<PatronReductionAmt>4500</PatronReductionAmt>",
  );
});

Deno.test("Schedule D trigger rejects a missing companion before Form 8995-A XML", () => {
  assertThrows(
    () =>
      form8995a.build(patron, {
        filer,
        pending: {
          f1040: { line13_qbi_deduction: 15_500 },
          form8995a: patron,
          f1099patr: context.pending.f1099patr,
        },
      }),
    Error,
    "companion is missing",
  );
});

Deno.test("Schedule D rejects a missing parent and altered line 14 source", () => {
  assertThrows(
    () =>
      form8995aScheduleD.build(patron, {
        filer,
        pending: {
          f1040: { line13_qbi_deduction: 15_500 },
          form8995a_schedule_d: patron,
        },
      }),
    Error,
    "matching parent",
  );
  const altered = {
    ...patron,
    patron_filing_details: {
      ...patron.patron_filing_details,
      qbi_allocable_to_qualified_payments: 60_000,
    },
  };
  assertThrows(
    () => form8995aScheduleD.build(altered, context),
    Error,
    "matching parent",
  );
  assertThrows(
    () =>
      form8995a.build(patron, {
        filer,
        pending: { ...context.pending, form8995a_schedule_d: altered },
      }),
    Error,
    "differs from its parent",
  );
});

Deno.test("Schedule D rejects Form 1040 line 13 mismatch and untriggered companion", () => {
  assertThrows(
    () =>
      form8995aScheduleD.build(patron, {
        filer,
        pending: {
          ...context.pending,
          f1040: { line13_qbi_deduction: 15_501 },
        },
      }),
    Error,
    "Form 1040 line 13",
  );
  assertThrows(
    () =>
      form8995aScheduleD.build({
        ...patron,
        patron_of_specified_cooperative: false,
      }, {
        filer,
        pending: {
          ...context.pending,
          form8995a: { ...patron, patron_of_specified_cooperative: false },
        },
      }),
    Error,
    "cooperative source requires affirmative patron status",
  );
  assertEquals(form8995aScheduleD.build([]), "");
});

Deno.test("Schedule D requires reviewed QBI and wage allocation worksheet reference", () => {
  assertThrows(() =>
    form8995aScheduleD.build({
      ...patron,
      patron_filing_details: {
        ...patron.patron_filing_details,
        allocation_worksheet_reference: "",
      },
    }, context), Error);
});

Deno.test("Form 8995-A cooperative box 6 written notice joins Schedule D, line 38, and Form 1040", () => {
  const withBox6 = {
    ...patron,
    patron_filing_details: {
      ...patron.patron_filing_details,
      source_1099patr: {
        ...patron.patron_filing_details.source_1099patr,
        recipient_tin: "123456789",
        box6_section199ag_deduction: 2_000,
      },
      box6_written_notice_review: {
        notice_reference: "coop-199ag-written-notice-2025",
        recipient_tin: "123456789",
        designated_199ag_amount: 2_000,
        reviewed_by: "Tax Reviewer",
        reviewed_on: "2026-01-30",
        recipient_and_amount_match_confirmed: true as const,
      },
    },
  };
  const retained = {
    ...context.pending,
    form8995a: withBox6,
    form8995a_schedule_d: withBox6,
    f1099patr: { f1099patrs: [withBox6.patron_filing_details.source_1099patr] },
    f1040: { line13_qbi_deduction: 17_500 },
  };
  const parsed = inputSchema.parse(withBox6);
  const lines = calculateOneBusiness8995ALines(parsed);
  assertEquals(lines.line37, 15_500);
  assertEquals(lines.line38, 2_000);
  assertEquals(lines.line39, 17_500);
  const computed = node.compute({ taxYear: 2025, formType: "f1040" }, parsed);
  assertEquals(
    computed.outputs.find((output) => output.nodeType === "f1040")?.fields
      .line13_qbi_deduction,
    17_500,
  );
  const parentXml = form8995a.build(withBox6, { filer, pending: retained });
  assertStringIncludes(
    parentXml,
    "<DPADSect199AgAllocAgricHortAmt>2000</DPADSect199AgAllocAgricHortAmt>",
  );
  assertStringIncludes(
    parentXml,
    "<QualifiedBusinessIncomeDedAmt>17500</QualifiedBusinessIncomeDedAmt>",
  );
  assertStringIncludes(
    form8995aScheduleD.build(withBox6, { filer, pending: retained }),
    "<PatronReductionAmt>4500</PatronReductionAmt>",
  );
  assertEquals(form8995aPdf.projectFields!(withBox6, retained).line38, 2_000);
  assertEquals(
    form8995aScheduleDPdf.projectFields!(withBox6, retained).line6,
    4_500,
  );
  assertEquals(form8995aPdf.instances!(withBox6, filer, retained).length, 1);
  assertEquals(
    form8995aScheduleDPdf.instances!(withBox6, filer, retained).length,
    1,
  );

  const changedSource = {
    ...retained,
    f1099patr: {
      f1099patrs: [{
        ...withBox6.patron_filing_details.source_1099patr,
        box6_section199ag_deduction: 1_999,
      }],
    },
  };
  assertThrows(
    () => form8995a.build(withBox6, { filer, pending: changedSource }),
    Error,
  );
  assertThrows(
    () => form8995aPdf.projectFields!(withBox6, changedSource),
    Error,
  );
  const changedOwner = {
    ...withBox6,
    patron_filing_details: {
      ...withBox6.patron_filing_details,
      source_1099patr: {
        ...withBox6.patron_filing_details.source_1099patr,
        recipient_tin: "999999999",
      },
      box6_written_notice_review: {
        ...withBox6.patron_filing_details.box6_written_notice_review,
        recipient_tin: "999999999",
      },
    },
  };
  const changedOwnerPending = {
    ...retained,
    form8995a: changedOwner,
    form8995a_schedule_d: changedOwner,
    f1099patr: {
      f1099patrs: [changedOwner.patron_filing_details.source_1099patr],
    },
  };
  assertThrows(
    () =>
      form8995a.build(changedOwner, { filer, pending: changedOwnerPending }),
    Error,
    "recipient differs",
  );
  assertThrows(
    () => form8995aPdf.instances!(changedOwner, filer, changedOwnerPending),
    Error,
    "recipient differs",
  );
  const missingNotice = {
    ...withBox6,
    patron_filing_details: {
      ...withBox6.patron_filing_details,
      box6_written_notice_review: undefined,
    },
  };
  assertThrows(
    () => calculateOneBusiness8995ALines(inputSchema.parse(missingNotice)),
    Error,
    "reviewed box 6 notice",
  );
  const changedNoticeAmount = {
    ...withBox6,
    patron_filing_details: {
      ...withBox6.patron_filing_details,
      box6_written_notice_review: {
        ...withBox6.patron_filing_details.box6_written_notice_review,
        designated_199ag_amount: 1_999,
      },
    },
  };
  assertThrows(
    () =>
      calculateOneBusiness8995ALines(inputSchema.parse(changedNoticeAmount)),
    Error,
    "reviewed box 6 notice",
  );
  assertThrows(
    () =>
      form8995a.build(withBox6, {
        filer,
        pending: { ...retained, f1040: { line13_qbi_deduction: 17_499 } },
      }),
    Error,
    "Form 1040 line 13",
  );
  const cappedBox6 = {
    ...withBox6,
    patron_filing_details: {
      ...withBox6.patron_filing_details,
      source_1099patr: {
        ...withBox6.patron_filing_details.source_1099patr,
        box6_section199ag_deduction: 5_400,
      },
      box6_written_notice_review: {
        ...withBox6.patron_filing_details.box6_written_notice_review,
        designated_199ag_amount: 5_400,
      },
    },
  };
  const cappedPending = {
    ...retained,
    form8995a: cappedBox6,
    form8995a_schedule_d: cappedBox6,
    f1099patr: {
      f1099patrs: [cappedBox6.patron_filing_details.source_1099patr],
    },
    f1040: { line13_qbi_deduction: 20_900 },
  };
  assertEquals(
    calculateOneBusiness8995ALines(inputSchema.parse(cappedBox6)).line39,
    20_900,
  );
  assertStringIncludes(
    form8995a.build(cappedBox6, { filer, pending: cappedPending }),
    "<DPADSect199AgAllocAgricHortAmt>5400</DPADSect199AgAllocAgricHortAmt>",
  );
  assertEquals(
    form8995aPdf.projectFields!(cappedBox6, cappedPending).line38,
    5_400,
  );
  assertStringIncludes(
    form8995aScheduleD.build(cappedBox6, { filer, pending: cappedPending }),
    "<PatronReductionAmt>4500</PatronReductionAmt>",
  );
  assertEquals(
    form8995aScheduleDPdf.projectFields!(cappedBox6, cappedPending).line6,
    4_500,
  );
  const overQualifiedPaymentCap = {
    ...cappedBox6,
    patron_filing_details: {
      ...cappedBox6.patron_filing_details,
      source_1099patr: {
        ...cappedBox6.patron_filing_details.source_1099patr,
        box6_section199ag_deduction: 5_401,
      },
      box6_written_notice_review: {
        ...cappedBox6.patron_filing_details.box6_written_notice_review,
        designated_199ag_amount: 5_401,
      },
    },
  };
  const overCapPending = {
    ...cappedPending,
    form8995a: overQualifiedPaymentCap,
    form8995a_schedule_d: overQualifiedPaymentCap,
    f1099patr: {
      f1099patrs: [
        overQualifiedPaymentCap.patron_filing_details.source_1099patr,
      ],
    },
    f1040: { line13_qbi_deduction: 20_901 },
  };
  assertThrows(
    () =>
      calculateOneBusiness8995ALines(
        inputSchema.parse(overQualifiedPaymentCap),
      ),
    Error,
    "9% of box 7",
  );
  assertThrows(
    () =>
      form8995a.build(overQualifiedPaymentCap, {
        filer,
        pending: overCapPending,
      }),
    Error,
    "9% of box 7",
  );
  assertThrows(
    () => form8995aPdf.projectFields!(overQualifiedPaymentCap, overCapPending),
    Error,
    "9% of box 7",
  );
  const excessBox6 = {
    ...withBox6,
    patron_filing_details: {
      ...withBox6.patron_filing_details,
      source_1099patr: {
        ...withBox6.patron_filing_details.source_1099patr,
        box6_section199ag_deduction: 300_000,
      },
      box6_written_notice_review: {
        ...withBox6.patron_filing_details.box6_written_notice_review,
        designated_199ag_amount: 300_000,
      },
    },
  };
  assertThrows(
    () => calculateOneBusiness8995ALines(inputSchema.parse(excessBox6)),
    Error,
    "9% of box 7",
  );
});
