import { assertStringIncludes, assertThrows } from "@std/assert";
import { IncomeCategory } from "../../../../../nodes/intermediate/forms/form_1116/index.ts";
import { buildScheduleCProjection } from "./f1116_schedule_c.ts";
import { stagedCase } from "./f1116_schedule_c.fixture.ts";
import {
  form1116ScheduleCPdfCandidate,
  projectScheduleCPdfCandidate,
} from "../../../../pdf/forms/international/f1116/f1116_schedule_c_candidate.ts";

function multiPayorCase(extraPayors: number) {
  const { ledger, evidence } = stagedCase();
  const extras = Array.from({ length: extraPayors }, (_, index) => ({
    ...ledger.payor_events[0],
    payor_name: `Other foreign bank ${index + 2}`,
    payor_identifier: {
      kind: "foreign_reference" as const,
      value: `BANK${index + 2}`,
    },
    tax_change_local_currency: 100,
    tax_change_functional_currency: 100,
    tax_change_usd: 10,
    payor_tax_usd_on_filed_return: 50,
    payor_revised_tax_usd: 40,
    source_document_references: [`Foreign bank ${index + 2} refund record`],
  }));
  const filedTax = 100 + extraPayors * 50;
  const revisedTax = 80 + extraPayors * 40;
  return {
    ledger: {
      ...ledger,
      payor_events: [...ledger.payor_events, ...extras],
      filed_form1116: {
        ...ledger.filed_form1116,
        foreign_taxes_paid_or_accrued_usd: filedTax,
        foreign_tax_credit_claimed_usd: filedTax,
      },
      redetermined_form1116: {
        ...ledger.redetermined_form1116,
        foreign_taxes_paid_or_accrued_usd: revisedTax,
        foreign_tax_credit_claimed_usd: revisedTax,
      },
      affected_years: [{
        ...ledger.affected_years[0],
        us_tax_liability_on_filed_return_usd: 5_000 - filedTax,
        redetermined_us_tax_liability_usd: 5_000 - revisedTax,
      }],
    },
    evidence: {
      ...evidence,
      filed_form1116: {
        ...evidence.filed_form1116,
        line9_foreign_tax: filedTax,
        line14_available_tax: filedTax,
        line24_allowed_credit: filedTax,
        line33_total_credit: filedTax,
        line35_credit: filedTax,
      },
      filed_schedule3: {
        ...evidence.filed_schedule3,
        line1_foreign_tax_credit: filedTax,
        line8_nonrefundable_credits: filedTax,
      },
      filed_form1040: {
        ...evidence.filed_form1040,
        line20_schedule3_nonrefundable_credit: filedTax,
        line21_nonrefundable_credits: filedTax,
        line22_tax_after_credits: 5_000 - filedTax,
        line24_total_tax: 5_000 - filedTax,
      },
      revised_form1116: {
        ...evidence.revised_form1116,
        line9_foreign_tax: revisedTax,
        line14_available_tax: revisedTax,
        line24_allowed_credit: revisedTax,
        line33_total_credit: revisedTax,
        line35_credit: revisedTax,
      },
      revised_schedule3: {
        ...evidence.revised_schedule3,
        line1_foreign_tax_credit: revisedTax,
        line8_nonrefundable_credits: revisedTax,
      },
      revised_form1040: {
        ...evidence.revised_form1040,
        line20_schedule3_nonrefundable_credit: revisedTax,
        line21_nonrefundable_credits: revisedTax,
        line22_tax_after_credits: 5_000 - revisedTax,
        line24_total_tax: 5_000 - revisedTax,
      },
    },
  };
}

