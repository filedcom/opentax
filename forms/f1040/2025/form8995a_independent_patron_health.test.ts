import { assert, assertEquals, assertRejects } from "@std/assert";
import { independentPatronHealthFixtures } from "./pdf/review-independent-patron-health.fixture.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { form8995aPdf } from "./pdf/forms/f8995a.ts";
import { form8995aScheduleDPdf } from "./pdf/forms/f8995a_schedule_d.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import {
  calculateIndependentPatronBusinesses,
  calculateOneBusiness8995ALines,
} from "../nodes/intermediate/forms/form8995a/index.ts";
const expected = [
  // Each owner halfSE stays10597/12717 below,13998/14400 phase,15605/14668 above.
  // Eligible12x500.04/800.04 round6000/9600; exclusions9/8months round4500/6400.
  // Health changes QBI then qualified receipts ratio/patron reduction and phase.
  [15600, 291086, 49870, 209716, 36026, 83147],
  [306686, 0, 0, 0, 0, 47121],
  [10900, 295786, 50524, 213762, 36997, 84118],
  [0, 306686, 52024, 223162, 39253, 86374],
  [15600, 446002, 70944, 343558, 68148, 126766],
  [15600, 584127, 42154, 510473, 117760, 181291],
  [6000, 300686, 51250, 217936, 37999, 85120],
];
const ownedExpected = [
  [[6000, 9600], [133403, 157683], [105318, 98552], [9479, 8870], [
    17202,
    22667,
  ]],
  [[139403, 167283], [0, 0], [0, 0], [0, 0], [0, 0]],
  [[4500, 6400], [134903, 160883], [106502, 100552], [9585, 9050], [
    17396,
    23127,
  ]],
  [[0, 0], [139403, 167283], [110055, 104552], [9905, 9410], [17976, 24047]],
  [[6000, 9600], [210002, 236000], [116668, 110625], [10500, 9956], [
    27122,
    33821,
  ]],
  [[6000, 9600], [328395, 255732], [126306, 112823], [7693, 10154], [
    12307,
    19846,
  ]],
  [[6000, 0], [133403, 167283], [105318, 104552], [9479, 9410], [17202, 24047]],
];
Deno.test("actual independent patron owner policies flow through7206, separate QBI and full return XSD/PDF", async () => {
  const archive = await Deno.makeTempDir({
    prefix: "opentax-independent-patron-health-source-",
  });
  console.log("Health source archive:", archive);
  for (const [index, fixture] of independentPatronHealthFixtures().entries()) {
    const result = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending) as any;
    const f = pending.f1040, e = expected[index];
    assertEquals([
      pending.schedule1.line17_se_health_insurance,
      f.line11_agi,
      f.line13_qbi_deduction,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
    ], e);
    const own = ownedExpected[index];
    const rows = pending.form8995a.independent_patron_sources.businesses;
    assertEquals(rows.map((r: any) => r.health_insurance_deduction), own[0]);
    const projection = form8995aPdf.projectFields!(
      pending.form8995a,
      pending,
    ) as any;
    const schedule = form8995aScheduleDPdf.projectFields!(
      pending.form8995a_schedule_d,
      pending,
    ) as any;
    for (let n = 0; n < 2; n++) {
      const suffix = n ? "_b" : "";
      assertEquals(projection["line2" + suffix], own[1][n]);
      assertEquals(schedule["line2" + suffix], own[2][n]);
      assertEquals(projection["line14" + suffix], own[3][n]);
      assertEquals(projection["line15" + suffix], own[4][n]);
      if (own[1][n] === 0) {
        assertEquals([schedule["line4" + suffix], schedule["line5" + suffix]], [
          0,
          0,
        ]);
        assert(
          calculateIndependentPatronBusinesses(pending.form8995a).rows[n].input
            .patron_filing_details!.w2_wages_allocable_to_qualified_payments >
            0,
        );
      }
    }
    const bundle = await buildMefBundle(pending, {
      filer: fixture.filer,
      attachments: [],
    });
    assertEquals(
      (bundle.xml.match(/<IRS7206 /g) ?? []).length,
      index === 6 ? 1 : 2,
    );
    const origins: any[] = [];
    const pdf = await buildPdfBytes(
      bundle.pending,
      fixture.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const xml = `${archive}/${index}.xml`;
    await Deno.writeTextFile(xml, bundle.xml);
    await Deno.writeFile(`${archive}/${index}.pdf`, pdf);
    const child = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        xml,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(child.code, 0, new TextDecoder().decode(child.stderr));
    await Deno.writeTextFile(
      `${archive}/${index}.json`,
      JSON.stringify(
        {
          inputs: fixture.inputs,
          pending,
          preparedPending: bundle.pending,
          carryforwards: result.carryforwards,
          filer: fixture.filer,
          origins,
          expected: e,
        },
        null,
        2,
      ),
    );
  }
});
Deno.test("patron owner plans reject borrowed identity, income, halfSE, payments, deductions and filed conflicts", async () => {
  const fixture = independentPatronHealthFixtures()[0];
  const result = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(result.diagnostics, []);
  const good = buildPending(result.pending) as any;
  for (
    const mutate of [
      (p: any) =>
        p.form7206.independent_schedule_c_plans.plans[1].recipient = "T",
      (p: any) =>
        p.form7206.independent_schedule_c_plans.plans[1].issued_policy_record
          .policyholder_ssn = "111223333",
      (p: any) => p.form7206.independent_plan_filing_rows[1].line7 += 1,
      (p: any) => p.form7206.independent_plan_filing_rows[1].line14 += 1,
      (p: any) =>
        p.form8995a.independent_patron_sources.businesses[1]
          .health_insurance_deduction += 1,
      (p: any) =>
        p.form8995a.independent_patron_sources.owned_health_source.plans[1]
          .premium_months[0].paid_premium += 1,
      (p: any) => p.schedule1.line17_se_health_insurance += 1,
      (p: any) => p.f1040.line10_adjustments += 1,
      (p: any) => p.f1040.line24_total_tax += 1,
      (p: any) => delete p.form7206,
      (p: any) => p.f1099patr.f1099patrs[1].box6_section199ag_deduction += 1,
    ]
  ) {
    const bad = structuredClone(good);
    mutate(bad);
    await assertRejects(() =>
      buildMefBundle(bad, { filer: fixture.filer, attachments: [] })
    );
    await assertRejects(() => buildPdfBytes(bad, fixture.filer, ".pdf-cache"));
  }
  for (
    const mutate of [
      (i: any) =>
        i.form7206.independent_schedule_c_plans.plans[1].recipient = "T",
      (i: any) =>
        i.form7206.independent_schedule_c_plans.plans[1]
          .issued_premium_records[0].payer_ssn = "111223333",
      (i: any) =>
        i.form7206.independent_schedule_c_plans.plans[1].premium_months[0]
          .payment_source_reference =
            i.form7206.independent_schedule_c_plans.plans[0].premium_months[0]
              .payment_source_reference,
    ]
  ) {
    const inputs = structuredClone(fixture.inputs);
    mutate(inputs);
    const bad = f1040_2025.executeReturn(inputs);
    assert(bad.diagnostics.some((d) => d.severity === "error"));
  }
  const retirement = structuredClone(fixture.inputs) as any;
  retirement.sep_retirement = {
    sep_retirements: [{ plan_type: "SEP", sep_contribution: 100 }],
  };
  const unsupported = f1040_2025.executeReturn(retirement);
  assert(
    unsupported.diagnostics.some((d) =>
      d.severity === "error" && /retirement/i.test(d.message)
    ),
  );
});

Deno.test("zero business Part II wages and property stay zero above the shared income threshold", () => {
  const fixture = independentPatronHealthFixtures()[1];
  const result = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending) as any;
  const rows = calculateIndependentPatronBusinesses(pending.form8995a).rows;
  for (const row of rows) {
    assert(row.input.w2_wages! > 0);
    // This printed-line control exercises the same zero business under a
    // higher return-wide taxable income; it does not alter its payroll source.
    const highIncome = {
      ...row.input,
      taxable_income: 600000,
    };
    const filed = calculateOneBusiness8995ALines(highIncome);
    assertEquals([
      filed.line2,
      filed.line4,
      filed.line7,
      filed.line10,
      filed.line15,
    ], [0, 0, 0, 0, 0]);
    assertEquals(
      row.input.business_filing_details!.business_w2_wages,
      row.input.w2_wages,
    );
  }
});
