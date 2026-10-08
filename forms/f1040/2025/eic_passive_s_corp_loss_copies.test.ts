import { form7203StockLoss } from "./mef/forms/f7203_stock_loss.ts";
import { form7203StockLossPdf } from "./pdf/forms/f7203_stock_loss.ts";
import { form8995 } from "./mef/forms/f8995.ts";
import { form8995Pdf } from "./pdf/forms/f8995.ts";
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
    const filer = extractFilerIdentity(p.f1040)!;
    const b = new XMLParser().parse(
      form7203StockLoss.build(p.form7203, { pending: p, filer }),
    ).IRS7203;
    assertEquals(
      b.ShrAllwblLossFromStockBasisGrp.OrdinaryBusinessLossAmt,
      Math.min(c.cash, 4000),
    );
    assertEquals(
      b.ShrCarryoverAmountsGrp?.OrdinaryBusinessLossAmt ?? 0,
      Math.max(0, 4000 - c.cash),
    );
    const basisPrint =
      form7203StockLossPdf.instances!(p.form7203, filer, p)![0];
    assertEquals(basisPrint.line35_allowed_stock, Math.min(c.cash, 4000));
    assertEquals(basisPrint.line35_carryover ?? 0, Math.max(0, 4000 - c.cash));
    const q =
      new XMLParser().parse(form8995.build(p.form8995, { pending: p, filer }))
        .IRS8995;
    assertEquals(
      q.QualifiedBusinessIncomeDedGrp.QlfyBusinessIncomeOrLossAmt,
      -c.allowed || 0,
    );
    assertEquals(q.TotQlfyBusLossCarryforwardAmt, c.allowed);
    const qPrint = form8995Pdf.projectFields!(p.form8995, p);
    assertEquals(qPrint.line1_qbi, -c.allowed || 0);
    assertEquals(qPrint.line16, c.allowed);
    assertEquals(qPrint.owned_loss_header, true);

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
    ["1040 QBI deduction", (p: any) => p.f1040.line13_qbi_deduction++],
    ["1040 taxable income", (p: any) => p.f1040.line15_taxable_income++],
  ] as const
) {
  Deno.test(`Passive native/print source copies reject mutated ${label}`, () => {
    const p = f1040_2025.executeReturn(passiveSCorpLossReturnInputs(1000, 3000))
      .pending;
    mutate(p);
    assertThrows(() => form8582.build(p.form8582, { pending: p }));
    assertThrows(() => scheduleE.build({}, { pending: p }));
    assertThrows(() => scheduleEPdf.projectFields!({}, p));
    const filer = extractFilerIdentity(p.f1040)!;
    assertThrows(() =>
      form7203StockLoss.build(p.form7203, { pending: p, filer })
    );
    assertThrows(() => form7203StockLossPdf.instances!(p.form7203, filer, p));
    assertThrows(() => form8995.build(p.form8995, { pending: p, filer }));
    assertThrows(() => form8995Pdf.projectFields!(p.form8995, p));
  });
}

const base =
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/";
Deno.test("XSD: registered passive source Form7203, Form8995, Form8582 and ScheduleE components", async () => {
  const p =
    f1040_2025.executeReturn(passiveSCorpLossReturnInputs(4000, 3000)).pending;
  const filer = extractFilerIdentity(p.f1040)!;
  for (
    const [tag, xml, relative] of [
      [
        "IRS7203",
        form7203StockLoss.build(p.form7203, { pending: p, filer }),
        "Shared/IRS7203/IRS7203.xsd",
      ],
      [
        "IRS8995",
        form8995.build(p.form8995, { pending: p, filer }),
        "Shared/IRS8995/IRS8995.xsd",
      ],
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

Deno.test("Passive registered basis and QBI descriptors reject divergent raw copies and wrong filer", () => {
  const p =
    f1040_2025.executeReturn(passiveSCorpLossReturnInputs(1000, 3000)).pending;
  const filer = extractFilerIdentity(p.f1040)!;
  const basis = { ...p.form7203, ordinary_loss: 4000 };
  assertThrows(() => form7203StockLoss.build(basis, { pending: p, filer }));
  assertThrows(() => form7203StockLossPdf.instances!(basis, filer, p));
  const qbi = { ...p.form8995, qbi_deduction: 0, line16: 4000 };
  assertThrows(() => form8995.build(qbi, { pending: p, filer }));
  assertThrows(() => form8995Pdf.projectFields!(qbi, p));
  const wrong = { ...filer, primarySSN: "999887777" };
  assertThrows(() =>
    form7203StockLoss.build(p.form7203, { pending: p, filer: wrong })
  );
  assertThrows(() => form7203StockLossPdf.instances!(p.form7203, wrong, p));
});
