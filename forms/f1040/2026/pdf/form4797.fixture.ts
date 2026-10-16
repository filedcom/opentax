import { landDispositionFixture2026 } from "../inputs/land-disposition.fixture.ts";
export function landPdfOverflowFixture2026(count = 14) {
  const f = landDispositionFixture2026(), base = f.claim.sales[0];
  f.claim.sales = Array.from({ length: count }, (_, i) => {
    const s = structuredClone(base), id = String(i + 1).padStart(3, "0");
    s.sale_reference = `sale-${id}`;
    s.property_reference = `parcel-${id}`;
    s.acquisition_record_reference = `purchase-${id}`;
    s.closing.closing_record_reference = `closing-${id}`;
    s.closing.selling_expenses[0].record_reference = `commission-${id}`;
    s.description =
      `Parcel ${id}: north boundary and adjoining access land held for the reviewed business throughout ownership`;
    if (i % 2) s.acquired_on = "2026-01-01";
    s.closing.gross_sales_price = 100000 + i;
    s.purchase_price = 50000;
    return s;
  });
  return f;
}