function mixedDirectionCase() {
  const { ledger, evidence } = multiPayorCase(1);
  const increase = {
    ...ledger.payor_events[1],
    event_kind: "additional_accrued_tax" as const,
    payor_revised_tax_usd: 60,
  };
  const revisedTax = 140;
  return {
    ledger: {
      ...ledger,
      payor_events: [ledger.payor_events[0], increase],
      redetermined_form1116: {
        ...ledger.redetermined_form1116,
        foreign_taxes_paid_or_accrued_usd: revisedTax,
        foreign_tax_credit_claimed_usd: revisedTax,
      },
      affected_years: [{
        ...ledger.affected_years[0],
        redetermined_us_tax_liability_usd: 5_000 - revisedTax,
      }],
    },
    evidence: {
      ...evidence,
      revised_form1116: {
        ...evidence.revised_form1116,
        line9_foreign_tax: revisedTax,
        line14_available_tax: revisedTax,
        line24_allowed_credit: revisedTax,
        line33_total_credit: revisedTax,
        line35_credit: revisedTax,
      },
      revised_schedule3: {
        ...evidence.revised_schedule3,
        line1_foreign_tax_credit: revisedTax,
        line8_nonrefundable_credits: revisedTax,
      },
      revised_form1040: {
        ...evidence.revised_form1040,
        line20_schedule3_nonrefundable_credit: revisedTax,
        line21_nonrefundable_credits: revisedTax,
        line22_tax_after_credits: 5_000 - revisedTax,
        line24_total_tax: 5_000 - revisedTax,
      },
    },
  };
}

function balancedMixedDirectionCase() {
  const { ledger, evidence } = mixedDirectionCase();
  const revisedTax = 150;
  return {
    ledger: {
      ...ledger,
      payor_events: [ledger.payor_events[0], {
        ...ledger.payor_events[1],
        tax_change_local_currency: 200,
        tax_change_functional_currency: 200,
        tax_change_usd: 20,
        payor_revised_tax_usd: 70,
      }],
      redetermined_form1116: {
        ...ledger.redetermined_form1116,
        foreign_taxes_paid_or_accrued_usd: revisedTax,
        foreign_tax_credit_claimed_usd: revisedTax,
      },
      affected_years: [{
        ...ledger.affected_years[0],
        redetermined_us_tax_liability_usd: 4_850,
      }],
    },
    evidence: {
      ...evidence,
      revised_form1116: {
        ...evidence.revised_form1116,
        line9_foreign_tax: revisedTax,
        line14_available_tax: revisedTax,
        line24_allowed_credit: revisedTax,
        line33_total_credit: revisedTax,
        line35_credit: revisedTax,
      },
      revised_schedule3: {
        ...evidence.revised_schedule3,
        line1_foreign_tax_credit: revisedTax,
        line8_nonrefundable_credits: revisedTax,
      },
      revised_form1040: {
        ...evidence.revised_form1040,
        line20_schedule3_nonrefundable_credit: revisedTax,
        line21_nonrefundable_credits: revisedTax,
        line22_tax_after_credits: 4_850,
        line24_total_tax: 4_850,
      },
    },
  };
}

Deno.test("Form 1116 Schedule C stages a sourced refund in native Parts II-IV", () => {
  const { ledger, evidence } = stagedCase();
  const xml = buildScheduleCProjection(ledger, evidence);
  for (
    const fragment of [
      "<IRS1116ScheduleC>",
      "<ForeignIncPassiveCategoryInd>X</ForeignIncPassiveCategoryInd>",
      "<DecrAmtFrgnTaxesPdAccruedDtl>",
      "<ForeignEntityReferenceIdNum>BANK1</ForeignEntityReferenceIdNum>",
      "<ForeignTaxRefundedDt>2025-08-15</ForeignTaxRefundedDt>",
      "<RefundInUSDollarsAmt>20</RefundInUSDollarsAmt>",
      "<TotalRevisedTaxPaidAccruedAmt>80</TotalRevisedTaxPaidAccruedAmt>",
      "<RedetermFrgnTxsPdAccruedAmt>80</RedetermFrgnTxsPdAccruedAmt>",
      "<FTCClmRedetermAmt>80</FTCClmRedetermAmt>",
      "<DifferenceBetweenTotalsAmt>20</DifferenceBetweenTotalsAmt>",
    ]
  ) assertStringIncludes(xml, fragment);
});

