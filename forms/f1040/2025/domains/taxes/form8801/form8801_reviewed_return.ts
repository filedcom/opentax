import { z } from "zod";
import {
  type SourceDocumentBytes,
  VerifiedSourceDocuments,
} from "../../../../../../core/runtime/source-documents.ts";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import {
  calculateForm8801,
  form8801CalculationSchema,
  refineForm8801PriorIdentity,
} from "./form8801_calculation.ts";

const bindingSchema = z.object({
  reference: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  current_return_reference: z.string().trim().min(1),
}).strict();
export const form8801ReviewPackageSchema = form8801CalculationSchema.innerType()
  .omit({ current_return: true }).superRefine(refineForm8801PriorIdentity);

function sum(value: unknown): number {
  if (value === undefined) return 0;
  if (Array.isArray(value)) {
    return value.reduce<number>((s, n) => s + sum(n), 0);
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      "Form 8801 public capacity needs exact nonnegative dollars",
    );
  }
  return value;
}

const creditFields = {
  "1": ["line1_foreign_tax_credit", "line1_foreign_tax_1099"],
  "2": ["line2_childcare_credit"],
  "3": ["line3_education_credit"],
  "4": ["line4_retirement_savings_credit"],
  "5a": ["line5a_residential_clean_energy"],
  "5b": ["line5b_energy_efficient_home"],
  "6a": ["line6a_general_business_credit", "line6a_low_income_housing_credit"],
  "6b": ["line6b_prior_year_min_tax_credit"],
  "6c": ["line6c_adoption_credit"],
  "6d": ["line6d_elderly_disabled_credit"],
  "6f": ["line6f_clean_vehicle_credit"],
  "6g": ["line6g_mortgage_interest_credit"],
  "6h": ["line6h_dc_homebuyer_credit"],
  "6i": ["line6i_qualified_electric_vehicle_credit"],
  "6j": ["line6j_alt_fuel_vehicle_refueling"],
  "6k": ["line6k_tax_credit_bonds"],
  "6l": ["line6l_form8978_credit"],
  "6m": ["line6m_prev_owned_clean_vehicle_credit"],
} as const;

export function form8801CurrentReturnWorkpaper(
  current1040: Readonly<Record<string, unknown>>,
  current6251: Readonly<Record<string, unknown>>,
  schedule3: Readonly<Record<string, unknown>>,
  reference: string,
) {
  const credits = Object.entries(creditFields).map(([key, fields]) => ({
    key: key as keyof typeof creditFields,
    amount: fields.reduce((total, field) => total + sum(schedule3[field]), 0),
  }));
  if (
    credits.reduce((total, row) => total + row.amount, 0) !==
      sum(current1040.line20_nonrefundable_credits)
  ) {
    throw new Error(
      "Form 8801 Schedule 3 credits differ from public Form 1040 line 20",
    );
  }
  return {
    reference,
    form1040_line16: sum(current1040.line16_income_tax),
    schedule2_line1z: sum(current1040.credit_limit_schedule2_line1z),
    form1040_line19: sum(current1040.line19_child_tax_credit),
    form6251_line9: sum(current6251.net_tmt),
    schedule3_credits: credits,
  };
}

/** Byte-bound reviewed workpapers → public pre-credit capacity → line arithmetic.
 * Package bytes are canonical JSON review records, not filed-return copies.
 * No credit is inserted in the public return; filing/acceptance remain false. */
export async function stageForm8801ReviewedReturnCalculation(
  rawReturnInputs: Readonly<Record<string, unknown>>,
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  const inputs = structuredClone(rawReturnInputs);
  const binding = bindingSchema.parse(rawBinding);
  const documents = rawDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  for (const key of ["f8801", "f1040", "schedule2", "schedule3", "form6251"]) {
    if (inputs[key] !== undefined) {
      throw new Error(
        `Form 8801 capacity staging rejects detached ${key} inputs`,
      );
    }
  }
  const verified = await VerifiedSourceDocuments.verify(
    [{ reference: binding.reference, sha256: binding.sha256 }],
    documents,
  );
  const bytes = verified.getBytes(binding.reference)!;
  if (bytes.length > 5_000_000) {
    throw new Error("Form 8801 review package is too large");
  }
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
    .decode(bytes);
  const parsed: unknown = JSON.parse(text);
  // Canonical encoding also rejects duplicate object keys and ambiguous JSON.
  if (JSON.stringify(parsed) !== text) {
    throw new Error("Form 8801 review package needs canonical JSON");
  }
  const source = form8801ReviewPackageSchema.parse(parsed);
  // Retain zero-AMT line 9 when credit capacity requires a Form 6251 workpaper.
  const execution = f1040_2025.executeReturn({
    ...inputs,
    f8801: { compute_credit_capacity: true },
  });
  if (execution.diagnostics.length > 0) {
    throw new Error("Form 8801 needs successful public pre-credit execution");
  }
  const pending = normalizeAllPending(execution.pending);
  const identity = String(pending.general?.taxpayer_ssn ?? "").replaceAll(
    "-",
    "",
  );
  if (!/^\d{9}$/.test(identity) || source.taxpayer_ssn !== identity) {
    throw new Error(
      "Form 8801 review package differs from actual primary taxpayer",
    );
  }
  const current1040 = pending.f1040;
  const current6251 = pending.form6251;
  if (!current1040 || typeof current6251?.net_tmt !== "number") {
    throw new Error("Form 8801 requires calculated current Form 6251 line 9");
  }
  const schedule3 = pending.schedule3 ?? {};
  if (sum(schedule3.line6b_prior_year_min_tax_credit) !== 0) {
    throw new Error(
      "Form 8801 pre-credit return already includes minimum-tax credit",
    );
  }
  const currentReturn = form8801CurrentReturnWorkpaper(
    current1040,
    current6251,
    schedule3,
    binding.current_return_reference,
  );
  const calculation = calculateForm8801({
    ...source,
    current_return: currentReturn,
  });
  return {
    ...calculation,
    current_return_workpaper: currentReturn,
    current_form1040_before_credit: current1040,
    public_pending_before_credit: pending,
    public_return_replay_input: execution.replayInputs?.f1040,
    reviewed_calculation_source: source,
    current_form6251: current6251,
    review_package_manifest: verified.manifest,
    reviewPackageBytesVerified: true as const,
    priorReturnBytesVerified: false as const,
    currentTaxCapacityReconciled: true as const,
  };
}
