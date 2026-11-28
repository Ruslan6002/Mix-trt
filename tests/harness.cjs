const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const { DOMParser: Parser } = require("linkedom");
class DOMParser extends Parser {
  parseFromString(text, type) {
    const d = super.parseFromString(text.replace(/\bID=/g, "id="), type);
    d.querySelectorAll("tr").forEach((tr) =>
      Object.defineProperty(tr, "cells", {
        get: () => tr.querySelectorAll("td,th"),
      }),
    );
    return d;
  }
}
function createHarness(options = {}) {
  const document = new DOMParser().parseFromString(
    '<html><body><nav id="nav"></nav><div id="view"></div></body></html>',
    "text/html",
  );
  const storage = options.storage || new Map(),
    session = options.session || new Map(),
    alerts = [],
    blobs = [],
    answers = [],
    events = {};
  const api = (map) => ({
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      if (options.quota) throw Error("quota");
      map.set(k, String(v));
    },
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  });
  const window = {
    scrollY: 0,
    scrollTo(x, y) {
      this.scrollY = y;
    },
    addEventListener: (name, fn) => (events[name] = fn),
  };
  const context = vm.createContext({
    document,
    ...(options.indexedDB ? { indexedDB: options.indexedDB } : {}),
    DOMParser,
    xlsx: require("xlsx"),
    structuredClone,
    console,
    Date,
    File,
    Blob,
    Uint8Array,
    TextDecoder,
    TextEncoder,
    atob,
    btoa,
    window,
    requestAnimationFrame: (fn) => fn(),
    setTimeout: () => 0,
    localStorage: api(storage),
    sessionStorage: api(session),
    alert: (m) => alerts.push(m),
    confirm: () => (answers.length ? answers.shift() : true),
    prompt: () => options.year || "2026",
    navigator: {
      clipboard: {
        readText: async () => options.clipboard || "",
        writeText: async (t) => (options.clipboard = t),
      },
    },
    URL: {
      createObjectURL: (blob) => {
        blobs.push(blob);
        return "blob:qa";
      },
      revokeObjectURL() {},
    },
    location: { reload() {} },
  });
  const source = fs
    .readFileSync(path.join(__dirname, "../app.js"), "utf8")
    .replace(
      /await import\(\s*['"]https:\/\/cdn.sheetjs.com\/xlsx-0\.20\.3\/package\/xlsx.mjs['"]\s*\)/g,
      "xlsx",
    );
  vm.runInContext(source, context);
  const run = (code) => vm.runInContext(code, context);
  return {
    context,
    document,
    storage,
    session,
    alerts,
    blobs,
    answers,
    events,
    options,
    run,
    state: () => JSON.parse(run("JSON.stringify(s)")),
  };
}
function workbook({
  fitHeader = 7,
  shopHeader = 9,
  period = "11.2026",
  fact = 10,
} = {}) {
  const x = require("xlsx"),
    book = x.utils.book_new(),
    a = [],
    b = [],
    f = [];
  a[3] = [null, "KPI MIX за " + period];
  a[8] = [null, null, "KPI", null, null, "ФАКТ", null, "ПЛАН"];
  ["BEER", "Flash", "CSD", "Lipton"].forEach(
    (name, i) => (a[9 + i] = [null, null, name, null, null, fact, null, 20]),
  );
  b[shopHeader] = [];
  Object.assign(b[shopHeader], {
    3: "Код матрицы",
    4: "Shop Id",
    6: "Наименование ТТ",
    12: "Дата визита",
    35: "Flash Up Energy Ultra бан.0.43л",
  });
  b[shopHeader + 1] = [];
  Object.assign(b[shopHeader + 1], {
    3: "QA_MATRIX",
    4: "QA-A",
    6: "магазин QA (ул Тестовая д 1)",
    12: 46000,
    35: 2,
  });
  f[fitHeader] = [];
  Object.assign(f[fitHeader], {
    3: "Код точки",
    4: "Торговая точка",
    7: "Нац. группа выставлена в ХО",
    17: "Total Beer",
    18: "Нац. Группа CSD",
    22: "Flash Up",
    23: "Total NonAlco",
  });
  f[fitHeader + 1] = [];
  Object.assign(f[fitHeader + 1], {
    3: "QA-A",
    4: "магазин QA (ул Тестовая д 1)",
    7: 0.3,
    17: 1,
    18: 0.4,
    22: 0.2,
    23: 1,
  });
  [a, [], [], b, f].forEach((rows, i) =>
    x.utils.book_append_sheet(
      book,
      x.utils.aoa_to_sheet(rows),
      "Sheet" + (i + 1),
    ),
  );
  return {
    name: "synthetic.xlsx",
    arrayBuffer: async () =>
      x.write(book, { type: "buffer", bookType: "xlsx" }),
  };
}
module.exports = { createHarness, workbook };
