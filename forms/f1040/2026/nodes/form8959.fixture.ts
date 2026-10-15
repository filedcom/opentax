import { FilingStatus } from "../../nodes/types.ts";
import type { Form8959Input2026 } from "./form8959.ts";
export function syntheticMedicare2026(): Form8959Input2026 {
  return {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    w2_medicare_sources_2026: [{
      employee_ssn: "111223333",
      employer_ein: "123456789",
      source_document_reference: "w2-fica",
      box5_medicare_wages: 250_000,
      box6_medicare_withheld: 4075,
      uncollected_fica_medicare: 0,
      rrta_compensation: 0,
      rrta_additional_withheld: 0,
    }],
  };
}
