import { assert, assertEquals, assertRejects } from "@std/assert";
import { independentPatronSepFixtures } from "./pdf/review-independent-patron-sep.fixture.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
const expected = [
  [61337, 15600, 229749, 41464, 156785, 24321, 71442],
  [56690, 15600, 211162, 38904, 140758, 20795, 64175],
  [27881, 15600, 263205, 45863, 185842, 30713, 77834],
  [55761, 0, 250925, 44421, 175004, 28329, 75450],
  [61337, 245348, 1, 0, 0, 0, 47121],
  [140000, 15600, 710511, 45520, 633491, 160816, 233822],
  [119945, 15600, 464182, 70784, 361898, 72550, 136081],
];
Deno.test("owned SEP actual census/contributions join ownerSE, health/QBI, Schedule1/1040 and native fullXSD/PDF", async () => {
  const archive = await Deno.makeTempDir({
    prefix: "opentax-independent-patron-sep-source-",
  });
  console.log("Owned SEP actual source archive:", archive);
  for (const [index, fixture] of independentPatronSepFixtures().entries()) {
    const result = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending) as any, f = pending.f1040;
    assertEquals([
      pending.schedule1.line16_sep_simple,
      pending.schedule1.line17_se_health_insurance ?? 0,
      f.line11_agi,
      f.line13_qbi_deduction,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
    ], expected[index]);
    const retirement = pending.form7206.owned_sep_filing_rows;
    for (const row of retirement) {
      const business = pending.form8995a.independent_patron_sources.businesses
        .find((b: any) => b.business_source.farm_id === row.business_reference);
      assertEquals(business.retirement_plan_deduction, row.raw_deduction);
      const health = pending.form7206.independent_plan_filing_rows?.find((
        h: any,
      ) => h.business_reference === row.business_reference);
      if (health) assertEquals(health.line9, row.deduction);
    }
    if (index === 2 || index === 3) {
      const spouse = retirement.find((r: any) => r.recipient === "S");
      assertEquals([spouse.raw_deduction, spouse.deduction], [27880.5, 27881]);
      const source = pending.form8995a.independent_patron_sources.businesses
        .find((b: any) => b.business_source.proprietor_recipient === "S");
      assertEquals(source.retirement_plan_deduction, 27880.5);
      assertEquals(pending.form8995a.qbi, index === 2 ? 263206 : 250925);
    }
    if (index === 5) {
      assertEquals(retirement.map((r: any) => r.deduction), [70000, 70000]);
    }
    if (index === 1) {
      assertEquals(retirement.map((r: any) => r.employee_contribution), [
        10000,
        15000,
      ]);
    }
    const bundle = await buildMefBundle(pending, {
      filer: fixture.filer,
      attachments: [],
    });
    assertEquals(
      (bundle.xml.match(/<IRS7206 /g) ?? []).length,
      index === 3 ? 0 : 2,
    );
    const origins: any[] = [];
    const pdf = await buildPdfBytes(
      bundle.pending,
      fixture.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    await Deno.writeTextFile(`${archive}/${index}.xml`, bundle.xml);
    await Deno.writeFile(`${archive}/${index}.pdf`, pdf);
    const xsd = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${archive}/${index}.xml`,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
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
          expected: expected[index],
        },
        null,
        2,
      ),
    );
  }
});
Deno.test("owned SEP public source rejects wrong owner, census, uniform contribution, timing and copied payments", () => {
  const fixture = independentPatronSepFixtures()[1];
  for (
    const mutate of [
      (s: any) => s.plans[1].recipient = "T",
      (s: any) => s.plans[1].employer_ein = "999999999",
      (s: any) => s.plans[1].owner_contribution.participant_ssn = "111223333",
      (s: any) => s.plans[1].owner_contribution.amount += 1,
      (s: any) => s.plans[1].owner_contribution.received_on = "2026-04-16",
      (s: any) => s.plans[1].adopted_on = "2026-04-16",
      (s: any) => s.plans[1].contribution_deadline = "2026-10-15",
      (s: any) => s.plans[1].employee_census = [],
      (s: any) => delete s.plans[1].employee_census[0].contribution,
      (s: any) => s.plans[1].employee_census[0].compensation += 1,
      (s: any) =>
        s.plans[1].owner_contribution.payment_reference =
          s.plans[0].owner_contribution.payment_reference,
      (s: any) => s.business_plan_reviews[1].plan_identifiers = [],
      (s: any) => s.plans[1].owner_date_of_birth = "2008-01-01",
      (s: any) =>
        s.employer_relationship_review.spousal_attribution_exception_reviews[1]
          .no_employee_director_fiduciary_or_management_role_at_any_time_confirmed =
            false,
      (s: any) =>
        s.employer_relationship_review.spousal_attribution_exception_reviews[1]
          .royalties_rents_dividends_interest_annuities_income = 999999,
      (s: any) =>
        s.employer_relationship_review.spousal_attribution_exception_reviews[1]
          .section61_gross_income += 1,
      (s: any) => {
        s.plans[1].employee_census[0].employee_ssn = "999887777";
        s.plans[1].employee_census[0].contribution.participant_ssn =
          "999887777";
      },
    ]
  ) {
    const inputs = structuredClone(fixture.inputs) as any;
    mutate(inputs.owned_sep_retirement.owned_sep_plans);
    const result = f1040_2025.executeReturn(inputs);
    assert(
      result.diagnostics.some((d) =>
        d.severity === "error" &&
        /SEP|sep|retirement|proprietor/i.test(d.message)
      ),
      JSON.stringify(result.diagnostics),
    );
  }
  const inputs = structuredClone(fixture.inputs) as any;
  inputs.schedule_f.schedule_fs[1].line23_pension_plans +=
    inputs.owned_sep_retirement.owned_sep_plans.plans[1].owner_contribution
      .amount;
  assert(
    f1040_2025.executeReturn(inputs).diagnostics.some((d) =>
      d.severity === "error" && /SEP|sep|retirement/i.test(d.message)
    ),
  );
});
Deno.test("owned SEP filed conflicts reject native and direct PDF, including source-only context", async () => {
  for (const index of [0, 3]) {
    const fixture = independentPatronSepFixtures()[index],
      result = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(result.diagnostics, []);
    const good = buildPending(result.pending) as any;
    for (
      const mutate of [
        (p: any) =>
          p.sep_retirement.owned_sep_plans.plans[1].owner_contribution.amount +=
            1,
        (p: any) => p.form7206.owned_sep_filing_rows[1].deduction += 1,
        (p: any) =>
          p.form7206.owned_sep_plans.plans[1].owner_date_of_birth =
            "1981-01-01",
        (p: any) => p.form8995.owned_sep_plans.plans[1].recipient = "T",
        (p: any) => p.form8995.retirement_plan_deduction += 1,
        (p: any) =>
          p.form8995a.independent_patron_sources.businesses[1]
            .retirement_plan_deduction += 1,
        (p: any) => p.schedule1.line16_sep_simple += 1,
        (p: any) => p.f1040.line10_adjustments += 1,
        (p: any) => p.f1040.line24_total_tax += 1,
        (p: any) => delete p.sep_retirement,
        (p: any) => p.general.spouse_dob = "1981-03-04",
        (p: any) => {
          if (p.form7206.independent_plan_filing_rows) {
            p.form7206.independent_plan_filing_rows[1].line9 += 1;
          } else p.form7206.line9 = 1;
        },
        (p: any) =>
          p.form7206.owned_sep_plans.employer_relationship_review
            .spousal_attribution_exception_reviews[1]
            .royalties_rents_dividends_interest_annuities_income = 999999,
      ]
    ) {
      const bad = structuredClone(good);
      mutate(bad);
      await assertRejects(() =>
        buildMefBundle(bad, { filer: fixture.filer, attachments: [] })
      );
      await assertRejects(() =>
        buildPdfBytes(bad, fixture.filer, ".pdf-cache")
      );
    }
  }
});
