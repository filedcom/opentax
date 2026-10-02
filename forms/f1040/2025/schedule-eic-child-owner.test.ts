import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { FilingStatus } from "../mef/header.ts";
import { assertEitcChildSources } from "./filer-source-reconciliation.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { eitcPdf } from "./pdf/forms/eitc.ts";
import { registry } from "./registry.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefXml } from "./mef/builder.ts";

const xsd = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const xsdAvailable = (() => {
  try {
    Deno.statSync(xsd);
    return true;
  } catch {
    return false;
  }
})();

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-three-eic-children-with-reviewed-birth"
)!;

Deno.test({
  name:
    "Schedule EIC three distinct children survive graph, PDF projection, and local XSD",
  ignore: !xsdAvailable,
  async fn() {
    const wages = (fixture.inputs.w2 as Array<Record<string, unknown>>).map(
      (row) => ({ ...row, employee_ssn: fixture.filer.primarySSN }),
    );
    const result = execute(buildExecutionPlan(registry), registry, {
      ...fixture.inputs,
      w2: wages,
    }, { taxYear: 2025, formType: "f1040" });
    assertEquals(result.diagnostics, []);
    assertEitcChildSources(result.pending, fixture.filer);
    const children = result.pending.eitc.qualifying_child_details as Array<
      Record<string, unknown>
    >;
    assertEquals(children.length, 3);
    const projected = eitcPdf.projectFields?.(result.pending.eitc, {});
    assertEquals(projected?.child1_ssn, "111223334");
    assertEquals(projected?.child2_ssn, "111223335");
    assertEquals(projected?.child3_ssn, "111223336");
    const xml = buildMefXml(buildPending(result.pending), fixture.filer);
    assertStringIncludes(xml, "<IRS1040ScheduleEIC");
    for (const ssn of ["111223334", "111223335", "111223336"]) {
      assertStringIncludes(
        xml,
        `<QualifyingChildSSN>${ssn}</QualifyingChildSSN>`,
      );
    }
    const validated = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = validated.stdin.getWriter();
    await writer.write(new TextEncoder().encode(xml));
    await writer.close();
    const output = await validated.output();
    assertEquals(
      output.code,
      0,
      new TextDecoder().decode(output.stderr),
    );
  },
});

Deno.test("Schedule EIC graph cannot use taxpayer SSN as one of three child identities", () => {
  const general = fixture.inputs.general as Record<string, unknown> & {
    dependents: Array<Record<string, unknown>>;
    taxpayer_ssn: string;
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
    general: {
      ...general,
      dependents: general.dependents.map((dep, index) =>
        index === 0 ? { ...dep, ssn: general.taxpayer_ssn } : dep
      ),
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    result.diagnostics.some((item) => item.nodeType === "general"),
    true,
  );
});

Deno.test("Schedule EIC final child source cannot reuse taxpayer or joint-spouse SSN", () => {
  const filer = {
    ...fixture.filer,
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "444556666",
      firstName: "Sam",
      lastName: "Example",
      nameControl: "EXAM",
    },
  };
  const children = [
    {
      first_name: "Ada",
      last_name: "Example",
      name_control: "EXAM",
      ssn: "111-22-3334",
      dob: "2017-06-15",
      irs_relationship_code: "DAUGHTER",
      months_in_home: 12,
      months_lived_with_you_in_us: 12,
      ssn_valid_for_employment: true,
      tin_issued_by_due_date: true,
    },
    {
      first_name: "Ben",
      last_name: "Example",
      name_control: "EXAM",
      ssn: "111-22-3335",
      dob: "2020-03-10",
      irs_relationship_code: "SON",
      months_in_home: 8,
      months_lived_with_you_in_us: 8,
      ssn_valid_for_employment: true,
      tin_issued_by_due_date: true,
    },
  ];
  const pending = {
    general: {
      taxpayer_ssn: "111-22-3333",
      spouse_ssn: "444-55-6666",
      dependents: children.map((child) => ({
        ...child,
        lived_in_us_over_half_year: true,
      })),
    },
    eitc: {
      credit_amount: 2_000,
      qualifying_children: 2,
      qualifying_child_details: children,
    },
    f1040: { line27_eitc: 2_000 },
  };
  assertEitcChildSources(pending, filer);
  for (const ownerSsn of ["111-22-3333", "444-55-6666"]) {
    const altered = {
      ...pending,
      general: {
        ...pending.general,
        dependents: [
          { ...pending.general.dependents[0], ssn: ownerSsn },
          pending.general.dependents[1],
        ],
      },
      eitc: {
        ...pending.eitc,
        qualifying_child_details: [
          { ...children[0], ssn: ownerSsn },
          children[1],
        ],
      },
    };
    assertEquals(
      eitcPdf.projectFields?.(altered.eitc, {})?.child1_ssn,
      ownerSsn.replaceAll("-", ""),
    );
    assertThrows(
      () => assertEitcChildSources(altered, filer),
      Error,
      "cannot use filer or joint-spouse SSN",
    );
  }
});
