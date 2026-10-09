import { verifyPassive1116Packet } from "./form1116_packet_proof.fixture.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { form1116 } from "../../../../mef/forms/credits/foreign/f1116/f1116.ts";
import { form1116Pdf } from "../../../../pdf/forms/credits/foreign/f1116/f1116.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

const sources = [
  {
    payer_name: "Canada Bank A",
    source: "2025 1099-INT bank A",
    box1: 20_000,
    box6: 3_000,
  },
  {
    payer_name: "Canada Bank B",
    source: "2025 1099-INT bank B",
    box1: 15_000,
    box6: 3_000,
  },
  {
    payer_name: "Canada Bank C",
    source: "2025 1099-INT bank C",
    box1: 15_000,
    box6: 3_000,
  },
];

const rows = sources.map((source) => ({
  recipient_tin: "111223333",
  payer_name: source.payer_name,
  box1: source.box1,
  box6: source.box6,
  box7: "Canada",
  foreign_source_interest_usd: source.box1,
  foreign_tax_irs_country_code: "CA",
  foreign_tax_source_document_reference: source.source,
}));

const review = {
  payer_source_document_references: sources.map((source) => source.source),
  all_foreign_tax_items_identified_confirmed: true,
  all_worldwide_income_sources_identified_confirmed: true,
  all_part_i_deductions_and_losses_except_standard_zero_confirmed: true,
  no_foreign_tax_reduction_confirmed: true,
  no_high_tax_kickout_confirmed: true,
  no_foreign_income_adjustment_confirmed: true,
  no_section_960c_increase_confirmed: true,
  no_international_boycott_confirmed: true,
  no_prior_year_carryover_or_carryback_confirmed: true,
  no_preferential_rate_income_confirmed: true,
  no_other_category_credit_confirmed: true,
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: FilingStatus.Single,
      digital_assets: false,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    f1099int: rows,
    form1116_review: {
      all_foreign_sources_reviewed: true,
      foreign_qualified_dividends: 0,
      foreign_capital_gains_or_losses_present: false,
      source_document_references: sources.map((source) => source.source),
      no_amt_liability_verified: true,
      multi_source_pdf_review: review,
    },
    form1116_carryover_review: {
      reviews: [{
        income_category: "passive",
        prior_year_form1116_line23_limit: 700,
        prior_year_form1116_line24_allowed_credit: 700,
        prior_year_schedule_b_line8_balance: 0,
        source_document_references: [
          "Filed 2024 passive Form 1116 and Schedule B",
        ],
        no_foreign_tax_redetermination_or_special_adjustment: true,
      }],
    },
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("three same-country foreign interest payers aggregate through Form 1116 native and PDF", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 50_000);
  assertEquals(result.pending.f1040.line11_agi, 50_000);
  const pdf = form1116Pdf.projectFields!(parent, result.pending);
  assertEquals(pdf.pdf_country_a, "Canada");
  assertEquals(pdf.pdf_line1a_a, 50_000);
  assertEquals(pdf.pdf_line3g_a, 15_750);
  assertEquals(pdf.pdf_line7, 34_250);
  assertEquals(pdf.pdf_part2_us_interest_a, 9_000);
  assertEquals(
    pdf.pdf_line35,
    result.pending.schedule3.line1_foreign_tax_credit,
  );
  const [xml] = form1116.build(parent as Parameters<typeof form1116.build>[0], {
    pending: result.pending,
  });
  assert(
    xml.includes(
      "<GrossForeignSourceIncomeAmt>50000</GrossForeignSourceIncomeAmt>",
    ),
  );
  assert(
    xml.includes(
      "<USTaxWithheldOnInterestAmt>9000</USTaxWithheldOnInterestAmt>",
    ),
  );
});

Deno.test("multiple foreign payer source, country, review and return tampering rejects native and PDF", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  const changed = (overrides: Record<string, Record<string, unknown>>) => ({
    ...result.pending,
    ...overrides,
  });
  for (
    const pending of [
      changed({
        f1099int: {
          f1099ints: [rows[0], { ...rows[1], box1: 15_001 }, rows[2]],
        },
      }),
      changed({
        f1099int: {
          f1099ints: [rows[0], {
            ...rows[1],
            foreign_tax_irs_country_code: "FR",
          }, rows[2]],
        },
      }),
      changed({
        f1099int: {
          f1099ints: [rows[0], {
            ...rows[1],
            foreign_tax_source_document_reference: "Other form",
          }, rows[2]],
        },
      }),
      changed({
        f1040: { ...result.pending.f1040, line2b_taxable_interest: 49_999 },
      }),
    ]
  ) {
    assertThrows(
      () =>
        form1116.build(parent as Parameters<typeof form1116.build>[0], {
          pending,
        }),
      Error,
    );
    assertThrows(() => form1116Pdf.projectFields!(parent, pending), Error);
  }
});

Deno.test("multi_foreign_interest complete prepared packet reconciles current excess and rejects fresh export conflicts", async () => {
  await verifyPassive1116Packet(
    filedReturn().pending,
    "multi_foreign_interest",
    {
      "interest": 50000,
      "dividends": 0,
      "tax": 3875,
      "carry": 5125,
      "countries": ["CA"],
    },
  );
});
