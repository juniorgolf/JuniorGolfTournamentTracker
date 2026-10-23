// 英語版（/en/）のための言葉の切り替え。<html lang="en"> のページだけ英語にする（日本語版はこのまま）
// 大会データは日本語版と同じものを使い、英語は画面の文字と、データから作る非公式の説明だけ
const EN = document.documentElement.lang === "en";
const ROOT = EN ? "../" : "";  // 英語版は /en/ にあるので、データや地図の部品は一つ上を読む
const tr = (ja, en) => (EN ? en : ja);

const PREF_EN = {
  北海道: "Hokkaido", 青森: "Aomori", 岩手: "Iwate", 宮城: "Miyagi", 秋田: "Akita", 山形: "Yamagata", 福島: "Fukushima",
  東京: "Tokyo", 神奈川: "Kanagawa", 千葉: "Chiba", 埼玉: "Saitama", 茨城: "Ibaraki", 栃木: "Tochigi", 群馬: "Gunma", 山梨: "Yamanashi",
  新潟: "Niigata", 長野: "Nagano", 富山: "Toyama", 石川: "Ishikawa", 福井: "Fukui", 岐阜: "Gifu", 静岡: "Shizuoka", 愛知: "Aichi", 三重: "Mie",
  滋賀: "Shiga", 京都: "Kyoto", 大阪: "Osaka", 兵庫: "Hyogo", 奈良: "Nara", 和歌山: "Wakayama",
  鳥取: "Tottori", 島根: "Shimane", 岡山: "Okayama", 広島: "Hiroshima", 山口: "Yamaguchi",
  徳島: "Tokushima", 香川: "Kagawa", 愛媛: "Ehime", 高知: "Kochi",
  福岡: "Fukuoka", 佐賀: "Saga", 長崎: "Nagasaki", 熊本: "Kumamoto", 大分: "Oita", 宮崎: "Miyazaki", 鹿児島: "Kagoshima", 沖縄: "Okinawa",
  // 地方（複数県にまたがる大会と、エリアの選択肢）
  東北: "Tohoku", 関東: "Kanto", 中部: "Chubu", 北陸: "Hokuriku", 関西: "Kansai", 中国: "Chugoku", "中国・四国": "Chugoku & Shikoku",
  四国: "Shikoku", 九州: "Kyushu", "九州・沖縄": "Kyushu & Okinawa", 全国: "Nationwide", 海外: "Overseas", その他: "Other",
};
const COUNTRY_EN = {
  韓国: "South Korea", 台湾: "Taiwan", 中国: "China", 香港: "Hong Kong", マカオ: "Macau", モンゴル: "Mongolia",
  タイ: "Thailand", ベトナム: "Vietnam", マレーシア: "Malaysia", シンガポール: "Singapore", フィリピン: "Philippines", インドネシア: "Indonesia", カンボジア: "Cambodia",
  インド: "India", UAE: "UAE", カタール: "Qatar", サウジアラビア: "Saudi Arabia",
  オーストラリア: "Australia", ニュージーランド: "New Zealand", アメリカ: "USA", カナダ: "Canada",
  メキシコ: "Mexico", バハマ: "Bahamas", パナマ: "Panama", コロンビア: "Colombia", ブラジル: "Brazil",
  スコットランド: "Scotland", イングランド: "England", ウェールズ: "Wales", アイルランド: "Ireland", フランス: "France", ドイツ: "Germany",
  ベルギー: "Belgium", オランダ: "Netherlands", スペイン: "Spain", イタリア: "Italy", トルコ: "Turkey", ケニア: "Kenya", 南アフリカ: "South Africa",
};
const AREA_EN = {
  東アジア: "East Asia", 東南アジア: "Southeast Asia", "南アジア・中東": "South Asia & Middle East", オセアニア: "Oceania",
  北米: "North America", 中南米: "Latin America", ヨーロッパ: "Europe", アフリカ: "Africa", その他の国: "Other countries",
};
// 「中国」は国内では中国地方、海外では国名なので、海外かどうかで分ける
const placeName = (p, overseas) => (!EN ? p : overseas ? COUNTRY_EN[p] || p : PREF_EN[p] || COUNTRY_EN[p] || p);
const areaName = (a) => (EN ? AREA_EN[a] || a : a);

