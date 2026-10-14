import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import {
  passiveLine10Cases,
  passiveLine10Inputs,
} from "./eic_passive_line10.fixture.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form4797 } from "../../../../mef/forms/income/business/f4797.ts";
import { form4797Pdf } from "../../../../pdf/forms/income/business/f4797.ts";
import { irs1040Pdf } from "../../../../pdf/forms/general/return-assembly/f1040.ts";
const xsd = new URL(
  "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
Deno.test("current issued passive ordinary K1 gains release owned farm PAL with filed character and QBI", async () => {
  const index = Deno.args.indexOf("--write-review-artifacts"),
    output = index < 0 ? undefined : Deno.args[index + 1];
  for (const c of passiveLine10Cases) {
    const inputs = c.inputs(),
      r = f1040_2025.executeReturn(inputs),
      p = normalizeAllPending(r.pending);
    assertEquals(r.diagnostics, [], c.id);
    assertEquals(p.f1040.line11_agi, c.agi, c.id);
    assertEquals(p.eitc.investment_income_floor, c.investment, c.id);
    assertEquals(p.f1040.line27_eitc ?? 0, c.eic, c.id);
    assertEquals(p.f1040.line16_income_tax ?? 0, c.tax, c.id);
    assertEquals(p.f1040.line13_qbi_deduction ?? 0, c.qbi, c.id);
    assertEquals(p.form8995.line2, c.qbiIncome, c.id);
    assertEquals(r.carryforwards.suspended_pal_8582 ?? 0, c.suspended, c.id);
    const ordinary = inputs.k1_partnership.reduce(
      (t: any, k: any) =>
        t +
        k.box11_line10_ordinary.reduce(
          (n: any, row: any) => n + row.gain_loss,
          0,
        ),
      0,
    );
    assertEquals(p.schedule1.line4_other_gains, ordinary, c.id);
    assertEquals(
      (p.form8582.activities as any[]).filter((a) =>
        a.reporting_form === "k1_4797_line10"
      ).reduce((t, a) => t + a.current_net, 0),
      ordinary,
      c.id,
    );
    assertEquals(
      p.schedule1.line5_schedule_e ?? 0,
      (c.id === "ordinary_and_box1_statement" ? 3000 : 0) - c.allowed,
      c.id,
    );
    const filer = extractFilerIdentity(r.pending.f1040)!,
      bundle = await buildMefBundle(buildPending(r.pending), {
        filer,
        attachments: [],
      }),
      origins: any[] = [];
    assertStringIncludes(
      bundle.xml,
      `<TotalOrdinaryGainLossAmt>${ordinary}</TotalOrdinaryGainLossAmt>`,
      c.id,
    );
    assertEquals(bundle.xml.includes("<IRS8582"), c.allowed > 0, c.id);
    const pdf = await buildPdfBytes(
        bundle.pending,
        filer,
        undefined,
        bundle,
        origins,
      ),
      path = await Deno.makeTempFile({ suffix: ".xml" });
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
              investment: c.investment,
              eic: c.eic,
              tax: c.tax,
              allowed: c.allowed,
              suspended: c.suspended,
              qbi: c.qbi,
              qbiIncome: c.qbiIncome,
            },
          },
          null,
          2,
        ),
      );
    }
  }
});
Deno.test("ordinary K1 passive source owner inventory and PAL/QBI/export conflicts are rejected", async () => {
  const r = f1040_2025.executeReturn(passiveLine10Inputs()),
    base: any = buildPending(r.pending),
    filer = extractFilerIdentity(r.pending.f1040)!;
  await buildMefBundle(base, { filer, attachments: [] });
  form4797Pdf.projectFields!(base.form4797, base);
  irs1040Pdf.projectFields!(base.f1040, base);
  const sync = (p: any, f: (row: any) => void) => {
    f(p.k1_partnership.k1_partnerships[0].box11_line10_ordinary[0]);
    f(p.form4797.k1_box11_line10_rows[0]);
  };
  const changes: Array<[string, (p: any) => void]> = [
    ["missing current source", (p) =>
      sync(p, (row) => {
        delete row.current_passive_source;
        row.eic_activity_review
          .no_current_or_prior_unallowed_loss_for_activity_verified = true;
      })],
    [
      "owner",
      (p) =>
        sync(
          p,
          (row) => row.current_passive_source.recipient_tin = "444556666",
        ),
    ],
    [
      "issued recipient",
      (p) => p.k1_partnership.k1_partnerships[0].recipient_tin = "444556666",
    ],
    [
      "issuer",
      (p) =>
        sync(p, (row) => row.current_passive_source.issuer_ein = "987654321"),
    ],
    [
      "statement locator",
      (p) =>
        p.k1_partnership.k1_partnerships[0].box11_line10_ordinary[0]
          .statement_reference = "Detached statement",
    ],
    ["changed code with same gain", (p) => sync(p, (row) => row.code = "L")],
    [
      "detached character",
      (p) =>
        sync(
          p,
          (row) =>
            row.character_workpaper_reference = "Detached ordinary character",
        ),
    ],
    [
      "current income",
      (p) =>
        sync(
          p,
          (row) =>
            row.current_passive_source.activities[0].current_income = 3001,
        ),
    ],
    [
      "unknown PTP",
      (p) =>
        sync(p, (row) =>
          row.current_passive_source.entity_status_record
            .publicly_traded_partnership = true),
    ],
    [
      "prior history",
      (p) =>
        sync(
          p,
          (row) =>
            row.current_passive_source.activities[0]
              .prior_unallowed_4797_part2 = 100,
        ),
    ],
    [
      "prior acquisition",
      (p) =>
        sync(
          p,
          (row) =>
            row.current_passive_source.activities[0].ownership_acquired_on =
              "2024-01-01",
        ),
    ],
    [
      "impossible date",
      (p) =>
        sync(
          p,
          (row) =>
            row.current_passive_source.activities[0].ownership_acquired_on =
              "2025-02-30",
        ),
    ],
    [
      "detached activity",
      (p) =>
        sync(
          p,
          (row) =>
            row.current_passive_source.activities[0].activity_id =
              "detached-ordinary",
        ),
    ],
    ["kind", (p) => {
      p.form8582.activities[0].reporting_form = "k1_partnership";
    }],
    ["missing8582", (p) => delete p.form8582],
    ["PAL income", (p) => p.agi_aggregator.pal_current_income = 4000],
    ["PAL loss", (p) => p.form8582.current_loss = 4000],
    ["Schedule1", (p) => p.schedule1.line5_schedule_e = 0],
    ["AGI", (p) => p.f1040.line11_agi = 8000],
    ["investment", (p) => p.eitc.investment_income_floor = 10000],
    [
      "QBI statement",
      (p) =>
        p.k1_partnership.k1_partnerships[0].qualified_business_income_source
          .qualified_box11_line10_income = 3001,
    ],
    ["filed QBI", (p) => p.form8995.line2 = 3000],
    [
      "duplicate issued gain",
      (p) =>
        p.k1_partnership.k1_partnerships[0].box11_line10_ordinary.push(
          structuredClone(
            p.k1_partnership.k1_partnerships[0].box11_line10_ordinary[0],
          ),
        ),
    ],
  ];
  for (const [label, change] of changes) {
    const p = structuredClone(base);
    change(p);
    await assertRejects(
      () => buildMefBundle(p, { filer, attachments: [] }),
      Error,
      undefined,
      label,
    );
    if (label !== "investment") {
      assertThrows(
        () => form4797.build(p.form4797, { pending: p }),
        Error,
        undefined,
        `${label} native`,
      );
    }
    if (label !== "investment") {
      assertThrows(
        () => form4797Pdf.projectFields!(p.form4797, p),
        Error,
        undefined,
        `${label} PDF`,
      );
    }
    assertThrows(
      () => irs1040Pdf.projectFields!(p.f1040, p),
      Error,
      undefined,
      `${label}1040PDF`,
    );
  }
  const noPal: any = buildPending(
    f1040_2025.executeReturn(
      passiveLine10Cases.find((c) => c.id === "ordinary_no_other_pal")!
        .inputs(),
    ).pending,
  );
  delete noPal.form8995;
  assertThrows(
    () => form4797.build(noPal.form4797!, { pending: noPal }),
    Error,
  );
  assertThrows(() => form4797Pdf.projectFields!(noPal.form4797!, noPal), Error);
  const negative = passiveLine10Inputs();
  negative.k1_partnership[0].box11_line10_ordinary[0].gain_loss = -3000;
  assertEquals(f1040_2025.executeReturn(negative).diagnostics.length > 0, true);
});
