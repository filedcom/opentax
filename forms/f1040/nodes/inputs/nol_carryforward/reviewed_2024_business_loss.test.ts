import { assertEquals, assertThrows } from "@std/assert";
import { review2024BusinessLoss } from "./reviewed_2024_business_loss.ts";

const source = {
  owner_ssn: "111223333",
  filed_form1040: {
    tax_year: 2024,
    source_document_reference: "Filed 2024 Form 1040",
    owner_ssn: "111223333",
    single_filing_status_confirmed: true,
    no_other_income_sources_confirmed: true,
    line8_additional_income: -50_000,
    line9_total_income: -50_000,
    line10_adjustments: 0,
    line11_agi: -50_000,
    line12_standard_deduction: 14_600,
    no_itemized_deductions_confirmed: true,
  },
  filed_schedule_c: {
    tax_year: 2024,
    source_document_reference: "Filed 2024 Schedule C",
    owner_ssn: "111223333",
    line31_net_loss: -50_000,
    nonfarming_business_confirmed: true,
  },
  filed_schedule1: {
    tax_year: 2024,
    source_document_reference: "Filed 2024 Schedule 1",
    owner_ssn: "111223333",
    line3_business_income_or_loss: -50_000,
    line10_additional_income: -50_000,
    no_other_additional_income_confirmed: true,
  },
  filed_form172: {
    tax_year: 2024,
    source_document_reference: "Filed 2024 Form 172",
    owner_ssn: "111223333",
    part_i_line1: -64_600,
    part_i_line6_nonbusiness_deductions: 14_600,
    part_i_line9_excess_nonbusiness_deductions: 14_600,
    part_i_line24_nol: -50_000,
    other_part_i_lines: {
      line2: 0,
      line3: 0,
      line4: 0,
      line5: 0,
      line7: 0,
      line8: 0,
      line10: 0,
      line11: 0,
      line12: 0,
      line13: 0,
      line14: 0,
      line15: 0,
      line16: 0,
      line17: 0,
      line18: 0,
      line19: 0,
      line20: 0,
      line21: 0,
      line22: 0,
      line23: 0,
    },
  },
};

Deno.test("reviewed filed 2024 nonfarm Schedule C loss replays Form 172 Part I", () => {
  assertEquals(review2024BusinessLoss(source), {
    lossYear: 2024,
    ownerSsn: "111223333",
    regularNolTo2025: 50_000,
  });
});

Deno.test("2024 Form 172 business-loss review rejects source, owner and arithmetic tampering", () => {
  const changed = [
    {
      ...source,
      filed_form1040: { ...source.filed_form1040, line11_agi: -49_999 },
    },
    {
      ...source,
      filed_schedule_c: {
        ...source.filed_schedule_c,
        owner_ssn: "999887777",
      },
    },
    {
      ...source,
      filed_schedule1: {
        ...source.filed_schedule1,
        line10_additional_income: -49_999,
      },
    },
    {
      ...source,
      filed_form172: {
        ...source.filed_form172,
        part_i_line9_excess_nonbusiness_deductions: 0,
      },
    },
    {
      ...source,
      filed_form172: {
        ...source.filed_form172,
        other_part_i_lines: {
          ...source.filed_form172.other_part_i_lines,
          line23: 100,
        },
      },
    },
    {
      ...source,
      filed_form172: {
        ...source.filed_form172,
        source_document_reference:
          source.filed_form1040.source_document_reference,
      },
    },
    {
      ...source,
      filed_form172: { ...source.filed_form172, part_i_line24_nol: -49_000 },
    },
  ];
  for (const altered of changed) {
    assertThrows(() => review2024BusinessLoss(altered), Error);
  }
});
