// TY2026 payments inputs whose whole calculation path reads the tax year.
// See ../README.md before adding one.
export const paymentsInputs: ReadonlySet<string> = new Set<string>([
  "ext",
  "f1040es",
  "f8288",
  "f8379",
  "f843",
  "f8805",
  "f8857",
  "f8888",
  "payment_request",
]);

// `general` facts on this section's path still dated to TY2025.
export const paymentsTy2025OnlyGeneralFields: readonly string[] = [];
