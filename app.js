const initial = {
  kpi: ["BEER", "Flash", "CSD", "Lipton"].map((name) => ({
    name,
    fact: 0,
    plan: 0,
  })),
  tasks: [],
  sales: [],
  clients: [],
  stock: [],
  pay: { base: 0, bonus: 0, ho: 0, km: 0, norm: 0, price: 0, amort: 0 },
};
let s,
  storageProblem = "";
try {
  let raw = localStorage.getItem("mix-v1");
  s = raw ? validateMix(JSON.parse(raw)) : structuredClone(initial);
} catch (e) {
  s = structuredClone(initial);
  storageProblem =
    "Не удалось прочитать сохранённые данные. Исходная запись сохранена. Восстановите корректную резервную копию в разделе Ещё.";
}
let tab = 0;
const tabs = [
  "Главная",
  "Задачи",
  "Продажи",
  "Клиенты",
  "Склад",
  "Зарплата",
  "Документы",
  "Детализация",
  "ChatGPT",
  "Ещё",
];
const $ = (id) => document.getElementById(id),
  esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    ),
  fmt = (x) => Number(x).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
function save() {
  if (storageProblem) {
    alert(storageProblem);
    return false;
  }
  try {
    localStorage.setItem("mix-v1", JSON.stringify(s));
    return true;
  } catch {
    alert(
      "Не удалось сохранить данные: хранилище заполнено или недоступно. Экспортируйте резервную копию.",
    );
    return false;
  }
}
function go(i) {
  tab = i;
  render();
  window.scrollTo(0, 0);
}
function pay() {
  let p = s.pay;
  return (
    +p.base + +p.bonus + +p.ho + ((+p.km * +p.norm) / 100) * +p.price + +p.amort
  );
}
const paths = [
  '<path d="M3 10 12 3l9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="m8 12 2 2 5-5"/>',
  '<path d="M4 20V4m0 16h16M8 15l4-5 4 2 4-7"/>',
  '<circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3m2-15a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5"/>',
  '<path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
  '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 10h18m-5 5h2"/>',
  '<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8m-8 4h8"/>',
  '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h5"/>',
  '<path d="M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4Z"/><path d="M8 11h8m-4-4v8"/>',
  '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
];
function ico(i) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths[i] + "</svg>";
}
function shortcut(i, label) {
  return (
    '<button class="shortcut" onclick="go(' +
    i +
    ')">' +
    ico(i) +
    esc(label || tabs[i]) +
    "</button>"
  );
}
function render() {
  $("nav").innerHTML = [0, 7, 3, 4, 9]
    .map(
      (i) =>
        '<button class="' +
        (tab === i || (i === 9 && ![0, 7, 3, 4].includes(tab))
          ? "active"
          : "") +
        '" onclick="go(' +
        i +
        ')" aria-label="' +
        tabs[i] +
        '">' +
        ico(i) +
        "<span>" +
        ({ 7: "KPI", 3: "Клиенты", 9: "Ещё" }[i] || tabs[i]) +
        "</span></button>",
    )
    .join("");
  let h = "";
  if (tab === 0) {
    h =
      '<div class="pagehead">Рабочий день</div><div class="meta"><small>' +
      esc(
        new Date().toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      ) +
      "</small><small>Локальные данные</small></div>" +
      homeActions() +
      '<div class="grid kpis">' +
      s.kpi
        .map((k) => {
          let p = k.plan ? (k.fact / k.plan) * 100 : 0,
            goal = /flash/i.test(k.name) ? 100 : 120;
          return (
            '<section class="kpi" style="--tone:' +
            (k.plan
              ? p >= 100
                ? "#66d5ac"
                : p >= 90
                  ? "#f4c36b"
                  : "#ff929b"
              : "#a8c7ff") +
            '"><small>' +
            esc(k.name) +
            "</small><h2>" +
            (k.plan ? fmt(p) + "%" : "—") +
            '</h2><progress max="' +
            goal +
            '" value="' +
            Math.min(goal, p) +
            '"></progress><small>До ' +
            goal +
            "%: " +
            (k.plan
              ? fmt(Math.max(0, (k.plan * goal) / 100 - k.fact)) + " л"
              : "—") +
            "</small></section>"
          );
        })
        .join("") +
      "</div>" +
      monoSummary() +
      '<section><h3>Импорт из WhatsApp</h3><button onclick="importShortcut()">Вставить отчёт из буфера</button><details><summary>Если вставка не работает</summary><textarea id="shortcutpaste" placeholder="Вставьте код из команды"></textarea><button onclick="importShortcut(true)">Обработать</button></details><p id="shortcutstatus" role="status"></p></section>' +
      stockAlert() +
      '<section><h3>Быстрые действия</h3><div class="menu">' +
      shortcut(7, "Загрузить KPI") +
      shortcut(4, "Остатки") +
      shortcut(8, "ChatGPT") +
      shortcut(1, "Задачи · " + s.tasks.filter((t) => !t.done).length) +
      "</div></section><section><details><summary>Ручное обновление KPI</summary>" +
      s.kpi
        .map(
          (k, i) =>
            "<label>" +
            k.name +
            ': факт / план, л</label><div class="grid"><input type="number" min="0" id="f' +
            i +
            '" value="' +
            k.fact +
            '"><input type="number" min="0" id="p' +
            i +
            '" value="' +
            k.plan +
            '"></div>',
        )
        .join("") +
      '<button onclick="updateKpi()">Сохранить</button></details></section><button onclick="backup()">Экспорт данных</button>';
  } else if (tab === 2) {
    h = monoUI() + promoUI();
  } else if (tab === 9) {
    h =
      '<div class="pagehead">Все инструменты</div><section><div class="menu">' +
      [1, 2, 3, 4, 5, 6, 7, 8].map((i) => shortcut(i)).join("") +
      '</div></section><section><h3>Данные</h3><button onclick="backup()">Экспорт резервной копии</button> <button onclick="restorePrevious()">Вернуть состояние до восстановления</button><label>Восстановить JSON</label><input type="file" accept=".json" onchange="if(this.files[0])restoreMix(this.files[0])"><p><small>Данные хранятся в этом браузере. Экспорт не включает исходные документы.</small></p></section>';
  } else if (tab === 1) {
    h =
      '<section><h3>Новое поручение</h3><label>Задача</label><textarea id="task"></textarea><label>Супервайзер</label><input id="boss"><label>Срок</label><input type="date" id="due"><label>Приоритет</label><select id="priority"><option>Обычный</option><option>Высокий</option><option>Срочный</option></select><button onclick="addTask()">Добавить</button></section><section><h3>Реестр задач</h3>' +
      (s.tasks
        .map(
          (t, i) =>
            '<div class="task"><b>' +
            esc(t.name) +
            "</b><br><small>" +
            esc(t.boss) +
            " · " +
            esc(t.due || "Без срока") +
            " · " +
            esc(t.priority) +
            (t.done
              ? " · Выполнено"
              : t.due && t.due < new Date().toLocaleDateString("sv-SE")
                ? " · ПРОСРОЧЕНО"
                : "") +
            '</small><br><button onclick="toggle(' +
            i +
            ')">' +
            (t.done ? "Возобновить" : "Выполнено") +
            "</button> <button onclick=\"del('tasks'," +
            i +
            ')">Удалить</button></div>',
        )
        .join("") || "Пока нет задач") +
      "</section>";
  } else if (tab === 5) {
    h =
      '<section><h3>Расчёт начислений</h3><label>Импорт авторасчёта ЦОТ (Excel)</label><input type="file" accept=".xlsx" onchange="if(this.files[0])readPayroll(this.files[0])"><div id="payimport"></div>' +
      Object.entries({
        base: "Оклад, ₸",
        bonus: "Премии, ₸",
        ho: "Премия ХО, ₸",
        km: "Пробег, км",
        norm: "Норма топлива, л/100 км",
        price: "Цена топлива, ₸/л",
        amort: "Амортизация, ₸",
      })
        .map(
          ([k, v]) =>
            "<label>" +
            v +
            '</label><input type="number" min="0" id="pay_' +
            k +
            '" value="' +
            s.pay[k] +
            '">',
        )
        .join("") +
      '<button onclick="updatePay()">Пересчитать</button><h2 class="money">' +
      fmt(pay()) +
      " ₸</h2><small>Налоги не учтены.</small></section>";
  } else if (tab === 8) {
    h = chatUI();
  } else if (tab === 7) {
    h = detailUI();
  } else if (tab === 4) {
    h = stockUI();
  } else if (tab === 6) {
    h =
      '<section><h3>Загрузка документов</h3><label>Тип документа</label><select id="doctype"><option>Детализация KPI</option><option>Складские остатки</option><option>Клиентская база</option><option>Дневные продажи</option><option>Накладные</option></select><input type="file" id="docfile" multiple accept=".xlsx,.xls,.csv,.pdf,.txt,.html,.htm,image/*"><textarea id="pastezone" placeholder="Нажми сюда и выбери Вставить или Ctrl+V" onpaste="pasteDocs(event)" ondragover="event.preventDefault()" ondrop="dropDocs(event)"></textarea><button onclick="readClipboard()">Вставить из буфера</button> <button onclick="uploadDocs()">Сохранить файлы</button><p id="docstatus"></p><small>Файлы сохраняются на устройстве. Анализ складского PDF доступен в разделе Склад. Анализ KPI доступен в разделе Детализация.</small></section><section id="doclist">Загрузка списка…</section>';
    setTimeout(listDocs, 0);
  } else if (tab === 3) {
    h =
      routeUI() +
      "<section><h3>Клиентская база · " +
      s.clients.length +
      ' ТТ</h3><label>Импорт списка (название; адрес; ИП)</label><input type="file" id="clientfile" accept=".csv,.txt"><button onclick="importClients()">Импортировать</button><input id="clientsearch" placeholder="Поиск точки" oninput="filterClients(this.value)"><label>Название</label><input id="a"><label>Адрес / ИП</label><input id="b"><button onclick="addRow(\'clients\')">Добавить</button></section><section id="clientlist">' +
      clientRows("") +
      "</section>";
  } else {
    let [key, title, a, b] = {
      2: ["sales", "Продажа", "Торговая точка", "Объём, л"],
      3: ["clients", "Клиент", "Название", "Адрес / заметка"],
      4: ["stock", "Остаток", "Товар", "Количество / единица"],
    }[tab];
    h =
      "<section><h3>" +
      title +
      "</h3><label>" +
      a +
      '</label><input id="a"><label>' +
      b +
      '</label><input id="b"><button onclick="addRow(\'' +
      key +
      "')\">Добавить</button></section><section>" +
      (s[key]
        .map(
          (r, i) =>
            '<div class="task"><b>' +
            esc(r.a) +
            "</b><br>" +
            esc(r.b) +
            "<br><small>" +
            esc(r.date) +
            "</small><br><button onclick=\"del('" +
            key +
            "'," +
            i +
            ')">Удалить</button></div>',
        )
        .join("") || "Нет записей") +
      "</section>";
  }
  $("view").innerHTML =
    (storageProblem
      ? '<section role="alert">' + esc(storageProblem) + "</section>"
      : "") + h;
  bindLabels();
}

let payrollRows = [];
async function readPayroll(file) {
  let el = $("payimport");
  el.textContent = "Читаю Excel…";
  try {
    let x = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm"),
      w = x.read(await file.arrayBuffer(), { type: "array" }),
      sheet = w.SheetNames.find((n) => n.includes("Авторасчет ЦОТ"));
    if (!sheet) throw Error("Не найден лист авторасчёта ЦОТ");
    let a = x.utils.sheet_to_json(w.Sheets[sheet], { header: 1, defval: null }),
      h = a[0],
      idx = (t) => h.findIndex((v) => String(v).trim() === t);
    if (idx("Маршрут") < 0 || idx("Окладная часть") < 0)
      throw Error("Не найдены обязательные столбцы");
    payrollRows = a
      .slice(1)
      .filter((r) => r[idx("Маршрут")] && r[idx("Окладная часть")])
      .map((r) => ({
        name: r[idx("Маршрут")],
        base: r[idx("Окладная часть")],
        bonus: r[idx("Тотал стоимость услуг")],
        travel: r[45],
        km: r[idx("пройдено км")],
        metrics: ["BEER", "LIPTON", "CSD", " Flash-Up"].map((n) => ({
          name: n.trim(),
          plan: r[idx("Вторичные продажи " + n + ", план")],
          fact: r[idx("Вторичные продажи " + n + ", факт")],
          amount: r[idx("Вторичные продажи " + n + ", сумма")],
        })),
      }));
    el.innerHTML =
      '<label>Выберите свой маршрут</label><select id="payroute" onchange="previewPayroll()"><option value="">Выберите</option>' +
      payrollRows
        .map((r, i) => '<option value="' + i + '">' + esc(r.name) + "</option>")
        .join("") +
      '</select><div id="paypreview"></div>';
  } catch (e) {
    el.textContent = "Ошибка: " + e.message;
  }
}
function previewPayroll() {
  let v = $("payroute").value,
    el = $("paypreview");
  if (v === "") {
    el.textContent = "";
    return;
  }
  let r = payrollRows[+v];
  el.innerHTML =
    "<p>Оклад: " +
    fmt(r.base) +
    " ₸ · Начисления KPI: " +
    fmt(r.bonus) +
    " ₸ · ГСМ и амортизация: " +
    fmt(r.travel) +
    " ₸</p>" +
    r.metrics
      .map(
        (m) =>
          "<div>" +
          esc(m.name) +
          ": " +
          fmt(m.fact) +
          " / " +
          fmt(m.plan) +
          " · " +
          fmt(m.amount) +
          " ₸</div>",
      )
      .join("") +
    "<p><small>Исторический расчёт. Не заменяет текущие KPI и прогноз.</small></p>";
}

let detailTab = "plan",
  detailQuery = "",
  detailGroup = "Все",
  detailOnly = true;
