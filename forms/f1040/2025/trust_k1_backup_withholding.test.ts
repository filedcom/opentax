import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { extractFilerIdentity } from "../mef/filer.ts";
import { FilingStatus } from "../nodes/types.ts";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  digital_assets: false,
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

Deno.test("trust K-1 box 13 code B stays retained but cannot silently leave native or PDF export", async () => {
  const result = f1040_2025.executeReturn({
    general,
    k1_trust: [{
      estate_trust_name: "Family Trust",
      estate_trust_ein: "123456789",
      beneficiary_ssn: "111223333",
      source_document_reference: "2025 issued Family Trust K-1",
      box13_code_b_backup_withholding: 125,
    }],
  });
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const retained = pending.k1_trust as {
    k1_trusts: { box13_code_b_backup_withholding?: number }[];
  };
  assertEquals(
    retained.k1_trusts[0].box13_code_b_backup_withholding,
    125,
  );
  assertEquals(pending.f1040?.line25c_other_withheld ?? 0, 0);
  const filer = extractFilerIdentity(general);
  assertThrows(
    () => f1040_2025.buildMefXml(pending, filer),
    Error,
    "trust K-1 backup withholding",
  );
  await assertRejects(
    () => f1040_2025.buildPdfBytes(pending, filer),
    Error,
    "trust K-1 backup withholding",
  );
});
