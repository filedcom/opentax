import { assertEquals } from "@std/assert";
import variants from "./reference/2025/issue77-synthetic.json" with {
  type: "json",
};
import { w2 } from "../forms/f1040/nodes/inputs/income/wages/w2/index.ts";
import { eitc } from "../forms/f1040/nodes/intermediate/forms/credits/earned-income/eitc/index.ts";
import { FilingStatus } from "../forms/f1040/nodes/types.ts";

const context = { taxYear: 2025, formType: "f1040" };
async function input(name: string) {
  return JSON.parse(
    await Deno.readTextFile(
      new URL(`./cases/f1040/2025/${name}/input.json`, import.meta.url),
    ),
  ) as {
    forms: { node_type: string; data: Record<string, unknown> }[];
  };
}

// Every added identity/review below is synthetic. Financial boxes and employer
// IDs come from the archived scenario; none of its source files are modified.
for (const variant of variants.ownership) {
  Deno.test(`synthetic issue77 ${variant.case}: ${variant.owners.join("/")}`, async () => {
    const source = await input(variant.case);
    const rows = source.forms.filter((f) => f.node_type === "w2");
    assertEquals(rows.length, variant.owners.length);
    const w2s = rows.map((f, index) => ({
      ...f.data,
      employee_ssn: variant.owners[index] === "taxpayer"
        ? variants.taxpayer_ssn
        : variants.spouse_ssn,
      source_document_reference: `SYNTHETIC issue77 ${variant.case} W2 ${
        index + 1
      }`,
    }));
    const result = w2.compute(context, w2.inputSchema.parse({ w2s }));
    const excess = result.outputs.find((o) =>
      o.nodeType === "schedule3"
    )?.fields.line11_excess_ss ?? 0;
    // Round(total SS withheld - 10,918.20) per eligible owner, not per return.
    assertEquals(excess, variant.expected_excess_ss);
    const wages = result.outputs.find((o) => o.nodeType === "f1040")?.fields
      .line1a_wages;
    assertEquals(
      wages,
      rows.reduce((sum, row) => sum + Number(row.data.box1_wages), 0),
    );
  });
}

for (const variant of variants.childless_eic) {
  Deno.test(`synthetic issue77 case78 childless EIC at age ${variant.age}`, () => {
    const result = eitc.compute(context, {
      filing_status: FilingStatus.Single,
      earned_income: 7212,
      agi: 14961,
      investment_income: 7749,
      qualifying_children: 0,
      taxpayer_dob: variant.dob,
      filer_has_valid_ssns: true,
      main_home_in_us_over_half_year: true,
      taxpayer_can_be_claimed_as_dependent: false,
      childless_eic_review: {
        not_qualifying_child_of_another_taxpayer_verified: true,
        qualifying_child_status_record_reference:
          "SYNTHETIC issue77 family assumption",
      },
      prior_eic_disallowance_review: {
        status: "none",
        irs_account_record_reference:
          "SYNTHETIC issue77 no prior disallowance assumption",
        no_nonclerical_disallowance_since_1996_verified: true,
      },
      eic_tax_residency_review: {
        status: "all_year_resident",
        taxpayer_status_record_reference:
          "SYNTHETIC issue77 residency assumption",
      },
    });
    const credit = result.outputs.find((o) =>
      o.nodeType === "f1040"
    )?.fields.line27_eitc ?? 0;
    // IRS EIC table: $7,200 band gives $553; $14,950 band gives $316.
    // The AGI phaseout limits the eligible result to $316.
    assertEquals(credit, variant.expected_eic);
  });
}