function detailUI() {
  let d = s.detail,
    p = s.detailPrefs || { goal: 100, days: 2 };
  return (
    '<div class="pagehead">Детализация KPI</div><section><small>Последний отчёт</small><h3>' +
    esc(d?.name || "Не загружен") +
    "</h3><details " +
    (d ? "" : "open") +
    '><summary>Обновить отчёт</summary><input type="file" accept=".xlsx,.xls" onchange="if(this.files[0])loadDetail(this.files[0])"><button onclick="importShortcut()">Из WhatsApp / буфера</button></details><p id="detailstatus" role="status"></p></section>' +
    (d
      ? '<div class="stockchips">' +
        [
          ["plan", "Планы"],
          ["shops", "Точки Flash"],
          ["fit", "FIT"],
          ["visits", "Визиты"],
        ]
          .map(
            ([k, n]) =>
              '<button class="' +
              (detailTab === k ? "selected" : "") +
              '" onclick="detailTab=\'' +
              k +
              "';render()\">" +
              n +
              "</button>",
          )
          .join("") +
        "</div>" +
        (detailTab === "plan"
          ? '<section><div class="grid"><div><label>Цель, %</label><select id="dgoal" onchange="detailResults()">' +
            [90, 100, 110, 120]
              .map(
                (v) =>
                  "<option " +
                  (v === p.goal ? "selected" : "") +
                  ">" +
                  v +
                  "</option>",
              )
              .join("") +
            '</select></div><div><label>Рабочих дней осталось</label><input id="ddays" type="number" min="1" value="' +
            p.days +
            '" onchange="detailResults()"></div></div></section><div id="dresults">' +
            detailMetrics(p.goal, p.days) +
            "</div>"
          : detailTab === "shops"
            ? '<section><h3>Незакрытые позиции Flash</h3><small>По положительным значениям в отчёте за месяц, не по фактическим остаткам магазина.</small><input type="search" placeholder="Название магазина" value="' +
              esc(detailQuery) +
              '" oninput="detailQuery=this.value;detailShops(this.value)"><div class="stockchips">' +
              ["Все", ...new Set(d.shops.flatMap((t) => t.missing))]
                .map(
                  (n) =>
                    '<button class="' +
                    (detailGroup === n ? "selected" : "") +
                    '" data-group="' +
                    esc(n) +
                    '" onclick="detailGroup=this.dataset.group;render()">' +
                    esc(n) +
                    "</button>",
                )
                .join("") +
              '</div><label><input type="checkbox" style="width:auto" ' +
              (detailOnly ? "checked" : "") +
              ' onchange="detailOnly=this.checked;detailShops(detailQuery)"> Только незакрытые точки</label></section><div id="dshops">' +
              shopRows(detailQuery) +
              "</div>"
            : detailTab === "fit"
              ? '<section><h3>FIT по точкам</h3><input type="search" placeholder="Поиск точки" oninput="fitRows(this.value)"><div id="fitlist">' +
                fitHTML("") +
                "</div></section>"
              : '<div class="grid"><section><small>Пробег</small><h2>' +
                fmt(d.km) +
                " км</h2></section><section><small>Визиты</small><h2>" +
                fmt(d.visits.fact) +
                " / " +
                fmt(d.visits.plan) +
                "</h2>" +
                (d.visits.monthPlan !== undefined
                  ? "<small>План по дням за весь месяц: " +
                    fmt(d.visits.monthPlan) +
                    "</small>"
                  : "") +
                "</section></div>")
      : "")
  );
}
function detailMetrics(goal, days) {
  let d = s.detail,
    p = s.detailPrevious;
  return d.kpi
    .map((k) => {
      let old =
          d.period && p?.period === d.period
            ? p.kpi.find((x) => x.name === k.name)
            : null,
        left = Math.max(0, (k.plan * goal) / 100 - k.fact),
        pct = k.plan ? (k.fact / k.plan) * 100 : 0,
        tone =
          pct >= goal ? "#66d5ac" : pct >= goal * 0.9 ? "#f4c36b" : "#ff929b";
      return (
        '<section class="kpi" style="--tone:' +
        tone +
        '"><div class="stocktop"><b>' +
        esc(k.name) +
        "</b><small>" +
        (left === 0 ? "Цель закрыта" : "В работе") +
        "</small></div><h2>" +
        fmt(pct) +
        '%</h2><progress max="' +
        goal +
        '" value="' +
        Math.min(goal, pct) +
        '"></progress><div class="stocktop"><small>Факт: ' +
        fmt(k.fact) +
        " л</small><small>План 100%: " +
        fmt(k.plan) +
        ' л</small></div><div class="grid detailnumbers"><div><small>До ' +
        goal +
        "%</small><strong>" +
        fmt(left) +
        " л</strong></div><div><small>В день</small><strong>" +
        fmt(left / days) +
        " л</strong></div></div>" +
        (k.name.toLowerCase().includes("flash")
          ? '<div class="detailpack">' +
            Math.ceil(left / days / 10.32) +
            " уп. Flash 0,43 × 24 в день</div>"
          : "") +
        (old
          ? "<small>К предыдущему отчёту: " +
            (k.fact >= old.fact ? "+" : "") +
            fmt(k.fact - old.fact) +
            " л</small>"
          : "") +
        "</section>"
      );
    })
    .join("");
}
function detailResults() {
  let goal = +$("dgoal").value,
    days = Math.max(1, +$("ddays").value || 1);
  s.detailPrefs = { goal, days };
  save();
  $("dresults").innerHTML = detailMetrics(goal, days);
}
function shopRows(q) {
  let rows = s.detail.shops.filter(
    (t) =>
      t.name.toLowerCase().includes(q.toLowerCase()) &&
      (!detailOnly || t.missing.length) &&
      (detailGroup === "Все" || t.missing.includes(detailGroup)),
  );
  return (
    "<p><small>Точек: " +
    rows.length +
    "</small></p>" +
    rows
      .map(
        (t) =>
          '<section class="stockitem"><b>' +
          esc(t.name) +
          '</b><div class="stockchips">' +
          (t.missing
            .map((n) => '<span class="missingchip">' + esc(n) + "</span>")
            .join("") || "<small>Все группы закрыты</small>") +
          "</div></section>",
      )
      .join("")
  );
}
function detailShops(q) {
  $("dshops").innerHTML = shopRows(q);
}
function fitHTML(q) {
  return (
    s.detail.fit
      .filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
      .map((fm) => {
        let t =
            s.detail.shops.find((t) => t.id === fm.id) ||
            routeMatch(s.detail.shops, fm.name),
          r = { name: fm.name };
        return (
          '<div class="task"><b>' +
          esc(fm.name) +
          "</b><br>Beer: " +
          routeFitValue(fm.beer) +
          " · NonAlco: " +
          routeFitValue(fm.non) +
          fitAdvice(r, t, fm, null) +
          "</div>"
        );
      })
      .join("") || "Нет точек"
  );
}
function fitRows(q) {
  $("fitlist").innerHTML = fitHTML(q);
  bindLabels();
}
function detailPaste(e) {
  let f = Array.from(e.clipboardData.files || [])[0];
  if (f) {
    e.preventDefault();
    loadDetail(f);
  } else {
    e.preventDefault();
    $("detailstatus").textContent =
      "Буфер не передал Excel целиком. Выберите файл.";
  }
}
async function detailClipboard() {
  try {
    let items = await navigator.clipboard.read();
    for (let i of items) {
      let t = i.types.find((t) => /spreadsheet|excel/.test(t));
      if (t) {
        await loadDetail(
          new File([await i.getType(t)], "Детализация из буфера.xlsx", {
            type: t,
          }),
        );
        return;
      }
    }
    throw Error();
  } catch {
    $("detailstatus").textContent =
      "Браузер не передал Excel. Используйте выбор файла.";
  }
}
async function loadDetail(file) {
  let el = $("detailstatus");
  el.textContent = "Читаю Excel…";
  try {
    let x = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm"),
      w = x.read(await file.arrayBuffer(), { type: "array" }),
      read = (n) => {
        if (!w.Sheets[n]) throw Error("Нет листа " + n);
        let sheet = w.Sheets[n],
          rows = [];
        for (let [addr, cell] of Object.entries(sheet)) {
          if (!/^[A-Z]+[0-9]+$/.test(addr)) continue;
          let pos = x.utils.decode_cell(addr);
          if (!rows[pos.r]) rows[pos.r] = [];
          rows[pos.r][pos.c] = cell.v;
        }
        return Array.from(rows, (r) => r || []);
      },
      a = read("Sheet1"),
      v = read("Sheet2"),
      m = read("Sheet3"),
      b = read("Sheet4"),
      f = read("Sheet5"),
      num = (z) => typeof z === "number" && Number.isFinite(z),
      period =
        a
          .slice(0, 8)
          .flat()
          .map((z) => String(z ?? ""))
          .join(" ")
          .match(/\b(0[1-9]|1[0-2])\.(20\d{2})\b/)?.[0] ||
        file.name
          .match(/(20\d{2})(0[1-9]|1[0-2])\d{2}/)
          ?.slice(1, 3)
          .reverse()
          .join(".") ||
        null;
    let norm = (z) =>
        String(z ?? "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " "),
      kh = a.findIndex((r) => norm(r[2]).includes("kpi")),
      sh = b.findIndex((r) => norm(r[4]) === "shop id");
    if (kh < 0 || sh < 0)
      throw Error(
        "Не найдены заголовки: KPI " +
          kh +
          ", Shop Id " +
          sh +
          ". Листы: " +
          w.SheetNames.join(", "),
      );
    let kpi = ["BEER", "Flash", "CSD", "Lipton"].map((name, i) => {
      let r = a
        .slice(kh + 1)
        .find(
          (r) =>
            norm(r[2]).includes(name.toLowerCase()) && num(r[5]) && num(r[7]),
        );
      if (
        !String(r?.[2]).toLowerCase().includes(name.toLowerCase()) ||
        !num(r[5]) ||
        !num(r[7]) ||
        r[7] <= 0
      )
        throw Error("Некорректный KPI " + name);
      return { name, fact: r[5] * 10, plan: r[7] * 10 };
    });
    let visits = { plan: 0, fact: 0 };
    for (let r of v.slice(9))
      if (r[4] && r[5] && num(r[7]) && num(r[8])) {
        visits.plan += r[7];
        visits.fact += r[8];
      }
    let visitKpi = a.find((r) =>
      /кол-во выполненных визитов/i.test(String(r[2])),
    );
    if (visitKpi && num(visitKpi[5]) && num(visitKpi[7]))
      visits = { monthPlan: visits.plan, plan: visitKpi[7], fact: visitKpi[5] };
    let km = m
      .slice(6)
      .filter((r) => num(r[2]) && num(r[4]))
      .reduce((a, r) => a + r[4], 0);
    let groups = [
      { name: "Ultra", re: /ultra.*0[.,]4[35]/i },
      { name: "Classic", re: /energy.*0[.,]4[35]/i },
      { name: "0,25", re: /0[.,]25/i },
    ];
    let cols = Array.from(b[sh], (n, i) => ({ n: String(n || ""), i })).filter(
      (o) => o.i >= 35 && o.i <= 46,
    );
    groups[1].re =
      /^(?!.*(?:ultra|bubble|exotic|mojito|pomegranate|night|peach|morning|berry|tropical|mango|apple)).*energy.*0[.,]4[35]/i;
    let shops = new Map(),
      cur = null;
    for (let r of b.slice(sh + 1)) {
      if (r[4] && r[6]) {
        cur = String(r[4]);
        if (!shops.has(cur))
          shops.set(cur, {
            id: cur,
            name: String(r[6]).trim(),
            seen: groups.map(() => false),
            matrix: String(r[3] || ""),
            sku: [],
            known: [],
          });
      }
      if (!cur || !num(r[12])) continue;
      let t = shops.get(cur);
      for (let i = 13; i < 135; i++) {
        let n = String(b[sh][i] || "").trim();
        if (!n) continue;
        if (!t.known.includes(n)) t.known.push(n);
        if (num(r[i]) && r[i] > 0 && !t.sku.includes(n)) t.sku.push(n);
      }
      groups.forEach((g, i) => {
        if (cols.some((o) => g.re.test(o.n) && num(r[o.i]) && r[o.i] > 0))
          t.seen[i] = true;
      });
    }
    let report = {
      name: file.name,
      period,
      kpi,
      visits,
      km,
      shops: [...shops.values()].map((t) => ({
        id: t.id,
        name: t.name,
        matrix: t.matrix,
        sku: t.sku,
        known: t.known,
        missing: groups
          .filter((g, i) => cols.some((o) => g.re.test(o.n)) && !t.seen[i])
          .map((g) => g.name),
      })),
      fit: f
        .slice(8)
        .filter((r) => r[3] && r[4] && (num(r[17]) || num(r[23])))
        .map((r) => ({
          name: String(r[4]).trim(),
          id: String(r[3]),
          criterionHeaders: f[7].slice(7, 28).map((x) => String(x || "")),
          criteria: Array.from({ length: 21 }, (_, i) =>
            num(r[i + 7]) ? r[i + 7] : null,
          ),
          beer: num(r[17]) ? r[17] : null,
          non: num(r[23]) ? r[23] : null,
        })),
    };
    if (!report.shops.length || !report.fit.length) throw Error("Не извлечены данные ТТ: ассортимент "+report.shops.length+", FIT "+report.fit.length+". Проверьте Sheet4 и Sheet5. Старые данные сохранены.");
    if (
      s.detail &&
      s.detail.period === report.period &&
      JSON.stringify(s.detail.kpi) !== JSON.stringify(kpi)
    )
      s.detailPrevious = s.detail;
    let previous = s;
    s = { ...s, detail: report, forecastDate: "", kpi };
    if (!save()) {
      s = previous;
      throw Error("Импорт не сохранён. Предыдущие данные оставлены.");
    }
    if (tab === 7) {
      render();
      $("detailstatus").textContent = "Обработано: 5 листов · ТТ: "+report.shops.length+" · FIT: "+report.fit.length;
    }
  } catch (e) {
    el.textContent = "Ошибка: " + e.message;
  }
}

function chatUI() {
  return (
    "<section><h3>Передача в ChatGPT</h3><small>Выберите данные. Они не отправляются автоматически.</small>" +
    [
      ["kpi", "KPI и сравнение"],
      ["shops", "Незакрытый ассортимент"],
      ["stock", "Складские остатки"],
      ["tasks", "Открытые задачи"],
      ["pay", "Прогноз зарплаты"],
      ["clients", "Клиентская база"],
    ]
      .map(
        ([k, n], i) =>
          '<label style="display:block"><input style="width:auto" type="checkbox" id="chat_' +
          k +
          '" ' +
          (i === 0 || i === 2 ? "checked" : "") +
          ' onchange="prepareChat()">' +
          n +
          "</label>",
      )
      .join("") +
    '<label>Что нужно проанализировать?</label><select id="chatgoal" onchange="prepareChat()"><option>Составь план продаж на день</option><option>Проанализируй выполнение KPI</option><option>Найди точки с незакрытым ассортиментом</option><option>Проанализируй зарплату</option><option>Проверь задачи</option><option>Другой вопрос</option></select><textarea id="chatquestion" placeholder="Дополнительный вопрос" oninput="prepareChat()"></textarea><button onclick="prepareChat()">Сформировать отчёт</button><textarea id="chatreport" rows="12" placeholder="Здесь появится отчёт"></textarea><button onclick="copyChat()">Копировать отчёт</button> <button onclick="shareChat()">Поделиться</button> <button onclick="window.open(\'https://chatgpt.com/\',\'_blank\',\'noopener\')">Открыть ChatGPT</button><p id="chatstatus"></p><small>На iPhone можно попробовать меню Поделиться. Для передачи в существующий проект скопируйте отчёт и вставьте в нужный чат. Проверьте конфиденциальность данных перед отправкой.</small></section>'
  );
}
function prepareChat() {
  let data = {},
    on = (k) => $("chat_" + k).checked;
  if (on("kpi")) {
    data.kpi = s.kpi;
    data.period = s.detail?.period || null;
    data.source = s.detail?.name || "Ручной ввод";
    data.previous = s.detailPrevious?.kpi || null;
    data.previousPeriod = s.detailPrevious?.period || null;
  }
  if (on("shops")) data.shops = s.detail?.shops || [];
  if (on("stock"))
    data.stock = s.stockReport
      ? { source: s.stockReport.name, rows: s.stockReport.rows }
      : s.stock;
  if (on("tasks")) data.tasks = s.tasks.filter((t) => !t.done);
  if (on("pay")) data.pay = { ...s.pay, estimatedGross: pay() };
  if (on("clients")) data.clients = s.clients;
  $("chatreport").value =
    "MIX Assistant — рабочий отчёт\nСформирован: " +
    new Date().toLocaleString("ru-RU") +
    "\nЗапрос: " +
    $("chatgoal").value +
    "\n" +
    $("chatquestion").value +
    "\nИспользуй только переданные данные; укажи отсутствующие показатели. KPI в литрах, склад в штуках, зарплата в тенге.\n" +
    JSON.stringify(data, null, 2);
}
async function copyChat() {
  if (!$("chatreport").value) prepareChat();
  try {
    await navigator.clipboard.writeText($("chatreport").value);
    $("chatstatus").textContent = "Скопировано. Вставьте в нужный чат ChatGPT.";
  } catch {
    $("chatreport").focus();
    $("chatreport").select();
    $("chatstatus").textContent = "Выделите и скопируйте текст вручную.";
  }
}
async function shareChat() {
  if (!$("chatreport").value) prepareChat();
  try {
    if (!navigator.share) throw Error();
    await navigator.share({
      title: "MIX Assistant",
      text: $("chatreport").value,
    });
  } catch (e) {
    if (e.name !== "AbortError")
      $("chatstatus").textContent = "Используйте кнопку Копировать отчёт.";
  }
}

async function importShortcut(manual = false) {
  try {
    let t = manual
      ? $("shortcutpaste").value
      : await navigator.clipboard.readText();
    t = t.replace(/\s/g, "");
    if (!t) throw Error("Буфер пуст");
    let raw = atob(t),
      bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0)),
      pdf = raw.startsWith("%PDF-"),
      excel = raw.startsWith("PK\x03\x04");
    if (!pdf && !excel) {
      let html = new TextDecoder().decode(bytes);
      if (/<html/i.test(html)) {
        await monoLoad(html);
        return;
      }
      throw Error("Не распознан PDF, XLSX или HTML");
    }
    let name =
        "WhatsApp " +
        new Date().toLocaleString("sv-SE").replace(/[: ]/g, "-") +
        (pdf ? ".pdf" : ".xlsx"),
      file = new File([bytes], name, {
        type: pdf
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    go(pdf ? 4 : 7);
    await (pdf ? loadStock(file) : loadDetail(file));
  } catch (e) {
    let el = $("shortcutstatus");
    if (el)
      el.textContent =
        "Ошибка: " + e.message + ". Попробуйте вставить код вручную.";
    else if ($("detailstatus"))
      $("detailstatus").textContent = "Ошибка: " + e.message;
    else alert(e.message);
  }
}
function stockAlert() {
  if (!s.stockReport)
    return '<section><h3>Склад</h3><button onclick="go(4)">Загрузить остатки</button></section>';
  let f = stockPrefs(),
    rows = stockBase()
      .filter((r) => r.qty === 0 || r.qty / r.pack < f.limit)
      .sort((a, b) => a.qty / a.pack - b.qty / b.pack);
  return (
    '<section class="stockalert"><h3>Дефицит на складе</h3><small>' +
    esc(s.stockReport.name) +
    "</small>" +
    [
      ["FLASH", "Flash"],
      ["CSD", "Pepsi / 7UP / Mirinda"],
      ["LIPTON", "Lipton"],
      ["BEER", "Пиво"],
    ]
      .map(([k, n]) => {
        let rr = rows.filter((r) => r.cat === k);
        return (
          '<div class="stockgroup"><div class="stocktop"><b>' +
          n +
          "</b><small>" +
          rr.length +
          " поз.</small></div>" +
          (rr.length
            ? rr
                .slice(0, 3)
                .map(
                  (r) =>
                    '<div class="alertrow"><span style="color:' +
                    (r.qty === 0
                      ? "#ff929b"
                      : r.qty / r.pack < 5
                        ? "#ffab70"
                        : "#f4c36b") +
                    '">●</span><span>' +
                    esc(r.name) +
                    "</span><strong>" +
                    (r.qty === 0
                      ? "Нет"
                      : Math.floor(r.qty / r.pack) +
                        " уп. · " +
                        fmt(r.qty) +
                        " шт.") +
                    "</strong></div>",
                )
                .join("") +
              "<button onclick=\"openShortage('" +
              k +
              "')\">Все позиции · " +
              rr.length +
              "</button>"
            : '<small style="color:#66d5ac">Дефицита нет</small>') +
          "</div>"
        );
      })
      .join("") +
    "</section>"
  );
}
function openShortage(cat = "Все") {
  stockQuery = "";
  s.stockFilters = { ...stockPrefs(), cat: cat, mode: "shortage", sort: "asc" };
  save();
  go(4);
}
function stockPrefs() {
  return {
    limit: 20,
    cat: "Все",
    keg: false,
    bib: false,
    dup: true,
    dis: true,
    mode: "all",
    sort: "brand",
    ...s.stockFilters,
    ...(s.stockFilters?.revision===2?{}:{limit:20,mode:"all",sort:"brand",keg:true,bib:true}),
    revision:2,
  };
}
let stockQuery = "";
function stockUI() {
  let f = stockPrefs(),
    report = s.stockReport;
  return (
    '<div class="pagehead">Склад</div><section><small>Последний отчёт</small><h3>' +
    esc(report?.name || "Нет отчёта") +
    "</h3>" +
    (report
      ? "<small>Загружено: " +
        esc(new Date(report.date).toLocaleString("ru-RU")) +
        " · " +
        report.rows.length +
        " позиций</small>"
      : "") +
    "<details " +
    (report ? "" : "open") +
    '><summary>Загрузить новые остатки</summary><input type="file" id="stockfile" accept=".pdf,.txt" onchange="if(this.files[0])loadStock(this.files[0])"><textarea placeholder="Вставить PDF или текст" onpaste="stockPaste(event)"></textarea><button onclick="stockClipboard()">Из буфера</button></details><p id="stockstatus" role="status"></p></section><div id="stocksummary">' +
    stockSummary() + stockChanges() +
    '</div><section><input type="search" placeholder="Поиск: Pepsi, Ultra, 0.43…" id="stocksearch" value="' +
    esc(stockQuery) +
    '" oninput="stockQuery=this.value;refreshStock()"><div class="stockchips">' +
    ["Все", "FLASH", "CSD", "BEER", "LIPTON", "KEG", "BIB"]
      .map(
        (x) =>
          '<button data-cat="' +
          x +
          '" class="' +
          (x === f.cat ? "selected" : "") +
          "\" onclick=\"stockSet('cat','" +
          x +
          "')\">" +
          x +
          "</button>",
      )
      .join("") +
    '</div><div class="stockchips">' +
    [
      ["shortage", "Дефицит"],
      ["all", "Все товары"],
      ["available", "В наличии"],
      ["low", "Мало"],
      ["zero", "Нет"],
    ]
      .map(
        ([k, n]) =>
          '<button data-mode="' +
          k +
          '" class="' +
          (k === f.mode ? "selected" : "") +
          "\" onclick=\"stockSet('mode','" +
          k +
          "')\">" +
          n +
          "</button>",
      )
      .join("") +
    '</div><label>Сортировка</label><select id="stocksort" onchange="stockSet(\'sort\',this.value)">' +
    [
      ["brand", "По категориям и брендам"],
      ["name", "По названию"],
      ["asc", "Сначала мало"],
      ["desc", "Сначала много"],
    ]
      .map(
        ([k, n]) =>
          '<option value="' +
          k +
          '" ' +
          (f.sort === k ? "selected" : "") +
          ">" +
          n +
          "</option>",
      )
      .join("") +
    '</select><details><summary>Дополнительные фильтры</summary><label>Малый остаток — менее упаковок</label><input type="number" min="1" value="' +
    f.limit +
    '" onchange="stockSet(\'limit\',Math.max(1,+this.value))">' +
    [
      ["keg", "Показывать кеги"],
      ["bib", "Показывать БИБ"],
      ["dup", "Объединять близкие объёмы Flash (0,43/0,45)"],
      ["dis", "Скрывать снятые Flash"],
    ]
      .map(
        ([k, t]) =>
          '<label style="display:block"><input style="width:auto" type="checkbox" ' +
          (f[k] ? "checked" : "") +
          " onchange=\"stockSet('" +
          k +
          "',this.checked)\"> " +
          t +
          "</label>",
      )
      .join("") +
    '</details><button onclick="copyStock()">Копировать выбранный список</button></section><div id="stockresults">' +
    stockResults() +
    "</div>"
  );
}
function stockSet(k, v) {
  s.stockFilters = { ...stockPrefs(), [k]: v };
  save();
  refreshStock();
}
function refreshStock() {
  let f = stockPrefs();
  document
    .querySelectorAll("[data-cat]")
    .forEach((b) => b.classList.toggle("selected", b.dataset.cat === f.cat));
  document
    .querySelectorAll("[data-mode]")
    .forEach((b) => b.classList.toggle("selected", b.dataset.mode === f.mode));
  $("stocksummary").innerHTML = stockSummary()+stockChanges();
  $("stockresults").innerHTML = stockResults();
}
function stockAliases(rows) {
  const rules = [
    [/жатецкий гусь\s+9\s+крепкое/i, /жатецкий гусь\s*\(v3\)\s*крепкое/i],
    [/zatecky gus myagky/i, /жатецкий гусь\s*\(v3\)\s*мягкое/i],
    [/жатецкий гусь\s+7\s+экспортное/i, /жатецкий гусь\s*\(v3\)\s*экспортное/i],
  ];
  return rows.filter(
    (r) =>
      !rules.some(
        ([old, modern]) =>
          old.test(r.name) &&
          /0[.,]43\s*\*\s*24/i.test(r.name) &&
          rows.some(
            (n) => modern.test(n.name) && /0[.,]43\s*\*\s*24/i.test(n.name),
          ),
      ),
  );
}
function stockBase() {
  let f = stockPrefs(),
    rows = (s.stockReport?.rows || []).filter(
      (r) =>
        (f.keg || !r.keg) &&
        (f.bib || !r.bib) &&
        (!f.dis || !/flash.*(night movie|peach pineapple)/i.test(r.name)),
    );
  rows = stockAliases(rows).map(r=>({...r,cat:r.bib?"BIB":r.keg?"KEG":r.cat}));
  if (f.dup) {
    let map = new Map();
    for (let r of rows) {
      let key =
        r.cat === "FLASH"
          ? r.name
              .toLowerCase()
              .replace(/0[.,]4[35]\s*[*×xх]\s*\d+/g, "0.4")
              .replace(/[\s,]+/g, " ")
              .trim()
          : r.name;
      if (!map.has(key) || map.get(key).qty < r.qty) map.set(key, r);
    }
    rows = [...map.values()];
  }
  return rows;
}
function stockChanges(){
 const history=s.stockHistory||[], current=s.stockReport;
 if(!current)return "";
 const reports=history.length?history:(s.stockPrevious?[s.stockPrevious]:[]);
 if(!reports.length)return "";
 const idx=Math.min(stockCompareIndex??reports.length-1,reports.length-1), old=reports[idx];
 const key=r=>r.name.toLowerCase().replace(/,/g,".").replace(/\s+/g," ").trim();
 const a=new Map(old.rows.map(r=>[key(r),r])), b=new Map(current.rows.map(r=>[key(r),r]));
 const changes=[];
 for(const [k,r] of b){const p=a.get(k);if(!p)changes.push([r,"Новая строка · "+fmt(r.qty)+" шт."]);else if(r.qty!==p.qty){const d=r.qty-p.qty;changes.push([r,(d>0?"+":"")+fmt(d)+" шт. · "+(d>0?"+":"−")+Math.floor(Math.abs(d)/r.pack)+" уп. + "+fmt(Math.abs(d)%r.pack)+" шт."]);}}
 for(const [k,r] of a)if(!b.has(k))changes.push([r,"Нет строки в новом отчёте · остаток неизвестен"]);
 return '<section><h3>История остатков</h3><label>Сравнить с отчётом</label><select onchange="stockCompareIndex=+this.value;refreshStock()">'+reports.map((r,i)=>'<option value="'+i+'" '+(i===idx?'selected':'')+'>'+esc(r.name)+' · '+esc(new Date(r.date).toLocaleString("ru-RU"))+'</option>').join("")+'</select><details><summary>Изменения: '+changes.length+'</summary>'+changes.map(([r,t])=>'<div class="task">'+esc(r.name)+'<br><small>'+esc(t)+'</small></div>').join("")+'</details><small>Рост остатка не доказывает поступление, снижение не доказывает продажу.</small></section>';
}
let stockCompareIndex=null;
function stockSummary() {
  let f = stockPrefs(),
    rows = stockBase().filter((r) => f.cat === "Все" || r.cat === f.cat);
  return (
    '<div class="grid stockstats">' +
    [
      ["all", "Позиций", rows.length],
      ["available", "В наличии", rows.filter((r) => r.qty > 0).length],
      [
        "low",
        "Мало",
        rows.filter((r) => r.qty > 0 && r.qty / r.pack < f.limit).length,
      ],
      ["zero", "Нет", rows.filter((r) => r.qty === 0).length],
    ]
      .map(
        ([k, n, v]) =>
          '<button class="stat ' +
          (f.mode === k ? "selected" : "") +
          "\" onclick=\"stockSet('mode','" +
          k +
          "')\"><small>" +
          n +
          "</small><strong>" +
          v +
          "</strong></button>",
      )
      .join("") +
    "</div>"
  );
}
function filteredStock() {
  let f = stockPrefs(),
    q = stockQuery.toLowerCase().replace(/,/g, ".").trim(),
    rows = stockBase().filter(
      (r) =>
        (f.cat === "Все" || r.cat === f.cat) &&
        r.name.toLowerCase().replace(/,/g, ".").includes(q) &&
        (f.mode === "all" ||
          (f.mode === "shortage" &&
            (r.qty === 0 || r.qty / r.pack < f.limit)) ||
          (f.mode === "available" && r.qty > 0) ||
          (f.mode === "low" && r.qty > 0 && r.qty / r.pack < f.limit) ||
          (f.mode === "zero" && r.qty === 0)),
    );
  return rows.sort((a, b) =>
    f.sort === "asc"
      ? a.qty / a.pack - b.qty / b.pack
      : f.sort === "desc"
        ? b.qty / b.pack - a.qty / a.pack
        : a.name.localeCompare(b.name, "ru"),
  );
}
function stockResults() {
  if (!s.stockReport) return "<section>Загрузите отчёт</section>";
  let f = stockPrefs(),
    rows = filteredStock(),
    prev = new Map((s.stockPrevious?.rows || []).map((r) => [r.name, r.qty]));
  let last = "";
  rows.sort(
    (a, b) =>
      ["FLASH", "CSD", "LIPTON", "BEER","KEG","BIB"].indexOf(a.cat) -
      ["FLASH", "CSD", "LIPTON", "BEER","KEG","BIB"].indexOf(b.cat),
  );
  return (
    "<p><small>Найдено: " +
    rows.length +
    "</small></p>" +
    rows
      .map((r) => {
        let low = r.qty / r.pack < f.limit,
          tone =
            r.qty === 0
              ? "#ff929b"
              : low
                ? r.qty / r.pack < 5
                  ? "#ffab70"
                  : "#f4c36b"
                : "#66d5ac",
          delta = prev.has(r.name) ? r.qty - prev.get(r.name) : null;
        let heading =
          last !== r.cat
            ? '<h3 class="stockheading">' +
              ({
                FLASH: "Flash",
                CSD: "Pepsi / 7UP / Mirinda",
                LIPTON: "Lipton",
                BEER: "Пиво", KEG:"Кеги", BIB:"Сиропы BIB",
              }[r.cat] || r.cat) +
              "</h3>"
            : "";
        last = r.cat;
        return (
          heading +
          '<section class="stockitem"><div class="stocktop"><small>' +
          esc(r.cat) +
          '</small><small style="color:' +
          tone +
          '">' +
          (r.qty === 0
            ? "Нет в наличии"
            : low
              ? r.qty / r.pack < 5
                ? "Критический остаток"
                : "Малый остаток"
              : "В наличии") +
          "</small></div><b>" +
          esc(r.name) +
          '</b><div class="stocktop stocknumbers"><div><strong>' +
          fmt(r.keg ? r.qty : Math.floor(r.qty/r.pack)) +
          "</strong><small> " +
          (r.keg ? "кег" : "уп.") +
          "</small></div><div><strong>" +
          fmt(r.keg ? r.qty : r.qty%r.pack) +
          "</strong><small> " +
          (r.keg ? "кег" : "шт. россыпью") +
          "</small></div></div><small>" +
          (r.keg
            ? ""
            : r.pack +
              " шт. в упаковке · остаток россыпью " +
              fmt(r.qty % r.pack) +
              " шт.") +
          (delta === null
            ? ""
            : " · Δ " + (delta > 0 ? "+" : "") + fmt(delta) + " шт.") +
          "</small></section>"
        );
      })
      .join("") +
    (rows.length
      ? ""
      : "<section>Нет товаров по выбранным фильтрам</section>") +
    "<small>Пустое количество в строке товара считается нулём. Отсутствующие строки не считаются нулевыми. Старые названия Гуся скрываются при наличии соответствующей версии v3.</small>"
  );
}
function parseStock(lines) {
  let rows = [];
  for (let line of lines) {
    let m = line
      .trim()
      .match(
        /^(.*?),\s*(бан|бут\.?|кега|шт\.?)(?:\s+([\d \u00a0\u202f]+),(\d{3}))?$/i,
      );
    if (!m) continue;
    let name = m[1].trim(),
      qty = m[3] ? Number(m[3].replace(/\s/g, "")) + Number(m[4]) / 1000 : 0,
      pack = Number(name.match(/\*\s*(\d+)/)?.[1] || 1),
      cat = /flash/i.test(name)
        ? "FLASH"
        : /липтон|lipton/i.test(name)
          ? "LIPTON"
          : /пиво|garage|somersby/i.test(name)
            ? "BEER"
            : "CSD";
    rows.push({
      name,
      qty,
      pack,
      cat,
      keg: /кега/i.test(m[2]),
      bib: /биб/i.test(name),
    });
  }
  return rows;
}
async function loadStock(file) {
  let status = $("stockstatus");
  if (status) status.textContent = "Читаю отчёт…";
  try {
    let lines = [];
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
      let pdfjs = await import(
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs"
      );
      pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
      let pdf = await pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
      }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        let page = await pdf.getPage(i),
          tc = await page.getTextContent(),
          groups = [];
        for (let item of tc.items) {
          if (!item.str?.trim()) continue;
          let y = item.transform[5],
            g = groups.find((g) => Math.abs(g.y - y) < 2);
          if (!g) {
            g = { y, items: [] };
            groups.push(g);
          }
          g.items.push(item);
        }
        for (let g of groups.sort((a, b) => b.y - a.y))
          lines.push(
            g.items
              .sort((a, b) => a.transform[4] - b.transform[4])
              .map((x) => x.str)
              .join(" "),
          );
      }
    } else lines = (await file.text()).split(/\r?\n/);
    let rows = parseStock(lines);
    if (!rows.length)
      throw Error("Не найдены строки остатков. Проверьте формат PDF.");
    if (s.stockReport && JSON.stringify(s.stockReport.rows)!==JSON.stringify(rows)) {
      s.stockPrevious = s.stockReport;
      s.stockHistory=[...(s.stockHistory||[]),s.stockReport].slice(-60);
    }
    let previous = s;
    s = {
      ...s,
      stockReport: { name: file.name, rows, date: new Date().toISOString() },
    };
    if (!save()) {
      s = previous;
      throw Error("Импорт не сохранён");
    }
    if (tab === 4) {
      render();
      $("stockstatus").textContent = "Распознано позиций: " + rows.length;
    }
  } catch (e) {
    if (status) status.textContent = "Ошибка: " + e.message;
    else alert(e.message);
  }
}
function stockPaste(e) {
  let f = Array.from(e.clipboardData.files || [])[0],
    t = e.clipboardData.getData("text/plain");
  if (f || t) {
    e.preventDefault();
    loadStock(
      f || new File([t], "Вставленные остатки.txt", { type: "text/plain" }),
    );
  }
}
async function stockClipboard() {
  try {
    let items = await navigator.clipboard.read();
    for (let item of items) {
      let type = item.types.includes("application/pdf")
        ? "application/pdf"
        : item.types.includes("text/plain")
          ? "text/plain"
          : null;
      if (type) {
        let blob = await item.getType(type);
        await loadStock(
          new File(
            [blob],
            type === "application/pdf"
              ? "Остатки из буфера.pdf"
              : "Остатки из буфера.txt",
            { type },
          ),
        );
        return;
      }
    }
    throw Error();
  } catch {
    alert(
      "Вставьте в текстовое поле или выберите PDF. Safari может не передавать PDF через буфер.",
    );
  }
}
async function copyStock() {
  let rows = filteredStock(),
    t = [
      "Остатки " + (s.stockReport?.name || ""),
      ...rows.map(
        (r) =>
          r.cat +
          " | " +
          r.name +
          " — " +
          r.qty +
          " шт. / " +
          Math.floor(r.qty / r.pack) +
          " уп.",
      ),
    ].join("\n");
  try {
    await navigator.clipboard.writeText(t);
    alert("Список скопирован");
  } catch {
    alert("Не удалось скопировать");
  }
}
function pasteDocs(e) {
  let files = Array.from(e.clipboardData.files || []);
  if (!files.length)
    files = Array.from(e.clipboardData.items || [])
      .filter((i) => i.kind === "file")
      .map((i) => i.getAsFile())
      .filter(Boolean);
  if (files.length) {
    e.preventDefault();
    uploadDocs(files);
  } else {
    let t = e.clipboardData.getData("text/plain");
    if (t) {
      e.preventDefault();
      uploadDocs([
        new File([t], "Вставленный текст.txt", { type: "text/plain" }),
      ]);
    }
  }
}
function dropDocs(e) {
  e.preventDefault();
  let files = Array.from(e.dataTransfer.files);
  if (files.length) uploadDocs(files);
}
async function readClipboard() {
  try {
    let items = await navigator.clipboard.read(),
      files = [];
    for (let item of items) {
      let type =
        item.types.find((t) => t !== "text/plain" && t !== "text/html") ||
        item.types.find((t) => t === "text/plain");
      if (!type) continue;
      let blob = await item.getType(type),
        ext =
          {
            "image/png": "png",
            "image/jpeg": "jpg",
            "application/pdf": "pdf",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
              "xlsx",
            "text/plain": "txt",
          }[type] || "bin";
      files.push(
        new File(
          [blob],
          "Буфер-" + Date.now() + "-" + files.length + "." + ext,
          { type },
        ),
      );
    }
    if (files.length) uploadDocs(files);
    else alert("Буфер не содержит доступных файлов");
  } catch {
    alert(
      "Браузер не разрешил чтение буфера. Нажмите на поле вставки и выберите Вставить. Если файл не передаётся, используйте выбор файла.",
    );
  }
}
function docDB() {
  return new Promise((ok, no) => {
    let r = indexedDB.open("mix-documents", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("files", {
        keyPath: "id",
        autoIncrement: true,
      });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}
async function uploadDocs(incoming) {
  let files = incoming || Array.from($("docfile").files),
    type = $("doctype").value;
  if (!files.length) return alert("Выберите файл");
  try {
    let db = await docDB(),
      tx = db.transaction("files", "readwrite");
    for (let file of files)
      tx.objectStore("files").add({
        file,
        name: file.name,
        type,
        date: new Date().toLocaleString("ru-RU"),
      });
    await new Promise((ok, no) => {
      tx.oncomplete = ok;
      tx.onerror = no;
      tx.onabort = no;
    });
    db.close();
    if ($("docstatus"))
      $("docstatus").textContent = "Сохранено: " + files.length;
    listDocs();
  } catch (e) {
    alert("Не удалось сохранить файлы");
  }
}
async function listDocs() {
  try {
    let db = await docDB(),
      r = db.transaction("files").objectStore("files").getAll();
    r.onsuccess = () => {
      if ($("doclist"))
        $("doclist").innerHTML =
          r.result
            .map(
              (d) =>
                '<div class="task"><b>' +
                esc(d.name) +
                "</b><br><small>" +
                esc(d.type) +
                " · " +
                esc(d.date) +
                '</small><br><button onclick="getDoc(' +
                d.id +
                ')">Открыть файл</button> <button onclick="deleteDoc(' +
                d.id +
                ')">Удалить</button></div>',
            )
            .join("") || "Нет документов";
      db.close();
    };
  } catch (e) {
    if ($("doclist")) $("doclist").textContent = "Хранилище недоступно";
  }
}
async function getDoc(id) {
  let db = await docDB(),
    r = db.transaction("files").objectStore("files").get(id);
  r.onsuccess = () => {
    if (r.result) {
      let a = document.createElement("a");
      a.href = URL.createObjectURL(r.result.file);
      a.download = r.result.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    }
    db.close();
  };
}
async function deleteDoc(id) {
  if (!confirm("Удалить файл?")) return;
  let db = await docDB(),
    tx = db.transaction("files", "readwrite");
  tx.objectStore("files").delete(id);
  tx.oncomplete = () => {
    db.close();
    listDocs();
  };
}
function clientRows(q) {
  return (
    s.clients
      .map((r, i) => ({ r, i }))
      .filter(({ r }) =>
        (r.a + " " + r.b).toLowerCase().includes(q.toLowerCase()),
      )
      .map(
        ({ r, i }) =>
          '<div class="task"><b>' +
          esc(r.a) +
          "</b><br>" +
          esc(r.b) +
          "<br><button onclick=\"del('clients'," +
          i +
          ')">Удалить</button></div>',
      )
      .join("") || "Нет записей"
  );
}
function filterClients(q) {
  $("clientlist").innerHTML = clientRows(q);
}
async function importClients() {
  let f = $("clientfile").files[0];
  if (!f) return alert("Выберите файл");
  let rows = (await f.text())
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((x) => x.split(";").map((y) => y.trim()))
    .filter((x) => x.length >= 2 && x[0] && x[0] !== "Название");
  let n = 0;
  for (let [a, address, ip] of rows) {
    let b = address + (ip ? " · " + ip : "");
    if (!s.clients.some((r) => r.a === a && r.b === b)) {
      s.clients.push({ a, b, date: new Date().toLocaleDateString("ru-RU") });
      n++;
    }
  }
  save();
  render();
  alert("Добавлено: " + n);
}
function updateKpi() {
  s.kpi.forEach((k, i) => {
    k.fact = Math.max(0, +$("f" + i).value);
    k.plan = Math.max(0, +$("p" + i).value);
  });
  save();
  render();
}
function addTask() {
  if (!$("task").value.trim()) return;
  s.tasks.push({
    name: $("task").value,
    boss: $("boss").value,
    due: $("due").value,
    priority: $("priority").value,
    done: false,
  });
  save();
  render();
}
function toggle(i) {
  s.tasks[i].done = !s.tasks[i].done;
  save();
  render();
}
function del(k, i) {
  if (confirm("Удалить запись?")) {
    s[k].splice(i, 1);
    save();
    render();
  }
}
function addRow(k) {
  if (!$("a").value.trim()) return;
  s[k].push({
    a: $("a").value,
    b: $("b").value,
    date: new Date().toLocaleDateString("ru-RU"),
  });
  save();
  render();
}
function updatePay() {
  Object.keys(s.pay).forEach(
    (k) => (s.pay[k] = Math.max(0, +$("pay_" + k).value)),
  );
  save();
  render();
}
function backup() {
  let a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }),
  );
  a.download = "mix-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function routeDate() {
  return s.routeDay || new Date().toLocaleDateString("sv-SE");
}
function routeKey(r) {
  return r.name + "\u001f" + (r.address || "");
}
function routeRows(day) {
  if (s.routes?.[day]) return s.routes[day];
  return (s.weekRoute?.[new Date(day + "T12:00:00").getDay()] || []).map((x) =>
    typeof x === "string" ? { name: x } : { ...x },
  );
}
function routeScope() {
  return $("routeScope")?.value === "week";
}
function routeSearch(q) {
  let v = q.toLowerCase().trim();
  return (
    s.clients
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => (r.a + " " + r.b).toLowerCase().includes(v))
      .slice(0, 40)
      .map(
        ({ r, i }) =>
          '<div class="task"><b>' +
          esc(r.a) +
          "</b><br><small>" +
          esc(r.b) +
          '</small><br><button onclick="routeAdd(' +
          i +
          ')">Добавить</button></div>',
      )
      .join("") ||
    "<small>Нет совпадений. Добавьте клиента в базу ниже.</small>"
  );
}
function routePicker() {
  return (
    '<details><summary>Добавить или удалить точки</summary><label>Область изменения</label><select id="routeScope"><option value="day">Только выбранная дата</option><option value="week">Каждую неделю в этот день</option></select><input type="search" placeholder="Название, адрес или ИП" oninput="$(\'routeSearchResults\').innerHTML=routeSearch(this.value)"><div id="routeSearchResults">' +
    routeSearch("") +
    "</div></details>"
  );
}
function routeChange(row, remove, weekly) {
  let day = routeDate(),
    dow = new Date(day + "T12:00:00").getDay(),
    key = routeKey(row),
    change = (arr) => {
      let a = arr.map((x) => (typeof x === "string" ? { name: x } : x));
      let match = (x) => routeKey(x) === key;
      return remove
        ? a.filter((x) => !match(x))
        : a.some(match)
          ? a
          : [...a, { name: row.name, address: row.address || "" }];
    };
  s.routes ??= {};
  if (weekly) {
    s.weekRoute ??= {};
    s.weekRoute[dow] = change(s.weekRoute[dow] || []);
    if (s.routes[day]) s.routes[day] = change(s.routes[day]);
  } else {
    s.routes[day] = change(routeRows(day));
  }
  save();
  render();
}
function routeAdd(i) {
  let r = s.clients[i];
  if (r) routeChange({ name: r.a, address: r.b }, false, routeScope());
}
function routeRemove(i) {
  let row = routeRows(routeDate())[i];
  if (!row) return;
  let weekly = confirm(
    "Удалить из постоянного маршрута этого дня недели? OK — постоянно, Отмена — выбрать разовое удаление.",
  );
  if (weekly || confirm("Удалить только на выбранную дату?"))
    routeChange(row, true, weekly);
}
function weekUI() {
  return (
    "<details><summary>Постоянный недельный маршрут</summary>" +
    [0, 1, 2, 3, 4, 5, 6]
      .map(
        (d) =>
          "<p>" +
          ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][d] +
          ": " +
          (s.weekRoute?.[d]?.length || 0) +
          " ТТ</p>",
      )
      .join("") +
    "<small>Повторяется каждый месяц. Для редактирования выберите дату нужного дня недели.</small></details>"
  );
}

