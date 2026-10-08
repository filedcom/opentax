import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../registry.ts";
import { buildMefXml } from "../../mef/builder.ts";
import { schedule1 } from "../../mef/forms/income/schedule1/schedule1.ts";
import { FilingStatus } from "../../../mef/header.ts";
import { buildPending } from "../../mef/execution/pending.ts";
import { buildPdfBytes, fillFormPdf } from "../../pdf/builder.ts";
import { schedule1Pdf } from "../../pdf/forms/income/schedule1/schedule1.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { taxableAlimonyReceived } from "../../../nodes/inputs/alimony_received/index.ts";

const source = {
  amount: 4_800,
  agreement_reference: "reviewed-2017-agreement",
  recipient_ssn: "111-22-3333",
  divorce_agreement_date: "2017-06-15",
  post_2018_modification_excludes_alimony: false,
};

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;
const xsdPath = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

Deno.test("one retained pre-2019 agreement reaches Schedule 1, Form 1040, native XML, and the filled PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, alimony_received: [source] },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line2a_alimony_received, 4_800);
  assertEquals(result.pending.f1040.line8_additional_income, 4_800);
  assertEquals(result.pending.f1040.line9_total_income, 79_800);
  assertEquals(result.pending.f1040.line11_agi, 79_800);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(
    xml,
    "<AlimonyReceivedGrp><AlimonyReceivedAmt>4800</AlimonyReceivedAmt><DivorceOrSeparationAgreementDt>2017-06</DivorceOrSeparationAgreementDt></AlimonyReceivedGrp>",
  );
  assertStringIncludes(
    xml,
    "<TotalAlimonyReceivedAmt>4800</TotalAlimonyReceivedAmt>",
  );
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, xmlPath],
      stdout: "piped",
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
  const projected = schedule1Pdf.instances?.(
    pending.schedule1!,
    base.filer,
    result.pending,
  )?.[0];
  assertEquals(projected?.print_line2b_alimony_agreement_month, "06/2017");
  const bytes = await fillFormPdf(
    schedule1Pdf,
    projected!,
    base.filer,
    ".pdf-cache",
    result.pending,
  );
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, bytes!);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0);
    const text = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(text, "4800");
    assertStringIncludes(text, "06/2017");
  } finally {
    await Deno.remove(pdfPath);
  }
});

Deno.test("two taxable agreements print the highest-income date and retain the other on a PDF statement and native groups", async () => {
  const other = {
    ...source,
    amount: 2_400,
    agreement_reference: "reviewed-2015-agreement",
    divorce_agreement_date: "2015-03-10",
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, alimony_received: [other, source] },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line2a_alimony_received, 7_200);
  assertEquals(result.pending.f1040.line8_additional_income, 7_200);
  assertEquals(result.pending.f1040.line9_total_income, 82_200);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, base.filer);
  assertEquals((xml.match(/<AlimonyReceivedGrp>/g) ?? []).length, 2);
  assertStringIncludes(
    xml,
    "<AlimonyReceivedAmt>4800</AlimonyReceivedAmt><DivorceOrSeparationAgreementDt>2017-06</DivorceOrSeparationAgreementDt>",
  );
  assertStringIncludes(
    xml,
    "<AlimonyReceivedAmt>2400</AlimonyReceivedAmt><DivorceOrSeparationAgreementDt>2015-03</DivorceOrSeparationAgreementDt>",
  );
  assertStringIncludes(
    xml,
    "<TotalAlimonyReceivedAmt>7200</TotalAlimonyReceivedAmt>",
  );
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, xmlPath],
      stdout: "piped",
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
  const pdfBytes = await buildPdfBytes(result.pending, base.filer);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdfBytes);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0);
    const text = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(text, "06/2017");
    assertStringIncludes(text, "Other original agreements");
    assertStringIncludes(text, "reviewed-2015-agreement");
    assertStringIncludes(text, "03/2015");
    assertStringIncludes(text, "2400");
  } finally {
    await Deno.remove(pdfPath);
  }
});

