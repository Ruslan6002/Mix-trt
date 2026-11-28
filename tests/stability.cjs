const assert = require("node:assert/strict");
const { createHarness, workbook } = require("./harness.cjs");
let count = 0;
async function check(name, fn) {
  await fn();
  count++;
  console.log("PASS", name);
}
async function main() {
  const h = createHarness(),
    run = h.run;
  for (const header of [6, 7, 10])
    await check(
      "FIT header row " + header + " includes the first store",
      async () => {
        h.context.file = workbook({ fitHeader: header });
        run("go(7)");
        await run("loadDetail(file)");
        assert.equal(h.state().detail.fit.length, 1);
        assert.equal(h.state().detail.fit[0].id, "QA-A");
        assert.equal(
          h.state().detail.fit[0].criterionHeaders[11],
          "Нац. Группа CSD",
        );
      },
    );
  await check("matrix and catalog are imported", () => {
    assert.equal(h.state().detail.shops[0].matrix, "QA_MATRIX");
    assert.equal(h.state().detail.skuCatalog.length, 1);
  });
  await check("same Excel is idempotent", async () => {
    const before = h.state().detailHistory.length;
    await run("loadDetail(file)");
    assert.equal(h.state().detailHistory.length, before);
  });
  await check("decreasing KPI requires explicit acceptance", async () => {
    const original = h.state().detail;
    h.context.file = workbook({ fact: 1 });
    h.answers.push(false);
    await run("loadDetail(file)");
    assert.deepEqual(h.state().detail, original);
  });
  await check("damaged Excel preserves the last report", async () => {
    h.context.file = {
      name: "bad.xlsx",
      arrayBuffer: async () => new Uint8Array([0, 1, 2]).buffer,
    };
    const before = h.state().detail;
    await run("loadDetail(file)");
    assert.deepEqual(h.state().detail, before);
    assert.match(
      h.document.getElementById("detailstatus").textContent,
      /Ошибка/,
    );
  });
  await check("empty Excel preserves the last report", async () => {
    h.context.file = {
      name: "empty.xlsx",
      arrayBuffer: async () => new ArrayBuffer(0),
    };
    const before = h.state().detail;
    await run("loadDetail(file)");
    assert.deepEqual(h.state().detail, before);
  });
  await check("matched FIT-only point has an honest matrix status", () => {
    assert.match(
      run("matrixText(null,{id:'QA-A'})"),
      /нет строки матрицы в Sheet4/,
    );
  });
  await check("explicit ID wins over an ambiguous name", () => {
    assert.equal(
      run(
        "routeMatch([{id:'QA-A',name:'QA'},{id:'QA-B',name:'QA'}],'QA','','QA-B').id",
      ),
      "QA-B",
    );
  });
  await check("an unknown explicit ID never guesses by name", () => {
    assert.equal(
      run("routeMatch([{id:'QA-A',name:'QA'}],'QA','','QA-UNKNOWN')"),
      null,
    );
  });
  await check("address conflict does not pick a different shop", () => {
    assert.equal(
      run("routeMatch([{id:'QA-A',name:'QA (Тестовая 1)'}],'QA','Тестовая 2')"),
      null,
    );
  });
  await check("client address and IP suffix still match", () => {
    assert.equal(
      run(
        "routeMatch([{id:'QA-A',name:'магазин QA (область город ул Тестовая д 1)'}],'QA','Тестовая 1 · QA ИП').id",
      ),
      "QA-A",
    );
  });
  await check("full historical FIT does not suppress a shelf check", () => {
    const text = run(
      "fitAdvice({name:'QA'},s.detail.shops[0],s.detail.fit[0],null)",
    );
    run("s.fitEquipment={'shop:QA-A':{non:'pepsi1',beer:'1d',flash:'none'}}");
    assert.match(
      run("fitAdvice({name:'QA'},s.detail.shops[0],s.detail.fit[0],null)"),
      /data-shelf-sku/,
    );
  });
  await check(
    "one-door Focus includes Blackberry and excludes Premium bottle",
    () => {
      const text = run(
        "fitAdvice({name:'QA'},s.detail.shops[0],s.detail.fit[0],null)",
      );
      assert.match(text, /Somersby Blackberry/);
      assert.doesNotMatch(text, /Holsten Premium бутылка/);
      assert.doesNotMatch(text, /Somersby Strawberry-Kiwi/);
    },
  );
  await check("two-door Focus includes both Somersby flavours", () => {
    run("s.fitEquipment['shop:QA-A'].beer='2d'");
    const text = run(
      "fitAdvice({name:'QA'},s.detail.shops[0],s.detail.fit[0],null)",
    );
    assert.match(text, /Somersby Blackberry/);
    assert.match(text, /Somersby Strawberry-Kiwi/);
  });
  await check("unconfirmed Zero/Mirinda volumes are not doubled", () => {
    const groups = JSON.parse(run("JSON.stringify(fitRules('pepsi',''))"));
    const focus = groups.find((x) => x.key === "focusNon");
    assert.equal(focus.items.filter((x) => x.unconfirmed).length, 2);
    assert.equal(focus.items.length, 5);
  });
  const brands = [
    ["Holsten Pilsener, т/у бан. 0,43*24", "Holsten", "pilsener"],
    ["Хольстен Premium бут. 0,5*20", "Holsten", "pilsener"],
    ["Carlsberg FOIL Can 0.45*24", "Carlsberg", ""],
    ["Garage Hardcore Mango бан 0,43*24", "Garage", "mango"],
    ["Somersby Strawberry-Kiwi бан 0.43*24", "Somersby", "strawberry kiwi"],
  ];
  for (const [name, brand, flavor] of brands)
    await check("product identity " + brand + " " + flavor, () => {
      h.context.name = name;
      const p = JSON.parse(run("JSON.stringify(productInfo(name))"));
      assert.equal(p.brand, brand);
      assert.equal(p.flavor, flavor);
      assert.equal(p.pack, name.includes("*20") ? 20 : 24);
    });
  for (const [taste, expected] of [
    ["лимона", "lemon"],
    ["персика", "peach"],
    ["малины", "raspberry"],
    ["манго и маракуйя", "mango"],
  ])
    for (const volume of [0.5, 1])
      await check("Lipton " + expected + " " + volume, () => {
        h.context.name =
          "Чай черный Липтон со вкусом " +
          taste +
          ", " +
          String(volume).replace(".", ",") +
          "*12";
        const p = JSON.parse(run("JSON.stringify(productInfo(name))"));
        assert.equal(p.flavor, expected);
        assert.equal(p.volume, volume);
        const rule = run(
          "fitRules('pepsi','').flatMap(g=>g.items).find(x=>x.brand==='Lipton'&&x.flavor==='" +
            expected +
            "'&&x.volume===" +
            volume +
            ")",
        );
        assert.ok(rule);
        h.context.rule = rule;
        assert.equal(run("productMatch(rule,name)"), true);
      });
  await check("Pepsi 1.5 is not Pepsi 0.5", () => {
    assert.equal(
      run(
        "productMatch(fitRules('pepsi','')[0].items.find(x=>x.label==='Pepsi 0,5 л'),'Напиток PEPSI-COLA ПЭТ 1.5*6')",
      ),
      false,
    );
  });
  await check("exact SKU volumes remain separate in stock", () => {
    run(
      "s.stockReport={rows:parseStock(['Flash Up Energy бан 0.43*24, бан 50,000','Flash Up Energy бан 0.45*24, бан 30,000'])}",
    );
    assert.equal(run("stockBase().length"), 2);
  });
  await check("BIB and kegs are classified independently", () => {
    assert.equal(
      run("parseStock(['Напиток PEPSI БИБ 20, шт 1,000'])[0].bib"),
      true,
    );
    assert.equal(
      run("parseStock(['Пиво Holsten Pilsener кег 30, кега 3,000'])[0].keg"),
      true,
    );
  });
  await check("zero stock is excluded from an order", () => {
    run(
      "s.stockReport={rows:parseStock(['PEPSI pet 2.0*6, бут. 0,000'])};s.fitChecks={};fitCheck('shop:QA-A','2026-11-28','csd:Pepsi 2 л','no')",
    );
    assert.equal(
      run(
        "fitModel('shop:QA-A','2026-11-28',fitRules('none','')).order.length",
      ),
      0,
    );
  });
  await check("stock refresh recomputes order without changing marks", () => {
    run("s.stockReport.rows[0].qty=12");
    assert.equal(
      run(
        "fitModel('shop:QA-A','2026-11-28',fitRules('none','')).order.length",
      ),
      1,
    );
  });
  await check("yes removes a row from the pending list", () => {
    run("fitCheck('shop:QA-A','2026-11-28','csd:Pepsi 2 л','yes')");
    assert.equal(
      run(
        "fitModel('shop:QA-A','2026-11-28',fitRules('none','')).pending.some(x=>x.sku==='csd:Pepsi 2 л')",
      ),
      false,
    );
  });
  await check("undo brings the item back", () => {
    run("fitCheck('shop:QA-A','2026-11-28','csd:Pepsi 2 л','')");
    assert.equal(
      run(
        "fitModel('shop:QA-A','2026-11-28',fitRules('none','')).pending.some(x=>x.sku==='csd:Pepsi 2 л')",
      ),
      true,
    );
  });
  await check("other shop checks remain independent", () => {
    run("fitCheck('shop:QA-A','2026-11-28','csd:Pepsi 2 л','no')");
    assert.equal(
      run("fitSnapshot('shop:QA-B','2026-11-28',s.fitChecks)['csd:Pepsi 2 л']"),
      undefined,
    );
  });
  await check("carryover is copied and previous visits stay unchanged", () => {
    run("fitCheck('shop:QA-A','2026-11-29','csd:Pepsi 2 л','yes')");
    assert.equal(
      run("fitSnapshot('shop:QA-A','2026-11-28',s.fitChecks)['csd:Pepsi 2 л']"),
      "no",
    );
    assert.equal(
      run("fitSnapshot('shop:QA-A','2026-11-29',s.fitChecks)['csd:Pepsi 2 л']"),
      "yes",
    );
  });
  await check("unconfirmed volumes never create an automatic order", () => {
    run(
      "s.stockReport={rows:parseStock(['PEPSI Zero pet 0.5*12, бут. 24,000'])};fitCheck('shop:QA-A','2026-11-28','focusNon:Pepsi Zero · объём уточнить','no')",
    );
    assert.equal(
      run(
        "fitModel('shop:QA-A','2026-11-28',fitRules('pepsi','')).order.length",
      ),
      0,
    );
  });
  await check("discontinued Flash cannot match any order slot", () => {
    assert.equal(
      run("productMatch({re:/flash/i},'Flash Night Movie бан 0.45*24')"),
      false,
    );
    assert.equal(
      run("productMatch({re:/flash/i},'Flash Peach Pineapple бан 0.45*24')"),
      false,
    );
  });
  await check("additional Flash uses two different flavours", () => {
    run(
      "s.stockReport={rows:parseStock(['Flash Up Energy Exotic бан 0.43*24, бан 50,000','Flash Up Energy Exotic бан 0.45*24, бан 30,000','Flash Up Energy Bubble Gum бан 0.43*24, бан 60,000'])};s.fitChecks={};fitCheck('shop:QA-A','2026-11-28','flash:choice:exotic','no');fitCheck('shop:QA-A','2026-11-28','flash:choice:bubble gum','no')",
    );
    assert.equal(
      run(
        "fitModel('shop:QA-A','2026-11-28',fitRules('flash','')).order.length",
      ),
      2,
    );
  });
  await check("duplicate matching slots do not duplicate an order row", () => {
    assert.equal(
      run(
        "fitModel('shop:QA-A','2026-11-28',[...fitRules('flash',''),...fitRules('flash','')]).order.length",
      ),
      2,
    );
  });
  await check(
    "compact order shows packaging but not faces or stock quantities",
    () => {
      const text = run(
        "fitOrderList('shop:QA-A','2026-11-28',fitModel('shop:QA-A','2026-11-28',fitRules('flash','')).order)",
      );
      assert.match(text, /24 шт\.\/уп\./);
      assert.doesNotMatch(text, /фейс|Остаток|50 шт/);
    },
  );
  await check("HTML importer strips active resources and handlers", () => {
    const text = run(
      'safeReportHTML(\'<img src="https://invalid.test"><script>bad()</script><table id="Table5" onclick="bad()"><tr id="t0"><td>OK</td></tr></table>\')',
    );
    assert.doesNotMatch(text, /src|script|onclick/);
    assert.match(text, /Table5/);
  });
  await check("data URL and whitespace Base64 import", () => {
    assert.equal(
      run("decodeShortcut('data:application/pdf;base64,JVBE Ri0=\\n').pdf"),
      true,
    );
  });
  await check("broken Base64 produces an error", () => {
    assert.throws(() => run("decodeShortcut('!not-base64!')"));
  });
  await check("visit index follows the store when a route is reordered", () => {
    run(
      "s.routeDay='2026-11-28';s.routes={'2026-11-28':[{name:'QA one'},{name:'QA two'}]};visitStart(0);s.routes['2026-11-28'].reverse()",
    );
    assert.equal(run("visitCurrent().i"), 1);
  });
  await check("active visit survives a fresh runtime", () => {
    const restarted = createHarness({ storage: h.storage, session: new Map() });
    assert.equal(
      restarted.run("visitCurrent().key"),
      run("visitCurrent().key"),
    );
  });
  await check("ending two visits preserves separate snapshots", () => {
    run("visitEnd('Посещено');visitStart(1);visitEnd('Без заказа')");
    assert.equal(h.state().visitHistory.length, 2);
    assert.notEqual(h.state().visitHistory[0].id, h.state().visitHistory[1].id);
    assert.equal(h.state().activeVisit, null);
  });
  await check("render keeps open equipment panel", () => {
    run("go(3)");
    h.document.getElementById("view").innerHTML =
      "<details open><summary>QA panel</summary>Body</details>";
    h.document.querySelector("details").open = true;
    run("rememberView();render()");
    assert.ok(
      run(
        "Object.values(viewStates).some(x=>Object.values(x.details).includes(true))",
      ),
    );
  });
  await check(
    "backup includes every business collection and session view",
    async () => {
      await run(
        "s.clients=[{a:'QA one',b:'Тестовая 1'}];s.routeNotes={'QA one\\u001f':'note'};s.fitLinks={qa:'QA-A'};backup()",
      );
      const value = JSON.parse(await h.blobs.at(-1).text());
      for (const field of [
        "clients",
        "routes",
        "weekRoute",
        "fitEquipment",
        "fitChecks",
        "visitHistory",
        "detailHistory",
        "stockReport",
        "routeNotes",
        "fitLinks",
        "uiState",
      ])
        assert.ok(field in value, field);
      h.context.backupValue = value;
    },
  );
  await check("clear test store and restore the exported JSON", async () => {
    const value = h.context.backupValue;
    h.storage.clear();
    const clean = createHarness({ storage: h.storage });
    clean.context.file = { text: async () => JSON.stringify(value) };
    await clean.run("restoreMix(file)");
    for (const field of [
      "clients",
      "routes",
      "fitChecks",
      "visitHistory",
      "fitEquipment",
      "routeNotes",
      "stockReport",
    ])
      assert.deepEqual(clean.state()[field], value[field], field);
  });
  await check("corrupt FIT backup leaves the store unchanged", async () => {
    const before = h.storage.get("mix-v1");
    h.context.bad = { ...h.state(), fitChecks: { bad: {} } };
    await run("restoreMix({text:async()=>JSON.stringify(bad)})");
    assert.equal(h.storage.get("mix-v1"), before);
  });
  await check("quota failure rolls back shelf changes", () => {
    const before = h.state().fitChecks;
    h.options.quota = true;
    run("fitCheck('shop:QA-A','2026-11-28','csd:Pepsi 2 л','yes')");
    h.options.quota = false;
    assert.deepEqual(h.state().fitChecks, before);
  });
  await check("corrupt startup storage is preserved byte-for-byte", () => {
    const storage = new Map([["mix-v1", "{broken"]]);
    const broken = createHarness({ storage });
    assert.equal(storage.get("mix-v1"), "{broken");
    assert.match(
      broken.document.getElementById("view").textContent,
      /Исходная запись сохранена/,
    );
  });

  await check("JSON backup restores original IndexedDB documents", async () => {
    const { IDBFactory } = require("fake-indexeddb");
    const d = createHarness({ indexedDB: new IDBFactory() });
    d.context.file = new File(["private QA bytes"], "qa-document.txt", {
      type: "text/plain",
    });
    await d.run("go(6);uploadDocs([file])");
    await d.run("backup()");
    const value = JSON.parse(await d.blobs.at(-1).text());
    assert.equal(value.documents.length, 1);
    d.storage.clear();
    d.context.indexedDB = new IDBFactory();
    d.context.file = { text: async () => JSON.stringify(value) };
    await d.run("restoreMix(file)");
    let docs = await d.run("storedDocuments()");
    assert.equal(docs.length, 1);
    assert.equal(await docs[0].file.text(), "private QA bytes");
    await d.run("restoreMix(file)");
    docs = await d.run("storedDocuments()");
    assert.equal(docs.length, 1);
  });
  await check("bad document Base64 rejects the whole restore", async () => {
    const d = createHarness();
    const before = d.storage.get("mix-v1");
    d.context.value = {
      ...d.state(),
      documents: [{ name: "qa.txt", base64: "!bad!" }],
    };
    await d.run("restoreMix({text:async()=>JSON.stringify(value)})");
    assert.equal(d.storage.get("mix-v1"), before);
  });
  await check(
    "document transaction failure rolls back business state",
    async () => {
      const d = createHarness();
      d.run("save()");
      const before = d.storage.get("mix-v1");
      d.context.value = {
        ...d.state(),
        clients: [{ a: "QA restored", b: "" }],
        documents: [{ name: "qa.txt", base64: "UUE=" }],
      };
      d.run('restoreDocuments=async()=>{throw Error("QA database failure")}');
      await d.run("restoreMix({text:async()=>JSON.stringify(value)})");
      assert.equal(d.storage.get("mix-v1"), before);
    },
  );
  await check("plain Pepsi order does not repeat a raw stock name", () => {
    assert.equal(
      run("compactProduct('Напиток PEPSI-COLA ПЭТ 2.0*6')"),
      "Cola · 2 л · PET · 6 шт./уп.",
    );
  });
  await check(
    "client and route share an existing note without losing legacy data",
    () => {
      const d = createHarness();
      d.run(
        "s.clients=[{a:'QA note',b:'Test street'}];s.routeNotes={'QA note\\u001fTest street':'legacy'}",
      );
      assert.equal(d.run("routeGetNote({name:'QA note'})"), "legacy");
      d.run("s.routeNotes[noteKey({name:'QA note'})]='updated'");
      assert.equal(
        d.run("routeGetNote({name:'QA note',address:'Test street'})"),
        "updated",
      );
      assert.equal(d.state().routeNotes["QA note\u001fTest street"], "updated");
    },
  );
  await check("ambiguous store names do not share notes", () => {
    const d = createHarness();
    d.run(
      "s.clients=[{a:'QA note',b:'A'},{a:'QA note',b:'B'}];s.routeNotes={'QA note\\u001fA':'only A'}",
    );
    assert.equal(d.run("routeGetNote({name:'QA note',address:'B'})"), "");
    assert.equal(d.run("routeGetNote({name:'QA note'})"), "");
  });
  await check(
    "CSV quotes and newlines are parsed without splitting client identity",
    () => {
      assert.equal(
        run(
          `parseClientsCSV('Название;Адрес;ИП\\n"QA; shop";"Street\\n1";QA')[0].a`,
        ),
        "QA; shop",
      );
      assert.throws(() => run(`parseClientsCSV('"broken;street')`), /кавычка/);
      assert.throws(() => run(`parseClientsCSV('garbage')`), /CSV/);
    },
  );
  console.log(`${count} stability checks passed`);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
