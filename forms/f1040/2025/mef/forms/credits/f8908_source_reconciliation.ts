import {
  calculateForm8908Source,
  form8908HomeSourceSchema,
} from "../../../domains/credits/form8908/form8908_source.ts";
import {
  inputSchema as f8908InputSchema,
} from "../../../../nodes/inputs/f8908/index.ts";

export function reconciledForm8908Source(
  raw: unknown,
  form3800Raw: unknown,
) {
  const input = f8908InputSchema.parse(raw);
  const owner = input.f8908s[0].contractor_ssn;
  if (input.f8908s.some((home) => home.contractor_ssn !== owner)) {
    throw new Error("Form 8908 homes need one identified contractor");
  }
  const source = {
    contractor_ssn: owner,
    eligible_contractor_and_program_participation_verified: true as const,
    basis_during_construction_verified: true as const,
    no_duplicate_rehabilitation_or_energy_credit_verified: true as const,
    homes: input.f8908s.map((home) =>
      form8908HomeSourceSchema.parse({
        street: home.street,
        unit: home.unit,
        city: home.city,
        state: home.state,
        zip: home.zip,
        acquired_on: home.acquired_on,
        acquired_by_other_person_for_residence_verified:
          home.acquired_by_other_person_for_residence_verified,
        acquisition_record_reference: home.acquisition_record_reference,
        contractor_basis_record_reference:
          home.contractor_basis_record_reference,
        program: home.program,
        zero_energy_ready: home.zero_energy_ready,
        prevailing_wage_met: home.prevailing_wage_met,
        form7220: home.form7220,
        certifier: home.certifier,
        certification_reference: home.certification_reference,
        certified_on: home.certified_on,
        certification_modified: home.certification_modified,
      })
    ),
  };
  const lines = calculateForm8908Source(source);
  if (lines.certifiers.length > 38) {
    throw new Error("Form 8908 Part II exceeds its 38 certifier rows");
  }
  for (const certifier of lines.certifiers) {
    if (
      certifier.name.length > (certifier.kind === "person" ? 35 : 75) ||
      !(certifier.kind === "person"
        ? /^([A-Za-z0-9'\-] ?)*[A-Za-z0-9'\-]$/.test(certifier.name)
        : /^([A-Za-z0-9#&'()\-] ?)*[A-Za-z0-9#&'()\-]$/.test(certifier.name))
    ) {
      throw new Error(
        "Form 8908 certifier name cannot fit its IRS8908 identity field",
      );
    }
  }
  for (const home of lines.first20HomeAddresses) {
    for (
      const street of [home.street, home.unit].filter(
        (value): value is string => value !== undefined,
      )
    ) {
      if (
        street.length > 35 ||
        !/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/.test(street)
      ) {
        throw new Error(
          "Form 8908 home address cannot fit IRS8908 street field",
        );
      }
    }
    if (home.city.length > 22 || !/^([A-Za-z] ?)*[A-Za-z]$/.test(home.city)) {
      throw new Error("Form 8908 home city cannot fit IRS8908 city field");
    }
  }
  if (
    !form3800Raw || typeof form3800Raw !== "object" ||
    !("f8908_credit" in form3800Raw)
  ) {
    throw new Error("Form 8908 needs a Form 3800 line 1p source");
  }
  const credit = form3800Raw.f8908_credit;
  if (
    !credit || typeof credit !== "object" ||
    !("credit_amount" in credit) ||
    !("subject_to_passive_activity_limit" in credit) ||
    credit.credit_amount !== lines.line8 ||
    credit.subject_to_passive_activity_limit !== false
  ) {
    throw new Error("Form 8908 line 8 does not reconcile to Form 3800 line 1p");
  }
  return { source, lines };
}
