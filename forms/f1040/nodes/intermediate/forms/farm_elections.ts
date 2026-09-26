import { z } from "zod";

const amount = z.number().nonnegative();

export const cccLoanDetailSchema = z.object({
  description: z.string().min(1),
  amount: amount.positive(),
}).strict();

const cropInsuranceDate = z.string().regex(/^2025-\d{2}-\d{2}$/).refine(
  (value) =>
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value,
  "Date must be a valid day in 2025",
);

export const cropInsuranceDeferralSchema = z.object({
  cash_method: z.literal(true),
  normal_practice_next_year_percent: z.number().gt(50).lte(100),
  damaged_crops: z.array(
    z.object({
      crop: z.string().min(1),
      damage_date: cropInsuranceDate,
      cause: z.string().min(1),
    }).strict(),
  ).min(1),
  payments: z.array(
    z.object({
      crop: z.string().min(1),
      received_date: cropInsuranceDate,
      amount: amount.positive(),
      carrier: z.string().min(1),
    }).strict(),
  ).min(1),
}).strict();

export type CccLoanDetail = z.infer<typeof cccLoanDetailSchema>;
export type CropInsuranceDeferralDetails = z.infer<
  typeof cropInsuranceDeferralSchema
>;

export function validateCccLoanElection(
  election: number | undefined,
  details: readonly CccLoanDetail[] | undefined,
  label: string,
): void {
  const elected = election ?? 0;
  const loans = details ?? [];
  if (
    (elected > 0 && loans.length === 0) ||
    (elected === 0 && loans.length > 0) ||
    loans.reduce((sum, loan) => sum + loan.amount, 0) !== elected
  ) {
    throw new Error(
      `${label} needs itemized CCC loans that match the elected amount`,
    );
  }
}

export function validateCropInsuranceDeferral(
  received: number | undefined,
  taxable: number | undefined,
  elected: boolean | undefined,
  details: CropInsuranceDeferralDetails | undefined,
  label: string,
): void {
  if (elected !== true) {
    if (details) {
      throw new Error(`${label} details require a deferral election`);
    }
    return;
  }
  if (!details) {
    throw new Error(`${label} requires crop insurance deferral details`);
  }
  const damagedCrops = new Set(
    details.damaged_crops.map((entry) => entry.crop),
  );
  if (details.payments.some((payment) => !damagedCrops.has(payment.crop))) {
    throw new Error(`${label} deferred payment must identify a damaged crop`);
  }
  const deferred = details.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  if ((received ?? 0) !== (taxable ?? 0) + deferred) {
    throw new Error(
      `${label} received amount must equal taxable and deferred payments`,
    );
  }
}
