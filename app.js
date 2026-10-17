// 全国ジュニアゴルフ大会カレンダー：data/tournaments.json を読んで一覧と詳細を描画する

// 地方と都道府県。地方名そのもの（「関東」など）は複数県にまたがる大会の pref に使う
const REGIONS = [
  ["北海道", ["北海道"]],
  ["東北", ["東北", "青森", "岩手", "宮城", "秋田", "山形", "福島"]],
  ["関東", ["関東", "東京", "神奈川", "千葉", "埼玉", "茨城", "栃木", "群馬", "山梨"]],
  ["中部", ["中部", "北陸", "新潟", "長野", "富山", "石川", "福井", "岐阜", "静岡", "愛知", "三重"]],
  ["関西", ["関西", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山"]],
  ["中国", ["中国", "中国・四国", "鳥取", "島根", "岡山", "広島", "山口"]],
  ["四国", ["四国", "徳島", "香川", "愛媛", "高知"]],
  ["九州・沖縄", ["九州", "九州・沖縄", "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄"]],
  ["全国", ["全国"]],
];
const regionOf = (pref) => (REGIONS.find(([, list]) => list.includes(pref)) || ["その他"])[0];
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
  const status = isPast(t) ? resultCell(t)
    : `<span class="status st-${st.kind}"><b><span class="dot"></span>${esc(st.label)}</b>${period ? `<small>${esc(period)}</small>` : ""}</span>`;
  return `<div class="row">
    <div class="date"><span class="d">${d.getMonth() + 1}/${d.getDate()}</span><span class="w">${WEEK[d.getDay()]}</span>${multi}</div>
    <div class="cell-name"><button class="name" data-id="${esc(t.id)}">${esc(t.name)}</button><span class="sub">${esc(t.grades)}・${esc(t.stage)}</span></div>
    <div class="venue"><span class="pref">${esc(t.pref)}</span>${esc(t.venue)}</div>
    <div class="org">${esc(t.organizer)}</div>
    <div class="cell-status">${status}</div>
  </div>`;
}

// 終了した大会の結果リンク（一覧では先頭の1件、詳細ではすべて表示）
function resultCell(t) {
  if (t.results && t.results.length) {
    return `<a class="result-link" href="${esc(t.results[0].url)}" target="_blank" rel="noopener">結果を見る<span aria-hidden="true">↗</span></a>${t.results.length > 1 ? `<small class="result-more">ほか${t.results.length - 1}件</small>` : ""}`;
  }
  return `<span class="status st-closed"><b>${esc(t.results_note ? "中止" : "結果は公式で確認")}</b></span>`;
}
function resultBlock(t) {
  if (t.results && t.results.length) {
    return `<div class="d-results"><p class="d-results-h">大会結果・スコア</p><div class="d-actions">${t.results.map((r) => `<a class="btn btn-solid" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)}</a>`).join("")}</div></div>`;
  }
  return `<div class="d-results"><p class="d-results-h">大会結果・スコア</p><p class="d-note">${esc(t.results_note || "結果は公式ページでご確認ください。")}</p></div>`;
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
    ${isPast(t) ? resultBlock(t) : ""}
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
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//japan-junior-golf//JA", "X-WR-CALNAME:全国ジュニアゴルフ大会"];
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
  const { updated, tournaments } = await (await fetch("data/tournaments.json", { cache: "no-cache" })).json();
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
  // エリアは地方ごとにまとめる。「r:関東」は地方全体、それ以外は都道府県
  const prefs = new Set(tournaments.map((t) => t.pref));
  for (const [region, list] of REGIONS) {
    const present = list.filter((p) => prefs.has(p) && p !== region);
    if (!present.length && !prefs.has(region)) continue;
    const g = document.createElement("optgroup");
    g.label = region;
    g.append(new Option(region === "全国" ? "全国決勝など" : `${region}すべて`, `r:${region}`), ...present.map((p) => new Option(p, p)));
    fPref.append(g);
  }
  const inArea = (t) => !fPref.value || (fPref.value.startsWith("r:") ? regionOf(t.pref) === fPref.value.slice(2) : t.pref === fPref.value);
  // 主催はエリアで絞った大会の主催だけを出す
  const fillOrgs = () => {
    const keep = fOrg.value;
    const orgs = [...new Set(tournaments.filter(inArea).map((t) => t.organizer))].sort((a, b) => a.localeCompare(b, "ja"));
    fOrg.replaceChildren(new Option("すべての主催", ""), ...orgs.map((o) => new Option(o, o)));
    fOrg.value = orgs.includes(keep) ? keep : "";
  };
  // 選んだエリアは次回も使う（保存できない環境では無視）
  try { const saved = localStorage.getItem("area"); if (saved && [...fPref.options].some((o) => o.value === saved)) fPref.value = saved; } catch {}
  fillOrgs();

  const tabs = [...document.querySelectorAll("#tabs button")];
  let view = "upcoming";

  // 開催日順（同じ日は終了日、大会名の順）
  const byDate = (a, b) => a.start.localeCompare(b.start) || (a.end || "").localeCompare(b.end || "") || a.name.localeCompare(b.name, "ja");
  const render = () => {
    const base = tournaments.filter((t) => inArea(t) && (!fOrg.value || t.organizer === fOrg.value));
    const sets = {
      upcoming: base.filter((t) => !isWatch(t) && !isPast(t)).sort(byDate),
      watch: base.filter(isWatch).sort((a, b) => (a.window_from || "9999").localeCompare(b.window_from || "9999")),
      open: base.filter(isOpenView).sort(byDate),
      // 終了した大会は新しい順
      past: base.filter(isPast).sort((a, b) => byDate(b, a)),
    };
    tabs.forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.view === view));
      b.innerHTML = `${b.textContent.replace(/\d+$/, "").trim()}<span class="count">${sets[b.dataset.view].length}</span>`;
    });
    const list = sets[view];
    document.querySelector(".table-head span:last-child").textContent = view === "past" ? "結果" : "申込";
    const el = document.getElementById("list");
    if (!list.length) { el.innerHTML = `<p class="empty">該当する大会はありません。</p>`; return; }
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
  fPref.addEventListener("change", () => {
    try { localStorage.setItem("area", fPref.value); } catch {}
    fillOrgs(); render();
  });
  fOrg.addEventListener("change", render);

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