Deno.test("Form 1116 Schedule C PDF candidate maps the same refund and affected-year tax", () => {
  const { ledger, evidence } = stagedCase();
  const pdf = projectScheduleCPdfCandidate(ledger, evidence);
  const field = (key: string) =>
    form1116ScheduleCPdfCandidate.fields.find((item) => item.domainKey === key)
      ?.pdfField;
  assertStringIncludes(
    field("part2_row1_col2a") ?? "",
    "BodyRowA1[0].f2_02[0]",
  );
  assertStringIncludes(
    field("part2_row1_col10") ?? "",
    "BodyRowA1[0].f2_37[0]",
  );
  assertStringIncludes(field("part3_col5") ?? "", "BodyRowA[0].f2_85[0]");
  assertStringIncludes(field("part4_col4") ?? "", "BodyRowA[0].f2_94[0]");
  if (
    pdf.part2_row1_col2a !== "Example foreign bank" ||
    pdf.part2_row1_col10 !== 20 || pdf.part2_row1_col12 !== 80 ||
    pdf.part2_subtotal_col12 !== 80 || pdf.part3_col5 !== 80 ||
    pdf.part4_col4 !== 20 || pdf.part1_year !== undefined
  ) {
    throw new Error(
      "Form 1116 Schedule C refund PDF candidate does not match native calculation",
    );
  }
});

Deno.test("Form 1116 Schedule C PDF candidate maps accrued increase and deemed refund to separate parts", () => {
  const increased = stagedCase(
    IncomeCategory.General,
    "additional_accrued_tax",
  );
  const increasePdf = projectScheduleCPdfCandidate(
    increased.ledger,
    increased.evidence,
  );
  if (
    increasePdf.part1_row1_col12 !== 120 ||
    increasePdf.part1_subtotal_col10 !== 20 ||
    increasePdf.part2_year !== undefined
  ) {
    throw new Error(
      "Form 1116 Schedule C increase PDF candidate disagrees with Part I",
    );
  }
  const deemed = stagedCase(
    IncomeCategory.Passive,
    "accrued_tax_unpaid_after_24_months",
  );
  const deemedPdf = projectScheduleCPdfCandidate(
    deemed.ledger,
    deemed.evidence,
  );
  if (
    deemedPdf.part2_row1_two_year_rule !== true ||
    deemedPdf.part2_row1_col4 !== "12/31/2025"
  ) {
    throw new Error(
      "Form 1116 Schedule C deemed refund PDF indicator or date is wrong",
    );
  }
});

Deno.test("Form 1116 Schedule C stages an accrued increase in native Parts I, III and IV", () => {
  const { ledger, evidence } = stagedCase(
    IncomeCategory.General,
    "additional_accrued_tax",
  );
  const xml = buildScheduleCProjection(ledger, evidence);
  for (
    const fragment of [
      "<ForeignIncGeneralCategoryInd>X</ForeignIncGeneralCategoryInd>",
      "<IncrAmtFrgnTaxesAccruedDtl>",
      "<AdditionalForeignTaxPaidDt>2025-08-15</AdditionalForeignTaxPaidDt>",
      "<AddnlTaxUSDollarsAmt>20</AddnlTaxUSDollarsAmt>",
      "<TotalRevisedTaxAccruedAmt>120</TotalRevisedTaxAccruedAmt>",
    ]
  ) assertStringIncludes(xml, fragment);
});

Deno.test("Form 1116 Schedule C marks a 24-month deemed refund", () => {
  const { ledger, evidence } = stagedCase(
    IncomeCategory.Passive,
    "accrued_tax_unpaid_after_24_months",
  );
  const xml = buildScheduleCProjection(ledger, evidence);
  assertStringIncludes(
    xml,
    "<Section905c2TwoYrRuleInd>X</Section905c2TwoYrRuleInd>",
  );
});

