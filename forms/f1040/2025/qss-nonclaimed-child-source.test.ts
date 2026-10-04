import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { FilingStatus } from "../mef/header.ts";
import {
  inputSchema as generalInputSchema,
  qssNonclaimedChildFromGeneral,
} from "../nodes/inputs/general/index.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;
const review = {
  child_first_name: "Avery",
  child_last_name: "Child",
  child_ssn: "444-55-6666",
  child_relationship: "daughter",
  child_lived_in_home_all_year: true,
  child_filed_nonrefund_joint_return: true,
  taxpayer_paid_more_than_half_home_costs: true,
  no_remarriage_through_2025: true,
  entitled_to_joint_return_in_death_year: true,
  spouse_death_record_reference: "reviewed 2024 death record",
  child_joint_return_reference: "reviewed 2025 child joint return",
  child_residency_record_reference: "reviewed 2025 home record",
  home_cost_record_reference: "reviewed 2025 home-cost ledger",
  prior_joint_eligibility_reference: "reviewed 2024 joint eligibility",
};
const filer = {
  ...base.filer,
  filingStatus: FilingStatus.QualifyingSurvivingSpouse,
};
const inputs = {
  ...base.inputs,
  general: {
    ...(base.inputs.general as Record<string, unknown>),
    filing_status: "qss",
    qss_spouse_death_year: 2024,
    qss_qualifying_child_ssn: "444-55-6666",
    qss_nonclaimed_child_review: review,
  },
};

Deno.test("reviewed nonclaimed QSS child reaches native Form 1040 and filled PDF", async () => {
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.qss_nonclaimed_child, {
    first_name: "Avery",
    last_name: "Child",
    ssn: "444556666",
  });
  assertEquals(pending.f1040?.dependent_count, 0);
  const xml = f1040_2025.buildMefXml(pending, filer);
  assertStringIncludes(
    xml,
    "<QualifyingPersonName><PersonFirstNm>Avery</PersonFirstNm><PersonLastNm>Child</PersonLastNm></QualifyingPersonName>",
  );
  assertStringIncludes(
    xml,
    "<QualifyingPersonSSN>444556666</QualifyingPersonSSN>",
  );
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
  const pdf = await f1040_2025.buildPdfBytes(pending, filer);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
    }).output();
    assertEquals(extracted.code, 0);
    assertStringIncludes(
      new TextDecoder().decode(extracted.stdout),
      "Avery Child",
    );
  } finally {
    await Deno.remove(pdfPath);
  }
});

Deno.test("both exporters reject a changed QSS child identity", async () => {
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const changed = structuredClone(pending);
  (changed.f1040 as { qss_nonclaimed_child: { ssn: string } })
    .qss_nonclaimed_child.ssn = "555667777";
  assertThrows(
    () => f1040_2025.buildMefXml(changed, filer),
    Error,
    "QSS nonclaimed child differs from the reviewed source",
  );
  await assertRejects(
    () => f1040_2025.buildPdfBytes(changed, filer),
    Error,
    "QSS nonclaimed child differs from the reviewed source",
  );
  delete (changed.f1040 as { qss_nonclaimed_child?: unknown })
    .qss_nonclaimed_child;
  assertThrows(
    () => f1040_2025.buildMefXml(changed, filer),
    Error,
    "QSS nonclaimed child differs from the reviewed source",
  );
  await assertRejects(
    () => f1040_2025.buildPdfBytes(changed, filer),
    Error,
    "QSS nonclaimed child differs from the reviewed source",
  );
  const changedStatus = structuredClone(pending);
  (changedStatus.f1040 as { filing_status: string }).filing_status = "hoh";
  assertThrows(
    () => f1040_2025.buildMefXml(changedStatus, filer),
    Error,
    "Form 1040 filing status differs from the retained general source",
  );
});

Deno.test("QSS child review rejects a wrong year, status, duplicate dependent, or missing review", () => {
  const source = inputs.general;
  const variants = [
    { ...source, qss_spouse_death_year: 2025 },
    { ...source, filing_status: "hoh" },
    {
      ...source,
      qss_nonclaimed_child_review: { ...review, child_ssn: "555-66-7777" },
    },
    {
      ...source,
      dependents: [{
        first_name: "Avery",
        last_name: "Child",
        dob: "2002-01-01",
        relationship: "daughter",
        months_in_home: 12,
        ssn: "444-55-6666",
      }],
    },
  ];
  for (const variant of variants) {
    assertThrows(
      () => qssNonclaimedChildFromGeneral(generalInputSchema.parse(variant)),
      Error,
      "QSS nonclaimed child needs matching status",
    );
  }
  assertThrows(
    () =>
      qssNonclaimedChildFromGeneral(generalInputSchema.parse({
        ...source,
        qss_nonclaimed_child_review: undefined,
      })),
    Error,
    "QSS qualifying child SSN needs a reviewed nondependent child route",
  );
});
