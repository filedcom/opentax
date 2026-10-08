import { normalizeAllPending } from "../../../domains/execution/pending.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../builder.ts";
import { form4952Pdf } from "../../forms/investments/f4952.ts";
import { pdfReviewFixtures } from "../../review-fixtures.ts";
import { withSyntheticForm1098Copy } from "../composed/review-1098-copy.fixture.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;
const royalty = {
  payer_name: "Patent Licensee",
  payer_tin: "123456789",
  recipient_tin: "111223333",
  box2_royalties: 800,
  box2_royalties_routing: "schedule_e" as const,
  box2_nonpassive_portfolio_investment_for_form4952_verified: true as const,
};
const trace = {
  tax_year: 2025 as const,
  owner_tin: "111223333",
  loan_id: "taxable-securities-loan",
  lender_statement_reference: "lender-2025-interest",
  loan_agreement_reference: "signed-securities-loan",
  disbursement_record_reference: "2025-direct-disbursement",
  purchase_record_reference: "2025-taxable-security-purchase",
  loan_date: "2025-01-10",
  direct_purchase_date: "2025-01-10",
  borrowed_principal: 10_000,
  direct_taxable_securities_purchase: 10_000,
  asset_id: "taxable-security-lot-1",
  no_other_loan_proceeds_use: true as const,
  no_tax_exempt_or_passive_activity_asset: true as const,
  investment_use_maintained_through_2025: true as const,
  lender_2025_interest_total: 300,
  interest_payments: [{
    payment_id: "2025-interest-payment",
    payment_date: "2025-12-31",
    payment_record_reference: "bank-payment-2025",
    interest_amount: 300,
  }],
};

async function filing() {
  return execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    f1098: [
      await withSyntheticForm1098Copy("form4952-royalty-trace", {
        lender_name: "Home Lender",
        recipient_tin: "111223333",
        source_document_reference: "2025-home-mortgage-copy",
        box1_mortgage_interest: 18_000,
        box1_current_year_deductible_interest: 18_000,
        box1_deduction_workpaper_reference: "2025-home-interest-workpaper",
        for_routing: "A",
      }),
    ],
    f1099m: [royalty],
    schedule_e: [{
      tsj: "T",
      property_description: "Patent royalty property",
      property_type: 6,
      activity_type: "D",
      fair_rental_days: 0,
      personal_use_days: 0,
      rent_income: 0,
      royalties_income: 800,
      form_1099_payments_made: false,
      f1099m_royalty_source: {
        payer_name: royalty.payer_name,
        payer_tin: royalty.payer_tin,
        recipient_tin: royalty.recipient_tin,
        box2_gross_royalties: 800,
      },
    }],
    form4952: {
      investment_interest_expense: 300,
      investment_interest_expense_excludes_royalty_attributable_interest: true,
      direct_debt_trace: trace,
      amt_refigure: {
        prior_year_disallowed_interest: 0,
        interest_on_private_activity_bonds: 0,
        other_gross_income_adjustment: 0,
        qualified_dividends_adjustment: 0,
        net_disposition_gain_adjustment: 0,
        net_capital_gain_adjustment: 0,
        investment_expenses_adjustment: 0,
      },
    },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("traced taxable-securities loan and separate royalty reach Form 4952, Schedule E/A, Form 1040, native and PDF", async () => {
  const result = await filing();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_e.royalty_income, 800);
  assertEquals(result.pending.schedule1.line5_schedule_e, 800);
  assertEquals(result.pending.form4952.line4a, 800);
  assertEquals(result.pending.form4952.line8, 300);
  assertEquals(result.pending.schedule_a.line_9_investment_interest, 300);
  assertEquals(result.pending.f1040.line8_additional_income, 800);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 18_300);
  const pending = buildPending(result.pending);
  assertEquals(
    form4952Pdf.projectFields?.(pending.form4952!, normalizeAllPending(pending))
      ?.line8,
    300,
  );
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<InvestmentPropGrossIncomeAmt>800</InvestmentPropGrossIncomeAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<InvestmentInterestExpDeductAmt>300</InvestmentInterestExpDeductAmt>",
  );
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals(pdf.length > 0, true);

  for (
    const changedTrace of [
      { ...trace, owner_tin: "999999999" },
      { ...trace, direct_taxable_securities_purchase: 9_999 },
      { ...trace, lender_2025_interest_total: 301 },
      {
        ...trace,
        interest_payments: [{
          ...trace.interest_payments[0],
          interest_amount: 299,
        }],
      },
    ]
  ) {
    const altered = {
      ...pending,
      form4952: { ...pending.form4952, direct_debt_trace: changedTrace },
    };
    await assertRejects(() =>
      buildMefBundle(altered as typeof pending, {
        filer: base.filer,
        attachments: [],
      })
    );
    await assertRejects(() => buildPdfBytes(altered, base.filer, ".pdf-cache"));
  }
});
