import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { buildMefXml } from "../../mef/builder.ts";
import { buildPending } from "../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { registry } from "../../registry.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-direct-pension-rollover"
)!;

Deno.test("positive 1099-R payer identity rejects blank name and malformed EIN in both exports", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    {
      taxYear: 2025,
      formType: "f1040",
    },
  );
  assertEquals(result.diagnostics, []);
  for (
    const change of [
      { payer_name: "   " },
      { payer_ein: "unknown" },
    ]
  ) {
    const pending = buildPending(result.pending);
    Object.assign(
      (pending.f1099r as unknown as { f1099rs: Record<string, unknown>[] })
        .f1099rs[0],
      change,
    );
    assertThrows(
      () => buildMefXml(pending, fixture.filer),
      Error,
      "1099-R 1 needs a payer name and nine-digit EIN",
    );
    await assertRejects(
      () => buildPdfBytes(pending, fixture.filer),
      Error,
      "1099-R 1 needs a payer name and nine-digit EIN",
    );
  }
});

Deno.test("altered 1099-R source reaches nonstandard TY2025 native and PDF return", async () => {
  const [original] = fixture.inputs.f1099r as Record<string, unknown>[];
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
    f1099r: [{
      ...original,
      altered_or_handwritten: true,
      source_document_reference: "2025 altered pension copy",
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, fixture.filer);
  assertStringIncludes(
    xml,
    "<StandardOrNonStandardCd>N</StandardOrNonStandardCd>",
  );
  assertStringIncludes(
    xml,
    "<PensionsAnnuitiesAmt>20000</PensionsAnnuitiesAmt>",
  );
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(pending, fixture.filer);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
    }).output();
    assertEquals(extracted.code, 0);
    assertEquals(
      /20,?000/.test(new TextDecoder().decode(extracted.stdout)),
      true,
    );
  } finally {
    await Deno.remove(pdfPath);
  }
  const changed = structuredClone(pending);
  const source = (changed.f1099r as unknown as {
    f1099rs: Record<string, unknown>[];
  }).f1099rs[0]!;
  source.source_document_reference = undefined;
  assertThrows(
    () => buildMefXml(changed, fixture.filer),
    Error,
    "1099-R owner review needs valid payer source rows",
  );
  await assertRejects(
    () => buildPdfBytes(changed, fixture.filer),
    Error,
    "Nonstandard 1099-R needs a retained payer-copy reference",
  );
});

Deno.test("reviewed typed 1099-R reaches Form 1040, TY2025 XML, and filled PDF", async () => {
  const [original] = fixture.inputs.f1099r as Record<string, unknown>[];
  const reference = "2025 typed pension copy";
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
    f1099r: [{
      ...original,
      source_document_reference: reference,
      nonstandard_document_review: {
        kind: "typed",
        source_document_reference: reference,
        reviewer_confirmed_nonstandard: true,
      },
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, fixture.filer);
  assertStringIncludes(
    xml,
    "<StandardOrNonStandardCd>N</StandardOrNonStandardCd>",
  );
  assertStringIncludes(
    xml,
    "<PensionsAnnuitiesAmt>20000</PensionsAnnuitiesAmt>",
  );
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(pending, fixture.filer);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
    }).output();
    assertEquals(extracted.code, 0);
    assertEquals(
      /20,?000/.test(new TextDecoder().decode(extracted.stdout)),
      true,
    );
  } finally {
    await Deno.remove(pdfPath);
  }
});
