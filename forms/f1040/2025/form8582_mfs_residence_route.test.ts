import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { FilingStatus } from "../nodes/types.ts";
import { normalizeAllPending } from "./pending.ts";
import { form8582 } from "./mef/forms/f8582.ts";
import { form8582Pdf } from "./pdf/forms/f8582.ts";

const residenceSource = {
  months: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    taxpayer_residence: "1 Taxpayer Street",
    spouse_residence: "2 Spouse Avenue",
    taxpayer_residence_record_reference: `Taxpayer residence month ${
      index + 1
    }`,
    spouse_residence_record_reference: `Spouse residence month ${index + 1}`,
    no_shared_residence_any_day: true as const,
  })),
};
const general = {
  filing_status: FilingStatus.MFS,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Owner",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Taxpayer Street",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  mfs_spouse_lived_with_taxpayer: false,
  mfs_lived_apart_source: residenceSource,
};
const rental = {
  tsj: "T",
  activity_id: "mfs-rental-home",
  property_description: "Rental home",
  property_type: 1,
  activity_type: "A",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 0,
  expense_utilities: 20_000,
  form_1099_payments_made: false,
};

Deno.test("MFS full-year separate residences route the $7,500 rental allowance through Form 1040, MeF, and PDF", () => {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 60_000, box2_fed_withheld: 8_000 }],
    schedule_e: [rental],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8582.modified_agi, 60_000);
  assertEquals(result.pending.schedule1.line5_schedule_e, -7_500);
  assertEquals(result.pending.f1040.line11_agi, 52_500);
  const pending = normalizeAllPending(result.pending);
  const xml = form8582.build(pending.form8582, { pending });
  assertStringIncludes(
    xml,
    "<MaximumAllowedIncomeAmt>75000</MaximumAllowedIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>7500</AllowedRentalRealtyLossAmt>",
  );
  const pdf = form8582Pdf.projectFields!(pending.form8582, pending);
  assertEquals(pdf.line5, "75000");
  assertEquals(pdf.line9, "7500");
  assertEquals(pdf.partVIII_1_allowed, "7500");

  const changed = {
    ...pending,
    general: {
      ...pending.general,
      mfs_lived_apart_source: {
        months: [
          {
            ...residenceSource.months[0],
            spouse_residence: "1 Taxpayer Street",
          },
          ...residenceSource.months.slice(1),
        ],
      },
    },
  };
  assertThrows(
    () => form8582.build(pending.form8582, { pending: changed }),
    Error,
    "residence source differs",
  );
  assertThrows(
    () => form8582Pdf.projectFields!(pending.form8582, changed),
    Error,
    "residence source differs",
  );
});

Deno.test("MFS rental allowance rejects a missing month of separate-residence records", () => {
  const result = f1040_2025.executeReturn({
    general: {
      ...general,
      mfs_lived_apart_source: { months: residenceSource.months.slice(0, 11) },
    },
    w2: [{ box1_wages: 60_000, box2_fed_withheld: 8_000 }],
    schedule_e: [rental],
  });
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.message.includes("mfs_lived_apart_source") &&
      entry.message.includes("exactly 12 element(s)")
    ),
    true,
  );
});
