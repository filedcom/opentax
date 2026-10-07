// TY2025 v5.4 Common/efileTypes.xsd, BusinessNameLine1Type (75 chars).
// Keep source identities and printable legal names intact. This formatter only
// drops ordinary abbreviation punctuation at the native name-field boundary;
// it does not infer an IRS-recorded alias, truncate, or authenticate an EIN.
export function mefBusinessNameLine1(value: string): string {
  const name = value.replace(/\.(?=\s|,|$)/g, "").replace(/,/g, " ").replace(
    /\s+/g,
    " ",
  ).trim();
  if (
    !name || name.length > 75 ||
    !/^[A-Za-z0-9#()&'\-]+(?: [A-Za-z0-9#()&'\-]+)*$/.test(name)
  ) {
    throw new Error(
      "Native business name needs MeF-supported characters and a complete reviewed spelling within 75 characters",
    );
  }
  return name;
}
