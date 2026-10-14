import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";
import {
  producingMiningAmtCharityCases,
  reviewedProducingMiningAmtCharityGift,
} from "./form8283-producing-mining-amt-charity.fixture.ts";

const expectations = {
  partly_limited_amt: {
    agi: 1035000,
    amtAllowed: 310500,
    adjustment: -500,
    amtCarry: 500,
    taxable: 715000,
    regularTax: 221570,
    amti: 1314500,
    tmt: 363278,
    amt: 141708,
    otherTax: 8563,
    totalTax: 371841,
    owed: 113381,
  },
  fully_allowed_amt: {
    agi: 1037000,
    amtAllowed: 311000,
    adjustment: -1000,
    amtCarry: 0,
    taxable: 717000,
    regularTax: 222310,
    amti: 1316000,
    tmt: 363698,
    amt: 141388,
    otherTax: 8581,
    totalTax: 372279,
    owed: 113801,
  },
};
for (const kind of producingMiningAmtCharityCases) {
  Deno.test(`Producing617 ${kind} owned AMT charity line3 and distinct carry full packet`, async () => {
    const source = await reviewedProducingMiningAmtCharityGift(kind);
    const want = expectations[kind];
    const r = f1040_2025.executeReturn(source.inputs);
    assertEquals(r.diagnostics, []);
    const p: any = buildPending(r.pending), f = p.f1040, a = p.form6251;
    assertEquals([
      source.calc.fmv,
      source.calc.deduction_claimed,
      source.calc.amt_deduction_claimed,
      source.calc.current_year.deduction,
      source.calc.current_year.depletion,
    ], [350000, 310000, 311000, 100000, 0]);
    assertEquals([
      p.schedule1.line3_schedule_c,
      p.schedule1.line15_se_deduction,
      p.schedule2.line4_se_tax,
    ], [40000, 536, 1071]);
    assertEquals([
      f.line11_agi,
      f.line12e_itemized_deductions,
      f.line13_qbi_deduction,
      f.line15_taxable_income,
      f.line16_income_tax,
    ], [want.agi, 320000, 0, want.taxable, want.regularTax]);
    assertEquals([
      a.line3_charitable_contribution_adjustment,
      a.iso_adjustment,
      a.line2q_mining_costs,
      a.line2a_taxes_paid,
      a.amti,
      a.exemption,
      a.tentative_tax,
      a.line11_amt,
    ], [
      want.adjustment,
      500000,
      90000,
      10000,
      want.amti,
      0,
      want.tmt,
      want.amt,
    ]);
    const ledger = p.schedule_a.charitable_amt_reconciliation;
    assertEquals([
      ledger.regular_current_noncash_allowed,
      ledger.amt_current_noncash_allowed,
      ledger.line3_charitable_contribution_adjustment,
    ], [310000, want.amtAllowed, want.adjustment]);
    assertEquals([
      r.carryforwards.charitable_capital_gain_30_2025,
      r.carryforwards.amt_charitable_capital_gain_30_2025,
    ], [0, want.amtCarry]);
    assertEquals(
      ledger.amt_carryforwards.amt_charitable_capital_gain_30_2025,
      want.amtCarry,
    );
    assertEquals([
      f.line23_other_taxes,
      f.line24_total_tax,
      f.line31_additional_payments,
      f.line37_amount_owed,
    ], [want.otherTax, want.totalTax, 6200, want.owed]);
    assertEquals(
      f.line25c_additional_medicare_withheld,
      kind === "partly_limited_amt" ? 6260 : 6278,
    );
    const bundle = await buildMefBundle(p, {
      filer: source.filer,
      attachments: source.attachments,
    });
    assertStringIncludes(
      bundle.xml,
      `<RelatedAdjustmentAmt>${want.adjustment}</RelatedAdjustmentAmt>`,
    );
    assertEquals((bundle.xml.match(/<IRS8283\b/g) ?? []).length, 1);
    assertEquals((bundle.xml.match(/<IRSW2\b/g) ?? []).length, 2);
    assertEquals((bundle.xml.match(/<IRS6251\b/g) ?? []).length, 1);
    assertEquals((bundle.xml.match(/<IRS8995A\b/g) ?? []).length, 1);
    assertEquals(bundle.xml.includes("<IRS8995 "), false);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      p,
      source.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    assertEquals(origins.filter((o) => o.formKey === "form8995a").length, 2);
    const dir = (Deno.env.get("FORM8283_AMT_CHARITY_EVIDENCE_DIR") ??
      ".state/research/form8283-producing617-amt-charity") + "/" + kind;
    await Deno.mkdir(dir + "/attachments", { recursive: true });
    await Deno.writeFile(dir + "/return.pdf", pdf);
    await Deno.writeTextFile(dir + "/return.xml", bundle.xml);
    for (
      const [name, value] of Object.entries({
        source: { inputs: source.inputs, filer: source.filer },
        pending: p,
        carryforwards: r.carryforwards,
        origins,
        calculation: source.calc,
      })
    ) {
      await Deno.writeTextFile(
        dir + "/" + name + ".json",
        JSON.stringify(value, null, 2),
      );
    }
    const metadata = [];
    for (const attachment of source.attachments) {
      const { bytes, ...record } = attachment;
      metadata.push(record);
      await Deno.writeFile(dir + "/attachments/" + attachment.fileName, bytes);
    }
    await Deno.writeTextFile(
      dir + "/attachments.json",
      JSON.stringify(metadata, null, 2),
    );
    const x = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        dir + "/return.xml",
      ],
    }).output();
    assertEquals(x.code, 0, new TextDecoder().decode(x.stderr));
    const mutations: [string, (q: any) => void][] = [
      ["filedline3", (q) => q.form6251.line3_related_adjustments_total = -499],
      [
        "miningEIN",
        (q) => q.schedule_c.schedule_cs[0].line_d_ein = "99-8877665",
      ],
      ["miningwages", (q) => q.schedule_c.schedule_cs[0].qbi_w2_wages = 1],
      [
        "rawAMTsource",
        (q) =>
          q.schedule_a.noncash_contribution_items[0]
            .producing_mining_charitable_amt_source.original_owned_cost += 1,
      ],
      [
        "charityline3",
        (q) => q.form6251.line3_charitable_contribution_adjustment += 1,
      ],
      [
        "amtcarry",
        (q) =>
          q.schedule_a.charitable_amt_reconciliation.amt_carryforwards
            .amt_charitable_capital_gain_30_2025 += 1,
      ],
      [
        "amtallowance",
        (q) =>
          q.schedule_a.charitable_amt_reconciliation
            .amt_current_noncash_allowed -= 1,
      ],
      [
        "regularclaim",
        (q) => q.schedule_a.noncash_contribution_items[0].amount -= 1,
      ],
      [
        "detachedmine",
        (q) =>
          delete q.schedule_a.noncash_contribution_items[0]
            .producing_mining_charitable_amt_source,
      ],
      [
        "owner",
        (q) =>
          q.form8995a.producing_mining_zero_qbi_source.owner_ssn = "555667777",
      ],
      ["wages", (q) => q.w2.w2s[1].box1_wages += 1],
      ["issuedowner", (q) => q.w2.w2s[1].employee_ssn = "555-66-7777"],
      ["iso", (q) => q.f3921.f3921s[0].box4_fmv_per_share += 1],
      ["qbi", (q) => q.f1040.line13_qbi_deduction = 1],
      ["tax", (q) => q.f1040.line24_total_tax += 1],
    ];
    for (const [label, change] of mutations) {
      const q = structuredClone(p);
      change(q);
      await assertRejects(
        () =>
          buildMefBundle(q, {
            filer: source.filer,
            attachments: source.attachments,
          }),
        Error,
        undefined,
        label + " native",
      );
      await assertRejects(
        () => buildPdfBytes(q, source.filer, ".pdf-cache", bundle),
        Error,
        undefined,
        label + " PDF",
      );
    }
  });
}
