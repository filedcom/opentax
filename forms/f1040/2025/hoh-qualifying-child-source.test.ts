import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { FilingStatus } from "../mef/header.ts";
import {
  hohQualifyingChildFromGeneral,
  inputSchema as generalInputSchema,
} from "../nodes/inputs/general/index.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;
const custody = {
  form8332_source_reference: "signed 2025 Form 8332",
  custody_record_reference: "2025 residence and nights ledger",
  custodial_parent_for_2025: true,
  valid_2025_release_to_noncustodial_parent: true,
  no_competing_eitc_claim_verified: true,
};
const child = {
  first_name: "Avery",
  last_name: "Child",
  name_control: "CHIL",
  ssn: "444-55-6666",
  dob: "2015-04-02",
  relationship: "daughter",
  irs_relationship_code: "DAUGHTER",
  months_in_home: 12,
  months_lived_with_you_in_us: 12,
  lived_in_us_over_half_year: true,
  us_citizen_national_or_resident: true,
  provided_over_half_own_support: false,
  filed_joint_return_except_refund_only: false,
  ssn_valid_for_employment: true,
  tin_issued_by_due_date: true,
  dependent_on_another_return: true,
  custodial_eitc_release_review: custody,
};
const filer = { ...base.filer, filingStatus: FilingStatus.HeadOfHousehold };
const inputs = {
  ...base.inputs,
  general: {
    ...(base.inputs.general as Record<string, unknown>),
    filing_status: "hoh",
    do_not_claim_eic: true,
    hoh_qualifying_person_name: "Avery Child",
    hoh_qualifying_person_relationship: "daughter",
    hoh_paid_more_than_half_home_costs: true,
    dependents: [child],
  },
};

Deno.test("reviewed nondependent HOH child reaches native Form 1040 and filled PDF", async () => {
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.hoh_qualifying_child, {
    first_name: "Avery",
    last_name: "Child",
    ssn: "444556666",
  });
  assertEquals(pending.f1040?.dependent_count, 0);
  const xml = f1040_2025.buildMefXml(pending, filer);
  assertStringIncludes(xml, "<QualifyingHOHNm>Avery Child</QualifyingHOHNm>");
  assertStringIncludes(xml, "<QualifyingHOHSSN>444556666</QualifyingHOHSSN>");
  assertEquals(xml.includes("<IRS1040ScheduleEIC>"), false);
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
    const printed = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(printed, "Avery Child");
    assertEquals(printed.includes("Schedule EIC"), false);
  } finally {
    await Deno.remove(pdfPath);
  }
});

Deno.test("both exporters reject a changed HOH child identity after source review", async () => {
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const changed = structuredClone(pending);
  (changed.f1040 as { hoh_qualifying_child: { ssn: string } })
    .hoh_qualifying_child.ssn = "555667777";
  assertThrows(
    () => f1040_2025.buildMefXml(changed, filer),
    Error,
    "HOH qualifying child differs from the reviewed custody source",
  );
  await assertRejects(
    () => f1040_2025.buildPdfBytes(changed, filer),
    Error,
    "HOH qualifying child differs from the reviewed custody source",
  );
});

Deno.test("both exporters reject a retained QSS child SSN that intake would block", async () => {
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const changed = structuredClone(pending);
  (changed.general as Record<string, unknown>).qss_qualifying_child_ssn =
    "444-55-6666";
  assertThrows(
    () => f1040_2025.buildMefXml(changed, filer),
    Error,
    "QSS qualifying child SSN needs a reviewed nondependent child route",
  );
  await assertRejects(
    () => f1040_2025.buildPdfBytes(changed, filer),
    Error,
    "QSS qualifying child SSN needs a reviewed nondependent child route",
  );
});

Deno.test("HOH nondependent child rejects missing custody, home cost, and mismatched name", () => {
  const source = inputs.general;
  const variants = [
    {
      ...source,
      dependents: [{ ...child, custodial_eitc_release_review: undefined }],
    },
    { ...source, hoh_paid_more_than_half_home_costs: false },
    { ...source, hoh_qualifying_person_name: "Someone Else" },
  ];
  for (const variant of variants) {
    assertThrows(
      () => hohQualifyingChildFromGeneral(generalInputSchema.parse(variant)),
      Error,
      "HOH nondependent child needs matching reviewed custody",
    );
  }
});
