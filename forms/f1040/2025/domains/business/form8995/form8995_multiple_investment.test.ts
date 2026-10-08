import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { form8995 } from "../../../mef/forms/business/f8995/f8995.ts";
import { irs1040Pdf } from "../../../pdf/forms/identity/f1040.ts";
import { form8995Pdf } from "../../../pdf/forms/business/f8995/f8995.ts";
import { allocateSharedSeDeduction } from "../../../../nodes/inputs/schedule_c/qbi-multiple.ts";
import { scheduleSELines } from "../../../../nodes/intermediate/forms/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../../nodes/config/index.ts";
import {
  ordinaryTax2025,
  qualifiedDividendTax2025,
} from "../../../../nodes/intermediate/worksheets/tax_table_2025.ts";
import { FilingStatus } from "../../../../nodes/types.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-schedule-c")!;
const wageBase = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-refund"
)!;
const cases = [
  {
    id: "profitable-cents",
    profits: [60_000.49, 40_000.49],
    wages: false,
    interest: [1000.49, 700.50],
    ordinary: [2000.49, 1000.50],
    qualified: [1200.49, 600.49],
    capital: [1000.49, 800.49],
    line12: 3602,
    deduction: 16017,
    tax: 9551,
    rawAgi: 99438.94,
    filedTaxable: 67672,
  },
  {
    id: "mixed-loss-wages",
    profits: [80_000.50, 20_000.49, -15_000.49],
    wages: true,
    interest: [1200.49, 600.50],
    ordinary: [15000.49, 7000.50],
    qualified: [12000.49, 6500.50],
    capital: [10000.49, 5500.49],
    line12: 34002,
    deduction: 15799,
    tax: 22618,
    rawAgi: 168298.46,
    filedTaxable: 136749,
  },
  {
    id: "zero-rate-income-limit",
    profits: [25_000.49, 15_000.50, -5_000.49],
    wages: false,
    interest: [1000.49, 500.49],
    ordinary: [10000.49, 9000.50],
    qualified: [8000.49, 8000.49],
    capital: [6000.49, 6000.49],
    line12: 28002,
    deduction: 4256,
    tax: 1805,
    rawAgi: 65030.45,
    filedTaxable: 45024,
  },
  {
    id: "net-loss-investment",
    profits: [10_000.49, -20_000.50],
    wages: true,
    interest: [1000.49, 700.50],
    ordinary: [2000.49, 1000.50],
    qualified: [1200.49, 600.49],
    capital: [1000.49, 800.49],
    line12: 3602,
    deduction: 0,
    tax: 3023,
    rawAgi: 46502.95,
    filedTaxable: 30753,
  },
];
function inputsFor(scenario: typeof cases[number]) {
  const original = (base.inputs.schedule_c as Record<string, unknown>[])[0];
  const profit = scenario.profits.reduce((sum, value) => sum + value, 0);
  const deduction = scheduleSELines({
    net_profit_schedule_c: profit,
    w2_ss_wages: scenario.wages ? 50_000 : 0,
  }, CONFIG_BY_YEAR[2025].ssWageBase)?.line13 ?? 0;
  const allocations = allocateSharedSeDeduction(scenario.profits, deduction);
  return {
    ...base.inputs,
    general: {
      ...(base.inputs.general as Record<string, unknown>),
      ...(profit < 0
        ? {
          form461_scope_review: {
            only_schedule_c_and_f_business_items: true,
            other_part_i_lines_zero: true,
            part_ii_adjustments_zero: true,
            post_at_risk_and_passive_limits_confirmed: true,
            line2_schedule_c_amount: profit,
            line6_schedule_f_amount: 0,
            source_document_refs: [
              "Synthetic combined loss and Form 461 scope review",
            ],
          },
        }
        : {}),
    },
    ...(scenario.wages
      ? {
        w2: [{
          ...(wageBase.inputs.w2 as Record<string, unknown>[])[0],
          employee_ssn: "111-22-3333",
          box1_wages: 50_000,
          box3_ss_wages: 50_000,
          box5_medicare_wages: 50_000,
        }],
      }
      : {}),
    schedule_c: scenario.profits.map((amount, index) => ({
      ...original,
      business_reference: `SYNTHETIC-BUSINESS-${index}`,
      line_c_business_name: `Example Business ${index + 1}`,
      line_d_ein: String(123456789 + index),
      line_1_gross_receipts: Math.max(0, amount),
      line_18_office_expense: Math.max(0, -amount),
      ...(amount < 0 ? { line_32_at_risk: "a" } : {}),
      qbi_specified_service: index === 1,
      qbi_se_tax_allocation_review: {
        deduction_amount: allocations[index],
        allocation_method: "positive_profit_proportion_with_cent_residual",
        reasonable_for_business_facts_confirmed: true,
        consistently_applied_and_books_agree_confirmed: true,
        all_businesses_included_confirmed: true,
        no_aggregation_confirmed: true,
        workpaper_reference: "Synthetic shared allocation workpaper",
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2026-03-01",
      },
    })),
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    f1099int: scenario.interest.map((amount, index) => ({
      payer_name: `Example Bank ${index + 1}`,
      payer_tin: String(234567890 + index),
      recipient_tin: "111223333",
      account_number: `SYNTHETIC-INT-${index}`,
      source_document_reference: `Synthetic issued INT copy ${index}`,
      box1: amount,
    })),
    f1099div: scenario.ordinary.map((amount, index) => ({
      payerName: `Example Fund ${index + 1}`,
      payerTin: String(345678901 + index),
      recipient_tin: "111223333",
      account_number: `SYNTHETIC-DIV-${index}`,
      source_document_reference: `Synthetic issued DIV copy ${index}`,
      isNominee: false,
      box11: false,
      box1a: amount,
      box1b: scenario.qualified[index],
      box2a: scenario.capital[index],
      qualified_dividend_filing_review: {
        ex_dividend_date: "2025-07-14",
        qualified_held_days_in_121_day_window: 91,
        diminished_risk_days_excluded: 0,
        ordinary_stock_rule_confirmed: true,
        eligible_issuer_and_no_disqualified_dividend_confirmed: true,
        no_related_payment_obligation_confirmed: true,
        review_reference:
          `Synthetic qualified dividend eligibility review ${index}`,
        reviewed_on: "2026-03-01",
      },
    })),
  };
}
async function validate(xml: string) {
  const schema = new URL(
    "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const child = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", schema, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(xml));
  await writer.close();
  const result = await child.output();
  assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
}
Deno.test("owned multi-payer investment income combines with multi-business QBI, losses, SE and preferential tax", async () => {
  for (const scenario of cases) {
    const result = f1040_2025.executeReturn(inputsFor(scenario));
    assertEquals(result.diagnostics, [], scenario.id);
    const pending = normalizeAllPending(result.pending);
    const qbi = pending.form8995;
    assert(
      Math.abs((pending.f1040.line11_agi as number) - scenario.rawAgi) < 1e-8,
    );
    assertEquals(
      Math.round(pending.f1040.line15_taxable_income as number),
      scenario.filedTaxable,
    );
    if (scenario.id === "net-loss-investment") {
      assertEquals(pending.f1040.line8_additional_income, -10000.01);
      assertEquals(qbi.line2, -10001);
      assertEquals(qbi.line16, 10001);
    }
    assertEquals(qbi.line12, scenario.line12);
    assertEquals(qbi.line15, scenario.deduction, scenario.id);
    assertEquals(
      qbi.line13,
      Math.max(0, (qbi.line11 as number) - scenario.line12),
    );
    const qualified = scenario.qualified.reduce((sum, value) => sum + value, 0);
    const capital = scenario.capital.reduce((sum, value) => sum + value, 0);
    assertEquals(pending.f1040.line3a_qualified_dividends, qualified);
    assertEquals(pending.f1040.line7a_cap_gain_distrib, capital);
    const tax = qualifiedDividendTax2025(
      pending.f1040.line15_taxable_income as number,
      qualified,
      capital,
      FilingStatus.Single,
    );
    assertEquals(pending.f1040.line16_income_tax, scenario.tax);
    assertEquals(tax, scenario.tax);
    assert(
      tax <
        ordinaryTax2025(
          pending.f1040.line15_taxable_income as number,
          FilingStatus.Single,
        ),
    );
    assertEquals((qbi.investment_interest_sources as unknown[]).length, 2);
    assertEquals((qbi.investment_dividend_sources as unknown[]).length, 2);
    const projected = form8995Pdf.projectFields!(qbi, pending);
    assertEquals(projected.line12, scenario.line12);
    assertEquals(projected.line15, scenario.deduction);
    assertEquals(
      irs1040Pdf.projectFields!(pending.f1040, pending)
        .print_schedule_d_not_required,
      true,
    );
    const native = form8995.build(qbi, { filer: base.filer, pending });
    assertStringIncludes(
      native,
      `<NetCapitalGainAmt>${scenario.line12}</NetCapitalGainAmt>`,
    );
    const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
    await validate(prepared.bundle.xml);
    assertStringIncludes(
      prepared.bundle.xml,
      `<AdjustedGrossIncomeAmt>${
        Math.round(scenario.rawAgi)
      }</AdjustedGrossIncomeAmt>`,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      `<TaxableIncomeAmt>${scenario.filedTaxable}</TaxableIncomeAmt>`,
    );
    assertStringIncludes(prepared.bundle.xml, "<IRS1040ScheduleB documentId=");
    assertStringIncludes(prepared.bundle.xml, `<TaxAmt>${tax}</TaxAmt>`);
    const pdf = await prepared.renderPdf();
    assert(pdf.length > 0);
    if (Deno.args.includes("--write-review-artifacts")) {
      const directory = new URL(
        `../../../.state/research/ty2025-filled-pdf-review/2026-10-06-form8995-investment/${scenario.id}/`,
        import.meta.url,
      ).pathname;
      await Deno.mkdir(directory, { recursive: true });
      await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
      await Deno.writeTextFile(`${directory}return.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${directory}calculation.json`,
        JSON.stringify(
          {
            qbi,
            f1040: pending.f1040,
            taxWorksheet: pending.income_tax_calculation,
          },
          null,
          2,
        ),
      );
    }
  }
});
Deno.test("multi-business investment exports reject altered ownership, copies, payers, holdings, totals and tax", () => {
  const result = f1040_2025.executeReturn(inputsFor(cases[1]));
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  form8995.build(pending.form8995, { filer: base.filer, pending });
  form8995Pdf.projectFields!(pending.form8995, pending);
  const alter = (mutate: (copy: typeof pending) => void) => {
    const copy = structuredClone(pending);
    mutate(copy);
    return copy;
  };
  const changes = [
    alter((p) => {
      (p.f1099int.f1099ints as Record<string, unknown>[])[0].recipient_tin =
        "999887777";
    }),
    alter((p) => {
      (p.f1099int.f1099ints as Record<string, unknown>[])[0].payer_tin =
        "987654321";
    }),
    alter((p) => {
      delete (p.f1099int.f1099ints as Record<string, unknown>[])[0]
        .source_document_reference;
    }),
    alter((p) => {
      (p.f1099int.f1099ints as Record<string, unknown>[])[1]
        .source_document_reference = "Synthetic issued INT copy 0";
    }),
    alter((p) => {
      (p.f1099int.f1099ints as Record<string, unknown>[])[0].box1 = 100;
    }),
    alter((p) => {
      (p.f1099div.f1099divs as Record<string, unknown>[])[0].recipient_tin =
        "999887777";
    }),
    alter((p) => {
      (p.f1099div.f1099divs as Record<string, unknown>[])[0].payerName =
        "Different Fund";
    }),
    alter((p) => {
      delete (p.f1099div.f1099divs as Record<string, unknown>[])[0]
        .source_document_reference;
    }),
    alter((p) => {
      (p.f1099div.f1099divs as Record<string, unknown>[])[1]
        .source_document_reference = "Synthetic issued DIV copy 0";
    }),
    alter((p) => {
      (p.f1099div.f1099divs as Record<string, unknown>[])[0].box1b = 11000;
    }),
    alter((p) => {
      (p.f1099div.f1099divs as Record<string, unknown>[])[0].box2a = 1;
    }),
    alter((p) => {
      const review = (p.f1099div.f1099divs as Record<string, unknown>[])[0]
        .qualified_dividend_filing_review as Record<string, unknown>;
      review.qualified_held_days_in_121_day_window = 60;
    }),
    alter((p) => {
      delete p.form8995.investment_interest_sources;
    }),
    alter((p) => {
      delete p.form8995.investment_dividend_sources;
    }),
    alter((p) => {
      (p.form8995.investment_dividend_totals as Record<string, unknown>)
        .capital_gain_distributions = 0;
    }),
    alter((p) => {
      p.schedule_b.print_line4_total = 0;
    }),
    alter((p) => {
      (p.schedule_b.dividend_rows as Record<string, unknown>[])[0].payerName =
        "Changed Fund";
    }),
    alter((p) => {
      p.schedule_d.line13_cap_gain_distrib = 0;
    }),
    alter((p) => {
      p.income_tax_calculation.qualified_dividends = 0;
    }),
    alter((p) => {
      p.f1040.line16_income_tax = ordinaryTax2025(
        p.f1040.line15_taxable_income as number,
        FilingStatus.Single,
      );
    }),
    alter((p) => {
      p.f1040.line2b_taxable_interest = 0;
    }),
    alter((p) => {
      p.f1040.line3a_qualified_dividends = 0;
    }),
    alter((p) => {
      p.form8995.line12 = 0;
    }),
    alter((p) => {
      p.form8995.line15 = 1;
    }),
  ];
  for (const changed of changes) {
    assertThrows(() =>
      form8995.build(changed.form8995, { filer: base.filer, pending: changed })
    );
    assertThrows(() => form8995Pdf.projectFields!(changed.form8995, changed));
  }
});

Deno.test("multi-business QBI line 12 adds entered qualified dividend and distribution totals separately", async () => {
  const scenario = {
    ...cases[0],
    qualified: [1200.25, 600.24],
    capital: [1000.25, 800.24],
  };
  const result = f1040_2025.executeReturn(inputsFor(scenario));
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.f1040.line3a_qualified_dividends, 1800.49);
  assertEquals(pending.f1040.line7a_cap_gain_distrib, 1800.49);
  assertEquals(pending.form8995.line12, 3600);
  assertEquals(pending.form8995.line13, 80088);
  assertEquals(pending.form8995.line15, 16018);
  assertEquals(
    form8995Pdf.projectFields!(pending.form8995, pending).line12,
    3600,
  );
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<QualifiedDividendsAmt>1800</QualifiedDividendsAmt>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<CapitalGainLossAmt>1800</CapitalGainLossAmt>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<NetCapitalGainAmt>3600</NetCapitalGainAmt>",
  );
  await validate(prepared.bundle.xml);
});
