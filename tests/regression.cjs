// Only synthetic records belong in this repository. Optional private inputs stay outside it.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { DOMParser: BaseParser } = require("linkedom");
class DOMParser extends BaseParser {
  parseFromString(...args) {
    args[0] = args[0].replace(/\bID=/g, "id=");
    const doc = super.parseFromString(...args);
    doc.querySelectorAll("tr").forEach((tr) =>
      Object.defineProperty(tr, "cells", {
        get: () => tr.querySelectorAll("td,th"),
      }),
    );
    return doc;
  }
}
const xlsx = require("xlsx");
const html = fs.readFileSync(
  require("node:path").join(__dirname, "../index.html"),
  "utf8",
);
const document = new DOMParser().parseFromString(
  '<html><body><nav id="nav"></nav><div id="view"></div></body></html>',
  "text/html",
);
const storage = new Map();
const alerts = [];
const context = vm.createContext({
  document,
  DOMParser,
  xlsx,
  structuredClone,
  console,
  Date,
  File,
  Blob,
  setTimeout: () => 0,
  URL,
  TextDecoder,
  Uint8Array,
  atob,
  window: {
    scrollY: 0,
    scrollTo(x, y) {
      this.scrollY = y;
    },
    addEventListener() {},
  },
  requestAnimationFrame: (fn) => fn(),
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  alert: (m) => alerts.push(m),
  confirm: () => true,
  prompt: () => "2026",
  localStorage: {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
  },
});
let source = fs
  .readFileSync(require("node:path").join(__dirname, "../app.js"), "utf8")
  .replace(
    /await import\(\s*['"]https:\/\/cdn.sheetjs.com\/xlsx-0\.20\.3\/package\/xlsx.mjs['"]\s*\)/g,
    "xlsx",
  );
vm.runInContext(source, context);
const run = (code) => vm.runInContext(code, context);
let count = 0;
function test(name, code, verify) {
  const result = run(code);
  verify(result);
  count++;
  console.log("PASS", name);
}
async function main() {
  test(
    "independent Flash cooler selects correct rules",
    "equipmentModes({non:'none',flash:'yes'}).type",
    (v) => assert.equal(v, "flash"),
  );
  test(
    "no cooler selects shelf rules",
    "equipmentModes({non:'none',flash:'none'}).type",
    (v) => assert.equal(v, "none"),
  );
  test(
    "beer door count keeps beer rules",
    "equipmentModes({non:'pepsi2',beer:'2d',flash:'none'}).beer",
    (v) => assert.equal(v, "yes"),
  );
  test(
    "legacy Flash cooler selection remains supported",
    "equipmentModes({non:'flash'}).flashHO",
    (v) => assert.equal(v, "yes"),
  );
  test(
    "initial startup renders",
    "document.getElementById('view').textContent",
    (v) => assert.match(v, /План действий/),
  );
  for (let i = 0; i < 11; i++)
    test(
      "section " + i,
      `go(${i});document.getElementById('view').textContent`,
      (v) => assert.ok(v.length > 0),
    );
  test(
    "Pepsi criteria are correctly indexed",
    "fitRules('pepsi','').map(g=>g.idx).join(',')",
    (v) => assert.equal(v, "11,12,15,13,14"),
  );
  test(
    "headers override physical column positions",
    "fitCriterion({criterionHeaders:['Flash Up'],criteria:[.2]},fitRules('pepsi','').find(g=>g.key==='flash'))",
    (v) => assert.equal(v, 0.2),
  );
  test(
    "two extra Flash flavours required",
    "fitMissing(fitRules('flash','').find(g=>g.key==='flash'),['Flash Up Energy Exotic бан.0.43л'],[],[]).find(x=>x.name.includes('дополнительных')).name",
    (v) => assert.match(v, /не хватает 1 SKU/),
  );
  test(
    "equivalent Flash volumes count once",
    "fitMissing(fitRules('none','').find(g=>g.key==='flash'),['Flash Up Energy Exotic бан.0.43л','Flash Up Energy Exotic бан 0.45л'],[],[])[0].name",
    (v) => assert.match(v, /не хватает 1 SKU/),
  );
  test(
    "zero stock is distinguished",
    "fitMissing(fitRules('none','').find(g=>g.key==='csd'),[],[],[{name:'PEPSI pet 2.0 (IM)',qty:0}])[0].stocks[0].qty",
    (v) => assert.equal(v, 0),
  );
  test(
    "SKU names never expose regular expressions",
    "fitMissing(fitRules('none','').find(g=>g.key==='csd'),[],[],[])[0].name",
    (v) => assert.equal(v, "Pepsi 2 л"),
  );
  test(
    "invalid restore rejected",
    "(()=>{try{validateMix({kpi:[],clients:[],tasks:[]});return false}catch{return true}})()",
    (v) => assert.equal(v, true),
  );
  test(
    "older backups receive missing defaults",
    "validateMix({kpi:structuredClone(initial.kpi),clients:[],tasks:[]}).pay.base",
    (v) => assert.equal(v, 0),
  );
  test(
    "invalid calendar route date rejected",
    "(()=>{try{validateMix({...initial,routeDay:'2026-02-31'});return false}catch{return true}})()",
    (v) => assert.equal(v, true),
  );
  test(
    "legacy equipment survives Shop ID migration",
    "s.fitEquipment={'Synthetic shop\\u001f':{non:'flash'}};fitLegacyEquipment({name:'магазин Synthetic shop (адрес)'}).non",
    (v) => assert.equal(v, "flash"),
  );
  test(
    "Flash goal is consistently 100 percent",
    "go(0);document.getElementById('view').textContent",
    (v) => assert.match(v, /До 100%/),
  );
  test(
    "broken nested routes rejected",
    "(()=>{try{validateMix({...initial,routes:{'2026-11-27':null}});return false}catch{return true}})()",
    (v) => assert.equal(v, true),
  );
  test(
    "ambiguous shop names are not guessed",
    "routeMatch([{name:'магазин Тест (адрес 1)'},{name:'магазин Тест (адрес 2)'}],'Тест')",
    (v) => assert.equal(v, null),
  );
  test(
    "unique matching uses supplied address",
    "routeMatch([{name:'магазин Тест (адрес 1)'},{name:'магазин Тест (адрес 2)'}],'Тест','адрес 2').name",
    (v) => assert.match(v, /адрес 2/),
  );
  test(
    "route changes and notes persist",
    "s.routeDay='2026-11-27';s.routes={'2026-11-27':[{name:'QA shop'}]};routeNote(0,'Remember');routeStatus(0,'Посещено');JSON.parse(localStorage.getItem('mix-v1')).routeNotes['QA shop\\u001f']",
    (v) => assert.equal(v, "Remember"),
  );
  test(
    "note survives change of date",
    "s.weekRoute={5:['QA shop']};s.routeDay='2026-12-04';routeGetNote(routeRows(s.routeDay)[0])",
    (v) => assert.equal(v, "Remember"),
  );
  test(
    "clearing legacy note stays cleared",
    "s.routeNotes={'qa shop\\u001f':'legacy'};routeNote(0,'');routeGetNote(routeRows(s.routeDay)[0])",
    (v) => assert.equal(v, ""),
  );
  test(
    "stock parser units, quantities and zero",
    "JSON.stringify(parseStock(['Flash Up Energy бан.0.43л*24, бан 48,000','PEPSI pet 1.0 (IM)*12, бут.']))",
    (v) => {
      const a = JSON.parse(v);
      assert.equal(a.length, 2);
      assert.equal(a[0].pack, 24);
      assert.equal(a[1].qty, 0);
    },
  );
  const mono =
    '<html><table id="Table2"><tr><td>Ежедневный отчет ТП за 26.11</td></tr></table><table id="Table5"><tr id="t0"><td>1</td><td>Sell-In PEPSI pet 1.0 (IM)</td><td>24</td><td>0</td><td>0</td><td>0</td><td>0</td></tr><tr id="t1"><td>ИТОГО</td><td>24</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></table></html>';
  context.mono = mono;
  test(
    "Sell-in zero price and rounded volume are included",
    "monoParse(mono,'2026').rows[0].lit",
    (v) => assert.equal(v, 24),
  );
  test(
    "invalid Monolit date rejected",
    "(()=>{try{monoParse(mono.replace('26.11','31.11'),'2026');return false}catch{return true}})()",
    (v) => assert.equal(v, true),
  );
  test(
    "two-day forecast avoids already-accounted reports",
    "s.detail={period:'11.2026',kpi:[{name:'CSD',fact:100,plan:1000}]};s.forecastDate='2026-11-27';s.monolit={'2026-11-25':{date:'2026-11-25',rows:[{cat:'CSD',lit:999}]},'2026-11-26':{date:'2026-11-26',rows:[{cat:'CSD',lit:24}]},'2026-11-27':{date:'2026-11-27',rows:[{cat:'CSD',lit:12}]}};JSON.stringify(monoForecast()[0])",
    (v) => {
      const f = JSON.parse(v);
      assert.equal(f.a, 10);
      assert.equal(f.b, 12.4);
      assert.ok(Math.abs(f.c - 13.6) < 1e-9);
      assert.equal(f.left, 1064);
    },
  );
  test(
    "forecast rejects mismatched month",
    "s.forecastDate='2026-12-01';monoForecast().length",
    (v) => assert.equal(v, 0),
  );
  await run(
    "s=structuredClone(initial);save();restoreMix({text:async()=>JSON.stringify({...initial,clients:[{a:'Restored',b:''}]})})",
  );
  test(
    "restore saves previous state",
    "localStorage.getItem('mix-before-restore')",
    (v) => assert.ok(v),
  );
  // Deterministic fixtures with the same five-sheet layout as the imported workbook.
  const book = xlsx.utils.book_new();
  const a = [];
  a[3] = [null, "Детализация за 11.2026"];
  a[8] = [null, null, "KPI", null, null, "ФАКТ", null, "ПЛАН"];
  ["BEER", "Flash", "CSD", "Lipton"].forEach((n, i) => {
    a[9 + i] = [];
    a[9 + i][2] = n;
    a[9 + i][5] = 10;
    a[9 + i][7] = 20;
  });
  const b = [];
  b[9] = [];
  b[9][3] = "Код матрицы";
  b[9][4] = "Shop Id";
  b[9][6] = "Наименование ТТ";
  b[9][12] = "Дата визита";
  b[9][35] = "Flash Up Energy Ultra бан.0.43л";
  b[10] = [];
  b[10][4] = 123;
  b[10][6] = "Synthetic shop";
  b[10][12] = 46000;
  b[10][35] = 3;
  const f = [];
  f[7] = [];
  f[7][3] = "Код точки";
  f[7][4] = "Торговая точка";
  f[7][17] = "Total Beer";
  f[7][23] = "Total NonAlco";
  f[7][18] = "Нац. Группа CSD";
  f[7][22] = "Flash Up";
  f[8] = [];
  f[8][3] = 123;
  f[8][4] = "Synthetic shop";
  f[8][18] = 0;
  f[8][22] = 0.2;
  f[8][23] = 0.2;
  [a, [], [], b, f].forEach((rows, i) =>
    xlsx.utils.book_append_sheet(
      book,
      xlsx.utils.aoa_to_sheet(rows),
      "Sheet" + (i + 1),
    ),
  );
  const bytes = xlsx.write(book, { type: "buffer", bookType: "xlsx" });
  context.file = { name: "synthetic.xlsx", arrayBuffer: async () => bytes };
  run("s=structuredClone(initial);go(7)");
  await run("loadDetail(file)");
  test("five-sheet Excel import", "s.detail.kpi[0].fact", (v) =>
    assert.equal(v, 100),
  );
  test("Excel import retains shop ID", "s.detail.shops[0].id", (v) =>
    assert.equal(v, "123"),
  );
  test(
    "FIT recommendation renders for every reported shop",
    "fitHTML('')",
    (v) => {
      assert.match(v, /FIT · рекомендации Urban/);
      assert.doesNotMatch(v, /NaN/);
    },
  );
  console.log(`${count} checks passed`);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
