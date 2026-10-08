import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  currentPropertyQbiRows,
  currentPropertySourceSchema,
} from "../../../../../nodes/inputs/income/rental-passthrough/schedule_e/current-property-source.ts";
import { f1040_2025 } from "../../../../index.ts";
import {
  passivePropertyCases,
  passivePropertyInputs,
} from "./eic_passive_property.fixture.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form4797 } from "../../../../mef/forms/income/business/f4797.ts";
import { form4797Pdf } from "../../../../pdf/forms/income/business/f4797.ts";
import { irs1040Pdf } from "../../../../pdf/forms/general/return-assembly/f1040.ts";
const xsd = new URL(
  "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
Deno.test("owned current passive property ordinary gains join actual farm PAL and qualified allowed-source QBI", async () => {
  const arg = Deno.args.indexOf("--write-review-artifacts"),
    out = arg < 0 ? undefined : Deno.args[arg + 1];
  for (const c of passivePropertyCases) {
    const inputs = c.inputs(),
      r = f1040_2025.executeReturn(inputs),
      p = normalizeAllPending(r.pending);
    assertEquals(r.diagnostics, [], c.id);
    assertEquals(p.f1040.line11_agi, c.agi, c.id);
    assertEquals(p.f1040.line27_eitc ?? 0, c.eic, c.id);
    assertEquals(p.f1040.line16_income_tax ?? 0, c.tax, c.id);
    assertEquals(p.f1040.line13_qbi_deduction ?? 0, c.qbi, c.id);
    assertEquals(p.form8995.line2, c.qbiNet, c.id);
    assertEquals(r.carryforwards.suspended_pal_8582 ?? 0, c.suspended, c.id);
    assertEquals(
      Object.entries(r.carryforwards).filter(([key]) =>
        key.startsWith("qualified_passive_loss_199a:")
      ).reduce((n, [, amount]) => n + Number(amount), 0),
      c.suspended,
      c.id,
    );
    const shouldHavePropertyPal = c.id.includes("negative_net");
    assertEquals(
      ((p.form8582?.activities ?? []) as any[]).some((row: any) =>
        row.activity_id === "current-rented-land"
      ),
      shouldHavePropertyPal,
      c.id,
    );
    if (!shouldHavePropertyPal) {
      assertEquals(p.form8582?.current_4797_sale_gains ?? [], [], c.id);
    }

    assertEquals(
      p.schedule1.line4_other_gains,
      inputs.schedule_e[0].current_property_source.closing_record.gross_paid -
        6000,
      c.id,
    );
    const filer = extractFilerIdentity(r.pending.f1040)!,
      bundle = await buildMefBundle(buildPending(r.pending), {
        filer,
        attachments: [],
      }),
      origins: any[] = [],
      pdf = await buildPdfBytes(
        bundle.pending,
        filer,
        undefined,
        bundle,
        origins,
      ),
      path = await Deno.makeTempFile({ suffix: ".xml" });
    await Deno.writeTextFile(path, bundle.xml);
    const v = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stderr: "piped",
    }).output();
    assertEquals(v.code, 0, new TextDecoder().decode(v.stderr));
    await Deno.remove(path);
    if (out) {
      const dir = `${out}/${c.id}`;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeTextFile(
        `${dir}/source-pending.json`,
        JSON.stringify(
          {
            inputs,
            filer,
            pending: p,
            preparedPending: bundle.pending,
            carryforwards: r.carryforwards,
            origins,
            expected: {
              agi: c.agi,
              eic: c.eic,
              tax: c.tax,
              suspended: c.suspended,
              qbi: c.qbi,
              qbiNet: c.qbiNet,
            },
          },
          null,
          2,
        ),
      );
    }
  }
});
Deno.test("current property gain owner, asset, sale, activity, PAL and QBI export conflicts reject", async () => {
  const r = f1040_2025.executeReturn(passivePropertyInputs()),
    p = normalizeAllPending(r.pending),
    filer = extractFilerIdentity(r.pending.f1040)!;
  assertEquals(r.diagnostics, []);
  await buildMefBundle(buildPending(r.pending), { filer, attachments: [] });
  const mutations: Array<[string, (p: any) => void]> = [
    ["unjoined-retained-lease", (g) => {
      g.schedule_e.schedule_es[0].current_property_source
        .retained_interest_record
        .retained_lease_reference = "unsupported continuing lease";
    }],
    ["duplicated-rent-deposit-and-matched-economics", (g) => {
      const item = g.schedule_e.schedule_es[0];
      item.current_property_source.rent_payments.push(
        structuredClone(item.current_property_source.rent_payments[0]),
      );
      item.rent_income *= 2;
    }],
    ["duplicated-tax-payment-and-matched-economics", (g) => {
      const item = g.schedule_e.schedule_es[0];
      item.current_property_source.property_tax_payments.push(
        structuredClone(item.current_property_source.property_tax_payments[0]),
      );
      item.expense_taxes *= 2;
    }],
    ["duplicated-assessment-new-payment-id", (g) => {
      const item = g.schedule_e.schedule_es[0];
      const row = structuredClone(
        item.current_property_source.property_tax_payments[0],
      );
      row.payment_reference += " other payment";
      item.current_property_source.property_tax_payments.push(row);
      item.expense_taxes *= 2;
    }],
    ["duplicated-parcel-lease", (g) => {
      const s = g.schedule_e.schedule_es[0].current_property_source;
      s.lease_records.push(structuredClone(s.lease_records[0]));
    }],
    ["overlapping-parcel-lease", (g) => {
      const s = g.schedule_e.schedule_es[0].current_property_source;
      const row = structuredClone(s.lease_records[1]);
      row.lease_reference += " second instrument";
      row.started_on = "2025-06-01";
      s.lease_records.push(row);
    }],
    ["multiparcel-lease-conflicting-tenant", (g) => {
      g.schedule_e.schedule_es[0].current_property_source.lease_records[1]
        .tenant_tin = "999887777";
    }],
    ["rent-outside-lease-period", (g) => {
      g.schedule_e.schedule_es[0].current_property_source.rent_payments[0]
        .paid_on = "2025-12-01";
    }],
    [
      "detached-property-source",
      (g) => delete g.schedule_e.schedule_es[0].current_property_source,
    ],
    [
      "sold-basis",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source.acquisition_record
          .parcels[0].allocated_purchase_cost++,
    ],
    [
      "closing-proceeds",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source.closing_record
          .gross_paid++,
    ],
    [
      "retained-interest",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source
          .retained_interest_record.remaining_parcel_ids = ["land-sold"],
    ],
    [
      "owner",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source.recipient_tin =
          "999887777",
    ],
    [
      "operating-payment",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source
          .property_tax_payments[0].amount++,
    ],
    [
      "acquisition",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source.acquisition_record
          .acquired_on = "2025-02-01",
    ],
    [
      "impossible-date",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source.closing_record
          .sold_on = "2025-02-30",
    ],
    [
      "source-document",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source.closing_record
          .closing_reference += " changed",
    ],
    [
      "unjoined-property",
      (g) =>
        g.schedule_e.schedule_es.push({
          ...g.schedule_e.schedule_es[0],
          activity_id: "phantom",
        }),
    ],
    [
      "ledger-owner-source",
      (g) =>
        g.form8995.current_passive_property_sources[0].recipient_tin =
          "999887777",
    ],
    ["qbi-zero", (g) => g.form8995.line2 = 1],
    ["missing-qbi", (g) => delete g.form8995],
    ["missing-pal", (g) => delete g.form8582],
    ["allowed-pal", (g) => g.form8582.current_loss++],
    [
      "sale-pool",
      (g) =>
        g.form8582.current_4797_sale_gains = [{
          activity_id: "current-rented-land",
          activity_name: "Current rented land trade",
          part: "II",
          gain: 3000,
          entire_activity_interest_disposed: false,
        }],
    ],
    [
      "activity-kind",
      (g) => g.form8582.activities[0].reporting_form = "schedule_e",
    ],
    ["agi", (g) => g.f1040.line11_agi++],
    ["ordinary-income", (g) => g.schedule1.line4_other_gains++],
    ["allowed-scheduleE", (g) => g.schedule1.line5_schedule_e++],
    [
      "farm-qbi",
      (g) =>
        g.form8995.current_passive_farm_qbi_sources[0].current_repairs[0]
          .amount++,
    ],
    [
      "depreciation",
      (g) => g.form4797.passive_property_sales[0].depreciation_allowed = 1,
    ],
    [
      "ordinary-character",
      (g) => g.form4797.passive_property_sales[0].part = "I",
    ],
  ];
  for (const [label, mutate] of mutations) {
    const g = structuredClone(p);
    mutate(g);
    await assertRejects(
      () => buildMefBundle(buildPending(g), { filer, attachments: [] }),
      Error,
      undefined,
      label,
    );
    assertThrows(
      () => form4797.build(g.form4797, { pending: g }),
      Error,
      undefined,
      label,
    );
    assertThrows(
      () => form4797Pdf.projectFields!(g.form4797, g),
      Error,
      undefined,
      label,
    );
    assertThrows(
      () => irs1040Pdf.projectFields!(g.f1040, g),
      Error,
      undefined,
      label,
    );
  }
  const wrong = passivePropertyInputs();
  wrong.schedule_e[0].current_property_source.recipient_tin = "999887777";
  assertEquals(f1040_2025.executeReturn(wrong).diagnostics.length > 0, true);
});

