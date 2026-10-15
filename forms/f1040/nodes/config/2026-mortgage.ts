/** IRC §163(h)(3), including the 2026 restoration of qualified MIP. */
export const mortgage2026 = {
  acquisitionCap: 750_000,
  acquisitionCapMfs: 375_000,
  priorAcquisitionCap: 1_000_000,
  priorAcquisitionCapMfs: 500_000,
  insuranceThreshold: 100_000,
  insuranceThresholdMfs: 50_000,
  insuranceStep: 1_000,
  insuranceStepMfs: 500,
  insuranceReductionPerStep: .10,
  prepaidInsuranceMonths: 84,
} as const;
