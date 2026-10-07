"""Rebuild the two HTML apps from their sources.
apps/simple/index.html = src/shell.html + data seed + engine + src/borrowed.js + src/app.js
apps/full/index.html   = existing head (styles) + catalogue seed + engine + src/ui.js
Run after scripts/build_catalog_full.py and scripts/hire_links.py."""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
CDN = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>'
eng = re.sub(r'^export ', '', (ROOT / "engine/slot-engine.mjs").read_text(), flags=re.M)
cat = json.loads((ROOT / "catalogue/catalog_full.json").read_text())

# ---- simple app: slim data ----
ref = json.loads((ROOT / "reference/stage1-chain/reference/expected.json").read_text())
keep = ['id', 'family', 'title', 'name', 'description', 'beh_codes', 'configuration', 'intent', 'hazards', 'fixed', 'applicability', 'version', 'jama', 'link_origin', 'gen_note']
abs_, used = [], set()
for a in cat['abstracts']:
    d = {k: a.get(k) for k in keep}
    d['hire_links'] = {k: {'level': v['level'], 'n': v['n'], 'rows': v['rows'][:6], 'hfs': v['hfs'], 'why': v['why']} for k, v in a.get('hire_links', {}).items()}
    for v in d['hire_links'].values(): used.update(v['rows'])
    abs_.append(d)
beh = [{k: b.get(k) for k in ['id', 'code', 'name', 'use_case', 'ddt', 'default']} | ({'jama': {'id': b['jama']['id'], 'name': b['jama']['name']}} if b.get('jama') else {}) for b in cat['behaviors']]
hire = {i: {k: cat['hire2'][i][k] for k in ['odd', 'man', 'mal', 'hz', 'S', 'E', 'C', 'mrm']} for i in sorted(used)}
data = dict(behaviors=beh, abstracts=abs_, hire=hire, families={k: v['name'] for k, v in cat['families'].items()}, hazards=cat['hazard_names'], reference=ref)
S = ROOT / "apps/simple"
(S / "src/data.json").write_text(json.dumps(data, ensure_ascii=False))
html = (S / "src/shell.html").read_text() + '<script type="application/json" id="seed">' + json.dumps(data, ensure_ascii=False).replace('</', '<\\/') + '</script>\n' + CDN + '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\n<script>\n(() => {\n' + eng + '\n' + (S / "src/borrowed.js").read_text() + '\n' + (S / "src/app.js").read_text() + '\n})();\n</script>\n'
(S / "index.html").write_text(html)

# ---- full app ----
F = ROOT / "apps/full"
old = (F / "index.html").read_text()
head = old[:old.index('<script type="application/json" id="seed">')]
tail = old[old.rindex('</script>') + len('</script>'):]
seed = json.dumps(cat, ensure_ascii=False).replace('</', '<\\/')
(F / "index.html").write_text(head + '<script type="application/json" id="seed">' + seed + '</script>\n' + CDN + '\n<script>\n(() => {\n' + eng + '\n' + (F / "src/ui.js").read_text() + '\n})();\n</script>\n' + tail.lstrip('\n'))
print("apps rebuilt")