Deno.test("current property source rejects repeated economic records and requires an owned retained lease", () => {
  const valid = passivePropertyInputs();
  const source = valid.schedule_e[0].current_property_source;
  // Same actual instrument legitimately covers two distinct parcels.
  currentPropertySourceSchema.parse(source);
  const edits: Array<[string, (s: any) => void]> = [
    [
      "rent deposit",
      (s) => s.rent_payments.push(structuredClone(s.rent_payments[0])),
    ],
    ["tax payment", (s) => {
      const r = structuredClone(s.property_tax_payments[0]);
      r.assessment_reference += " different assessment";
      s.property_tax_payments.push(r);
    }],
    ["tax assessment", (s) => {
      const r = structuredClone(s.property_tax_payments[0]);
      r.payment_reference += " different payment";
      s.property_tax_payments.push(r);
    }],
    [
      "parcel period",
      (s) => s.lease_records.push(structuredClone(s.lease_records[0])),
    ],
    [
      "retained lease",
      (s) =>
        s.retained_interest_record.retained_lease_reference = "unjoined lease",
    ],
    ["retained lease starts after sale", (s) => {
      s.lease_records[1].started_on = "2025-06-02";
    }],
    ["lease tenant", (s) => s.lease_records[1].tenant_tin = "999887777"],
    ["rent outside period", (s) => s.rent_payments[0].paid_on = "2025-12-01"],
  ];
  for (const [label, edit] of edits) {
    const inputs = structuredClone(valid);
    const row = inputs.schedule_e[0].current_property_source;
    edit(row);
    assertEquals(
      currentPropertySourceSchema.safeParse(row).success,
      false,
      label,
    );
    assertEquals(
      f1040_2025.executeReturn(inputs).diagnostics.length > 0,
      true,
      label,
    );
  }
});

