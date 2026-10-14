import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { inputSchema as f1099rInputSchema } from "../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { irs1040Pdf } from "../../../pdf/forms/general/return-assembly/f1040.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";

const original = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-ira-rollover"
)!;
const payer = f1099rInputSchema.parse({ f1099rs: original.inputs.f1099r })
  .f1099rs[0]!;
const disasterPostponement = {
  irs_notice: "MO-2025-02" as const,
  fema_declaration: "4867-DR" as const,
  covered_county: "Butler" as const,
  resident_ssn: payer.recipient_ssn!,
  resident_on: "2025-03-14" as const,
  residence_record_reference: "issued-2025-butler-residence-record",
  irs_notice_review_reference: "reviewed-irs-mo-2025-02",
  deposit_confirmation_reference: "issued-ira-deposit-confirmation",
};
const latePayer = {
  ...payer,
  ira_rollover: {
    ...payer.ira_rollover!,
    distributed_on: "2025-04-01",
    completed_on: "2025-08-15",
    disaster_postponement: disasterPostponement,
  },
};

Deno.test("MO-2025-02 IRA disaster postponement reaches Form 1040, MeF, and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...original.inputs, f1099r: [latePayer] },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line4a_ira_gross, 5_000);
  assertEquals(result.pending.f1040.line4b_ira_taxable, 0);
  assertEquals(result.pending.f1040.line4c_ira_rollover, true);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, original.filer);
  assertStringIncludes(xml, "<IRADistributionsAmt>5000</IRADistributionsAmt>");
  assertStringIncludes(xml, "<TaxableIRAAmt>0</TaxableIRAAmt>");
  assertStringIncludes(xml, 'referenceDocumentName="IRADistributionStatement"');
  assertStringIncludes(xml, "IRS disaster notice MO-2025-02");
  assertStringIncludes(xml, "Butler County, Missouri");
  assertEquals(
    xml.includes(disasterPostponement.residence_record_reference),
    false,
  );
  const pdfBytes = await buildPdfBytes(pending, original.filer);
  const pdf = await PDFDocument.load(pdfBytes);
  assertEquals(pdf.getPageCount(), 3);
  const projected = irs1040Pdf.projectFields?.(
    result.pending.f1040,
    result.pending,
  );
  assertEquals(projected?.line4c_ira_rollover, true);
  assertEquals(projected?.line4b_ira_taxable, "0");
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, pdfBytes);
    const rendered = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(rendered.code, 0);
    const text = new TextDecoder().decode(rendered.stdout);
    assertStringIncludes(text, "notice MO-2025-02 postponed");
    assertStringIncludes(text, "Butler County, Missouri");
    assertEquals(
      text.includes(disasterPostponement.residence_record_reference),
      false,
    );
  } finally {
    await Deno.remove(path);
  }

  const xsd = new URL(
    "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  await Deno.stat(xsd);
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
});

Deno.test("MO-2025-02 source and deadline contradictions reject calculation and exports", async () => {
  for (
    const bad of [
      {
        ...latePayer,
        ira_rollover: {
          ...latePayer.ira_rollover,
          disaster_postponement: undefined,
        },
      },
      {
        ...latePayer,
        ira_rollover: { ...latePayer.ira_rollover, completed_on: "2025-11-04" },
      },
      {
        ...latePayer,
        ira_rollover: {
          ...latePayer.ira_rollover,
          distributed_on: "2025-09-01",
        },
      },
      {
        ...latePayer,
        ira_rollover: {
          ...latePayer.ira_rollover,
          distributed_on: "2025-01-01",
        },
      },
      {
        ...latePayer,
        ira_rollover: {
          ...latePayer.ira_rollover,
          disaster_postponement: {
            ...disasterPostponement,
            resident_ssn: "999-88-7777",
          },
        },
      },
      {
        ...latePayer,
        ira_rollover: {
          ...latePayer.ira_rollover,
          disaster_postponement: {
            ...disasterPostponement,
            covered_county: "Jackson",
          },
        },
      },
      {
        ...latePayer,
        ira_rollover: {
          ...latePayer.ira_rollover,
          disaster_postponement: {
            ...disasterPostponement,
            residence_record_reference: payer.source_document_reference!,
          },
        },
      },
      {
        ...latePayer,
        ira_rollover: {
          ...latePayer.ira_rollover,
          disaster_postponement: {
            ...disasterPostponement,
            deposit_confirmation_reference:
              disasterPostponement.irs_notice_review_reference,
          },
        },
      },
    ]
  ) {
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      { ...original.inputs, f1099r: [bad] },
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics.length > 0, true);
  }
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...original.inputs, f1099r: [latePayer] },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const source = pending.f1099r!.f1099rs![0]!;
  const drift = {
    ...pending,
    f1099r: {
      f1099rs: [{
        ...source,
        ira_rollover: {
          ...source.ira_rollover!,
          disaster_postponement: {
            ...disasterPostponement,
            resident_ssn: "999-88-7777",
          },
        },
      }],
    },
  } as unknown as ReturnType<typeof buildPending>;
  assertThrows(() => buildMefXml(drift, original.filer), Error);
  await assertRejects(() => buildPdfBytes(drift, original.filer), Error);
});
