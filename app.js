// 関東ジュニアゴルフ大会カレンダー：data/tournaments.json を読んで一覧と詳細を描画する
const SOON_DAYS = 30;
const DAY = 86400000;

const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const toDate = (s) => (s ? new Date(s + "T00:00:00") : null);
const daysUntil = (s) => Math.round((toDate(s) - today) / DAY);
const WEEK = "日月火水木金土";
const md = (s) => { const d = toDate(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const fmt = (s) => { const d = toDate(s); return `${md(s)}(${WEEK[d.getDay()]})`; };
const fmtY = (s) => `${s.slice(0, 4)}年${fmt(s)}`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isWatch = (t) => !t.start; // 日程未発表（前年実績から時期を見込む大会）
const isPast = (t) => !isWatch(t) && daysUntil(t.end || t.start) < 0;

// 申込状況を判定する。kind: open / soon / closed / unknown
function entryStatus(t) {
  const { entry_open: o, entry_close: c } = t;
  if (c && daysUntil(c) < 0) return { kind: "closed", label: "締切済" };
  if (o && daysUntil(o) > 0) return { kind: "soon", label: `受付開始まで${daysUntil(o)}日` };
  if (c) return { kind: "open", label: daysUntil(c) === 0 ? "本日締切" : `締切まで${daysUntil(c)}日` };
  // 期間は不明でも、確認時点で「受付中」と表示されていた大会
  if (t.entry_state === "受付中") return { kind: "open", label: "受付中" };
  return { kind: "unknown", label: "要項で確認" };
}
const isOpenView = (t) => { const st = entryStatus(t); return !isWatch(t) && !isPast(t) && (st.kind === "open" || (st.kind === "soon" && daysUntil(t.entry_open) <= SOON_DAYS)); };

function entryPeriod(t) {
  if (!t.entry_open && !t.entry_close) return "";
  return `${t.entry_open ? md(t.entry_open) : "—"}〜${t.entry_close ? md(t.entry_close) : "—"}`;
}
function entryPeriodLong(t) {
  if (!t.entry_open && !t.entry_close) return "申込期間は公式ページの要項でご確認ください。";
  return `${t.entry_open ? fmtY(t.entry_open) : "開始日未確認"} 〜 ${t.entry_close ? fmtY(t.entry_close) : "締切日未確認"}`;
}
const dateRange = (t) => (t.end && t.end !== t.start ? `${fmtY(t.start)} 〜 ${fmt(t.end)}` : fmtY(t.start));

function watchRow(t) {
  return `<div class="row">
    <div class="date"><span class="d tbd">未定</span></div>
    <div class="cell-name"><button class="name" data-id="${esc(t.id)}">${esc(t.name)}</button><span class="sub">${esc(t.grades)}</span></div>
    <div class="venue"><span class="pref">${esc(t.pref)}</span>${esc(t.venue)}</div>
    <div class="org">${esc(t.organizer)}</div>
    <div class="cell-status"><span class="status st-unknown"><b><span class="dot"></span>発表待ち</b>${t.window_from ? `<small>${esc(fmtY(t.window_from))}ごろから注意</small>` : ""}</span></div>
  </div>`;
}

function row(t) {
  if (isWatch(t)) return watchRow(t);
  const st = entryStatus(t);
  const d = toDate(t.start);
  const multi = t.end && t.end !== t.start ? `<span class="r">–${md(t.end)}</span>` : "";
  const period = entryPeriod(t);
  return `<div class="row">
    <div class="date"><span class="d">${d.getMonth() + 1}/${d.getDate()}</span><span class="w">${WEEK[d.getDay()]}</span>${multi}</div>
    <div class="cell-name"><button class="name" data-id="${esc(t.id)}">${esc(t.name)}</button><span class="sub">${esc(t.grades)}・${esc(t.stage)}</span></div>
    <div class="venue"><span class="pref">${esc(t.pref)}</span>${esc(t.venue)}</div>
    <div class="org">${esc(t.organizer)}</div>
    <div class="cell-status"><span class="status st-${st.kind}"><b><span class="dot"></span>${esc(st.label)}</b>${period ? `<small>${esc(period)}</small>` : ""}</span></div>
  </div>`;
}

function watchDetail(t) {
  return `<p class="d-eyebrow">${esc(t.pref)}・日程発表待ち</p>
    <h2 class="d-title" id="d-title">${esc(t.name)}</h2>
    <div class="d-entry st-unknown">
      <p class="lbl">今年の日程・申込期間はまだ発表されていません</p>
      <p>${esc(t.expected || "前年の実績は公式ページでご確認ください。")}</p>
    </div>
    <dl class="d-list">
      ${t.window_from ? `<dt>注意する時期</dt><dd>${esc(fmtY(t.window_from))}ごろから公式ページを確認</dd>` : ""}
      <dt>会場</dt><dd>${esc(t.venue)}（${esc(t.pref)}）</dd>
      <dt>主催</dt><dd>${esc(t.organizer)}</dd>
      <dt>対象</dt><dd>${esc(t.grades)}</dd>
    </dl>
    ${t.note ? `<p class="d-note">${esc(t.note)}</p>` : ""}
    <div class="d-actions"><a class="btn btn-solid" href="${esc(t.url)}" target="_blank" rel="noopener">公式ページを見る</a></div>
    <p class="d-verified">${esc(t.verified)} 時点の情報。前年の実績をもとにしており、今年の確定日ではありません。</p>`;
}

function detail(t) {
  if (isWatch(t)) return watchDetail(t);
  const st = entryStatus(t);
  const title = { open: "申込受付中", soon: "まもなく受付開始", closed: "申込受付は終了しました", unknown: "申込期間は要確認" }[st.kind];
  return `<p class="d-eyebrow">${esc(t.pref)}・${esc(t.stage)}</p>
    <h2 class="d-title" id="d-title">${esc(t.name)}</h2>
    <div class="d-entry st-${st.kind}">
      <p class="lbl">${esc(title)}${(st.kind === "open" || st.kind === "soon") && st.label !== "受付中" ? `（${esc(st.label)}）` : ""}</p>
      <p>${esc(entryPeriodLong(t))}</p>
    </div>
    <dl class="d-list">
      <dt>開催日</dt><dd>${esc(dateRange(t))}</dd>
      <dt>会場</dt><dd>${esc(t.venue)}（${esc(t.pref)}）</dd>
      <dt>主催</dt><dd>${esc(t.organizer)}</dd>
      <dt>対象</dt><dd>${esc(t.grades)}</dd>
      <dt>区分</dt><dd>${esc(t.stage)}</dd>
    </dl>
    ${t.note ? `<p class="d-note">${esc(t.note)}</p>` : ""}
    <div class="d-actions">
      <a class="btn btn-solid" href="${esc(t.url)}" target="_blank" rel="noopener">公式ページで要項を見る</a>
      <button class="btn btn-line" data-ics="${esc(t.id)}">カレンダーに登録</button>
    </div>
    <p class="d-verified">${esc(t.verified)} 時点で公式ページを確認</p>`;
}

// iCalendar 形式（終日予定）。大会日・申込開始・申込締切を別々の予定にする
function icsFor(list) {
  const d = (s) => s.replace(/-/g, "");
  const next = (s) => { const x = toDate(s); x.setDate(x.getDate() + 1); return `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`; };
  const txt = (s) => String(s).replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const ev = (uid, start, end, summary, desc) =>
    ["BEGIN:VEVENT", `UID:${uid}@kanto-junior-golf`, `DTSTAMP:${d(new Date().toISOString().slice(0, 10))}T000000Z`,
     `DTSTART;VALUE=DATE:${d(start)}`, `DTEND;VALUE=DATE:${next(end)}`, `SUMMARY:${txt(summary)}`, `DESCRIPTION:${txt(desc)}`, "END:VEVENT"].join("\r\n");
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//kanto-junior-golf//JA", "X-WR-CALNAME:関東ジュニアゴルフ大会"];
  for (const t of list) {
    out.push(ev(t.id, t.start, t.end || t.start, `【大会】${t.name}`, `${t.venue}\n${t.url}`));
    if (t.entry_open) out.push(ev(t.id + "-open", t.entry_open, t.entry_open, `【申込開始】${t.name}`, t.url));
    if (t.entry_close) out.push(ev(t.id + "-close", t.entry_close, t.entry_close, `【申込締切】${t.name}`, t.url));
  }
  out.push("END:VCALENDAR");
  return out.join("\r\n");
}

function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/calendar" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function main() {
  const { updated, tournaments } = await (await fetch("data/tournaments.json")).json();
  const byId = Object.fromEntries(tournaments.map((t) => [t.id, t]));
  document.getElementById("updated").textContent = updated;

  const upcomingAll = tournaments.filter((t) => !isWatch(t) && !isPast(t));
  document.getElementById("stats").innerHTML = [
    ["申込受付中・まもなく", tournaments.filter(isOpenView).length],
    ["これからの大会", upcomingAll.length],
    ["日程発表待ち", tournaments.filter(isWatch).length],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

  const fPref = document.getElementById("f-pref");
  const fOrg = document.getElementById("f-org");
  const uniq = (k) => [...new Set(tournaments.map((t) => t[k]))].sort();
  for (const p of uniq("pref")) fPref.add(new Option(p, p));
  for (const o of uniq("organizer")) fOrg.add(new Option(o, o));

  const tabs = [...document.querySelectorAll("#tabs button")];
  let view = "upcoming";

  const render = () => {
    const base = tournaments.filter((t) => (!fPref.value || t.pref === fPref.value) && (!fOrg.value || t.organizer === fOrg.value));
    const sets = {
      upcoming: base.filter((t) => !isWatch(t) && !isPast(t)),
      watch: base.filter(isWatch).sort((a, b) => (a.window_from || "9999").localeCompare(b.window_from || "9999")),
      // 受付中は締切が近い順
      open: base.filter(isOpenView).sort((a, b) => (a.entry_close || a.entry_open || a.start).localeCompare(b.entry_close || b.entry_open || b.start)),
      past: base.filter(isPast).reverse(),
    };
    tabs.forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.view === view));
      b.innerHTML = `${b.textContent.replace(/\d+$/, "").trim()}<span class="count">${sets[b.dataset.view].length}</span>`;
    });
    const list = sets[view];
    const el = document.getElementById("list");
    if (!list.length) { el.innerHTML = `<p class="empty">該当する大会はありません。</p>`; return; }
    if (view === "open") { el.innerHTML = `<p class="month">締切が近い順</p>` + list.map(row).join(""); return; }
    if (view === "watch") { el.innerHTML = `<p class="month">前年の実績から、申込が始まりそうな順</p>` + list.map(row).join(""); return; }
    let html = "", month = "";
    for (const t of list) {
      const m = `${t.start.slice(0, 4)}.${t.start.slice(5, 7)}`;
      if (m !== month) { html += `<p class="month">${m}</p>`; month = m; }
      html += row(t);
    }
    el.innerHTML = html;
  };

  tabs.forEach((b) => b.addEventListener("click", () => { view = b.dataset.view; render(); }));
  [fPref, fOrg].forEach((el) => el.addEventListener("change", render));

  const dlg = document.getElementById("detail");
  const open = (id) => {
    const t = byId[id];
    if (!t) return;
    document.getElementById("d-body").innerHTML = detail(t);
    if (!dlg.open) dlg.showModal();
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  };
  const close = () => { dlg.close(); };
  dlg.addEventListener("close", () => history.replaceState(null, "", location.pathname + location.search));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  document.getElementById("d-close").addEventListener("click", close);

  document.addEventListener("click", (e) => {
    const name = e.target.closest("[data-id]");
    if (name) { open(name.dataset.id); return; }
    const ics = e.target.closest("[data-ics]");
    if (ics) { e.preventDefault(); download(`${ics.dataset.ics}.ics`, icsFor([byId[ics.dataset.ics]])); }
  });

  render();
  // URL の #大会ID で詳細を直接開ける（共有用）
  if (location.hash.length > 1) open(decodeURIComponent(location.hash.slice(1)));
}
main();
