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
  ["全国", ["全国"]],  // 予選と決勝は会場の県に分けて登録するため、エリアの選択肢には出さない（日本すべてで表示）
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
const WEEK = EN ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : "日月火水木金土";
const md = (s) => { const d = toDate(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const fmt = (s) => { const d = toDate(s); return EN ? `${WEEK[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}` : `${md(s)}(${WEEK[d.getDay()]})`; };
const fmtY = (s) => (EN ? `${fmt(s)}, ${s.slice(0, 4)}` : `${s.slice(0, 4)}年${fmt(s)}`);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isWatch = (t) => !t.start; // 日程未発表（前年実績から時期を見込む大会）
const isPast = (t) => !isWatch(t) && daysUntil(t.end || t.start) < 0;

// おやこ手帳デザインのときだけ、カード・今週の手帳・主催者の種類を使う（design.js で決まる）
const TECHO = document.documentElement.dataset.design === "techo";

// 主催者の種類。主催者欄の先頭の団体（共催・主管・後援などのかっこ書きは除く）で決める
const ORG_TYPES = {
  jjga: { label: "JJGA", icon: "M6 21V4M6 4h11l-2 4 2 4H6" },
  junior: { label: tr("ジュニアツアー・育成", "Junior tours"), icon: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" },
  union: { label: tr("ゴルフ連盟・協会", "Golf associations"), icon: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" },
  school: { label: tr("学校ゴルフ連盟", "School federations"), icon: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5" },
  media: { label: tr("新聞・テレビ・出版", "Media"), icon: "M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5M8 16h3" },
  pro: { label: tr("プロ団体", "Pro associations"), icon: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" },
  other: { label: tr("企業・ゴルフ場・自治体", "Companies, courses, cities"), icon: "M4 20V8l6-3v15M10 20V4h10v16M3 20h18M13 8h4M13 12h4M13 16h4" },
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
  if (c && daysUntil(c) < 0) return { kind: "closed", label: tr("締切済", "Closed") };
  if (o && daysUntil(o) > 0) return { kind: "soon", label: tr(`受付開始まで${daysUntil(o)}日`, `Opens in ${daysUntil(o)} day${daysUntil(o) === 1 ? "" : "s"}`) };
  if (c) return { kind: "open", label: daysUntil(c) === 0 ? tr("本日締切", "Closes today") : tr(`締切まで${daysUntil(c)}日`, `${daysUntil(c)} day${daysUntil(c) === 1 ? "" : "s"} left`) };
  // 期間は不明でも、確認時点で「受付中」と表示されていた大会
  if (t.entry_state === "受付中") return { kind: "open", label: tr("受付中", "Open"), plain: true };
  return { kind: "unknown", label: tr("要項で確認", "See guidelines") };
}
const isOpenView = (t) => { const st = entryStatus(t); return !isWatch(t) && !isPast(t) && (st.kind === "open" || (st.kind === "soon" && daysUntil(t.entry_open) <= SOON_DAYS)); };

function entryPeriod(t) {
  if (!t.entry_open && !t.entry_close) return "";
  return `${t.entry_open ? md(t.entry_open) : "—"}${tr("〜", "–")}${t.entry_close ? md(t.entry_close) : "—"}`;
}
function entryPeriodLong(t) {
  if (!t.entry_open && !t.entry_close) return tr("申込期間は公式ページの要項でご確認ください。", "See the official guidelines for the entry period.");
  return `${t.entry_open ? fmtY(t.entry_open) : tr("開始日未確認", "Opening date unconfirmed")} ${tr("〜", "–")} ${t.entry_close ? fmtY(t.entry_close) : tr("締切日未確認", "Deadline unconfirmed")}`;
}
const dateRange = (t) => (t.end && t.end !== t.start ? `${fmtY(t.start)} ${tr("〜", "–")} ${tr(fmt(t.end), fmtY(t.end))}` : fmtY(t.start));

// おやこ手帳デザインでは、表の行にも主催者の種類の色と名前を付ける
const rowCls = (t) => (TECHO ? ` ot-${orgType(t.organizer)}` : "");
const orgCell = (t) => (TECHO ? `<span class="ot-tag">${esc(ORG_TYPES[orgType(t.organizer)].label)}</span>` : "") + esc(orgName(t.organizer));

// 海外の大会は国名の前に地球の印を付ける
const prefLabel = (t) => (t.overseas ? "🌏 " : "") + esc(placeName(t.pref, t.overseas));
const abroadNote = (t) => t.overseas ? `<p class="d-abroad">${tr("🌏 海外の大会です。日付は現地の日付で、申込締切の時刻も現地時間のことが多いので、公式ページで確認してください。", "🌏 This tournament is outside Japan. Dates are local dates, and entry deadlines are often in local time. Check the official page.")}</p>` : "";
// 英語版の一覧では、英語の呼び名の下に公式名（日本語）を添える
const jaName = (t) => (EN ? `<span class="ja-name" lang="ja">${esc(t.name)}</span>` : "");
const venueText = (t) => (EN && isWatch(t) ? (t.prev_venue ? `TBA (last year: <span lang="ja">${esc(t.prev_venue)}</span>)` : "TBA") : EN ? `<span lang="ja">${esc(t.venue)}</span>` : esc(t.venue));
const subText = (t) => (EN ? `${genMark(t)}${esc(levelsEn(t).replace("Open (junior high OK)", ""))}` : `${genMark(t)}${esc(t.grades)}`);

function watchRow(t) {
  return `<div class="row${rowCls(t)}">
    <div class="date"><span class="d tbd">${tr("未定", "TBA")}</span></div>
    <div class="cell-name"><button class="name" data-id="${esc(t.id)}">${esc(nameOf(t))}</button>${jaName(t)}<span class="sub">${subText(t)}${prevMark(t)}</span></div>
    <div class="venue"><span class="pref">${prefLabel(t)}</span>${venueText(t)}</div>
    <div class="org">${orgCell(t)}</div>
    <div class="cell-status"><span class="status st-unknown"><b><span class="dot"></span>${tr("発表待ち", "Dates TBA")}</b>${t.window_from ? `<small>${tr(`${esc(fmtY(t.window_from))}ごろから注意`, `Watch from ${esc(fmtY(t.window_from))}`)}</small>` : ""}</span></div>
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
    <div class="cell-name"><button class="name" data-id="${esc(t.id)}">${esc(nameOf(t))}</button>${jaName(t)}<span class="sub">${subText(t)}${tr("・", " · ")}${esc(stageName(t.stage))}${isPast(t) ? "" : prevMark(t)}</span></div>
    <div class="venue"><span class="pref">${prefLabel(t)}</span>${venueText(t)}</div>
    <div class="org">${orgCell(t)}</div>
    <div class="cell-status">${status}</div>
  </div>`;
}

// 終了した大会の結果リンク（一覧では先頭の1件、詳細ではすべて表示）
function resultCell(t) {
  if (t.results && t.results.length) {
    return `<a class="result-link" href="${esc(t.results[0].url)}" target="_blank" rel="noopener">${tr("結果を見る", "Results")}<span aria-hidden="true">↗</span></a>${t.results.length > 1 ? `<small class="result-more">${tr(`ほか${t.results.length - 1}件`, `+${t.results.length - 1} more`)}</small>` : ""}`;
  }
  return `<span class="status st-closed"><b>${esc(t.results_note ? tr("中止", "Cancelled") : tr("結果は公式で確認", "See official page"))}</b></span>`;
}
function resultBlock(t) {
  if (t.results && t.results.length) {
    return `<div class="d-results"><p class="d-results-h">${tr("大会結果・スコア", "Results and scores")}</p><div class="d-actions">${t.results.map((r) => `<a class="btn btn-solid" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(linkLabel(r))}</a>`).join("")}</div></div>`;
  }
  return `<div class="d-results"><p class="d-results-h">${tr("大会結果・スコア", "Results and scores")}</p><p class="d-note"${EN && t.results_note ? ' lang="ja"' : ""}>${esc(t.results_note || tr("結果は公式ページでご確認ください。", "See the official page for results."))}</p></div>`;
}

// 前回の大会の結果（これからの大会・日程発表待ちに付ける。今年の結果と混同しないよう年を出す）
const prevMark = (t) => t.prev_results ? `<span class="prev-mark">${tr("前回結果あり", "Last results")}</span>` : "";
// 結果リンクの名前は日本語のことが多いので、英語版では「Results (PDF)」などにする
const linkLabel = (r) => (EN ? (/[^\x20-\x7E]/.test(r.label) ? `Results${/\.pdf($|\?)/i.test(r.url) || /PDF/i.test(r.label) ? " (PDF)" : ""}` : r.label) : r.label);
// 一般のアマチュア大会（県アマなど）。ジュニア大会ではないが中学生も出られる
const isGeneral = (t) => (t.levels || []).includes("一般");
const genMark = (t) => isGeneral(t) ? `<span class="gen-mark">${tr("一般（中学生も可）", "Open event (junior high OK)")}</span>` : "";
function prevBlock(t) {
  const p = t.prev_results;
  if (!p || !p.links || !p.links.length) return "";
  return `<div class="d-prev"><p class="d-results-h">${tr(`前回（${p.year}年）の大会結果・スコア`, `Last results (${p.year})`)}</p>
    <p class="d-prev-name"${EN ? ' lang="ja"' : ""}>${esc(p.name)}</p>
    <div class="d-actions">${p.links.map((r) => `<a class="btn btn-line" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(linkLabel(r))}</a>`).join("")}</div></div>`;
}

// 地図の横に出す、幅の狭い一覧の行
function mapRow(t) {
  if (isWatch(t)) return `<div class="mrow${rowCls(t)}">
    <div class="date"><span class="d tbd">${tr("未定", "TBA")}</span></div>
    <div class="mrow-body"><button class="name" data-id="${esc(t.id)}">${esc(nameOf(t))}</button>
      <span class="sub">${esc(placeName(t.pref, t.overseas))}${tr("・前年の会場：", " · Last year: ")}<span lang="ja">${esc(t.prev_venue)}</span></span>
      <span class="status st-unknown"><b><span class="dot"></span>${tr("日程発表待ち", "Dates TBA")}</b></span></div>
  </div>`;
  const st = entryStatus(t);
  return `<div class="mrow${rowCls(t)}">
    <div class="date"><span class="d">${esc(md(t.start))}</span><span class="w">${WEEK[toDate(t.start).getDay()]}</span></div>
    <div class="mrow-body"><button class="name" data-id="${esc(t.id)}">${esc(nameOf(t))}</button>
      <span class="sub">${esc(placeName(t.pref, t.overseas))}${tr("・", " · ")}<span lang="ja">${esc(t.venue)}</span></span>
      <span class="status st-${st.kind}"><b><span class="dot"></span>${esc(st.label)}</b></span></div>
  </div>`;
}

function watchDetail(t) {
  return `<p class="d-eyebrow">${prefLabel(t)}${tr("・日程発表待ち", " · Dates TBA")}</p>
    <h2 class="d-title" id="d-title">${esc(nameOf(t))}</h2>${dJaName(t)}
    ${abroadNote(t)}
    <div class="d-entry st-unknown">
      <p class="lbl">${tr("今年の日程・申込期間はまだ発表されていません", "This year’s dates and entry period have not been announced")}</p>
      <p>${esc(EN ? expectedEn(t.expected) || "See the official page for last year’s dates." : t.expected || "前年の実績は公式ページでご確認ください。")}</p>
    </div>
    <dl class="d-list">
      ${t.window_from ? `<dt>${tr("注意する時期", "Watch from")}</dt><dd>${tr(`${esc(fmtY(t.window_from))}ごろから公式ページを確認`, `Check the official page from around ${esc(fmtY(t.window_from))}`)}</dd>` : ""}
      <dt>${tr("会場", "Venue")}</dt><dd>${EN ? venueText(t) : esc(t.venue)}（${esc(placeName(t.pref, t.overseas))}）</dd>
      <dt>${tr("主催", "Organizer")}</dt><dd>${dOrg(t)}</dd>
      <dt>${tr("対象", "Eligibility")}</dt><dd>${dGrades(t)}</dd>
    </dl>
    ${dNote(t)}
    <div class="d-actions"><a class="btn btn-solid" href="${esc(t.url)}" target="_blank" rel="noopener">${tr("公式ページを見る", "Official page (Japanese)")}</a></div>
    ${prevBlock(t)}
    <p class="d-verified">${tr(`${esc(t.verified)} 時点の情報。前年の実績をもとにしており、今年の確定日ではありません。`, `Checked on ${esc(t.verified)}. Based on last year; not this year’s confirmed dates.`)}</p>`;
}

function detail(t) {
  if (isWatch(t)) return watchDetail(t);
  const st = entryStatus(t);
  const title = EN ? { open: "Entry open", soon: "Entry opens soon", closed: "Entry closed", unknown: "Check the entry period" }[st.kind]
    : { open: "申込受付中", soon: "まもなく受付開始", closed: "申込受付は終了しました", unknown: "申込期間は要確認" }[st.kind];
  return `<p class="d-eyebrow">${prefLabel(t)}${tr("・", " · ")}${esc(stageName(t.stage))}</p>
    <h2 class="d-title" id="d-title">${esc(nameOf(t))}</h2>${dJaName(t)}
    ${abroadNote(t)}
    ${isPast(t) ? resultBlock(t) : ""}
    <div class="d-entry st-${st.kind}">
      <p class="lbl">${esc(title)}${(st.kind === "open" || st.kind === "soon") && !st.plain ? tr(`（${esc(st.label)}）`, ` (${esc(st.label)})`) : ""}</p>
      <p>${esc(entryPeriodLong(t))}</p>
    </div>
    <dl class="d-list">
      <dt>${tr("開催日", "Dates")}</dt><dd>${esc(dateRange(t))}</dd>
      <dt>${tr("会場", "Venue")}</dt><dd>${EN ? venueText(t) : esc(t.venue)}${tr(`（${esc(t.pref)}）`, `, ${esc(placeName(t.pref, t.overseas))}`)}</dd>
      <dt>${tr("主催", "Organizer")}</dt><dd>${dOrg(t)}</dd>
      <dt>${tr("対象", "Eligibility")}</dt><dd>${dGrades(t)}</dd>
      <dt>${tr("区分", "Stage")}</dt><dd>${esc(stageName(t.stage))}</dd>
    </dl>
    ${dNote(t)}
    <div class="d-actions">
      <a class="btn btn-solid" href="${esc(t.url)}" target="_blank" rel="noopener">${tr("公式ページで要項を見る", "Official guidelines (Japanese)")}</a>
      <a class="btn btn-line" href="${esc(gmapsDir(t))}" target="_blank" rel="noopener">${tr("経路を調べる（Googleマップ）", "Directions (Google Maps)")}</a>
    </div>
    ${isPast(t) ? "" : prevBlock(t) + calBlock(t)}
    <p class="d-verified">${tr(`${esc(t.verified)} 時点で公式ページを確認`, `Checked against the official page on ${esc(t.verified)}`)}</p>`;
}

// 詳細画面の英語版の補足。主催・対象・備考の元の日本語は、問い合わせや要項を読むときに使うので残す
const dJaName = (t) => (EN ? `<p class="d-ja" lang="ja">${tr("", "Official name: ")}${esc(t.name)}</p>` : "");
const dOrg = (t) => (EN ? `${esc(orgEn(t.organizer))}<br><small lang="ja">${esc(t.organizer)}</small>` : esc(t.organizer));
const dGrades = (t) => (EN ? `${genMark(t)}${esc(levelsEn(t))}<br><small lang="ja">${esc(t.grades)}</small>` : `${genMark(t)}${esc(t.grades)}`);
const dNote = (t) => (t.note ? (EN ? `<p class="d-note"><b>Notes (in Japanese):</b> <span lang="ja">${esc(t.note)}</span></p>` : `<p class="d-note">${esc(t.note)}</p>`) : "");

// 詳細画面の「カレンダーに登録」。Google カレンダーは1予定ずつのリンク、.ics は大会日・申込開始・申込締切をまとめて1ファイル
function gcalUrl(t, title, start, end) {
  const d = (s) => s.replace(/-/g, "");
  const x = toDate(end); x.setDate(x.getDate() + 1);
  const next = `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: `${title}${nameOf(t)}`, dates: `${d(start)}/${next}`, details: t.url, location: t.venue || "" });
  return `https://calendar.google.com/calendar/render?${q}`;
}
function calBlock(t) {
  const links = [`<a class="btn btn-line" href="${esc(gcalUrl(t, tr("【大会】", "[Tournament] "), t.start, t.end || t.start))}" target="_blank" rel="noopener">${tr("大会日を追加", "Add tournament dates")}</a>`];
  if (t.entry_open && daysUntil(t.entry_open) >= 0) links.push(`<a class="btn btn-line" href="${esc(gcalUrl(t, tr("【申込開始】", "[Entry opens] "), t.entry_open, t.entry_open))}" target="_blank" rel="noopener">${tr("申込開始日を追加", "Add entry opening")}</a>`);
  if (t.entry_close && daysUntil(t.entry_close) >= 0) links.push(`<a class="btn btn-line" href="${esc(gcalUrl(t, tr("【申込締切】", "[Entry deadline] "), t.entry_close, t.entry_close))}" target="_blank" rel="noopener">${tr("申込締切日を追加", "Add entry deadline")}</a>`);
  return `<div class="d-cal">
      <p class="lbl">${tr("この大会をカレンダーに登録", "Add this tournament to your calendar")}</p>
      <p class="d-cal-sub">${tr("Google カレンダー", "Google Calendar")}</p>
      <div class="d-cal-btns">${links.join("")}</div>
      <p class="d-cal-sub">${tr("iPhone・Outlook など", "iPhone, Outlook, etc.")}</p>
      <div class="d-cal-btns"><button class="btn btn-line" data-ics="${esc(t.id)}">${tr("日程をまとめて登録（.ics）", "Add all dates (.ics)")}</button></div>
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
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//japan-junior-golf//JA", `X-WR-CALNAME:${tr("ジュニアゴルフ大会カレンダー", "Junior Golf Tournament Calendar")}`];
  for (const t of list) {
    out.push(ev(t.id, t.start, t.end || t.start, `${tr("【大会】", "[Tournament] ")}${nameOf(t)}`, `${t.venue}\n${t.url}`));
    if (t.entry_open) out.push(ev(t.id + "-open", t.entry_open, t.entry_open, `${tr("【申込開始】", "[Entry opens] ")}${nameOf(t)}`, t.url));
    if (t.entry_close) out.push(ev(t.id + "-close", t.entry_close, t.entry_close, `${tr("【申込締切】", "[Entry deadline] ")}${nameOf(t)}`, t.url));
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
  const { updated, tournaments } = await (await fetch(ROOT + "data/tournaments.json", { cache: "no-cache" })).json();
  const abroad = REGIONS.find(([r]) => r === "海外")[1];
  for (const t of tournaments) if (t.overseas && !abroad.includes(t.pref)) abroad.push(t.pref);
  const byId = Object.fromEntries(tournaments.map((t) => [t.id, t]));
  document.getElementById("updated").textContent = updated;

  // 終了した大会は data/past/<開催年>.json に年ごとに分けてあり、必要になったときだけ読む
  // （終了した大会のタブ・申込カレンダー・終了した大会への直接リンク）
  let pastYears = null;
  const pastLoaded = new Set();
  const pastIndex = async () => pastYears || (pastYears = (await (await fetch(ROOT + "data/past/index.json", { cache: "no-cache" })).json()).years);
  const loadPast = async (years) => {
    const all = await pastIndex();
    const need = years.filter((y) => all.includes(y) && !pastLoaded.has(y));
    if (!need.length) return false;
    await Promise.all(need.map(async (y) => {
      const { tournaments: list } = await (await fetch(`${ROOT}data/past/${y}.json`, { cache: "no-cache" })).json();
      for (const t of list) if (!byId[t.id]) { tournaments.push(t); byId[t.id] = t; }
      pastLoaded.add(y);
    }));
    return true;
  };
  let pastYear = null;

  // 上段の3つの数字。絞り込みに合わせて render() で数え直す
  const statsEl = document.getElementById("stats");
  statsEl.innerHTML = (EN ? ["Entry open / soon", "Upcoming", "Dates TBA"] : ["申込受付中・まもなく", "これからの大会", "日程発表待ち"])
    .map((k) => `<div><dt>${k}</dt><dd data-v="0"></dd></div>`).join("");
  const statDds = [...statsEl.querySelectorAll("dd")];

  const fPref = document.getElementById("f-pref");
  const fOrg = document.getElementById("f-org");
  const fLevel = document.getElementById("f-level");
  // 英語版の「主催」は英語名でまとめる（「Local newspaper」など、同じ英語名の主催は一つの選択肢にする）
  const orgKey = (o) => (EN ? orgEn(o) : o);
  // エリアは地方ごとにまとめる。「jp」は国内すべて（最初の表示）、「r:関東」は地方全体、それ以外は都道府県
  const prefs = new Set(tournaments.map((t) => t.pref));
  // 国内は「日本」の見出しの下に日本すべてと地方を並べる（県単位では大会が少ないため）。海外は国ごとにも選べる
  const jg = document.createElement("optgroup");
  jg.label = tr("日本", "Japan");
  jg.append(fPref.querySelector('option[value="jp"]'));
  fPref.append(jg);
  for (const [region, list] of REGIONS) {
    const present = list.filter((p) => prefs.has(p) && p !== region);
    if (!present.length && !prefs.has(region)) continue;
    if (region === "全国") continue;
    if (region !== "海外") { jg.append(new Option(placeName(region), `r:${region}`)); continue; }
    const g = document.createElement("optgroup");
    g.label = placeName(region);
    g.append(new Option(tr("海外すべて", "All overseas"), `r:${region}`));
    fPref.append(g);
    // 海外は地域ごとの見出しの下に国名を並べる（地域全体も選べる）
    for (const [area, countries] of [...ABROAD_AREAS, ["その他の国", present.filter((p) => abroadAreaOf(p) === "その他の国")]]) {
      const here = countries.filter((p) => present.includes(p));
      if (!here.length) continue;
      const ag = document.createElement("optgroup");
      ag.label = tr(`海外：${area}`, `Overseas: ${areaName(area)}`);
      ag.append(new Option(tr(`${area}すべて`, `All of ${areaName(area)}`), `a:${area}`), ...here.map((p) => new Option(placeName(p, true), `c:${p}`)));
      fPref.append(ag);
    }
  }
  // 対象とエリアで絞る。levels は大会に出られる学校段階。一般の大会（"一般"）は「中学生」で出す
  const levelOk = (t) => (t.levels || []).includes(fLevel.value) || (fLevel.value === "中学生" && isGeneral(t));
  const inLevelArea = (t) => levelOk(t)
    && (!fPref.value || (fPref.value === "jp" ? !t.overseas : fPref.value.startsWith("r:") ? (t.overseas ? "海外" : regionOf(t.pref)) === fPref.value.slice(2)
      : fPref.value.startsWith("a:") ? t.overseas && abroadAreaOf(t.pref) === fPref.value.slice(2)
      : fPref.value.startsWith("c:") ? t.overseas && t.pref === fPref.value.slice(2)
      : t.pref === fPref.value));
  // おやこ手帳デザインでは、主催者の種類でも絞れる
  let fType = "";
  if (TECHO) try { const s = localStorage.getItem("otype"); if (s && ORG_TYPES[s]) fType = s; } catch {}
  const inArea = (t) => inLevelArea(t) && (!fType || orgType(t.organizer) === fType);
  const typesEl = document.getElementById("otypes");
  // 主催者の種類ごとの件数は、いま開いているタブに出る大会で数える（種類の絞り込み自体は除く）
  const inView = (t) => view === "watch" ? isWatch(t)
    : view === "open" ? isOpenView(t)
    : view === "past" ? isPast(t) && pastLoaded.has(pastYear) && t.start.startsWith(String(pastYear))
    : !isWatch(t) && !isPast(t);
  const renderTypes = () => {
    const pool = tournaments.filter((t) => inLevelArea(t) && inView(t));
    const count = (k) => pool.filter((t) => !k || orgType(t.organizer) === k).length;
    typesEl.innerHTML = `<span class="ot-lbl">${tr("主催者の種類", "Organizer type")}</span>` + [["", tr("すべて", "All")], ...Object.entries(ORG_TYPES).map(([k, v]) => [k, v.label])]
      .map(([k, label]) => `<button class="otc${k ? ` ot-${k}` : ""}" data-otype="${k}" aria-pressed="${fType === k}">${k ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ORG_TYPES[k].icon}"/></svg>` : ""}${esc(label)}<span class="n">${count(k)}</span></button>`).join("");
  };
  // 主催はエリアで絞った大会の主催だけを出す
  const fillOrgs = () => {
    const keep = fOrg.value;
    const orgs = [...new Set(tournaments.filter(inArea).map((t) => orgKey(t.organizer)))].sort((a, b) => a.localeCompare(b, tr("ja", "en")));
    fOrg.replaceChildren(new Option(tr("すべての主催", "All organizers"), ""), ...orgs.map((o) => new Option(o, o)));
    fOrg.value = orgs.includes(keep) ? keep : "";
  };
  // 選んだエリアは次回も使う（保存できない環境では無視）
  try {
    const saved = localStorage.getItem("area"); if (saved !== null && [...fPref.options].some((o) => o.value === saved)) fPref.value = saved;
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
    const base = tournaments.filter((t) => inArea(t) && (!fOrg.value || orgKey(t.organizer) === fOrg.value));
    const sets = {
      upcoming: base.filter((t) => !isWatch(t) && !isPast(t)).sort(byDate),
      watch: base.filter(isWatch).sort((a, b) => (a.window_from || "9999").localeCompare(b.window_from || "9999")),
      open: base.filter(isOpenView).sort(byDate),
      // 終了した大会は新しい順
      past: pastYear && pastLoaded.has(pastYear) ? base.filter((t) => isPast(t) && t.start.startsWith(String(pastYear))).sort((a, b) => byDate(b, a)) : null,
    };
    // 地図には、日程発表待ちでも前年の会場が分かる大会を前年の会場に出す
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
    if (isCal) {
      showCalendar(calEl, base.filter((t) => !isWatch(t)));
      // 表示している月の締切・開催日に、終了した大会（その年と翌年に開催）も出す
      const y = cal.month.getFullYear();
      loadPast([y, y + 1]).then((added) => { if (added && view === "cal") render(); });
      return;
    }
    if (isMap) {
      // 絞り込みが変わったとき（と初回）だけ、該当する会場が全部見える位置へ動かす
      const key = fPref.value + "|" + fOrg.value;
      showMap(mapEl, list, { fit: key !== mapKey, onListChange: (items) => {
        const sorted = [...items].sort(byDate);
        mapList.innerHTML = sorted.length ? sorted.map(mapRow).join("") : `<p class="empty">${tr("地図の範囲に大会はありません。地図を動かすか縮小してください。", "No tournaments in this area. Move or zoom out the map.")}</p>`;
        mapCount.textContent = tr(`地図に見えている大会 ${sorted.length}件`, `${sorted.length} tournament${sorted.length === 1 ? "" : "s"} on the map`);
      } });
      mapKey = key;
      return;
    }
    document.querySelector(".table-head span:last-child").textContent = view === "past" ? tr("結果", "Results") : tr("申込", "Entry");
    const el = document.getElementById("list");
    if (view === "past") {
      // 開催年を選んで表示する。まだ読んでいない年は読み込んでから描き直す
      if (!pastYears) { el.innerHTML = `<p class="empty">${tr("読み込み中…", "Loading…")}</p>`; pastIndex().then(() => { pastYear = pastYear || pastYears[0]; render(); }); return; }
      pastYear = pastYear || pastYears[0];
      if (!pastLoaded.has(pastYear)) { el.innerHTML = `<p class="empty">${tr("読み込み中…", "Loading…")}</p>`; loadPast([pastYear]).then(render); return; }
      const years = `<div class="past-years" role="group" aria-label="${tr("開催年", "Year")}">${pastYears.map((y) => `<button data-past-year="${y}" aria-pressed="${y === pastYear}">${tr(`${y}年`, y)}</button>`).join("")}</div>`;
      if (!list.length) { el.innerHTML = years + `<p class="empty">${tr("該当する大会はありません。", "No tournaments match.")}</p>`; return; }
      let html = years, month = "";
      for (const t of list) {
        const m = `${t.start.slice(0, 4)}.${t.start.slice(5, 7)}`;
        if (m !== month) { html += `<p class="month">${m}</p>`; month = m; }
        html += row(t);
      }
      el.innerHTML = html;
      return;
    }
    if (!list.length) { el.innerHTML = `<p class="empty">${tr("該当する大会はありません。", "No tournaments match.")}</p>`; return; }
    if (view === "watch") {
      const rows = list.map(row).join("");
      el.innerHTML = `<p class="month">${tr("前年の実績から、申込が始まりそうな順", "In the order entry is likely to open, based on last year")}</p>` + rows;
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
    const band = TECHO ? `<div class="d-org ot-${orgType(t.organizer)}">${orgLogo(t.organizer)}<span><b>${esc(ORG_TYPES[orgType(t.organizer)].label)}</b>${esc(orgName(t.organizer))}</span></div>` : "";
    document.getElementById("d-body").innerHTML = band + detail(t);
    if (!dlg.open) dlg.showModal();
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  };
  const close = () => { dlg.close(); };
  dlg.addEventListener("close", () => history.replaceState(null, "", location.pathname + location.search));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  document.getElementById("d-close").addEventListener("click", close);

  document.addEventListener("click", (e) => {
    const yb = e.target.closest("[data-past-year]");
    if (yb) { pastYear = Number(yb.dataset.pastYear); render(); return; }
    const name = e.target.closest("[data-id]");
    if (name) { open(name.dataset.id); return; }
    const ics = e.target.closest("[data-ics]");
    if (ics) { e.preventDefault(); download(`${ics.dataset.ics}.ics`, icsFor([byId[ics.dataset.ics]])); }
  });

  render();
  // URL の #大会ID で詳細を直接開ける（共有用）
  // 見つからなければ終了した大会を新しい年から読んで探す
  if (location.hash.length > 1) {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!byId[id]) for (const y of await pastIndex()) { await loadPast([y]); if (byId[id]) break; }
    open(id);
  }
}
main();
