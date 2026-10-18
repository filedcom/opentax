// TY2026 taxes inputs whose whole calculation path reads the tax year.
// See ../README.md before adding one.
export const taxesInputs: ReadonlySet<string> = new Set<string>([
  "ct2",
  "f8611",
  "f8965",
  "form4137",
  "form5329",
  "form8919",
  "form8960_additional_modifications",
  // FICA-only payroll and withholding; FUTA, family and minor payroll refuse.
  "schedule_h",
]);

// `general` facts on this section's path still dated to TY2025.
export const taxesTy2025OnlyGeneralFields: readonly string[] = [];
