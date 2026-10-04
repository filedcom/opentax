import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { registry } from "./registry.ts";
import { assertLine1aWageSource } from "./w2-withholding-reconciliation.ts";
import { FormType } from "../nodes/inputs/f4852/index.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;

Deno.test("two W-2 box 1 copies replay to Form 1040 line 1a, AGI, native XML, and PDF", async () => {
  const [first] = base.inputs.w2 as Record<string, unknown>[];
  const firstIssued = { ...first, source_document_reference: "issued-copy-A" };
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    w2: [firstIssued, {
      ...first,
      employer_name: "Second Employer",
      employer_ein: "98-7654321",
      source_document_reference: "issued-copy-B",
      box1_wages: 5_000,
      box2_fed_withheld: 500,
      box3_ss_wages: 5_000,
      box4_ss_withheld: 310,
      box5_medicare_wages: 5_000,
      box6_medicare_withheld: 72.5,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1a_wages, 80_000);
  assertEquals(result.pending.agi_aggregator?.line1a_wages, 80_000);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(xml, "<WagesAmt>80000</WagesAmt>");
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
  const pdf = await buildPdfBytes(pending, base.filer);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
    }).output();
    assertEquals(extracted.code, 0);
    assertEquals(
      /80,?000/.test(new TextDecoder().decode(extracted.stdout)),
      true,
    );
  } finally {
    await Deno.remove(pdfPath);
  }

  const changedBox1 = structuredClone(pending);
  (changedBox1.w2 as unknown as { w2s: { box1_wages: number }[] })
    .w2s[1]!.box1_wages = 5_001;
  assertThrows(
    () => buildMefXml(changedBox1, base.filer),
    Error,
    "line 1a and AGI wages differ from retained W-2",
  );
  await assertRejects(
    () => buildPdfBytes(changedBox1, base.filer),
    Error,
    "line 1a and AGI wages differ from retained W-2",
  );
  const changedAgi = structuredClone(pending);
  (changedAgi.agi_aggregator as { line1a_wages: number }).line1a_wages = 79_999;
  assertThrows(
    () => buildMefXml(changedAgi, base.filer),
    Error,
    "line 1a and AGI wages differ from retained W-2",
  );
  await assertRejects(
    () => buildPdfBytes(changedAgi, base.filer),
    Error,
    "line 1a and AGI wages differ from retained W-2",
  );

  const repeatedIssuedCopy = structuredClone(pending);
  const copies = (repeatedIssuedCopy.w2 as unknown as {
    w2s: Record<string, unknown>[];
  }).w2s;
  copies[1]!.employer_ein = copies[0]!.employer_ein;
  copies[1]!.source_document_reference = copies[0]!.source_document_reference;
  assertThrows(
    () => buildMefXml(repeatedIssuedCopy, base.filer),
    Error,
    "W-2 repeats the same issued-copy source reference",
  );
  await assertRejects(
    () => buildPdfBytes(repeatedIssuedCopy, base.filer),
    Error,
    "W-2 repeats the same issued-copy source reference",
  );
});

Deno.test("the graph rejects a repeated identified W-2 issued copy before totaling wages", () => {
  const [first] = base.inputs.w2 as Record<string, unknown>[];
  const issued = { ...first, source_document_reference: "issued-copy-A" };
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    w2: [issued, { ...issued }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "w2" &&
      entry.message.includes("same issued-copy source reference")
    ),
    true,
  );
});

Deno.test("same employer and employee need distinct issued W-2 references", async () => {
  const [first] = base.inputs.w2 as Record<string, unknown>[];
  const duplicate = { ...first, source_document_reference: undefined };
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    w2: [duplicate, { ...duplicate }],
  }, { taxYear: 2025, formType: "f1040" });
  const message =
    "W-2 multiple employer/employee copies need distinct issued references";
  assertEquals(
    result.diagnostics.some((entry) => entry.message.includes(message)),
    true,
  );

  const once = execute(buildExecutionPlan(registry), registry, base.inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(once.diagnostics, []);
  const pending = buildPending(once.pending);
  (pending.w2 as unknown as { w2s: Record<string, unknown>[] }).w2s.push(
    { ...duplicate },
  );
  assertThrows(() => buildMefXml(pending, base.filer), Error, message);
  await assertRejects(() => buildPdfBytes(pending, base.filer), Error, message);

  const distinct = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    w2: [
      { ...first, source_document_reference: "issued-copy-A" },
      { ...first, source_document_reference: "issued-copy-B" },
    ],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(distinct.diagnostics, []);
  const distinctPending = buildPending(distinct.pending);
  assertStringIncludes(
    buildMefXml(distinctPending, base.filer),
    "<WagesAmt>150000</WagesAmt>",
  );
  assertEquals(
    (await buildPdfBytes(distinctPending, base.filer)).length > 0,
    true,
  );
});

Deno.test("one W-2 issued reference cannot replay under a changed employer", async () => {
  const [first] = base.inputs.w2 as Record<string, unknown>[];
  const firstIssued = { ...first, source_document_reference: "issued-copy-A" };
  const secondIssued = {
    ...first,
    employer_name: "Second Employer",
    employer_ein: "98-7654321",
    source_document_reference: "issued-copy-B",
    box1_wages: 5_000,
    box2_fed_withheld: 500,
    box3_ss_wages: 5_000,
    box4_ss_withheld: 310,
    box5_medicare_wages: 5_000,
    box6_medicare_withheld: 72.5,
  };
  const inputs = { ...base.inputs, w2: [firstIssued, secondIssued] };
  const result = execute(buildExecutionPlan(registry), registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const replay = structuredClone(pending);
  (replay.w2 as unknown as {
    w2s: { source_document_reference: string }[];
  })
    .w2s[1]!.source_document_reference = "issued-copy-A";
  const message = "W-2 repeats the same issued-copy source reference";
  assertThrows(() => buildMefXml(replay, base.filer), Error, message);
  await assertRejects(() => buildPdfBytes(replay, base.filer), Error, message);

  const graphReplay = execute(buildExecutionPlan(registry), registry, {
    ...inputs,
    w2: [firstIssued, {
      ...secondIssued,
      source_document_reference: "issued-copy-A",
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    graphReplay.diagnostics.some((entry) =>
      entry.nodeType === "w2" && entry.message.includes(message)
    ),
    true,
  );
});

Deno.test("Form 4852 W-2 replacement wages retain their line 1a total", () => {
  assertLine1aWageSource({
    f4852: {
      f4852s: [{
        form_type: FormType.W2,
        payer_name: "Replacement Employer",
        wages: 1_200,
      }],
    },
    f1040: { line1a_wages: 1_200 },
    agi_aggregator: { line1a_wages: 1_200 },
  });
  assertThrows(
    () =>
      assertLine1aWageSource({
        f4852: {
          f4852s: [{
            form_type: FormType.W2,
            payer_name: "Replacement Employer",
            wages: 1_201,
          }],
        },
        f1040: { line1a_wages: 1_200 },
      }),
    Error,
    "line 1a and AGI wages differ from retained W-2",
  );
});
