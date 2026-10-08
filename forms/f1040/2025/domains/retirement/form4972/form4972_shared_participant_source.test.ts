import { PDFDocument } from "pdf-lib";
import expected from "./form4972_shared_participant.expected.json" with {
  type: "json",
};
import { assertEquals, assertThrows } from "@std/assert";
import { pairedInputs } from "./form4972_paired_beneficiary_source.test.ts";
import { f1040_2025 } from "../../../index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { form4972 as native } from "../../../mef/forms/retirement/f4972.ts";
import { form4972Pdf } from "../../../pdf/forms/retirement/f4972.ts";
import { participantInventorySchema } from "../../../../nodes/intermediate/forms/form4972/participant-inventory.ts";

type Row = Record<string, unknown>;
function splitCents(total: number, count: number, index: number) {
  const units = Math.round(total * 100);
  return (Math.floor(units / count) + (index < units % count ? 1 : 0)) / 100;
}
export const sharedParticipantCases = [
  "combined",
  "primary-part3",
  "spouse-part3",
  "estate-only",
  "outside-beneficiary",
] as const;
export function sharedParticipantInputs(
  variant: typeof sharedParticipantCases[number] = "combined",
) {
  const input = pairedInputs();
  const plan = structuredClone(input.f1099r[0].form4972_plan);
  const recipients = [];
  for (
    const [owner, ssn, share, annuityShare] of [
      ["T", "123456789", 37.5, 22.5],
      ["S", "987654321", 62.5, 77.5],
    ] as const
  ) {
    const copies = input.f1099r.filter((r) => r.ts === owner);
    for (const [index, copy] of copies.entries()) {
      copy.form4972_plan = structuredClone(plan);
      copy.box9a_pct_total = share;
      copy.box8_pct_total = annuityShare;
      copy.box2a_taxable_amount = splitCents(
        50000 * share / 100,
        copies.length,
        index,
      );
      copy.box3_capital_gain = splitCents(
        10000 * share / 100,
        copies.length,
        index,
      );
      copy.box6_nua = splitCents(10000 * share / 100, copies.length, index);
      copy.box8_other = splitCents(
        12000 * annuityShare / 100,
        copies.length,
        index,
      );
      copy.box1_gross_distribution =
        Math.round((copy.box2a_taxable_amount + copy.box6_nua) * 100) / 100;
    }
    recipients.push({
      recipient_ssn: ssn,
      cash_share_pct: share,
      annuity_share_pct: annuityShare,
      source_copies: copies.map((c) => ({
        source_document_reference: c.source_document_reference,
        box2a_taxable_amount: c.box2a_taxable_amount,
        box3_capital_gain: c.box3_capital_gain,
        box6_nua: c.box6_nua,
        box8_other: c.box8_other,
      })),
    });
  }
  const inventory = participantInventorySchema.parse({
    administrator_statement_reference:
      "shared-plan-complete-administrator-inventory",
    full_cash_distribution: 60000,
    full_annuity_value: 12000,
    recipients,
  });
  for (const copy of input.f1099r) {
    Object.assign(copy.form4972_plan, {
      participant_distribution_inventory: structuredClone(inventory),
    });
  }
  for (const [index, e] of input.form4972.elections.entries()) {
    const share = index === 0 ? 37.5 : 62.5;
    const ssn = index === 0 ? "123456789" : "987654321";
    e.participant_name = plan.participant_name;
    e.participant_ssn = plan.participant_ssn;
    e.plan_reference = plan.plan_reference;
    e.death_benefit_exclusion_source_reference = "shared-plan-death-allocation";
    e.death_benefit_recipient_allocated_amount = index === 0 ? 1875 : 3124.99;
    e.death_benefit_allocation = {
      participant_ssn: plan.participant_ssn,
      elected_recipient_ssn: ssn,
      recipients: [
        { recipient_ssn: "123456789", share_pct: 37.5, excluded_amount: 1875 },
        {
          recipient_ssn: "987654321",
          share_pct: 62.5,
          excluded_amount: 3124.99,
        },
      ],
    };
    e.partial_estate_tax_source = {
      administrator_statement_reference: "shared-plan-estate-allocation",
      estate_tax_return_reference: "shared-plan-706-workpaper",
      full_distribution_taxable_amount: 60000,
      full_distribution_federal_estate_tax: 2000.03,
      recipient_allocated_federal_estate_tax: Math.round(2000.03 * share) / 100,
    };
  }
  if (variant === "outside-beneficiary") {
    const spouse = input.f1099r.filter((r) => r.ts === "S");
    for (const [index, c] of spouse.entries()) {
      c.box9a_pct_total = 37.5;
      c.box8_pct_total = 41.375;
      c.box2a_taxable_amount = splitCents(18750, spouse.length, index);
      c.box3_capital_gain = splitCents(3750, spouse.length, index);
      c.box6_nua = splitCents(3750, spouse.length, index);
      c.box8_other = splitCents(4965, spouse.length, index);
      c.box1_gross_distribution =
        Math.round((c.box2a_taxable_amount + c.box6_nua) * 100) / 100;
    }
    const other = {
      recipient_ssn: "222334444",
      cash_share_pct: 25,
      annuity_share_pct: 36.125,
      source_copies: [{
        source_document_reference: "outside-beneficiary-issued",
        box2a_taxable_amount: 12500,
        box3_capital_gain: 2500,
        box6_nua: 2500,
        box8_other: 4335,
      }],
    };
    const revised = participantInventorySchema.parse({
      ...inventory,
      recipients: [inventory.recipients[0], {
        recipient_ssn: "987654321",
        cash_share_pct: 37.5,
        annuity_share_pct: 41.375,
        source_copies: spouse.map((c) => ({
          source_document_reference: c.source_document_reference,
          box2a_taxable_amount: c.box2a_taxable_amount,
          box3_capital_gain: c.box3_capital_gain,
          box6_nua: c.box6_nua,
          box8_other: c.box8_other,
        })),
      }, other],
    });
    for (const c of input.f1099r) {
      Object.assign(c.form4972_plan, {
        participant_distribution_inventory: structuredClone(revised),
      });
    }
    for (const e of input.form4972.elections) {
      e.death_benefit_exclusion = 4999.92;
      e.death_benefit_recipient_allocated_amount = 1874.97;
      e.death_benefit_allocation!.recipients = [
        {
          recipient_ssn: "123456789",
          share_pct: 37.5,
          excluded_amount: 1874.97,
        },
        {
          recipient_ssn: "987654321",
          share_pct: 37.5,
          excluded_amount: 1874.97,
        },
        { recipient_ssn: "222334444", share_pct: 25, excluded_amount: 1249.98 },
      ];
      e.partial_estate_tax_source!.recipient_allocated_federal_estate_tax =
        750.01;
    }
  }
  if (variant === "primary-part3") {
    input.form4972.elections[0].elect_capital_gain = false;
  }
  if (variant === "spouse-part3") {
    input.form4972.elections[1].elect_capital_gain = false;
  }
  if (variant === "estate-only") {
    for (const e of input.form4972.elections) {
      delete e.death_benefit_exclusion;
      delete e.death_benefit_recipient_allocated_amount;
      delete e.death_benefit_exclusion_source_reference;
      delete e.death_benefit_allocation;
      e.participant_died_before_1996_08_21 = false;
    }
  }
  return input;
}
Deno.test("shared participant spouse beneficiaries reconcile complete administrator pools", () => {
  const input = sharedParticipantInputs();
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const filer = extractFilerIdentity(input.general)!;
  const xml = native.build(result.pending.form4972!, {
    filer,
    pending: result.pending,
  });
  assertEquals(xml.length, 2);
  const pages = form4972Pdf.instances!(
    result.pending.form4972!,
    filer,
    result.pending,
  );
  assertEquals(pages.length, 2);
  assertEquals(
    Number(pages[0].line30) + Number(pages[1].line30),
    result.pending.f1040!.form4972_tax,
  );
});
Deno.test("shared participant administrator conflicts reject before filing", () => {
  const mutations: [
    string,
    (input: ReturnType<typeof sharedParticipantInputs>) => void,
  ][] = [
    ["changed full cash pool", (i) => {
      for (const r of i.f1099r) {
        const plan = r.form4972_plan as Row;
        const inv = plan.participant_distribution_inventory as Row;
        inv.full_cash_distribution = 60001;
      }
    }],
    ["changed full annuity pool", (i) => {
      for (const r of i.f1099r) {
        const plan = r.form4972_plan as Row;
        const inv = plan.participant_distribution_inventory as Row;
        inv.full_annuity_value = 12001;
      }
    }],
    ["administrator recipient identity changed", (i) => {
      for (const r of i.f1099r) {
        const inv = (r.form4972_plan as Row)
          .participant_distribution_inventory as Row;
        (inv.recipients as Row[])[1].recipient_ssn = "111223333";
      }
    }],
    ["administrator cash shares incomplete", (i) => {
      for (const r of i.f1099r) {
        const inv = (r.form4972_plan as Row)
          .participant_distribution_inventory as Row;
        (inv.recipients as Row[])[0].cash_share_pct = 40;
      }
    }],
    ["administrator duplicate issued references", (i) => {
      for (const r of i.f1099r) {
        const inv = (r.form4972_plan as Row)
          .participant_distribution_inventory as Row;
        const rows = inv.recipients as Row[];
        const a = rows[0].source_copies as Row[],
          b = rows[1].source_copies as Row[];
        b[0].source_document_reference = a[0].source_document_reference;
      }
    }],
    ["missing complete inventory", (i) => {
      delete (i.f1099r[0].form4972_plan as Row)
        .participant_distribution_inventory;
    }],
    ["changed issued taxable amount", (i) => {
      i.f1099r[0].box2a_taxable_amount += 1;
      i.f1099r[0].box1_gross_distribution += 1;
    }],
    ["missing spouse copy", (i) => {
      i.f1099r.pop();
    }],
    ["different plan full balance", (i) => {
      i.f1099r[2].form4972_plan.full_balance_statement_reference =
        "wrong-balance";
    }],
    ["different death source", (i) => {
      i.form4972.elections[1].death_benefit_exclusion_source_reference =
        "wrong-death-source";
    }],
    ["different full estate source", (i) => {
      i.form4972.elections[1].partial_estate_tax_source!
        .full_distribution_federal_estate_tax = 2000.04;
    }],
  ];
  for (const [label, mutate] of mutations) {
    const input = sharedParticipantInputs();
    mutate(input);
    assertEquals(
      f1040_2025.executeReturn(input).diagnostics.length > 0,
      true,
      label,
    );
  }
});

