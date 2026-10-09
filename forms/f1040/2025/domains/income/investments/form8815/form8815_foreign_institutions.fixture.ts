import {
  institutionCases,
  institutionInputs,
} from "./form8815_institutions.fixture.ts";
import {
  inputSchema,
  type InstitutionAddress,
} from "../../../../../nodes/intermediate/forms/income/investments/form8815/index.ts";

export { institutionCases };

export function foreignInstitutionInputs(
  kind: typeof institutionCases[number],
) {
  const base = institutionInputs(kind);
  const addresses: InstitutionAddress[] = [
    {
      line1: "10 College Road",
      city: "Toronto",
      province_or_state: "Ontario",
      country_code: "CA",
      postal_code: "M5S 1A1",
    },
    {
      line1: "20 College Street",
      city: "Berlin",
      country_code: "GM",
      postal_code: "10115",
    },
    {
      line1: "30 College Avenue",
      city: "Boston",
      state: "MA",
      zip: "02108-1234",
    },
    {
      line1: "40 College Lane",
      line2: "Department of Continuing Education",
      city: "Cambridge",
      province_or_state: "Cambridgeshire",
      country_code: "UK",
      postal_code: "CB2 1TN",
    },
    // ForeignAddressType does not require a city, province, or postal code.
    { line1: "50 College Road", country_code: "CA" },
  ];
  return {
    ...base,
    form8815: inputSchema.parse({
      ...base.form8815,
      eligible_students: base.form8815.eligible_students.map((student, i) => ({
        ...student,
        institution_address: addresses[i % addresses.length],
      })),
    }),
  };
}
