import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { inspectTrustK1IssuedCopies } from "./trust-k1-issued-copy-review.ts";
import { buildMefXml } from "../../../../mef/builder.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { registry } from "../../../../registry.ts";

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Test",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  digital_assets: false,
  address_line1: "1 Test Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const filer = extractFilerIdentity(general)!;

async function fixture() {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const bytes = await pdf.save();
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  const sha256 = Array.from(hash, (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return {
    bytes,
    source: {
      k1_trusts: [{
        estate_trust_name: "Family Trust",
        estate_trust_ein: "123456789",
        source_document_reference: "2025 issued Family Trust K-1",
        beneficiary_ssn: "111223333",
        box13_code_b_backup_withholding: 125,
        box13_code_b_issued_copy_review: {
          pdf_reference: "family-trust-issued-k1.pdf",
          pdf_sha256: sha256,
          tax_year: 2025 as const,
          estate_trust_ein: "123456789",
          beneficiary_ssn: "111223333",
          box13_code_b_backup_withholding: 125,
        },
      }],
    },
  };
}

Deno.test("trust K-1 code B review binds exact PDF bytes but leaves printed content unverified", async () => {
  const { source, bytes } = await fixture();
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    k1_trust: source.k1_trusts,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.k1_trust.k1_trusts as typeof source.k1_trusts)[0]
      .box13_code_b_issued_copy_review,
    source.k1_trusts[0].box13_code_b_issued_copy_review,
  );
  const reviewed = await inspectTrustK1IssuedCopies(source, filer, [{
    reference: "family-trust-issued-k1.pdf",
    bytes,
  }]);
  assertEquals(reviewed[0].backupWithholding, 125);
  assertEquals(reviewed[0].beneficiarySsn, "111223333");
  assertEquals(reviewed[0].printedContentsVerified, false);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line25c_total, 125);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "trust K-1 backup withholding needs",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "trust K-1 backup withholding needs",
  );
  await assertRejects(
    () =>
      inspectTrustK1IssuedCopies(source, filer, [{
        reference: "family-trust-issued-k1.pdf",
        bytes: new Uint8Array([1, 2, 3]),
      }]),
    Error,
    "SHA-256",
  );
});

Deno.test("trust K-1 code B copy review rejects another beneficiary or altered amount", async () => {
  const { source, bytes } = await fixture();
  const document = [{ reference: "family-trust-issued-k1.pdf", bytes }];
  await assertRejects(
    () =>
      inspectTrustK1IssuedCopies(
        {
          k1_trusts: [{
            ...source.k1_trusts[0],
            beneficiary_ssn: "999887777",
            box13_code_b_issued_copy_review: {
              ...source.k1_trusts[0].box13_code_b_issued_copy_review,
              beneficiary_ssn: "999887777",
            },
          }],
        },
        filer,
        document,
      ),
    Error,
    "owned by this return",
  );
  await assertRejects(
    () =>
      inspectTrustK1IssuedCopies(
        {
          k1_trusts: [{
            ...source.k1_trusts[0],
            box13_code_b_issued_copy_review: {
              ...source.k1_trusts[0].box13_code_b_issued_copy_review,
              box13_code_b_backup_withholding: 124,
            },
          }],
        },
        filer,
        document,
      ),
    Error,
    "issued-copy review must match",
  );
});
