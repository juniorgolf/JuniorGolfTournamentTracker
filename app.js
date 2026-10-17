// 関東ジュニアゴルフ大会カレンダー：data/tournaments.json を読んで一覧を描画する
const SOON_DAYS = 30;
const DAY = 86400000;

const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const toDate = (s) => (s ? new Date(s + "T00:00:00") : null);
const daysUntil = (s) => Math.round((toDate(s) - today) / DAY);
const WEEK = "日月火水木金土";
const fmt = (s) => { const d = toDate(s); return `${d.getMonth() + 1}/${d.getDate()}(${WEEK[d.getDay()]})`; };
const fmtY = (s) => `${s.slice(0, 4)}年${fmt(s)}`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// 申込状況を判定する。kind: open / soon / closed / unknown
function entryStatus(t) {
  const { entry_open: o, entry_close: c } = t;
  if (c && daysUntil(c) < 0) return { kind: "closed", label: "締切済" };
  if (o && daysUntil(o) > 0) return { kind: "soon", label: `受付開始まで${daysUntil(o)}日` };
  if (c) return { kind: "open", label: daysUntil(c) === 0 ? "本日締切" : `締切まで${daysUntil(c)}日` };
  // 期間は不明でも、確認時点で「受付中」と表示されていた大会
  if (t.entry_state === "受付中") return { kind: "open", label: `受付中（${t.verified.slice(5).replace("-", "/")}確認・締切は公式で確認）` };
  return { kind: "unknown", label: "申込期間は要確認" };
}

function entryText(t) {
  if (!t.entry_open && !t.entry_close) return "申込期間：公式ページで確認してください";
  return `申込期間：${t.entry_open ? fmt(t.entry_open) : "（開始日不明）"} 〜 ${t.entry_close ? fmt(t.entry_close) : "（締切日不明）"}`;
}

function card(t) {
  const st = entryStatus(t);
  const dates = t.end && t.end !== t.start ? `${fmtY(t.start)}〜${fmt(t.end)}` : fmtY(t.start);
  return `<article class="card">
    <span class="badge b-${st.kind}">${esc(st.label)}</span>
    <h3>${esc(t.name)}</h3>
    <p class="meta">${esc(dates)}・${esc(t.pref)}・${esc(t.venue)}</p>
    <p class="meta">${esc(t.organizer)}／対象：${esc(t.grades)}／${esc(t.stage)}</p>
    <p class="entry">${esc(entryText(t))}</p>
    ${t.note ? `<p class="note">${esc(t.note)}</p>` : ""}
    <div class="links">
      <a href="${esc(t.url)}" target="_blank" rel="noopener">公式ページ</a>
      <a href="#" data-ics="${esc(t.id)}">カレンダーに登録</a>
    </div>
  </article>`;
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
  document.getElementById("updated").textContent = updated;

  const fPref = document.getElementById("f-pref");
  const fOrg = document.getElementById("f-org");
  const fPast = document.getElementById("f-past");
  const uniq = (k) => [...new Set(tournaments.map((t) => t[k]))].sort();
  for (const p of uniq("pref")) fPref.add(new Option(p, p));
  for (const o of uniq("organizer")) fOrg.add(new Option(o, o));

  const render = () => {
    const list = tournaments.filter((t) => (!fPref.value || t.pref === fPref.value) && (!fOrg.value || t.organizer === fOrg.value));
    const open = [], upcoming = [], past = [];
    for (const t of list) {
      const st = entryStatus(t);
      if (daysUntil(t.end || t.start) < 0) past.push(t);
      else if (st.kind === "open" || (st.kind === "soon" && daysUntil(t.entry_open) <= SOON_DAYS)) open.push(t);
      else upcoming.push(t);
    }
    // 受付中は締切が近い順
    open.sort((a, b) => (a.entry_close || a.entry_open || a.start).localeCompare(b.entry_close || b.entry_open || b.start));
    past.reverse();
    const fill = (id, arr, empty) => { document.getElementById(id).innerHTML = arr.length ? arr.map(card).join("") : `<p class="empty">${empty}</p>`; };
    fill("open", open, "いま受付中の大会はありません（申込期間が分かっている大会のみ表示）。");
    fill("upcoming", upcoming, "該当する大会はありません。");
    fill("past", past, "該当する大会はありません。");
    document.getElementById("past-wrap").hidden = !fPast.checked;
  };
  [fPref, fOrg, fPast].forEach((el) => el.addEventListener("change", render));

  document.addEventListener("click", (e) => {
    const id = e.target.dataset && e.target.dataset.ics;
    if (!id) return;
    e.preventDefault();
    download(`${id}.ics`, icsFor(tournaments.filter((t) => t.id === id)));
  });
  render();
  window.icsFor = icsFor;
}
main();