Deno.test("Form 1116 Schedule C stages three distinct payors with year subtotals", () => {
  const { ledger, evidence } = multiPayorCase(2);
  const xml = buildScheduleCProjection(ledger, evidence);
  assertStringIncludes(
    xml,
    "<TotalRefundInUSDollarsAmt>40</TotalRefundInUSDollarsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalTaxOriginalAmdRetAmt>200</TotalTaxOriginalAmdRetAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalRevisedTaxPaidAccruedAmt>160</TotalRevisedTaxPaidAccruedAmt>",
  );
  assertStringIncludes(
    xml,
    "<DifferenceBetweenTotalsAmt>40</DifferenceBetweenTotalsAmt>",
  );
  assertStringIncludes(
    xml,
    "<ForeignEntityReferenceIdNum>BANK3</ForeignEntityReferenceIdNum>",
  );
});

Deno.test("Form 1116 Schedule C staged payor rows reject extra or duplicate payors", () => {
  const { ledger, evidence } = multiPayorCase(3);
  assertThrows(
    () => buildScheduleCProjection(ledger, evidence),
    Error,
    "up to three distinct payors only",
  );
  const two = multiPayorCase(1);
  assertThrows(
    () =>
      buildScheduleCProjection({
        ...two.ledger,
        payor_events: [
          two.ledger.payor_events[0],
          {
            ...two.ledger.payor_events[1],
            payor_identifier: two.ledger.payor_events[0].payor_identifier,
          },
        ],
      }, two.evidence),
    Error,
    "up to three distinct payors only",
  );
});

Deno.test("Form 1116 Schedule C stages mixed Part I and II changes with net Part III and IV", () => {
  const { ledger, evidence } = mixedDirectionCase();
  const xml = buildScheduleCProjection(ledger, evidence);
  const part1 = xml.indexOf("<IncrAmtFrgnTaxesAccruedDtl>");
  const part2 = xml.indexOf("<DecrAmtFrgnTaxesPdAccruedDtl>");
  if (part1 < 0 || part2 <= part1) {
    throw new Error(
      "Schedule C mixed native payor groups are missing or out of order",
    );
  }
  for (
    const fragment of [
      "<TotalAddnlTaxUSDollarsAmt>10</TotalAddnlTaxUSDollarsAmt>",
      "<TotalRefundInUSDollarsAmt>20</TotalRefundInUSDollarsAmt>",
      "<RedetermFrgnTxsPdAccruedAmt>140</RedetermFrgnTxsPdAccruedAmt>",
      "<FTCClmRedetermAmt>140</FTCClmRedetermAmt>",
      "<DifferenceBetweenTotalsAmt>10</DifferenceBetweenTotalsAmt>",
    ]
  ) assertStringIncludes(xml, fragment);
  const pdf = projectScheduleCPdfCandidate(ledger, evidence);
  if (
    pdf.part1_row1_col2b !== "BANK2" ||
    pdf.part1_subtotal_col10 !== 10 ||
    pdf.part1_subtotal_col12 !== 60 ||
    pdf.part2_row1_col2b !== "BANK1" ||
    pdf.part2_subtotal_col10 !== 20 ||
    pdf.part2_subtotal_col12 !== 80 ||
    pdf.part3_col3 !== 150 || pdf.part3_col2 !== 140 ||
    pdf.part4_col4 !== 10
  ) {
    throw new Error("Schedule C mixed PDF candidate lost a payor or net tax");
  }
});

Deno.test("Form 1116 Schedule C keeps Part III and omits Part IV when balanced redeterminations leave U.S. tax unchanged", () => {
  const { ledger, evidence } = balancedMixedDirectionCase();
  const xml = buildScheduleCProjection(ledger, evidence);
  assertStringIncludes(xml, "<IncrAmtFrgnTaxesAccruedDtl>");
  assertStringIncludes(xml, "<DecrAmtFrgnTaxesPdAccruedDtl>");
  assertStringIncludes(
    xml,
    "<RedetermFrgnTxsPdAccruedAmt>150</RedetermFrgnTxsPdAccruedAmt>",
  );
  if (xml.includes("<ChgUSTxLiabilityGrp>")) {
    throw new Error(
      "Schedule C Part IV cannot report an unchanged U.S. liability",
    );
  }
  const pdf = projectScheduleCPdfCandidate(ledger, evidence);
  if (
    pdf.part3_col2 !== 150 || pdf.part4_col1 !== undefined ||
    pdf.part4_col4 !== undefined
  ) {
    throw new Error(
      "Schedule C PDF candidate must leave unchanged-liability Part IV blank",
    );
  }
});

