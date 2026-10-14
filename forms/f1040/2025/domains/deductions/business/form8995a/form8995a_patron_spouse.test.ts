import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import {
  patronSpouseW2,
  spouseOwnedPatronFixture,
} from "../../../../pdf/reviews/general/composed-returns/review-8995a-patron-joint.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
Deno.test("spouse-owned patron farm and C health return retains owner SE and source joins", async () => {
  const archive = await Deno.makeTempDir({
    prefix: "opentax-spouse-patron-source-",
  });
  console.info(`Spouse patron source archive: ${archive}`);
  for (const kind of ["farm", "c-health", "income-cap"]) {
    const base = pdfReviewFixtures.find((f) =>
      f.id === `joint-form8995a-patron-${kind}`
    )!;
    const fixture = spouseOwnedPatronFixture(base);
    const result = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending) as any;
    const original = buildPending(
      f1040_2025.executeReturn(base.inputs).pending,
    ) as any;
    assertEquals(
      pending.f1040.line24_total_tax,
      original.f1040.line24_total_tax,
    );
    const options = {
      filer: fixture.filer,
      year: 2025 as const,
      returnType: "1040",
      schemaVersion: "2025v5.4",
      attachments: [],
    };
    const bundle = await buildMefBundle(pending, options);
    assertStringIncludes(bundle.xml, "<SSN>444556666</SSN>");
    const origins: any[] = [];
    const pdf = await buildPdfBytes(
      bundle.pending,
      fixture.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const schema = new URL(
      "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const child = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(bundle.xml));
    await writer.close();
    const validation = await child.output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
    assertEquals(pending.schedule_se.owner_instances[0].recipient, "S");
    assertEquals(pending.schedule_se.owner_instances[0].w2_ss_wages, 0);
    if (kind === "c-health") {
      assertEquals(pending.form7206.recipient_ssn, "444556666");
    }
    await Deno.mkdir(archive, {
      recursive: true,
    });
    await Deno.writeTextFile(
      `${archive}/${kind}.json`,
      JSON.stringify(
        {
          inputs: fixture.inputs,
          pending,
          preparedPending: bundle.pending,
          carryforwards: result.carryforwards,
          origins,
          filer: fixture.filer,
        },
        null,
        2,
      ),
    );
    await Deno.writeTextFile(
      `${archive}/${kind}.xml`,
      bundle.xml,
    );
    await Deno.writeFile(
      `${archive}/${kind}.pdf`,
      pdf,
    );
  }
});

Deno.test("spouse patron owner and nonowner wage conflicts reject native and direct PDF", async () => {
  for (const kind of ["farm", "c-health"]) {
    const fixture = spouseOwnedPatronFixture(
      pdfReviewFixtures.find((f) => f.id === `joint-form8995a-patron-${kind}`)!,
    );
    const result = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(result.diagnostics, []);
    const base = buildPending(result.pending) as any;
    const paths: (string | number)[][] = [
      ["qbi_patron", "primary_w2_sources", 0, "employee_ssn"],
      ["w2", "w2s", 0, "employee_ssn"],
      [
        "form8995a",
        "patron_business_source",
        "review",
        "source_1099patr",
        "recipient_tin",
      ],
      [
        "form8995a",
        "patron_business_source",
        "business_source",
        "proprietor_recipient",
      ],
      ["general", "spouse_ssn"],
      ["schedule1", "line15_se_deduction"],
      ["f1040", "line13_qbi_deduction"],
      ["f1040", "line24_total_tax"],
      ...(kind === "c-health"
        ? [["form7206", "single_schedule_c_plan", "recipient"], [
          "form7206",
          "single_schedule_c_plan",
          "spouse_identity",
          "ssn",
        ]]
        : []),
    ];
    for (const path of paths) {
      const pending = structuredClone(base);
      let row: any = pending;
      for (const key of path.slice(0, -1)) row = row[key];
      const key = path.at(-1)!;
      row[key] = typeof row[key] === "number"
        ? row[key] + 1
        : key === "proprietor_recipient" || key === "recipient"
        ? "T"
        : key === "employee_ssn"
        ? "444556666"
        : "111223333";
      await assertRejects(
        () =>
          buildMefBundle(pending, { filer: fixture.filer, attachments: [] }),
        Error,
        undefined,
        path.join("."),
      );
      await assertRejects(
        () => buildPdfBytes(pending, fixture.filer, ".pdf-cache"),
        Error,
        undefined,
        path.join("."),
      );
    }
    const conflicting = structuredClone(fixture.inputs) as any;
    conflicting.qbi_patron.spouse_w2_sources = structuredClone(
      conflicting.qbi_patron.primary_w2_sources,
    );
    const bad = f1040_2025.executeReturn(conflicting);
    const collectionError = bad.diagnostics.some((diagnostic) =>
      diagnostic.severity === "error" &&
      diagnostic.nodeType === "qbi_patron" &&
      diagnostic.message.includes("both proprietor-side wage copy collections")
    );
    assert(
      collectionError,
      "Both wage copy collections must reject at the patron public node",
    );

  }
});

Deno.test("spouse patron primary wages cross both joint phase-in boundaries", async () => {
  const fixture = spouseOwnedPatronFixture(
    pdfReviewFixtures.find((f) => f.id === "joint-form8995a-patron-farm")!,
  );
  for (const target of [394600, 394601, 494599, 494600, 494601]) {
    const inputs = structuredClone(fixture.inputs) as any;
    const wages = patronSpouseW2(inputs.w2[0], target - 194367 + .49);
    wages.employee_ssn = "111223333";
    inputs.w2 = [wages];
    inputs.qbi_patron.primary_w2_sources = structuredClone(inputs.w2);
    const r = f1040_2025.executeReturn(inputs);
    assertEquals(r.diagnostics, []);
    const pending = buildPending(r.pending) as any;
    assertEquals(pending.form8995a.taxable_income, target);
    assertEquals(pending.schedule_se.owner_instances[0].recipient, "S");
    assertEquals(pending.schedule_se.owner_instances[0].w2_ss_wages, 0);
    const bundle = await buildMefBundle(pending, {
      filer: fixture.filer,
      attachments: [],
    });
    const origins: any[] = [];
    const pdf = await buildPdfBytes(
      bundle.pending,
      fixture.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const folder = await Deno.makeTempDir({
      prefix: "opentax-spouse-patron-boundary-",
    });
    console.info(`Spouse patron boundary ${target} archive: ${folder}`);
    await Deno.mkdir(folder, { recursive: true });
    await Deno.writeTextFile(
      `${folder}/${target}.json`,
      JSON.stringify(
        {
          inputs,
          pending,
          preparedPending: bundle.pending,
          carryforwards: r.carryforwards,
          origins,
          filer: fixture.filer,
        },
        null,
        2,
      ),
    );
    await Deno.writeTextFile(`${folder}/${target}.xml`, bundle.xml);
    await Deno.writeFile(`${folder}/${target}.pdf`, pdf);
    const child = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        new URL(
          "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
          import.meta.url,
        ).pathname,
        `${folder}/${target}.xml`,
      ],
      stdout: "piped",
      stderr: "piped",
    });
    const v = await child.output();
    assertEquals(v.code, 0, new TextDecoder().decode(v.stderr));
  }
});

Deno.test("spouse patron nonowner wage copies require actual joint status at public or native and direct PDF gates", async () => {
  const fixture = spouseOwnedPatronFixture(
    pdfReviewFixtures.find((f) => f.id === "joint-form8995a-patron-farm")!,
  );
  for (const status of ["single", "mfs"]) {
    const inputs = structuredClone(fixture.inputs) as any;
    inputs.general.filing_status = status;
    const result = f1040_2025.executeReturn(inputs);
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    if (errors.length) {
      assert(
        errors.some((d) =>
          d.nodeType === "form8995" &&
          d.message.includes("Patron public source")
        ),
        status + ": require the actual patron status guard",
      );
    } else {
      const pending = buildPending(result.pending);
      const filer = {
        ...fixture.filer,
        filingStatus: status === "single" ? 1 : 3,
        spouse: undefined,
      };
      await assertRejects(
        () => buildMefBundle(pending, { filer, attachments: [] }),
        Error,
      );
      await assertRejects(
        () => buildPdfBytes(pending, filer, ".pdf-cache"),
        Error,
      );
    }
  }
});
