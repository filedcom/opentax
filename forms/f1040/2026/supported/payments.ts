// TY2026 payments inputs whose whole calculation path reads the tax year.
// See ../README.md before adding one.
export const paymentsInputs: ReadonlySet<string> = new Set<string>(["f8888"]);

// `general` facts on this section's path still dated to TY2025.
export const paymentsTy2025OnlyGeneralFields: readonly string[] = [];
