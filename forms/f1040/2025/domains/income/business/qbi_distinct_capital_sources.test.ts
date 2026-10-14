import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../../return-processing/pending.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { form8995a } from "../../../mef/forms/deductions/business/f8995a/f8995a.ts";
import { form8995aPdf } from "../../../pdf/forms/deductions/business/f8995a.ts";
import { calculateScheduleCLossLines } from "../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { form8995 } from "../../../mef/forms/deductions/business/f8995/f8995.ts";
import { irs1040Pdf } from "../../../pdf/forms/general/return-assembly/f1040.ts";
import { form8995Pdf } from "../../../pdf/forms/deductions/business/f8995/f8995.ts";
import { allocateSharedSeDeduction } from "../../../../nodes/inputs/income/business/schedule_c/qbi-multiple.ts";
import { scheduleSELines } from "../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../../nodes/config/index.ts";
import {
  ordinaryTax2025,
  qualifiedDividendTax2025,
} from "../../../../nodes/intermediate/worksheets/taxes/calculation/tax_table_2025.ts";
import { FilingStatus } from "../../../../nodes/types.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-schedule-c")!;
const wageBase = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-refund"
)!;
const baseline = {
  profits: [60000.49, 40000.49],
  wages: false,
  interest: [1000.49, 700.50],
  ordinary: [2000.49, 1000.50],
  qualified: [1200.25, 600.24],
  capital: [1000.25, 800.24],
};
function inputsFor(scenario: typeof baseline) {
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

function sourceReturn(id: string) {
  const inputs = inputsFor(baseline);
  if (id === "single-business") {
    inputs.schedule_c =
      inputsFor({ ...baseline, profits: [100000.98] }).schedule_c;
    delete (inputs.schedule_c[0] as Partial<typeof inputs.schedule_c[0]>)
      .qbi_se_tax_allocation_review;
  }
  if (id === "broker-net-gain") {
    inputs.f1099div = inputs.f1099div.map((item, index) => ({
      ...item,
      box2a: [300.12, 200.12][index],
    }));
    return {
      ...inputs,
      f1099b: [
        {
          recipient_ssn: "111223333",
          payer_tin: "456789012",
          source_document_reference: "Synthetic issued broker statement",
          transaction_id: "SYNTHETIC-LT",
          part: "D",
          description: "Example long-term shares",
          date_acquired: "2023-01-04",
          date_sold: "2025-10-02",
          proceeds: 3500.25,
          cost_basis: 2000,
        },
        {
          recipient_ssn: "111223333",
          payer_tin: "456789012",
          source_document_reference: "Synthetic issued broker statement",
          transaction_id: "SYNTHETIC-ST",
          part: "A",
          description: "Example short-term shares loss",
          date_acquired: "2025-03-04",
          date_sold: "2025-10-02",
          proceeds: 1000,
          cost_basis: 1200,
        },
      ],
    };
  }
  if (id === "advanced-business-loss") {
    const original = (base.inputs.schedule_c as Record<string, unknown>[])[0];
    return {
      ...inputs,
      w2: [{
        ...(wageBase.inputs.w2 as Record<string, unknown>[])[0],
        box1_wages: 300000,
        box2_fed_withheld: 60000,
        box3_ss_wages: 176100,
        box4_ss_withheld: 10918.20,
        box5_medicare_wages: 300000,
        box6_medicare_withheld: 4350,
      }],
      schedule_c: [
        {
          ...original,
          business_reference: "SYNTHETIC-PROFIT",
          line_c_business_name: "Example profit",
          line_d_ein: "123456789",
          line_1_gross_receipts: 1400,
          line_26_wages: 100,
          qbi_w2_wages: 100,
          qbi_unadjusted_basis: 0,
          qbi_no_other_adjustments_confirmed: true,
        },
        {
          ...original,
          business_reference: "SYNTHETIC-LOSS",
          line_c_business_name: "Example loss",
          line_d_ein: "123456790",
          line_1_gross_receipts: 0,
          line_18_office_expense: 1000,
          line_32_at_risk: "a",
          qbi_w2_wages: 0,
          qbi_unadjusted_basis: 0,
          qbi_no_other_adjustments_confirmed: true,
        },
      ],
    };
  }
  return inputs;
}
const ids = [
  "single-business",
  "multiple-business",
  "broker-net-gain",
  "advanced-business-loss",
];
Deno.test("distinct equal dividend and capital contributions file through simplified and advanced QBI", async () => {
  for (const id of ids) {
    const result = f1040_2025.executeReturn(sourceReturn(id));
    assertEquals(result.diagnostics, [], id);
    const pending = normalizeAllPending(result.pending);
    const simple = id !== "advanced-business-loss";
    const qbi = pending[simple ? "form8995" : "form8995a"];
    const rawCapital = id === "broker-net-gain"
      ? (3500.25 - 2000) + (300.12 + 200.12) - 200
      : 1800.49;
    assertEquals(qbi.qbi_capital_sources, [
      { source: "f1099div.qualified_dividends", amount: 1800.49 },
      { source: "schedule_d.net_capital_gain", amount: rawCapital },
    ], id);
    if (simple) {
      assertEquals(qbi.line12, 3600);
      assertEquals(qbi.net_capital_gain, 1800.49 + rawCapital);
      assertEquals(form8995Pdf.projectFields!(qbi, pending).line12, 3600);
      form8995.build(qbi, { filer: base.filer, pending });
    } else {
      assertEquals(qbi.net_capital_gain, 3600);
      const lines = calculateScheduleCLossLines(qbi as never);
      assertEquals(lines.parent.line34, 3600);
      assertEquals(
        lines.parent.line35,
        Math.round(qbi.taxable_income as number) - 3600,
      );
      form8995a.build(qbi as never, { filer: base.filer, pending });
      assertEquals(
        form8995aPdf.projectFields!(qbi as never, pending).line34,
        3600,
      );
    }
    const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
    await validate(prepared.bundle.xml);
    assertStringIncludes(
      prepared.bundle.xml,
      "<NetCapitalGainAmt>3600</NetCapitalGainAmt>",
    );
    if (id === "broker-net-gain") {
      assertStringIncludes(
        prepared.bundle.xml,
        "<IRS1040ScheduleD documentId=",
      );
    }
    const pdf = await prepared.renderPdf();
    assert(pdf.length > 0);
    if (Deno.args.includes("--write-review-artifacts")) {
      const directory = new URL(
        `../../../.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-distinct/${id}/`,
        import.meta.url,
      ).pathname;
      await Deno.mkdir(directory, { recursive: true });
      await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
      await Deno.writeTextFile(`${directory}return.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${directory}calculation.json`,
        JSON.stringify(pending, null, 2),
      );
    }
  }
});
Deno.test("distinct QBI contributions and qualified dividend reviews reject source and calendar tampering", () => {
  for (const id of ids) {
    const result = f1040_2025.executeReturn(sourceReturn(id));
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const key = id === "advanced-business-loss" ? "form8995a" : "form8995";
    const mutations: ((p: typeof pending) => void)[] = [
      (p) => {
        (p[key].qbi_capital_sources as { amount: number }[])[1].amount = 0;
      },
      (p) => {
        (p[key].qbi_capital_sources as { source: string }[])[1].source =
          "f1099div.qualified_dividends";
      },
      (p) => {
        p[key].net_capital_gain = 1800.49;
      },
      (p) => {
        delete p[key].net_capital_gain;
      },
      (p) => {
        delete p[key].qbi_capital_sources;
        p[key].net_capital_gain = 0;
      },
      (p) => {
        p.f1040.line3a_qualified_dividends = 1800;
      },
      (p) => {
        p.f1040.line11_agi = Number(p.f1040.line11_agi) + 1;
      },
      (p) => {
        (p.f1099div.f1099divs as { box1b: number }[])[0].box1b += 1;
      },
      (p) => {
        (p.f1099div.f1099divs as { recipient_tin: string }[])[0].recipient_tin =
          "999887777";
      },
      (p) => {
        (p.f1099div.f1099divs as { source_document_reference: string }[])[0]
          .source_document_reference = "Altered issued copy";
      },
      (p) => {
        const copy = (p.f1099div.f1099divs as {
          qualified_dividend_filing_review: { ex_dividend_date: string };
        }[])[0];
        copy.qualified_dividend_filing_review.ex_dividend_date = "2025-02-30";
      },
      (p) => {
        const copy = (p.f1099div.f1099divs as {
          qualified_dividend_filing_review: { reviewed_on: string };
        }[])[0];
        copy.qualified_dividend_filing_review.reviewed_on = "2026-13-01";
      },
    ];
    if (id === "broker-net-gain") {
      mutations.push(
        (p) => {
          (p.f1099b.f1099bs as { recipient_ssn: string }[])[0].recipient_ssn =
            "999887777";
        },
        (p) => {
          (p.f1099b.f1099bs as { transaction_id: string }[])[1].transaction_id =
            "SYNTHETIC-LT";
        },
        (p) => {
          (p.f1099b.f1099bs as { proceeds: number }[])[0].proceeds += 1;
        },
        (p) => {
          p.schedule_d.print_line16_combined = 1801;
        },
      );
    }
    for (const mutate of mutations) {
      const altered = structuredClone(pending);
      mutate(altered);
      if (key === "form8995") {
        assertThrows(() =>
          form8995.build(altered[key], { filer: base.filer, pending: altered })
        );
        assertThrows(() => form8995Pdf.projectFields!(altered[key], altered));
      } else {
        assertThrows(() =>
          form8995a.build(altered[key] as never, {
            filer: base.filer,
            pending: altered,
          })
        );
        assertThrows(() =>
          form8995aPdf.projectFields!(altered[key] as never, altered)
        );
      }
    }
  }
});

Deno.test("qualified dividend review rejects impossible public-input calendar dates", () => {
  for (
    const [field, date] of [
      ["ex_dividend_date", "2025-02-29"],
      ["ex_dividend_date", "2025-04-31"],
      ["reviewed_on", "2026-02-29"],
      ["reviewed_on", "2026-13-01"],
    ]
  ) {
    const inputs = sourceReturn("multiple-business");
    (inputs.f1099div[0].qualified_dividend_filing_review as Record<
      string,
      unknown
    >)[field] = date;
    const result = f1040_2025.executeReturn(inputs);
    assert(
      result.diagnostics.some((entry) =>
        entry.message.includes("Expected a real calendar date")
      ),
      `${field} ${date}`,
    );
  }
});
