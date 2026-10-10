import { passiveInventoryFixture } from "./form8582cr_overflow.fixture.ts";
import { passiveK1Item } from "../../earned-income/earned-income/eic_passive_k1.fixture.ts";

export const passiveK1IncomeCases = [
  {
    id: "four-row-boundary",
    count: 4,
    credit: 2000,
    incomeSources: 4,
    direct: 4000,
    bothBoxes: true,
  },
  {
    id: "partnership-rental",
    count: 2,
    credit: 100,
    incomeSources: 1,
    direct: 10000,
    bothBoxes: false,
  },
  {
    id: "mixed-two-boxes",
    count: 2,
    credit: 5000,
    incomeSources: 2,
    direct: 0,
    bothBoxes: true,
  },
  {
    id: "sixteen-mixed",
    count: 16,
    credit: 500,
    incomeSources: 16,
    direct: 4000,
    bothBoxes: true,
  },
  {
    id: "thirtyone-mixed",
    count: 31,
    credit: 100,
    incomeSources: 31,
    direct: 0,
    bothBoxes: false,
  },
] as const;

export function passiveK1IncomeFixture(c: typeof passiveK1IncomeCases[number]) {
  const base = passiveInventoryFixture(c);
  const input: any = base.input;
  input.schedule_e = c.direct
    ? input.schedule_e.map((r: any) => ({ ...r, rent_income: c.direct }))
    : [];
  const reviews: any[] = input.schedule_e.map((r: any) => ({
    tsj: r.tsj,
    activity_id: r.activity_id,
    passive_income_source_document_reference:
      r.passive_income_source_document_reference,
    net_passive_income: r.rent_income,
  }));
  const entities = [
    ...input.k1_partnership.map((item: any) => ({
      item,
      kind: "partnership" as const,
    })),
    ...input.k1_s_corp.map((item: any) => ({ item, kind: "s_corp" as const })),
  ];
  entities.slice(0, c.incomeSources).forEach(({ item, kind }, i) => {
    const net = Math.floor((20000 - c.direct) / c.incomeSources) +
      (i < (20000 - c.direct) % c.incomeSources ? 1 : 0);
    const ein = item.partnership_ein ?? item.corporation_ein;
    const box = c.bothBoxes || i % 2 === 0 ? "box2" : "box3";
    const income = passiveK1Item(
      kind,
      box,
      c.bothBoxes ? Math.floor(net / 2) : net,
      "111223333",
      ein,
    );
    delete income.box14a_se_earnings;
    delete income.partnership_name;
    delete income.corporation_name;
    if (c.bothBoxes) {
      const second = passiveK1Item(
        kind,
        "box3",
        net - Math.floor(net / 2),
        "111223333",
        ein,
      );
      income.box3_other_rental = second.box3_other_rental;
      income.eic_passive_activity_review.box3 = "passive";
      income.passive_income_source.activities.push(
        ...second.passive_income_source.activities,
      );
    }
    Object.assign(item, income);
    const credit = input.form8582cr.credit_sources.find((s: any) =>
      s.source_origin.ein === ein
    );
    credit.activity_reference = item.source_document_reference;
    credit.source_document_reference = item.source_document_reference;
    credit.source_origin.entity_reference = item.partnership_name ??
      item.corporation_name;
    for (const activity of item.passive_income_source.activities) {
      reviews.push({
        tsj: "T",
        activity_id: activity.activity_id,
        passive_income_source_document_reference:
          item.passive_income_source.activity_statement_reference,
        net_passive_income: activity.current_income,
        source_origin: {
          kind: kind === "partnership" ? "partnership" : "s_corporation",
          ein,
        },
      });
    }
  });
  const {
    activity_id: _id,
    passive_income_source_document_reference: _reference,
    ...taxSides
  } = input.form8582cr.line6_ordinary_worksheet;
  input.form8582cr.line6_ordinary_worksheet = {
    ...taxSides,
    passive_income_sources: reviews.reverse(),
  };
  return { id: `passive-k1-income-${c.id}`, input, expected: base.expected };
}
