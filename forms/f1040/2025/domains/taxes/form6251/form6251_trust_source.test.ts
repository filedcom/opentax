import { assertThrows } from "@std/assert";
import { assertForm6251TrustSource } from "./form6251_trust_source.ts";

const copy = {
  estate_trust_name: "Example Trust",
  estate_trust_ein: "123456789",
  source_document_reference: "issued-k1-1",
  beneficiary_ssn: "111223333",
  box12_code_a_amt_adjustment: -800,
  box12_codes_b_through_f_absent: true,
  box12_codes_g_through_i_absent: true,
};

Deno.test("Form 6251 line 2j replays identified trust K-1 code A copies", () => {
  const fields = { line2j_estates_and_trusts: -800, line11_amt: 100 };
  const pending = {
    k1_trust: { k1_trusts: [copy] },
    schedule2: { line2_amt: 100 },
    f1040: {
      taxpayer_ssn: "111223333",
      line16_income_tax: 1_000,
      line17_additional_taxes: 100,
      line18_total_tax_before_credits: 1_100,
    },
  };
  assertForm6251TrustSource(fields, pending);
  for (
    const altered of [
      { ...copy, box12_code_a_amt_adjustment: -700 },
      { ...copy, box12_codes_b_through_f_absent: undefined },
      { ...copy, source_document_reference: undefined },
      { ...copy, beneficiary_ssn: "999887777" },
    ]
  ) {
    assertThrows(
      () =>
        assertForm6251TrustSource(fields, {
          ...pending,
          k1_trust: { k1_trusts: [altered] },
        }),
      Error,
      "beneficiary-owned trust K-1 code A sources",
    );
  }
  assertThrows(
    () => assertForm6251TrustSource({}, pending),
    Error,
    "beneficiary-owned trust K-1 code A sources",
  );
  assertThrows(
    () =>
      assertForm6251TrustSource(fields, {
        ...pending,
        k1_trust: {
          k1_trusts: [copy, copy],
        },
      }),
    Error,
    "beneficiary-owned trust K-1 code A sources",
  );
  for (
    const altered of [
      { ...pending, schedule2: { line2_amt: 99 } },
      {
        ...pending,
        f1040: { ...pending.f1040, line17_additional_taxes: 99 },
      },
    ]
  ) {
    assertThrows(() => assertForm6251TrustSource(fields, altered));
  }
});
