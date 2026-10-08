import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { buildMefXml } from "../../builder.ts";
import { buildPending } from "../../execution/pending.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { FilingStatus } from "../../../../mef/header.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { fecRecord, wagesNotShownSchedule } from "./foreign_employer_wages.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;

const toronto = {
  line1: "10 King Street",
  city: "Toronto",
  country_code: "CA",
  postal_code: "M5V 2T6",
};

const first = {
  foreign_employer_name: "Maple Employer Ltd",
  country_code: "CA",
  compensation_amount: 1_000,
  currency: "USD",
  compensation_usd: 1_000,
  compensation_owner_ssn: "111223333",
  compensation_source_document_reference: "2025 employer payroll record A",
  service_residence: { kind: "foreign", address: toronto },
  employer_foreign_address: { ...toronto, line1: "20 Queen Street" },
  employer_has_us_ein: false,
  employer_issued_w2: false,
};

const second = {
  ...first,
  foreign_employer_name: "Lakeside Employer Ltd",
  compensation_amount: 2_000,
  compensation_usd: 2_000,
  compensation_source_document_reference: "2025 employer payroll record B",
  service_residence: {
    kind: "us",
    line1: "1 Example Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  employer_foreign_address: { ...toronto, line1: "30 Bay Street" },
};

function filing(items: readonly Record<string, unknown>[] = [first, second]) {
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    fec: items,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return buildPending(result.pending);
}

Deno.test("two complete FEC employer sources create two records and one linked wages schedule", () => {
  const pending = filing();
  assertEquals(pending.f1040?.line1h_other_earned, 3_000);
  const xml = buildMefXml(pending, base.filer);
  assertEquals((xml.match(/<FECRecord documentId=/g) ?? []).length, 2);
  assertEquals(
    (xml.match(/<WagesNotShownSchedule documentId=/g) ?? []).length,
    1,
  );
  assertStringIncludes(xml, "<WagesLiteralCd>FEC</WagesLiteralCd>");
  assertStringIncludes(xml, "<WagesNotShownAmt>3000</WagesNotShownAmt>");
  assertStringIncludes(
    xml,
    "<ForeignEmployerCompensationAmt>1000</ForeignEmployerCompensationAmt>",
  );
  assertStringIncludes(
    xml,
    "<ForeignEmployerCompensationAmt>2000</ForeignEmployerCompensationAmt>",
  );
  assertStringIncludes(
    xml,
    "<WorkPerformedResidingInUSInd>X</WorkPerformedResidingInUSInd>",
  );
  assertStringIncludes(
    xml,
    'referenceDocumentName="NonW2DisabilityPaymentStatement WagesNotShownSchedule"',
  );
});

Deno.test("two FEC employer sources keep owner and document identity through native and PDF export", async () => {
  const pending = filing();
  const xml = buildMefXml(pending, base.filer);
  assertEquals((xml.match(/<FECRecord documentId=/g) ?? []).length, 2);
  const xsd = new URL(
    "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  let hasXsd = true;
  try {
    await Deno.stat(xsd);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    hasXsd = false;
  }
  if (hasXsd) {
    const path = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(path, xml);
      const validation = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, path],
        stderr: "piped",
      }).output();
      assertEquals(
        validation.code,
        0,
        new TextDecoder().decode(validation.stderr),
      );
    } finally {
      await Deno.remove(path);
    }
  }
  const pdf = await buildPdfBytes(pending, base.filer);
  assertEquals(pdf.byteLength > 0, true);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
    }).output();
    assertEquals(extracted.code, 0);
    const printed = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(printed, "FEC");
    assertEquals(/3,?000/.test(printed), true);
  } finally {
    await Deno.remove(pdfPath);
  }

  const sources = pending.fec!.fecs;
  for (const [field, value] of [
    ["compensation_owner_ssn", "999887777"],
    ["compensation_source_document_reference", sources[0].compensation_source_document_reference],
  ] as const) {
    const altered = structuredClone(pending);
    altered.fec!.fecs[1] = { ...altered.fec!.fecs[1], [field]: value };
    assertThrows(
      () => buildMefXml(altered, base.filer),
      Error,
      "distinct employer sources owned by the filer or joint spouse",
    );
    await assertRejects(
      () => buildPdfBytes(altered, base.filer),
      Error,
      "distinct employer sources owned by the filer or joint spouse",
    );
  }
});

