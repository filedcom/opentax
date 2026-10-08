import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { assertScheduleJSourceReturn } from "../../../taxes/income-averaging/schedule-j/schedule_j_source_return.ts";
import { form8814CapitalScheduleJInputs } from "./form8814_capital_schedulej.fixture.ts";

const cases = [
  {
    id: "child-direct-line7a",
    withSale: false,
    withParentDistribution: false,
    line7a: 426,
    scheduleD: 0,
    taxable: 311854,
    scheduleJTax: 68947,
    line16: 71850,
    line24: 142202,
    amtRegular: 72589,
    capital: 426,
  },
  {
    id: "child-schedule-d-sale",
    withSale: true,
    withParentDistribution: false,
    line7a: 0,
    scheduleD: 1426,
    taxable: 312854,
    scheduleJTax: 69097,
    line16: 72000,
    line24: 142390,
    amtRegular: 72739,
    capital: 1426,
  },
  {
    id: "parent-child-schedule-d-sale",
    withSale: true,
    withParentDistribution: true,
    line7a: 0,
    scheduleD: 2626,
    taxable: 314054,
    scheduleJTax: 69277,
    line16: 72180,
    line24: 142615.6,
    amtRegular: 72919,
    capital: 2626,
  },
] as const;

for (const expected of cases) {
  Deno.test(`reviewed Form 8814 child capital source joins ${expected.id} to Schedule J, QBI, Form 6251 and full return`, async () => {
    const input = form8814CapitalScheduleJInputs(
      expected.withSale,
      expected.withParentDistribution,
    );
    const actual = f1040_2025.executeReturn(input);
    assertEquals(actual.diagnostics, []);
    const p: any = normalizeAllPending(actual.pending);
    const child = p.form8814.items[0];
    assertEquals(child.line4, 4700);
    assertEquals(child.line6, 2000);
    assertEquals(child.line9, 787);
    assertEquals(child.line10, 426);
    assertEquals(child.line12, 787);
    assertEquals(child.line15, 135);
    assertEquals(p.f1040.line7a_cap_gain_distrib ?? 0, expected.line7a);
    assertEquals(p.f1040.line7_capital_gain ?? 0, expected.scheduleD);
    assertEquals(p.f1040.line15_taxable_income, expected.taxable);
    assertEquals(p.schedule_j.line23, expected.scheduleJTax);
    assertEquals(p.schedule_j.line23 + 2768 + 135, expected.line16);
    assertEquals(p.f1040.line16_income_tax, expected.line16);
    assertEquals(p.f1040.line24_total_tax, expected.line24);
    assertEquals(p.form6251.regular_tax, expected.amtRegular);
    assertEquals(p.form6251.net_capital_gain, expected.capital);
    assertEquals(p.form6251.line11_amt, 53392);
    assertEquals(p.form8995a.net_capital_gain, 30787 + expected.capital);
    assertEquals(
      p.form8995a.qbi_capital_sources,
      [
        { source: "f1099div.qualified_dividends", amount: 30000 },
        { source: "form8814.qualified_dividends", amount: 787 },
        { source: "schedule_d.net_capital_gain", amount: expected.capital },
      ],
    );
    assertScheduleJSourceReturn(actual.pending);
    const noJ: any = structuredClone(input);
    delete noJ.schedule_j;
    const noElection = f1040_2025.executeReturn(noJ);
    assertEquals(noElection.diagnostics, []);
    const noJFields: any = normalizeAllPending(noElection.pending);
    assertEquals(noJFields.f1040.line16_income_tax - 2768, expected.amtRegular);
    const filer = extractFilerIdentity(p.f1040)!;
    const prepared = await f1040_2025.prepareReturn!(actual.pending, filer);
    assertEquals((prepared.bundle.xml.match(/<IRS8814\b/g) ?? []).length, 1);
    assertEquals((prepared.bundle.xml.match(/<IRS4972\b/g) ?? []).length, 2);
    assertEquals((prepared.bundle.xml.match(/<IRS6251\b/g) ?? []).length, 1);
    assertEquals(
      prepared.bundle.xml.includes(
        `<TotalTaxAmt>${Math.round(expected.line24)}</TotalTaxAmt>`,
      ),
      true,
    );
    if (expected.withParentDistribution) {
      assertEquals(
        prepared.bundle.xml.includes(
          "<IndivNetInvstIncomeTaxAmt>1490</IndivNetInvstIncomeTaxAmt>",
        ),
        true,
      );
      assertEquals(p.form8960.line17_niit, 1489.6);
    }
    assertEquals(
      (prepared.bundle.xml.match(/<IRS1040ScheduleD\b/g) ?? []).length,
      expected.withSale ? 1 : 0,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const root = Deno.args[0] ??
      ".state/research/form8814-capital-schedulej-source";
    const dir = `${root}/${expected.id}`;
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/source.json`,
      JSON.stringify(input, null, 2),
    );
    await Deno.writeTextFile(`${dir}/pending.json`, JSON.stringify(p, null, 2));
    await Deno.writeTextFile(
      `${dir}/carry.json`,
      JSON.stringify(actual.carryforwards, null, 2),
    );
    await Deno.writeTextFile(
      `${dir}/origins.json`,
      JSON.stringify(origins, null, 2),
    );
    await Deno.writeTextFile(`${dir}/return.xml`, prepared.bundle.xml);
    await Deno.writeFile(`${dir}/return.pdf`, pdf);
    const checked = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${dir}/return.xml`,
      ],
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    console.log(expected.id, origins.length, "pages");

    const wrongChildSource: any = structuredClone(p);
    wrongChildSource.form8814.items[0].item.source_review
      .capital_gain_distribution_review.box2a++;
    await assertRejects(() =>
      f1040_2025.prepareReturn!(wrongChildSource, filer)
    );
    await assertRejects(() =>
      buildPdfBytes(wrongChildSource, filer, ".pdf-cache")
    );
    const specialGain: any = structuredClone(p);
    specialGain.form8814.items[0].item.source_review
      .capital_gain_distribution_review.box2b = 1;
    await assertRejects(() => f1040_2025.prepareReturn!(specialGain, filer));
    await assertRejects(() => buildPdfBytes(specialGain, filer, ".pdf-cache"));
    const missingChildDistributionReview: any = structuredClone(p);
    delete missingChildDistributionReview.form8814.items[0].item.source_review
      .capital_gain_distribution_review;
    await assertRejects(() =>
      f1040_2025.prepareReturn!(missingChildDistributionReview, filer)
    );
    await assertRejects(() =>
      buildPdfBytes(missingChildDistributionReview, filer, ".pdf-cache")
    );
    const wrongLine: any = structuredClone(p);
    wrongLine.form8814.items[0].line10++;
    await assertRejects(() => f1040_2025.prepareReturn!(wrongLine, filer));
    await assertRejects(() => buildPdfBytes(wrongLine, filer, ".pdf-cache"));
    if (expected.withSale) {
      const wrongSale: any = structuredClone(p);
      wrongSale.f8949.f8949s[0].cost_basis++;
      await assertRejects(() => f1040_2025.prepareReturn!(wrongSale, filer));
      await assertRejects(() => buildPdfBytes(wrongSale, filer, ".pdf-cache"));
      const wrongGain: any = structuredClone(p);
      wrongGain.schedule_d.print_line16_combined++;
      await assertRejects(() => f1040_2025.prepareReturn!(wrongGain, filer));
      await assertRejects(() => buildPdfBytes(wrongGain, filer, ".pdf-cache"));
    }
    if (expected.withParentDistribution) {
      const wrongParentDistribution: any = structuredClone(p);
      wrongParentDistribution.f1099div.f1099divs[0].box2a++;
      await assertRejects(() =>
        f1040_2025.prepareReturn!(wrongParentDistribution, filer)
      );
      await assertRejects(() =>
        buildPdfBytes(wrongParentDistribution, filer, ".pdf-cache")
      );
    }
    const wrongOwner: any = structuredClone(input);
    wrongOwner.f8814[0].source_review.electing_parent_ssn = "999887777";
    assertThrows(() => f1040_2025.executeReturn(wrongOwner));
    const wrongPublicDistribution: any = structuredClone(input);
    wrongPublicDistribution.f8814[0].source_review.income
      .capital_gain_distributions++;
    assertThrows(() => f1040_2025.executeReturn(wrongPublicDistribution));
  });
}
