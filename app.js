const APP_VERSION = "0.11.1-stable";
const productCache = new Map();
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
function readUI() {
  try {
    return JSON.parse(sessionStorage.getItem("mix-ui") || "{}") || {};
  } catch {
    return {};
  }
}
const restoredUI = readUI();
let tab =
  Number.isInteger(restoredUI.tab) &&
  restoredUI.tab >= 0 &&
  restoredUI.tab <= 10
    ? restoredUI.tab
    : 0;
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
  "Маршрут",
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
  rememberView();
  tab = i;
  render();
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
  return (
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    (i === 10
      ? '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h9"/>'
      : paths[i]) +
    "</svg>"
  );
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
  rememberView();
  $("nav").innerHTML = [0, 7, 10, 3, 4, 9]
    .map(
      (i) =>
        '<button class="' +
        (tab === i || (i === 9 && ![0, 7, 10, 3, 4].includes(tab))
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
      '</div></section><section><h3>Данные</h3><button onclick="backup()">Экспорт резервной копии</button> <button onclick="restorePrevious()">Вернуть состояние до восстановления</button><label>Восстановить JSON</label><input type="file" accept=".json" onchange="if(this.files[0])restoreMix(this.files[0])"><p><small>Данные хранятся в этом браузере. Копия включает данные и сохранённые исходные документы.</small></p></section>';
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
  } else if (tab === 10) {
    h = routeUI();
  } else if (tab === 3) {
    h =
      clientEditIndex !== null && s.clients[clientEditIndex]
        ? clientSettings()
        : "<section><h3>Клиентская база · " +
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
  restoreView();
}

let payrollRows = [];
async function readPayroll(file) {
  let el = $("payimport");
  el.textContent = "Читаю Excel…";
  try {
    let x = await import(
        "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs"
      ),
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
  const status = $("detailstatus");
  if (status) status.textContent = "Читаю Excel…";
  try {
    const x = await import(
        "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs"
      ),
      w = x.read(await checkedBytes(file), { type: "array" });
    const read = (name) => {
      if (!w.Sheets[name]) throw Error("Нет листа " + name);
      let rows = [],
        count = 0;
      for (const [address, cell] of Object.entries(w.Sheets[name])) {
        if (!/^[A-Z]+\d+$/.test(address)) continue;
        if (++count > 500000) throw Error("Слишком большой лист");
        const pos = x.utils.decode_cell(address);
        if (pos.r > 20000 || pos.c > 500)
          throw Error("Неподдерживаемый размер листа");
        (rows[pos.r] ??= [])[pos.c] = cell.v;
      }
      return Array.from(rows, (r) => r || []);
    };
    const [a, v, m, b, f] = [
        "Sheet1",
        "Sheet2",
        "Sheet3",
        "Sheet4",
        "Sheet5",
      ].map(read),
      norm = (v) =>
        String(v ?? "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " "),
      num = (v) => typeof v === "number" && Number.isFinite(v);
    const kh = a.findIndex((r) => norm(r[2]) === "kpi"),
      sh = b.findIndex((r) => r.some((c) => norm(c) === "shop id")),
      fh = f.findIndex(
        (r) =>
          r.some((c) => /^(код точки|shop id)$/i.test(norm(c))) &&
          r.some((c) => /торговая точка|наименование тт/i.test(norm(c))),
      );
    if (kh < 0 || sh < 0 || fh < 0)
      throw Error("Не найдены заголовки KPI, Shop Id или FIT");
    const period =
      a
        .slice(0, kh)
        .flat()
        .map((v) => String(v ?? ""))
        .join(" ")
        .match(/\b(0[1-9]|1[0-2])\.(20\d{2})\b/)?.[0] || null;
    if (!period) throw Error("Не определён период KPI");
    const factCol = a[kh].findIndex((c) => norm(c) === "факт"),
      planCol = a[kh].findIndex((c) => norm(c) === "план");
    const kpi = ["BEER", "Flash", "CSD", "Lipton"].map((name) => {
      const row = a
        .slice(kh + 1)
        .find(
          (r) =>
            norm(r[2]).includes(name.toLowerCase()) &&
            num(r[factCol]) &&
            num(r[planCol]),
        );
      if (!row || row[factCol] < 0 || row[planCol] < 0)
        throw Error("Некорректный KPI " + name);
      return { name, fact: row[factCol] * 10, plan: row[planCol] * 10 };
    });
    const visits = { plan: 0, fact: 0 };
    for (const row of v)
      if (row[4] && row[5] && num(row[7]) && num(row[8])) {
        visits.plan += row[7];
        visits.fact += row[8];
      }
    const summary = a.find((r) =>
      /кол-во выполненных визитов/i.test(String(r[2])),
    );
    if (summary && num(summary[factCol]) && num(summary[planCol])) {
      visits.monthPlan = visits.plan;
      visits.fact = summary[factCol];
      visits.plan = summary[planCol];
    }
    const km = m
        .filter((r) => num(r[4]) && r[2])
        .reduce((sum, r) => sum + r[4], 0),
      headers = b[sh];
    const idCol = headers.findIndex((c) => norm(c) === "shop id"),
      nameCol = headers.findIndex((c) => /наименование тт/i.test(norm(c))),
      matrixCol = headers.findIndex((c) => /код матрицы/i.test(norm(c))),
      dateCol = headers.findIndex((c) => /дата визита/i.test(norm(c)));
    if ([idCol, nameCol, matrixCol, dateCol].some((c) => c < 0))
      throw Error("Неполные заголовки ассортимента");
    const catalog = [
        ...new Set(
          headers
            .slice(dateCol + 1, 135)
            .map((c) => String(c || "").trim())
            .filter(Boolean),
        ),
      ],
      shops = new Map();
    let current = null;
    for (const row of b.slice(sh + 1)) {
      if (row[idCol] && row[nameCol]) {
        current = normalizeId(row[idCol]);
        const existing = shops.get(current);
        if (!existing)
          shops.set(current, {
            id: current,
            name: String(row[nameCol]).trim(),
            matrix: String(row[matrixCol] || "").trim(),
            sku: [],
            historical: true,
          });
        else if (!existing.matrix && row[matrixCol])
          existing.matrix = String(row[matrixCol]).trim();
      }
      if (!current || !num(row[dateCol])) continue;
      const t = shops.get(current);
      for (let col = dateCol + 1; col < 135; col++) {
        const name = String(headers[col] || "").trim();
        if (name && num(row[col]) && row[col] > 0 && !t.sku.includes(name))
          t.sku.push(name);
      }
    }
    const flashGroups = [
      ["Ultra", /flash.*ultra.*0[.,]4[35]/i],
      [
        "Classic",
        /flash.*energy(?!.*(?:ultra|bubble|exotic|mojito|pomegranate|morning|night|peach)).*0[.,]4[35]/i,
      ],
      ["0,25", /flash.*0[.,]25/i],
    ];
    const fitHeaders = f[fh],
      fitId = fitHeaders.findIndex((c) =>
        /^(код точки|shop id)$/i.test(norm(c)),
      ),
      fitName = fitHeaders.findIndex((c) =>
        /торговая точка|наименование тт/i.test(norm(c)),
      ),
      beerCol = fitHeaders.findIndex((c) => norm(c) === "total beer"),
      nonCol = fitHeaders.findIndex((c) => norm(c) === "total nonalco");
    if (beerCol < 0 || nonCol < 0) throw Error("Нет итоговых критериев FIT");
    const report = {
      name: file.name,
      period,
      kpi,
      visits,
      km,
      importedAt: new Date().toISOString(),
      schemaVersion: 2,
      skuCatalog: catalog,
      shops: [...shops.values()].map((t) => ({
        ...t,
        missing: flashGroups
          .filter(([, re]) => !t.sku.some((n) => re.test(n)))
          .map(([name]) => name),
      })),
      fit: f
        .slice(fh + 1)
        .filter(
          (r) => r[fitId] && r[fitName] && (num(r[beerCol]) || num(r[nonCol])),
        )
        .map((r) => ({
          id: normalizeId(r[fitId]),
          name: String(r[fitName]).trim(),
          criterionHeaders: Array.from({ length: 21 }, (_, i) =>
            String(fitHeaders[i + 7] || ""),
          ),
          criteria: Array.from({ length: 21 }, (_, i) =>
            num(r[i + 7]) ? r[i + 7] : null,
          ),
          beer: num(r[beerCol]) ? r[beerCol] : null,
          non: num(r[nonCol]) ? r[nonCol] : null,
        })),
    };
    if (!report.shops.length || !report.fit.length)
      throw Error("Нет данных торговых точек");
    const content = (r) => ({
      period: r.period,
      kpi: r.kpi,
      shops: r.shops,
      fit: r.fit,
      skuCatalog: r.skuCatalog,
    });
    if (s.detail && contentSame(content(s.detail), content(report))) {
      if (status)
        status.textContent = "Этот отчёт уже загружен. Данные не задвоены.";
      return;
    }
    if (
      s.detail?.period === period &&
      kpi.some(
        (k) =>
          k.fact < (s.detail.kpi.find((x) => x.name === k.name)?.fact || 0),
      ) &&
      !confirm(
        "Факт ниже предыдущего отчёта. Это может быть более ранний отчёт или корректировка. Заменить текущий отчёт?",
      )
    )
      return;
    const previous = s.detail,
      history = previous
        ? [...(s.detailHistory || []), previous]
        : s.detailHistory || [];
    const next = {
      ...s,
      detail: report,
      detailHistory: history,
      detailPrevious: previous || s.detailPrevious,
      forecastDate: "",
      kpi,
    };
    if (!commitState(next))
      throw Error("Импорт не сохранён. Предыдущие данные оставлены.");
    if (tab === 7) {
      render();
      $("detailstatus").textContent =
        "Обработано: 5 листов · ТТ: " +
        report.shops.length +
        " · FIT: " +
        report.fit.length;
    }
  } catch (e) {
    if (status) status.textContent = "Ошибка: " + e.message;
    else alert("Ошибка: " + e.message);
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
    const { bytes, pdf, excel } = decodeShortcut(t);
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
    dup: false,
    dis: true,
    mode: "all",
    sort: "brand",
    ...s.stockFilters,
    ...(s.stockFilters?.revision === 2
      ? {}
      : { limit: 20, mode: "all", sort: "brand", keg: true, bib: true }),
    revision: 2,
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
    stockSummary() +
    stockChanges() +
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
  $("stocksummary").innerHTML = stockSummary() + stockChanges();
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
  let f = stockPrefs();
  return (s.stockReport?.rows || [])
    .filter(
      (r) =>
        (f.keg || !r.keg) &&
        (f.bib || !r.bib) &&
        (!f.dis || !productInfo(r.name).discontinued),
    )
    .map((r) => ({ ...r, cat: r.bib ? "BIB" : r.keg ? "KEG" : r.cat }));
}
function stockChanges() {
  const history = s.stockHistory || [],
    current = s.stockReport;
  if (!current) return "";
  const reports = history.length
    ? history
    : s.stockPrevious
      ? [s.stockPrevious]
      : [];
  if (!reports.length) return "";
  const idx = Math.min(
      stockCompareIndex ?? reports.length - 1,
      reports.length - 1,
    ),
    old = reports[idx];
  const key = (r) =>
    r.name.toLowerCase().replace(/,/g, ".").replace(/\s+/g, " ").trim();
  const a = new Map(old.rows.map((r) => [key(r), r])),
    b = new Map(current.rows.map((r) => [key(r), r]));
  const changes = [];
  for (const [k, r] of b) {
    const p = a.get(k);
    if (!p) changes.push([r, "Новая строка · " + fmt(r.qty) + " шт."]);
    else if (r.qty !== p.qty) {
      const d = r.qty - p.qty;
      changes.push([
        r,
        (d > 0 ? "+" : "") +
          fmt(d) +
          " шт. · " +
          (d > 0 ? "+" : "−") +
          Math.floor(Math.abs(d) / r.pack) +
          " уп. + " +
          fmt(Math.abs(d) % r.pack) +
          " шт.",
      ]);
    }
  }
  for (const [k, r] of a)
    if (!b.has(k))
      changes.push([r, "Нет строки в новом отчёте · остаток неизвестен"]);
  return (
    '<section><h3>История остатков</h3><label>Сравнить с отчётом</label><select onchange="stockCompareIndex=+this.value;refreshStock()">' +
    reports
      .map(
        (r, i) =>
          '<option value="' +
          i +
          '" ' +
          (i === idx ? "selected" : "") +
          ">" +
          esc(r.name) +
          " · " +
          esc(new Date(r.date).toLocaleString("ru-RU")) +
          "</option>",
      )
      .join("") +
    "</select><details><summary>Изменения: " +
    changes.length +
    "</summary>" +
    changes
      .map(
        ([r, t]) =>
          '<div class="task">' +
          esc(r.name) +
          "<br><small>" +
          esc(t) +
          "</small></div>",
      )
      .join("") +
    "</details><small>Рост остатка не доказывает поступление, снижение не доказывает продажу.</small></section>"
  );
}
let stockCompareIndex = null;
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
      ["FLASH", "CSD", "LIPTON", "BEER", "KEG", "BIB"].indexOf(a.cat) -
      ["FLASH", "CSD", "LIPTON", "BEER", "KEG", "BIB"].indexOf(b.cat),
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
                BEER: "Пиво",
                KEG: "Кеги",
                BIB: "Сиропы BIB",
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
          fmt(r.keg || r.cat === "BIB" ? r.qty : Math.floor(r.qty / r.pack)) +
          "</strong><small> " +
          (r.keg ? "кег" : r.cat === "BIB" ? "BIB" : "уп.") +
          "</small></div>" +
          (r.keg || r.cat === "BIB"
            ? ""
            : "<div><strong>" +
              fmt(r.qty % r.pack) +
              "</strong><small> шт. россыпью</small></div>") +
          "</div><small>" +
          (r.keg || r.cat === "BIB" ? "" : r.pack + " шт. в упаковке") +
          (delta === null
            ? ""
            : " · Δ " +
              (delta > 0 ? "+" : "") +
              fmt(delta) +
              (r.keg ? " кег" : r.cat === "BIB" ? " BIB" : " шт.")) +
          "</small></section>"
        );
      })
      .join("") +
    (rows.length
      ? ""
      : "<section>Нет товаров по выбранным фильтрам</section>") +
    "<small>Пустое количество в строке товара считается нулём. Отсутствующие строки не считаются нулевыми.</small>"
  );
}
function parseStock(lines) {
  const rows = [],
    seen = new Set();
  for (const line of lines) {
    const m = line
      .trim()
      .match(
        /^(.*?),\s*(бан|бут\.?|кега|кег|шт\.?|can|bottle)(?:\s+(-?[\d \u00a0\u202f]+)(?:[,.](\d{1,3}))?)?\s*$/i,
      );
    if (!m) continue;
    const name = m[1].trim(),
      info = productInfo(name),
      qty = m[3]
        ? Number(m[3].replace(/\s/g, "")) + (m[4] ? Number("0." + m[4]) : 0)
        : 0;
    if (!Number.isFinite(qty) || qty < 0 || info.pack < 1)
      throw Error("Некорректное количество товара");
    const row = {
      name,
      qty,
      pack: info.pack,
      cat: info.cat,
      keg: /кег|keg/i.test(m[2]) || info.keg,
      bib: info.bib,
      volume: info.volume,
    };
    row.id = stockKey(row);
    if (seen.has(row.id)) throw Error("Повторяющаяся строка товара в отчёте");
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
}
function stockSignature(rows) {
  return JSON.stringify(
    rows
      .map((r) => [stockKey(r), r.qty, r.pack, Boolean(r.keg), Boolean(r.bib)])
      .sort((a, b) => a[0].localeCompare(b[0])),
  );
}
async function loadStock(file) {
  const status = $("stockstatus");
  if (status) status.textContent = "Читаю отчёт…";
  try {
    const data = await checkedBytes(file);
    let lines = [];
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
      const pdfjs = await import(
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs"
      );
      pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
      const pdf = await pdfjs.getDocument({
        data: new Uint8Array(data),
        isEvalSupported: false,
      }).promise;
      try {
        if (pdf.numPages > 100) throw Error("Слишком много страниц");
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i),
            tc = await page.getTextContent(),
            groups = [];
          for (const item of tc.items) {
            if (!item.str?.trim()) continue;
            let g = groups.find((g) => Math.abs(g.y - item.transform[5]) < 2);
            if (!g) {
              g = { y: item.transform[5], items: [] };
              groups.push(g);
            }
            g.items.push(item);
          }
          for (const g of groups.sort((a, b) => b.y - a.y))
            lines.push(
              g.items
                .sort((a, b) => a.transform[4] - b.transform[4])
                .map((x) => x.str)
                .join(" "),
            );
        }
      } finally {
        await pdf.destroy();
      }
    } else if (/\.(txt|csv)$/i.test(file.name) || file.type === "text/plain")
      lines = new TextDecoder().decode(data).split(/\r?\n/);
    else throw Error("Выберите складской PDF или TXT");
    const rows = parseStock(lines);
    if (!rows.length)
      throw Error(
        "Не найдены строки остатков. Нужен складской отчёт с текстовым слоем.",
      );
    if (
      s.stockReport &&
      stockSignature(s.stockReport.rows) === stockSignature(rows)
    ) {
      if (status)
        status.textContent = "Этот отчёт уже загружен. Остатки не задвоены.";
      return;
    }
    const dm = file.name.match(/(\d{2})\.(\d{2})\.(20\d{2})/),
      sourceDate = dm ? dm[3] + "-" + dm[2] + "-" + dm[1] : null;
    if (
      sourceDate &&
      s.stockReport?.sourceDate &&
      sourceDate < s.stockReport.sourceDate &&
      !confirm("Дата склада раньше текущего отчёта. Заменить остатки?")
    )
      return;
    const report = {
      name: file.name,
      rows,
      date: new Date().toISOString(),
      sourceDate,
    };
    if (
      !commitState({
        ...s,
        stockPrevious: s.stockReport || s.stockPrevious,
        stockHistory: s.stockReport
          ? [...(s.stockHistory || []), s.stockReport]
          : s.stockHistory || [],
        stockReport: report,
      })
    )
      throw Error("Импорт не сохранён");
    if (tab === 4) {
      render();
      $("stockstatus").textContent = "Распознано позиций: " + rows.length;
    }
  } catch (e) {
    if (status) status.textContent = "Ошибка: " + e.message;
    else alert("Ошибка: " + e.message);
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
let clientEditIndex =
  Number.isInteger(restoredUI.client) &&
  s.clients[restoredUI.client]?.a === restoredUI.clientName
    ? restoredUI.client
    : null;
function clientOpen(i) {
  clientEditIndex = i;
  render();
  window.scrollTo(0, 0);
}
function clientSettings() {
  const x = s.clients[clientEditIndex],
    r = { name: x.a, address: x.b || "" };
  const { t, fm } = resolveShop(r);
  return (
    '<section><button onclick="clientEditIndex=null;render()">← Клиенты</button><h2>' +
    esc(x.a) +
    "</h2><p>" +
    esc(x.b) +
    "</p>" +
    fitAdvice(r, t, fm, null) +
    '<label>Заметка</label><textarea id="clientmemo">' +
    esc(routeGetNote(r)) +
    '</textarea><button onclick="clientSaveNote()">Сохранить заметку</button></section>'
  );
}
function clientSaveNote() {
  const x = s.clients[clientEditIndex];
  s.routeNotes ??= {};
  s.routeNotes[noteKey({ name: x.a, address: x.b || "" })] =
    $("clientmemo").value.trim();
  save();
  render();
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
          '<br><button onclick="clientOpen(' +
          i +
          ")\">Настройки точки</button> <button onclick=\"del('clients'," +
          i +
          ')">Удалить</button></div>',
      )
      .join("") || "Нет записей"
  );
}
function filterClients(q) {
  $("clientlist").innerHTML = clientRows(q);
}
function parseClientsCSV(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === ";" || c === "\n" || c === "\r")) {
      row.push(cell.trim());
      cell = "";
      if (c !== ";") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (c === "\r" && text[i + 1] === "\n") i++;
      }
    } else cell += c;
  }
  if (quoted) throw Error("Незакрытая кавычка в CSV");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  const data = rows.filter((r) => !/^название$/i.test(r[0]));
  if (
    !data.length ||
    data.length > 10000 ||
    data.some((r) => r.length < 2 || r.length > 3 || !r[0])
  )
    throw Error("Ожидается CSV: название; адрес; ИП (до 10 000 строк)");
  return data.map(([a, address, ip]) => ({
    a,
    b: address + (ip ? " · " + ip : ""),
  }));
}
async function importClients() {
  const f = $("clientfile").files[0];
  if (!f) return alert("Выберите файл");
  try {
    if (f.size > 5 * 1024 * 1024) throw Error("CSV превышает 5 МБ");
    const rows = parseClientsCSV(await f.text()),
      clients = [...s.clients];
    let n = 0;
    for (const row of rows) {
      if (
        !clients.some(
          (r) =>
            r.a.trim().toLowerCase() === row.a.toLowerCase() &&
            r.b.trim().toLowerCase() === row.b.toLowerCase(),
        )
      ) {
        clients.push({ ...row, date: new Date().toLocaleDateString("ru-RU") });
        n++;
      }
    }
    if (!commitState({ ...s, clients }))
      throw Error("Не удалось сохранить клиентскую базу");
    render();
    alert("Добавлено: " + n);
  } catch (e) {
    alert("Ошибка импорта: " + e.message);
  }
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
async function backup() {
  try {
    rememberView();
    persistUI();
    const value = {
      ...s,
      backupVersion: 3,
      appVersion: APP_VERSION,
      uiState: readUI(),
      documents: await exportDocuments(),
    };
    const data = JSON.stringify(value, null, 2);
    if (new Blob([data]).size > 100 * 1024 * 1024)
      throw Error("Размер копии больше 100 МБ");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([data], { type: "application/json" }),
    );
    link.download = "mix-backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } catch (e) {
    alert("Не удалось экспортировать копию: " + e.message);
  }
}
function routeDate() {
  return (
    (typeof activeVisit !== "undefined" ? activeVisit?.day : null) ||
    s.routeDay ||
    new Date().toLocaleDateString("sv-SE")
  );
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
function routeMatch(rows, name, address = "", id = "") {
  const linked =
    normalizeId(id) ||
    normalizeId(
      s.fitLinks?.[routeNorm(name, true) + "|" + routeNorm(address, true)],
    );
  if (linked) {
    const hits = rows.filter((t) => normalizeId(t.id) === linked);
    return hits.length === 1 ? hits[0] : null;
  }
  let candidates = rows.filter((t) => routeNorm(t.name) === routeNorm(name));
  if (address) {
    const hits = candidates.filter((t) => sameAddress(shopAddress(t), address));
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) return null;
    // An address can resolve name formatting differences, but never an ambiguous address.
    const addressHits = rows.filter((t) =>
      sameAddress(shopAddress(t), address),
    );
    if (addressHits.length === 1) return addressHits[0];
    if (candidates.some((t) => shopAddress(t))) return null;
  }
  const exact = candidates.filter(
    (t) => routeNorm(t.name, true) === routeNorm(name, true),
  );
  if (exact.length === 1) return exact[0];
  return candidates.length === 1 ? candidates[0] : null;
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

let routeFilter = restoredUI.routeFilter || "all",
  routeQuery =
    typeof restoredUI.routeQuery === "string" ? restoredUI.routeQuery : "";
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
let activeVisit = s.activeVisit || restoredUI.visit || null;
function visitStart(i) {
  const day = routeDate(),
    r = routeRows(day)[i];
  if (!r) return;
  const { t, fm } = resolveShop(r),
    key = fitKey(r, t || fm);
  s.fitChecks ??= {};
  const checkKey = shelfHistoryKey(key, day);
  if (!s.fitChecks[checkKey])
    s.fitChecks[checkKey] = { ...fitSnapshot(key, day, s.fitChecks) };
  activeVisit = {
    day,
    i,
    key: routeKey(r),
    shopKey: key,
    id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
    startedAt: new Date().toISOString(),
  };
  persistVisit();
  render();
  window.scrollTo(0, 0);
}
function visitCurrent() {
  if (
    !activeVisit ||
    !validDate(activeVisit.day) ||
    typeof activeVisit.key !== "string"
  )
    return null;
  const i = routeRows(activeVisit.day).findIndex(
    (r) => routeKey(r) === activeVisit.key,
  );
  if (i < 0) return null;
  activeVisit.i = i;
  return activeVisit;
}
function visitEnd(value) {
  const a = visitCurrent();
  if (a) {
    const row = routeRows(a.day)[a.i],
      shop =
        a.shopKey || fitKey(row, resolveShop(row).t || resolveShop(row).fm);
    s.visitHistory ??= [];
    s.visitHistory.push({
      ...structuredClone(a),
      endedAt: new Date().toISOString(),
      status: value || row.status || "Не посещено",
      checks: structuredClone(fitSnapshot(shop, a.day, s.fitChecks)),
    });
    if (value) {
      s.routes ??= {};
      s.routes[a.day] ??= routeRows(a.day);
      s.routes[a.day][a.i].status = value;
    }
  }
  activeVisit = null;
  s.activeVisit = null;
  save();
  render();
  window.scrollTo(0, 0);
}
function routeCards() {
  let rows = routeRows(routeDate()),
    fit = s.detail?.fit || [],
    shops = s.detail?.shops || [];
  return (
    rows
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) => {
        if (visitCurrent()) return i === activeVisit.i;
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
        let { t, fm } = resolveShop(r),
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
              : '<span class="rtgreen">Все группы были отмечены в отчёте</span>'
            : "<small>Нет однозначных данных</small>") +
          "</div></div>" +
          (visitCurrent()
            ? fitAdvice(r, t, fm, i)
            : '<button onclick="visitStart(' + i + ')">Начать визит</button>') +
          '<details class="rtdetails"><summary>Заметка и действия' +
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
  if (visitCurrent())
    return (
      '<div class="pagehead">Активный визит</div><section><button onclick="visitEnd()">← К маршруту</button></section><div id="routeCards">' +
      routeCards() +
      "</div><section><h3>Завершить визит</h3><button onclick=\"visitEnd('Посещено')\">Посещено</button> <button onclick=\"visitEnd('Без заказа')\">Без заказа</button> <button onclick=\"visitEnd('Закрыто')\">Закрыто</button></section>"
    );
  activeVisit = null;
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
function noteKey(r) {
  const key = canonicalShelfKey(routeKey(r));
  if (key.startsWith("shop:")) return key;
  const same = s.clients.filter(
    (x) =>
      String(x.a).trim().toLowerCase() === String(r.name).trim().toLowerCase(),
  );
  if (same.length === 1 && (!r.address || r.address === same[0].b))
    return routeKey({ name: same[0].a, address: same[0].b });
  return routeKey(r);
}
function routeGetNote(r) {
  const key = noteKey(r),
    notes = s.routeNotes || {};
  for (const candidate of [key, routeKey(r), routeNoteKey(r)])
    if (Object.hasOwn(notes, candidate)) return notes[candidate];
  const aliases = Object.keys(notes).filter((k) => {
    const [name, address = ""] = k.split("\u001f");
    return k.includes("\u001f") && noteKey({ name, address }) === key;
  });
  return aliases.length === 1 ? notes[aliases[0]] : "";
}
function routeNote(i, v) {
  let r = routeRows(routeDate())[i];
  if (!r) return;
  s.routeNotes ??= {};
  let k = noteKey(r);
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
  let doc = new DOMParser().parseFromString(safeReportHTML(html), "text/html"),
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
    '<div class="pagehead">Продажи и прогноз</div><section><h3>Monolit · ежедневные отчёты</h3><input type="file" accept=".html,.htm" onchange="if(this.files[0])loadMonolitFile(this.files[0])"><button onclick="importShortcut()">Из буфера WhatsApp</button><textarea id="shortcutpaste" placeholder="Вставьте Base64"></textarea><button onclick="importShortcut(true)">Обработать</button><p id="shortcutstatus"></p><label>Дата утренней детализации (подтвердите после загрузки KPI)</label><input type="date" value="' +
    esc(d) +
    '" onchange="s.forecastDate=this.value;save();render()"><small>Период KPI: ' +
    esc(s.detail?.period || "не загружен") +
    ". Условный сценарий: отгрузка +1 день, детализация +2 дня. Это допущение прогноза, а не подтверждённое правило KPI. Sell-in включён в объём Monolit.</small>" +
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
  s.weekRoute = {};
  save();
}

function homeRoute() {
  delete s.routeDay;
  routeFilter = "all";
  routeQuery = "";
  save();
  go(10);
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
          "</b><br><small>По прошлой детализации проверить Flash: " +
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
  const lip = (taste, v) => {
    const aliases = {
      манго: "(?:манго|mango)",
      персик: "(?:персик|peach)",
      лимон: "(?:лимон|lemon)",
      малина: "(?:малин|raspberry)",
    };
    const volume = v === "1[.,]0" ? "1(?:[.,]0)?" : v;
    return new RegExp(
      "(?=.*(?:lipton|липтон))(?=.*" +
        (aliases[taste] || taste) +
        ")(?=.*(?:^|[^\\d.,])" +
        volume +
        "(?=\\s*(?:л|l|литр|[*×xх]|$)))",
      "i",
    );
  };
  const flash = [
    item("Flash Ultra 0,43 / 0,45 л", /flash.*ultra.*0[.,]4[35]/i),
    item(
      "Flash Classic 0,43 / 0,45 л",
      /flash.*energy(?!.*(?:ultra|bubble|exotic|mojito|pomegranate|night|peach|morning|berry|tropical|mango|apple)).*0[.,]4[35]/i,
    ),
    item("Flash Ultra 0,25 л", /flash.*ultra.*0[.,]25/i),
    item("Два дополнительных вкуса Flash", /flash/i, 2),
  ];
  if (type === "pepsi" || type === "flex") {
    add("csd", "CSD", 11, 40, [
      ...["2[.,]0", "1[.,]0", "0[.,]5", "0[.,]45"].map((v, i) =>
        item(
          ["Pepsi 2 л", "Pepsi 1 л", "Pepsi 0,5 л", "Pepsi 0,45 л"][i],
          pepsi(v),
        ),
      ),
      item("Mirinda 1 л", /mirinda.*1(?:[.,]0)?\s*(?:л|l|\*)/i),
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
      {
        ...item("Pepsi Zero · объём уточнить", /pepsi.*zero.*0[.,](?:5|45)/i),
        unconfirmed: true,
      },
      item("7UP 0,45 л", /7up.*0[.,]45/i),
      {
        ...item("Mirinda · объём уточнить", /mirinda.*0[.,](?:5|45)/i),
        unconfirmed: true,
      },
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
      item("Большая Кружка Мягкое 0,43 л", /большая кружка.*мягк.*0[.,]43/i),
      item("Жатецкий Гусь крепкое 0,43 л", /жатецкий.*крепкое.*0[.,]43/i),
      item("Жатецкий Гусь экспортное 0,43 л", /жатецкий.*экспортное.*0[.,]43/i),
      item(
        "Жатецкий Гусь классический 0,43 л",
        /жатецкий гусь(?!.*(?:new year|крепк|экспорт|мягк|№0|пшенич|светл)).*бан.*0[.,]43/i,
      ),
      item(
        "Карлсберг банка 0,43 / 0,45 л",
        /(?:carlsberg|карлсберг)(?!.*(?:безалкоголь|0[.,]0)).*(?:бан|can).*0[.,]4[35]/i,
      ),
      item(
        "Хольстен Light банка 0,43 л",
        /(?:holsten|хольстен).*light.*бан.*0[.,]43/i,
      ),
    ]);
    add("afb", "AFB", 3, beer === "yes" ? 11 : 5, [
      item("Жатецкий Гусь №0", /жатецкий.*№0/i),
    ]);
    if (beer === "yes") {
      add("npd", "NPD", 2, 15, [
        item(
          "Garage Raspberry Currant",
          /(?=.*garage)(?=.*raspberry.*currant)(?=.*(?:бут|glass|bottle))/i,
        ),
        item(
          "Garage Hardcore Soju",
          /(?=.*garage)(?=.*soju)(?=.*(?:бан|can))/i,
        ),
      ]);
      add("focusBeer", "Beer Focus", 1, 20, [
        item(
          "Carlsberg бутылка",
          /(?:carlsberg|карлсберг)(?!.*(?:0[.,]0|безалкоголь)).*бут/i,
        ),
        item("Holsten Light бутылка", /(?:holsten|хольстен).*light.*бут/i),
        item("1664 Blanc бутылка", /(?:1664|кроненбург|kronenbourg).*бут/i),
        item("Garage Black Cherry 0,4 л", /garage.*black cherry.*бут/i),
        item("1664 Blanc банка", /(?:1664|кроненбург|kronenbourg).*бан/i),
        item(
          "Holsten Premium банка",
          /(?:holsten|хольстен).*(?:premium|pilsener|pilsner|пилс|премиум).*бан/i,
        ),
        item("Garage Hardcore Mango 0,43 л", /garage.*mango.*бан/i),
        item(
          "Жатецкий Гусь мягкое банка",
          /(?:жатецкий|zatecky).*(?:мягк|myagk).*бан/i,
        ),
        item("Somersby Blackberry 0,43 л", /somersby.*blackberry/i),
        item(
          "Holsten Premium бутылка",
          /(?:holsten|хольстен).*(?:premium|pilsener|pilsner|пилс|премиум).*бут/i,
        ),
      ]);
    }
  }
  return rules.map((g) => ({
    ...g,
    items: g.items.map((x) => {
      const p = productInfo(x.label);
      return {
        ...x,
        brand: p.brand || null,
        flavor: x.count > 1 ? null : p.flavor || null,
        volume: x.count > 1 || x.label.includes("/") ? null : p.volume,
        container: p.container || null,
        flavors: x.count > 1 && x.label.includes("дополнительных"),
      };
    }),
  }));
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
    const regional = group.key === "focusBeer" && /региональн/.test(item.label);
    const have = regional
        ? 0
        : new Set(seen.filter((n) => item.re.test(n)).map(skuKey)).size,
      need = Math.max(0, item.count - have);
    if (!need) return [];
    const names = known.filter(
      (n) => item.re.test(n) && !seen.some((h) => skuKey(h) === skuKey(n)),
    );
    const candidates = stock
      .filter((r) => item.re.test(r.name))
      .sort((a, b) => b.qty - a.qty);
    return [
      {
        name:
          item.count > 1
            ? item.label + " · не хватает " + need + " SKU"
            : names[0] || item.label,
        label: item.label,
        known: names.length > 0,
        stocks: candidates.slice(0, 5),
        need,
        choices:
          item.count > 1
            ? candidates.filter(
                (r) =>
                  r.qty > 0 && !seen.some((h) => skuKey(h) === skuKey(r.name)),
              )
            : [],
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
    if (el.dataset.fitKey === key) {
      el.open = true;
      if (k === "counts") {
        const d = el.querySelector("details");
        if (d) d.open = true;
      }
    }
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
function fitEquipmentCount(key, k, v) {
  const eq = s.fitEquipment?.[key] || {};
  const counts = { ...(eq.counts || {}) };
  if (v === "") delete counts[k];
  else counts[k] = Math.max(0, Math.min(4, Math.floor(Number(v) || 0)));
  fitSetKey(key, "counts", counts);
}
function fitCountsUI(key, eq) {
  const counts = eq.counts || {};
  return (
    "<details><summary>Количество холодильников и состояние</summary><p><small>Не проверено — неизвестно. Нет — подтверждено отсутствие. Ремонт отдельно.</small></p>" +
    [
      ["beer1", "Пиво 1Д"],
      ["beer2", "Пиво 2Д"],
      ["pepsi1", "Pepsi 1Д"],
      ["pepsi2", "Pepsi 2Д"],
      ["flex", "Flex 400"],
      ["lipton", "Lipton"],
      ["flash", "Flash"],
      ["repair", "В ремонте"],
    ]
      .map(
        ([k, n]) =>
          "<label>" +
          n +
          '</label><select onchange="fitEquipmentCount(' +
          esc(JSON.stringify(key)) +
          ",&quot;" +
          k +
          '&quot;,this.value)">' +
          [
            ["", "Не проверено"],
            ["0", "Нет"],
            ...Array.from({ length: 4 }, (_, i) => [
              String(i + 1),
              String(i + 1) + " шт.",
            ]),
          ]
            .map(
              ([v, l]) =>
                '<option value="' +
                v +
                '" ' +
                (String(counts[k] ?? "") === v ? "selected" : "") +
                ">" +
                l +
                "</option>",
            )
            .join("") +
          "</select>",
      )
      .join("") +
    "<p><small>Количество — инвентаризация. Для правил FIT подтвердите типы в списках выше.</small></p></details>"
  );
}

function fitLink(name, address, id) {
  const old = routeKey({ name, address });
  s.fitLinks ??= {};
  const key = routeNorm(name, true) + "|" + routeNorm(address, true);
  if (id) {
    s.fitLinks[key] = id;
    s.fitEquipment ??= {};
    if (s.fitEquipment[old] && !s.fitEquipment["shop:" + id])
      s.fitEquipment["shop:" + id] = { ...s.fitEquipment[old] };
  } else delete s.fitLinks[key];
  save();
  render();
}
function fitFacing(g, label, type, beerDoors) {
  const l = label.toLowerCase();
  if (g.key === "national") {
    if (beerDoors === "none") return "OSA";
    const n =
      beerDoors === "1d"
        ? [4, 2, 3, 4, 1, 2]
        : beerDoors === "2d"
          ? [6, 3, 4, 7, 2, 3]
          : null;
    if (!n) return "";
    const i = [
      "большая",
      "крепкое",
      "экспортное",
      "классический",
      "карлсберг",
      "хольстен",
    ].findIndex((x) => l.includes(x));
    return i < 0 ? "" : n[i] + " фейс.";
  }
  if (g.key === "csd" || g.key === "lipton") {
    if (type === "flash" || type === "none") return "OSA";
    if (g.key === "lipton") return "1 фейс";
    if (l === "pepsi 1 л") return (type === "flex" ? 4 : 6) + " фейс.";
    if (l === "pepsi 0,5 л") return "3 фейс.";
    return "1 фейс";
  }
  if (g.key === "flash") {
    if (type === "none") return "2 SKU по OSA";
    if (l.includes("дополнительных")) return "2 SKU × 1 фейс";
    return l.includes("ultra") && !l.includes("0,25") ? "2 фейс." : "1 фейс";
  }
  return "";
}
function canonicalShelfKey(key) {
  if (String(key).startsWith("shop:")) return key;
  const [name, address = ""] = String(key).split("\u001f");
  const { t, fm } = resolveShop({ name, address });
  return fitKey({ name, address }, t || fm);
}
function fitPrevious(key, day, store) {
  let best = null;
  for (const [record, checks] of Object.entries(store || {})) {
    let pair;
    try {
      pair = JSON.parse(record);
    } catch {
      continue;
    }
    if (
      Array.isArray(pair) &&
      canonicalShelfKey(pair[0]) === key &&
      validDate(pair[1]) &&
      pair[1] < day &&
      (!best || pair[1] > best.day)
    )
      best = { day: pair[1], checks };
  }
  return best;
}
function fitSnapshot(key, day, store) {
  const exact = store?.[shelfHistoryKey(key, day)];
  if (exact !== undefined) return exact;
  const legacy = Object.entries(store || {}).find(([record]) => {
    try {
      const pair = JSON.parse(record);
      return pair[1] === day && canonicalShelfKey(pair[0]) === key;
    } catch {
      return false;
    }
  });
  return legacy?.[1] ?? fitPrevious(key, day, store)?.checks ?? {};
}
function fitCheck(key, day, sku, value) {
  if (!validDate(day) || !["yes", "no", ""].includes(value)) return;
  s.fitChecks ??= {};
  const k = shelfHistoryKey(key, day);
  const next = { ...fitSnapshot(key, day, s.fitChecks) };
  if (value === "") delete next[sku];
  else next[sku] = value;
  if (!commitState({ ...s, fitChecks: { ...s.fitChecks, [k]: next } })) return;
  render();
}
function fitCheckButtons(key, day, sku) {
  return (
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0">' +
    [
      ["yes", "✓ Есть", "#166534"],
      ["no", "✕ Нет", "#991b1b"],
    ]
      .map(
        ([v, l, bg]) =>
          '<button type="button" style="background:' +
          bg +
          ';color:white;min-height:44px" onclick="fitCheck(' +
          [key, day, sku, v].map((x) => esc(JSON.stringify(x))).join(",") +
          ')">' +
          l +
          "</button>",
      )
      .join("") +
    "</div>"
  );
}
function fitCheckedRow(key, day, x) {
  return (
    '<div style="display:flex;align-items:center;gap:8px;padding:8px 0"><span style="flex:1">' +
    esc(x.name) +
    '</span><button class="secondary" type="button" onclick="fitCheck(' +
    [key, day, x.sku, ""].map((v) => esc(JSON.stringify(v))).join(",") +
    ')">Отменить</button></div>'
  );
}
function fitOrderList(key, day, order) {
  const groups = {};
  for (const row of order) (groups[row.brand] ??= []).push(row);
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b, "ru"))
    .map(
      ([brand, rows]) =>
        '<div class="order-brand"><b>' +
        esc(brand) +
        "</b>" +
        rows
          .map(
            (row) =>
              '<div class="order-row"><span>' +
              esc(compactProduct(row.name)) +
              '</span><button type="button" aria-label="Вернуть в проверку" onclick="fitCheck(' +
              [key, day, row.sku, ""]
                .map((v) => esc(JSON.stringify(v)))
                .join(",") +
              ')">↶</button></div>',
          )
          .join("") +
        "</div>",
    )
    .join("");
}
function compactProduct(name) {
  const p = productInfo(name),
    flavor =
      {
        lemon: "Лимон",
        peach: "Персик",
        raspberry: "Малина",
        mango: p.brand === "Garage" ? "Hardcore Mango" : "Манго и маракуйя",
        "raspberry currant": "Hard Raspberry Currant",
        "black cherry": "Hard Black Cherry",
        soju: "Hardcore Soju",
        blackberry: "Blackberry",
        "strawberry kiwi": "Strawberry-Kiwi",
        light: "Light",
        pilsener: "Pilsener",
        blanc: "Blanc",
        zero: "Безалкогольное",
      }[p.flavor] ||
      flashFlavorLabel(p.flavor) ||
      (p.brand === "Pepsi" ? "Cola" : p.brand || name);
  return (
    flavor +
    (p.volume ? " · " + String(p.volume).replace(".", ",") + " л" : "") +
    (p.container
      ? " · " +
        ({ can: "банка", bottle: "бутылка", pet: "PET" }[p.container] ||
          p.container)
      : "") +
    " · " +
    p.pack +
    " шт./уп."
  );
}
function fitOrderBrand(name) {
  return (
    [
      /большая кружка/i,
      /жатецкий|zatecky/i,
      /carlsberg|карлсберг/i,
      /holsten|хольстен/i,
      /garage/i,
      /somersby/i,
      /1664|кроненбург/i,
      /pepsi/i,
      /7up/i,
      /mirinda/i,
      /lipton/i,
      /flash/i,
    ]
      .map((re, i) =>
        re.test(name)
          ? [
              "Большая Кружка",
              "Жатецкий Гусь",
              "Carlsberg",
              "Holsten",
              "Garage",
              "Somersby",
              "1664 Blanc",
              "Pepsi",
              "7UP",
              "Mirinda",
              "Lipton",
              "Flash",
            ][i]
          : null,
      )
      .find(Boolean) || "Другие"
  );
}
function fitAdvice(r, t, fm, i) {
  if (!t && fm)
    t =
      (s.detail?.shops || []).find(
        (x) => normalizeId(x.id) === normalizeId(fm.id),
      ) || null;
  const key = fitKey(r, t || fm),
    eq =
      s.fitEquipment?.[key] ||
      s.fitEquipment?.[routeKey(r)] ||
      fitLegacyEquipment(r),
    { non, beerDoors, flashHO, type, beer } = equipmentModes(eq),
    day = i === null ? new Date().toLocaleDateString("sv-SE") : routeDate(),
    valid = s.detail?.period === day.slice(5, 7) + "." + day.slice(0, 4);
  const select = (field, options, value) =>
    "<label>" +
    { non: "ХО NonAlco", beer: "Пивное ХО", flash: "Отдельное ХО Flash" }[
      field
    ] +
    '</label><select onchange="fitSetKey(' +
    esc(JSON.stringify(key)) +
    ",&quot;" +
    field +
    '&quot;,this.value)">' +
    options
      .map(
        ([v, text]) =>
          '<option value="' +
          v +
          '" ' +
          (v === value ? "selected" : "") +
          ">" +
          text +
          "</option>",
      )
      .join("") +
    "</select>";
  const equipment =
    '<details data-panel="equipment"><summary>Настроить оборудование</summary>' +
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
    select(
      "flash",
      [
        ["", "Не определено"],
        ["yes", "Есть"],
        ["none", "Нет"],
      ],
      flashHO,
    ) +
    fitCountsUI(key, eq) +
    "</details>";
  let header =
    '<details data-fit-key="' +
    esc(key) +
    '" open><summary>FIT · рекомендации Urban</summary><small>Матрица: ' +
    esc(matrixText(t, fm)) +
    "</small>";
  if (!t && !fm) {
    const opts = [
      ...new Map(
        [...(s.detail?.shops || []), ...(s.detail?.fit || [])]
          .filter((x) => x.id)
          .map((x) => [normalizeId(x.id), x]),
      ).values(),
    ];
    header +=
      '<p>Точка не сопоставлена. Выберите строку отчёта:</p><select aria-label="Сопоставить точку" onchange="fitLink(' +
      esc(JSON.stringify(r.name)) +
      "," +
      esc(JSON.stringify(r.address || "")) +
      ',this.value)"><option value="">Выберите ТТ</option>' +
      opts
        .map(
          (x) =>
            '<option value="' +
            esc(normalizeId(x.id)) +
            '">' +
            esc(x.name) +
            "</option>",
        )
        .join("") +
      "</select>";
  }
  if (!valid)
    return (
      header +
      "<p>Нужна детализация за месяц выбранной даты.</p>" +
      equipment +
      "</details>"
    );
  const groups = fitRules(type, beer);
  for (const g of groups)
    if (g.key === "focusBeer") {
      if (beerDoors === "1d") g.items = g.items.slice(0, 9);
      else if (beerDoors === "2d")
        g.items.push({
          label: "Somersby Strawberry-Kiwi 0,43 л",
          re: /somersby.*strawberry.*kiwi/i,
          brand: "Somersby",
          flavor: "strawberry kiwi",
          volume: 0.43,
          count: 1,
        });
    }
  const model = fitModel(key, day, groups),
    previous = fitPrevious(key, day, s.fitChecks);
  let h =
    '<section data-order-key="' +
    esc(key) +
    '"><h3>Рекомендации к заказу · ' +
    model.order.length +
    "</h3>" +
    (model.order.length
      ? fitOrderList(key, day, model.order)
      : "<small>Отметьте отсутствующие товары в проверке.</small>") +
    (model.blocked.length
      ? '<details data-panel="blocked"><summary>Отсутствуют · требуют уточнения (' +
        model.blocked.length +
        ")</summary>" +
        model.blocked
          .map((x) =>
            fitCheckedRow(key, day, { ...x, name: x.name + " · " + x.reason }),
          )
          .join("") +
        "</details>"
      : "") +
    (model.present.length
      ? '<details data-panel="present"><summary>Есть в точке (' +
        model.present.length +
        ")</summary>" +
        model.present.map((x) => fitCheckedRow(key, day, x)).join("") +
        "</details>"
      : "") +
    "</section>";
  h +=
    header +
    "<p><small>URBAN · Жезказган. SKU и баллы из детализации — история, наличие проверяется во время визита.</small></p>";
  if (previous && !s.fitChecks?.[shelfHistoryKey(key, day)])
    h +=
      "<p><small>Последние отметки с " +
      esc(previous.day) +
      " перенесены для повторной проверки.</small></p>";
  if (!t)
    h +=
      "<p><small>Точка найдена в FIT, но Sheet4 не содержит для неё матрицу и историю SKU. Оборудование задаётся вручную.</small></p>";
  for (const group of groups) {
    const score = fm?.criteria ? fitCriterion(fm, group) : null,
      rows = model.pending.filter((x) => x.group === group.key);
    h +=
      '<div class="task"><b>' +
      esc(group.label) +
      "</b><br><small>Вес критерия: " +
      group.max +
      "%" +
      (score == null
        ? ""
        : " · предыдущая оценка: " + fmt(score * 100) + " п.п.") +
      "</small>";
    if (group.key === "focusBeer")
      h +=
        "<p><small>Focus: " +
        (beerDoors === "1d"
          ? "9 SKU · отклонение −3"
          : beerDoors === "2d"
            ? "11 SKU"
            : "уточните число дверей") +
        ". Вкусы Жезказгана подтверждены.</small></p>";
    if (group.items.some((x) => x.count > 1))
      h +=
        "<p><small>Два SKU на выбор; для дополнительных вкусов Flash — два разных актуальных вкуса.</small></p>";
    h +=
      rows
        .map(
          (row) =>
            '<div class="shelf-row" data-shelf-sku="' +
            esc(row.sku) +
            '"><b>' +
            esc(row.name) +
            "</b>" +
            (row.unconfirmed
              ? "<small> · обязательность объёмов пока не подтверждена</small>"
              : "") +
            (fitFacing(group, row.name, type, beerDoors)
              ? "<small> · " +
                esc(fitFacing(group, row.name, type, beerDoors)) +
                "</small>"
              : "") +
            fitCheckButtons(key, day, row.sku) +
            "</div>",
        )
        .join("") +
      (rows.length
        ? ""
        : "<p><small>Все позиции проверены. Изменить отметки можно выше.</small></p>") +
      "</div>";
  }
  if (!type || !beer)
    h +=
      "<p><small>Выберите типы ХО: неизвестное оборудование не считается отсутствующим.</small></p>";
  if (beer === "yes")
    h +=
      "<small>Проверьте место ХО, планограмму, заполнение 80%, ценники 70% и FEFO.</small>";
  return h + equipment + "</details>";
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
    if (file.size > 100 * 1024 * 1024) throw Error("Слишком большая копия");
    const parsed = JSON.parse(await file.text()),
      docs = decodeDocuments(parsed.documents);
    delete parsed.documents;
    const v = validateMix(parsed);
    if (
      !confirm(
        "Восстановить данные и документы из копии? Текущее состояние будет сохранено перед восстановлением. Существующие документы останутся на устройстве.",
      )
    )
      return;
    const current = localStorage.getItem("mix-v1");
    if (current !== null) localStorage.setItem("mix-before-restore", current);
    localStorage.setItem("mix-v1", JSON.stringify(v));
    try {
      await restoreDocuments(docs);
    } catch (e) {
      if (current === null) localStorage.removeItem("mix-v1");
      else localStorage.setItem("mix-v1", current);
      throw e;
    }
    s = v;
    storageProblem = "";
    activeVisit = v.activeVisit || null;
    const ui = v.uiState || {};
    tab =
      Number.isInteger(ui.tab) && ui.tab >= 0 && ui.tab <= 10
        ? ui.tab
        : activeVisit
          ? 10
          : 0;
    viewStates = ui.views || {};
    renderedScope = null;
    routeFilter = ui.routeFilter || "all";
    routeQuery = ui.routeQuery || "";
    clientEditIndex =
      Number.isInteger(ui.client) && s.clients[ui.client] ? ui.client : null;
    try {
      sessionStorage.removeItem("mix-ui");
      sessionStorage.removeItem("mix-scroll");
    } catch {}
    routeMigrateNotes();
    render();
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
            !t.criterionHeaders.every(
              (n) => n == null || typeof n === "string",
            ))
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
  validatePilotState(v, fail);
  return {
    ...structuredClone(initial),
    ...v,
    pay: { ...initial.pay, ...v.pay },
  };
}
function validatePilotState(v, fail) {
  const obj = (x) => x && typeof x === "object" && !Array.isArray(x),
    strings = (a) => Array.isArray(a) && a.every((x) => typeof x === "string");
  const report = (r) => {
    if (
      !obj(r) ||
      !Array.isArray(r.kpi) ||
      !Array.isArray(r.shops) ||
      !Array.isArray(r.fit) ||
      !obj(r.visits)
    )
      fail();
    if (
      !r.kpi.every(
        (k) =>
          obj(k) &&
          typeof k.name === "string" &&
          Number.isFinite(k.fact) &&
          Number.isFinite(k.plan),
      )
    )
      fail();
    if (r.skuCatalog && !strings(r.skuCatalog)) fail();
  };
  if (v.detailHistory !== undefined) {
    if (!Array.isArray(v.detailHistory)) fail();
    v.detailHistory.forEach(report);
  }
  if (
    v.stockHistory !== undefined &&
    (!Array.isArray(v.stockHistory) ||
      !v.stockHistory.every(
        (r) =>
          obj(r) &&
          Array.isArray(r.rows) &&
          r.rows.every(
            (x) =>
              obj(x) &&
              typeof x.name === "string" &&
              Number.isFinite(x.qty) &&
              Number.isFinite(x.pack) &&
              x.pack > 0,
          ),
      ))
  )
    fail();
  if (
    v.fitLinks !== undefined &&
    (!obj(v.fitLinks) ||
      Object.values(v.fitLinks).some(
        (id) => typeof id !== "string" && typeof id !== "number",
      ))
  )
    fail();
  if (v.fitChecks !== undefined) {
    if (!obj(v.fitChecks)) fail();
    for (const [key, checks] of Object.entries(v.fitChecks)) {
      let pair;
      try {
        pair = JSON.parse(key);
      } catch {
        fail();
      }
      if (
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        typeof pair[0] !== "string" ||
        !validDate(pair[1]) ||
        !obj(checks) ||
        Object.values(checks).some((x) => x !== "yes" && x !== "no")
      )
        fail();
    }
  }
  const visit = (a) => {
    if (
      !obj(a) ||
      !validDate(a.day) ||
      typeof a.key !== "string" ||
      !Number.isInteger(a.i) ||
      a.i < 0
    )
      fail();
  };
  if (v.activeVisit != null) visit(v.activeVisit);
  if (v.visitHistory !== undefined) {
    if (!Array.isArray(v.visitHistory)) fail();
    v.visitHistory.forEach(visit);
  }
  if (v.uiState !== undefined && !obj(v.uiState)) fail();
  for (const key of ["stockFilters", "detailPrefs"])
    if (v[key]) {
      for (const [field, value] of Object.entries(v[key])) {
        if (
          ["limit", "goal", "days"].includes(field) &&
          (!Number.isFinite(value) || value <= 0)
        )
          fail();
      }
    }
  for (const r of Object.values(v.monolit || {}))
    if (
      !r.rows.every(
        (x) =>
          typeof x.name === "string" &&
          Number.isFinite(x.qty) &&
          Number.isFinite(x.money),
      )
    )
      fail();
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

// Shared identities for the importers, shelf checks and order list.
function productInfo(name) {
  const cached = productCache.get(String(name));
  if (cached) return cached;
  const text = String(name || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/хoльстен/g, "хольстен");
  const packMatch = text.match(
    /(\d+(?:[.,]\d+)?)\s*(?:л|l)?\s*[*×xх]\s*(\d+)/i,
  );
  const volumeMatch =
    packMatch ||
    text.match(
      /(?:бан(?:ка)?\.?|бут\.?|pet|пэт|can|glass|bottle)\s*[, .]*\s*(\d+(?:[.,]\d+)?)/i,
    ) ||
    text.match(/(?:^|[^\d])([0-9]+(?:[.,]\d+)?)\s*(?:л|l)(?:\b|\s|$)/i);
  let volume = volumeMatch ? Number(volumeMatch[1].replace(",", ".")) : null;
  if (!(volume > 0 && volume <= 100)) volume = null;
  const pack = packMatch ? Number(packMatch[2]) : 1;
  const keg = /кег|keg/.test(text),
    bib = /биб|\bbib\b/.test(text);
  const container = keg
    ? "keg"
    : bib
      ? "bib"
      : /пэт|\bpet\b/.test(text)
        ? "pet"
        : /бан|\bcan\b/.test(text)
          ? "can"
          : /бут|glass|bottle/.test(text)
            ? "bottle"
            : "";
  const brand = /flash/.test(text)
    ? "Flash"
    : /lipton|липтон/.test(text)
      ? "Lipton"
      : /holsten|хольстен/.test(text)
        ? "Holsten"
        : /carlsberg|карлсберг/.test(text)
          ? "Carlsberg"
          : /garage/.test(text)
            ? "Garage"
            : /somersby/.test(text)
              ? "Somersby"
              : /pepsi/.test(text)
                ? "Pepsi"
                : /mirinda/.test(text)
                  ? "Mirinda"
                  : /7up/.test(text)
                    ? "7UP"
                    : /жатецкий|zatecky/.test(text)
                      ? "Жатецкий Гусь"
                      : /kronenbourg|кроненбург|1664/.test(text)
                        ? "1664 Blanc"
                        : /большая кружка/.test(text)
                          ? "Большая Кружка"
                          : "";
  let flavor = "";
  const aliases = [
    ["raspberry currant", /raspberry.*currant/],
    ["black cherry", /black.*cherry/],
    ["strawberry kiwi", /strawberry.*kiwi/],
    ["blackberry", /blackberry/],
    ["soju", /soju/],
    ["bubble gum", /bubble.*gum/],
    ["mojito strawberry", /mojito/],
    ["morning cakes", /morning.*cakes/],
    ["pomegranate", /pomegranate/],
    ["exotic", /exotic/],
    ["night movie", /night.*movie/],
    ["peach pineapple", /peach.*pineapple/],
    ["ultra", /ultra/],
    ["mango", /mango|манго/],
    ["raspberry", /raspberry|малин/],
    ["peach", /peach|персик/],
    ["lemon", /lemon|лимон/],
    ["light", /light/],
    ["pilsener", /pilsener|pilsner|пил[сз]|premium|премиум/],
    ["blanc", /blanc|бланк/],
    ["zero", /zero|№\s*0|безалкоголь|\b0[.,]0\b/],
    ["крепкое", /крепк/],
    ["экспортное", /экспорт/],
    ["мягкое", /мягк|myagk/],
  ];
  flavor = aliases.find(([, re]) => re.test(text))?.[0] || "";
  if (brand === "Flash" && !flavor) {
    const extra = text
      .split(/\d+[.,]\d+/)[0]
      .replace(/flash|up|energy|\ble\b|т\/у|бан\.?|can|[, .]/g, "")
      .trim();
    flavor =
      extra && extra !== "classic" && extra !== "original" ? extra : "classic";
  }
  const discontinued =
    brand === "Flash" && ["night movie", "peach pineapple"].includes(flavor);
  const cat =
    brand === "Flash"
      ? "FLASH"
      : brand === "Lipton"
        ? "LIPTON"
        : ["Pepsi", "Mirinda", "7UP"].includes(brand)
          ? "CSD"
          : /пиво|пивной|beer/.test(text) ||
              [
                "Holsten",
                "Carlsberg",
                "Garage",
                "Somersby",
                "Жатецкий Гусь",
                "1664 Blanc",
                "Большая Кружка",
              ].includes(brand)
            ? "BEER"
            : "CSD";
  const result = {
    text,
    brand,
    flavor,
    volume,
    pack,
    container,
    keg,
    bib,
    discontinued,
    cat,
  };
  if (productCache.size > 10000) productCache.clear();
  productCache.set(String(name), Object.freeze(result));
  return result;
}
function productMatch(item, name) {
  const p = productInfo(name);
  if (p.discontinued || p.keg || p.bib) return false;
  if (item.flavors && ["classic", "ultra"].includes(p.flavor)) return false;
  if (item.brand && p.brand !== item.brand) return false;
  if (item.flavor && p.flavor !== item.flavor) return false;
  if (item.volume != null && p.volume !== item.volume) return false;
  if (item.container && p.container !== item.container) return false;
  return item.re.test(String(name));
}
function stockKey(row) {
  return (
    row.id ||
    String(row.name)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[,.](?=\d)/g, ".")
      .replace(/\s+/g, " ")
      .trim()
  );
}
function currentStock() {
  return (s.stockReport?.rows || []).filter(
    (r) => !productInfo(r.name).discontinued && !r.keg && !r.bib,
  );
}
function pickStock(item) {
  return (
    currentStock()
      .filter((r) => r.qty > 0 && productMatch(item, r.name))
      .sort(
        (a, b) => b.qty - a.qty || stockKey(a).localeCompare(stockKey(b)),
      )[0] || null
  );
}
function shelfItems(group) {
  return group.items.flatMap((item) => {
    if (item.count <= 1)
      return [
        {
          ...item,
          sku: group.key + ":" + item.label,
          name: item.label,
          group: group.key,
        },
      ];
    const candidates = [
      ...currentStock().map((r) => r.name),
      ...(s.detail?.skuCatalog || []),
      ...(s.detail?.shops || []).flatMap((t) => t.known || []),
    ].filter((n) => productMatch(item, n));
    const map = new Map();
    for (const name of candidates) {
      const p = productInfo(name),
        identity = item.flavors
          ? p.flavor
          : [p.flavor, p.volume, p.container].join("|");
      if (!map.has(identity))
        map.set(identity, {
          ...item,
          count: 1,
          volume: item.flavors ? null : p.volume,
          flavor: p.flavor,
          container: item.flavors ? null : p.container,
          sku: group.key + ":choice:" + identity,
          name: item.flavors
            ? "Flash " + flashFlavorLabel(p.flavor)
            : "Flash " +
              flashFlavorLabel(p.flavor) +
              " " +
              String(p.volume || "").replace(".", ",") +
              " л",
          choice: true,
          group: group.key,
        });
    }
    // The shelf checklist stays usable when stock has not been imported.
    if (!map.size && item.flavors)
      for (const flavor of [
        "bubble gum",
        "exotic",
        "mojito strawberry",
        "pomegranate",
        "morning cakes",
      ])
        map.set(flavor, {
          ...item,
          count: 1,
          flavor,
          sku: group.key + ":choice:" + flavor,
          name: "Flash " + flashFlavorLabel(flavor),
          choice: true,
          group: group.key,
        });
    if (!map.size && !item.flavors)
      for (const [flavor, volume] of [
        ["classic", 0.43],
        ["ultra", 0.43],
        ["ultra", 0.25],
        ["exotic", 0.43],
      ]) {
        let identity = [flavor, volume, "can"].join("|");
        map.set(identity, {
          ...item,
          count: 1,
          flavor,
          volume,
          container: "can",
          sku: group.key + ":choice:" + identity,
          name:
            "Flash " +
            flashFlavorLabel(flavor) +
            " " +
            String(volume).replace(".", ",") +
            " л",
          choice: true,
          group: group.key,
        });
      }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  });
}
function flashFlavorLabel(flavor) {
  return (
    {
      classic: "Classic",
      ultra: "Ultra",
      "bubble gum": "Bubble Gum",
      exotic: "Exotic",
      "mojito strawberry": "Mojito Strawberry",
      pomegranate: "Pomegranate",
      "morning cakes": "Morning Cakes",
    }[flavor] || flavor
  );
}
function fitModel(key, day, groups) {
  const checks = fitSnapshot(key, day, s.fitChecks),
    pending = [],
    present = [],
    blocked = [],
    order = [];
  const used = new Set();
  for (const group of groups) {
    const rows = shelfItems(group),
      choice = group.items.find((x) => x.count > 1),
      yesChoices = rows.filter(
        (x) => x.choice && checks[x.sku] === "yes",
      ).length;
    let remaining = choice ? Math.max(0, choice.count - yesChoices) : Infinity;
    for (const row of rows) {
      const value = checks[row.sku] || "",
        candidate = pickStock(row),
        checked = { ...row, candidate };
      if (value === "yes") {
        present.push(checked);
        continue;
      }
      if (value !== "no") {
        pending.push(checked);
        continue;
      }
      if (row.unconfirmed) {
        blocked.push({ ...checked, reason: "Уточнить обязательный объём" });
        continue;
      }
      if (!candidate) {
        blocked.push({
          ...checked,
          reason: currentStock().some((st) => productMatch(row, st.name))
            ? "Нет в наличии на складе"
            : "Нет позиции в складском отчёте",
        });
        continue;
      }
      if (row.choice && remaining <= 0) {
        blocked.push({
          ...checked,
          reason: "Нужное количество SKU на выбор уже отмечено",
        });
        continue;
      }
      const identity = stockKey(candidate);
      if (used.has(identity)) continue;
      used.add(identity);
      if (row.choice) remaining--;
      order.push({
        ...checked,
        name: candidate.name,
        brand:
          productInfo(candidate.name).brand || fitOrderBrand(candidate.name),
        stockId: identity,
      });
    }
  }
  const known = new Set(groups.flatMap((g) => shelfItems(g)).map((r) => r.sku));
  for (const [sku, value] of Object.entries(checks))
    if (!known.has(sku)) {
      const old = {
        sku,
        name: sku.split(":").slice(1).join(":") + " · отметка прошлой версии",
      };
      if (value === "yes") present.push(old);
      else blocked.push({ ...old, reason: "Перепроверьте текущую позицию" });
    }
  return { pending, present, blocked, order };
}
function normalizeId(value) {
  return value == null ? "" : String(value).trim().replace(/\.0$/, "");
}
function addressKey(value) {
  return String(value || "")
    .split(" · ")[0]
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/(?:^|[^\p{L}\p{N}])(?:улица|ул\.?|дом|д\.?)(?=\s|\d|$)/gu, " ")
    .replace(/[^\p{L}\p{N}/]/gu, "");
}
function sameAddress(a, b) {
  const x = addressKey(a),
    y = addressKey(b);
  return Boolean(x && y && (x === y || x.endsWith(y) || y.endsWith(x)));
}
function shopAddress(row) {
  return row.address || String(row.name || "").match(/\(([^)]*)\)/)?.[1] || "";
}
function resolveShop(r) {
  const shops = s.detail?.shops || [],
    fit = s.detail?.fit || [];
  let t = routeMatch(shops, r.name, r.address, r.id || r.shopId),
    fm =
      (t?.id
        ? fit.find((x) => normalizeId(x.id) === normalizeId(t.id))
        : null) || routeMatch(fit, r.name, r.address, r.id || r.shopId);
  if (!t && fm)
    t = shops.find((x) => normalizeId(x.id) === normalizeId(fm.id)) || null;
  return { t, fm };
}
function matrixText(t, fm) {
  return (
    t?.matrix ||
    (fm
      ? "нет строки матрицы в Sheet4 для найденной ТТ"
      : "точка не сопоставлена")
  );
}
function commitState(next) {
  const previous = s;
  s = next;
  if (save()) return true;
  s = previous;
  return false;
}
function contentSame(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function safeReportHTML(value) {
  return String(value)
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<(script|style)[^>]*>[^]*?<\/\1\s*>/gi, "")
    .replace(/<[^>]*>/g, (tag) => {
      const m = tag.match(/^<\s*(\/?)\s*([a-z][\w:-]*)/i);
      if (
        !m ||
        ![
          "html",
          "head",
          "body",
          "title",
          "table",
          "thead",
          "tbody",
          "tfoot",
          "tr",
          "td",
          "th",
          "caption",
          "span",
          "div",
          "p",
          "br",
          "b",
          "i",
          "strong",
          "small",
        ].includes(m[2].toLowerCase())
      )
        return "";
      const id = tag.match(/\bid\s*=\s*(?:"([\w:-]+)"|'([\w:-]+)'|([\w:-]+))/i);
      return (
        "<" +
        m[1] +
        m[2].toLowerCase() +
        (id && !m[1] ? ' id="' + (id[1] || id[2] || id[3]) + '"' : "") +
        ">"
      );
    });
}
async function checkedBytes(file, limit = 25 * 1024 * 1024) {
  if (file.size > limit) throw Error("Слишком большой файл");
  const bytes = await file.arrayBuffer();
  if (!bytes.byteLength) throw Error("Пустой файл");
  if (bytes.byteLength > limit) throw Error("Слишком большой файл");
  return bytes;
}
async function loadMonolitFile(file) {
  try {
    const bytes = await checkedBytes(file);
    let prefix = new TextDecoder().decode(bytes.slice(0, 512)),
      encoding = /charset\s*=\s*["']?windows-1251/i.test(prefix)
        ? "windows-1251"
        : "utf-8";
    await monoLoad(new TextDecoder(encoding).decode(bytes));
  } catch (e) {
    alert("Ошибка: " + e.message);
  }
}
function decodeShortcut(value) {
  let text = String(value || "")
    .trim()
    .replace(/^data:[^,]+;base64,/i, "")
    .replace(/\s/g, "");
  if (!text) throw Error("Буфер пуст");
  if (text.length > 36 * 1024 * 1024) throw Error("Слишком большой отчёт");
  let raw = atob(text),
    bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  return {
    bytes,
    pdf: raw.startsWith("%PDF-"),
    excel: raw.startsWith("PK\x03\x04") || raw.startsWith("\xd0\xcf\x11\xe0"),
  };
}
// View state is session-only; business data and an active visit are in mix-v1.
let renderedScope = null,
  viewStates =
    restoredUI.views && typeof restoredUI.views === "object"
      ? restoredUI.views
      : {};
function viewScope() {
  return (
    String(tab) +
    "|" +
    (tab === 10
      ? routeDate() + "|" + (visitCurrent()?.key || "")
      : tab === 3 && clientEditIndex != null
        ? routeKey({
            name: s.clients[clientEditIndex]?.a,
            address: s.clients[clientEditIndex]?.b,
          })
        : "")
  );
}
function detailPath(el) {
  const parts = [];
  for (let node = el; node && node.id !== "view"; node = node.parentElement) {
    if (node.matches?.("details")) {
      const summary = node.querySelector("summary");
      parts.unshift(
        (node.dataset.fitKey || "") + ":" + (summary?.textContent || ""),
      );
    }
  }
  return parts.join("/");
}
function rememberView() {
  if (!renderedScope || !$("view")) return;
  const details = {};
  $("view")
    .querySelectorAll("details")
    .forEach((el) => (details[detailPath(el)] = el.open));
  const drafts = {};
  $("view")
    .querySelectorAll(
      "textarea,input[type=search],#task,#boss,#due,#a,#b,#clientsearch",
    )
    .forEach((el) => {
      if (el.id) drafts[el.id] = el.value;
    });
  viewStates[renderedScope] = {
    y: Math.max(0, Number(window.scrollY) || 0),
    details,
    drafts,
  };
}
function persistUI() {
  try {
    sessionStorage.setItem(
      "mix-ui",
      JSON.stringify({
        tab,
        visit: activeVisit,
        client: clientEditIndex,
        clientName: s.clients[clientEditIndex]?.a,
        views: viewStates,
        routeQuery,
        routeFilter,
      }),
    );
  } catch {}
}
function restoreView() {
  renderedScope = viewScope();
  const saved = viewStates[renderedScope];
  if (saved) {
    $("view")
      .querySelectorAll("details")
      .forEach((el) => {
        if (Object.hasOwn(saved.details || {}, detailPath(el)))
          el.open = Boolean(saved.details[detailPath(el)]);
      });
    for (const [id, value] of Object.entries(saved.drafts || {})) {
      const el = $(id);
      if (el && typeof value === "string") el.value = value;
    }
  }
  if ($("clientlist") && $("clientsearch"))
    filterClients($("clientsearch").value);
  persistUI();
  if (typeof requestAnimationFrame === "function")
    requestAnimationFrame(() => window.scrollTo(0, saved?.y || 0));
}
function shelfHistoryKey(key, day) {
  return JSON.stringify([key, day]);
}
function persistVisit() {
  s.activeVisit = activeVisit ? structuredClone(activeVisit) : null;
  save();
  persistUI();
}

async function storedDocuments() {
  if (typeof indexedDB === "undefined") return [];
  const db = await docDB();
  try {
    return await new Promise((ok, no) => {
      const r = db.transaction("files").objectStore("files").getAll();
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    });
  } finally {
    db.close();
  }
}
async function exportDocuments() {
  const rows = await storedDocuments(),
    out = [];
  for (const row of rows) {
    const bytes = new Uint8Array(await row.file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 32768)
      binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    out.push({
      name: row.name,
      type: row.type,
      date: row.date,
      mime: row.file.type || "application/octet-stream",
      base64: btoa(binary),
    });
  }
  return out;
}
function decodeDocuments(docs) {
  if (docs === undefined) return [];
  if (!Array.isArray(docs)) throw Error("Некорректные документы в копии");
  let total = 0;
  return docs.map((row) => {
    if (
      !row ||
      typeof row.name !== "string" ||
      typeof row.base64 !== "string" ||
      row.base64.length > 70 * 1024 * 1024
    )
      throw Error("Некорректный документ в копии");
    const raw = atob(row.base64);
    total += raw.length;
    if (total > 75 * 1024 * 1024)
      throw Error("Слишком много документов в копии");
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    return {
      name: row.name,
      type: String(row.type || ""),
      date: String(row.date || ""),
      file: new File([bytes], row.name, {
        type: row.mime || "application/octet-stream",
      }),
    };
  });
}
async function restoreDocuments(rows) {
  if (!rows.length) return;
  const current = await storedDocuments(),
    add = [];
  for (const row of rows) {
    let same = false;
    for (const old of [...current, ...add]) {
      if (old.name !== row.name || old.file.size !== row.file.size) continue;
      const a = new Uint8Array(await old.file.arrayBuffer()),
        b = new Uint8Array(await row.file.arrayBuffer());
      if (a.every((v, i) => v === b[i])) {
        same = true;
        break;
      }
    }
    if (!same) add.push(row);
  }
  if (!add.length) return;
  const db = await docDB();
  try {
    await new Promise((ok, no) => {
      const tx = db.transaction("files", "readwrite");
      for (const row of add) tx.objectStore("files").add(row);
      tx.oncomplete = ok;
      tx.onerror = () => no(tx.error);
      tx.onabort = () => no(tx.error || Error("Не восстановлены документы"));
    });
  } finally {
    db.close();
  }
}

routeMigrateNotes();
render();
window.addEventListener("pagehide", () => {
  rememberView();
  persistUI();
});
