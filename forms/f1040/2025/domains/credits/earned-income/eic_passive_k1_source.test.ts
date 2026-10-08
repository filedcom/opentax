import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { passiveK1Cases, passiveK1Inputs } from "./eic_passive_k1.fixture.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { form8582 } from "../../../mef/forms/execution/f8582/f8582.ts";
import { form8582Pdf } from "../../../pdf/forms/execution/f8582.ts";
import { irs1040Pdf } from "../../../pdf/forms/identity/f1040.ts";
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
Deno.test("source-backed passive K1 income releases actual farm/rental PAL through complete EIC returns", async () => {
  const index = Deno.args.indexOf("--write-review-artifacts"),
    output = index < 0 ? undefined : Deno.args[index + 1];
  for (const c of passiveK1Cases) {
    const inputs = c.inputs(), r = f1040_2025.executeReturn(inputs);
    assertEquals(r.diagnostics, [], c.id);
    const p = normalizeAllPending(r.pending);
    assertEquals(p.f1040.line11_agi, c.agi, c.id);
    assertEquals(p.f1040.line27_eitc ?? 0, c.eic, c.id);
    assertEquals(p.eitc.investment_income_floor, c.investment, c.id);
    assertEquals(p.f1040.line16_income_tax ?? 0, c.tax, c.id);
    assertEquals(r.carryforwards.suspended_pal_8582 ?? 0, c.suspended, c.id);
    assertEquals(p.form8582.current_loss, c.currentLoss ?? 5000, c.id);
    if (c.id === "two_owned_losses") {
      assertEquals(
        r.carryforwards["suspended_pal_8582:current-farm-loss"],
        3500,
      );
      assertEquals(
        r.carryforwards["suspended_pal_8582:current-rental-loss"],
        3500,
      );
    }
    const xml8582 = form8582.build(p.form8582, { pending: p });
    if (c.suspended > 0) {
      assertStringIncludes(
        xml8582,
        `<TotalLossesAllowedAmt>${c.allowed}</TotalLossesAllowedAmt>`,
        c.id,
      );
    } else {
      // Positive overall net: instructions allow all losses after Part I;
      // Do not fabricate the native total-losses-allowed element for this route.
      assertEquals(xml8582.includes("<TotalLossesAllowedAmt>"), false, c.id);
      assertEquals(p.form8582.current_loss, c.allowed, c.id);
    }
    if ("qbi" in c && c.qbi !== undefined) {
      assertEquals(p.f1040.line13_qbi_deduction ?? 0, c.qbi, c.id);
      assertEquals(p.form8995.line2, c.qbiIncome ?? 0, c.id);
      assertEquals(
        r.carryforwards[
          "qualified_passive_loss_199a:111223333:current-farm-loss"
        ] ?? 0,
        c.suspended,
        c.id,
      );
    }
    const filer = extractFilerIdentity(r.pending.f1040)!,
      bundle = await buildMefBundle(buildPending(r.pending), {
        filer,
        attachments: [],
      }),
      origins: any[] = [];
    const pdf = await buildPdfBytes(
      bundle.pending,
      filer,
      undefined,
      bundle,
      origins,
    );
    const path = await Deno.makeTempFile({ suffix: ".xml" });
    await Deno.writeTextFile(path, bundle.xml);
    const v = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stderr: "piped",
    }).output();
    assertEquals(v.code, 0, new TextDecoder().decode(v.stderr));
    await Deno.remove(path);
    if (output) {
      const dir = `${output}/${c.id}`;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeTextFile(
        `${dir}/source-pending.json`,
        JSON.stringify(
          {
            inputs,
            filer,
            pending: p,
            preparedPending: bundle.pending,
            carryforwards: r.carryforwards,
            origins,
            expected: {
              agi: c.agi,
              allowed: c.allowed,
              suspended: c.suspended,
              investment: c.investment,
              eic: c.eic,
              tax: c.tax,
              ...("qbi" in c ? { qbi: c.qbi } : {}),
            },
          },
          null,
          2,
        ),
      );
    }
  }
});
Deno.test("passive K1 source inventory rejects owner/issuer/current/prior/PTP and forged PAL/EIC joins", async () => {
  const r = f1040_2025.executeReturn(passiveK1Inputs()),
    p = buildPending(r.pending),
    filer = extractFilerIdentity(r.pending.f1040)!;
  await buildMefBundle(p, { filer, attachments: [] });
  irs1040Pdf.projectFields!(p.f1040 as any, p as any);
  form8582Pdf.projectFields!(p.form8582 as any, p as any);
  const mutations: Array<[string, (p: any) => void]> = [
    [
      "missing current source",
      (p) => delete p.k1_partnership.k1_partnerships[0].passive_income_source,
    ],
    [
      "owner",
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source
          .recipient_tin = "444556666",
    ],
    [
      "issuer",
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source.issuer_ein =
          "987654321",
    ],
    [
      "K1 locator",
      (p) =>
        p.k1_partnership.k1_partnerships[0].source_document_reference =
          "Detached K1",
    ],
    [
      "current income",
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source.activities[0]
          .current_income = 3001,
    ],
    [
      "duplicate activity",
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source.activities
          .push(
            structuredClone(
              p.k1_partnership.k1_partnerships[0].passive_income_source
                .activities[0],
            ),
          ),
    ],
    [
      "prior loss",
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source.activities[0]
          .prior_unallowed_operating = 1,
    ],
    [
      "prior acquisition",
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source.activities[0]
          .ownership_acquired_on = "2024-01-01",
    ],
    [
      "impossible date",
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source.activities[0]
          .ownership_acquired_on = "2025-02-30",
    ],
    [
      "PTP",
      (p) =>
        p.k1_partnership.k1_partnerships[0].passive_income_source
          .entity_status_record.publicly_traded_partnership = true,
    ],
    [
      "participation",
      (p) =>
        p.k1_partnership.k1_partnerships[0].eic_passive_activity_review.box2 =
          "nonpassive",
    ],
    [
      "detached worksheet",
      (p) => p.form8582.activities[0].activity_id = "Detached activity",
    ],
    ["omit reporting kind and inflate AGI pool", (p) => {
      delete p.form8582.activities[0].reporting_form;
      p.agi_aggregator.pal_current_income = 5000;
    }],
    ["missing 8582", (p) => delete p.form8582],
    ["PAL pool", (p) => p.agi_aggregator.pal_current_income = 3001],
    ["PAL loss", (p) => p.agi_aggregator.pal_current_loss = 4999],
    ["Schedule1 allowance", (p) => p.schedule1.line5_schedule_e = 1],
    ["AGI", (p) => p.f1040.line11_agi = 4999],
    [
      "negative K1",
      (p) => p.k1_partnership.k1_partnerships[0].box2_rental_re = -3000,
    ],
  ];
  for (const [label, mutate] of mutations) {
    const bad: any = structuredClone(p);
    mutate(bad);
    await assertRejects(
      () => buildMefBundle(bad, { filer, attachments: [] }),
      Error,
      undefined,
      label,
    );
    assertThrows(
      () => form8582Pdf.projectFields!(bad.form8582 as any, bad),
      Error,
      undefined,
      `${label}:8582 PDF`,
    );
    assertThrows(
      () => irs1040Pdf.projectFields!(bad.f1040 as any, bad),
      Error,
      undefined,
      `${label}:1040 PDF`,
    );
  }
  const above = passiveK1Cases.find((c) =>
    c.id === "combined_categories_above_limit"
  )!;
  const a = f1040_2025.executeReturn(above.inputs()),
    bad = buildPending(a.pending) as any;
  bad.f1040.line27_eitc = 384;
  bad.eitc.credit_amount = 384;
  await assertRejects(() => buildMefBundle(bad, { filer, attachments: [] }));
  assertThrows(() => irs1040Pdf.projectFields!(bad.f1040, bad));
  const q = f1040_2025.executeReturn(passiveK1Inputs("s_corp", "box1")),
    qp = buildPending(q.pending) as any;
  for (
    const mutate of [
      (p: any) => delete p.form8995,
      (p: any) => p.form8995.line2 = 3001,
      (p: any) =>
        p.k1_s_corp.k1_s_corps[0].qualified_business_income_source
          .statement_qbi = 3001,
    ]
  ) {
    const bad = structuredClone(qp);
    mutate(bad);
    await assertRejects(() => buildMefBundle(bad, { filer, attachments: [] }));
  }
});

