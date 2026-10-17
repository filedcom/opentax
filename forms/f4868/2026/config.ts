export const F4868_2026_CONFIG = {
  formType: "f4868" as const,
  taxYear: 2026 as const,
  // TY2026 4868 package; the TY2025 v5.4 release ships no 4868 schema.
  mefSchemaVersion: "2026v1.0" as const,
  // Form 4868 (2026) instructions: April 15, 2027; June 15, 2027 when out of the country.
  dueDate: "2027-04-15" as const,
  outOfCountryDueDate: "2027-06-15" as const,
} as const;