Deno.test("Form 1116 Schedule C mixed rows reject an unreconciled revised liability", () => {
  const { ledger, evidence } = mixedDirectionCase();
  assertThrows(
    () =>
      buildScheduleCProjection({
        ...ledger,
        affected_years: [{
          ...ledger.affected_years[0],
          redetermined_us_tax_liability_usd: 4_850,
        }],
      }, evidence),
    Error,
    "ledger disagrees with recomputed affected-year tax",
  );
});

Deno.test("Form 1116 Schedule C staged projection rejects additional affected years", () => {
  const { ledger, evidence } = stagedCase();
  assertThrows(
    () =>
      buildScheduleCProjection({
        ...ledger,
        affected_years: [
          ...ledger.affected_years,
          {
            ...ledger.affected_years[0],
            tax_year_end: "2025-12-31",
          },
        ],
      }, evidence),
    Error,
    "one passive/general category, one relation-back year",
  );
});

Deno.test("Form 1116 Schedule C staged projection rejects a liability not matching the filed 1040", () => {
  const { ledger, evidence } = stagedCase();
  assertThrows(
    () =>
      buildScheduleCProjection({
        ...ledger,
        affected_years: [{
          ...ledger.affected_years[0],
          us_tax_liability_on_filed_return_usd: 4_000.5,
        }],
      }, evidence),
    Error,
    "ledger disagrees with recomputed affected-year tax",
  );
});

Deno.test("Form 1116 Schedule C rejects an unsupported filed-year FTC carryover or excess", () => {
  const { ledger, evidence } = stagedCase();
  assertThrows(
    () =>
      buildScheduleCProjection(ledger, {
        ...evidence,
        filed_form1116: { ...evidence.filed_form1116, line23_limit: 50 },
      }),
    Error,
    "filed-year lines or no-carryover limit",
  );
});

Deno.test("Form 1116 Schedule C rejects inconsistent filed Form 1040 total tax", () => {
  const { ledger, evidence } = stagedCase();
  assertThrows(
    () =>
      buildScheduleCProjection(ledger, {
        ...evidence,
        filed_form1040: { ...evidence.filed_form1040, line24_total_tax: 4_901 },
      }),
    Error,
    "filed-year lines or no-carryover limit",
  );
});

Deno.test("Form 1116 Schedule C rejects a ledger revised credit not derived from filed lines", () => {
  const { ledger, evidence } = stagedCase();
  assertThrows(
    () =>
      buildScheduleCProjection({
        ...ledger,
        redetermined_form1116: {
          ...ledger.redetermined_form1116,
          foreign_tax_credit_claimed_usd: 50,
        },
      }, evidence),
    Error,
    "ledger disagrees with recomputed affected-year tax",
  );
});

Deno.test("Form 1116 Schedule C rejects a revised Schedule 3 or Form 1040 line not backed by the redetermination", () => {
  const { ledger, evidence } = stagedCase();
  assertThrows(
    () =>
      buildScheduleCProjection(ledger, {
        ...evidence,
        revised_schedule3: {
          ...evidence.revised_schedule3,
          line1_foreign_tax_credit: 79,
        },
      }),
    Error,
    "disagrees with recomputed affected-year tax",
  );
  assertThrows(
    () =>
      buildScheduleCProjection(ledger, {
        ...evidence,
        revised_form1040: {
          ...evidence.revised_form1040,
          line24_total_tax: 4_919,
        },
      }),
    Error,
    "disagrees with recomputed affected-year tax",
  );
});

Deno.test("Form 1116 Schedule C rejects missing filed Schedule 3 evidence", () => {
  const { ledger, evidence } = stagedCase();
  assertThrows(
    () =>
      buildScheduleCProjection(ledger, {
        ...evidence,
        filed_schedule3: {
          ...evidence.filed_schedule3,
          filed_document_reference: "",
        },
      }),
  );
});