// 主催者の英語名（非公式）。正式な英語名がある団体はそれを使い、ほかは種類で表す
function orgEn(o) {
  o = String(o || "");
  if (!o || o === "未確認" || o.startsWith("主催者は要項")) return "Organizer not confirmed";
  const fixed = [
    [/JJGA|日本ジュニアゴルフ協会/, "Japan Junior Golf Association (JJGA)"], [/JJGT|日本ジュニアゴルフツアー/, "Japan Junior Golf Tour (JJGT)"],
    [/IJGA/, "International Junior Golf Development Association (IJGA)"], [/U\.?S\.? Kids/i, "U.S. Kids Golf"],
    [/Future Champions/, "Future Champions Golf (FCG)"], [/Jack Bunny/, "Jack Bunny!! Junior Golf Tour"],
    [/スタジオアリス/, "Studio Alice (with JLPGA)"], [/JLPGA|日本女子プロゴルフ協会/, "Japan LPGA (JLPGA)"], [/日本プロゴルフ協会/, "PGA of Japan"],
    [/日本ゴルフ協会/, "Japan Golf Association (JGA)"], [/エナジック/, "Enagic"], [/スナッグゴルフ/, "Japan SNAG Golf Association"],
    [/スポーツニッポン/, "Sports Nippon (newspaper)"], [/高等学校・?中学校ゴルフ連盟|高等学校ゴルフ連盟|高ゴ連/, "School Golf Federation"],
  ];
  const head = o.split("／")[0].replace(/（[^）]*(共催|主管|後援|協力|特別協賛)[^）]*）/g, "");
  for (const [re, name] of fixed) if (re.test(head)) return name;
  const reg = head.match(/(北海道|東北|関東|中部|関西|中国|四国|九州)ゴルフ連盟/);
  if (reg) return `${PREF_EN[reg[1]]} Golf Union`;
  const pref = head.match(/(?:一般社団法人|一般財団法人|公益財団法人)?\s*([^\s／（）]+?)[都府県]?(アマチュアゴルフ協会|アマチュアゴルフ連盟|ゴルフ協会|ゴルフ連盟|ゴルフクラブ連盟|ゴルフ団体連絡協議会)/);
  if (pref && PREF_EN[pref[1]]) return `${PREF_EN[pref[1]]} ${/協会/.test(pref[2]) ? "Golf Association" : "Golf Federation"}`;
  if (/新聞/.test(head)) return "Local newspaper";
  if (/放送|テレビ|TKU|KAB|UMK|NBS|NCC|UHB|テレ玉|BSフジ/.test(head)) return "Local TV / radio";
  if (/[市町村](ゴルフ協会|ゴルフ連盟)/.test(head)) return "Local golf association";
  if (/ゴルフ場|ゴルフクラブ|倶楽部|リゾート|カントリー|ゴルフガーデン|コース/.test(head)) return "Golf course";
  if (/[市町村]/.test(head)) return "Local government";
  if (/実行委員会|事務局|振興会|育成|NPO/.test(head)) return "Organizing committee";
  return "Company";
}
const orgName = (o) => (EN ? orgEn(o) : o);
// 英語名の略称（JJGA など）。説明の先頭に使う
const orgShortEn = (o) => { const e = orgEn(o); return (e.match(/\(([A-Z]{2,6})\)$/) || [])[1] || e.replace(/ \(.*\)$/, ""); };

function stageName(s) {
  if (!EN) return s;
  s = String(s || "");
  return /予選/.test(s) ? "Qualifier" : /決勝/.test(s) ? "Final" : /地区大会/.test(s) ? "Regional (leads to a final)" : /発表待ち/.test(s) ? "Dates TBA" : /単独/.test(s) ? "Single event" : s;
}

