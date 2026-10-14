/** Reviewed issued examples prove source binding, not external authentication. */
const base = {
  "general": {
    "filing_status": "single",
    "taxpayer_first_name": "Alex",
    "taxpayer_last_name": "Example",
    "taxpayer_ssn": "111-22-3333",
    "taxpayer_dob": "1985-06-15",
    "child_eic_filer_review": {
      "not_qualifying_child_of_another_taxpayer_verified": true,
      "relationship_age_residence_record_reference":
        "Synthetic 2025 filer family and residence review",
    },
    "prior_eic_disallowance_review": {
      "status": "none",
      "irs_account_record_reference": "Synthetic IRS account transcript review",
      "no_nonclerical_disallowance_since_1996_verified": true,
    },
    "eic_tax_residency_review": {
      "status": "all_year_resident",
      "taxpayer_status_record_reference":
        "Synthetic 2025 resident status review",
      "spouse_status_record_reference": "Synthetic 2025 spouse status review",
    },
    "address_line1": "1 Example Way",
    "address_city": "Austin",
    "address_state": "TX",
    "address_zip": "78701",
    "digital_assets": false,
  },
  "w2": [
    {
      "box1_wages": 75000,
      "box2_fed_withheld": 11000,
      "employee_ssn": "111-22-3333",
      "box3_ss_wages": 75000,
      "box4_ss_withheld": 4650,
      "box5_medicare_wages": 75000,
      "box6_medicare_withheld": 1087.5,
      "employer_ein": "12-3456789",
      "employer_name": "Example Employer",
      "employer_address_line1": "10 Employer Road",
      "employer_address_city": "Austin",
      "employer_address_state": "TX",
      "employer_address_zip": "78701",
      "box12_entries": [],
    },
  ],
};
// Distinct retained issued-copy examples; these records do not authenticate an issuer.
const extraRefunds = [
  {
    payer_name: "State C Revenue Department",
    payer_tin: "23-4567890",
    source_document_reference: "state C issued 2025 refund copy",
    box_2_state_refund: 800,
    box_2_taxable_recovery_verified_amount: 300,
  },
  {
    payer_name: "State D Revenue Department",
    payer_tin: "34-5678901",
    source_document_reference: "state D issued 2025 refund copy",
    box_2_state_refund: 500,
    box_2_taxable_recovery_verified_amount: 100,
  },
  {
    payer_name: "State E Revenue Department",
    payer_tin: "45-6789012",
    source_document_reference: "state E issued 2025 refund copy",
    box_2_state_refund: 600,
    box_2_taxable_recovery_verified_amount: 100,
  },
  {
    payer_name: "State F Revenue Department",
    payer_tin: "56-7890123",
    source_document_reference: "state F issued 2025 refund copy",
    box_2_state_refund: 700,
    box_2_taxable_recovery_verified_amount: 100,
  },
  {
    payer_name: "State G Revenue Department",
    payer_tin: "67-8901234",
    source_document_reference: "state G issued 2025 refund copy",
    box_2_state_refund: 800,
    box_2_taxable_recovery_verified_amount: 100,
  },
  {
    payer_name: "State H Revenue Department",
    payer_tin: "78-9012345",
    source_document_reference: "state H issued 2025 refund copy",
    box_2_state_refund: 900,
    box_2_taxable_recovery_verified_amount: 100,
  },
  {
    payer_name: "State I Revenue Department",
    payer_tin: "89-0123456",
    source_document_reference: "state I issued 2025 refund copy",
    box_2_state_refund: 1000,
    box_2_taxable_recovery_verified_amount: 100,
  },
];
export function ordinaryStateRefundInputs(copies: number) {
  const i = structuredClone(base);
  return {
    ...i,
    f1099g: [
      {
        payer_name: "State A Revenue Department",
        payer_tin: "12-3456789",
        recipient_tin: "111223333",
        source_document_reference: "state A issued 2025 refund copy",
        box_2_state_refund: 900,
        box_2_prior_year_itemized: true,
        box_2_taxable_recovery_verified_amount: 600,
        box_2_recovery_workpaper_reference: "combined 2024 recovery review",
        box_3_tax_year: 2024,
      },
      ...(copies >= 2
        ? [{
          payer_name: "State B Revenue Department",
          payer_tin: "98-7654321",
          recipient_tin: "111223333",
          source_document_reference: "state B issued 2025 refund copy",
          box_2_state_refund: 700,
          box_2_prior_year_itemized: true,
          box_2_taxable_recovery_verified_amount: 400,
          box_2_recovery_workpaper_reference: "combined 2024 recovery review",
          box_3_tax_year: 2024,
        }]
        : []),
      ...extraRefunds.slice(0, Math.max(0, copies - 2)).map((copy) => ({
        ...copy,
        recipient_tin: "111223333",
        box_2_prior_year_itemized: true,
        box_2_recovery_workpaper_reference: "combined 2024 recovery review",
        box_3_tax_year: 2024,
      })),
    ],
  };
}

/** Joint recipients have distinct issued copies from the same state payer. */
export function ordinaryStateRefundJointInputs() {
  const inputs = ordinaryStateRefundInputs(2);
  inputs.f1099g[1] = {
    ...inputs.f1099g[1],
    payer_name: inputs.f1099g[0].payer_name,
    payer_tin: inputs.f1099g[0].payer_tin.replaceAll("-", ""),
    recipient_tin: "444556666",
    source_document_reference: "state A issued 2025 spouse refund copy",
  };
  const primary = inputs.w2[0];
  return {
    ...inputs,
    general: {
      ...inputs.general,
      filing_status: "mfj",
      spouse_first_name: "Sam",
      spouse_last_name: "Example",
      spouse_ssn: "444-55-6666",
      spouse_dob: "1987-09-22",
    },
    w2: [...inputs.w2, {
      ...primary,
      employee_ssn: "444-55-6666",
      employer_ein: "98-7654321",
      employer_name: "Spouse Example Employer",
      box1_wages: 40000,
      box2_fed_withheld: 4000,
      box3_ss_wages: 40000,
      box4_ss_withheld: 2480,
      box5_medicare_wages: 40000,
      box6_medicare_withheld: 580,
    }],
  };
}

/** A retained issued refund may have no taxable recovery under the reviewed workpaper. */
export function ordinaryStateRefundMixedZeroInputs() {
  const inputs = ordinaryStateRefundInputs(3);
  inputs.f1099g[2].box_2_taxable_recovery_verified_amount = 0;
  return inputs;
}

export function ordinaryStateRefundAllZeroInputs() {
  const inputs = ordinaryStateRefundInputs(3);
  for (const copy of inputs.f1099g) {
    copy.box_2_taxable_recovery_verified_amount = 0;
    copy.box_2_prior_year_itemized = false;
  }
  return inputs;
}
export function ordinaryStateRefundUnemploymentInputs() {
  const inputs = ordinaryStateRefundInputs(1);
  return {
    ...inputs,
    f1099g: [...inputs.f1099g, {
      payer_name: "State Unemployment Agency",
      payer_tin: "90-1234567",
      recipient_tin: "111223333",
      source_document_reference: "issued 2025 unemployment statement",
      box_1_unemployment: 10000,
    }],
  };
}
