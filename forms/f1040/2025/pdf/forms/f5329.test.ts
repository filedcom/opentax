import { assertEquals, assertThrows } from "@std/assert";
import { calculateOwnerForms } from "../../../nodes/intermediate/forms/form5329/index.ts";
import { TS } from "../../../nodes/types.ts";
import { FilingStatus } from "../../mef/types.ts";
import { form5329Pdf } from "./f5329.ts";

const filer = {
  fullName: "Pat Taxpayer",
  primarySSN: "123456789",
  nameLine1: "TAXPAYER PAT",
  nameControl: "TAXP",
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.MarriedFilingJointly,
  spouse: {
    firstName: "Alex",
    lastName: "Taxpayer",
    ssn: "987654321",
    nameControl: "TAXP",
  },
};

Deno.test("Form 5329 PDF instances keep each owner's identity and Part VII", () => {
  const owner_entries = [
    { owner: TS.T, early_distribution: 5_000 },
    {
      owner: TS.S,
      hsa_part_vii: {
        line42_prior_excess: 0,
        line43_unused_contribution_room: 0,
        line44_taxable_distributions: 0,
        line47_current_year_excess: 1_000,
        december_31_value: 4_000,
      },
    },
  ];
  const owner_forms = calculateOwnerForms({ owner_entries }).forms;
  const copies = form5329Pdf.instances?.(
    { owner_entries, owner_forms },
    filer,
    {
      schedule2: { line8_form5329_tax: 560 },
      form8889: {
        forms: [{
          owner: "spouse",
          print_line2_taxpayer_contributions: 1_000,
          print_line12: 0,
          print_line16_taxable: 0,
        }],
      },
    },
  );
  assertEquals(copies?.length, 2);
  assertEquals(copies?.map((copy) => copy.owner_ssn), [
    "123456789",
    "987654321",
  ]);
  assertEquals(copies?.[1]?.print_hsa_line49, 60);
  assertThrows(
    () =>
      form5329Pdf.instances?.(
        { owner_entries, owner_forms },
        filer,
        {
          schedule2: { line8_form5329_tax: 500 },
          form8889: {
            forms: [{
              owner: "spouse",
              print_line2_taxpayer_contributions: 1_000,
              print_line12: 0,
              print_line16_taxable: 0,
            }],
          },
        },
      ),
    Error,
    "Schedule 2 line 8",
  );
});