// 大会の英語の呼び名（非公式）。公式名に英語が書いてあればそれを、なければ主催者と大会名の言葉から作る
function enTitle(t) {
  const name = String(t.name || "");
  const paren = [...name.matchAll(/（([^（）]*)）/g)].map((m) => m[1]).reverse().find((s) => /^[\x20-\x7E’–—]+$/.test(s) && /[A-Za-z]{3}/.test(s));
  if (paren) return /U\.?S\.? Kids/i.test(name) && !/U\.?S\.? Kids/i.test(paren) ? `U.S. Kids Golf ${paren}` : paren;
  if (/^[\x20-\x7E’]+$/.test(name)) return name;
  // 全国シリーズは英語の呼び名を先に決めておく（「石川遼」の「石川」を県名と読まないように、シリーズ名を外してから地名を探す）
  const series = [[/石川遼カップ/, "Ryo Ishikawa Cup"], [/日本トリムカップ/, "Nihon Trim Cup"], [/スタジオアリス/, "Studio Alice Junior Cup"],
    [/PGM世界ジュニア/, "PGM World Junior Japan Selection"], [/全国小学生ゴルフ(春季|秋季)?大会/, "National Elementary Tournament"], [/全日本小学生/, "All Japan Elementary Tournament"]]
    .find(([re]) => re.test(name.replace(/（[^）]*）/g, "")));  // かっこ内の「〇〇予選を兼ねる」は見ない
  const rest = series ? name.replace(/（[^）]*）/g, "").replace(series[0], "") : name;
  if (series) {
    const p = Object.keys(PREF_EN).filter((k) => !/^(全国|海外|その他)$/.test(k) && rest.includes(k)).sort((a, b) => rest.indexOf(a) - rest.indexOf(b) || b.length - a.length)[0];
    const st = /予選|地区大会/.test(name + t.stage) ? "Qualifier" : /決勝/.test(name + t.stage) ? "Final" : "";
    return [series[1], p && !t.overseas ? placeName(p) : "", st].filter(Boolean).join(" ");
  }
  // 先頭は大会名に出てくる地名（「関東小学生ゴルフ大会」なら Kanto）。地名がなければ主催者の略称
  let at = -1, place = "";
  for (const k of Object.keys(PREF_EN)) {
    if (/^(全国|海外|その他)$/.test(k)) continue;
    const i = rest.indexOf(k);
    if (i >= 0 && (at < 0 || i < at || (i === at && k.length > place.length))) { at = i; place = k; }
  }
  const org = orgShortEn(t.organizer);
  const generic = /^(Company|Golf course|Local |Organizing committee|Organizer not confirmed)/.test(org);
  const words = [place ? placeName(place, t.overseas) : generic ? placeName(t.pref, t.overseas) : org];
  if (/アマチュア/.test(name)) words.push("Amateur");
  if (/女子/.test(name)) words.push("Girls'");
  else if (/男子/.test(name)) words.push("Boys'");
  if (/小中学|小・中学/.test(name)) words.push("Elementary & Junior High");
  else if (/小学/.test(name)) words.push("Elementary");
  else if (/中学/.test(name)) words.push("Junior High");
  else if (/ジュニア/.test(name) && !/Junior/.test(words[0])) words.push("Junior");
  const stage = /予選/.test(name + t.stage) ? "Qualifier" : /決勝/.test(name + t.stage) ? "Final" : "";
  const kind = /選手権/.test(name) ? "Championship" : /杯|カップ/.test(name) ? "Cup" : /オープン/.test(name) ? "Open" : /ダブルス/.test(name) ? "Doubles" : /スナッグ/.test(name) ? "SNAG Golf" : "";
  if (kind) words.push(kind);
  words.push(stage || (kind ? "" : "Tournament"));
  return words.filter(Boolean).join(" ");
}
const nameOf = (t) => (EN ? enTitle(t) : t.name);

// 出られる学校段階
const levelsEn = (t) => (t.levels || []).map((l) => ({ 小学生: "Elementary", 中学生: "Junior high", 一般: "Open (junior high OK)" }[l] || l)).join(" · ");

// 日程発表待ちの「開催：前年は2/22　申込：前年は11/4〜12/15」を英語にする。読めない形はそのまま返す
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mdEn = (s) => { const [m, d] = s.split("/").map(Number); return `${MON[m - 1]} ${d}`; };
function expectedEn(s) {
  s = String(s || "");
  const out = [];
  let m;
  if ((m = s.match(/開催：前年は(\d+\/\d+)/))) out.push(`Held on ${mdEn(m[1])} last year.`);
  if ((m = s.match(/申込：前年は(\d+\/\d+)〜(\d+\/\d+)/))) out.push(`Entry last year: ${mdEn(m[1])} – ${mdEn(m[2])}.`);
  else if ((m = s.match(/申込：前年は(\d+\/\d+)開始/))) out.push(`Entry opened on ${mdEn(m[1])} last year.`);
  else if ((m = s.match(/申込：前年は(\d+\/\d+)締切/))) out.push(`Entry closed on ${mdEn(m[1])} last year.`);
  return out.length ? out.join(" ") : "";
}
