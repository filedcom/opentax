import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { itemSchema, PficRegime } from "../../../nodes/inputs/f8621/index.ts";
import { projectForm8621ParentSource } from "../../form8621_parent_source.ts";
import { form8621 } from "../../mef/forms/f8621.ts";
import { projectForm8621Page1 } from "./f8621_parent_source.ts";

const parentSource = {
  corporation_address: {
    line1: "1 Fund Quay",
    city: "Dublin",
    country_code: "IE",
    postal_code: "D02 TEST",
  },
  corporation_tax_year_start: "2025-01-01",
  corporation_tax_year_end: "2025-12-31",
  share_classes: [{
    description: "Class A ordinary",
    year_end_shares: 100,
    year_end_value_usd: 20_000,
  }],
  jointly_owned_with_spouse: false,
  shares_acquired_during_2025: true,
  acquisition_date: "2025-03-17",
  election_status: "section1291_no_new_election",
  no_outstanding_section1294_election: true,
  issuer_record: {
    document_id: "issuer-2025-001",
    sha256: "a".repeat(64),
  },
};
const item = itemSchema.parse({
  company_name: "Euro Fund Ltd",
  company_ein_or_ref: "EURO001",
  country_of_incorporation: "Ireland",
  regime: PficRegime.EXCESS_DISTRIBUTION,
  shares_owned: 100,
  fmv_at_year_end: 20_000,
  parent_source: parentSource,
});

Deno.test("Form 8621 parent facts reconcile across source, native, and staged page 1", () => {
  const source = projectForm8621ParentSource(item);
  assertEquals(source.share_classes[0].year_end_shares, 100);
  const [native] = form8621.build({ items: [{ item, excessEvents: [] }] });
  assertStringIncludes(native, "<PFICOrQEFForeignAddress>");
  assertStringIncludes(
    native,
    "<ClassOfShareTxt>Class A ordinary</ClassOfShareTxt>",
  );
  assertStringIncludes(
    native,
    "<SharesAcquiredDt>2025-03-17</SharesAcquiredDt>",
  );
  const page = projectForm8621Page1(item);
  assertEquals(page["topmostSubform[0].Page1[0].f1_23[0]"], "Class A ordinary");
  assertEquals(page["topmostSubform[0].Page1[0].f1_25[0]"], "100");
  assertEquals(page["topmostSubform[0].Page1[0].c1_9[0]"], false);
});

Deno.test("Form 8621 parent source rejects changed shares, election, and acquisition facts", () => {
  assertThrows(
    () => projectForm8621ParentSource({ ...item, shares_owned: 101 }),
    Error,
    "share classes differ",
  );
  assertThrows(
    () =>
      projectForm8621ParentSource(
        {
          ...item,
          parent_source: {
            ...parentSource,
            election_status: "qef_new_2025",
          },
        } as typeof item,
      ),
    Error,
    "election source disagrees",
  );
  assertEquals(
    itemSchema.safeParse({
      ...item,
      parent_source: { ...parentSource, acquisition_date: undefined },
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...item,
      parent_source: {
        ...parentSource,
        issuer_record: { document_id: "issuer-2025-001", sha256: "bad" },
      },
    }).success,
    false,
  );
});
