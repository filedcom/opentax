// TY2026 income inputs whose whole calculation path reads the tax year.
// See ../README.md before adding one.
export const incomeInputs: ReadonlySet<string> = new Set<string>([
  "w2",
  "f1099int",
  "f1099div",
  "f1099b",
  "f8949",
  "schedule_d",
  "f1099r",
  "ssa1099",
  "f1099g",
  "f1099nec",
  "f1099m",
  "f1099k",
  "schedule_c",
  "schedule_e",
  "w2g",
]);

// `general` facts on this section's path still dated to TY2025.
export const incomeTy2025OnlyGeneralFields: readonly string[] = [];
