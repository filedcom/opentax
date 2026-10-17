// TY2026 uses the 2026v1.0 package (May 2026), the latest one held locally;
// ATS runs on 2026v3.0/v4.0, which differ in elements the engine does not emit.
export const MEF_RETURN_VERSION_BY_TAX_YEAR: Readonly<Record<number, string>> =
  {
    2025: "2025v5.4",
    2026: "2026v1.0",
  };

export function assertMefReturnVersion(
  year: number,
  schemaVersion: string,
  returnType: string,
): void {
  const expected = MEF_RETURN_VERSION_BY_TAX_YEAR[year];
  if (expected === undefined || returnType !== "1040") {
    throw new Error(
      `Form 1040 export has no reviewed MeF schema for TY${year} return type ${returnType}`,
    );
  }
  if (schemaVersion !== expected) {
    throw new Error(
      `TY${year} Form 1040 export requires the reviewed MeF schema version ${expected}`,
    );
  }
}
