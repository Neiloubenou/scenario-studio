"""Assemble Scenario Studio v3 into one HTML page (index.html)."""
import re
from pathlib import Path
H = Path(__file__).resolve().parent
strip = lambda s: re.sub(r'^import .*?;\s*$', '', re.sub(r'^export ', '', s, flags=re.M), flags=re.M)
js = strip((H / "engine.mjs").read_text()) + "\n" + strip((H / "core.mjs").read_text()) + "\n" + (H / "app.js").read_text()
seed = (H / "studio.json").read_text().replace("</", "<\\/")
stats = (H / "stats_demo.json").read_text().replace("</", "<\\/")
html = (H / "shell.html").read_text() + f'<script type="application/json" id="seed">{seed}</script>\n<script type="application/json" id="stats">{stats}</script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>\n<script>\n(() => {{\n{js}\n}})();\n</script>\n'
(H / "index.html").write_text(html)
print(len(html))
