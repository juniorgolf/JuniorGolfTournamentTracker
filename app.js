// ジュニアゴルフ大会カレンダー：data/tournaments.json を読んで一覧と詳細を描画する

// 地方と都道府県。地方名そのもの（「関東」など）は複数県にまたがる大会の pref に使う
const REGIONS = [
  ["北海道", ["北海道"]],
  ["東北", ["東北", "青森", "岩手", "宮城", "秋田", "山形", "福島"]],
  ["関東", ["関東", "東京", "神奈川", "千葉", "埼玉", "茨城", "栃木", "群馬", "山梨"]],
  ["中部", ["中部", "北陸", "新潟", "長野", "富山", "石川", "福井", "岐阜", "静岡", "愛知", "三重"]],
  ["関西", ["関西", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山"]],
  ["中国", ["中国", "中国・四国", "鳥取", "島根", "岡山", "広島", "山口"]],
  ["四国", ["四国", "徳島", "香川", "愛媛", "高知"]],
  ["九州", ["九州", "九州・沖縄", "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島"]],
  ["沖縄", ["沖縄"]],
  ["全国", ["全国"]],
  ["海外", ["海外"]],  // 国名は読み込み時に overseas: true の大会から足す
];
const regionOf = (pref) => (REGIONS.find(([, list]) => list.includes(pref)) || ["その他"])[0];
// 海外の国は地域ごとにまとめて並べる。ここにない国は「その他の国」に入る
const ABROAD_AREAS = [
  ["東アジア", ["韓国", "台湾", "中国", "香港", "マカオ", "モンゴル"]],
  ["東南アジア", ["タイ", "ベトナム", "マレーシア", "シンガポール", "フィリピン", "インドネシア", "カンボジア"]],
  ["南アジア・中東", ["インド", "UAE", "カタール", "サウジアラビア"]],
  ["オセアニア", ["オーストラリア", "ニュージーランド"]],
  ["北米", ["アメリカ", "カナダ"]],
  ["中南米", ["メキシコ", "バハマ", "パナマ", "コロンビア", "ブラジル"]],
  ["ヨーロッパ", ["スコットランド", "イングランド", "ウェールズ", "アイルランド", "フランス", "ドイツ", "ベルギー", "オランダ", "スペイン", "イタリア", "トルコ"]],
  ["アフリカ", ["ケニア", "南アフリカ"]],
];
const abroadAreaOf = (pref) => (ABROAD_AREAS.find(([, list]) => list.includes(pref)) || ["その他の国"])[0];
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

// おやこ手帳デザインのときだけ、カード・今週の手帳・主催者の種類を使う（design.js で決まる）
const TECHO = document.documentElement.dataset.design === "techo";

// 主催者の種類。主催者欄の先頭の団体（共催・主管・後援などのかっこ書きは除く）で決める
const ORG_TYPES = {
  jjga: { label: "JJGA", icon: "M6 21V4M6 4h11l-2 4 2 4H6" },
  junior: { label: "ジュニアツアー・育成", icon: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" },
  union: { label: "ゴルフ連盟・協会", icon: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" },
  school: { label: "学校ゴルフ連盟", icon: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5" },
  media: { label: "新聞・テレビ・出版", icon: "M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5M8 16h3" },
  pro: { label: "プロ団体", icon: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" },
  other: { label: "企業・ゴルフ場・自治体", icon: "M4 20V8l6-3v15M10 20V4h10v16M3 20h18M13 8h4M13 12h4M13 16h4" },
};
const orgHead = (org) => String(org || "").split("／")[0].replace(/（[^）]*(共催|主管|後援|協力|特別協賛)[^）]*）/g, "");
const orgTypeCache = new Map();
function orgType(org) {
  if (orgTypeCache.has(org)) return orgTypeCache.get(org);
  const h = orgHead(org);
  const type = /JJGA|日本ジュニアゴルフ協会/.test(h) ? "jjga"
    : /JLPGA|PGA|JGTO|プロゴルフ/.test(h) ? "pro"
    : /高等学校|中学校|高ゴ連|中体連/.test(h) ? "school"
    : /新聞|放送|テレビ|ダイジェスト|デイリー|UHB|NBS|NCC|KAB|TKU|UMK|BSフジ|テレ玉|報知/.test(h) ? "media"
    : /ジュニアゴルフツアー|JJGT|IJGA|育成|キッズ|パピポ|JGAI|ジュニアゴルフ協会|Future|MIRAI|振興会/.test(h) ? "junior"
    : /ゴルフ連盟|ゴルフ協会|アマチュアゴルフ|JGA|団体連絡|ゴルフ場協議会|練習場連盟/.test(h) ? "union"
    : "other";
  orgTypeCache.set(org, type);
  return type;
}
// ロゴ枠：主催者名に英字の略称（JJGA など）があれば略称、なければ種類の記号。公式ロゴは許諾が取れた団体だけ載せる
const orgAbbr = (org) => (orgHead(org).match(/（([A-Z]{2,6})）/) || [])[1] || "";
const orgLogo = (org) => {
  const a = orgAbbr(org);
  return `<span class="tc-logo${a.length > 4 ? " sm" : ""}" aria-hidden="true">${a ? esc(a) : `<svg viewBox="0 0 24 24"><path d="${ORG_TYPES[orgType(org)].icon}"/></svg>`}</span>`;
};
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

// おやこ手帳デザインでは、表の行にも主催者の種類の色と名前を付ける
const rowCls = (t) => (TECHO ? ` ot-${orgType(t.organizer)}` : "");
const orgCell = (t) => (TECHO ? `<span class="ot-tag">${esc(ORG_TYPES[orgType(t.organizer)].label)}</span>` : "") + esc(t.organizer);

// 海外の大会は国名の前に地球の印を付ける
const prefLabel = (t) => (t.overseas ? "🌏 " : "") + esc(t.pref);
const abroadNote = (t) => t.overseas ? `<p class="d-abroad">🌏 海外の大会です。日付は現地の日付で、申込締切の時刻も現地時間のことが多いので、公式ページで確認してください。</p>` : "";

function watchRow(t) {
  return `<div class="row${rowCls(t)}">
    <div class="date"><span class="d tbd">未定</span></div>
    <div class="cell-name"><button class="name" data-id="${esc(t.id)}">${esc(t.name)}</button><span class="sub">${esc(t.grades)}</span></div>
    <div class="venue"><span class="pref">${prefLabel(t)}</span>${esc(t.venue)}</div>
    <div class="org">${orgCell(t)}</div>
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
  return `<div class="row${rowCls(t)}">
    <div class="date"><span class="d">${d.getMonth() + 1}/${d.getDate()}</span><span class="w">${WEEK[d.getDay()]}</span>${multi}</div>
    <div class="cell-name"><button class="name" data-id="${esc(t.id)}">${esc(t.name)}</button><span class="sub">${esc(t.grades)}・${esc(t.stage)}</span></div>
    <div class="venue"><span class="pref">${prefLabel(t)}</span>${esc(t.venue)}</div>
    <div class="org">${orgCell(t)}</div>
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

// 地図の横に出す、幅の狭い一覧の行
function mapRow(t) {
  if (isWatch(t)) return `<div class="mrow${rowCls(t)}">
    <div class="date"><span class="d tbd">未定</span></div>
    <div class="mrow-body"><button class="name" data-id="${esc(t.id)}">${esc(t.name)}</button>
      <span class="sub">${esc(t.pref)}・前年の会場：${esc(t.prev_venue)}</span>
      <span class="status st-unknown"><b><span class="dot"></span>日程発表待ち</b></span></div>
  </div>`;
  const st = entryStatus(t);
  return `<div class="mrow${rowCls(t)}">
    <div class="date"><span class="d">${esc(md(t.start))}</span><span class="w">${WEEK[toDate(t.start).getDay()]}</span></div>
    <div class="mrow-body"><button class="name" data-id="${esc(t.id)}">${esc(t.name)}</button>
      <span class="sub">${esc(t.pref)}・${esc(t.venue)}</span>
      <span class="status st-${st.kind}"><b><span class="dot"></span>${esc(st.label)}</b></span></div>
  </div>`;
}

function watchDetail(t) {
  return `<p class="d-eyebrow">${prefLabel(t)}・日程発表待ち</p>
    <h2 class="d-title" id="d-title">${esc(t.name)}</h2>
    ${abroadNote(t)}
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
  return `<p class="d-eyebrow">${prefLabel(t)}・${esc(t.stage)}</p>
    <h2 class="d-title" id="d-title">${esc(t.name)}</h2>
    ${abroadNote(t)}
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
      <a class="btn btn-line" href="${esc(gmapsDir(t))}" target="_blank" rel="noopener">経路を調べる（Googleマップ）</a>
    </div>
    ${isPast(t) ? "" : calBlock(t)}
    <p class="d-verified">${esc(t.verified)} 時点で公式ページを確認</p>`;
}

// 詳細画面の「カレンダーに登録」。Google カレンダーは1予定ずつのリンク、.ics は大会日・申込開始・申込締切をまとめて1ファイル
function gcalUrl(t, title, start, end) {
  const d = (s) => s.replace(/-/g, "");
  const x = toDate(end); x.setDate(x.getDate() + 1);
  const next = `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: `${title}${t.name}`, dates: `${d(start)}/${next}`, details: t.url, location: t.venue || "" });
  return `https://calendar.google.com/calendar/render?${q}`;
}
function calBlock(t) {
  const links = [`<a class="btn btn-line" href="${esc(gcalUrl(t, "【大会】", t.start, t.end || t.start))}" target="_blank" rel="noopener">大会日を追加</a>`];
  if (t.entry_open && daysUntil(t.entry_open) >= 0) links.push(`<a class="btn btn-line" href="${esc(gcalUrl(t, "【申込開始】", t.entry_open, t.entry_open))}" target="_blank" rel="noopener">申込開始日を追加</a>`);
  if (t.entry_close && daysUntil(t.entry_close) >= 0) links.push(`<a class="btn btn-line" href="${esc(gcalUrl(t, "【申込締切】", t.entry_close, t.entry_close))}" target="_blank" rel="noopener">申込締切日を追加</a>`);
  return `<div class="d-cal">
      <p class="lbl">この大会をカレンダーに登録</p>
      <p class="d-cal-sub">Google カレンダー</p>
      <div class="d-cal-btns">${links.join("")}</div>
      <p class="d-cal-sub">iPhone・Outlook など</p>
      <div class="d-cal-btns"><button class="btn btn-line" data-ics="${esc(t.id)}">日程をまとめて登録（.ics）</button></div>
    </div>`;
}

// iCalendar 形式（終日予定）。大会日・申込開始・申込締切を別々の予定にする
function icsFor(list) {
  const d = (s) => s.replace(/-/g, "");
  const next = (s) => { const x = toDate(s); x.setDate(x.getDate() + 1); return `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`; };
  const txt = (s) => String(s).replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const ev = (uid, start, end, summary, desc) =>
    ["BEGIN:VEVENT", `UID:${uid}@kanto-junior-golf`, `DTSTAMP:${d(new Date().toISOString().slice(0, 10))}T000000Z`,
     `DTSTART;VALUE=DATE:${d(start)}`, `DTEND;VALUE=DATE:${next(end)}`, `SUMMARY:${txt(summary)}`, `DESCRIPTION:${txt(desc)}`, "END:VEVENT"].join("\r\n");
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//japan-junior-golf//JA", "X-WR-CALNAME:ジュニアゴルフ大会カレンダー"];
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

// 数字をパタパタとめくりながら変える。数字の各桁を span にし、変わった桁だけをめくる
const FLIP_STEPS = 8;
function paintNumber(dd, v) {
  const s = String(v);
  if (dd.children.length !== s.length) {
    dd.innerHTML = [...s].map((c) => `<span class="fl flip">${c}</span>`).join("");
    return;
  }
  [...s].forEach((c, k) => {
    const el = dd.children[k];
    if (el.textContent === c) return;
    el.textContent = c;
    el.classList.remove("flip");
    void el.offsetWidth;  // アニメーションをかけ直すため
    el.classList.add("flip");
  });
}
function flipTo(dd, to) {
  const from = Number(dd.dataset.v) || 0;
  dd.dataset.v = to;
  clearInterval(dd._timer);
  let reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
  if (reduce || from === to) { paintNumber(dd, to); return; }
  let i = 0;
  dd._timer = setInterval(() => {
    i++;
    paintNumber(dd, i >= FLIP_STEPS ? to : Math.round(from + (to - from) * i / FLIP_STEPS));
    if (i >= FLIP_STEPS) clearInterval(dd._timer);
  }, 70);
}

async function main() {
  const { updated, tournaments } = await (await fetch("data/tournaments.json", { cache: "no-cache" })).json();
  const abroad = REGIONS.find(([r]) => r === "海外")[1];
  for (const t of tournaments) if (t.overseas && !abroad.includes(t.pref)) abroad.push(t.pref);
  const byId = Object.fromEntries(tournaments.map((t) => [t.id, t]));
  document.getElementById("updated").textContent = updated;

  // 上段の3つの数字。絞り込みに合わせて render() で数え直す
  const statsEl = document.getElementById("stats");
  statsEl.innerHTML = ["申込受付中・まもなく", "これからの大会", "日程発表待ち"]
    .map((k) => `<div><dt>${k}</dt><dd data-v="0"></dd></div>`).join("");
  const statDds = [...statsEl.querySelectorAll("dd")];

  const fPref = document.getElementById("f-pref");
  const fOrg = document.getElementById("f-org");
  const fLevel = document.getElementById("f-level");
  // エリアは地方ごとにまとめる。「r:関東」は地方全体、それ以外は都道府県
  const prefs = new Set(tournaments.map((t) => t.pref));
  // 国内は地方単位だけ（県単位では大会が少ないため）。海外は国ごとにも選べる
  for (const [region, list] of REGIONS) {
    const present = list.filter((p) => prefs.has(p) && p !== region);
    if (!present.length && !prefs.has(region)) continue;
    if (region !== "海外") { fPref.append(new Option(region === "全国" ? "全国決勝など" : region, `r:${region}`)); continue; }
    const g = document.createElement("optgroup");
    g.label = region;
    g.append(new Option("海外すべて", `r:${region}`));
    fPref.append(g);
    // 海外は地域ごとの見出しの下に国名を並べる（地域全体も選べる）
    for (const [area, countries] of [...ABROAD_AREAS, ["その他の国", present.filter((p) => abroadAreaOf(p) === "その他の国")]]) {
      const here = countries.filter((p) => present.includes(p));
      if (!here.length) continue;
      const ag = document.createElement("optgroup");
      ag.label = `海外：${area}`;
      ag.append(new Option(`${area}すべて`, `a:${area}`), ...here.map((p) => new Option(p, `c:${p}`)));
      fPref.append(ag);
    }
  }
  // 対象（小学生・中学生）とエリアで絞る。levels は大会に出られる学校段階
  const inLevelArea = (t) => (!fLevel.value || (t.levels || []).includes(fLevel.value))
    && (!fPref.value || (fPref.value.startsWith("r:") ? regionOf(t.pref) === fPref.value.slice(2)
      : fPref.value.startsWith("a:") ? t.overseas && abroadAreaOf(t.pref) === fPref.value.slice(2)
      : fPref.value.startsWith("c:") ? t.overseas && t.pref === fPref.value.slice(2)
      : t.pref === fPref.value));
  // おやこ手帳デザインでは、主催者の種類でも絞れる
  let fType = "";
  if (TECHO) try { const s = localStorage.getItem("otype"); if (s && ORG_TYPES[s]) fType = s; } catch {}
  const inArea = (t) => inLevelArea(t) && (!fType || orgType(t.organizer) === fType);
  const typesEl = document.getElementById("otypes");
  const renderTypes = () => {
    const pool = tournaments.filter((t) => inLevelArea(t) && !isWatch(t) && !isPast(t));
    const count = (k) => pool.filter((t) => !k || orgType(t.organizer) === k).length;
    typesEl.innerHTML = `<span class="ot-lbl">主催者の種類</span>` + [["", "すべて"], ...Object.entries(ORG_TYPES).map(([k, v]) => [k, v.label])]
      .map(([k, label]) => `<button class="otc${k ? ` ot-${k}` : ""}" data-otype="${k}" aria-pressed="${fType === k}">${k ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ORG_TYPES[k].icon}"/></svg>` : ""}${esc(label)}<span class="n">${count(k)}</span></button>`).join("");
  };
  // 主催はエリアで絞った大会の主催だけを出す
  const fillOrgs = () => {
    const keep = fOrg.value;
    const orgs = [...new Set(tournaments.filter(inArea).map((t) => t.organizer))].sort((a, b) => a.localeCompare(b, "ja"));
    fOrg.replaceChildren(new Option("すべての主催", ""), ...orgs.map((o) => new Option(o, o)));
    fOrg.value = orgs.includes(keep) ? keep : "";
  };
  // 選んだエリアは次回も使う（保存できない環境では無視）
  try {
    const saved = localStorage.getItem("area"); if (saved && [...fPref.options].some((o) => o.value === saved)) fPref.value = saved;
    const lv = localStorage.getItem("level"); if (lv && [...fLevel.options].some((o) => o.value === lv)) fLevel.value = lv;
  } catch {}
  fillOrgs();

  const tabs = [...document.querySelectorAll("#tabs button")];
  let view = "map";
  const mapEl = document.getElementById("mapview");
  const calEl = document.getElementById("calview");
  const mapList = document.getElementById("map-list");
  const mapCount = document.getElementById("map-count");
  let mapKey = null;

  // 開催日順（同じ日は終了日、大会名の順）
  const byDate = (a, b) => (a.start || "9999").localeCompare(b.start || "9999") || (a.end || "").localeCompare(b.end || "") || a.name.localeCompare(b.name, "ja");
  const render = () => {
    const base = tournaments.filter((t) => inArea(t) && (!fOrg.value || t.organizer === fOrg.value));
    const sets = {
      upcoming: base.filter((t) => !isWatch(t) && !isPast(t)).sort(byDate),
      watch: base.filter(isWatch).sort((a, b) => (a.window_from || "9999").localeCompare(b.window_from || "9999")),
      open: base.filter(isOpenView).sort(byDate),
      // 終了した大会は新しい順
      past: base.filter(isPast).sort((a, b) => byDate(b, a)),
    };
    // 地図には、日程発表待ちでも前年の会場が分かる大会（全国決勝など）を前年の会場に出す
    sets.map = [...sets.upcoming, ...sets.watch.filter((t) => t.prev_venue)];
    [sets.open.length, sets.upcoming.length, sets.watch.length].forEach((n, i) => flipTo(statDds[i], n));
    if (TECHO) renderTypes();
    tabs.forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.view === view));
      const n = sets[b.dataset.view];
      b.innerHTML = `${b.textContent.replace(/\d+$/, "").trim()}${n ? `<span class="count">${n.length}</span>` : ""}`;
    });
    const list = sets[view];
    const isMap = view === "map", isCal = view === "cal";
    document.querySelector(".table-head").hidden = isMap || isCal;
    document.getElementById("list").hidden = isMap || isCal;
    mapEl.hidden = !isMap;
    calEl.hidden = !isCal;
    // 申込カレンダーは日程の決まった大会すべて（終了した大会も含め、月を戻して見られる）
    if (isCal) { showCalendar(calEl, base.filter((t) => !isWatch(t))); return; }
    if (isMap) {
      // 絞り込みが変わったとき（と初回）だけ、該当する会場が全部見える位置へ動かす
      const key = fPref.value + "|" + fOrg.value;
      showMap(mapEl, list, { fit: key !== mapKey, onListChange: (items) => {
        const sorted = [...items].sort(byDate);
        mapList.innerHTML = sorted.length ? sorted.map(mapRow).join("") : `<p class="empty">地図の範囲に大会はありません。地図を動かすか縮小してください。</p>`;
        mapCount.textContent = `地図に見えている大会 ${sorted.length}件`;
      } });
      mapKey = key;
      return;
    }
    document.querySelector(".table-head span:last-child").textContent = view === "past" ? "結果" : "申込";
    const el = document.getElementById("list");
    if (!list.length) { el.innerHTML = `<p class="empty">該当する大会はありません。</p>`; return; }
    if (view === "watch") {
      const rows = list.map(row).join("");
      el.innerHTML = `<p class="month">前年の実績から、申込が始まりそうな順</p>` + rows;
      return;
    }
    // 月ごとに見出しを入れる
    let html = "", month = "";
    for (const t of list) {
      const m = `${t.start.slice(0, 4)}.${t.start.slice(5, 7)}`;
      if (m !== month) {
        html += `<p class="month">${m}</p>`;
        month = m;
      }
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
  fLevel.addEventListener("change", () => {
    try { localStorage.setItem("level", fLevel.value); } catch {}
    fillOrgs(); render();
  });
  bindCalendar(calEl, render);
  if (TECHO) {
    typesEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-otype]");
      if (!b) return;
      fType = b.dataset.otype;
      try { localStorage.setItem("otype", fType); } catch {}
      fillOrgs(); render();
    });
  }

  const dlg = document.getElementById("detail");
  const open = (id) => {
    const t = byId[id];
    if (!t) return;
    const band = TECHO ? `<div class="d-org ot-${orgType(t.organizer)}">${orgLogo(t.organizer)}<span><b>${esc(ORG_TYPES[orgType(t.organizer)].label)}</b>${esc(t.organizer)}</span></div>` : "";
    document.getElementById("d-body").innerHTML = band + detail(t);
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
