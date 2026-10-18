import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { k1_trust } from "../../../income/rental-passthrough/k1_trust/index.ts";
import { f3468 } from "./index.ts";
import {
  trustForm3468PartVFixture,
  trustK1PartVFixture,
  trustPartVStatementFixture,
} from "./trust-part-v.fixture.ts";
import { assertTrustPartVReturnYear } from "./trust-part-v-source.ts";

const context = { taxYear: 2025, formType: "f1040" };

test("trust K-1 box 14 code M routes reviewed property facts to Form 3468", () => {
  const result = k1_trust.compute(
    context,
    k1_trust.inputSchema.parse(trustK1PartVFixture),
  );
  const claim = result.outputs.find((row) => row.nodeType === "f3468");
  assertEquals(
    claim?.fields.trust_part_v_claims,
    trustForm3468PartVFixture.trust_part_v_claims,
  );
  assertEquals(result.outputs.some((row) => row.nodeType === "f3800"), false);
});

test("Form 3468 derives 30% credit and sends it to Form 3800 line 1v source", () => {
  const result = f3468.compute(
    context,
    f3468.inputSchema.parse(trustForm3468PartVFixture),
  );
  assertEquals(result.outputs, [{
    nodeType: "f3800",
    fields: {
      f3468_trust_part_v_credit_entries: [{
        source_type: "trust",
        source_ein: "123456789",
        source_document_reference: "trust-k1-2025",
        source_statement_reference: "solar-property-statement-2025",
        credit_amount: 3_000,
        subject_to_passive_activity_limit: false,
      }],
    },
  }]);
});

test("Form 3468 rejects a changed review packet and direct-credit mix", () => {
  const { not_section48d_lessee_confirmed: _missing, ...withoutLesseeReview } =
    trustPartVStatementFixture;
  assertThrows(() =>
    f3468.inputSchema.parse({
      ...trustForm3468PartVFixture,
      trust_part_v_claims: [{
        ...trustForm3468PartVFixture.trust_part_v_claims[0],
        statement: withoutLesseeReview,
      }],
      trust_part_v_source_reviews: [withoutLesseeReview],
    })
  );
  assertThrows(
    () =>
      f3468.compute(
        context,
        f3468.inputSchema.parse({
          ...trustForm3468PartVFixture,
          trust_part_v_source_reviews: [{
            ...trustPartVStatementFixture,
            issuer_pdf_sha256: "b".repeat(64),
          }],
        }),
      ),
    Error,
    "separate reviewed property-statement packet",
  );
  assertThrows(
    () =>
      f3468.compute(
        context,
        f3468.inputSchema.parse({
          ...trustForm3468PartVFixture,
          clean_electricity_basis: 10_000,
        }),
      ),
    Error,
    "cannot mix",
  );
});

test("K-1 box 13 code M cannot be relabeled as clean electricity", () => {
  assertThrows(() =>
    k1_trust.compute(
      context,
      k1_trust.inputSchema.parse({
        k1_trusts: [{
          ...trustK1PartVFixture.k1_trusts[0],
          box13_code_m_clean_electricity_investment_credit: 3_000,
        }],
      }),
    )
  );
});

// Instructions for Form 3468 (2026), Part V: construction begun after 2025
// needs a material assistance cost ratio (Notice 2026-15).
test("trust Part V reads the return year's service and construction dates", () => {
  const in2026 = {
    ...trustPartVStatementFixture,
    construction_started_on: "2025-06-01",
    placed_in_service_on: "2026-03-01",
  };
  assertTrustPartVReturnYear(in2026, 2026);
  assertThrows(
    () => assertTrustPartVReturnYear(trustPartVStatementFixture, 2026),
    Error,
    "needs a 2026 service date",
  );
  assertThrows(
    () =>
      assertTrustPartVReturnYear(
        { ...in2026, construction_started_on: "2026-01-15" },
        2026,
      ),
    Error,
    "material assistance cost ratio",
  );
});
