// 申込カレンダー：月ごとに「申込締切」「受付開始」「開催日」を並べる
// app.js の esc / md / fmt / toDate / daysUntil / WEEK を使う

const CAL_KINDS = {
  close: { label: "申込締切", short: "締切" },
  open: { label: "受付開始", short: "受付" },
  start: { label: "開催日", short: "開催" },
};
const CAL_ORDER = { close: 0, open: 1, start: 2 };
const CAL_SHOW = 3; // PC で1日に見せる件数。超えた分は「ほか N件」で開く
const cal = {
  month: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
  show: { close: true, open: true, start: true },
};
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// 大会ごとに、締切・受付開始・開催日をそれぞれ1件の予定にする
function calEvents(list) {
  const ev = [];
  for (const t of list) {
    if (t.entry_close) ev.push({ date: t.entry_close, kind: "close", t });
    if (t.entry_open) ev.push({ date: t.entry_open, kind: "open", t });
    if (t.start) ev.push({ date: t.start, kind: "start", t });
  }
  return ev;
}

function showCalendar(container, list) {
  const y = cal.month.getFullYear(), m = cal.month.getMonth();
  const prefix = `${y}-${String(m + 1).padStart(2, "0")}-`;
  const all = calEvents(list).filter((e) => e.date.startsWith(prefix));
  const ev = all.filter((e) => cal.show[e.kind]);
  container.querySelector("#cal-title").textContent = `${y}年${m + 1}月`;

  container.querySelector("#cal-layers").innerHTML = Object.entries(CAL_KINDS).map(([k, v]) =>
    `<button class="cal-layer ev-${k}" data-layer="${k}" aria-pressed="${cal.show[k]}"><span class="sw"></span>${v.label}</button>`).join("");

  // 日曜始まり。前後の月の日は空のマスにする
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = Math.ceil((first + days) / 7) * 7;
  const todayKey = ymd(today);
  let html = [..."日月火水木金土"].map((w, i) => `<div class="cal-wd${i === 0 ? " sun" : i === 6 ? " sat" : ""}">${w}</div>`).join("");
  for (let i = 0; i < cells; i++) {
    const day = i - first + 1;
    if (day < 1 || day > days) { html += `<div class="cal-cell out"></div>`; continue; }
    const key = prefix + String(day).padStart(2, "0");
    const items = ev.filter((e) => e.date === key).sort((a, b) => CAL_ORDER[a.kind] - CAL_ORDER[b.kind] || a.t.name.localeCompare(b.t.name, "ja"));
    const dow = i % 7;
    const cls = ["cal-cell", dow === 0 ? "sun" : dow === 6 ? "sat" : "", key === todayKey ? "today" : key < todayKey ? "before" : "", items.length ? "" : "noev"].filter(Boolean).join(" ");
    html += `<div class="${cls}">
      <span class="cal-day"><span class="n">${day}</span><span class="w">${m + 1}/${day}(${WEEK[dow]})</span></span>
      ${items.map((e, j) => `<button class="cal-ev ev-${e.kind}${j >= CAL_SHOW ? " extra" : ""}" data-id="${esc(e.t.id)}" title="${esc(`${CAL_KINDS[e.kind].label}：${e.t.name}（${e.t.pref}）`)}"><b>${CAL_KINDS[e.kind].short}</b> ${esc(e.t.pref)} ${esc(e.t.name)}</button>`).join("")}
      ${items.length > CAL_SHOW ? `<button class="cal-more" data-more>ほか ${items.length - CAL_SHOW}件</button>` : ""}
    </div>`;
  }
  container.querySelector("#cal-grid").innerHTML = html;
  container.querySelector("#cal-empty").hidden = ev.length > 0;

  // 右側：この月の締切を日付順に。過ぎた締切は薄く表示する
  const dl = all.filter((e) => e.kind === "close").sort((a, b) => a.date.localeCompare(b.date) || a.t.name.localeCompare(b.t.name, "ja"));
  const done = dl.filter((e) => daysUntil(e.date) < 0).length;
  container.querySelector("#cal-n").innerHTML = `${dl.length}<small>件</small>${done ? `<em>うち締切済 ${done}件</em>` : ""}`;
  container.querySelector("#cal-deadlines").innerHTML = dl.length
    ? dl.map((e) => `<div class="cal-dl${daysUntil(e.date) < 0 ? " done" : ""}">
        <span class="d">${esc(md(e.date))}</span>
        <div><button class="name" data-id="${esc(e.t.id)}">${esc(e.t.name)}</button><span class="sub">${esc(e.t.pref)}・${daysUntil(e.date) < 0 ? "締切済" : daysUntil(e.date) === 0 ? "本日締切" : `あと${daysUntil(e.date)}日`}</span></div>
      </div>`).join("")
    : `<p class="empty">この月の申込締切はありません。</p>`;
}

// 月送り・表示する種類の切り替え・「ほか N件」。rerender は絞り込み済みの一覧で描き直す関数
function bindCalendar(container, rerender) {
  container.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-cal]");
    if (nav) { cal.month = new Date(cal.month.getFullYear(), cal.month.getMonth() + Number(nav.dataset.cal), 1); rerender(); return; }
    if (e.target.closest("[data-cal-today]")) { cal.month = new Date(today.getFullYear(), today.getMonth(), 1); rerender(); return; }
    const layer = e.target.closest("[data-layer]");
    if (layer) { cal.show[layer.dataset.layer] = !cal.show[layer.dataset.layer]; rerender(); return; }
    const more = e.target.closest("[data-more]");
    if (more) { more.closest(".cal-cell").classList.add("expanded"); more.remove(); }
  });
}
