import { registerSstbServiceCases } from "./form8995a_sstb_service_checks.ts";
import {
  sstbIdentityCases,
  sstbIdentityFixture,
} from "./form8995a_sstb_identity.fixture.ts";
registerSstbServiceCases(
  sstbIdentityCases,
  sstbIdentityFixture,
  "SSTB_IDENTITY_EVIDENCE",
);
