// TY2026 credits inputs whose whole calculation path reads the tax year.
// See ../README.md before adding one.
export const creditsInputs: ReadonlySet<string> = new Set<string>([]);

// `general` facts on this section's path still dated to TY2025.
export const creditsTy2025OnlyGeneralFields: readonly string[] = [
  "dependents",
  "ptc_residence_states_2025",
  "ptc_residence_months_2025",
];
