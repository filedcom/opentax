import { registerSstbServiceCases } from "./form8995a_sstb_service_checks.ts";
import {
  sstbProfessionalCases,
  sstbProfessionalFixture,
} from "./form8995a_sstb_professional.fixture.ts";
registerSstbServiceCases(
  sstbProfessionalCases,
  sstbProfessionalFixture,
  "SSTB_PROFESSIONAL_EVIDENCE",
);
