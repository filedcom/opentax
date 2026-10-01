import { assertEquals, assertThrows } from "@std/assert";
import { f8908, itemSchema } from "./index.ts";
import type { z } from "zod";

type F8908Item = z.infer<typeof itemSchema>;

function home(overrides: Partial<F8908Item> = {}): F8908Item {
  return {
    contractor_ssn: "111223333",
    eligible_contractor_and_program_participation_verified: true,
    basis_during_construction_verified: true,
    no_duplicate_rehabilitation_or_energy_credit_verified: true,
    street: "1 Main Street",
    city: "Albany",
    state: "NY",
    zip: "12207",
    acquired_on: "2025-06-01",
    acquired_by_other_person_for_residence_verified: true,
    acquisition_record_reference: "sale-1",
    contractor_basis_record_reference: "basis-1",
    program: "residential",
    zero_energy_ready: false,
    certifier: { kind: "business", name: "North Certifier", state: "NY" },
    certification_reference: "cert-1",
    certified_on: "2024-12-15",
    certification_modified: false,
    ...overrides,
  };
}

function compute(items: F8908Item[]) {
  return f8908.compute(
    { taxYear: 2025, formType: "f1040" },
    { f8908s: items },
  );
}

Deno.test("Form 8908 refuses the old amount override and approximate route", () => {
  assertEquals(
    itemSchema.safeParse({
      construction_type: "single_family",
      energy_certification: "energy_star_50pct",
      credit_amount_override: 3_500,
    }).success,
    false,
  );
  assertThrows(() => compute([home()]), Error, "native Form 8908");
});

Deno.test("Form 8908 requires a distinct home and one contractor", () => {
  assertThrows(() => compute([]));
  assertThrows(
    () => compute([home(), home({ certification_reference: "cert-2" })]),
    Error,
    "same home",
  );
  assertThrows(
    () =>
      compute([
        home(),
        home({
          street: "2 Main Street",
          contractor_ssn: "444556666",
        }),
      ]),
    Error,
    "one identified contractor",
  );
});

Deno.test("Form 8908 requires timely certification and Form 7220 review", () => {
  assertThrows(
    () => compute([home({ certified_on: "2025-06-01" })]),
    Error,
    "precede acquisition",
  );
  assertThrows(
    () =>
      compute([home({
        program: "multifamily",
        prevailing_wage_met: true,
      })]),
    Error,
    "Form 7220",
  );
});
