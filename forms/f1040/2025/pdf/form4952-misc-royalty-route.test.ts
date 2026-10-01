import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;

Deno.test("portfolio royalty joins Schedule E, Form 4952, Schedule A, and a filled return", async () => {
  const payer = {
    payer_name: "Patent Licensee",
    payer_tin: "123456789",
    recipient_tin: "111223333",
    box2_royalties: 800,
    box2_royalties_routing: "schedule_e",
    box2_nonpassive_portfolio_investment_for_form4952_verified: true,
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      f1098: [{
        lender_name: "Home Lender",
        recipient_tin: "111223333",
        source_document_reference: "Synthetic 2025 Form 1098 copy",
        box1_mortgage_interest: 18_000,
        box1_current_year_deductible_interest: 18_000,
        box1_deduction_workpaper_reference: "2025 interest workpaper",
        for_routing: "A",
      }],
      f1099m: [payer],
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
          payer_name: payer.payer_name,
          payer_tin: payer.payer_tin,
          recipient_tin: payer.recipient_tin,
          box2_gross_royalties: 800,
        },
      }],
      form4952: {
        investment_interest_expense: 300,
        investment_interest_expense_excludes_royalty_attributable_interest:
          true,
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
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_e.royalty_income, 800);
  assertEquals(result.pending.schedule1.line5_schedule_e, 800);
  assertEquals(result.pending.schedule1.line9_total_other_income, undefined);
  assertEquals(result.pending.schedule1.line10_total_additional_income, 800);
  assertEquals(result.pending.form4952.line4a, 800);
  assertEquals(result.pending.form4952.line8, 300);
  assertEquals(result.pending.schedule_a.line_9_investment_interest, 300);
  assertEquals(result.pending.f1040.line8_additional_income, 800);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 18_300);
  const pending = buildPending(result.pending);
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
  const xsd = new URL(
    "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 7);
  if (Deno.args.includes("--write-review-artifacts")) {
    const directory = new URL(
      "../../../../.state/research/ty2025-filled-pdf-review/2026-09-30-form4952-misc-royalty/",
      import.meta.url,
    ).pathname;
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
  }
});
