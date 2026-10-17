import { passiveInventoryFixture } from "./form8582cr_overflow.fixture.ts";

export const passiveRentalCases = [
  { rentals: 2, net: 10000, count: 2, credit: 100, regular: 15655 },
  { rentals: 3, net: 20000, count: 15, credit: 100, regular: 17867 },
  { rentals: 4, net: 30000, count: 16, credit: 500, regular: 20267 },
  { rentals: 7, net: 20000, count: 31, credit: 500, regular: 17867 },
] as const;

export function passiveRentalFixture(c: typeof passiveRentalCases[number]) {
  const base = passiveInventoryFixture(c);
  const rentals = Array.from({ length: c.rentals }, (_, i) => {
    const net = Math.floor(c.net / c.rentals) + (i < c.net % c.rentals ? 1 : 0);
    return {
      ...base.input.schedule_e[0],
      activity_id: `rental-${i + 1}`,
      passive_income_source_document_reference: `2025 rental ${i + 1} ledger`,
      property_description: `Rental property ${i + 1}`,
      street_address: `${10 + i} Rental Rd`,
      rent_income: net + 500 + i * 25,
      expense_insurance: 300,
      expense_repairs: 200 + i * 25,
    };
  });
  const allowed = Math.min(base.expected.total, c.regular - 13455);
  return {
    id: `passive-rentals-${c.rentals}`,
    input: {
      ...base.input,
      schedule_e: rentals,
      form8582cr: {
        ...base.input.form8582cr,
        regular_tax_all_income: c.regular,
        line6_ordinary_worksheet: {
          tax_year: 2025 as const,
          tax_method: "ordinary" as const,
          net_passive_income: c.net,
          taxable_income_including_passive: 84250 + c.net,
          taxable_income_without_passive: 84250,
          tax_including_passive: c.regular,
          tax_without_passive: 13455,
          passive_income_sources: rentals.map((r) => ({
            tsj: r.tsj,
            activity_id: r.activity_id,
            passive_income_source_document_reference:
              r.passive_income_source_document_reference,
            net_passive_income: r.rent_income - r.expense_insurance -
              r.expense_repairs,
          })).reverse(),
        },
      },
    },
    expected: {
      total: base.expected.total,
      allowed,
      unused: base.expected.total - allowed,
      tax: c.regular - allowed,
    },
  };
}
