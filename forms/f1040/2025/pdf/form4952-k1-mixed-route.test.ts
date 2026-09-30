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
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const amtRefigure = {
  prior_year_disallowed_interest: 0,
  interest_on_private_activity_bonds: 0,
  other_gross_income_adjustment: 0,
  qualified_dividends_adjustment: 0,
  net_disposition_gain_adjustment: 0,
  net_capital_gain_adjustment: 0,
  investment_expenses_adjustment: 0,
};

for (
  const source of [
    {
      name: "1099-INT",
      payer: {
        f1099int: [{
          payer_name: "Investment Bank",
          box1: 500,
          investment_property_for_form4952: true,
        }],
      },
      gross: 500,
      qualified: 0,
    },
    {
      name: "1099-DIV",
      payer: {
        f1099div: [{
          payerName: "Investment Fund",
          isNominee: false,
          box11: false,
          box1a: 500,
          box1b: 100,
          investment_property_for_form4952: true,
        }],
      },
      gross: 500,
      qualified: 100,
    },
  ]
) {
  Deno.test(`recipient-owned K-1 code H and ${source.name} reach a full Form 4952 return`, async () => {
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
        ...source.payer,
        k1_partnership: [{
          partnership_name: "Portfolio Partnership",
          partnership_ein: "123456789",
          source_document_reference: "2025 partnership K-1 source",
          recipient_tin: "111223333",
          box13_code_h_investment_interest: 300,
        }],
        form4952: { amt_refigure: amtRefigure },
      },
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.form4952.line1, 300);
    assertEquals(result.pending.form4952.line4a, source.gross);
    assertEquals(result.pending.form4952.line4b, source.qualified);
    assertEquals(result.pending.form4952.line8, 300);
    assertEquals(result.pending.schedule_a.line_9_investment_interest, 300);
    assertEquals(result.pending.f1040.line12e_itemized_deductions, 18_300);
    if (source.name === "1099-INT") {
      assertEquals(result.pending.f1040.line2b_taxable_interest, 500);
    } else {
      assertEquals(result.pending.f1040.line3a_qualified_dividends, 100);
      assertEquals(result.pending.f1040.line3b_ordinary_dividends, 500);
    }
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: base.filer,
      attachments: [],
    });
    assertStringIncludes(
      bundle.xml,
      `<InvestmentPropGrossIncomeAmt>${source.gross}</InvestmentPropGrossIncomeAmt>`,
    );
    assertStringIncludes(
      bundle.xml,
      "<InvestmentInterestExpDeductAmt>300</InvestmentInterestExpDeductAmt>",
    );
    if (source.qualified > 0) {
      assertStringIncludes(
        bundle.xml,
        `<InvestmentPropQualDividendsAmt>${source.qualified}</InvestmentPropQualDividendsAmt>`,
      );
    }
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
    assertEquals((await PDFDocument.load(pdf)).getPageCount(), 4);
    if (Deno.args.includes("--write-review-artifacts")) {
      const directory = new URL(
        `../../../../.state/research/ty2025-filled-pdf-review/2026-10-01-form4952-k1-${source.name.toLowerCase()}/`,
        import.meta.url,
      ).pathname;
      await Deno.mkdir(directory, { recursive: true });
      await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
    }
  });
}
