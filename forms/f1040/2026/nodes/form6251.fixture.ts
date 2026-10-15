import { FilingStatus as F } from "../../nodes/types.ts";
import type { Form6251Input2026 } from "./form6251.ts";
import { syntheticIso2026 } from "../inputs/iso.fixture.ts";
export const amtFixture2026: Form6251Input2026 = {
  filing_status: F.Single,
  taxpayer_ssn: "111223333",
  line1a_deductions_without_senior: 16100,
  regular_tax_income: 133900,
  regular_taxable_income: 133900,
  regular_tax: 24734,
  taking_standard_deduction: true,
  line2a_taxes_paid: 16100,
  iso_sources_2026: syntheticIso2026(),
};
