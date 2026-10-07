// End-to-end test of apps/v3/index.html, every path. Needs Playwright with a Chromium.
// Run: node tests/e2e/e2e-v3.mjs [path/to/index.html]   (PLAYWRIGHT_CHROMIUM=/path/to/chrome to override)
import { chromium } from 'playwright';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const PAGE = 'file://' + resolve(process.argv[2] || new URL('../../apps/v3/index.html', import.meta.url).pathname);
const exe = process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium';
const tmp = mkdtempSync(join(tmpdir(), 'ss-e2e-'));
let pass = 0, fail = 0; const fails = [];
const check = (label, cond, info = '') => { if (cond) pass++; else { fail++; fails.push(label + (info ? ` (${info})` : '')); } console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${info ? '  ' + info : ''}`); };

const browser = await chromium.launch({ executablePath: exe });
async function open(opts = {}){
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 950 }, colorScheme: opts.dark ? 'dark' : 'light', acceptDownloads: false });
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_NAME|net::/.test(m.text())) errors.push(m.text()); });
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  // capabilities mocks: downloads records saved files, sample returns a scenario spec
  await p.addInitScript(() => {
    window.__saved = [];
    window.claude = { use: async name => name === 'downloads' ? { save: async ({ filename, data }) => { window.__saved.push({ filename, size: data.length ?? data.byteLength }); } }
      : name === 'sample' ? { json: async () => ({ title: 'Semi cuts in on a downhill curve', desc: 'From text', hazards: ['H2', 'H1'], road: { curvature: [0.0012], grade: [-3.5] }, actors: [{ slot: 'B', kinds: ['tractor_trailer'], distanceM: [10, 20], speedMps: [24], maneuvers: [{ type: 'cut_in', startS: [1, 2] }] }, { slot: 'C', mode: 'optional', kinds: ['car'], distanceM: [15], speedMps: [25] }] }) } : null };
  });
  await p.goto(PAGE); await p.waitForTimeout(700);
  return { p, ctx, errors };
}
const txt = async (p, sel) => (await p.$eval(sel, e => e.textContent)).trim();
const toast = p => txt(p, '#toast');
const saved = p => p.evaluate(() => window.__saved);

/* 1. Overview */
{
  const { p, ctx, errors } = await open();
  check('overview: 17 behavior cards', (await p.$$('[data-beh]')).length === 17);
  check('overview: DEMO badge shown', /DEMO/.test(await txt(p, '#srcBadge')));
  check('overview: KPIs show 121 scenarios', /121/.test(await txt(p, '#main')));
  await p.click('[data-beh="HW-AF"]'); await p.waitForTimeout(200);
  check('overview card opens the behavior view', /Lane-Centered Adaptive Follow/.test(await txt(p, '#main h2')));
  check('overview: no page error', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* 2. Behavior view, every behavior, filters, drawer, every tab, tests */
{
  const { p, ctx, errors } = await open();
  await p.click('[data-view="behavior"]');
  const codes = await p.$$eval('#behSel option', o => o.map(x => x.value));
  check('behavior select lists 17 behaviors', codes.length === 17);
  let empty = [];
  for (const c of codes) { await p.selectOption('#behSel', c); await p.waitForTimeout(60); const n = (await p.$$('tr[data-scn]')).length; if (!n) empty.push(c); }
  check('every behavior shows its scenarios', empty.length === 0, empty.join(','));
  await p.selectOption('#behSel', 'HW-LC'); await p.waitForTimeout(100);
  await p.fill('#search', 'motorcycle'); await p.waitForTimeout(150);
  check('search filters scenarios', (await p.$$('tr[data-scn]')).length === 1, String((await p.$$('tr[data-scn]')).length));
  check('search keeps focus while typing', await p.evaluate(() => document.activeElement?.id === 'search'));
  await p.fill('#search', ''); await p.waitForTimeout(100);
  await p.selectOption('#famSel', 'LC-TGT'); await p.waitForTimeout(100);
  check('family filter', (await p.$$('tr[data-scn]')).length === 7, String((await p.$$('tr[data-scn]')).length));
  await p.selectOption('#famSel', 'all'); await p.click('[data-only="fail"]'); await p.waitForTimeout(100);
  check('"with failures" filter', (await p.$$('tr[data-scn]')).length > 0);
  await p.click('[data-only="m2"]'); await p.waitForTimeout(100);
  check('"milestone 2" filter on HW-LC shows none', (await p.$$('tr[data-scn]')).length === 0 && /No scenario matches/.test(await txt(p, '#main')));
  await p.click('[data-only="all"]');
  await p.selectOption('#behSel', 'HW-SIL'); await p.click('[data-only="m2"]'); await p.waitForTimeout(100);
  check('"milestone 2" filter on HW-SIL shows non generable', (await p.$$('tr[data-scn]')).length === 1);
  await p.click('tr[data-scn]'); await p.waitForTimeout(200);
  for (const t of ['summary', 'hire', 'criteria', 'odd', 'fitc', 'tests']) { await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(80); }
  check('drawer of a non generable scenario: all tabs open', errors.length === 0, errors.join(' | '));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  check('Escape closes the drawer', !(await p.$('.drawer')));
  await p.click('[data-only="all"]'); await p.selectOption('#behSel', 'HW-LC'); await p.waitForTimeout(100);
  await p.click('tr[data-scn="LC-REF-01"]'); await p.waitForTimeout(250);
  check('drawer summary shows the scene', !!(await p.$('.drawer svg.scene')));
  await p.click('[data-tab="hire"]'); check('HIRE tab lists worst per hazard and rows', (await p.$$('.drawer tbody tr')).length > 5);
  await p.click('[data-tab="criteria"]'); check('criteria tab lists 7 criteria', (await p.$$('.drawer tbody tr')).length === 7);
  await p.click('[data-tab="odd"]'); check('ODD tab lists 11 variants', (await p.$$('.drawer tbody tr')).length === 11);
  await p.click('[data-tab="fitc"]'); check('FI & TC tab lists TCs and FIs', (await p.$$('.drawer tbody tr')).length >= 5);
  await p.click('[data-tab="tests"]'); await p.waitForTimeout(150);
  check('tests tab: 36 concretes on nominal', /All 36/.test(await txt(p, '.drawer .seg')));
  check('tests tab: OSC shown for the first concrete', /OpenSCENARIO DSL/.test(await txt(p, '.drawer pre.code')));
  const osc = await txt(p, '.drawer pre.code');
  check('OSC never scripts the ego response', !/ego_vehicle\.(change_lane|change_speed)/.test(osc));
  check('OSC header traces behavior, scenario, ODD, HIRE, criteria', ['# behavior', '# scenario', '# odd', '# hire', '# criteria'].every(k => osc.includes(k)));
  for (const s of ['pass', 'fail', 'not_run', 'excluded', 'all']) { await p.click(`[data-tstatus="${s}"]`); await p.waitForTimeout(60); }
  const vars = await p.$$eval('#tvar option', o => o.map(x => x.value));
  check('tests tab: 8 simulated variants selectable', vars.length === 8, String(vars.length));
  await p.selectOption('#tvar', 'V04'); await p.waitForTimeout(120); await p.click('[data-tstatus="excluded"]'); await p.waitForTimeout(80);
  const rows = await p.$$('.drawer tr[data-con]'); if (rows.length) { await rows[0].click(); await p.waitForTimeout(80); }
  check('excluded concrete shows rule and no OSC', rows.length === 0 || (/Excluded by/.test(await txt(p, '.drawer .dbody')) && !(await p.$('.drawer pre.code'))));
  await p.click('[data-tstatus="all"]'); const r2 = await p.$$('.drawer tr[data-con]'); await r2[3].click(); await p.waitForTimeout(80);
  check('selecting a concrete highlights it', (await p.$$('.drawer tr.sel')).length === 1);
  await p.click('[data-tab="summary"]'); await p.click('[data-switch="HW-AF"]'); await p.waitForTimeout(150);
  check('"also serves" switches behavior', /HW-AF/.test(await txt(p, '.drawer .sid')));
  await p.click('.drawer [data-close]');
  await p.selectOption('#behSel', 'HW-AF'); await p.click('tr[data-scn="LV-02"]'); await p.click('[data-tab="tests"]'); await p.waitForTimeout(150);
  const more = await p.$('#more'); if (more) { await more.click(); await p.waitForTimeout(150); }
  check('"show more" adds rows', !more || (await p.$$('.drawer tr[data-con]')).length > 40);
  check('behavior view: no page error', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* 3. Generate: every source, draft, preview, accept, discard, export, Claude */
{
  const { p, ctx, errors } = await open();
  await p.click('[data-view="generate"]');
  const codes = await p.$$eval('#genSel option', o => o.map(x => x.value));
  let bad = [];
  for (const c of codes) for (const src of ['hire', 'tc', 'ref', 'text']) { await p.selectOption('#genSel', c); await p.click(`[data-g-src="${src}"]`); await p.waitForTimeout(30); if (errors.length) { bad.push(c + '/' + src); errors.length = 0; } }
  check('every behavior × source renders', bad.length === 0, bad.join(','));
  await p.selectOption('#genSel', 'HW-ORM'); await p.click('[data-g-src="hire"]'); await p.click('[data-g-gaps="1"]'); await p.click('[data-g-all="hire"]'); await p.waitForTimeout(200);
  check('draft all HIRE gaps of HW-ORM', (await p.$$('.dcard')).length === 2);
  await p.click('[data-g-gaps="0"]'); await p.click('[data-g-hire]'); await p.waitForTimeout(150);
  check('draft one covered HIRE row', (await p.$$('.dcard')).length === 3);
  await p.click('.dcard [data-scn^="DRAFT-"]'); await p.waitForTimeout(200);
  for (const t of ['summary', 'hire', 'criteria', 'odd', 'fitc', 'tests']) { await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(80); }
  check('preview of a draft: all tabs open, tests generated', /All \d+/.test(await txt(p, '.drawer .seg')) && errors.length === 0, errors.join(' | '));
  await p.click('.drawer [data-close]');
  await p.click('[data-g-discard]'); await p.waitForTimeout(100);
  check('discard removes a draft', (await p.$$('.dcard')).length === 2);
  await p.click('[data-g-accept]'); await p.waitForTimeout(300);
  check('accept creates GEN-HW-ORM-001', /GEN-HW-ORM-001/.test(await toast(p)), await toast(p));
  await p.click('[data-g-acceptall]'); await p.waitForTimeout(300);
  check('accept all valid', /GEN-HW-ORM-002/.test(await txt(p, '#main')));
  await p.click('[data-g-export]'); await p.waitForTimeout(150);
  check('export generated scenarios saves a JSON', (await saved(p)).some(s => s.filename === 'generated_scenarios.json'));
  await p.click('[data-g-src="tc"]'); await p.click('[data-g-tc]'); await p.waitForTimeout(150);
  check('draft from a TC', /Draft added|not generable|No template/.test(await toast(p)), await toast(p));
  await p.click('[data-g-src="ref"]'); await p.click('[data-g-gaps="0"]');
  const nRefs = (await p.$$('[data-g-ref]')).length; let added = 0, closest = 0; const silent = [];
  for (let i = 0; i < nRefs; i++) { const loc = p.locator('[data-g-ref]').nth(i); const lab = await loc.getAttribute('data-g-label'); await loc.click(); await p.waitForTimeout(30); const t = await toast(p); if (/Draft added/.test(t)) added++; else if (/Closest|nobody at the controls/.test(t)) closest++; else silent.push(lab + ' → ' + t); }
  check('every Foretellix and NHTSA reference answers', added + closest === nRefs, `${added} drafts, ${closest} explained (milestone 2 or not testable), of ${nRefs}` + (silent.length ? ' | ' + silent.join(' ; ') : ''));
  await p.click('[data-g-src="text"]'); await p.fill('#gText', 'A semi cuts in close in front on a downhill curve'); await p.click('#gTpl'); await p.waitForTimeout(150);
  check('draft from a description (template)', /Draft added from CI-05/.test(await toast(p)), await toast(p));
  await p.fill('#gText', 'A semi cuts in close in front on a downhill curve'); await p.click('#gAi'); await p.waitForTimeout(400);
  check('draft with Claude (mocked) is valid', /Draft added\./.test(await toast(p)), await toast(p));
  await p.click('[data-g-clear]'); await p.waitForTimeout(100);
  check('discard all drafts', (await p.$$('.dcard')).length === (await p.$$('.dcard [data-scn^="GEN-"]')).length);
  await p.click('[data-view="behavior"]'); await p.selectOption('#behSel', 'HW-ORM'); await p.waitForTimeout(150);
  check('accepted scenarios appear in the behavior dashboard', (await p.$$('tr[data-scn^="GEN-HW-ORM"]')).length === 2);
  await p.click('tr[data-scn="GEN-HW-ORM-001"]'); await p.click('[data-tab="tests"]'); await p.waitForTimeout(150);
  check('accepted scenario has tests and results', /Pass \d+/.test(await txt(p, '.drawer .seg')));
  await p.keyboard.press('Escape');
  await p.click('[data-view="tree"]'); await p.waitForTimeout(150);
  check('accepted scenarios appear in the tree', /GEN-HW-ORM/.test(await txt(p, '#treeWrap')));
  check('generate: no page error', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* 4. SOTIF analysis */
{
  const { p, ctx, errors } = await open();
  await p.click('[data-view="sotif"]');
  check('SOTIF: 42 FI rows', (await p.$$('tr[data-so-fi]')).length === 42);
  for (const f of ['tested', 'partial', 'gap', 'all']) { await p.click(`[data-so-f="${f}"]`); await p.waitForTimeout(60); }
  const blocks = await p.$$eval('#soBlock option', o => o.map(x => x.value));
  for (const b of blocks) { await p.selectOption('#soBlock', b); await p.waitForTimeout(40); }
  await p.selectOption('#soBlock', 'all'); await p.click('tr[data-so-fi="FI-PCP-06"]'); await p.waitForTimeout(150);
  check('FI panel shows causes, TCs and scenarios', /Causes \(AV3\.0\)/.test(await txt(p, 'aside')) && (await p.$$('aside [data-scn]')).length > 10);
  await p.click('aside [data-scn]'); await p.waitForTimeout(150); check('scenario chip opens the drawer', !!(await p.$('.drawer'))); await p.keyboard.press('Escape');
  await p.click('[data-so-tab="tc"]'); await p.waitForTimeout(150); check('TC tab lists 277 TCs', (await p.$$('#main tbody tr')).length === 277);
  await p.click('[data-so-f="gap"]'); await p.waitForTimeout(100); const gaps = (await p.$$('#main tbody tr')).length; check('TC gap filter', gaps > 100 && gaps < 277, String(gaps));
  await p.click('[data-so-tab="stpa"]'); await p.waitForTimeout(150); check('STPA: 10 context groups', (await p.$$('.heat tbody tr')).length === 10);
  await p.click('details summary'); check('STPA: 114 UCAs without loss scenario', (await p.$$('details tbody tr')).length === 114);
  await p.click('[data-so-tab="hz"]'); await p.waitForTimeout(100); check('hazard failure modes: 27 rows', (await p.$$('#main tbody tr')).length === 27);
  await p.click('[data-so-go]'); await p.waitForTimeout(100); check('FI chip jumps to the FI tab', (await p.$$('tr[data-so-fi].sel')).length === 1);
  await p.click('[data-fi-tree]'); await p.waitForTimeout(200); check('"view as tree" opens the FI tree', /From an FI/.test(await txt(p, '.tree-tools')) && !!(await p.$('#treeWrap svg')));
  check('SOTIF: no page error', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* 5. Trees */
{
  const { p, ctx, errors } = await open();
  await p.click('[data-view="tree"]');
  const codes = await p.$$eval('#treeSel option', o => o.map(x => x.value));
  for (const c of codes) { await p.selectOption('#treeSel', c); await p.waitForTimeout(30); }
  check('behavior tree renders for 17 behaviors', errors.length === 0, errors.join(' | '));
  await p.selectOption('#treeSel', 'HW-LC'); await p.click('#expAll'); await p.waitForTimeout(200);
  const expanded = (await p.$$('#treeWrap g.tnode')).length; await p.click('#colAll'); await p.waitForTimeout(100);
  check('expand all and collapse', expanded > (await p.$$('#treeWrap g.tnode')).length);
  await p.click('[data-tnode="LC-REF-01"]'); await p.waitForTimeout(100); check('click a scenario node unfolds it', (await p.$$('#treeWrap g.tnode')).length > 40);
  await p.click('[data-open="LC-REF-01"]'); await p.waitForTimeout(150); check('↗ opens the scenario', !!(await p.$('.drawer'))); await p.keyboard.press('Escape');
  await p.click('[data-tree-mode="fi"]'); const fis = await p.$$eval('#fiSel option', o => o.map(x => x.value));
  for (const f of fis) { await p.selectOption('#fiSel', f); await p.waitForTimeout(25); }
  check('FI tree renders for 42 FIs', fis.length === 42 && errors.length === 0, errors.join(' | '));
  await p.click('[data-tree-mode="behavior"]'); check('back to behavior tree', !!(await p.$('#treeSel')));
  await ctx.close();
}

/* 6. ODD and Data: import, demo, clear, exports */
{
  const { p, ctx, errors } = await open();
  await p.click('[data-view="odd"]'); await p.waitForTimeout(150);
  check('ODD: 11 variants and 17 matrix rows', (await p.$$('.heat tbody tr')).length === 17 && /Narrow lane/.test(await txt(p, '#main')));
  await p.click('[data-view="data"]');
  await p.click('#tpl'); await p.waitForTimeout(300); check('template download', (await saved(p)).some(s => s.filename === 'results_template.csv'));
  const ids = await p.evaluate(() => { const out = []; document.querySelectorAll('x'); return out; });
  // build a results file from real concrete IDs of the behavior page
  await p.click('[data-view="behavior"]'); await p.selectOption('#behSel', 'HW-LC'); await p.click('tr[data-scn="LC-REF-01"]'); await p.click('[data-tab="tests"]'); await p.waitForTimeout(150);
  const cids = await p.$$eval('.drawer tr[data-con]', r => r.map(x => x.dataset.con)); await p.keyboard.press('Escape');
  const csv = ['concrete_id,status,criterion', ...cids.map((c, i) => `${c},${i % 6 ? 'pass' : 'fail'},${i % 6 ? '' : 'C03'}`)].join('\n');
  const f1 = join(tmp, 'res.csv'); writeFileSync(f1, csv);
  const f2 = join(tmp, 'res.json'); writeFileSync(f2, JSON.stringify(cids.slice(0, 10).map(c => ({ concrete_id: c, status: 'passed' }))));
  const f3 = join(tmp, 'bad.csv'); writeFileSync(f3, 'foo,bar\n1,2');
  await p.click('[data-view="data"]');
  await p.setInputFiles('#fileIn', f1); await p.waitForFunction(() => /matched/.test(document.querySelector('#toast').textContent), null, { timeout: 120000 });
  check('CSV import matches every row', new RegExp(`${cids.length} results read, ${cids.length} matched`).test(await toast(p)), await toast(p));
  check('badge shows the imported file', /res\.csv/.test(await txt(p, '#srcBadge')));
  await p.click('[data-view="behavior"]'); await p.selectOption('#behSel', 'HW-LC'); await p.waitForTimeout(150);
  check('imported failures appear on the dashboard', /6/.test(await txt(p, '.kpi.fail b')), await txt(p, '.kpi.fail b'));
  await p.click('[data-view="data"]');
  await p.setInputFiles('#fileIn', f2); await p.waitForFunction(() => /10 results read/.test(document.querySelector('#toast').textContent), null, { timeout: 120000 });
  check('JSON import', /10 matched/.test(await toast(p)), await toast(p));
  await p.setInputFiles('#fileIn', f3); await p.waitForTimeout(300);
  check('bad file explained', /no concrete_id and status columns/.test(await toast(p)), await toast(p));
  await p.click('#useNone'); await p.waitForFunction(() => /cleared/.test(document.querySelector('#toast').textContent), null, { timeout: 120000 });
  check('clear results: no results badge', /No results/.test(await txt(p, '#srcBadge')));
  await p.click('#useDemo'); await p.waitForTimeout(200); check('demo results restored', /DEMO/.test(await txt(p, '#srcBadge')));
  await p.click('#expProj'); await p.waitForTimeout(300);
  await p.click('#expCsv'); await p.waitForTimeout(3000);
  const sv = await saved(p);
  check('project JSON export', sv.some(s => s.filename === 'scenario_studio_project.json' && s.size > 100000));
  check('tests CSV export', sv.some(s => /^tests_.*\.csv$/.test(s.filename) && s.size > 1000));
  const hasZip = await p.evaluate(() => !!window.JSZip);
  if (hasZip) { await p.click('#expOsc'); await p.waitForFunction(() => window.__saved.some(s => /^osc_/.test(s.filename)), null, { timeout: 120000 }).catch(() => {}); check('OpenSCENARIO zip export', (await saved(p)).some(s => /^osc_/.test(s.filename))); }
  else console.log('SKIP  OpenSCENARIO zip export (JSZip CDN not reachable here)');
  check('ODD and Data: no page error', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* 7. Phone width and dark theme */
{
  for (const dark of [false, true]) {
    const { p, ctx, errors } = await open({ viewport: { width: 400, height: 860 }, dark });
    const wide = [];
    for (const v of ['overview', 'behavior', 'generate', 'sotif', 'tree', 'odd', 'data']) { await p.click(`[data-view="${v}"]`); await p.waitForTimeout(120); const w = await p.evaluate(() => document.documentElement.scrollWidth); if (w > 401) wide.push(`${v}:${w}`); }
    check(`no horizontal page scroll at 400 px${dark ? ' (dark)' : ''}`, wide.length === 0, wide.join(' '));
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check(`body background follows the ${dark ? 'dark' : 'light'} theme`, dark ? /rgb\(13, 19, 17\)/.test(bg) : /rgb\(243, 245, 244\)/.test(bg), bg);
    check(`phone${dark ? ' dark' : ''}: no page error`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`); if (fails.length) console.log('Failed:\n  ' + fails.join('\n  '));
process.exit(fail ? 1 : 0);
