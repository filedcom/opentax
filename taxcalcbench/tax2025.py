"""
2025 Federal Income Tax Calculator
Computes correct expected values for benchmark cases.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal
import math

FilingStatus = Literal["single", "mfj", "mfs", "hoh", "qss"]

# ── 2025 Standard Deductions ────────────────────────────────────────────────
STD_DEDUCTION = {"single": 15_000, "mfj": 30_000, "mfs": 15_000, "hoh": 22_500, "qss": 30_000}
# Additional per qualifying senior (65+) or blind person
STD_EXTRA_SINGLE = 2_000   # single / hoh
STD_EXTRA_MFJ    = 1_600   # mfj / mfs / qss (per person)

# ── 2025 Tax Brackets ───────────────────────────────────────────────────────
# Each entry: (upper_limit, rate)  — lower limit is previous upper
BRACKETS: dict[str, list[tuple[float, float]]] = {
    "single": [
        (11_925, 0.10),
        (48_475, 0.12),
        (103_350, 0.22),
        (197_300, 0.24),
        (250_525, 0.32),
        (626_350, 0.35),
        (math.inf, 0.37),
    ],
    "mfj": [
        (23_850, 0.10),
        (96_950, 0.12),
        (206_700, 0.22),
        (394_600, 0.24),
        (501_050, 0.32),
        (751_600, 0.35),
        (math.inf, 0.37),
    ],
    "mfs": [
        (11_925, 0.10),
        (48_475, 0.12),
        (103_350, 0.22),
        (197_300, 0.24),
        (250_525, 0.32),
        (375_800, 0.35),
        (math.inf, 0.37),
    ],
    "hoh": [
        (17_000, 0.10),
        (64_850, 0.12),
        (103_350, 0.22),
        (197_300, 0.24),
        (250_500, 0.32),
        (626_350, 0.35),
        (math.inf, 0.37),
    ],
    "qss": [  # same as mfj
        (23_850, 0.10),
        (96_950, 0.12),
        (206_700, 0.22),
        (394_600, 0.24),
        (501_050, 0.32),
        (751_600, 0.35),
        (math.inf, 0.37),
    ],
}

# ── 2025 LTCG / Qualified Dividend Rates ────────────────────────────────────
LTCG_BRACKETS: dict[str, list[tuple[float, float]]] = {
    "single": [(48_350, 0.00), (533_400, 0.15), (math.inf, 0.20)],
    "mfj":    [(96_700, 0.00), (600_050, 0.15), (math.inf, 0.20)],
    "mfs":    [(48_350, 0.00), (300_000, 0.15), (math.inf, 0.20)],
    "hoh":    [(64_750, 0.00), (566_700, 0.15), (math.inf, 0.20)],
    "qss":    [(96_700, 0.00), (600_050, 0.15), (math.inf, 0.20)],
}

# ── 2025 EITC Parameters ─────────────────────────────────────────────────────
# (max_credit, phaseout_start_single, phaseout_start_mfj, phaseout_end_single, phaseout_end_mfj)
EITC: dict[int, dict] = {
    0: {"max": 649,   "rate_in": 0.0765, "rate_out": 0.0765, "start_s": 10_620, "start_m": 17_430, "end_s": 19_104, "end_m": 26_214},
    1: {"max": 4_328, "rate_in": 0.34,   "rate_out": 0.1598, "start_s": 23_511, "start_m": 30_323, "end_s": 50_657, "end_m": 57_669},
    2: {"max": 7_152, "rate_in": 0.40,   "rate_out": 0.2106, "start_s": 23_511, "start_m": 30_323, "end_s": 57_554, "end_m": 64_566},
    3: {"max": 8_046, "rate_in": 0.45,   "rate_out": 0.2106, "start_s": 23_511, "start_m": 30_323, "end_s": 57_554, "end_m": 64_566},
}

# ── SE Tax ───────────────────────────────────────────────────────────────────
SS_WAGE_BASE_2025 = 176_100


def bracket_tax(income: float, status: FilingStatus) -> float:
    """Compute regular income tax from brackets."""
    brackets = BRACKETS[status]
    prev = 0.0
    tax = 0.0
    for upper, rate in brackets:
        if income <= prev:
            break
        taxable = min(income, upper) - prev
        tax += taxable * rate
        prev = upper
    return round(tax, 2)


def ltcg_tax(ordinary_income: float, ltcg: float, status: FilingStatus) -> float:
    """Compute tax on LTCG/QD at preferential rates."""
    brackets = LTCG_BRACKETS[status]
    prev = 0.0
    # LTCG sits on top of ordinary income in the income stack
    ltcg_start = ordinary_income
    ltcg_end = ordinary_income + ltcg
    tax = 0.0
    for upper, rate in brackets:
        if ltcg_end <= prev or ltcg_start >= upper:
            prev = upper
            continue
        lo = max(ltcg_start, prev)
        hi = min(ltcg_end, upper)
        if hi > lo:
            tax += (hi - lo) * rate
        prev = upper
    return round(tax, 2)


def se_tax(net_se: float) -> tuple[float, float]:
    """Returns (total_se_tax, half_se_deduction)."""
    net_92 = net_se * 0.9235
    ss_portion = min(net_92, SS_WAGE_BASE_2025) * 0.124
    mcare_portion = net_92 * 0.029
    total = round(ss_portion + mcare_portion, 2)
    half = round(total / 2, 2)
    return total, half


def ss_taxable(agi_ex_ss: float, ss_benefits: float, status: FilingStatus) -> float:
    """Compute taxable portion of Social Security benefits."""
    provisional = agi_ex_ss + ss_benefits / 2
    if status == "mfj":
        t1, t2 = 32_000, 44_000
    else:
        t1, t2 = 25_000, 34_000
    if provisional <= t1:
        return 0.0
    if provisional <= t2:
        return min(0.5 * (provisional - t1), 0.5 * ss_benefits)
    tier1 = 0.5 * (t2 - t1)
    tier2 = 0.85 * (provisional - t2)
    return round(min(tier1 + tier2, 0.85 * ss_benefits), 2)


def eitc_credit(earned: float, children: int, status: FilingStatus) -> float:
    """Compute EITC."""
    n = min(children, 3)
    p = EITC[n]
    # Phase-in
    credit = min(earned * p["rate_in"], p["max"])
    # Phase-out
    start = p["start_m"] if status == "mfj" else p["start_s"]
    end   = p["end_m"]   if status == "mfj" else p["end_s"]
    if earned > start:
        reduction = (min(earned, end) - start) * p["rate_out"]
        credit = max(0.0, credit - reduction)
    return round(credit, 2)


def ctc_and_actc(agi: float, earned: float, qualifying_children: int, tax_before_credits: float,
                 status: FilingStatus) -> tuple[float, float]:
    """Returns (non_refundable_ctc, refundable_actc)."""
    if qualifying_children == 0:
        return 0.0, 0.0
    # Phase-out: $200k single/hoh, $400k mfj
    limit = 400_000 if status in ("mfj", "qss") else 200_000
    reduction = max(0, math.ceil((agi - limit) / 1000)) * 50
    total_ctc = max(0, qualifying_children * 2_000 - reduction)
    nonref = min(total_ctc, tax_before_credits)
    unused = total_ctc - nonref
    # ACTC: 15% of earned > $2,500, limited to $1,700/child and unused CTC
    actc_limit = qualifying_children * 1_700
    actc = min(max(0, (earned - 2_500) * 0.15), actc_limit, unused)
    return round(nonref, 2), round(actc, 2)


def dependent_care_credit(agi: float, expenses: float, qualifying_persons: int) -> float:
    """Compute Form 2441 credit."""
    limit = 3_000 if qualifying_persons == 1 else 6_000
    eligible = min(expenses, limit)
    # Credit rate based on AGI
    if agi <= 15_000:    rate = 0.35
    elif agi <= 17_000:  rate = 0.34
    elif agi <= 19_000:  rate = 0.33
    elif agi <= 21_000:  rate = 0.32
    elif agi <= 23_000:  rate = 0.31
    elif agi <= 25_000:  rate = 0.30
    elif agi <= 27_000:  rate = 0.29
    elif agi <= 29_000:  rate = 0.28
    elif agi <= 31_000:  rate = 0.27
    elif agi <= 33_000:  rate = 0.26
    elif agi <= 35_000:  rate = 0.25
    elif agi <= 37_000:  rate = 0.24
    elif agi <= 39_000:  rate = 0.23
    elif agi <= 41_000:  rate = 0.22
    elif agi <= 43_000:  rate = 0.21
    else:                rate = 0.20
    return round(eligible * rate, 2)


def excess_ss_credit(ss_wages_list: list[float], ss_withheld_list: list[float]) -> float:
    """Excess SS withheld when multiple employers exceed wage base."""
    max_ss = SS_WAGE_BASE_2025 * 0.062
    total_withheld = sum(ss_withheld_list)
    return round(max(0, total_withheld - max_ss), 2)


def additional_medicare_tax(wages: float, se_income: float, status: FilingStatus) -> float:
    """0.9% on wages+SE over threshold."""
    threshold = 250_000 if status == "mfj" else 200_000
    total = wages + se_income
    return round(max(0, (total - threshold) * 0.009), 2)


@dataclass
class TaxReturn:
    status: FilingStatus
    # Taxpayer flags
    taxpayer_65: bool = False
    taxpayer_blind: bool = False
    spouse_65: bool = False
    spouse_blind: bool = False
    # Income
    wages: float = 0.0          # W-2 box 1
    unemployment: float = 0.0
    interest: float = 0.0       # taxable interest
    ordinary_dividends: float = 0.0
    qualified_dividends: float = 0.0
    ltcg: float = 0.0           # long-term capital gain
    pension: float = 0.0        # 1099-R taxable
    ssa_gross: float = 0.0      # SSA 1099 box 3 (gross)
    schedule_c_net: float = 0.0 # after expenses
    # Above-the-line deductions
    student_loan_interest_paid: float = 0.0
    # Credits / other
    qualifying_children: int = 0    # CTC eligible children
    eitc_children: int = 0          # children for EITC
    dep_care_expenses: float = 0.0  # Form 2441 eligible expenses paid
    dep_care_persons: int = 0
    # Withholding / payments
    fed_withheld: float = 0.0
    # SS over-collection tracking
    ss_wages_list: list[float] = field(default_factory=list)
    ss_withheld_list: list[float] = field(default_factory=list)

    def compute(self) -> dict:
        s = self.status

        # ── SE Tax ──────────────────────────────────────────────────────────
        se_total, se_half = (0.0, 0.0)
        if self.schedule_c_net > 0:
            se_total, se_half = se_tax(self.schedule_c_net)

        # ── Student Loan Interest Deduction ─────────────────────────────────
        # Phase-out: $85k-$100k single, $175k-$205k mfj
        sli_phase_start = 175_000 if s == "mfj" else 85_000
        sli_phase_end   = 205_000 if s == "mfj" else 100_000
        gross_income_for_sli = (self.wages + self.unemployment + self.interest +
                                self.ordinary_dividends + self.pension +
                                self.schedule_c_net)
        sli_agi_approx = gross_income_for_sli - se_half
        if sli_agi_approx >= sli_phase_end:
            sli = 0.0
        elif sli_agi_approx > sli_phase_start:
            frac = (sli_agi_approx - sli_phase_start) / (sli_phase_end - sli_phase_start)
            sli = round(min(self.student_loan_interest_paid, 2_500) * (1 - frac), 2)
        else:
            sli = min(self.student_loan_interest_paid, 2_500)

        # ── SSA Taxability ───────────────────────────────────────────────────
        agi_ex_ss = (self.wages + self.unemployment + self.interest +
                     self.ordinary_dividends + self.ltcg + self.pension +
                     self.schedule_c_net - se_half - sli)
        ss_taxable_amt = ss_taxable(agi_ex_ss, self.ssa_gross, s)

        # ── AGI ──────────────────────────────────────────────────────────────
        total_income = (self.wages + self.unemployment + self.interest +
                        self.ordinary_dividends + self.ltcg + self.pension +
                        ss_taxable_amt + self.schedule_c_net)
        above_line = se_half + sli
        agi = round(total_income - above_line, 2)

        # ── Standard Deduction ───────────────────────────────────────────────
        std = STD_DEDUCTION[s]
        if s in ("single", "hoh"):
            std += (STD_EXTRA_SINGLE * (self.taxpayer_65 + self.taxpayer_blind))
        else:  # mfj / mfs / qss
            std += (STD_EXTRA_MFJ * (self.taxpayer_65 + self.taxpayer_blind +
                                      self.spouse_65 + self.spouse_blind))
        deduction = std  # always use standard in these cases

        # ── QBI Deduction ────────────────────────────────────────────────────
        qbi_threshold = 394_600 if s == "mfj" else 197_300
        qbi = 0.0
        if self.schedule_c_net > 0 and agi <= qbi_threshold:
            qbi_base = agi - deduction
            qbi = round(min(self.schedule_c_net * 0.20, qbi_base * 0.20), 2)
            qbi = max(0, qbi)

        # ── Taxable Income ───────────────────────────────────────────────────
        taxable = max(0.0, round(agi - deduction - qbi, 2))

        # ── Ordinary vs Preferential Income ──────────────────────────────────
        pref_income = self.qualified_dividends + self.ltcg  # taxed at LTCG rates
        ordinary_taxable = max(0.0, taxable - pref_income)

        # ── Income Tax ───────────────────────────────────────────────────────
        income_tax = bracket_tax(ordinary_taxable, s)
        pref_tax   = ltcg_tax(ordinary_taxable, pref_income, s) if pref_income > 0 else 0.0
        total_income_tax = round(income_tax + pref_tax, 2)

        # ── Additional Medicare Tax (0.9%) ───────────────────────────────────
        add_mcare = additional_medicare_tax(self.wages, self.schedule_c_net, s)

        # ── Total Tax Before Credits ─────────────────────────────────────────
        tax_before_credits = round(total_income_tax + se_total + add_mcare, 2)

        # ── Non-Refundable Credits ───────────────────────────────────────────
        nonref_ctc, actc = ctc_and_actc(agi, self.wages, self.qualifying_children,
                                         tax_before_credits, s)
        dep_care = 0.0
        if self.dep_care_expenses > 0:
            dep_care = dependent_care_credit(agi, self.dep_care_expenses, self.dep_care_persons)
            dep_care = min(dep_care, max(0, tax_before_credits - nonref_ctc))

        eitc = eitc_credit(self.wages, self.eitc_children, s)

        # ── Excess SS Credit ─────────────────────────────────────────────────
        excess_ss = excess_ss_credit(self.ss_wages_list, self.ss_withheld_list)

        # ── Total Tax ─────────────────────────────────────────────────────────
        nonref_credits = nonref_ctc + dep_care
        total_tax = round(max(0.0, tax_before_credits - nonref_credits), 2)

        # ── Payments ─────────────────────────────────────────────────────────
        refundable_credits = actc + eitc
        total_payments = round(self.fed_withheld + refundable_credits + excess_ss, 2)

        # ── Refund / Owed ─────────────────────────────────────────────────────
        balance = round(total_payments - total_tax, 2)
        refund = round(balance, 2) if balance > 0 else 0.0
        owed   = round(-balance, 2) if balance < 0 else 0.0

        return {
            "line9_total_income":       round(total_income, 2),
            "line11_agi":               agi,
            "standard_deduction":       std,
            "qbi_deduction":            qbi,
            "line15_taxable_income":    taxable,
            "ordinary_taxable":         ordinary_taxable,
            "income_tax":               total_income_tax,
            "se_tax":                   se_total,
            "add_medicare_tax":         add_mcare,
            "line18_tax_before_credits": tax_before_credits,
            "nonref_ctc":               nonref_ctc,
            "dependent_care_credit":    dep_care,
            "eitc":                     eitc,
            "actc":                     actc,
            "excess_ss_credit":         excess_ss,
            "line24_total_tax":         total_tax,
            "line33_total_payments":    total_payments,
            "line35a_refund":           refund,
            "line37_amount_owed":       owed,
        }
