import {
  form7220ReviewedFixture,
  form7220StatementFixture,
} from "./form8908_form7220_fixture.ts";
import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8908Source } from "./form8908_source.ts";

function fixture() {
  const categories = [
    ["residential", false, undefined],
    ["manufactured", true, undefined],
    ["multifamily", false, true],
    ["multifamily", true, true],
    ["multifamily", false, false],
    ["multifamily", true, false],
  ] as const;
  return {
    contractor_ssn: "111223333",
    eligible_contractor_and_program_participation_verified: true,
    basis_during_construction_verified: true,
    no_duplicate_rehabilitation_or_energy_credit_verified: true,
    homes: categories.map((
      [program, zero_energy_ready, prevailing_wage_met],
      index,
    ) => ({
      street: `${index + 1} Main Street`,
      city: "Albany",
      state: "NY",
      zip: "12207",
      acquired_on: "2025-06-01",
      acquired_by_other_person_for_residence_verified: true,
      acquisition_record_reference: `sale-${index + 1}`,
      contractor_basis_record_reference: `basis-${index + 1}`,
      program,
      zero_energy_ready,
      prevailing_wage_met,
      form7220: prevailing_wage_met
        ? {
          review_reference: `7220-${index + 1}`,
          acquisition_record_reference: `sale-${index + 1}`,
          residence: {
            street: `${index + 1} Main Street`,
            city: "Albany",
            state: "NY",
            zip: "12207",
            acquired_on: "2025-06-01",
          },
          pdf_file_name: `Form7220-${index + 1}.pdf`,
          pdf_sha256: String(index + 1).repeat(64),
          completed_for_residence_confirmed: true as const,
          reviewed_record: form7220ReviewedFixture(),
          signed_no_alterations_statement: form7220StatementFixture(
            index + 1,
            `${index + 1} Main Street`,
            `sale-${index + 1}`,
            `7220-${index + 1}`,
          ),
        }
        : undefined,
      certifier: {
        kind: "business" as const,
        name: index < 3 ? "North Certifier" : "South Certifier",
        state: "NY",
      },
      certification_reference: `cert-${index + 1}`,
      certified_on: "2024-12-15",
      certification_modified: index === 5,
    })),
  };
}

Deno.test("Form 8908 source calculator retains all six printed credit classes", () => {
  const lines = calculateForm8908Source(fixture());
  assertEquals(lines.counts, [1, 1, 1, 1, 1, 1]);
  assertEquals(lines.credits, [2500, 5000, 2500, 5000, 500, 1000]);
  assertEquals(lines.line7, 0);
  assertEquals(lines.line8, 16_500);
  assertEquals(lines.itemD_distinct_certifiers, 2);
  assertEquals(lines.itemE_certifications, 6);
  assertEquals(lines.certifiers[1].modified_certifications, 1);
  assertEquals(lines.first20HomeAddresses.length, 6);
});

Deno.test("Form 8908 rejects Form 7220 taxpayer and wage review gaps", () => {
  const wrongTaxpayer = fixture();
  wrongTaxpayer.homes[2].form7220!.reviewed_record.taxpayer_tin = "999887777";
  assertThrows(
    () => calculateForm8908Source(wrongTaxpayer),
    Error,
    "taxpayer identity differs",
  );
  const missingWages = fixture();
  missingWages.homes[2].form7220!.reviewed_record.wage_rows = [];
  assertThrows(() => calculateForm8908Source(missingWages));
});

Deno.test("Form 8908 keeps a person and business with the same name distinct", () => {
  const original = fixture();
  const source = {
    ...original,
    homes: original.homes.map((home, index) =>
      index === 0
        ? {
          ...home,
          certifier: {
            kind: "person" as const,
            name: "North Certifier",
            state: "NY",
          },
        }
        : home
    ),
  };
  const lines = calculateForm8908Source(source);
  assertEquals(lines.itemD_distinct_certifiers, 3);
  assertEquals(lines.certifiers[0].kind, "person");
});

Deno.test("Form 8908 rejects duplicate, late-certified, and unsupported PWA facts", () => {
  const duplicate = fixture();
  duplicate.homes[1].street = duplicate.homes[0].street;
  assertThrows(() => calculateForm8908Source(duplicate), Error, "same home");

  const late = fixture();
  late.homes[0].certified_on = "2025-06-01";
  assertThrows(
    () => calculateForm8908Source(late),
    Error,
    "precede acquisition",
  );

  const missing7220 = fixture();
  missing7220.homes[2].form7220 = undefined;
  assertThrows(() => calculateForm8908Source(missing7220), Error, "Form 7220");

  const wrongYear = fixture();
  wrongYear.homes[0].acquired_on = "2026-01-01";
  assertThrows(() => calculateForm8908Source(wrongYear));
});
