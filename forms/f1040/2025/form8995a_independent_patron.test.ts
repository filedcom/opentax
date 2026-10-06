import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { independentPatronFixture } from "./pdf/review-8995a-independent-patron.fixture.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { form8995aPdf } from "./pdf/forms/f8995a.ts";
import { form8995aScheduleDPdf } from "./pdf/forms/f8995a_schedule_d.ts";
const expected = {
  below: {
    profit: [150000, 180000],
    half: [10597, 12717],
    tax: [21194, 25434],
    taxable: 275186,
    qbi: [139403, 167283],
    qualified: [110055, 104552],
    wages: [31579, 37500],
    reduction: [9905, 9410],
    component: [17976, 24047],
    ordinary: 42023,
    passed: 10001,
    deduction: 52024,
  },
  phase: {
    profit: [230000, 260000],
    half: [13998, 14400],
    tax: [27996, 28799],
    taxable: 430102,
    qbi: [216002, 245600],
    qualified: [120001, 115125],
    wages: [22222, 28125],
    reduction: [10800, 10361],
    component: [24164, 31971],
    ordinary: 56135,
    passed: 10001,
    deduction: 66136,
  },
  "phase-unbound": {
    profit: [230000, 260000],
    half: [13998, 14400],
    tax: [27996, 28799],
    taxable: 430102,
    qbi: [216002, 245600],
    qualified: [98183, 115125],
    wages: [45455, 28125],
    reduction: [8836, 10361],
    component: [34364, 31971],
    ordinary: 66335,
    passed: 10001,
    deduction: 76336,
  },
  above: {
    profit: [350000, 280000],
    half: [15605, 14668],
    tax: [31210, 29335],
    taxable: 568227,
    qbi: [334395, 265332],
    qualified: [128613, 117058],
    wages: [15385, 26471],
    reduction: [7693, 10535],
    component: [12307, 19465],
    ordinary: 31772,
    passed: 10001,
    deduction: 41773,
  },
  cap: {
    profit: [180000, 200000],
    half: [12717, 13596],
    tax: [25434, 27192],
    taxable: 322187,
    qbi: [167283, 186404],
    qualified: [167283, 186404],
    wages: [40000, 60000],
    reduction: [15055, 16776],
    component: [18402, 20505],
    ordinary: 38907,
    passed: 283280,
    deduction: 322187,
  },
};
// The tables are independently calculated from printed2025 instructions:
// separate owner net*92.35%, line10 min(net,176100)*12.4% + line11 net*2.9%,
// half each filed SE tax; per-farm receipts ratios, rounded9%/50% lesser,
// per-business wage phase-in, then shared line37 and summed box6 line38 cap.
Deno.test("independent T/S patron farms retain owner costs, separate reductions and shared DPAD income cap", async () => {
  const archive = await Deno.makeTempDir({
    prefix: "opentax-independent-patron-source-",
  });
  console.info(`Independent patron source archive: ${archive}`);
  for (
    const kind of ["below", "phase", "phase-unbound", "above", "cap"] as const
  ) {
    const fixture = independentPatronFixture(kind), e = expected[kind];
    const result = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending) as any;
    assertEquals(
      pending.schedule_se.owner_instances.map((s: any) =>
        s.net_profit_schedule_f
      ),
      e.profit,
    );
    assertEquals(
      pending.schedule_se.owner_instances.map((s: any) => s.line13),
      e.half,
    );
    assertEquals(
      pending.schedule_se.owner_instances.map((s: any) => s.line12),
      e.tax,
    );
    assertEquals(
      pending.schedule_se.owner_instances.map((s: any) => s.owner_ssn),
      ["111223333", "444556666"],
    );
    assertEquals(pending.form8995a.taxable_income, e.taxable);
    assertEquals(pending.f1040.line13_qbi_deduction, e.deduction);
    const print = form8995aPdf.projectFields!(
      pending.form8995a,
      pending,
    ) as any;
    const d = form8995aScheduleDPdf.projectFields!(
      pending.form8995a_schedule_d,
      pending,
    ) as any;
    for (let i = 0; i < 2; i++) {
      const suffix = i === 0 ? "" : "_b";
      assertEquals(print[`patron${suffix}`], true);
      if (kind === "below" || kind === "cap") {
        assertEquals(print[`line4${suffix}`], undefined);
      }
      assertEquals(print[`line2${suffix}`], e.qbi[i]);
      assertEquals(print[`line14${suffix}`], e.reduction[i]);
      assertEquals(print[`line15${suffix}`], e.component[i]);
      assertEquals(d[`line2${suffix}`], e.qualified[i]);
      assertEquals(d[`line4${suffix}`], e.wages[i]);
      assertEquals(d[`line6${suffix}`], e.reduction[i]);
    }
    if (kind === "phase-unbound") {
      assertEquals(print.line17, undefined);
      assertEquals(print.line17_b, 49120);
      assertEquals(print.line24, "35.502");
    }
    assertEquals(print.line37, e.ordinary);
    assertEquals(print.line38, e.passed);
    assertEquals(print.line39, e.deduction);
    const bundle = await buildMefBundle(pending, {
      filer: fixture.filer,
      year: 2025,
      returnType: "1040",
      schemaVersion: "2025v5.4",
      attachments: [],
    });
    assertEquals(
      (bundle.xml.match(/<PatronAgricHortCoopGrp>/g) ?? []).length,
      2,
    );
    assertStringIncludes(
      bundle.xml,
      `<DPADSect199AgAllocAgricHortAmt>${e.passed}</DPADSect199AgAllocAgricHortAmt>`,
    );
    const origins: any[] = [];
    const pdf = await buildPdfBytes(
      bundle.pending,
      fixture.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
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
    await writer.write(new TextEncoder().encode(bundle.xml));
    await writer.close();
    const validation = await child.output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
    await Deno.writeTextFile(
      `${archive}/${kind}.json`,
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
    await Deno.writeTextFile(`${archive}/${kind}.xml`, bundle.xml);
    await Deno.writeFile(`${archive}/${kind}.pdf`, pdf);
  }
});
Deno.test("independent patron rejects owner, allocation, payroll, duplicate source and final filed conflicts", async () => {
  const fixture = independentPatronFixture("phase"),
    result = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(result.diagnostics, []);
  const good = buildPending(result.pending) as any;
  const mutations: Array<(p: any) => void> = [
    (p) => p.schedule_f.schedule_fs[1].proprietor_recipient = "T",
    (p) =>
      p.qbi_patron.independent_farm_reviews[1].source_1099patr.recipient_tin =
        "111223333",
    (p) => p.f1099patr.f1099patrs[1].box6_section199ag_deduction += 1,
    (p) =>
      p.qbi_patron.independent_farm_reviews[1].employee_w2_records[0]
        .eligible_199a_wages += 1,
    (p) =>
      p.form8995a.independent_patron_sources.businesses[1].se_tax_deduction +=
        1,
    (p) => p.schedule_se.owner_instances[1].line13 += 1,
    (p) => p.form8995a_schedule_d.taxable_income += 1,
    (p) => p.f1040.line24_total_tax += 1,
    (p) => p.f1040.line13_qbi_deduction += 1,
    (p) =>
      p.qbi_patron.independent_farm_reviews[1].allocation_worksheet_reference =
        "Changed allocation",
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(good);
    mutate(bad);
    await assertRejects(() =>
      buildMefBundle(bad, { filer: fixture.filer, attachments: [] })
    );
    await assertRejects(() => buildPdfBytes(bad, fixture.filer, ".pdf-cache"));
  }
  for (
    const mutate of [
      (i: any) => i.schedule_f.schedule_fs[1].proprietor_recipient = "T",
      (i: any) =>
        i.qbi_patron.independent_farm_reviews[1].source_1099patr.recipient_tin =
          "111223333",
      (i: any) =>
        i.qbi_patron.independent_farm_reviews[1].payroll_source_reference =
          i.qbi_patron.independent_farm_reviews[0].payroll_source_reference,
      (i: any) =>
        i.qbi_patron.independent_farm_reviews[1].employee_w2_records[0]
          .eligible_199a_wages += 1,
      (i: any) =>
        i.qbi_patron.independent_farm_reviews[1].no_aggregation_confirmed =
          false,
    ]
  ) {
    const inputs = structuredClone(fixture.inputs);
    mutate(inputs);
    const bad = f1040_2025.executeReturn(inputs);
    assert(
      bad.diagnostics.some((d) => d.severity === "error"),
      JSON.stringify(bad.diagnostics),
    );
  }
  const wrong = {
    ...fixture.filer,
    spouse: { ...fixture.filer.spouse!, ssn: "555667777" },
  };
  await assertRejects(() =>
    buildMefBundle(good, { filer: wrong, attachments: [] })
  );
  await assertRejects(() => buildPdfBytes(good, wrong, ".pdf-cache"));
});
