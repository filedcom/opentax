import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { form8862 as nativeForm8862 } from "../mef/forms/f8862.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { form8862Pdf } from "./forms/f8862.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((item) =>
  item.id === "single-8862-ctc-reinstatement"
)!;
const inputs = base.inputs;
const general = inputs.general as Record<string, unknown>;
const dependent = (general.dependents as Record<string, unknown>[])[0];
const f8812 = (inputs.f8812 as Record<string, unknown>[])[0];

function standaloneOdcPending() {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      general: {
        ...general,
        dependents: [{ ...dependent, dob: "2003-06-15" }],
      },
      f8812: [{
        ...f8812,
        qualifying_children_count: 0,
        other_dependents_count: 1,
      }],
      f8862: {
        ...(inputs.f8862 as Record<string, unknown>),
        ctc_children: [],
        other_dependents: [{
          first_name: "Jamie",
          last_name: "Example",
          dependent: true,
          us_citizen_national_or_resident: true,
        }],
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line19_child_tax_credit, 500);
  return buildPending(result.pending);
}

Deno.test("reviewed Form 8862 ODC reinstatement reaches the filed dependent and credit", async () => {
  const pending = standaloneOdcPending();
  const [projected] = form8862Pdf.instances?.(
    pending.f8862!,
    base.filer,
    pending,
  ) ?? [];
  assertEquals(projected?.odc_0_name, "Jamie Example");
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(bundle.xml, "<ODCPersonInformationGrp>");
  assertStringIncludes(bundle.xml, "<IRS1040Schedule8812 ");
  const xsd = new URL(
    "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 7);
});

Deno.test("standalone ODC rejects altered Schedule 8812, dependent TIN, and Form 1040 amounts in both exports", () => {
  const pending = standaloneOdcPending();
  const general = pending.general as Record<string, unknown>;
  const sourceDependents = general.dependents as Record<string, unknown>[];
  const form8812 = pending.f8812!;
  const filedDependents = pending.f1040.dependent_details as Record<
    string,
    unknown
  >[];
  const changed = [
    {
      ...pending,
      f1040: { ...pending.f1040, line19_child_tax_credit: 501 },
    },
    {
      ...pending,
      f1040: {
        ...pending.f1040,
        dependent_details: [{ ...filedDependents[0], ssn: "999887777" }],
      },
    },
    {
      ...pending,
      general: {
        ...general,
        dependents: [{ ...sourceDependents[0], ssn: "999887777" }],
      },
    },
    {
      ...pending,
      f8812: { ...form8812, form8862_filed: false },
    },
    {
      ...pending,
      f8812: {
        ...form8812,
        f8812s: [{
          ...form8812.f8812s![0],
          other_dependents_count: 2,
        }],
      },
    },
  ];
  for (const altered of changed) {
    assertThrows(
      () =>
        nativeForm8862.build(pending.f8862!, {
          filer: base.filer,
          pending: altered,
        }),
      Error,
    );
    assertThrows(
      () => form8862Pdf.instances?.(pending.f8862!, base.filer, altered),
      Error,
    );
  }
});
