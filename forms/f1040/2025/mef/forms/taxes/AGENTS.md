# 2025/mef/forms/taxes

Native MeF serializers for the Taxes section, one `MefFormDescriptor` per IRS
document, grouped like the nodes. Which node feeds each `pendingKey`: [section
map](../../../../nodes/inputs/taxes/AGENTS.md).

- `pendingKey` is the node type, not the form number: `form6251`, `form4137`,
  `form8919`, `form8959`, `form8960`, `form8615`, `form4972`, `form5329`,
  `schedule_se`, `schedule_h`, `schedule_j`, `schedule2`, `f4255`, `f8611`,
  `f8828`, `f965`, `f8978`, `f2210f`. Extra documents have their own keys:
  `form8978_schedule_a`, `f965_multiple_transferee_statement`,
  `f965_net_adjustment_transfer_statement`, `any_other_taxes_statement`
  (Schedule 2 line 17z).
- Not in `ALL_MEF_FORMS` (`../index.ts`): `credit-recapture/f8828.ts` (staged)
  and `underpayment/f2210_box_e.ts` (a builder used only by
  `domains/taxes/underpayment/form2210/form2210_box_e_staged_chain.ts`).
- Source reconcilers kept here rather than in `domains/`:
  `credit-recapture/f8611_issuer_source.ts` (the PDF imports it too) and
  `f8828_source_reconciliation.ts`; `passthrough/f8978_statement.ts` builds
  the Form 8978 statements.
- `other/schedule2.ts` imports pure helpers from nodes in other sections
  (`f1099nec`, `f8621/section1294.ts`, `f8874/recapture_node.ts`);
  `employment/f8959.ts` throws without finalized `schedule2`/`f1040` slots.

## Verify

- `bun test ./forms/f1040/2025/mef/forms/taxes --timeout=1800000` (some cases
  skip without the private XSD).
- `bun test ./forms/f1040/2025/mef/xsd_validation.test.ts --timeout=1800000`
  needs `xmllint` and the private `Return1040.xsd`.