Deno.test("current property inventory rejects relabeled duplicate economics across activities", async () => {
  const inputs = passivePropertyInputs();
  const first = inputs.schedule_e[0].current_property_source;
  const rename = (value: any): any => {
    if (Array.isArray(value)) return value.map(rename);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, rename(v)]),
      );
    }
    if (
      typeof value === "string" && !/^\d{9}$/.test(value) &&
      !/^\d{4}-\d{2}-\d{2}$/.test(value) && value !== "TX"
    ) return `${value} two`;
    return value;
  };
  const second = currentPropertySourceSchema.parse(rename(first));
  const itemFor = (source: any) => {
    const item = structuredClone(inputs.schedule_e[0]);
    item.activity_id = source.activity_id;
    item.property_description = source.activity_name;
    item.current_property_source = source;
    Object.assign(item.first_year_activity_source, {
      activity_id: source.activity_id,
      activity_name: source.activity_name,
      acquisition_document_reference:
        source.acquisition_record.closing_reference,
    });
    Object.assign(item.passive_property_sales[0], {
      activity_id: source.activity_id,
      activity_name: source.activity_name,
      property_description:
        source.acquisition_record.parcels[0].property_description,
      disposition_document_reference: source.closing_record.closing_reference,
    });
    return item;
  };
  const positive = structuredClone(inputs);
  positive.schedule_e.push(itemFor(second));
  const result = f1040_2025.executeReturn(positive);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line11_agi, 9000);
  const p = normalizeAllPending(result.pending),
    filer = extractFilerIdentity(result.pending.f1040)!;
  await buildMefBundle(buildPending(p), { filer, attachments: [] });
  const edits: Array<[string, (s: any) => void]> = [
    ["owned parcels", (s) => {
      s.acquisition_record.parcels[0].parcel_id =
        first.acquisition_record.parcels[0].parcel_id;
      s.closing_record.parcel_id = first.closing_record.parcel_id;
      s.lease_records[0].parcel_id = first.lease_records[0].parcel_id;
    }],
    [
      "receipt references",
      (s) =>
        s.closing_record.deposit_reference =
          first.closing_record.deposit_reference,
    ],
    [
      "payment references",
      (s) =>
        s.acquisition_record.payment_reference =
          first.acquisition_record.payment_reference,
    ],
    [
      "tax assessment references",
      (s) =>
        s.property_tax_payments[0].assessment_reference =
          first.property_tax_payments[0].assessment_reference,
    ],
  ];
  for (const [kind, edit] of edits) {
    const changed = structuredClone(second);
    edit(changed);
    currentPropertySourceSchema.parse(changed);
    assertThrows(
      () => currentPropertyQbiRows([first, changed]),
      Error,
      `repeat ${kind}`,
    );
    const bad = structuredClone(inputs);
    bad.schedule_e.push(itemFor(changed));
    assertEquals(
      f1040_2025.executeReturn(bad).diagnostics.length > 0,
      true,
      kind,
    );
  }
  const otherOwnerDuplicate = structuredClone(first);
  otherOwnerDuplicate.activity_id = "same-parcels-other-owner";
  otherOwnerDuplicate.recipient_tin = "222334444";
  assertThrows(
    () => currentPropertyQbiRows([first, otherOwnerDuplicate]),
    Error,
    "repeat owned parcels",
  );
  // Keep all scalar amounts and every embedded inventory synchronized. Native
  // and PDF must independently reject the same duplicate economic receipt.
  const badPending: any = structuredClone(p);
  const duplicateReference = first.closing_record.deposit_reference;
  badPending.schedule_e.schedule_es[1].current_property_source.closing_record
    .deposit_reference = duplicateReference;
  badPending.form4797.current_property_sources[1].closing_record
    .deposit_reference = duplicateReference;
  badPending.form8995.current_passive_property_sources[1].closing_record
    .deposit_reference = duplicateReference;
  await assertRejects(
    () => buildMefBundle(buildPending(badPending), { filer, attachments: [] }),
    Error,
    "repeat receipt references",
  );
  assertThrows(
    () => form4797Pdf.projectFields!(badPending.form4797, badPending),
    Error,
    "repeat receipt references",
  );
  assertThrows(
    () => irs1040Pdf.projectFields!(badPending.f1040, badPending),
    Error,
    "repeat receipt references",
  );
  const joint = passivePropertyCases.find((c) =>
    c.id === "property_joint_spouse_owned"
  )!;
  const jointInputs = joint.inputs();
  const jointResult = f1040_2025.executeReturn(jointInputs);
  assertEquals(jointResult.diagnostics, []);
  const jointPending = normalizeAllPending(jointResult.pending);
  const jointFiler = extractFilerIdentity(jointResult.pending.f1040)!;
  await buildMefBundle(buildPending(jointPending), {
    filer: jointFiler,
    attachments: [],
  });
  for (const side of ["buyer", "seller"] as const) {
    const record = side === "buyer" ? "closing_record" : "acquisition_record";
    const field = `${side}_tin`;
    const badInputs: any = structuredClone(jointInputs);
    badInputs.schedule_e[0].current_property_source[record][field] =
      "111223333";
    assertEquals(
      f1040_2025.executeReturn(badInputs).diagnostics.length > 0,
      true,
      side,
    );
    const bad: any = structuredClone(jointPending);
    for (
      const source of [
        bad.schedule_e.schedule_es[0].current_property_source,
        bad.form4797.current_property_sources[0],
        bad.form8995.current_passive_property_sources[0],
      ]
    ) {
      source[record][field] = "111223333";
    }
    const message = "transfer between return owners";
    await assertRejects(
      () =>
        buildMefBundle(buildPending(bad), {
          filer: jointFiler,
          attachments: [],
        }),
      Error,
      message,
    );
    assertThrows(
      () => form4797Pdf.projectFields!(bad.form4797, bad),
      Error,
      message,
    );
    assertThrows(
      () => irs1040Pdf.projectFields!(bad.f1040, bad),
      Error,
      message,
    );
  }
});