Deno.test("public passive K1 income retains corrected economics and guards missing/contradictory source records", async () => {
  const classified = passiveK1Inputs();
  delete classified.k1_partnership[0].passive_income_source;
  const calculated = f1040_2025.executeReturn(classified);
  assertEquals(calculated.diagnostics, []);
  assertEquals(calculated.pending.f1040.line11_agi, 5000);
  assertEquals(calculated.pending.eitc.investment_income_floor, 11950);
  assertEquals(calculated.pending.f1040.line27_eitc, 384);
  await assertRejects(
    () =>
      buildMefBundle(buildPending(calculated.pending), {
        filer: extractFilerIdentity(calculated.pending.f1040)!,
        attachments: [],
      }),
    Error,
    "retained current activity",
  );
  const mutations: Array<[string, (s: any) => void]> = [
    ["amount", (s) => s.activities[0].current_income = 3001],
    ["recipient", (s) => s.recipient_tin = "444556666"],
    ["issuer", (s) => s.entity_status_record.issuer_ein = "987654321"],
    [
      "issued statement",
      (s) => s.issued_k1_reference = "Detached issued source",
    ],
    ["PTP", (s) => s.entity_status_record.publicly_traded_partnership = true],
    ["prior balance", (s) => s.activities[0].prior_unallowed_operating = 2000],
    [
      "prior acquisition",
      (s) => s.activities[0].ownership_acquired_on = "2024-01-01",
    ],
    ["calendar", (s) => s.activities[0].ownership_acquired_on = "2025-02-30"],
    ["duplicate", (s) => s.activities.push(structuredClone(s.activities[0]))],
  ];
  for (const [label, mutate] of mutations) {
    const inputs = passiveK1Inputs();
    mutate(inputs.k1_partnership[0].passive_income_source);
    const result = f1040_2025.executeReturn(inputs);
    if (result.diagnostics.length === 0) {
      await assertRejects(
        () =>
          buildMefBundle(buildPending(result.pending), {
            filer: extractFilerIdentity(result.pending.f1040)!,
            attachments: [],
          }),
        Error,
        undefined,
        label,
      );
    } else {assertEquals(
        result.diagnostics.some((d) => d.severity === "error"),
        true,
        label,
      );}
  }
});