Deno.test("shared participant final native and PDF reject changed administrator records", () => {
  const input = sharedParticipantInputs();
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const filer = extractFilerIdentity(input.general)!;
  const changes: ((p: typeof result.pending) => void)[] = [
    (p) => {
      const copies = p.f1099r!.f1099rs as Row[];
      copies[0].box2a_taxable_amount = Number(copies[0].box2a_taxable_amount) +
        1;
    },
    (p) => {
      const plan = (p.f1099r!.f1099rs as Row[])[0].form4972_plan as Row;
      delete plan.participant_distribution_inventory;
    },
    (p) => {
      const groups = p.form4972!.source_forms as Row[];
      (groups[1].form4972_plan as Row).full_balance_statement_reference =
        "changed";
    },
    (p) => {
      const elections = p.form4972!.elections as Row[];
      elections[1].death_benefit_exclusion_source_reference = "changed";
    },
  ];
  for (const mutate of changes) {
    const p = structuredClone(result.pending);
    mutate(p);
    assertThrows(() => native.build(p.form4972!, { filer, pending: p }));
    assertThrows(() => form4972Pdf.instances!(p.form4972!, filer, p));
  }
});

Deno.test("shared participant public packets match independent worksheets and full XSD", async () => {
  const dir = ".state/research/2026-10-06-form4972-shared-participant";
  await Deno.mkdir(dir, { recursive: true });
  const xsd =
    ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
  for (const id of sharedParticipantCases) {
    const input = sharedParticipantInputs(id),
      result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, [], id);
    const forms = result.pending.form4972!.forms as Row[];
    let total = 0;
    for (const [index, form] of forms.entries()) {
      const oracle = (expected as Record<string, Row>)[id + "-" + index];
      for (const [key, value] of Object.entries(oracle)) {
        assertEquals(form[key], value, id + ":" + index + ":" + key);
      }
      total += Number(oracle.line30);
    }
    assertEquals(result.pending.f1040!.form4972_tax, total);
    const prepared = await f1040_2025.prepareReturn!(
      result.pending,
      extractFilerIdentity(input.general)!,
    );
    const path = dir + "/" + id;
    await Deno.writeTextFile(
      path + ".json",
      JSON.stringify({ input, pending: result.pending }, null, 2),
    );
    await Deno.writeTextFile(path + ".xml", prepared.bundle.xml);
    assertEquals((prepared.bundle.xml.match(/<IRS4972\b/g) ?? []).length, 2);
    assertEquals((prepared.bundle.xml.match(/<IRS1099R\b/g) ?? []).length, 5);
    const pdf = await prepared.renderPdf();
    await Deno.writeFile(path + ".pdf", pdf);
    const document = await PDFDocument.load(pdf);
    assertEquals(document.getPageCount(), 4);
    assertEquals(document.getForm().getFields().length, 0);
    const validated = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path + ".xml"],
      stderr: "piped",
    }).output();
    assertEquals(validated.code, 0, new TextDecoder().decode(validated.stderr));
    const text = await new Deno.Command("pdftotext", {
      args: ["-layout", path + ".pdf", path + ".txt"],
      stderr: "piped",
    }).output();
    assertEquals(text.code, 0);
  }
});
