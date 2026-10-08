import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import {
  passiveSCorpCombinedLossReturnInputs,
  passiveSCorpJointLossReturnInputs,
  passiveSCorpLossReturnInputs,
} from "./eic_passive_s_corp_loss.fixture.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const cases: Array<
  {
    id: string;
    inputs: () => Record<string, unknown>;
    allowed: number;
    basis: number;
    combined?: { agi: number; investment: number; credit: number };
  }
> = [
  ...[1000, 4000].flatMap((cash) =>
    [500, 3000, 5000].flatMap((income) =>
      [11950, 11951].map((investment) => ({
        id: `combined-single-${cash}-${income}-${investment}`,
        inputs: () =>
          passiveSCorpCombinedLossReturnInputs(cash, income, investment),
        allowed: Math.min(cash, 4000, income),
        basis: Math.max(0, 4000 - cash),
        combined: {
          agi: 5005 + Math.max(0, income - Math.min(cash, 4000)),
          investment,
          credit: investment === 11950 ? 384 : 0,
        },
      }))
    )
  ),
  ...["primary", "spouse"].flatMap((owner) =>
    [11950, 11951].map((investment) => ({
      id: `combined-joint-${owner}-${investment}`,
      inputs: () =>
        passiveSCorpCombinedLossReturnInputs(
          1000,
          3000,
          investment,
          owner as "primary" | "spouse",
        ),
      allowed: 1000,
      basis: 3000,
      combined: {
        agi: 12005,
        investment,
        credit: investment === 11950 ? 649 : 0,
      },
    }))
  ),
  ...[
    [1000, 0],
    [1000, 500],
    [1000, 3000],
    [4000, 3000],
    [4000, 4000],
    [4000, 5000],
    [6000, 0],
    [6000, 3000],
  ].flatMap(([cash, income]) =>
    [11950, 11951].map((investment) => ({
      id: `single-${cash}-${income}-${investment}`,
      inputs: () => passiveSCorpLossReturnInputs(cash, income, investment),
      allowed: Math.min(cash, 4000, income),
      basis: Math.max(0, 4000 - cash),
    }))
  ),
  ...[false, true].flatMap((spouse) =>
    [11950, 11951].map((investment) => ({
      id: `joint-${spouse ? "spouse" : "primary"}-${investment}`,
      inputs: () => passiveSCorpJointLossReturnInputs(spouse, investment),
      allowed: 1000,
      basis: 3000,
    }))
  ),
];
for (const c of cases) {
  Deno.test(`Complete passive source native return ${c.id} retains basis/PAL/QBI copies and passes Return1040 XSD`, async () => {
    const r = f1040_2025.executeReturn(c.inputs());
    assertEquals(r.diagnostics, []);
    if (c.combined) {
      assertEquals(r.pending.f1040.line11_agi, c.combined.agi);
      assertEquals(
        r.pending.eitc.investment_income_floor,
        c.combined.investment,
      );
      assertEquals(r.pending.f1040.line27_eitc ?? 0, c.combined.credit);
    }

    const p = buildPending(r.pending),
      filer = extractFilerIdentity(r.pending.f1040)!;
    const b = await buildMefBundle(p, { filer, attachments: [] });
    assertEquals(b.attachments.length, 0);
    assertEquals((b.xml.match(/<IRS1040ScheduleE\s/g) ?? []).length, 1);
    assertEquals(b.xml.includes("<NonpassiveLossAmt>"), false);
    for (
      const tag of [
        "IRS1040",
        "IRS1040ScheduleE",
        "IRS7203",
        "IRS8995",
        "IRS8582",
      ]
    ) assertStringIncludes(b.xml, `<${tag} `);
    assertStringIncludes(
      b.xml,
      `<TotQlfyBusLossCarryforwardAmt>${c.allowed}</TotQlfyBusLossCarryforwardAmt>`,
    );
    if (c.basis > 0) {
      assertStringIncludes(
        b.xml,
        `<ShrCarryoverAmountsGrp><OrdinaryBusinessLossAmt>${c.basis}</OrdinaryBusinessLossAmt>`,
      );
    }
    const path = await Deno.makeTempFile({
      prefix: `opentax-passive-return-${c.id}-`,
      suffix: ".xml",
    });
    await Deno.writeTextFile(path, b.xml);
    console.log(`Retained complete XML: ${path}`);
    const v = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(v.code, 0, new TextDecoder().decode(v.stderr));
  });
}
Deno.test("Complete passive native export rejects source-copy deletion and inconsistent final joins", async () => {
  for (
    const mutate of [
      (p: any) => delete p.form7203,
      (p: any) => delete p.form8995,
      (p: any) => delete p.k1_s_corp,
      (p: any) => delete p.form8582,
      (p: any) => p.form8582.current_loss = 4000,
      (p: any) => p.form8995.line16 = 4000,
      (p: any) => p.schedule1.line5_schedule_e = -4000,
      (p: any) => p.f1040.line11_agi++,
      (p: any) =>
        p.k1_s_corp.k1_s_corps[0].first_year_passive_loss_source
          .stock_subscription.cash_payment.corporate_bank_credit++,
    ]
  ) {
    const r = f1040_2025.executeReturn(
      passiveSCorpLossReturnInputs(1000, 3000),
    );
    const p = buildPending(r.pending) as any;
    const filer = extractFilerIdentity(r.pending.f1040)!;
    mutate(p);
    await assertRejects(() => buildMefBundle(p, { filer, attachments: [] }));
  }
});
