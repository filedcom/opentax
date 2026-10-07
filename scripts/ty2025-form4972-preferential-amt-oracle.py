"""Independent Decimal source oracle: 2025 Forms1040/6251/8960 and reviewed1986 worksheet."""
from decimal import Decimal as D, ROUND_HALF_UP
from pathlib import Path
import json, sys
w=lambda x:int(D(x).quantize(D("1"),rounding=ROUND_HALF_UP))
root=Path(sys.argv[1] if len(sys.argv)>1 else ".state/research/4972-preferential-amt-source")
special=json.loads(Path("forms/f1040/2025/form4972_full_share_cents.expected.json").read_text())
out={}
for f in sorted(root.glob("*.json")):
 data=json.loads(f.read_text())
 if not isinstance(data,dict) or "input" not in data:continue
 s=data["input"];id=f.stem;joint=s["general"]["filing_status"]=="mfj"
 div=s["f1099div"][0];qualified=D(str(div["box1b"]));gain=D(str(div["box2a"]));pref=qualified+gain
 wages=sum(D(str(row["box1_wages"])) for row in s["w2"]);ordinary=D(str(div["box1a"]));agi=w(wages+ordinary+gain)
 # Both actual owners are over65; enhanced senior amount is reduced for EACH owner.
 threshold=150000 if joint else 75000
 senior=w(max(D(0),D(6000)-max(D(0),D(agi-threshold))*D(".06"))*(2 if joint else 1))
 standard=34700 if joint else 17750;taxable=agi-standard-senior;ordinary_taxable=taxable-w(pref)
 # These source cases stay inside the printed 2025 Tax Computation Worksheet rows.
 if joint:
  assert 96950<=ordinary_taxable<=206700
  ordinary_tax=w(D(ordinary_taxable)*D(".22")-D(10172));zero=96700;floor=600050
 else:
  assert 103350<=ordinary_taxable<=197300
  ordinary_tax=w(D(ordinary_taxable)*D(".24")-D(7153));zero=48350;floor=533400
 assert ordinary_taxable>zero and ordinary_taxable+pref<floor
 regular=ordinary_tax+w(pref*D(".15"))
 iso=sum((D(str(row["box4_fmv_per_share"]))-D(str(row["box3_exercise_price_per_share"])))*D(row["box5_shares_transferred"]) for row in s["f3921"])
 amti=w(D(agi)+iso);base=137000 if joint else 88100;phase=1252700 if joint else 626350
 exemption=D(base)-max(D(0),D(amti-phase))*D(".25");exemption=max(D(0),exemption)
 assert exemption==D(w(exemption)),"selected phaseout cases use exact filed whole-dollar exemptions"
 exemption=w(exemption);excess=amti-exemption;amt_ordinary=excess-w(pref)
 assert amt_ordinary>239100
 amt_ordinary_tax=w(D(amt_ordinary)*D(".28")-D(4782));tmt=amt_ordinary_tax+w(pref*D(".15"));amt=tmt-regular
 total_special=sum(row["line30"] for key,row in special.items() if key.startswith(id+"-"))
 niit=float((min(ordinary+gain,max(D(0),D(agi)-(250000 if joint else 200000)))*D(".038")).quantize(D(".01"),rounding=ROUND_HALF_UP))
 out[id]={"form4972_tax":total_special,"agi":agi,"standard":standard,"senior":senior,"taxable":taxable,"iso_adjustment":w(iso),"amti":amti,"exemption":exemption,"taxable_excess":excess,"regular_tax":regular,"amt":amt,"niit":niit,"line16":regular+total_special,"total_tax":tmt+total_special+niit,"amount_owed":w(tmt+total_special+niit-35000),"part3":{"line12":excess,"line13":w(pref),"line15":w(pref),"line16":w(pref),"line17":amt_ordinary,"line18":amt_ordinary_tax,"line19":zero,"line20":ordinary_taxable,"line21":0,"line22":w(pref),"line23":0,"line24":w(pref),"line25":floor,"line26":0,"line27":ordinary_taxable,"line28":ordinary_taxable,"line29":floor-ordinary_taxable,"line30":w(pref),"line31":w(pref*D(".15")),"line32":w(pref),"line33":0,"line34":0,"line38":tmt,"line39":w(D(excess)*D(".28")-D(4782)),"line40":tmt}}
Path("forms/f1040/2025/form4972_preferential_amt.expected.json").write_text(json.dumps(out,indent=2)+"\n")
print({k:(v["regular_tax"],v["amt"],v["total_tax"]) for k,v in out.items()})
