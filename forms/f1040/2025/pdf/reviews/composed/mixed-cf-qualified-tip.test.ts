import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../../domains/execution/pending.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { buildPdfBytes } from "../../builder.ts";
import { mixedCfTipCases } from "./mixed-cf-qualified-tip.fixture.ts";
import { calculateFarmWotcLines } from "../../../../nodes/intermediate/forms/form8995a/farm-wotc.ts";
const root = "/tmp/opentax-mixed-cf-qualified-tip-evidence";
// Filed amounts independently derived from issued receipts/wages, owner SE, actual plans and the IRS worksheets.
// halfSE, health, tips, QBI deduction, rounded AGI, rounded TI, ordinary tax, total tax.
const expected: Record<string, number[]> = {
  "mixed-cf-tip-owned-health": [
    4372,
    15600,
    12000,
    11686,
    300431,
    245245,
    44553,
    51466,
  ],
  "mixed-cf-tip-health-netincome-limited": [
    4372,
    21600,
    22729,
    8340,
    294431,
    231862,
    41341,
    48254,
  ],
  "mixed-cf-tip-no-health": [
    4372,
    0,
    23400,
    12526,
    316031,
    248605,
    45359,
    52272,
  ],
  "mixed-cf-tip-health-income-limited": [
    4372,
    86030,
    0,
    0,
    230001,
    198501,
    33498,
    40411,
  ],
  "mixed-cf-tip-phase-wotc": [
    17277,
    15600,
    6800,
    33959,
    482524,
    410265,
    85411,
    119702,
  ],
  "mixed-cf-tip-above-zero-wotc": [
    16288,
    15600,
    0,
    166423,
    1232115,
    1034192,
    306714,
    111536,
  ],
  "mixed-cf-tip-ordinary-no-credit": [
    4271,
    15600,
    12000,
    11226,
    298132,
    243406,
    44111,
    53203,
  ],
};
const settled = new Map<string, any>();
for (const c of mixedCfTipCases) {
  Deno.test(`actual ${c.id} issued C/F/tips/health/WOTC/QBI/fullXSD/PDF`, async () => {
    const inputs = c.inputs(), result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const p: any = normalizeAllPending(result.pending),
      f = p.f1040,
      q = p.form8995;
    const filer = extractFilerIdentity(f)!;
    const e = expected[c.id];
    assertEquals([
      p.schedule1.line15_se_deduction,
      p.schedule1.line17_se_health_insurance ?? 0,
      f.line13b_additional_deductions ?? 0,
      f.line13_qbi_deduction ?? 0,
      Math.round(f.line11_agi),
      Math.round(f.line15_taxable_income),
      f.line16_income_tax,
      f.line24_total_tax,
    ], e);
    // IRS2025 Tax Computation Worksheet Section B, independently applied to filed TI.
    assertEquals(
      e[6],
      Math.round(
        e[5] <= 206700
          ? e[5] * .22 - 10172
          : e[5] <= 394600
          ? e[5] * .24 - 14306
          : e[5] <= 501050
          ? e[5] * .32 - 45874
          : e[5] * .37 - 75937.5,
      ),
    );
    const source = q.qualified_tip_qbi_source;
    assertEquals(source.business_rows.length, 1);
    const tip = source.business_rows[0];
    assertEquals(tip.recipient, "T");
    assertEquals(tip.qbi_tip_exclusion, e[2]);
    assertEquals(
      tip.eligible_tips,
      Math.min(
        tip.reported_tips,
        Math.max(
          0,
          tip.net_profit - tip.se_tax_deduction -
            (tip.se_health_deduction ?? 0),
        ),
      ),
    );
    const owner = q.joint_se_source,
      farm = owner.businesses.find((b: any) => b.kind === "schedule_f"),
      business = owner.businesses.find((b: any) => b.kind === "schedule_c");
    assertEquals([business.recipient, farm.recipient], ["T", "S"]);
    assertEquals(p.schedule1.line3_schedule_c, business.net_profit);
    assertEquals(p.schedule1.line6_schedule_f, farm.net_profit);
    assertEquals(
      p.schedule1a.qualified_tips_schedule_f_businesses.map((
        b: any,
      ) => [
        b.farm_id,
        b.proprietor_recipient,
        b.line34_net_profit,
        b.accounting_method,
      ]),
      [[farm.source_reference, "S", farm.net_profit, "cash"]],
    );
    const wages = p.w2.w2s.reduce((n: number, w: any) => n + w.box1_wages, 0);
    assertEquals(
      Math.round(f.line11_agi),
      Math.round(wages + business.net_profit + farm.net_profit - e[0] - e[1]),
    );
    assertEquals(
      Math.round(f.line15_taxable_income),
      Math.round(f.line11_agi - f.line12c_deduction_total - e[2] - e[3]),
    );
    assertEquals(
      f.line24_total_tax,
      f.line16_income_tax - f.line21_credits_total + f.line23_other_taxes,
    );
    if (p.form8995a) {
      const a = calculateFarmWotcLines(p.form8995a);
      assertEquals(
        p.form8995a.farm_wotc_filing_source.qualified_tip_qbi_source,
        source,
      );
      assertEquals(
        p.form8995a.taxable_income,
        Math.round(f.line11_agi - f.line12c_deduction_total - e[2]),
      );
      if (c.id.includes("phase-wotc")) {
        assertEquals(a.rows.map((r: any) => r.lines.line2), [165145, 160579]);
        const farmWage = 3000.52, cWage = 4000.49;
        const cCredit = Math.round(2400 * cWage / (farmWage + cWage));
        assertEquals(cCredit, 1371);
        assertEquals(a.rows.map((r: any) => r.lines.line4), [
          Math.round(farmWage - (2400 - cCredit)),
          Math.round(cWage - cCredit),
        ]);
        assertEquals(
          a.rows.map((
            r: any,
          ) => [r.lines.line5, r.lines.line25, r.lines.line26]),
          [[986, 15901, 17128], [1315, 15285, 16831]],
        );
        const ratio = (444224 - 394600) / 100000;
        assertEquals(
          e[3],
          (33029 - Math.round((33029 - 986) * ratio)) +
            (32116 - Math.round((32116 - 1315) * ratio)),
        );
      } else assertEquals(e[3], Math.round(832114 * .2));
    } else {
      const rows = q.joint_owner_filing_rows;
      const cRow = rows.find((r: any) => r.recipient === "T"),
        fRow = rows.find((r: any) => r.recipient === "S");
      assertEquals(cRow.qualified_tip_exclusion, e[2]);
      assertEquals(fRow.qualified_tip_exclusion, 0);
      assertEquals(
        cRow.qbi,
        Math.round(
          business.net_profit - cRow.se_tax_deduction -
            (cRow.health_insurance_deduction ?? 0) - e[2],
        ),
      );
      assertEquals(
        fRow.qbi,
        Math.round(
          farm.net_profit - fRow.se_tax_deduction -
            (fRow.health_insurance_deduction ?? 0),
        ),
      );
      assertEquals(
        e[3],
        Math.min(
          Math.round(Math.max(0, cRow.qbi + fRow.qbi) * .2),
          Math.round(
            Math.max(0, f.line11_agi - f.line12c_deduction_total - e[2]) * .2,
          ),
        ),
      );
    }
    const prepared = await f1040_2025.prepareReturn(p, filer),
      xml = prepared.bundle.xml;
    assertEquals(xml.includes("IRS1040Schedule1A"), e[2] > 0);
    assertEquals(
      (xml.match(/<IRS7206 /g) ?? []).length,
      c.id === "mixed-cf-tip-no-health" ? 0 : 2,
    );
    assertEquals(xml.includes("<IRS8995A "), !!p.form8995a);
    assertEquals(xml.includes("<IRS8995 "), !p.form8995a);
    if (e[2] > 0) {
      assertStringIncludes(
        xml,
        `<QualifiedTipsDeductionAmt>${e[2]}</QualifiedTipsDeductionAmt>`,
      );
    }
    const file = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(file, xml);
      const x = await new Deno.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
          file,
        ],
        stderr: "piped",
      }).output();
      assertEquals(x.code, 0, new TextDecoder().decode(x.stderr));
    } finally {
      await Deno.remove(file);
    }
    const pdf = await prepared.renderPdf(), doc = await PDFDocument.load(pdf);
    assertEquals(doc.getForm().getFields().length, 0);
    if (Deno.args.includes("--write-review-artifacts")) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${c.id}-source-input.json`,
        JSON.stringify({ inputs, pending: p }, null, 2),
      );
      await Deno.writeTextFile(`${root}/${c.id}-full-return.xml`, xml);
      await Deno.writeFile(`${root}/${c.id}-filled-return.pdf`, pdf);
    }
    settled.set(c.id, { p, filer });
    console.log(c.id, doc.getPageCount(), e);
  });
}
for (
  const id of [
    "mixed-cf-tip-owned-health",
    "mixed-cf-tip-health-income-limited",
    "mixed-cf-tip-phase-wotc",
  ]
) {
  Deno.test(`actual ${id} rejects borrowed farm/tip/owner/health/final sources`, async () => {
    const saved = settled.get(id) ?? (() => {
      const r = f1040_2025.executeReturn(
        mixedCfTipCases.find((c) => c.id === id)!.inputs(),
      );
      assertEquals(r.diagnostics, []);
      const p = normalizeAllPending(r.pending);
      return { p, filer: extractFilerIdentity(p.f1040)! };
    })();
    const changes = [
      (p: any) =>
        p.schedule1a.qualified_tips_schedule_f_businesses[0]
          .line34_net_profit++,
      (p: any) =>
        p.schedule1a.qualified_tips_owner_se_source.businesses.find((b: any) =>
          b.kind === "schedule_f"
        ).net_profit++,
      (p: any) => p.schedule_f.schedule_fs[0].proprietor_recipient = "T",
      (p: any) => p.f1099g.f1099gs[0].recipient_tin = "999887777",
      (p: any) =>
        p.schedule1a.qualified_tips_schedule_f_businesses.push({
          ...p.schedule1a.qualified_tips_schedule_f_businesses[0],
        }),
      (p: any) =>
        p.schedule1a.qualified_trade_business_tips.push({
          ...p.schedule1a.qualified_trade_business_tips[0],
        }),
      (p: any) =>
        p.f1099nec.f1099necs.find((n: any) => n.for_routing === "schedule_f")
          .recipient_ssn = "999887777",
      (p: any) => p.w2.w2s[Math.min(1, p.w2.w2s.length - 1)].box3_ss_wages++,
      (p: any) =>
        p.schedule1a.qualified_trade_business_tips[0]
          .allocable_health_plan_identifiers = [
            p.form7206.independent_schedule_c_plans.plans.find((b: any) =>
              b.recipient === "S"
            ).plan_identifier,
          ],
      (p: any) =>
        p.form7206.independent_schedule_c_plans.plans[0]
          .issued_premium_records[0].payer_ssn = "999887777",
      (p: any) =>
        p.form8995.qualified_tip_qbi_source.business_rows[0]
          .qbi_tip_exclusion++,
      (p: any) => delete p.form8995.qualified_tip_qbi_source,
      (p: any) => p.schedule1.line17_se_health_insurance++,
      (p: any) => p.f1040.line13b_additional_deductions++,
      (p: any) => p.f1040.line11_agi++,
      ...(id.includes("phase")
        ? [
          (p: any) =>
            delete p.form8995a.farm_wotc_filing_source.qualified_tip_qbi_source,
        ]
        : []),
    ];
    for (const change of changes) {
      const p = JSON.parse(JSON.stringify(saved.p));
      change(p);
      await assertRejects(() => f1040_2025.prepareReturn(p, saved.filer));
      await assertRejects(() => buildPdfBytes(p, saved.filer));
    }
    const input = mixedCfTipCases.find((c) => c.id === id)!.inputs();
    input.schedule_c[0].qbi_specified_service = true;
    assertEquals(
      f1040_2025.executeReturn(input).diagnostics.some((d) =>
        d.severity === "error"
      ),
      true,
    );
  });
}
