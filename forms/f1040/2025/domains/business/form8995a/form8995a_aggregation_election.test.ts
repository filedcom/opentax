import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { ownedAggregationElectionFixture } from "../../../pdf/reviews/composed/review-8995a-aggregation-election.fixture.ts";
import { f1040_2025 } from "../../../index.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildMefBundle, buildMefXml } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { form8995aScheduleBPdf } from "../../../pdf/forms/business/f8995a_schedule_b.ts";
import { AGGREGATION_DISCLOSURE_FILE } from "../../../pdf/forms/business/f8995a_aggregation_statement.ts";

const expected = {
  3: [3214, 536786, 236786, 22500, 498536, 144035, 153358],
  4: [3750, 576250, 276250, 25000, 535500, 156972, 167698],
};
Deno.test("owned aggregation new election retains acquired businesses, complete annual disclosure and row overflow through full return", async () => {
  const archive = await Deno.makeTempDir({
    prefix: "opentax-owned-aggregation-election-source-",
  });
  console.log("Owned aggregation actual source archive:", archive);
  for (const count of [3, 4] as const) {
    const fixture = ownedAggregationElectionFixture(count);
    const result = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending) as any;
    assertEquals([
      pending.schedule1.line15_se_deduction,
      pending.f1040.line11_agi,
      pending.form8995a.qbi,
      pending.f1040.line13_qbi_deduction,
      pending.f1040.line15_taxable_income,
      pending.f1040.line16_income_tax,
      pending.f1040.line24_total_tax,
    ], expected[count]);
    const projected = form8995aScheduleBPdf.instances!(
      pending.form8995a_schedule_b,
      fixture.filer,
      pending,
    );
    assertEquals(projected.length, count === 3 ? 1 : 2);
    assertEquals(projected[0].row3_name, "East Store");
    assertEquals(projected[0].row3_qbi, 59196);
    if (count === 4) {
      assertEquals(projected[1].row1_name, "West Store");
      assertEquals(projected[1].row1_qbi, 39464);
      assertEquals(projected[1].total_qbi, undefined);
    }
    assertStringIncludes(
      projected[0].line2_part1 as string,
      "South Store acquired 2025-01-01",
    );
    const bundle = await buildMefBundle(pending, {
      filer: fixture.filer,
      attachments: [],
    });
    assertEquals(bundle.attachments.length, 1);
    assertEquals(bundle.attachments[0].fileName, AGGREGATION_DISCLOSURE_FILE);
    assertStringIncludes(bundle.xml, "<PriorYearChangeDesc>");
    assertEquals((bundle.xml.match(/<NewBusinessInCurrentYearInd>/g) ?? []).length, count - 1);
    assertStringIncludes(
      bundle.xml,
      'referenceDocumentName="BinaryAttachment"',
    );
    assertEquals(
      (bundle.xml.match(/<BusinessAggregationInfoGrp>/g) ?? []).length,
      count,
    );
    const origins: any[] = [];
    const pdf = await buildPdfBytes(
      bundle.pending,
      fixture.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    await Deno.writeTextFile(`${archive}/${count}.xml`, bundle.xml);
    await Deno.writeFile(`${archive}/${count}.pdf`, pdf);
    await Deno.writeFile(
      `${archive}/${count}-annual.pdf`,
      bundle.attachments[0].bytes,
    );
    const xsd = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${archive}/${count}.xml`,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
    await Deno.writeTextFile(
      `${archive}/${count}.json`,
      JSON.stringify(
        {
          inputs: fixture.inputs,
          pending,
          preparedPending: bundle.pending,
          carryforwards: result.carryforwards,
          filer: fixture.filer,
          origins,
          expected: expected[count],
        },
        null,
        2,
      ),
    );
  }
});

const mutations = [
  (s: any) => s.members[2].source_schedule_c.line_h_new_business = false,
  (s: any) => delete s.annual_disclosure,
  (s: any) => s.annual_disclosure.businesses.pop(),
  (s: any) => s.annual_disclosure.businesses[2].entity_ein = "999999999",
  (s: any) =>
    s.annual_disclosure.businesses[2].business_description = "Unrelated trade",
  (s: any) => s.annual_disclosure.businesses[2].events = [],
  (s: any) => s.annual_disclosure.businesses[2].events[0].date = "2025-02-30",
  (s: any) => s.annual_disclosure.businesses[2].events[0].event = "disposed",
  (s: any) => s.members[2].ownership_start_date = "2025-07-03",
  (s: any) => s.members[2].business_reference = s.members[0].business_reference,
  (s: any) => s.members[2].owner_share_pct = 49,
  (s: any) => s.members[2].source_schedule_c.proprietor_recipient = "S",
  (s: any) =>
    s.election_history = {
      status: "continued_unchanged",
      filed_2024_schedule_b_reference: "prior-ref",
      no_material_change_confirmed: true,
    },
  (s: any) =>
    s.annual_disclosure.timely_original_return_election_confirmed = false,
  (s: any) =>
    s.annual_disclosure.no_commissioner_disaggregation_confirmed = false,
  (s: any) => s.rpe_aggregation_present = true,
];
Deno.test("owned aggregation public input rejects missing annual events, conflicting source identities and unsupported RPE elections", () => {
  for (const mutate of mutations) {
    const fixture = ownedAggregationElectionFixture(3);
    mutate((fixture.inputs.qbi_aggregation as any).aggregation_filing_details);
    const bad = f1040_2025.executeReturn(fixture.inputs);
    assert(
      bad.diagnostics.some((d) => d.severity === "error"),
      JSON.stringify(bad.diagnostics),
    );
  }
});
Deno.test("owned aggregation native and directPDF reject conflicting annual source and missing required native statement", async () => {
  const fixture = ownedAggregationElectionFixture(3);
  const good = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(good.diagnostics, []);
  const base = buildPending(good.pending) as any;
  for (const mutate of mutations) {
    const pending = structuredClone(base);
    mutate(pending.form8995a.aggregation_filing_details);
    pending.form8995a_schedule_b = structuredClone(pending.form8995a);
    await assertRejects(() =>
      buildMefBundle(pending, { filer: fixture.filer, attachments: [] })
    );
    await assertRejects(() =>
      buildPdfBytes(pending, fixture.filer, ".pdf-cache")
    );
  }
  await assertRejects(async () => {
    buildMefXml(base, fixture.filer);
  });
  const wrongOwner = { ...fixture.filer, primarySSN: "999887777" };
  await assertRejects(() =>
    buildMefBundle(base, { filer: wrongOwner, attachments: [] })
  );
  await assertRejects(() => buildPdfBytes(base, wrongOwner, ".pdf-cache"));
});
