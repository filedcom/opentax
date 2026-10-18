// TY2026 general inputs whose whole calculation path reads the tax year.
// See ../README.md before adding one.
export const generalInputs: ReadonlySet<string> = new Set<string>(["general"]);

// `general` facts on this section's path still dated to TY2025.
export const generalTy2025OnlyGeneralFields: readonly string[] = [
  "dual_status_return_2025",
];
