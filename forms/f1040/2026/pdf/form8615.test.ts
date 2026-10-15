import { assert, assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { childTaxFixture2026 } from "../inputs/child-tax.fixture.ts";
import {
  syntheticDividend2026,
  syntheticPabReview2026,
} from "../inputs/investment.fixture.ts";
import { syntheticMedical2026 } from "../schedule-a.fixture.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildForm8615PdfBytes2026 } from "./form8615.ts";
import type { calculateIncomeTax2026 } from "../nodes/income-tax.ts";

export function childTaxPdfCases2026() {
  const ordinary = childTaxFixture2026();
  const preferential = childTaxFixture2026(0, 4000);
  const dividend = syntheticDividend2026();
  dividend.box1a = 1000;
  dividend.box1b = 1000;
  dividend.qualified_distribution_lots![0].amount = 1000;
  preferential.investment_income.f1099divs = [dividend];
  preferential.f8615.claim.family!.parent_returns[0].qualified_dividends = 1000;
  preferential.f8615.claim.family!.parent_returns[0].line16_income_tax = 8987;
  const stop3 = childTaxFixture2026(1000, 3000);
  Object.assign(stop3.investment_income.f1099ints[0], { box2: 1000 });
  const stop5 = childTaxFixture2026(20000, 3000);
  const medical = {
    ...syntheticMedical2026(),
    payer_ssn: stop5.general.taxpayer_ssn,
    patient_ssn: stop5.general.taxpayer_ssn,
    amount_paid: 30000,
    reimbursed_amount: 0,
    tax_free_funding_amount: 0,
    nonmedical_amount: 0,
  };
  const sibling = childTaxFixture2026();
  sibling.f8615.claim.family!.other_children = [{
    document_reference: "sibling-form8615",
    child_tin: "111223333",
    selected_parent_return_reference: "return-987654321",
    tax_year: 2026,
    line1_unearned_income: 5000,
    line4_taxable_income: 3650,
    line5_net_unearned_income: 2300,
    qualified_dividends: 0,
    net_capital_gain: 0,
    adjusted_gross_income: 5000,
    deduction: 1350,
    additional_deductions: 0,
    taking_standard_deduction: true,
    directly_connected_itemized_deductions: 0,
    directly_connected_preferential_deductions: 0,
    schedule_d_tax_worksheet_used: false,
    schedule_j_used: false,
    form2555_used: false,
  }];
  const roundedRatio = childTaxFixture2026(0, 2302700);
  roundedRatio.f8615.claim.family!.other_children = [{
    ...sibling.f8615.claim.family!.other_children[0],
    line1_unearned_income: 2701,
    line4_taxable_income: 1351,
    line5_net_unearned_income: 1,
    adjusted_gross_income: 2701,
  }];
  const amt = childTaxFixture2026(0, 20000);
  Object.assign(amt.investment_income.f1099ints[0], {
    box8: 100000,
    box9: 100000,
    pab_review: syntheticPabReview2026(),
  });
  return [
    ordinary,
    preferential,
    stop3,
    {
      ...stop5,
      schedule_a: { ...stop5.schedule_a, medical_payments: [medical] },
    },
    sibling,
    amt,
    roundedRatio,
  ];
}
Deno.test("2026 child-tax bundles reconcile full and stopped Form 8615 attachments", async () => {
  const cases = childTaxPdfCases2026();
  for (const [i, raw] of cases.entries()) {
    const bundle = await buildDraftReturnPdf2026(raw),
      p = bundle.calculation.pending;
    assertEquals(bundle.filingReady, false);
    assertEquals(
      p.f1040.line16_income_tax,
      [412, 297, 156, 0, 412, 2212, 807457][i],
    );
    const manifest = bundle.attachments.find((a) => a.form === "form8615");
    assert(manifest);
    assertEquals(manifest.formPages.length, 1);
    assertEquals(manifest.statementPages, []);
    assertEquals(bundle.unfinishedReceivers.includes("form8615"), false);
    const doc = await PDFDocument.load(bundle.bytes);
    assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
    assert(
      doc.getPages().every((page) => !page.node.has(PDFName.of("Annots"))),
    );
    const calculation = p.income_tax_calculation.calculation_2026 as ReturnType<
      typeof calculateIncomeTax2026
    >;
    if (i === 4) {
      assertEquals(calculation.form8615!.fields.line12b_allocation_ratio, .5);
    }
    if (i === 6) {
      assertEquals(calculation.form8615!.fields.line12b_allocation_ratio, 1);
    }
    if (i === 5) {
      assertEquals(p.f1040.line17_additional_taxes, 5562);
      assert(bundle.attachments.some((a) => a.form === "form6251"));
    }
    if (i === 1) {
      for (
        const flag of [
          "line9_preferential_tax_used",
          "line10_preferential_tax_used",
          "line15_preferential_tax_used",
          "line17_preferential_tax_used",
        ] as const
      ) assertEquals(calculation.form8615!.fields[flag], true);
    }
    const destinations = {
      form1040_line11b: Number(p.f1040.line11b_agi),
      form1040_line12e: Number(p.f1040.line12e_standard_or_itemized),
      form1040_line15: Number(p.f1040.line15_taxable_income),
      form1040_line16: Number(p.f1040.line16_income_tax),
    };
    await assertRejects(
      () =>
        buildForm8615PdfBytes2026(calculation.source_input, {
          ...destinations,
          form1040_line16: destinations.form1040_line16 + 1,
        }, { name: "Synthetic Investor", ssn: raw.general.taxpayer_ssn }),
      Error,
      "destinations disagree",
    );
    await assertRejects(
      () =>
        buildForm8615PdfBytes2026(calculation.source_input, destinations, {
          name: "Wrong Child",
          ssn: "111223333",
        }),
      Error,
      "identity or destinations",
    );
  }
});
