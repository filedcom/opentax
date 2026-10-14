import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { form1116ScheduleBPdf } from "../../../../pdf/forms/credits/foreign/f1116/f1116_schedule_b.ts";
import { inputSchema as partnershipSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import { inputSchema as corporationSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import {
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
} from "../../../../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

function sources(
  kind: "partnership" | "corporation",
  gross: number,
  reduction: number,
) {
  const k1Ref = `2025 ${kind} K-1`;
  const k3Ref = `2025 ${kind} K-3`;
  const k3 = {
    k1_source_document_reference: k1Ref,
    k3_source_document_reference: k3Ref,
    part_ii_section_1_line_6_passive_interest: 50000,
    part_ii_section_1_line_24_passive_total: 50000,
    irs_country_code: "GM",
    tax_paid_date: "2025-06-15",
    foreign_tax_currency: {
      currency_code: "EUR",
      amount: gross / 1.25,
      usd_per_foreign_unit: 1.25,
      source_document_reference: k3Ref,
    },
    no_other_income_tax_or_reduction_on_k3_confirmed: true,
  };
  const common = {
    recipient_tin: "111223333",
    source_document_reference: k1Ref,
  };
  const source = kind === "partnership"
    ? {
      k1_partnership: [{
        ...common,
        partnership_name: "German Interest Partnership",
        partnership_ein: "123456789",
        box5_interest: 50000,
        box16_foreign_income: 50000,
        box16_foreign_tax: gross,
        box16_foreign_income_category: IncomeCategory.Passive,
        box16_foreign_tax_irs_country_code: "GM",
        box16_foreign_tax_paid_or_accrued_date: "2025-06-15",
        box16_foreign_tax_kind: ForeignTaxKind.Interest,
        box16_foreign_tax_credit_method: ForeignTaxCreditMethod.Paid,
        schedule_k3_passive_interest: {
          ...k3,
          partnership_ein: "123456789",
          part_iii_section_4_line_1_foreign_tax: gross,
          part_iii_section_4_line_2_tax_reduction: reduction,
        },
      }],
    }
    : {
      k1_s_corp: [{
        ...common,
        corporation_name: "German Interest Corporation",
        corporation_ein: "123456789",
        box4_interest: 50000,
        box14_foreign_income: 50000,
        box14_foreign_tax: gross,
        box14_foreign_income_category: IncomeCategory.Passive,
        box14_foreign_tax_irs_country_code: "GM",
        box14_foreign_tax_paid_or_accrued_date: "2025-06-15",
        box14_foreign_tax_kind: ForeignTaxKind.Interest,
        box14_foreign_tax_credit_method: ForeignTaxCreditMethod.Paid,
        schedule_k3_passive_interest: {
          ...k3,
          corporation_ein: "123456789",
          part_iii_section_3_line_1_foreign_tax: gross,
          part_iii_section_3_line_2_tax_reduction: reduction,
        },
      }],
    };
  return {
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
    ...source,
    form1116_review: {
      all_foreign_sources_reviewed: true,
      foreign_qualified_dividends: 0,
      foreign_capital_gains_or_losses_present: false,
      source_document_references: [k3Ref],
      no_amt_liability_verified: true,
      single_source_pdf_review: {
        source_document_reference: k3Ref,
        all_foreign_tax_items_identified_confirmed: true,
        all_worldwide_income_sources_identified_confirmed: true,
        all_part_i_deductions_and_losses_except_standard_zero_confirmed: true,
        only_identified_k3_line12_reduction_confirmed: true,
        no_high_tax_kickout_confirmed: true,
        no_foreign_income_adjustment_confirmed: true,
        no_section_960c_increase_confirmed: true,
        no_international_boycott_confirmed: true,
        no_prior_year_carryover_or_carryback_confirmed: true,
        no_preferential_rate_income_confirmed: true,
        no_other_category_credit_confirmed: true,
      },
    },
    form1116_carryover_review: {
      reviews: [{
        income_category: IncomeCategory.Passive,
        prior_year_form1116_line23_limit: 700,
        prior_year_form1116_line24_allowed_credit: 700,
        prior_year_schedule_b_line8_balance: 0,
        source_document_references: [
          "Filed 2024 passive Form 1116 and Schedule B",
        ],
        no_foreign_tax_redetermination_or_special_adjustment: true,
      }],
    },
  };
}

// Independent IRS Tax Table: single taxable income 34,250–34,300 => 3,875.
// K-3 section 4 (1065) / section 3 (1120-S) line 2 reduces creditable tax,
// not gross tax printed in Part II. https://www.irs.gov/instructions/i1116
for (const kind of ["partnership", "corporation"] as const) {
  for (
    const example of [
      {
        id: "remaining-tax",
        gross: 2000,
        reduction: 400,
        credit: 1600,
        carry: 0,
        tax: 2275,
      },
      {
        id: "current-excess",
        gross: 9000,
        reduction: 1000,
        credit: 3875,
        carry: 4125,
        tax: 0,
      },
      {
        id: "full-reduction",
        gross: 2000,
        reduction: 2000,
        credit: 0,
        carry: 0,
        tax: 3875,
      },
    ]
  ) {
    Deno.test(`Form 1116 ${kind} K-3 public review boundary and native amounts: ${example.id}`, async () => {
      const input = sources(kind, example.gross, example.reduction);
      const blocked = f1040_2025.executeReturn(input);
      // Deferred109: public review has not adopted the K-3 review union.
      // Preserve the rejected complete input. Do not insert review facts into
      // calculated pending data to manufacture a positive PDF packet.
      const failure = blocked.diagnostics.find((entry) =>
        entry.nodeType === "start"
      );
      assert(failure);
      assertStringIncludes(
        failure.message,
        "only_identified_k3_line12_reduction_confirmed",
      );
      const {
        single_source_pdf_review: _unsupportedReview,
        ...calculationReview
      } = input.form1116_review;
      const calculationInput = { ...input, form1116_review: calculationReview };
      const result = f1040_2025.executeReturn(calculationInput);
      assertEquals(result.diagnostics, []);
      const pending = normalizeAllPending(result.pending);
      const filer = extractFilerIdentity(pending.f1040);
      const id = `${kind}-${example.id}`;
      const root = Deno.env.get("OPENTAX_FORM1116_K3_PROOF_DIR");
      if (root) {
        await Deno.mkdir(root, { recursive: true });
        await Deno.writeTextFile(
          `${root}/${id}.json`,
          JSON.stringify(
            {
              input,
              blockedDiagnostics: blocked.diagnostics,
              calculationInput,
              pending,
              filer,
              expected: example,
            },
            null,
            2,
          ),
        );
      }
      assertEquals(pending.f1040.line2b_taxable_interest, 50000);
      assertEquals(pending.f1040.line11_agi, 50000);
      assertEquals(pending.f1040.line15_taxable_income, 34250);
      assertEquals(pending.f1040.line16_income_tax, 3875);
      assertEquals(
        pending.schedule3?.line1_foreign_tax_credit ?? 0,
        example.credit,
      );
      assertEquals(pending.f1040.line24_total_tax, example.tax);
      assertEquals(pending.f1040.line37_amount_owed ?? 0, example.tax);
      const prepared = await f1040_2025.prepareReturn(result.pending, filer);
      for (
        const [tag, amount] of [
          ["TotalForeignTaxesPaidOrAccrAmt", example.gross],
          ["ForeignTaxReductionAmt", example.reduction],
          ["ForeignTaxAvailableForCrRedAmt", example.gross - example.reduction],
          ["ForeignTaxCreditAmt", example.credit],
        ] as const
      ) assertStringIncludes(prepared.bundle.xml, `<${tag}>${amount}</${tag}>`);
      if (example.carry > 0) {
        const carry = form1116ScheduleBPdf.projectFields!(
          pending.form1116_schedule_b,
          pending,
        );
        assertEquals(carry.line6_current, example.carry);
        assertEquals(carry.line8_current, example.carry);
      }
      await assertRejects(
        () => buildPdfBytes(pending, filer),
        Error,
        "without an affirmative source inventory",
      );
      if (root) {
        await Deno.writeTextFile(`${root}/${id}.xml`, prepared.bundle.xml);
      }
      for (
        const changed of [
          {
            ...pending,
            [kind === "partnership" ? "k1_partnership" : "k1_s_corp"]:
              undefined,
          },
          {
            ...pending,
            f1040: { ...pending.f1040, line2b_taxable_interest: 50001 },
          },
          {
            ...pending,
            schedule3: {
              ...pending.schedule3,
              line1_foreign_tax_credit: example.credit + 1,
            },
          },
          {
            ...pending,
            f1040: {
              ...pending.f1040,
              line20_nonrefundable_credits: example.credit + 1,
            },
          },
        ]
      ) {
        await assertRejects(
          () => f1040_2025.prepareReturn(changed, filer),
          Error,
        );
      }
      if (kind === "partnership") {
        const row =
          partnershipSchema.parse(pending.k1_partnership).k1_partnerships[0];
        assert(row.schedule_k3_passive_interest);
        for (
          const changed of [
            { ...row, box5_interest: 50001 },
            { ...row, partnership_ein: "987654321" },
            { ...row, source_document_reference: "Other K-1" },
            { ...row, box16_foreign_tax: example.gross + 1 },
            {
              ...row,
              schedule_k3_passive_interest: {
                ...row.schedule_k3_passive_interest,
                part_iii_section_4_line_2_tax_reduction: example.reduction + 1,
              },
            },
          ]
        ) {
          const altered = {
            ...pending,
            k1_partnership: { k1_partnerships: [changed] },
          };
          await assertRejects(
            () => f1040_2025.prepareReturn(altered, filer),
            Error,
          );
        }
      } else {
        const row = corporationSchema.parse(pending.k1_s_corp).k1_s_corps[0];
        assert(row.schedule_k3_passive_interest);
        for (
          const changed of [
            { ...row, box4_interest: 50001 },
            { ...row, corporation_ein: "987654321" },
            { ...row, source_document_reference: "Other K-1" },
            { ...row, box14_foreign_tax: example.gross + 1 },
            {
              ...row,
              schedule_k3_passive_interest: {
                ...row.schedule_k3_passive_interest,
                part_iii_section_3_line_2_tax_reduction: example.reduction + 1,
              },
            },
          ]
        ) {
          const altered = { ...pending, k1_s_corp: { k1_s_corps: [changed] } };
          await assertRejects(
            () => f1040_2025.prepareReturn(altered, filer),
            Error,
          );
        }
      }
    });
  }
}
