// TY2026 income inputs whose whole calculation path reads the tax year.
// See ../README.md before adding one.
export const incomeInputs: ReadonlySet<string> = new Set<string>(["w2"]);

// `general` facts on this section's path still dated to TY2025.
export const incomeTy2025OnlyGeneralFields: readonly string[] = [];
