import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { form8995 } from "./mef/forms/f8995.ts";
import { scheduleCPdf } from "./pdf/forms/schedule_c.ts";
import { form8995Pdf } from "./pdf/forms/f8995.ts";
import { allocateSharedSeDeduction } from "../nodes/inputs/schedule_c/qbi-multiple.ts";
import { scheduleSELines } from "../nodes/intermediate/forms/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../nodes/config/index.ts";
import { PDFDocument } from "pdf-lib";
import { appendQbiBusinessContinuation } from "./pdf/forms/f8995_continuation.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-schedule-c"
)!;
const wageBase = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;
function inputFor(profits: number[], withWages = false) {
  const original = (base.inputs.schedule_c as Record<string, unknown>[])[0];
  const wage = {
    ...(wageBase.inputs.w2 as Record<string, unknown>[])[0],
    employee_ssn: "111-22-3333",
    box1_wages: 50_000,
    box3_ss_wages: 50_000,
    box5_medicare_wages: 50_000,
  };
  const deduction = scheduleSELines({
    net_profit_schedule_c: profits.reduce((sum, value) => sum + value, 0),
    w2_ss_wages: withWages ? 50_000 : 0,
  }, CONFIG_BY_YEAR[2025].ssWageBase)?.line13 ?? 0;
  const allocations = allocateSharedSeDeduction(profits, deduction);
  return {
    ...base.inputs,
    general: {
      ...(base.inputs.general as Record<string, unknown>),
      ...(profits.reduce((sum, value) => sum + value, 0) < 0
        ? {
          form461_scope_review: {
            only_schedule_c_and_f_business_items: true,
            other_part_i_lines_zero: true,
            part_ii_adjustments_zero: true,
            post_at_risk_and_passive_limits_confirmed: true,
            line2_schedule_c_amount: profits.reduce(
              (sum, value) => sum + value,
              0,
            ),
            line6_schedule_f_amount: 0,
            source_document_refs: [
              "Synthetic combined loss and Form 461 scope review",
            ],
          },
        }
        : {}),
    },
    ...(withWages ? { w2: [wage] } : {}),
    schedule_c: profits.map((profit, index) => ({
      ...original,
      business_reference: `SYNTHETIC-BUSINESS-${index}`,
      line_c_business_name: `Example Business ${index + 1}`,
      ...(index === 1
        ? { line_d_ein: undefined }
        : { line_d_ein: String(123456789 + index) }),
      line_1_gross_receipts: Math.max(0, profit),
      line_18_office_expense: Math.max(0, -profit),
      ...(profit < 0 ? { line_32_at_risk: "a" } : {}),
      qbi_specified_service: index === 1,
      qbi_se_tax_allocation_review: {
        deduction_amount: allocations[index],
        allocation_method: "positive_profit_proportion_with_cent_residual",
        reasonable_for_business_facts_confirmed: true,
        consistently_applied_and_books_agree_confirmed: true,
        all_businesses_included_confirmed: true,
        no_aggregation_confirmed: true,
        workpaper_reference: "Synthetic shared SE allocation workpaper",
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2026-03-01",
      },
    })),
  };
}
async function validate(xml: string) {
  const schema = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
Deno.test("multiple Schedule C full returns file shared SE allocation, signed loss rows, cents and overflow", async () => {
  for (
    const scenario of [
      {
        id: "profitable-cents",
        profits: [60_000.49, 40_000.49],
        wages: false,
        expectedLine2: 92_936,
        expectedSe: 7_065,
      },
      {
        id: "mixed-loss",
        profits: [80_000.50, 20_000.49, -15_000.49],
        wages: true,
        expectedLine2: 78_996,
        expectedSe: 6_005,
      },
      {
        id: "overflow",
        profits: [20_000, 18_000, 16_000, 14_000, 12_000, -4_000],
        wages: false,
        expectedLine2: 70_631,
        expectedSe: 5_369,
      },
      {
        id: "net-loss",
        profits: [10_000.49, -20_000.50],
        wages: true,
        expectedLine2: -10_001,
        expectedSe: 0,
      },
    ]
  ) {
    const result = f1040_2025.executeReturn(
      inputFor(scenario.profits, scenario.wages),
    );
    assertEquals(result.diagnostics, [], scenario.id);
    const pending = normalizeAllPending(result.pending);
    const claim = pending.form8995;
    assertEquals(
      pending.schedule1.line3_schedule_c,
      scenario.profits.reduce((sum, value) => sum + value, 0),
    );
    assertEquals(
      pending.schedule1.line15_se_deduction ?? 0,
      scenario.expectedSe,
    );
    assertEquals(claim.line2, scenario.expectedLine2, scenario.id);
    assertEquals(claim.line16, Math.max(0, -scenario.expectedLine2));
    const rows = claim.multi_business_filing_rows as Record<string, unknown>[];
    assertEquals(rows.length, scenario.profits.length);
    assertEquals(
      rows.reduce((sum, row) => sum + (row.se_tax_deduction as number), 0),
      scenario.expectedSe,
    );
    assertEquals(rows[1].tin, { kind: "ssn", value: "111223333" });
    const projected = form8995Pdf.projectFields!(claim, pending);
    assertEquals(projected.line15, pending.f1040.line13_qbi_deduction ?? 0);
    assertEquals(
      (projected.pdf_overflow_businesses as unknown[]).length,
      Math.max(0, scenario.profits.length - 5),
    );
    if (scenario.id === "profitable-cents") {
      assertEquals(rows[0].se_tax_deduction, 4238.99);
      assertEquals(rows[1].se_tax_deduction, 2826.01);
      assertEquals(rows[0].raw_qbi, 55_761.5);
      assertEquals(rows[1].raw_qbi, 37_174.479999999996);
      assertEquals(claim.line15, 15_437);
    }
    const native = form8995.build(claim, { filer: base.filer, pending });
    assertEquals(
      (native.match(/<QualifiedBusinessIncomeDedGrp>/g) ?? []).length,
      scenario.profits.length,
    );
    const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
    assertStringIncludes(prepared.bundle.xml, "<IRS8995 documentId=");
    if (scenario.id === "net-loss") {
      assertEquals(pending.schedule1.line3_schedule_c, -10_000.01);
      assertEquals(pending.f1040.line8_additional_income, -10_000.01);
      assertEquals(pending.f1040.line11_agi, 39_999.99);
      assertEquals(rows.map((row) => row.qbi), [10_000, -20_001]);
      const cPdf = scheduleCPdf.projectFields!(pending.schedule_c, pending);
      assertEquals(
        (cPdf.schedule_c_instances as Record<string, unknown>[])[1].line31,
        -20_001,
      );
      for (
        const expected of [
          "<BusinessIncomeLossAmt>-10000</BusinessIncomeLossAmt>",
          "<AdjustedGrossIncomeAmt>40000</AdjustedGrossIncomeAmt>",
          "<TaxableIncomeAmt>24250</TaxableIncomeAmt>",
          "<TotQlfyBusLossCarryforwardAmt>10001</TotQlfyBusLossCarryforwardAmt>",
          "<NetProfitOrLossAmt>-20001</NetProfitOrLossAmt>",
        ]
      ) assertStringIncludes(prepared.bundle.xml, expected);
    }
    await validate(prepared.bundle.xml);
    const pdf = await prepared.renderPdf();
    assert(pdf.length > 0);
    if (Deno.args.includes("--write-review-artifacts")) {
      const directory = new URL(
        `../../../.state/research/ty2025-filled-pdf-review/2026-10-06-form8995-multiple/${scenario.id}/`,
        import.meta.url,
      ).pathname;
      await Deno.mkdir(directory, { recursive: true });
      await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
      await Deno.writeTextFile(`${directory}return.xml`, prepared.bundle.xml);
    }
  }
});
Deno.test("multiple Schedule C exporter rejects source, shared SE, allocation, row and settled return tampering", () => {
  const result = f1040_2025.executeReturn(
    inputFor([80_000.50, 20_000.49, -15_000.49], true),
  );
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const alter = (mutate: (copy: typeof pending) => void) => {
    const copy = structuredClone(pending);
    mutate(copy);
    return copy;
  };
  const changes = [
    alter((p) => {
      (p.schedule_c.schedule_cs as Record<string, unknown>[])[0]
        .line_1_gross_receipts = 80_001;
    }),
    alter((p) => {
      p.schedule_c.schedule_cs = (p.schedule_c.schedule_cs as unknown[]).slice(
        0,
        2,
      );
    }),
    alter((p) => {
      (p.schedule_c.schedule_cs as Record<string, unknown>[])[1]
        .business_reference = "SYNTHETIC-BUSINESS-0";
    }),
    alter((p) => {
      const item = (p.schedule_c.schedule_cs as Record<string, unknown>[])[0];
      delete item.qbi_se_tax_allocation_review;
    }),
    alter((p) => {
      const item = (p.schedule_c.schedule_cs as Record<string, unknown>[])[0];
      (item.qbi_se_tax_allocation_review as Record<string, unknown>)
        .deduction_amount = 0;
    }),
    alter((p) => {
      p.schedule_se.net_profit_schedule_c = 100_000.99;
    }),
    alter((p) => {
      p.schedule_se.w2_ss_wages = 0;
    }),
    alter((p) => {
      p.schedule1.line15_se_deduction = 5_999;
    }),
    alter((p) => {
      p.schedule1.line3_schedule_c = 85_001;
    }),
    alter((p) => {
      const source = p.form7206.schedule_c_source as Record<string, unknown>;
      (source.businesses as Record<string, unknown>[])[0].line31_net_profit =
        80_001;
    }),
    alter((p) => {
      (p.form7206.schedule_se_source as Record<string, unknown>)
        .line13_deduction = 0;
    }),
    alter((p) => {
      p.f1040.line11_agi = 80_000;
    }),
    alter((p) => {
      p.f1040.line13_qbi_deduction = 1;
    }),
    alter((p) => {
      p.f1040.line15_taxable_income = 1;
    }),
    alter((p) => {
      p.form8995.line2 = 100_000;
    }),
    alter((p) => {
      const rows = p.form8995.multi_business_filing_rows as Record<
        string,
        unknown
      >[];
      rows[2].qbi = 0;
    }),
    alter((p) => {
      const rows = p.form8995.multi_business_filing_rows as Record<
        string,
        unknown
      >[];
      rows[1].tin = { kind: "ein", value: "987654321" };
    }),
  ];
  for (const changed of changes) {
    assertThrows(() =>
      form8995.build(changed.form8995, { filer: base.filer, pending: changed })
    );
    assertThrows(() => form8995Pdf.projectFields!(changed.form8995, changed));
  }
});
Deno.test("Form 8995 business continuation paginates every additional row", async () => {
  const document = await PDFDocument.create();
  const rows = Array.from(
    { length: 41 },
    (_, index) => ({
      businessName: `Business ${index}`,
      tin: { kind: "ein", value: "123456789" },
      qbi: index % 2 === 0 ? index : -index,
    }),
  );
  await appendQbiBusinessContinuation(document, rows, base.filer);
  assertEquals(document.getPageCount(), 3);
});

Deno.test("multiple Schedule C uses combined SE tax after the wage base and retains entered row rounding", async () => {
  const result = f1040_2025.executeReturn(inputFor([90_000, 60_000], true));
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.schedule1.line15_se_deduction, 9_827);
  assertEquals(pending.schedule2.line4_se_tax, 19_653);
  const rows = pending.form8995.multi_business_filing_rows as Record<
    string,
    unknown
  >[];
  assertEquals(rows.map((row) => row.se_tax_deduction), [5_896.2, 3_930.8]);
  assertEquals(rows.map((row) => row.qbi), [84_104, 56_069]);
  assertEquals(pending.form8995.line2, 140_173);
  assertEquals(pending.form8995.line15, 28_035);
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  await validate(prepared.bundle.xml);
  assertEquals(
    form8995Pdf.projectFields!(pending.form8995, pending).line2,
    140_173,
  );
});
