#!/usr/bin/env python3
"""
Generate correct.json for each benchmark case using the 2025 tax calculator.
Run from the benchmark/ directory: python3 gen_correct.py
"""
import json
import sys
from pathlib import Path
from tax2025 import TaxReturn

CASES_DIR = Path(__file__).parent / "cases"

def build_return(case_data: dict) -> TaxReturn:
    forms = case_data["forms"]
    general = {}
    for f in forms:
        if f["node_type"] == "start":
            general = f["data"].get("general", {})
            break

    status = general.get("filing_status", "single")
    t65    = general.get("taxpayer_age_65_or_older", False)
    t_blind = general.get("taxpayer_blind", False)
    s65    = general.get("spouse_age_65_or_older", False)
    s_blind = general.get("spouse_blind", False)
    dependents = general.get("dependents", [])

    qualifying_children = sum(1 for d in dependents if d.get("qualifying_child_for_ctc"))
    eitc_children = len(dependents)  # simplification: all dependents count for EITC

    r = TaxReturn(
        status=status,
        taxpayer_65=t65,
        taxpayer_blind=t_blind,
        spouse_65=s65,
        spouse_blind=s_blind,
        qualifying_children=qualifying_children,
        eitc_children=eitc_children,
    )

    ss_wages_list = []
    ss_withheld_list = []

    for f in forms:
        nt = f["node_type"]
        d  = f["data"]

        if nt == "w2":
            r.wages        += d.get("box1_wages", 0)
            r.fed_withheld += d.get("box2_fed_withheld", 0)
            ss_wages_list.append(d.get("box3_ss_wages", 0))
            ss_withheld_list.append(d.get("box4_ss_withheld", 0))
            for entry in d.get("box12_entries", []):
                if entry.get("code") == "W":
                    r.hsa_employer += entry.get("amount", 0)

        elif nt == "f1099g":
            r.unemployment += d.get("box_1_unemployment", 0)
            r.fed_withheld += d.get("box_4_federal_withheld", 0)

        elif nt == "f1099int":
            r.interest     += d.get("box1", 0)
            r.fed_withheld += d.get("box4", 0)

        elif nt == "f1099div":
            r.ordinary_dividends  += d.get("box1a", 0)
            r.qualified_dividends += d.get("box1b", 0)
            r.fed_withheld        += d.get("box4", 0)

        elif nt == "f1099b":
            proceeds = d.get("proceeds", 0)
            basis    = d.get("cost_basis", 0)
            # Only long-term (Part D = long-term)
            part = d.get("part", "")
            gain = proceeds - basis
            if part.upper() in ("D", ""):
                r.ltcg += gain

        elif nt == "f1099r":
            r.pension      += d.get("box2a_taxable_amount", d.get("box1_gross_distribution", 0))
            r.fed_withheld += d.get("box4_federal_withheld", 0)

        elif nt == "ssa1099":
            r.ssa_gross += d.get("box3_gross_benefits", 0)
            r.fed_withheld += d.get("box6_federal_withheld", 0)

        elif nt == "schedule_c":
            gross    = d.get("line_1_gross_receipts", 0)
            expenses = sum(v for k, v in d.items()
                           if k.startswith("line_") and k not in
                           ("line_1_gross_receipts", "line_a_principal_business",
                            "line_b_business_code", "line_f_accounting_method",
                            "line_g_material_participation")
                           and isinstance(v, (int, float)))
            r.schedule_c_net += gross - expenses

        elif nt == "f1099nec":
            r.schedule_c_net += d.get("box1_nec", 0)
            r.fed_withheld   += d.get("box4_federal_withheld", 0)

        elif nt == "educator_expenses":
            r.educator_expenses    += d.get("educator1_expenses", 0)
            r.educator_expenses_sp += d.get("educator2_expenses", 0)

        elif nt == "f1040es":
            r.estimated_tax_payments += sum(
                d.get(k, 0) for k in ["payment_q1", "payment_q2", "payment_q3", "payment_q4"]
            )

        elif nt == "f8863":
            # Support both flat format (single item at root) and wrapped format
            if "f8863s" in d:
                entries = d["f8863s"]
            elif "credit_type" in d:
                entries = [d]  # flat format — single student entry
            else:
                entries = []
            for s_entry in entries:
                if s_entry.get("credit_type") == "aoc":
                    r.aotc_expenses += s_entry.get("aoc_adjusted_expenses", 0)

        elif nt == "f1095a":
            # Support both flat format (single item at root) and wrapped format
            if "f1095as" in d:
                plans = d["f1095as"]
            elif "issuer_name" in d:
                plans = [d]  # flat format — single policy entry
            else:
                plans = []
            for plan in plans:
                r.marketplace_premium += plan.get("annual_premium", 0)
                r.marketplace_slcsp   += plan.get("annual_slcsp", 0)
                r.marketplace_aptc    += plan.get("annual_aptc", 0)

        elif nt == "f1098e":
            for entry in d.get("f1098es", []):
                r.student_loan_interest_paid += entry.get("box1_student_loan_interest", 0)

        elif nt == "f2441":
            r.dep_care_expenses = d.get("qualifying_expenses_paid", 0)
            r.dep_care_persons  = d.get("qualifying_person_count", 1)

    r.ss_wages_list    = ss_wages_list
    r.ss_withheld_list = ss_withheld_list
    return r


def main():
    cases = sorted(CASES_DIR.iterdir())
    for case_dir in cases:
        if not case_dir.is_dir():
            continue
        input_file   = case_dir / "input.json"
        correct_file = case_dir / "correct.json"
        if not input_file.exists():
            continue

        with open(input_file) as f:
            case_data = json.load(f)

        tr = build_return(case_data)
        result = tr.compute()

        output = {
            "case":     case_dir.name,
            "scenario": case_data.get("scenario", ""),
            "year":     2025,
            "inputs": {
                "filing_status":     tr.status,
                "wages":             tr.wages,
                "unemployment":      tr.unemployment,
                "interest":          tr.interest,
                "ordinary_dividends": tr.ordinary_dividends,
                "qualified_dividends": tr.qualified_dividends,
                "ltcg":              tr.ltcg,
                "pension":           tr.pension,
                "ssa_gross":         tr.ssa_gross,
                "schedule_c_net":    tr.schedule_c_net,
                "student_loan_int":  tr.student_loan_interest_paid,
                "hsa_employer":      tr.hsa_employer,
                "educator_expenses": tr.educator_expenses,
                "educator_expenses_sp": tr.educator_expenses_sp,
                "aotc_expenses":     tr.aotc_expenses,
                "marketplace_premium": tr.marketplace_premium,
                "marketplace_slcsp": tr.marketplace_slcsp,
                "marketplace_aptc":  tr.marketplace_aptc,
                "qualifying_children": tr.qualifying_children,
                "eitc_children":     tr.eitc_children,
                "dep_care_expenses": tr.dep_care_expenses,
                "estimated_tax_payments": tr.estimated_tax_payments,
                "fed_withheld":      tr.fed_withheld,
            },
            "correct": result,
        }

        with open(correct_file, "w") as f:
            json.dump(output, f, indent=2)
        print(f"  {case_dir.name}: agi={result['line11_agi']:>10,.2f}  "
              f"tax={result['line24_total_tax']:>9,.2f}  "
              f"refund={result['line35a_refund']:>9,.2f}  "
              f"owed={result['line37_amount_owed']:>8,.2f}")

if __name__ == "__main__":
    print("Generating correct.json for all cases...\n")
    main()
    print("\nDone.")
