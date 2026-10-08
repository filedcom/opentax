import { assertEquals, assertThrows } from "@std/assert";
import { XMLParser } from "fast-xml-parser";
import { f1040_2025 } from "./index.ts";
import { passiveSCorpLossReturnInputs } from "./eic_passive_s_corp_loss.fixture.ts";
import { projectPassiveSCorpLossCopies } from "./passive-s-corp-loss-copies.ts";
import { form8582 } from "./mef/forms/f8582.ts";
import { scheduleE } from "./mef/forms/schedule_e.ts";
import { scheduleEPdf } from "./pdf/forms/schedule_e.ts";
import { extractFilerIdentity } from "../mef/filer.ts";

for (
  const c of [
    { cash: 1000, income: 0, allowed: 0 },
    { cash: 1000, income: 500, allowed: 500 },
    { cash: 1000, income: 3000, allowed: 1000 },
    { cash: 4000, income: 3000, allowed: 3000 },
  ]
) {
  Deno.test(`Passive source copies ${c.cash}/${c.income} replay allowed loss into native Form8582 and native/print ScheduleE`, () => {
    const r = f1040_2025.executeReturn(
      passiveSCorpLossReturnInputs(c.cash, c.income),
    );
    assertEquals(r.diagnostics, []);
    const p = r.pending, projection = projectPassiveSCorpLossCopies(p)!;
    assertEquals(projection.allowed, c.allowed);
    form8582.build(p.form8582, { pending: p });
    const xml = new XMLParser().parse(scheduleE.build({}, { pending: p }))
      .IRS1040ScheduleE;
    const rows = Array.isArray(xml.PartnershipOrSCorpGroup)
      ? xml.PartnershipOrSCorpGroup
      : [xml.PartnershipOrSCorpGroup];
    const loss = rows.find((row: any) => row.PartnershipSCorpCd === "S");
    assertEquals(loss.BasisComputationRequiredInd, "X");
    assertEquals(loss.PassiveLossAllowedAmt ?? 0, c.allowed);
    assertEquals(loss.NonpassiveLossAmt, undefined);
    assertEquals(xml.TotalPassiveLossAllowedAmt ?? 0, c.allowed);
    assertEquals(xml.TotalPrtshpSCorpLossAmt ?? 0, c.allowed);
    assertEquals(xml.TotalPrtshpSCorpIncomeAmt, c.income);
    assertEquals(xml.NetPrtshpSCorpIncomeOrLossAmt, c.income - c.allowed);
    const print = scheduleEPdf.projectFields!({}, p);
    const index = c.income > 0 ? 1 : 0;
    assertEquals(print[`k1_${index}_basis_required`], true);
    assertEquals(print[`k1_${index}_passive_loss`] ?? 0, c.allowed);
    assertEquals(print.k1_total_passive_loss ?? 0, c.allowed);
    assertEquals(print.k1_line30, c.income);
    assertEquals(print.k1_line31 ?? 0, c.allowed);
    assertEquals(print.k1_line32, c.income - c.allowed);
    assertEquals(print.trust_line41, c.income - c.allowed);
    const mapped = new Set(scheduleEPdf.fields.map((field) => field.domainKey));
    assertEquals(mapped.has(`k1_${index}_passive_loss`), true);
    assertEquals(mapped.has(`k1_${index}_basis_required`), true);
  });
}

for (
  const [label, mutate] of [
    ["basis copy", (p: any) => delete p.form7203],
    ["QBI copy", (p: any) => delete p.form8995],
    [
      "stock cash",
      (p: any) =>
        p.form7203.current_passive_s_corp_loss.source.stock_subscription
          .cash_payment.corporate_bank_credit++,
    ],
    ["PAL total", (p: any) => p.form8582.current_loss = 4000],
    [
      "PAL activity",
      (p: any) =>
        p.form8582.activities.find((a: any) => a.reporting_form === "k1_s_corp")
          .current_net = -4000,
    ],
    ["Schedule1 allowance", (p: any) => p.schedule1.line5_schedule_e++],
    ["AGI total", (p: any) => p.f1040.line11_agi++],
    ["QBI loss", (p: any) => p.form8995.line2--],
  ] as const
) {
  Deno.test(`Passive native/print source copies reject mutated ${label}`, () => {
    const p = f1040_2025.executeReturn(passiveSCorpLossReturnInputs(1000, 3000))
      .pending;
    mutate(p);
    assertThrows(() => form8582.build(p.form8582, { pending: p }));
    assertThrows(() => scheduleE.build({}, { pending: p }));
    assertThrows(() => scheduleEPdf.projectFields!({}, p));
  });
}

const base =
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/";
Deno.test("XSD: standalone passive source Form8582 and ScheduleE allowed-loss documents", async () => {
  const p =
    f1040_2025.executeReturn(passiveSCorpLossReturnInputs(4000, 3000)).pending;
  const filer = extractFilerIdentity(p.f1040)!;
  for (
    const [tag, xml, relative] of [
      [
        "IRS8582",
        form8582.build(p.form8582, { pending: p, filer }),
        "IndividualIncomeTax/Common/IRS8582/IRS8582.xsd",
      ],
      [
        "IRS1040ScheduleE",
        scheduleE.build({}, { pending: p, filer }),
        "IndividualIncomeTax/Common/IRS1040ScheduleE/IRS1040ScheduleE.xsd",
      ],
    ]
  ) {
    const xsd = new URL(base + relative, import.meta.url).pathname;
    await Deno.stat(xsd);
    const path = await Deno.makeTempFile({
      prefix: `opentax-passive-${tag}-`,
      suffix: ".xml",
    });
    await Deno.writeTextFile(
      path,
      xml.replace(
        `<${tag}>`,
        `<${tag} xmlns="http://www.irs.gov/efile" documentId="${tag}-1">`,
      ),
    );
    const v = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(v.code, 0, new TextDecoder().decode(v.stderr));
    console.log(`Retained standalone XML: ${path}`);
  }
});
