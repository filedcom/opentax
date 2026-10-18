// TY2026 adjustments inputs whose whole calculation path reads the tax year.
// See ../README.md before adding one.
export const adjustmentsInputs: ReadonlySet<string> = new Set<string>([]);

// `general` facts on this section's path still dated to TY2025.
export const adjustmentsTy2025OnlyGeneralFields: readonly string[] = [];
