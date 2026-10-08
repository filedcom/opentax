import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { assertForm8621QefRefigureSource } from "./form8621_1294_refigure.ts";
import { executeForm8839TwoPass } from "../../../credits/individual/form8839/form8839_two_pass.ts";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { PficRegime } from "../../../../../nodes/inputs/income/foreign/f8621/index.ts";
import { createHash } from "node:crypto";
import { buildPending } from "../../../../mef/execution/pending.ts";
const base = pdfReviewFixtures.find((x) =>
  x.id === "single-reviewed-adoption-credit"
)!;
const cp = (id: string, s: string) => ({
  document_id: id,
  sha256: createHash("sha256").update(s).digest("hex"),
  bytes_base64: btoa(s),
});
const holding = {
  company_name: "QEF Adoption Fund",
  company_ein_or_ref: "QEFADOPT1",
  country_of_incorporation: "Ireland",
  regime: PficRegime.QEF,
  shares_owned: 100,
  fmv_at_year_end: 20000,
  qef_ordinary_income: 2000,
  qef_capital_gain: 0,
  parent_source: {
    corporation_address: {
      line1: "1 Fund Quay",
      city: "Dublin",
      country_code: "EI",
    },
    corporation_tax_year_start: "2025-01-01",
    corporation_tax_year_end: "2025-12-31",
    share_classes: [{
      description: "Ordinary",
      year_end_shares: 100,
      year_end_value_usd: 20000,
    }],
    jointly_owned_with_spouse: false,
    shares_acquired_during_2025: true,
    acquisition_date: "2025-01-01",
    election_status: "qef_new_2025",
    no_outstanding_section1294_election: true,
    issuer_record: cp("issuer", "Issuer 2025 report"),
    qef_annual_statement: {
      ...cp("qef", "QEF annual 2000 ordinary"),
      ordinary_earnings_usd: 2000,
      net_capital_gain_usd: 0,
    },
    qef_1294_activity_record: {
      ...cp("activity", "No distributions or transfers"),
      distributions_cash_and_property_usd: 0,
      transferred_share_earnings_usd: 0,
    },
  },
  qef_1294_election: {
    distributions_cash_and_property_usd: 0,
    transferred_share_earnings_usd: 0,
    undistributed_ordinary_earnings_usd: 2000,
    undistributed_capital_gain_usd: 0,
    no_section951_inclusion: true,
  },
};
async function retainAndValidatePacket(
  kind: "full" | "shadow-carryforward" | "zero" | "multi" | "triple",
  input: Record<string, unknown>,
  pending: Record<string, unknown>,
  xml: string,
  pdf: Uint8Array,
  origins: readonly PdfPageOrigin[],
): Promise<void> {
  const root = Deno.env.get("FORM8621_ADOPTION_EVIDENCE_DIR") ??
    ".state/research/form8621-qef-adoption";
  const dir = kind === "full" ? root : `${root}/${kind}`;
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(
    `${dir}/source-pending.json`,
    JSON.stringify({ input, pending }, null, 2),
  );
  await Deno.writeFile(`${dir}/return.pdf`, pdf);
  await Deno.writeTextFile(`${dir}/return.xml`, xml);
  await Deno.writeTextFile(
    `${dir}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const xsd = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      `${dir}/return.xml`,
    ],
    stderr: "piped",
  }).output();
  assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
}

Deno.test("Form 8621 Election B composes the reviewed Form 8839 staged return in both tax runs", async () => {
  const input = { ...base.inputs, f8621: [holding] };
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertForm8621QefRefigureSource(pending);
  const filed = pending.f1040! as Record<string, number>;
  const without = f1040_2025.executeReturn({
    ...input,
    f8621: [{
      ...holding,
      qef_ordinary_income: 0,
      qef_capital_gain: 0,
      qef_1294_election: undefined,
    }],
  });
  assertEquals(without.diagnostics, []);
  const without1040 = buildPending(without.pending).f1040! as Record<
    string,
    number
  >;
  assertEquals(filed.line24_total_tax, without1040.line24_total_tax);
  assertEquals(filed.form8621_1294_total_tax_before_deferral, 7895);
  assertEquals(filed.form8621_1294_deferred_tax, 440);
  assertEquals(filed.line24_total_tax, 7455);
  assertEquals(pending.schedule3?.line6c_adoption_credit, 6000);
  assertEquals(filed.line30_refundable_adoption, 5000);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: base.attachments!,
  });
  assertStringIncludes(bundle.xml, "<IRS8621");
  assertStringIncludes(bundle.xml, "<IRS8839");
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  assertEquals(origins.map(({ formKey }) => formKey), [
    "f1040",
    "f1040",
    "schedule1",
    "schedule1",
    "schedule1",
    "schedule3",
    "form8621",
    "form8621",
    "form8839",
  ]);
  await retainAndValidatePacket(
    "full",
    input,
    pending,
    bundle.xml,
    pdf,
    origins,
  );
  const tampered = structuredClone(pending) as Record<string, unknown>;
  const marker = tampered.form8621_1294_refigure as {
    source_inputs: { w2: { box1_wages: number }[] };
  };
  marker.source_inputs.w2[0].box1_wages += 1;
  assertThrows(
    () => assertForm8621QefRefigureSource(tampered),
    Error,
    "differs from full source",
  );
  await assertRejects(
    () =>
      buildMefBundle(tampered, {
        filer: base.filer,
        attachments: base.attachments!,
      }),
    Error,
    "Form 8621 section 1294",
  );
  await assertRejects(
    () => buildPdfBytes(tampered, base.filer),
    Error,
    "Form 8621 section 1294",
  );
});

Deno.test("Form 8621 Election B keeps an actual fully used adoption credit when only its shadow has a carryforward", async () => {
  const originalW2 = (base.inputs.w2 as Record<string, unknown>[])[0];
  const wage = {
    ...originalW2,
    box1_wages: 64_500,
    box2_fed_withheld: 8_000,
    box3_ss_wages: 64_500,
    box4_ss_withheld: 3_999,
    box5_medicare_wages: 64_500,
    box6_medicare_withheld: 935.25,
  };
  const inputs = { ...base.inputs, w2: [wage], f8621: [holding] };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filed = pending.f1040! as Record<string, number>;
  const withoutInputs = {
    ...inputs,
    f8621: [{
      ...holding,
      qef_ordinary_income: 0,
      qef_capital_gain: 0,
      qef_1294_election: undefined,
    }],
  };
  assertThrows(
    () => f1040_2025.executeReturn(withoutInputs),
    Error,
    "carryforward filing is not supported",
  );
  const without = executeForm8839TwoPass(withoutInputs, true);
  const shadow = buildPending(without.pending);
  assertEquals(shadow.schedule3?.line6c_adoption_credit, 5_645);
  assertEquals(shadow.f1040?.line24_total_tax, 0);
  assertEquals(pending.schedule3?.line6c_adoption_credit, 6_000);
  assertEquals(filed.form8621_1294_total_tax_before_deferral, 85);
  assertEquals(filed.form8621_1294_deferred_tax, 85);
  assertEquals(filed.line24_total_tax, 0);
  assertForm8621QefRefigureSource(pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: base.attachments!,
  });
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals(origins.length, 9);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 9);
  await retainAndValidatePacket(
    "shadow-carryforward",
    inputs,
    pending,
    bundle.xml,
    pdf,
    origins,
  );
});

Deno.test("Form 8621 Election B records zero deferred tax when the full-return tax is unchanged", async () => {
  const smallHolding = {
    ...holding,
    qef_ordinary_income: 1,
    parent_source: {
      ...holding.parent_source,
      qef_annual_statement: {
        ...cp("qef-small", "QEF annual 1 ordinary"),
        ordinary_earnings_usd: 1,
        net_capital_gain_usd: 0,
      },
    },
    qef_1294_election: {
      ...holding.qef_1294_election,
      undistributed_ordinary_earnings_usd: 1,
    },
  };
  const inputs = { ...base.inputs, f8621: [smallHolding] };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filed = pending.f1040! as Record<string, number>;
  assertEquals(filed.form8621_1294_total_tax_before_deferral, 7_455);
  assertEquals(filed.form8621_1294_counterfactual_total_tax, 7_455);
  assertEquals(filed.form8621_1294_deferred_tax, 0);
  assertEquals(filed.line24_total_tax, 7_455);
  assertForm8621QefRefigureSource(pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: base.attachments!,
  });
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals(origins.length, 9);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 9);
  await retainAndValidatePacket(
    "zero",
    inputs,
    pending,
    bundle.xml,
    pdf,
    origins,
  );
});

const secondHolding = {
  ...holding,
  company_name: "QEF Second Adoption Fund",
  company_ein_or_ref: "QEFADOPT2",
  parent_source: {
    ...holding.parent_source,
    issuer_record: cp("issuer-second", "Issuer 2025 second QEF report"),
    qef_annual_statement: {
      ...cp("qef-second", "Second QEF annual 2000 ordinary"),
      ordinary_earnings_usd: 2_000,
      net_capital_gain_usd: 0,
    },
    qef_1294_activity_record: {
      ...cp(
        "activity-second",
        "Second broker ledger with no distributions or transfers",
      ),
      distributions_cash_and_property_usd: 0,
      transferred_share_earnings_usd: 0,
    },
  },
};

Deno.test("two independent Election B holdings reconcile per-fund tax to the full adoption return", async () => {
  const inputs = { ...base.inputs, f8621: [holding, secondHolding] };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertForm8621QefRefigureSource(pending);
  const filed = pending.f1040! as Record<string, number>;
  assertEquals(filed.form8621_1294_total_tax_before_deferral, 8_335);
  assertEquals(filed.form8621_1294_counterfactual_total_tax, 7_455);
  assertEquals(filed.form8621_1294_deferred_tax, 880);
  assertEquals(filed.line24_total_tax, 7_455);
  const allocations =
    ((pending as unknown as Record<string, unknown>).form8621_1294_refigure as {
      allocations: Record<
        string,
        { line9a: number; line9b: number; line9c: number }
      >;
    }).allocations;
  assertEquals(allocations.QEFADOPT1, {
    line9a: 8_335,
    line9b: 7_895,
    line9c: 440,
  });
  assertEquals(allocations.QEFADOPT2, {
    line9a: 8_335,
    line9b: 7_895,
    line9c: 440,
  });
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: base.attachments!,
  });
  assertEquals((bundle.xml.match(/<IRS8621/g) ?? []).length, 2);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 11);
  assertEquals(
    origins.filter((x) => x.formKey === "form8621").map((x) => x.formCopy),
    [1, 1, 2, 2],
  );
  await retainAndValidatePacket(
    "multi",
    inputs,
    pending,
    bundle.xml,
    pdf,
    origins,
  );
  const changed = structuredClone(pending) as Record<string, unknown>;
  (changed.form8621_1294_refigure as {
    allocations: Record<string, { line9c: number }>;
  }).allocations.QEFADOPT2.line9c++;
  await assertRejects(
    () =>
      buildMefBundle(changed, {
        filer: base.filer,
        attachments: base.attachments!,
      }),
    Error,
    "Form 8621 section 1294",
  );
  await assertRejects(
    () => buildPdfBytes(changed, base.filer),
    Error,
    "Form 8621 section 1294",
  );
});

Deno.test("nonadditive simultaneous Election B differences stay guarded", () => {
  const originalW2 = (base.inputs.w2 as Record<string, unknown>[])[0];
  const wage = {
    ...originalW2,
    box1_wages: 64_500,
    box2_fed_withheld: 8_000,
    box3_ss_wages: 64_500,
    box4_ss_withheld: 3_999,
    box5_medicare_wages: 64_500,
    box6_medicare_withheld: 935.25,
  };
  const source = { ...base.inputs, w2: [wage] };
  const undistributedRemoved = (item: typeof holding) => ({
    ...item,
    qef_ordinary_income: 0,
    qef_1294_election: undefined,
  });
  const withoutElection = (item: typeof holding) => ({
    ...item,
    qef_1294_election: undefined,
  });
  const full = buildPending(
    executeForm8839TwoPass({
      ...source,
      f8621: [holding, secondHolding],
    }).pending,
  ).f1040!;
  const withoutFirst = buildPending(
    executeForm8839TwoPass({
      ...source,
      f8621: [undistributedRemoved(holding), withoutElection(secondHolding)],
    }).pending,
  ).f1040!;
  const withoutSecond = buildPending(
    executeForm8839TwoPass({
      ...source,
      f8621: [withoutElection(holding), undistributedRemoved(secondHolding)],
    }).pending,
  ).f1040!;
  const withoutBoth = buildPending(
    executeForm8839TwoPass({
      ...source,
      f8621: [
        undistributedRemoved(holding),
        undistributedRemoved(secondHolding),
      ],
    }, true).pending,
  ).f1040!;
  assertEquals(full.line22_tax_after_credits, 525);
  assertEquals(withoutFirst.line24_total_tax, 85);
  assertEquals(withoutSecond.line24_total_tax, 85);
  assertEquals(withoutBoth.line24_total_tax, 0);
  assertThrows(
    () =>
      f1040_2025.executeReturn({
        ...base.inputs,
        w2: [wage],
        f8621: [holding, secondHolding],
      }),
    Error,
    "nonadditive",
  );
});

const thirdHolding = {
  ...holding,
  company_name: "QEF Third Adoption Fund",
  company_ein_or_ref: "QEFADOPT3",
  parent_source: {
    ...holding.parent_source,
    issuer_record: cp("issuer-third", "Issuer 2025 third QEF report"),
    qef_annual_statement: {
      ...cp("qef-third", "Third QEF annual 2000 ordinary"),
      ordinary_earnings_usd: 2_000,
      net_capital_gain_usd: 0,
    },
    qef_1294_activity_record: {
      ...cp(
        "activity-third",
        "Third broker ledger with no distributions or transfers",
      ),
      distributions_cash_and_property_usd: 0,
      transferred_share_earnings_usd: 0,
    },
  },
};

Deno.test("three independent Election B holdings retain separate sourced copies", async () => {
  const inputs = {
    ...base.inputs,
    f8621: [holding, secondHolding, thirdHolding],
  };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertForm8621QefRefigureSource(pending);
  const filed = pending.f1040! as Record<string, number>;
  assertEquals(filed.form8621_1294_total_tax_before_deferral, 8_775);
  assertEquals(filed.form8621_1294_counterfactual_total_tax, 7_455);
  assertEquals(filed.form8621_1294_deferred_tax, 1_320);
  const allocations =
    ((pending as unknown as Record<string, unknown>).form8621_1294_refigure as {
      allocations: Record<
        string,
        { line9a: number; line9b: number; line9c: number }
      >;
    }).allocations;
  for (const id of ["QEFADOPT1", "QEFADOPT2", "QEFADOPT3"]) {
    assertEquals(allocations[id], {
      line9a: 8_775,
      line9b: 8_335,
      line9c: 440,
    });
  }
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: base.attachments!,
  });
  assertEquals((bundle.xml.match(/<IRS8621/g) ?? []).length, 3);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 13);
  assertEquals(
    origins.filter((x) => x.formKey === "form8621").map((x) => x.formCopy),
    [1, 1, 2, 2, 3, 3],
  );
  await retainAndValidatePacket(
    "triple",
    inputs,
    pending,
    bundle.xml,
    pdf,
    origins,
  );
});
