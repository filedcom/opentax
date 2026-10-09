import { EducationAccountKind } from "../../../../../nodes/intermediate/forms/income/investments/form8815/education_contributions.ts";
import type {
  Form8815Input,
  InstitutionAddress,
} from "../../../../../nodes/intermediate/forms/income/investments/form8815/index.ts";
import { ty2025IrsCountryName } from "../../../support/irs_country_name.ts";

/** Preserve the same address on the official form and its continuation. */
export function institutionAddressLines(address: InstitutionAddress): string[] {
  const locality = "country_code" in address
    ? [
      [address.city, address.province_or_state, address.postal_code]
        .filter(Boolean).join(" "),
      ty2025IrsCountryName(address.country_code),
    ]
    : [`${address.city}, ${address.state} ${address.zip}`];
  return [address.line1, ...(address.line2 ? [address.line2] : []), ...locality]
    .filter((line) => line.length > 0);
}

export function institutionPrintedName(
  student: Form8815Input["eligible_students"][number],
): string {
  const kind = student.contribution_account?.kind;
  if (!kind) return student.institution_name;
  return `${
    kind === EducationAccountKind.Qtp ? "QTP" : "Coverdell ESA"
  } - ${student.institution_name}`;
}
