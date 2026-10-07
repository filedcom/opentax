# Independent Decimal worksheet from IRS2025 Form4972 and the1986 rate schedule.
# Usage: python3 scripts/review-form4972-participant-oracle.py retained-input-map.json expected.json
from decimal import Decimal as D, ROUND_HALF_UP
from pathlib import Path
import json, sys
inputs=json.loads(Path(sys.argv[1]).read_text())
def r(n): return int(D(n).quantize(D('1'),rounding=ROUND_HALF_UP))
brackets=[(0,1190,'0','.11'),(1190,2270,'130.90','.12'),(2270,4530,'260.50','.14'),(4530,6690,'576.90','.15'),(6690,9170,'900.90','.16'),(9170,11440,'1297.70','.18'),(11440,13710,'1706.30','.20'),(13710,17160,'2160.30','.23'),(17160,22880,'2953.80','.26'),(22880,28600,'4441','.30'),(28600,34320,'6157','.34'),(34320,42300,'8101.80','.38'),(42300,57190,'11134.20','.42'),(57190,85790,'17388','.48'),(85790,10**15,'31116','.50')]
def tax(v):
 for lo,hi,base,rate in brackets:
  if v<=hi:return D(base)+(D(v)-lo)*D(rate)
results={}
for id,input in inputs.items():
 forms=[]
 for e in input['form4972']['elections']:
  copies=[x for x in input['f1099r'] if x['source_document_reference'] in e['source_document_references']]
  s=lambda key:r(sum((D(str(x.get(key,0))) for x in copies),D(0)))
  taxable,gain,nua,annuity=map(s,['box2a_taxable_amount','box3_capital_gain','box6_nua','box8_other'])
  capital_nua=r(D(nua)*gain/taxable) if e['elect_include_nua'] else 0
  included_nua=nua if e['elect_include_nua'] else 0
  total=taxable+included_nua;capital=gain+capital_nua
  death=r(e.get('death_benefit_exclusion',0));estate=r(e.get('federal_estate_tax',0));cap=e['elect_capital_gain']
  capdeath=r(D(death)*capital/total) if cap else 0; capestate=r(D(estate)*capital/total) if cap else 0
  f={}
  if cap:f.update(line6=capital-capdeath-capestate,line7=r(D(capital-capdeath-capestate)*D('.2')))
  ordinary=total-(capital if cap else 0)
  if e['elect_10yr_averaging']:
   deathordinary=death-capdeath;estateordinary=estate-capestate
   f.update(line8=ordinary,line8_nua_included=included_nua-(capital_nua if cap else 0),line9=deathordinary,line10=ordinary-deathordinary,line11=annuity)
   f['line12']=f['line10']+annuity
   f['line13']=r(min(D(10000),D(f['line12'])*D('.5'))) if f['line12']<70000 else 0
   f['line14']=max(0,f['line12']-20000) if f['line12']<70000 else 0
   f['line15']=r(D(f['line14'])*D('.2'));f['line16']=max(0,f['line13']-f['line15']);f['line17']=f['line12']-f['line16'];f['line18']=estateordinary;f['line19']=f['line17']-estateordinary
   ratio=(D(annuity)/f['line12']).quantize(D('.00001'),rounding=ROUND_HALF_UP) if annuity else D(0)
   f['line20']=float(ratio);f['line21']=r(D(f['line16'])*ratio);f['line22']=annuity-f['line21'];f['line23']=r(D(f['line19'])*D('.1'));f['line24']=r(tax(f['line23']));f['line25']=10*f['line24'];f['line26']=r(D(f['line22'])*D('.1'));f['line27']=r(tax(f['line26']));f['line28']=10*f['line27'];f['line29']=max(0,f['line25']-f['line28']);f['line30']=f.get('line7',0)+f['line29']
  forms.append(f)
 special=sum(f.get('line30',f.get('line7',0)) for f in forms)
 ordinary=sum(r(sum(D(str(x['box2a_taxable_amount'])) for x in input['f1099r'] if x['source_document_reference'] in e['source_document_references']))-r(sum(D(str(x['box3_capital_gain'])) for x in input['f1099r'] if x['source_document_reference'] in e['source_document_references'])) for e in input['form4972']['elections'] if not e['elect_10yr_averaging'])
 results[id]={'forms':forms,'specialTax':special,'ordinaryPension':ordinary,'regularTax':26 if id in ('own-plus-parents','own-plus-parent') else 0}
Path(sys.argv[2]).write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({key:[x['specialTax'],x['ordinaryPension']] for key,x in results.items()}))