function routeNorm(x, keep = false) {
  let t = String(x || "")
    .toLowerCase()
    .split("(")[0]
    .replace(/ё/g, "е")
    .replace(/[\x60"'«»]/g, "")
    .trim();
  if (!keep) t = t.replace(/^(магазин|маг)\.?\s+/, "");
  return t.replace(/cарлык/g, "сарлык").replace(/\s+/g, "");
}
function routeMatch(rows, name, address = "") {
  const linked=s.fitLinks?.[routeNorm(name,true)+"|"+routeNorm(address,true)];
  if(linked){const hits=rows.filter(t=>String(t.id)===linked);if(hits.length===1)return hits[0];}
  if (address) {
    let candidates = rows.filter((t) => routeNorm(t.name) === routeNorm(name)),
      a = routeNorm(address, true);
    let found = candidates.filter((t) =>
      routeNorm(t.name.split("(").slice(1).join("("), true).includes(a),
    );
    if (found.length === 1) return found[0];
  }
  let exact = rows.filter(
    (t) => routeNorm(t.name, true) === routeNorm(name, true),
  );
  if (exact.length === 1) return exact[0];
  let loose = rows.filter((t) => routeNorm(t.name) === routeNorm(name));
  return loose.length === 1 ? loose[0] : null;
}
function routeWeekDay(d) {
  let day = routeDate(),
    dow = new Date(day + "T12:00:00").getDay();
  s.routeDay = monoDay(day, d - (dow || 7));
  save();
  render();
}
function routeFitValue(v) {
  return typeof v === "number" && Number.isFinite(v)
    ? fmt(v * 100) + "%"
    : "Нет данных";
}

let routeFilter = "all",
  routeQuery = "";
function routeShift(n) {
  s.routeDay = monoDay(routeDate(), n);
  save();
  render();
}
function routeFitTile(label, v) {
  let valid = typeof v === "number" && Number.isFinite(v),
    p = valid ? v * 100 : 0;
  return (
    '<div class="rtfit"><small>' +
    label +
    "</small><strong>" +
    routeFitValue(v) +
    '</strong><div class="rttrack"><i style="width:' +
    Math.max(0, Math.min(100, p)) +
    "%;background:" +
    (p >= 100 ? "#66d5ac" : "#79aaff") +
    '"></i></div></div>'
  );
}
let activeVisit=null;
function visitStart(i){activeVisit={day:routeDate(),i,key:routeKey(routeRows(routeDate())[i])};render();window.scrollTo(0,0);}
function visitEnd(v){const a=activeVisit;activeVisit=null;if(v&&a)routeStatus(a.i,v);else render();window.scrollTo(0,0);}
function visitCurrent(){return activeVisit&&activeVisit.day===routeDate()&&routeRows(routeDate())[activeVisit.i]&&routeKey(routeRows(routeDate())[activeVisit.i])===activeVisit.key?activeVisit:null;}
function routeCards() {
  let rows = routeRows(routeDate()),
    fit = s.detail?.fit || [],
    shops = s.detail?.shops || [];
  return (
    rows
      .map((r, i) => ({ r, i }))
      .filter(({ r,i }) => {
        if(visitCurrent())return i===activeVisit.i;
        let st = r.status || "Не посещено";
        return (
          (routeFilter === "all" ||
            (routeFilter === "todo"
              ? st === "Не посещено"
              : st !== "Не посещено")) &&
          (r.name + " " + (r.address || ""))
            .toLowerCase()
            .includes(routeQuery.toLowerCase())
        );
      })
      .map(({ r, i }) => {
        let t = routeMatch(shops, r.name, r.address),
          fm =
            (t?.id ? fit.find((x) => x.id === t.id) : null) ||
            routeMatch(fit, r.name, r.address),
          st = r.status || "Не посещено",
          note = routeGetNote(r);
        return (
          '<section class="rtcard"><div class="rttop"><span class="rtnum">' +
          (i + 1) +
          '</span><div class="rtname"><b>' +
          esc(r.name) +
          "</b>" +
          (r.address ? "<small>" + esc(r.address) + "</small>" : "") +
          '</div><span class="rtstatus ' +
          (st === "Посещено"
            ? "rtgreen"
            : st === "Не посещено"
              ? ""
              : "rtamber") +
          '">' +
          esc(st) +
          "</span></div>" +
          (note
            ? '<div class="rtmemo"><small>ВАЖНО · ЗАМЕТКА</small><div>' +
              esc(note) +
              "</div></div>"
            : "") +
          '<div class="grid rtmetrics">' +
          routeFitTile("FIT Beer", fm?.beer) +
          routeFitTile("FIT NonAlco", fm?.non) +
          '</div><div class="rtflash"><small>Flash</small><div>' +
          (t
            ? t.missing.length
              ? t.missing
                  .map((n) => '<span class="missingchip">' + esc(n) + "</span>")
                  .join(" ")
              : '<span class="rtgreen">Все группы закрыты</span>'
            : "<small>Нет однозначных данных</small>") +
          "</div></div>" +
          (visitCurrent()?fitAdvice(r,t,fm,i):'<button onclick="visitStart('+i+')">Начать визит</button>') +
          '<div class="rtactions"><button class="' +
          (st === "Посещено" ? "rtactive" : "") +
          '" onclick="routeStatus(' +
          i +
          ",'Посещено')\">✓ Посещено</button><button class=\"" +
          (st === "Закрыто" ? "rtactive" : "") +
          '" onclick="routeStatus(' +
          i +
          ",'Закрыто')\">Закрыто</button><button class=\"" +
          (st === "Без заказа" ? "rtactive" : "") +
          '" onclick="routeStatus(' +
          i +
          ',\'Без заказа\')">Без заказа</button></div><details class="rtdetails"><summary>Заметка и действия' +
          (note ? " · есть заметка" : "") +
          '</summary><textarea placeholder="Постоянная заметка: что обещал клиенту" id="rtnote' +
          i +
          '">' +
          esc(note) +
          '</textarea><button onclick="routeNote(' +
          i +
          ",$('rtnote" +
          i +
          '\').value)">Сохранить заметку</button> <button onclick="routeNote(' +
          i +
          ',\'\')">Очистить</button><div class="rtactions"><button onclick="routeStatus(' +
          i +
          ",'Не посещено')\">Сбросить статус</button><button onclick=\"routeRemove(" +
          i +
          ')">Убрать из маршрута</button></div></details></section>'
        );
      })
      .join("") ||
    "<section><small>Нет точек по выбранному фильтру.</small></section>"
  );
}
function routeRefresh() {
  let el = $("routeCards");
  if (el) {
    el.innerHTML = routeCards();
    bindLabels();
  }
}
function routeUI() {
  if(visitCurrent())return '<div class="pagehead">Активный визит</div><section><button onclick="visitEnd()">← К маршруту</button></section><div id="routeCards">'+routeCards()+'</div><section><h3>Завершить визит</h3><button onclick="visitEnd(\'Посещено\')">Посещено</button> <button onclick="visitEnd(\'Без заказа\')">Без заказа</button> <button onclick="visitEnd(\'Закрыто\')">Закрыто</button></section>';
  activeVisit=null;
  let day = routeDate(),
    rows = routeRows(day),
    dow = new Date(day + "T12:00:00").getDay(),
    visited = rows.filter((r) => r.status === "Посещено").length,
    closed = rows.filter((r) => r.status === "Закрыто").length,
    no = rows.filter((r) => r.status === "Без заказа").length,
    done = visited + closed + no;
  return (
    '<div class="pagehead">Мой маршрут</div><section class="rthero"><div class="rttop"><div class="rtname"><small>Рабочий день</small><h3>' +
    esc(
      new Date(day + "T12:00:00").toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    ) +
    '</h3></div><button class="rtsecondary" onclick="delete s.routeDay;save();render()">Сегодня</button></div><div class="rtdate"><button aria-label="Предыдущий день" onclick="routeShift(-1)">‹</button><input aria-label="Дата маршрута" type="date" value="' +
    esc(day) +
    '" onchange="if(this.value){s.routeDay=this.value;save();render()}"><button aria-label="Следующий день" onclick="routeShift(1)">›</button></div><div class="rtweek">' +
    ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
      .map(
        (n, i) =>
          '<button class="' +
          ((dow || 7) === i + 1 ? "rtactive" : "") +
          '" onclick="routeWeekDay(' +
          (i + 1) +
          ')">' +
          n +
          "<small>" +
          monoDay(day, i + 1 - (dow || 7)).slice(-2) +
          "</small></button>",
      )
      .join("") +
    '</div><div class="rttop"><strong>Обработано ' +
    done +
    " / " +
    rows.length +
    "</strong><small>" +
    Math.round((done / Math.max(1, rows.length)) * 100) +
    '%</small></div><progress max="' +
    Math.max(1, rows.length) +
    '" value="' +
    done +
    '"></progress><div class="rtstats">' +
    [
      [rows.length - done, "Осталось"],
      [visited, "Посещено"],
      [closed, "Закрыто"],
      [no, "Без заказа"],
    ]
      .map(
        ([v, n]) =>
          "<div><strong>" + v + "</strong><small>" + n + "</small></div>",
      )
      .join("") +
    "</div>" +
    routePicker() +
    weekUI() +
    '</section><section class="rtfilters"><div class="rtfilter">' +
    [
      ["all", "Все"],
      ["todo", "Осталось"],
      ["done", "Обработано"],
    ]
      .map(
        ([k, n]) =>
          '<button class="' +
          (routeFilter === k ? "rtactive" : "") +
          '" onclick="routeFilter=\'' +
          k +
          "';render()\">" +
          n +
          "</button>",
      )
      .join("") +
    '</div><input type="search" placeholder="Найти точку в маршруте" value="' +
    esc(routeQuery) +
    '" oninput="routeQuery=this.value;routeRefresh()"><small>FIT · период ' +
    esc(s.detail?.period || "нет детализации") +
    '</small></section><div id="routeCards">' +
    routeCards() +
    "</div>"
  );
}
function routeSave() {
  let day = s.routeDay || new Date().toLocaleDateString("sv-SE");
  s.routes ??= {};
  let old = routeRows(day);
  s.routes[day] = $("routeNames")
    .value.split(/\n/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((name) => old.find((r) => r.name === name) || { name });
  save();
  render();
}
function routeStatus(i, v) {
  let day = s.routeDay || new Date().toLocaleDateString("sv-SE");
  s.routes ??= {};
  s.routes[day] ??= routeRows(day);
  s.routes[day][i].status = v;
  save();
  render();
}

function routeNoteKey(r) {
  let name = String(r.name).trim().toLowerCase(),
    same = s.clients.filter((x) => String(x.a).trim().toLowerCase() === name);
  return name + "\u001f" + (same.length > 1 ? r.address || "" : "");
}
function routeGetNote(r) {
  let key = routeKey(r),
    legacy = routeNoteKey(r);
  return (
    s.routeNotes?.[key] ??
    s.routeNotes?.[legacy] ??
    s.routeNotes?.[String(r.name).trim().toLowerCase() + "\u001f"] ??
    ""
  );
}
function routeNote(i, v) {
  let r = routeRows(routeDate())[i];
  if (!r) return;
  s.routeNotes ??= {};
  let k = routeKey(r);
  s.routeNotes[k] = v.trim();
  save();
  render();
}
function routeMigrateNotes() {
  if (s.routeNotesMigrated) return;
  s.routeNotes ??= {};
  for (let day of Object.keys(s.routes || {}).sort())
    for (let r of s.routes[day])
      if (r.note?.trim()) s.routeNotes[routeNoteKey(r)] = r.note.trim();
  s.routeNotesMigrated = true;
  save();
}

function monoDay(d, n = 0) {
  let t = new Date(d + "T12:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
function monoParse(html, year) {
  let doc = new DOMParser().parseFromString(html, "text/html"),
    m = doc
      .querySelector("#Table2")
      ?.textContent.match(/за\s+(\d{2})\.(\d{2})/);
  if (!m) throw Error("Не найден день отчёта Monolit");
  if (!/^(?:19|20|21)\d{2}$/.test(String(year)))
    throw Error("Некорректный год отчёта");
  let date = year + "-" + m[2] + "-" + m[1];
  if (monoDay(date) !== date) throw Error("Некорректная дата");
  let num = (t) => Number(t.trim().replace(/\s/g, "").replace(",", ".")),
    rows = [...doc.querySelectorAll('#Table5 tr[id="t0"]')].map((tr) => {
      let [id, name, q, , dal, , sum] = [...tr.cells].map((t) =>
        t.textContent.trim(),
      );
      let qty = num(q),
        money = num(sum),
        reported = num(dal) * 10,
        v = name.match(/(?:бан|бут|pet|кег)\.?\s*(\d+(?:[.,]\d+)?)/i),
        lit = v ? qty * Number(v[1].replace(",", ".")) : reported,
        cat = /flash/i.test(name)
          ? "Flash"
          : /lipton/i.test(name)
            ? "Lipton"
            : /pepsi|7up|mirinda|mountain dew/i.test(name)
              ? "CSD"
              : /пиво|карлсберг|х[оo]льстен|жатецкий|zatecky|большая кружка|дербес|кроненбург|garage|somersby/i.test(
                    name,
                  )
                ? "BEER"
                : "Прочее";
      if (![qty, money, lit, reported].every(Number.isFinite))
        throw Error("Ошибка строки " + id);
      return {
        id,
        name,
        qty,
        money,
        lit,
        cat,
        promo: /sell[\s-]*in/i.test(name),
      };
    });
  if (!rows.length) throw Error("Нет товарных строк");
  let footer = doc.querySelector('#Table5 tr[id="t1"]');
  if (!footer) throw Error("Нет итоговой строки");
  let f = [...footer.cells].map((t) => t.textContent),
    total = rows.reduce((a, r) => a + r.money, 0);
  if (
    Math.abs(total - num(f[5])) > 0.05 ||
    rows.reduce((a, r) => a + r.qty, 0) !== num(f[1])
  )
    throw Error("Итоги не совпадают");
  return { date, rows, total };
}
async function monoLoad(html) {
  try {
    let year = prompt("Год отчёта Monolit", String(new Date().getFullYear()));
    if (year === null) return;
    if (!/^\d{4}$/.test(year)) throw Error("Введите год четырьмя цифрами");
    let report = monoParse(html, year);
    s.monolit ??= {};
    if (
      s.monolit[report.date] &&
      !confirm("Заменить отчёт за " + report.date + "?")
    )
      return;
    let previous = s;
    s = { ...s, monolit: { ...s.monolit, [report.date]: report } };
    if (!save()) {
      s = previous;
      throw Error("Отчёт не сохранён");
    }
    go(2);
  } catch (e) {
    alert(e.message);
  }
}
function monoForecast() {
  let d = s.forecastDate,
    k = s.detail?.kpi || [],
    period = s.detail?.period;
  if (
    !d ||
    !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
    !period ||
    d.slice(5, 7) + "." + d.slice(0, 4) !== period
  )
    return [];
  return k
    .filter((x) => x.plan > 0)
    .map((x) => {
      let cat = /flash/i.test(x.name)
          ? "Flash"
          : /lipton/i.test(x.name)
            ? "Lipton"
            : /csd/i.test(x.name)
              ? "CSD"
              : "BEER",
        goal = cat === "Flash" ? 100 : 120,
        add = (n) =>
          Object.values(s.monolit || {})
            .filter((r) => {
              let ship = monoDay(r.date, 1);
              return (
                ship >= d &&
                ship < monoDay(d, n) &&
                ship.slice(5, 7) + "." + ship.slice(0, 4) === period
              );
            })
            .flatMap((r) => r.rows)
            .filter((r) => r.cat === cat)
            .reduce((a, r) => a + r.lit, 0),
        a = (x.fact / x.plan) * 100,
        b = ((x.fact + add(1)) / x.plan) * 100,
        c = ((x.fact + add(2)) / x.plan) * 100,
        left = Math.max(0, (x.plan * goal) / 100 - x.fact - add(2));
      return { cat, goal, a, b, c, left, plan: x.plan };
    });
}
function monoSummary() {
  let f = monoForecast();
  return (
    "<section><h3>Прогноз KPI</h3>" +
    (f.length
      ? f
          .map(
            (x) =>
              "<div>" +
              esc(x.cat) +
              " · <b>" +
              fmt(x.c) +
              "%</b> · " +
              fmt(x.c - x.a) +
              " п.п.</div>",
          )
          .join("")
      : "<small>Загрузите детализацию и подтвердите её дату.</small>") +
    '<p><button onclick="go(2)">Открыть прогноз</button></p></section>'
  );
}
function monoUI() {
  let f = monoForecast(),
    d = s.forecastDate || "",
    reports = Object.values(s.monolit || {}).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  return (
    '<div class="pagehead">Продажи и прогноз</div><section><h3>Monolit · ежедневные отчёты</h3><input type="file" accept=".html,.htm" onchange="if(this.files[0])this.files[0].text().then(monoLoad)"><button onclick="importShortcut()">Из буфера WhatsApp</button><textarea id="shortcutpaste" placeholder="Вставьте Base64"></textarea><button onclick="importShortcut(true)">Обработать</button><p id="shortcutstatus"></p><label>Дата утренней детализации (подтвердите после загрузки KPI)</label><input type="date" value="' +
    esc(d) +
    '" onchange="s.forecastDate=this.value;save();render()"><small>Период KPI: ' +
    esc(s.detail?.period || "не загружен") +
    ". Заявка → отгрузка +1 день → детализация +2 дня. Sell-in включён.</small>" +
    (d &&
    s.detail?.period &&
    d.slice(5, 7) + "." + d.slice(0, 4) !== s.detail.period
      ? '<p role="status">Дата детализации не совпадает с периодом KPI. Выберите дату из месяца отчёта.</p>'
      : "") +
    "</section>" +
    (f.length
      ? "<section><h3>Динамика · " +
        esc(d) +
        " → " +
        monoDay(d, 2) +
        "</h3>" +
        [monoDay(d, -1), d]
          .map(
            (day) =>
              "<small>" +
              day +
              ": " +
              (s.monolit?.[day] ? "отчёт загружен" : "нет отчёта") +
              "</small><br>",
          )
          .join("") +
        f
          .map(
            (x, i) =>
              '<div class="task"><b>' +
              x.cat +
              " · цель " +
              x.goal +
              "%</b>" +
              [x.a, x.b, x.c]
                .map(
                  (v, j) =>
                    '<div style="display:flex;gap:8px;align-items:center"><div style="flex:1"><div style="height:12px;border-radius:5px;background:' +
                    ["#94a3b8", "#5293df", "#20a875"][j] +
                    ";width:" +
                    Math.min(100, Math.max(0, (v / Math.max(170, x.c)) * 100)) +
                    '%"></div></div><small>' +
                    fmt(v) +
                    "%</small></div>",
                )
                .join("") +
              "<h2>" +
              fmt(x.c) +
              "%</h2><small>Прирост " +
              fmt(x.c - x.a) +
              " п.п. · Осталось " +
              fmt(x.left) +
              " л / " +
              Math.ceil(x.left / 10.32) +
              ' уп.</small><label>Дополнительные упаковки 24 × 0,43 л</label><input type="number" min="0" step="1" value="' +
              Math.ceil(x.left / 10.32) +
              '" oninput="document.getElementById(\'monoSim' +
              i +
              "').textContent=(" +
              x.c +
              "+Math.max(0,Number(this.value)||0)*10.32/" +
              x.plan +
              "*100).toFixed(2)+'%'\"><b id=\"monoSim" +
              i +
              '">' +
              fmt(x.c + ((Math.ceil(x.left / 10.32) * 10.32) / x.plan) * 100) +
              "%</b></div>",
          )
          .join("") +
        "<small>Прогноз при полной отгрузке; симуляция упаковок условная.</small></section>"
      : "") +
    "<section><h3>История Monolit</h3>" +
    reports
      .map(
        (r) =>
          "<details><summary>" +
          esc(r.date) +
          " · " +
          fmt(r.total) +
          " ₸</summary>" +
          ["BEER", "Flash", "CSD", "Lipton", "Прочее"]
            .map(
              (cat) =>
                "<p>" +
                cat +
                ": " +
                fmt(
                  r.rows
                    .filter((x) => x.cat === cat)
                    .reduce((a, x) => a + x.lit, 0),
                ) +
                " л</p>",
            )
            .join("") +
          "<small>Sell-in: " +
          fmt(r.rows.filter((x) => x.promo).reduce((a, x) => a + x.lit, 0)) +
          " л</small><p><button onclick=\"if(confirm('Удалить отчёт?')){delete s.monolit['" +
          r.date +
          "'];save();render()}\">Удалить</button></p></details>",
      )
      .join("") +
    "</section>"
  );
}

if (!s.weekRoute) {
  s.weekRoute = {
    1: [
      "Жан Маркет",
      "Ажар",
      "Алмас",
      "Айзере",
      "Дос Маркет",
      "Автолюкс",
      "Турар",
      "Сабр",
      "Сарлык",
      "Нурислам",
      "Аружан",
      "RIZIQ",
    ],
    2: [
      "Лаура",
      "Ануар",
      "Золушка",
      "Гулзере",
      "Ольга",
      "Асель",
      "Бастау+",
      "Мирас",
      "Лотос",
      "Улдана",
      "Сат",
      "Моника",
    ],
    3: [
      "магазин Актоты",
      "Архат",
      "Айгерим",
      "Салима",
      "Айым",
      "Айша",
      "Эльнура",
      "Авто Амир",
      "маг Актоты",
      "Зере",
      "Аялы",
      "Авто Сити",
      "Хозтовары",
      "Барс",
    ],
    4: [
      "Жан Маркет",
      "Ажар",
      "Алмас",
      "Айзере",
      "Дос Маркет",
      "Автолюкс",
      "Турар",
      "Сабр",
      "Сарлык",
      "Нурислам",
      "Аружан",
      "RIZIQ",
    ],
    5: [
      "Лаура",
      "Ануар",
      "Золушка",
      "Гулзере",
      "Ольга",
      "Асель",
      "Бастау+",
      "Мирас",
      "Лотос",
      "Улдана",
      "Сат",
      "Моника",
    ],
    6: [
      "магазин Актоты",
      "Архат",
      "Айгерим",
      "Салима",
      "Айым",
      "Айша",
      "Эльнура",
      "Авто Амир",
      "маг Актоты",
      "Зере",
      "Авто Сити",
      "Хозтовары",
      "Барс",
    ],
  };
  save();
}

function homeRoute() {
  delete s.routeDay;
  routeFilter = "all";
  routeQuery = "";
  save();
  go(3);
}
function homeActions() {
  let day = new Date().toLocaleDateString("sv-SE"),
    rows = routeRows(day),
    todo = rows.filter((r) => !r.status || r.status === "Не посещено"),
    notes = rows.filter((r) => routeGetNote(r)),
    tasks = s.tasks.filter((t) => !t.done),
    forecast = monoForecast(),
    fresh = s.forecastDate === day,
    period = day.slice(5, 7) + "." + day.slice(0, 4),
    valid = s.detail?.period === period,
    goals = valid
      ? fresh && forecast.length
        ? forecast
        : s.kpi
            .filter((k) => k.plan > 0)
            .map((k) => {
              let goal = /flash/i.test(k.name) ? 100 : 120;
              return {
                cat: k.name,
                goal,
                left: Math.max(0, (k.plan * goal) / 100 - k.fact),
              };
            })
      : [],
    missing = valid
      ? todo
          .map((r) => ({ r, t: routeMatch(s.detail?.shops || [], r.name) }))
          .filter((x) => x.t?.missing?.length)
      : [],
    stock = s.stockReport ? stockBase() : [],
    out = stock.filter((r) => r.qty === 0),
    flash = stock.filter((r) => r.cat === "FLASH" && r.qty > 0);
  return (
    '<section class="rthero"><h3>План действий на сегодня</h3><div class="rttop"><div><strong>' +
    todo.length +
    " из " +
    rows.length +
    ' ТТ осталось</strong><br><small>Маршрут на сегодня</small></div><button onclick="homeRoute()">Маршрут</button></div><div class="task"><b>Что продать</b><p><small>' +
    (valid
      ? fresh && forecast.length
        ? "Остаток до цели с учётом двухдневного прогноза"
        : "Остаток до цели по последней детализации, без прогноза"
      : "Загрузите детализацию текущего месяца") +
    "</small></p>" +
    goals
      .filter((x) => x.left > 0)
      .sort((a, b) => b.left - a.left)
      .map(
        (x) =>
          '<div class="stocktop"><span>' +
          esc(x.cat) +
          " · " +
          x.goal +
          "%</span><strong>" +
          fmt(x.left) +
          " л" +
          (/flash|beer/i.test(x.cat)
            ? " · " + Math.ceil(x.left / 10.32) + " уп.*"
            : "") +
          "</strong></div>",
      )
      .join("") +
    (goals.length && !goals.some((x) => x.left > 0)
      ? "<small>Все выбранные цели закрыты</small>"
      : "") +
    '<small>* Условно 24 × 0,43 л. Это остаток до цели, не обязательный дневной объём.</small><p><button onclick="go(2)">Прогноз продаж</button></p></div><div class="task"><b>Что сделать в точках</b>' +
    notes
      .map(
        (r) =>
          '<div class="rtmemo"><small>' +
          esc(r.name) +
          "</small>" +
          esc(routeGetNote(r)) +
          "</div>",
      )
      .join("") +
    (notes.length
      ? ""
      : "<p><small>Нет постоянных заметок в сегодняшнем маршруте.</small></p>") +
    missing
      .map(
        ({ r, t }) =>
          '<div class="task"><b>' +
          esc(r.name) +
          "</b><br><small>Проверить Flash: " +
          esc(t.missing.join(", ")) +
          "</small></div>",
      )
      .join("") +
    (missing.length
      ? ""
      : "<p><small>Нет подтверждённых незакрытых групп Flash в оставшихся точках.</small></p>") +
    '</div><div class="task"><b>Поручения · ' +
    tasks.length +
    "</b>" +
    tasks
      .map(
        (t) =>
          '<div class="task"><span>' +
          esc(t.name) +
          "</span><br><small>" +
          esc(t.due || "Без срока") +
          (t.due && t.due < day ? " · ПРОСРОЧЕНО" : "") +
          "</small></div>",
      )
      .join("") +
    '<p><button onclick="go(1)">Задачи</button></p></div><div class="task"><b>Перед заказом</b><p><small>' +
    (s.stockReport
      ? "По последнему складу: " + out.length + " позиций без остатка."
      : "Загрузите свежие остатки.") +
    "</small></p>" +
    out
      .slice(0, 4)
      .map(
        (r) =>
          '<div><small style="color:#ff929b">' +
          esc(r.name) +
          " · 0 шт.</small></div>",
      )
      .join("") +
    '<button onclick="go(4)">Проверить склад</button></div></section>'
  );
}

function fitRules(type, beer) {
  const rules = [],
    add = (key, label, idx, max, items) =>
      rules.push({ key, label, idx, max, items });
  const item = (label, re, count = 1) => ({ label, re, count });
  const pepsi = (v) => new RegExp("pepsi(?!.*zero).*" + v, "i");
  const lip = (taste, v) => new RegExp("lipton.*" + taste + ".*" + v, "i");
  const flash = [
    item("Flash Ultra 0,43 / 0,45 л", /flash.*ultra.*0[.,]4[35]/i),
    item(
      "Flash Classic 0,43 / 0,45 л",
      /flash.*energy(?!.*(?:ultra|bubble|exotic|mojito|pomegranate|night|peach|morning|berry|tropical|mango|apple)).*0[.,]4[35]/i,
    ),
    item("Flash Ultra 0,25 л", /flash.*ultra.*0[.,]25/i),
    item(
      "Два дополнительных вкуса Flash",
      /flash.*(?:bubble|exotic|mojito|pomegranate)/i,
      2,
    ),
  ];
  if (type === "pepsi" || type === "flex") {
    add("csd", "CSD", 11, 40, [
      ...["2[.,]0", "1[.,]0", "0[.,]5", "0[.,]45"].map((v, i) =>
        item(
          ["Pepsi 2 л", "Pepsi 1 л", "Pepsi 0,5 л", "Pepsi 0,45 л"][i],
          pepsi(v),
        ),
      ),
      item("Mirinda 1 л", /mirinda.*1[.,]0/i),
    ]);
    add("lipton", "Lipton", 12, 20, [
      item("Lipton персик 1 л", lip("персик", "1[.,]0")),
      item("Lipton лимон 1 л", lip("лимон", "1[.,]0")),
      ...(type === "flex"
        ? []
        : [
            item("Lipton малина 1 л", lip("малина", "1[.,]0")),
            item("Lipton манго 1 л", lip("манго", "1[.,]0")),
          ]),
    ]);
    add("flash", "Flash", 15, 20, flash);
    add("focusNon", "Focus + NPD", 13, 10, [
      item("Pepsi Zero 0,5 л", /pepsi.*zero.*0[.,]5/i),
      item("Pepsi Zero 0,45 л", /pepsi.*zero.*0[.,]45/i),
      item("7UP 0,45 л", /7up.*0[.,]45/i),
      item("Mirinda 0,45 л", /mirinda.*0[.,]45/i),
      item("Mirinda 0,5 л", /mirinda.*0[.,]5/i),
      item("Lipton лимон 0,5 л", lip("лимон", "0[.,]5")),
      item("Lipton персик 0,5 л", lip("персик", "0[.,]5")),
    ]);
    add("taste", "Taste", 14, 10, [
      item("Lipton малина 0,5 л", lip("малина", "0[.,]5")),
      item("Lipton манго 0,5 л", lip("манго", "0[.,]5")),
    ]);
  } else if (type === "flash" || type === "none") {
    add("csd", "CSD", 11, 40, [
      item("Pepsi 2 л", pepsi("2[.,]0")),
      item("Pepsi 1 л", pepsi("1[.,]0")),
    ]);
    add("lipton", "Lipton", 12, 30, [
      item("Lipton персик 1 л", lip("персик", "1[.,]0")),
      item("Lipton лимон 1 л", lip("лимон", "1[.,]0")),
    ]);
    add(
      "flash",
      "Flash",
      15,
      30,
      type === "none" ? [item("Два SKU Flash на выбор", /flash/i, 2)] : flash,
    );
  }
  if (beer === "yes" || beer === "none") {
    add("national", "Beer · национальная", 0, beer === "yes" ? 30 : 92, [
      item("Большая Кружка Мягкое 0,43 л", /большая кружка.*мягкое.*0[.,]43/i),
      item("Жатецкий Гусь крепкое 0,43 л", /жатецкий.*крепкое.*0[.,]43/i),
      item("Жатецкий Гусь экспортное 0,43 л", /жатецкий.*экспортное.*0[.,]43/i),
      item(
        "Жатецкий Гусь классический 0,43 л",
        /жатецкий гусь\s+бан.*0[.,]43/i,
      ),
      item(
        "Карлсберг банка 0,43 / 0,45 л",
        /карлсберг(?!.*безалкоголь).*бан.*0[.,]4[35]/i,
      ),
      item("Хольстен Light банка 0,43 л", /х[оo]льстен.*light.*бан.*0[.,]43/i),
    ]);
    add("afb", "AFB", 3, beer === "yes" ? 11 : 5, [
      item("Жатецкий Гусь №0", /жатецкий.*№0/i),
    ]);
    if (beer === "yes") {
      add("npd", "NPD", 2, 15, [
        item("Garage Raspberry Currant", /garage.*raspberry/i),
        item("Garage Hardcore Soju", /garage.*soju/i),
      ]);
      add("focusBeer", "Focus · регион и двери уточнить", 1, 20, [
        item("Garage в бутылке", /garage.*бут/i),
        item("Garage в банке", /garage.*бан/i),
        item("Somersby — вкусы по матрице", /somersby/i),
        item("Кроненбург Бланк", /кроненбург.*бланк/i),
        item("Хольстен Пилснер", /х[оo]льстен.*пил/i),
        item("Карлсберг в бутылке", /карлсберг.*бут/i),
      ]);
    }
  }
  return rules;
}
function fitCriterion(fm, g) {
  const patterns = {
    national: /^Нац.*группа.*ХО/i,
    focusBeer: /^Focus.*ХО/i,
    npd: /^NPD/i,
    afb: /^AFB/i,
    csd: /CSD/i,
    lipton: /Lipton/i,
    focusNon: /^Focus\+NPD/i,
    taste: /Tast[ye]/i,
    flash: /^Flash/i,
  };
  const index = fm.criterionHeaders?.findIndex((h) => patterns[g.key].test(h));
  return fm.criteria[index >= 0 ? index : g.idx];
}
function skuKey(name) {
  return name
    .toLowerCase()
    .replace(/0[.,]4[35]/g, "0.4")
    .replace(/[^\p{L}\p{N}]/gu, "");
}
function fitMissing(group, seen, known, stock) {
  return group.items.flatMap((item) => {
    const have = new Set(seen.filter((n) => item.re.test(n)).map(skuKey)).size,
      need = Math.max(0, item.count - have);
    if (!need) return [];
    const names = known.filter(
      (n) => item.re.test(n) && !seen.some((h) => skuKey(h) === skuKey(n)),
    );
    const candidates = stock
      .filter(
        (r) =>
          item.re.test(r.name) &&
          !seen.some((h) => skuKey(h) === skuKey(r.name)),
      )
      .sort((a, b) => b.qty - a.qty);
    return [
      {
        name:
          item.count > 1
            ? item.label + " · не хватает " + need + " SKU"
            : names[0] || item.label,
        known: names.length > 0,
        stocks: candidates.slice(0, 5),
      },
    ];
  });
}
function fitSet(i, k, v) {
  let r = routeRows(routeDate())[i];
  if (!r) return;
  let t = routeMatch(s.detail?.shops || [], r.name, r.address);
  fitSetKey(fitKey(r, t), k, v);
}
function fitLegacyEquipment(r) {
  let matches = Object.entries(s.fitEquipment || {}).filter(
    ([key]) =>
      !key.startsWith("shop:") &&
      routeNorm(key.split("\u001f")[0]) === routeNorm(r.name),
  );
  return matches.length === 1 ? matches[0][1] : {};
}
function fitKey(r, t) {
  return t?.id ? "shop:" + t.id : routeKey(r);
}
function fitSetKey(key, k, v) {
  s.fitEquipment ??= {};
  s.fitEquipment[key] ??= {};
  s.fitEquipment[key][k] = v;
  save();
  render();
  document.querySelectorAll("details[data-fit-key]").forEach((el) => {
    if (el.dataset.fitKey === key) {el.open = true; if(k==="counts") {const d=el.querySelector("details");if(d)d.open=true;}}
  });
}

function equipmentModes(eq) {
  const non = eq.non || "",
    beerDoors = eq.beer || "";
  const flashHO = eq.flash || (non === "flash" ? "yes" : "");
  const type = ["pepsi1", "pepsi2", "pepsi", "lipton"].includes(non)
    ? "pepsi"
    : non === "flex"
      ? "flex"
      : ["none", "flash"].includes(non)
        ? flashHO === "yes"
          ? "flash"
          : flashHO === "none"
            ? "none"
            : ""
        : "";
  const beer = ["1d", "2d", "yes"].includes(beerDoors) ? "yes" : beerDoors;
  return { non, beerDoors, flashHO, type, beer };
}
function fitEquipmentCount(key,k,v){
 const eq=s.fitEquipment?.[key]||{};
 const counts={...(eq.counts||{})};
 if(v==="")delete counts[k];else counts[k]=Math.max(0,Math.min(4,Math.floor(Number(v)||0)));
 fitSetKey(key,"counts",counts);
}
function fitCountsUI(key,eq){
 const counts=eq.counts||{};
 return '<details><summary>Количество холодильников и состояние</summary><p><small>Не проверено — неизвестно. Нет — подтверждено отсутствие. Ремонт отдельно.</small></p>'+[["beer1","Пиво 1Д"],["beer2","Пиво 2Д"],["pepsi1","Pepsi 1Д"],["pepsi2","Pepsi 2Д"],["flex","Flex 400"],["lipton","Lipton"],["flash","Flash"],["repair","В ремонте"]].map(([k,n])=>'<label>'+n+'</label><select onchange="fitEquipmentCount('+esc(JSON.stringify(key))+',&quot;'+k+'&quot;,this.value)">'+[["","Не проверено"],["0","Нет"],...Array.from({length:4},(_,i)=>[String(i+1),String(i+1)+" шт."])].map(([v,l])=>'<option value="'+v+'" '+(String(counts[k]??"")===v?"selected":"")+'>'+l+'</option>').join("")+'</select>').join("")+'<p><small>Количество — инвентаризация. Для правил FIT подтвердите типы в списках выше.</small></p></details>';
}
function fitOrderHint(st){
 if(!st||st.qty<=0)return "";
 const m=st.name.match(/(\d+[.,]\d+|\d+)\s*(?:л\s*)?[*×xх]\s*\d+/i);
 if(!m)return "";
 const vol=Number(m[1].replace(",","."));
 if(!(vol>0&&vol<=5))return "";
 const qty=Math.ceil(1/vol);
 return st.qty>=qty?" · пробный заказ "+qty+" шт. (гипотеза 1 л, не гарантия FIT)":" · недостаточно для пробного заказа";
}

function fitLink(name,address,id){
 const old=routeKey({name,address});
 s.fitLinks??={};
 const key=routeNorm(name,true)+"|"+routeNorm(address,true);
 if(id){s.fitLinks[key]=id;s.fitEquipment??={};if(s.fitEquipment[old]&&!s.fitEquipment["shop:"+id])s.fitEquipment["shop:"+id]={...s.fitEquipment[old]};}
 else delete s.fitLinks[key];
 save();render();
}
function fitAdvice(r, t, fm, i) {
  let key = fitKey(r, t),
    eq =
      s.fitEquipment?.[key] ||
      s.fitEquipment?.[routeKey(r)] ||
      fitLegacyEquipment(r),
    { non, beerDoors, flashHO, type, beer } = equipmentModes(eq),
    day = i === null ? new Date().toLocaleDateString("sv-SE") : routeDate(),
    valid = s.detail?.period === day.slice(5, 7) + "." + day.slice(0, 4),
    select = (k, opts, v) =>
      '<select onchange="fitSetKey(' +
      esc(JSON.stringify(key)) +
      ",&quot;" +
      k +
      '&quot;,this.value)">' +
      opts
        .map(
          ([a, b]) =>
            '<option value="' +
            a +
            '" ' +
            (a === v ? "selected" : "") +
            ">" +
            b +
            "</option>",
        )
        .join("") +
      "</select>",
    h =
      '<details data-fit-key="' +
      esc(key) +
      '" open><summary>FIT · рекомендации Urban' + (routeNorm(r.name)==="бастау+"?" · тестовая ТТ":"") + '</summary><small>Матрица: ' +
      esc(t?.matrix || "не определена") +
      "</small><label>ХО NonAlco</label>" +
      select(
        "non",
        [
          ["", "Не определено"],
          ["pepsi1", "Pepsi 1Д"],
          ["flex", "Flex 400"],
          ["pepsi2", "Pepsi 2Д"],
          ["lipton", "Lipton"],
          ["pepsi", "Pepsi / Lipton (уточнить)"],
          ["none", "Нет Pepsi / Lipton"],
        ],
        non === "flash" ? "none" : non,
      ) +
      "<label>Пивное ХО</label>" +
      select(
        "beer",
        [
          ["", "Не определено"],
          ["1d", "Пиво 1Д"],
          ["2d", "Пиво 2Д"],
          ["yes", "Есть (уточнить двери)"],
          ["none", "Нет"],
        ],
        beerDoors,
      ) +
      "<label>Отдельное ХО Flash</label>" +
      select(
        "flash",
        [
          ["", "Не определено"],
          ["yes", "Есть"],
          ["none", "Нет"],
        ],
        flashHO,
      ) + fitCountsUI(key,eq);
  const equipmentHTML=h.slice(h.indexOf("<label>ХО NonAlco</label>"));
  h=h.slice(0,h.indexOf("<label>ХО NonAlco</label>"));
  const equipmentPanel="<details><summary>Настроить оборудование</summary>"+equipmentHTML+"</details>";
  if (!t && !fm) {
    const opts=[...new Map([...(s.detail?.shops||[]),...(s.detail?.fit||[])].filter(x=>x.id).map(x=>[String(x.id),x])).values()];
    h+='<p>Точка не сопоставлена с отчётом. Выберите её вручную:</p><select onchange="fitLink('+esc(JSON.stringify(r.name))+','+esc(JSON.stringify(r.address||""))+',this.value)"><option value="">Выберите ТТ из детализации</option>'+opts.map(x=>'<option value="'+esc(String(x.id))+'">'+esc(x.name)+'</option>').join("")+'</select>';
  }
  if (!valid)
    return (
      h +
      "<p>Загрузите свежую детализацию повторно для анализа всех SKU и критериев.</p>"+equipmentPanel+"</details>"
    );
  let stock = stockAliases(
      (s.stockReport?.rows || []).filter(
        (x) =>
          !x.keg &&
          !x.bib &&
          !/flash.*(night movie|peach pineapple)/i.test(x.name),
      ),
    ),
    seen = t?.sku || [],
    known = t?.known || [],
    rules = fitRules(type, beer);
  h +=
    "<small>История продаж ≠ наличие на полке. Баллы — вес группы, не гарантированный прирост. Для Focus уточните региональную матрицу и число дверей ХО.</small>";
  if(!fm?.criteria) h+="<p>Нет подробных оценок критериев. Ниже контрольные рекомендации, не подтвержденные нарушения FIT.</p>";
  if(!t?.sku) h+="<p>Нет истории SKU на Sheet4. Ниже контрольный ассортимент по оборудованию, отсутствие товара не подтверждено.</p>";
  for (let g of rules) {
    let score = fm?.criteria ? fitCriterion(fm, g) : null;
    if (score != null && score * 100 >= g.max - 0.05)
      continue;
    let items = fitMissing(g, seen, known, stock);
    h +=
      '<div class="task"><b>' +
      esc(g.label) +
      "</b><br><small>По отчёту " +
      (score == null ? "нет оценки" : fmt(score * 100)) +
      " п.п. / вес " +
      g.max +
      " п.п.</small>" +
      items
        .map(
          (x) =>
            "<div>" +
            esc(x.name) +
            "<br><small>" +
            (!x.known ? "SKU не найден в ассортименте отчёта · " : "") +
            (x.stocks.length
              ? x.stocks
                  .map(
                    (st) =>
                      "Склад: " +
                      esc(st.name) +
                      " — " +
                      fmt(st.qty) +
                      " шт. · "+Math.floor(st.qty/st.pack)+" уп. + "+fmt(st.qty%st.pack)+" шт." +
                      (st.qty > 0 ? " · в наличии" : " · нет в наличии") + (g.key==="flash"?fitOrderHint(st):""),
                  )
                  .join("<br>")
              : "Остаток неизвестен") +
            "</small></div>",
        )
        .join("") +
      (items.length ? "" : "<small>Проверить выкладку, фейсы и фото.</small>") +
      "</div>";
  }
  if (!type || !beer)
    h += '<p><small>Общая проверка: наличие товара, ценники, сроки годности. Неизвестное ХО не считается отсутствующим.</small></p>';
  if (!type || !beer)
    h +=
      "<p><small>Выберите тип ХО для рекомендаций соответствующей категории.</small></p>";
  if (beer === "yes")
    h +=
      (beerDoors === "1d"
        ? "<p><small>Пиво 1Д: проверить нормы фейсов и Focus для одной двери.</small></p>"
        : beerDoors === "2d"
          ? "<p><small>Пиво 2Д: проверить нормы фейсов для двух дверей.</small></p>"
          : "") +
      "<small>Дополнительно: проверить двери, место ХО, планограмму, заполнение 80%, ценники 70%, FEFO.</small>";
  if (type === "flash" || type === "pepsi" || type === "flex")
    h +=
      "<p><small>Flash: 2 Ultra + Classic + Ultra 0,25 + 2 дополнительных SKU, 6 фейсов. Для точки без ХО — 2 SKU.</small></p>";
  return h + equipmentPanel + "</details>";
}
function promoUI() {
  return '<section><h3>Калькулятор акций</h3><label>Цена за штуку</label><input id="prPrice" type="number" min="0" value="0" oninput="promoCalc()"><label>Оплачиваемые штуки</label><input id="prQty" type="number" min="0" value="24" oninput="promoCalc()"><label>Акция</label><select id="prRule" onchange="promoCalc()"><option value="4">4+1</option><option value="6">6+1</option><option value="0">Без акции</option></select><label>Объём единицы, л</label><input id="prLit" type="number" min="0" step=".01" value=".43" oninput="promoCalc()"><div id="prResult">Введите цену</div></section>';
}
function promoCalc() {
  let q = Math.max(0, Math.floor(+$("prQty").value || 0)),
    p = Math.max(0, +$("prPrice").value || 0),
    r = +$("prRule").value,
    b = r ? Math.floor(q / r) : 0,
    l = Math.max(0, +$("prLit").value || 0);
  $("prResult").textContent =
    "Оплата " +
    fmt(q * p) +
    " ₸ · бонус " +
    b +
    " шт. · всего " +
    (q + b) +
    " шт. / " +
    fmt((q + b) * l) +
    " л";
}
async function restoreMix(file) {
  try {
    let v = validateMix(JSON.parse(await file.text()));
    if (
      !confirm(
        "Восстановить данные из копии? Текущее состояние будет сохранено перед восстановлением. Исходные документы останутся на устройстве.",
      )
    )
      return;
    let current = localStorage.getItem("mix-v1");
    if (current !== null) localStorage.setItem("mix-before-restore", current);
    localStorage.setItem("mix-v1", JSON.stringify(v));
    storageProblem = "";
    s = v;
    routeMigrateNotes();
    go(0);
    alert("Резервная копия восстановлена.");
  } catch (e) {
    alert("Копия не восстановлена: " + e.message);
  }
}
function restorePrevious() {
  let raw = localStorage.getItem("mix-before-restore");
  if (!raw) return alert("Нет предыдущего состояния");
  return restoreMix({ text: async () => raw });
}
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  try {
    return monoDay(value) === value;
  } catch {
    return false;
  }
}
function validateMix(v) {
  const object = (x) =>
    x !== null && typeof x === "object" && !Array.isArray(x);
  const fail = () => {
    throw Error("Некорректная резервная копия MIX");
  };
  if (
    !object(v) ||
    !Array.isArray(v.kpi) ||
    !Array.isArray(v.clients) ||
    !Array.isArray(v.tasks)
  )
    fail();
  if (
    v.kpi.length !== 4 ||
    !v.kpi.every(
      (k) =>
        object(k) &&
        typeof k.name === "string" &&
        Number.isFinite(k.fact) &&
        k.fact >= 0 &&
        Number.isFinite(k.plan) &&
        k.plan >= 0,
    )
  )
    fail();
  for (let key of ["clients", "stock", "sales"])
    if (
      v[key] !== undefined &&
      (!Array.isArray(v[key]) ||
        !v[key].every(
          (r) =>
            object(r) && typeof r.a === "string" && typeof r.b === "string",
        ))
    )
      fail();
  if (!v.tasks.every((t) => object(t) && typeof t.name === "string")) fail();
  if (
    v.pay !== undefined &&
    (!object(v.pay) ||
      Object.values(v.pay).some((n) => !Number.isFinite(Number(n))))
  )
    fail();
  const route = (r) => object(r) && typeof r.name === "string";
  for (let key of ["routes", "weekRoute"])
    if (
      v[key] !== undefined &&
      (!object(v[key]) ||
        !Object.values(v[key]).every(
          (a) =>
            Array.isArray(a) &&
            a.every(
              (r) => (key === "weekRoute" && typeof r === "string") || route(r),
            ),
        ))
    )
      fail();
  for (let key of ["routeNotes", "fitEquipment", "stockFilters", "detailPrefs"])
    if (v[key] !== undefined && !object(v[key])) fail();
  if (
    v.routeNotes &&
    Object.values(v.routeNotes).some((x) => typeof x !== "string")
  )
    fail();
  if (v.fitEquipment && Object.values(v.fitEquipment).some((x) => !object(x)))
    fail();
  for (let key of ["detail", "detailPrevious"])
    if (v[key] != null) {
      let d = v[key];
      if (
        !object(d) ||
        !Array.isArray(d.kpi) ||
        !Array.isArray(d.shops) ||
        !Array.isArray(d.fit) ||
        !object(d.visits)
      )
        fail();
      if (
        !d.kpi.every(
          (k) =>
            object(k) &&
            typeof k.name === "string" &&
            Number.isFinite(k.fact) &&
            Number.isFinite(k.plan),
        )
      )
        fail();
      if (
        !d.shops.every(
          (t) =>
            object(t) && typeof t.name === "string" && Array.isArray(t.missing),
        )
      )
        fail();
      if (!d.fit.every((t) => object(t) && typeof t.name === "string")) fail();
    }
  for (let key of ["stockReport", "stockPrevious"])
    if (
      v[key] != null &&
      (!object(v[key]) ||
        !Array.isArray(v[key].rows) ||
        !v[key].rows.every(
          (r) =>
            object(r) &&
            typeof r.name === "string" &&
            Number.isFinite(r.qty) &&
            Number.isFinite(r.pack) &&
            r.pack > 0,
        ))
    )
      fail();
  if (v.forecastDate && !validDate(v.forecastDate)) fail();
  if (v.routeDay !== undefined && !validDate(v.routeDay)) fail();
  if (v.routes && Object.keys(v.routes).some((d) => !validDate(d))) fail();
  if (
    v.weekRoute &&
    Object.keys(v.weekRoute).some((d) => !/[0-6]/.test(d) || d.length !== 1)
  )
    fail();
  for (let key of ["detail", "detailPrevious"])
    if (v[key]) {
      let d = v[key];
      if (d.period != null && !/^(0[1-9]|1[0-2])\.\d{4}$/.test(d.period))
        fail();
      for (let t of d.shops)
        for (let field of ["sku", "known"])
          if (
            t[field] !== undefined &&
            (!Array.isArray(t[field]) ||
              !t[field].every((n) => typeof n === "string"))
          )
            fail();
      for (let t of d.fit) {
        if (
          t.criteria !== undefined &&
          (!Array.isArray(t.criteria) ||
            !t.criteria.every((n) => n === null || Number.isFinite(n)))
        )
          fail();
        if (
          t.criterionHeaders !== undefined &&
          (!Array.isArray(t.criterionHeaders) ||
            !t.criterionHeaders.every((n) => typeof n === "string"))
        )
          fail();
      }
    }
  if (
    v.monolit !== undefined &&
    (!object(v.monolit) ||
      !Object.values(v.monolit).every(
        (r) =>
          object(r) &&
          validDate(r.date) &&
          Number.isFinite(r.total) &&
          Array.isArray(r.rows) &&
          r.rows.every(
            (x) =>
              object(x) && typeof x.cat === "string" && Number.isFinite(x.lit),
          ),
      ))
  )
    fail();
  return {
    ...structuredClone(initial),
    ...v,
    pay: { ...initial.pay, ...v.pay },
  };
}
function bindLabels() {
  let index = 0;
  document.querySelectorAll("#view label").forEach((label) => {
    let input = label.querySelector("input,select,textarea");
    if (!input) {
      let next = label.nextElementSibling;
      input = next?.matches("input,select,textarea") ? next : null;
    }
    if (input) {
      if (!input.id) {
        while (document.getElementById("field-" + index)) index++;
        input.id = "field-" + index++;
      }
      label.htmlFor = input.id;
    }
  });
}

routeMigrateNotes();
render();
