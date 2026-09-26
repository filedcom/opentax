import { FilingStatus, type FilerIdentity } from "../../mef/header.ts";

export function testFiler(): FilerIdentity {
  return {
    primarySSN: "123456789",
    nameLine1: "TAXPAYER TEST",
    nameControl: "TAXP",
    address: {
      line1: "123 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    filingStatus: FilingStatus.Single,
  };
}
