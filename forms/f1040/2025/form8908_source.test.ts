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
      form7220_review_reference: prevailing_wage_met
        ? `7220-${index + 1}`
        : undefined,
      certifier_name: index < 3 ? "North Certifier" : "South Certifier",
      certifier_state: "NY",
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
  missing7220.homes[2].form7220_review_reference = undefined;
  assertThrows(() => calculateForm8908Source(missing7220), Error, "Form 7220");

  const wrongYear = fixture();
  wrongYear.homes[0].acquired_on = "2026-01-01";
  assertThrows(() => calculateForm8908Source(wrongYear));
});
