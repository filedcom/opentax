import { registerSstbServiceCases } from "./form8995a_sstb_service_checks.ts";
import {
  sstbServiceCases,
  sstbServiceFixture,
} from "./form8995a_sstb_services.fixture.ts";
registerSstbServiceCases(
  sstbServiceCases,
  sstbServiceFixture,
  "SSTB_SERVICE_EVIDENCE",
);
