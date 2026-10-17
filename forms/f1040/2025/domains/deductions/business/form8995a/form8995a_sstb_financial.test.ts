import { registerSstbServiceCases } from "./form8995a_sstb_service_checks.ts";
import {
  sstbFinancialCases,
  sstbFinancialFixture,
} from "./form8995a_sstb_financial.fixture.ts";
registerSstbServiceCases(
  sstbFinancialCases,
  sstbFinancialFixture,
  "SSTB_FINANCIAL_EVIDENCE",
);