Deno.test("alimony source rejects missing date and post-2018 modification ambiguity", () => {
  const run = (rows: Record<string, unknown>[]) =>
    execute(
      buildExecutionPlan(registry),
      registry,
      { ...base.inputs, alimony_received: rows },
      { taxYear: 2025, formType: "f1040" },
    );
  assertEquals(
    run([{ ...source, divorce_agreement_date: undefined }]).diagnostics
      .length > 0,
    true,
  );
  assertEquals(
    run([{
      ...source,
      post_2018_modification_excludes_alimony: undefined,
    }]).diagnostics.length > 0,
    true,
  );
  const excluded = run([{
    ...source,
    post_2018_modification_excludes_alimony: true,
  }]);
  assertEquals(excluded.pending.schedule1?.line2a_alimony_received, undefined);
  const later = run([{ ...source, divorce_agreement_date: "2020-06-15" }]);
  assertEquals(later.pending.schedule1?.line2a_alimony_received, undefined);
});

Deno.test("Schedule 1 native and PDF reject an alimony amount changed after source calculation", () => {
  const all = {
    alimony_received: { alimony_receiveds: [source] },
    schedule1: { line2a_alimony_received: 4_799 },
  };
  assertThrows(
    () => buildMefXml(all, base.filer),
    Error,
    "line 2a differs from taxable alimony sources",
  );
  assertThrows(
    () => schedule1Pdf.instances?.(all.schedule1, base.filer, all),
    Error,
    "line 2a differs from taxable alimony sources",
  );
});

Deno.test("Schedule 1 alimony rejects another recipient and conflicting agreement evidence", () => {
  const anotherRecipient = {
    ...source,
    recipient_ssn: "999-88-7777",
  };
  const pending = {
    alimony_received: { alimony_receiveds: [anotherRecipient] },
  };
  assertThrows(
    () =>
      schedule1.build({ line2a_alimony_received: 4_800 }, {
        filer: base.filer,
        pending,
      }),
    Error,
    "recipient differs from filer",
  );
  assertThrows(
    () =>
      schedule1Pdf.instances?.(
        { line2a_alimony_received: 4_800 },
        base.filer,
        pending,
      ),
    Error,
    "recipient differs from filer",
  );
  const inconsistent = {
    alimony_received: {
      alimony_receiveds: [source, {
        ...source,
        amount: 100,
        divorce_agreement_date: "2016-06-15",
      }],
    },
  };
  assertThrows(
    () =>
      schedule1.build({ line2a_alimony_received: 4_900 }, {
        filer: base.filer,
        pending: inconsistent,
      }),
    Error,
    "conflicting original date",
  );
});

Deno.test("joint Schedule 1 alimony accepts an identified spouse recipient", () => {
  const jointFiler = {
    ...base.filer,
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "999887777",
      firstName: "Sam",
      lastName: "Example",
      nameControl: "EXAM",
    },
  };
  const pending = {
    alimony_received: {
      alimony_receiveds: [{ ...source, recipient_ssn: "999-88-7777" }],
    },
  };
  const xml = schedule1.build({ line2a_alimony_received: 4_800 }, {
    filer: jointFiler,
    pending,
  });
  assertStringIncludes(xml, "<AlimonyReceivedAmt>4800</AlimonyReceivedAmt>");
  const printed = schedule1Pdf.instances?.(
    { line2a_alimony_received: 4_800 },
    jointFiler,
    pending,
  )?.[0];
  assertEquals(printed?.print_line2b_alimony_agreement_month, "06/2017");
});

Deno.test("alimony groups repeated payments once and rejects ambiguous or overflowing agreement sets", () => {
  const sameAgreement = taxableAlimonyReceived({
    alimony_receiveds: [source, { ...source, amount: 1_200 }],
  });
  assertEquals(sameAgreement?.agreements.length, 1);
  assertEquals(sameAgreement?.amount, 6_000);
  assertThrows(
    () =>
      taxableAlimonyReceived({
        alimony_receiveds: [source, {
          ...source,
          agreement_reference: "second-agreement",
        }],
      }),
    Error,
    "unique highest-income",
  );
  assertThrows(
    () =>
      taxableAlimonyReceived({
        alimony_receiveds: Array.from({ length: 11 }, (_, index) => ({
          ...source,
          agreement_reference: `agreement-${index}`,
          amount: index + 1,
        })),
      }),
    Error,
    "at most ten",
  );
});