Deno.test("an identified joint spouse can own a separate FEC record", () => {
  const pending = filing();
  const spouse = {
    ...base.filer,
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "444556666",
      firstName: "Sam",
      lastName: "Example",
      nameControl: "EXAM",
    },
  };
  const fec = pending.fec as unknown as { fecs: Record<string, unknown>[] };
  const records = fecRecord.build([], {
    filer: spouse,
    pending: {
      ...(pending as unknown as Record<string, unknown>),
      fec: {
        fecs: [fec.fecs[0], {
          ...fec.fecs[1],
          compensation_owner_ssn: "444556666",
        }],
      },
    },
  });
  assertEquals(records.length, 2);
  assertStringIncludes(records[1], "<EmployeeTIN>444556666</EmployeeTIN>");
  assertStringIncludes(records[1], "<EmployeeNm>Sam Example</EmployeeNm>");
});

Deno.test("standalone FEC native filing rejects missing facts, changed totals and mixed Form 2555 wages", () => {
  const pending = filing();
  const pendingRecord = pending as unknown as Record<string, unknown>;
  const context = { filer: base.filer, pending: pendingRecord };
  const source = pending.fec as unknown as { fecs: Record<string, unknown>[] };
  const changed = (firstSource: Record<string, unknown>) => ({
    ...pendingRecord,
    fec: { fecs: [firstSource, source.fecs[1]] },
  });
  for (
    const key of [
      "service_residence",
      "employer_foreign_address",
      "compensation_owner_ssn",
      "compensation_source_document_reference",
      "employer_has_us_ein",
      "employer_issued_w2",
    ]
  ) {
    const missing = { ...source.fecs[0] };
    delete missing[key];
    assertThrows(
      () => fecRecord.build([], { ...context, pending: changed(missing) }),
      Error,
      key,
    );
  }
  assertThrows(
    () =>
      fecRecord.build([], {
        ...context,
        pending: changed({
          ...source.fecs[0],
          compensation_owner_ssn: "999887777",
        }),
      }),
    Error,
    "owned by the filer or joint spouse",
  );
  assertThrows(
    () =>
      fecRecord.build([], {
        ...context,
        pending: changed({
          ...source.fecs[0],
          compensation_source_document_reference:
            source.fecs[1].compensation_source_document_reference,
        }),
      }),
    Error,
    "distinct employer sources",
  );
  assertThrows(
    () =>
      fecRecord.build([], {
        ...context,
        pending: {
          ...pendingRecord,
          f1040: { ...pending.f1040, line1h_other_earned: 3_001 },
        },
      }),
    Error,
    "must equal Form 1040 and AGI line 1h",
  );
  assertThrows(
    () =>
      wagesNotShownSchedule.build([], {
        ...context,
        pending: {
          ...pendingRecord,
          agi_aggregator: {
            ...(pendingRecord.agi_aggregator as Record<string, unknown>),
            line1h_other_earned: 3_001,
          },
        },
      }),
    Error,
    "must equal Form 1040 and AGI line 1h",
  );
  assertThrows(
    () =>
      fecRecord.build([], {
        ...context,
        pending: {
          ...pendingRecord,
          fec: { fecs: Array(11).fill(source.fecs[0]) },
        },
      }),
    Error,
    "Array must contain at most 10 element(s)",
  );
  const physical = pdfReviewFixtures.find((fixture) =>
    fixture.id === "single-form2555-full-year-physical-presence"
  )!;
  assertThrows(
    () =>
      fecRecord.build([], {
        ...context,
        pending: { ...pendingRecord, form2555: physical.inputs.form2555 },
      }),
    Error,
    "need an overlap reconciliation",
  );
});
