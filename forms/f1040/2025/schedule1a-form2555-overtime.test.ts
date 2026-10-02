import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "./registry.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { schedule1aPdf } from "./pdf/forms/schedule1a.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

const foreign = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-form2555-full-year-physical-presence"
)!;
const overtime = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-two-w2-flsa-overtime-schedule1a"
)!;
const review = {
  no_section933_puerto_rico_excluded_income: true as const,
  section933_review_source_reference:
    "Synthetic 2025 residency and income review",
  form2555_source_reference: "Synthetic 2025 Form 2555 foreign wage review",
  no_form4563_filed: true as const,
  form4563_review_source_reference: "Synthetic 2025 Samoa-source income review",
};
const inputs = {
  ...overtime.inputs,
  w2: [{
    ...(overtime.inputs.w2 as Array<Record<string, unknown>>)[0],
    box1_wages: 80_000,
    box3_ss_wages: 80_000,
    box4_ss_withheld: 4_960,
    box5_medicare_wages: 80_000,
    box6_medicare_withheld: 1_160,
    box14_entries: [{
      description: "FLSA Overtime Premium",
      amount: 4_000,
      is_state_sdi_pfml: false,
    }],
  }],
  form2555: foreign.inputs.form2555,
  schedule1a: { form2555_exclusion_review: review },
};

Deno.test("full-year Form 2555 plus domestic W-2 overtime uses Part I MAGI across Form 1040, MeF, and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const schedule = pending.schedule1a as Record<string, unknown>;
  assertEquals(pending.f1040?.line11_agi, 80_000);
  assertEquals(pending.f1040?.line13b_additional_deductions, 1_000);
  assertEquals(schedule.form2555_line45_exclusion, 100_000);
  const projected = schedule1aPdf.projectFields?.(
    schedule,
    pending as unknown as Record<string, Record<string, unknown>>,
  );
  assertEquals(projected?.line1_agi, 80_000);
  assertEquals(projected?.line2b_form2555_exclusion, 100_000);
  assertEquals(projected?.line3_magi, 180_000);
  assertEquals(projected?.line14a_w2_overtime, 4_000);
  assertEquals(projected?.line18_excess_magi, 30_000);
  assertEquals(projected?.line20_reduction, 3_000);
  assertEquals(projected?.line21_overtime, 1_000);
  assertEquals(projected?.line38_total, 1_000);

  const bundle = await buildMefBundle(pending, {
    filer: foreign.filer,
    attachments: [],
  });
  const xml = bundle.xml;
  assertStringIncludes(xml, "<ModifiedAGIAmt>180000</ModifiedAGIAmt>");
  assertStringIncludes(
    xml,
    "<TotalIncomeExclusionAmt>100000</TotalIncomeExclusionAmt>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedOvertimeCompDedAmt>1000</QualifiedOvertimeCompDedAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalAdditionalDeductionsAmt>1000</TotalAdditionalDeductionsAmt>",
  );

  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlFile = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlFile, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlFile],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlFile);
  }

  const pageOrigins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    foreign.filer,
    ".pdf-cache",
    bundle,
    pageOrigins,
  );
  assert((await PDFDocument.load(pdf)).getPageCount() >= 7);
  assertEquals(
    pageOrigins.filter((origin) => origin.formKey === "schedule1a").length,
    2,
  );
  const reviewPdfPath = Deno.env.get("OPENTAX_SCHEDULE1A_FEIE_REVIEW_PDF");
  if (reviewPdfPath) await Deno.writeFile(reviewPdfPath, pdf);

  const changed = {
    ...pending,
    schedule1a: {
      ...schedule,
      form2555_line45_exclusion: 99_999,
    },
  };
  assertThrows(
    () =>
      schedule1aPdf.projectFields?.(
        changed.schedule1a,
        changed as unknown as Record<string, Record<string, unknown>>,
      ),
    Error,
    "matching full-year exclusion",
  );
  const withTips = {
    ...pending,
    schedule1a: {
      ...schedule,
      qualified_employee_tips: [{
        employee_ssn: "111223333",
        employer_ein: "123456789",
        employer_name: "Domestic Employer",
        amount: 100,
        box5_medicare_wages: 80_000,
        occupation_code: "102",
        source_type: "w2_box7",
      }],
    },
  };
  assertThrows(
    () =>
      schedule1aPdf.projectFields?.(
        withTips.schedule1a,
        withTips as unknown as Record<string, Record<string, unknown>>,
      ),
    Error,
    "one supported deduction route",
  );
  const twoOvertimeSources = {
    ...pending,
    schedule1a: {
      ...schedule,
      qualified_w2_overtime: [
        ...(schedule.qualified_w2_overtime as Array<Record<string, unknown>>),
        {
          ...(schedule.qualified_w2_overtime as Array<Record<string, unknown>>)[
            0
          ],
          employer_ein: "987654321",
        },
      ],
    },
  };
  assertThrows(
    () =>
      schedule1aPdf.projectFields?.(
        twoOvertimeSources.schedule1a,
        twoOvertimeSources as unknown as Record<
          string,
          Record<string, unknown>
        >,
      ),
    Error,
    "one supported deduction route",
  );
});
